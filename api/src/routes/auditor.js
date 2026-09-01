const express = require('express');
const { requireRole } = require('../middleware/auth');
const ledger = require('../services/ledger');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/auditor/trace/:batchId — Full ancestor tree with PII and flags
router.get('/trace/:batchId', requireRole(['auditor']), async (req, res) => {
  try {
    const { batchId } = req.params;

    // Get the full ancestor chain from the ledger
    const ancestors = await ledger.getAncestors(batchId);

    // Enrich with off-chain data (PII, flags, GPS)
    const enriched = [];
    for (const block of ancestors) {
      const offChain = await prisma.batchEvent.findUnique({ where: { batchId: block.batchId } });
      const flags = await prisma.anomalyFlag.findMany({ where: { batchId: block.batchId } });
      enriched.push({ ...block, offChain, flags });
    }

    await prisma.auditLog.create({
      data: { action: 'TRACE_EXECUTED', actorId: req.user.id, actorRole: 'auditor', targetId: batchId }
    });

    res.json({ batchId, traceDepth: enriched.length, ancestors: enriched });
  } catch (err) {
    console.error('[TRACE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to trace batch' });
  }
});

// POST /api/auditor/flag — Flag a batch for investigation
router.post('/flag', requireRole(['auditor']), async (req, res) => {
  try {
    const { batchId, reason } = req.body;
    const flag = await prisma.anomalyFlag.create({
      data: { batchId, flagType: 'MANUAL_FLAG', reason: reason || 'Flagged by auditor for investigation', severity: 'CRITICAL', flaggedBy: req.user.id }
    });
    await prisma.auditLog.create({ data: { action: 'BATCH_FLAGGED', actorId: req.user.id, actorRole: 'auditor', targetId: batchId } });
    res.json({ success: true, flag });
  } catch (err) {
    res.status(500).json({ error: 'Failed to flag batch' });
  }
});

// GET /api/auditor/flags — Get all flagged batches
router.get('/flags', requireRole(['auditor']), async (req, res) => {
  try {
    const flags = await prisma.anomalyFlag.findMany({ where: { resolved: false }, orderBy: { createdAt: 'desc' } });
    res.json({ flags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

module.exports = router;
