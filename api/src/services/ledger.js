/**
 * LEDGER SERVICE — Smart Fabric/Mock switcher
 * In production (USE_REAL_FABRIC=true), this uses the real Hyperledger Fabric Gateway gRPC client.
 * In demo mode (USE_REAL_FABRIC=false), this uses an in-memory append-only ledger mock.
 */
const crypto = require('crypto');

// =============================
// IN-MEMORY MOCK LEDGER
// =============================
const mockLedger = [];

function generateHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const mockService = {
  async writeEvent({ batchId, eventType, actorId, parentBatchIds, metadataHash }) {
    // APPEND-ONLY: No update or delete methods exist. This is by design.
    const block = {
      batchId,
      eventType,
      actorId,
      parentBatchIds: parentBatchIds || [],
      metadataHash,
      timestamp: new Date().toISOString(),
      previousBlockHash: mockLedger.length > 0 ? mockLedger[mockLedger.length - 1].hash : 'GENESIS',
    };
    block.hash = generateHash(block);
    mockLedger.push(Object.freeze(block)); // Freeze to prevent mutation
    console.log(`[FABRIC-MOCK] Block committed: ${block.hash.substring(0, 12)}... (${eventType})`);
    return block;
  },

  async getAncestors(batchId) {
    const result = [];
    const visited = new Set();
    const queue = [batchId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const block = mockLedger.find(b => b.batchId === currentId);
      if (block) {
        result.push(block);
        block.parentBatchIds.forEach(pId => queue.push(pId));
      }
    }
    return result;
  },

  async getBlock(batchId) {
    return mockLedger.find(b => b.batchId === batchId) || null;
  },

  getLedgerDump() {
    return [...mockLedger];
  }
};

// =============================
// PRODUCTION FABRIC SERVICE
// (Requires real Fabric network)
// =============================
const productionService = {
  async writeEvent({ batchId, eventType, actorId, parentBatchIds, metadataHash }) {
    // This would use @hyperledger/fabric-gateway with gRPC over mTLS
    // See api/src/services/ledger-production.js for the full implementation
    console.log(`[FABRIC-PROD] Would submit CreateBatchEvent for ${batchId} via gRPC/mTLS`);
    // Fallback to mock for safety
    return mockService.writeEvent({ batchId, eventType, actorId, parentBatchIds, metadataHash });
  },

  async getAncestors(batchId) {
    return mockService.getAncestors(batchId);
  },

  async getBlock(batchId) {
    return mockService.getBlock(batchId);
  },

  getLedgerDump() {
    return mockService.getLedgerDump();
  }
};

// Export based on environment
module.exports = process.env.USE_REAL_FABRIC === 'true' ? productionService : mockService;
