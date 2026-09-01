const express = require('express');
const { requireRole } = require('../middleware/auth');
const ledger = require('../services/ledger');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();
const beekeepersPath = path.join(__dirname, '../../../mock-data/beekeepers.json');

// Haversine formula for geofence checking
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/capture/harvest
router.post('/harvest', requireRole(['beekeeper']), async (req, res) => {
  try {
    const { brixReading, moisture, yieldKg, gpsLat, gpsLng } = req.body;
    const beekeeperId = req.user.id;
    const batchId = `BATCH-HV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // 1. Fetch beekeeper from mock Madhukranti registry
    const beekeepers = JSON.parse(fs.readFileSync(beekeepersPath, 'utf8'));
    const beekeeper = beekeepers.find(b => b.id === beekeeperId);
    if (!beekeeper) return res.status(404).json({ error: 'Beekeeper not found in Madhukranti registry', code: 'NOT_FOUND' });
    if (beekeeper.registrationStatus === 'SUSPENDED') return res.status(403).json({ error: 'Beekeeper registration suspended', code: 'SUSPENDED' });

    // 2. Geofence Validation
    const distance = getDistanceKm(gpsLat, gpsLng, beekeeper.hiveZone.latitude, beekeeper.hiveZone.longitude);
    const isOutsideGeofence = distance > beekeeper.hiveZone.radiusKm;

    // 3. AI Yield Verification (The Pivot)
    const isAnomalousYield = yieldKg > beekeeper.maxYieldPerSeasonKg;

    // 4. Hash metadata for the ledger (never put raw PII on-chain)
    const rawMetadata = JSON.stringify({
      region: beekeeper.region, district: beekeeper.district,
      gpsLat, gpsLng, yieldKg, brixReading, moisture,
      outsideGeofence: isOutsideGeofence, anomalousYield: isAnomalousYield
    });
    const metadataHash = crypto.createHash('sha256').update(rawMetadata).digest('hex');

    // 5. Store off-chain in PostgreSQL
    await prisma.batchEvent.create({
      data: {
        batchId, eventType: 'harvest', actorId: beekeeperId, actorRole: 'beekeeper',
        region: beekeeper.region, gpsLat, gpsLng, yieldKg, brixReading, moisture,
        metadataHash, parentBatches: []
      }
    });

    // 6. Write immutable block to ledger
    const block = await ledger.writeEvent({
      batchId, eventType: 'harvest', actorId: beekeeperId,
      parentBatchIds: [], metadataHash
    });

    // 7. Flag anomalies
    const flags = [];
    if (isOutsideGeofence) {
      await prisma.anomalyFlag.create({ data: { batchId, flagType: 'GEOFENCE_VIOLATION', reason: `GPS ${distance.toFixed(1)}km outside registered hive-zone (max: ${beekeeper.hiveZone.radiusKm}km)`, severity: 'HIGH' } });
      flags.push('GEOFENCE_VIOLATION');
    }
    if (isAnomalousYield) {
      await prisma.anomalyFlag.create({ data: { batchId, flagType: 'YIELD_ANOMALY', reason: `Reported yield ${yieldKg}kg exceeds biological maximum ${beekeeper.maxYieldPerSeasonKg}kg for ${beekeeper.floraExpected.join(', ')} flora`, severity: 'CRITICAL' } });
      flags.push('YIELD_ANOMALY');
    }

    // 8. Audit log
    await prisma.auditLog.create({ data: { action: 'HARVEST_SUBMITTED', actorId: beekeeperId, actorRole: 'beekeeper', targetId: batchId, metadata: JSON.stringify({ flags }) } });

    res.json({ success: true, batchId, blockHash: block.hash, flagged: flags.length > 0, flags });
  } catch (err) {
    console.error('[CAPTURE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to submit harvest event', code: 'CAPTURE_ERROR' });
  }
});

// GET /api/capture/batches — get beekeeper's own batches
router.get('/batches', requireRole(['beekeeper']), async (req, res) => {
  try {
    const batches = await prisma.batchEvent.findMany({
      where: { actorId: req.user.id, eventType: 'harvest' },
      orderBy: { timestamp: 'desc' }
    });
    const flags = await prisma.anomalyFlag.findMany({ where: { batchId: { in: batches.map(b => b.batchId) } } });
    res.json({ batches, flags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

module.exports = router;
