const express = require('express');
const { requireRole } = require('../middleware/auth');
const ledger = require('../services/ledger');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const QRCode = require('qrcode');

const router = express.Router();
const prisma = new PrismaClient();
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3001';

// GET /api/processor/available — List unconsumed harvest/pooled batches
router.get('/available', requireRole(['processor']), async (req, res) => {
  try {
    const batches = await prisma.batchEvent.findMany({
      where: { consumed: false, eventType: { in: ['harvest', 'pool'] } },
      orderBy: { timestamp: 'desc' }
    });
    const flags = await prisma.anomalyFlag.findMany({ where: { batchId: { in: batches.map(b => b.batchId) } } });
    res.json({ batches, flags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available batches' });
  }
});

// POST /api/processor/pool — Pool multiple batches
router.post('/pool', requireRole(['processor']), async (req, res) => {
  try {
    const { parentBatchIds } = req.body;
    if (!parentBatchIds || parentBatchIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 batches required for pooling', code: 'VALIDATION_ERROR' });
    }

    const batchId = `BATCH-PL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const metadataHash = crypto.createHash('sha256').update(JSON.stringify({ parentBatchIds, pooledBy: req.user.id })).digest('hex');

    // Mark parent batches as consumed
    await prisma.batchEvent.updateMany({ where: { batchId: { in: parentBatchIds } }, data: { consumed: true } });

    // Create pool event
    await prisma.batchEvent.create({
      data: { batchId, eventType: 'pool', actorId: req.user.id, actorRole: 'processor', metadataHash, parentBatches: parentBatchIds }
    });

    const block = await ledger.writeEvent({ batchId, eventType: 'pool', actorId: req.user.id, parentBatchIds, metadataHash });
    await prisma.auditLog.create({ data: { action: 'BATCH_POOLED', actorId: req.user.id, actorRole: 'processor', targetId: batchId } });

    res.json({ success: true, batchId, blockHash: block.hash, parentBatchIds });
  } catch (err) {
    console.error('[POOL ERROR]', err.message);
    res.status(500).json({ error: 'Failed to pool batches' });
  }
});

// POST /api/processor/bottle — Bottle a pooled batch and generate QR
router.post('/bottle', requireRole(['processor']), async (req, res) => {
  try {
    const { parentBatchIds, lotSize } = req.body;
    if (!parentBatchIds || parentBatchIds.length < 1) {
      return res.status(400).json({ error: 'At least 1 batch required for bottling' });
    }

    const batchId = `BATCH-BTL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const metadataHash = crypto.createHash('sha256').update(JSON.stringify({ parentBatchIds, bottledBy: req.user.id, lotSize })).digest('hex');

    await prisma.batchEvent.updateMany({ where: { batchId: { in: parentBatchIds } }, data: { consumed: true } });

    // Generate QR Code
    const qrUrl = `${PUBLIC_URL}/batch/${batchId}`;
    const qrCodeData = await QRCode.toDataURL(qrUrl);

    await prisma.batchEvent.create({
      data: { batchId, eventType: 'bottle', actorId: req.user.id, actorRole: 'processor', metadataHash, parentBatches: parentBatchIds, qrCodeData }
    });

    const block = await ledger.writeEvent({ batchId, eventType: 'bottle', actorId: req.user.id, parentBatchIds, metadataHash });
    await prisma.auditLog.create({ data: { action: 'BATCH_BOTTLED', actorId: req.user.id, actorRole: 'processor', targetId: batchId } });

    res.json({ success: true, batchId, blockHash: block.hash, qrCodeData, qrUrl });
  } catch (err) {
    console.error('[BOTTLE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to bottle batch' });
  }
});

module.exports = router;
