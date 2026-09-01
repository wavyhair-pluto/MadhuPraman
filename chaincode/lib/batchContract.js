'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * MadhuPraman Batch Contract
 * 
 * CRITICAL DESIGN DECISION:
 * This contract is APPEND-ONLY by design. There are NO UpdateBatchEvent
 * or DeleteBatchEvent functions. This is intentional — it is the single
 * most important guarantee of the entire system.
 */
class BatchContract extends Contract {

  async InitLedger(ctx) {
    console.info('MadhuPraman Ledger initialized.');
  }

  /**
   * CreateBatchEvent — The ONLY write function.
   * Appends a new immutable batch event to the world state.
   */
  async CreateBatchEvent(ctx, batchId, eventType, actorId, parentBatchIdsStr, metadataHash, timestamp) {
    const exists = await this.BatchExists(ctx, batchId);
    if (exists) {
      throw new Error(`Batch ${batchId} already exists on the ledger. Duplication rejected.`);
    }

    const parentBatchIds = parentBatchIdsStr ? JSON.parse(parentBatchIdsStr) : [];

    // Validate parent hash integrity
    for (const pid of parentBatchIds) {
      const parentExists = await this.BatchExists(ctx, pid);
      if (!parentExists) {
        throw new Error(`Parent batch ${pid} does not exist. Chain integrity violation.`);
      }
    }

    const batchEvent = {
      docType: 'batchEvent',
      batchId,
      eventType,
      actorId,
      parentBatchIds,
      metadataHash,
      timestamp,
      createdAt: new Date().toISOString()
    };

    await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batchEvent)));
    ctx.stub.setEvent('BatchEventCreated', Buffer.from(JSON.stringify({ batchId, eventType })));
    return JSON.stringify(batchEvent);
  }

  /**
   * ReadBatch — Read a single batch event by ID.
   */
  async ReadBatch(ctx, batchId) {
    const buffer = await ctx.stub.getState(batchId);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Batch ${batchId} does not exist`);
    }
    return buffer.toString();
  }

  /**
   * BatchExists — Check existence without throwing.
   */
  async BatchExists(ctx, batchId) {
    const buffer = await ctx.stub.getState(batchId);
    return !!buffer && buffer.length > 0;
  }

  /**
   * GetBatchHistory — Get the full mutation history of a batch key.
   * Useful for auditing. Leverages Fabric's built-in key history.
   */
  async GetBatchHistory(ctx, batchId) {
    const iterator = await ctx.stub.getHistoryForKey(batchId);
    const results = [];
    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        results.push({
          txId: result.value.txId,
          timestamp: result.value.timestamp,
          isDelete: result.value.isDelete,
          value: JSON.parse(result.value.value.toString())
        });
      }
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(results);
  }

  /**
   * GetAllBatches — Range query for all batch events.
   */
  async GetAllBatches(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];
    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          results.push(JSON.parse(result.value.value.toString()));
        } catch (err) {
          console.log(err);
        }
      }
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(results);
  }

  // ============================================================
  // NOTE: There is deliberately NO UpdateBatchEvent function.
  // NOTE: There is deliberately NO DeleteBatchEvent function.
  // This is the core anti-fraud guarantee of MadhuPraman.
  // ============================================================
}

module.exports = BatchContract;
