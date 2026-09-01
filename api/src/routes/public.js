const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ledger = require('../services/ledger');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/public/batch/:batchId — Consumer-facing, PII-stripped batch story
router.get('/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    // Get ancestors from ledger
    const ancestors = await ledger.getAncestors(batchId);
    if (ancestors.length === 0) {
      return res.status(404).json({ error: 'Batch not found', code: 'NOT_FOUND' });
    }

    // Sanitize: NO PII, NO exact GPS, NO beekeeper names
    const timeline = [];
    for (const block of ancestors) {
      const offChain = await prisma.batchEvent.findUnique({ where: { batchId: block.batchId } });
      timeline.push({
        eventType: block.eventType,
        batchId: block.batchId,
        timestamp: block.timestamp,
        blockHash: block.hash,
        region: offChain?.region || null,
        // Intentionally omit: gpsLat, gpsLng, actorId, name
      });
    }

    const harvestCount = timeline.filter(t => t.eventType === 'harvest').length;

    res.json({
      batchId,
      verified: true,
      ledgerNetwork: 'MadhuPraman Hyperledger Fabric',
      timeline,
      summary: {
        totalSourceBeekeepers: harvestCount,
        regions: [...new Set(timeline.filter(t => t.region).map(t => t.region))],
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batch story' });
  }
});

module.exports = router;
