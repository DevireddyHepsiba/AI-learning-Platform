/**
 * Simplified CRDT (Conflict-free Replicated Data Type) for collaborative editing
 * Implements OT (Operational Transformation) principles
 * 
 * Each operation has:
 * - operationId: Unique identifier
 * - parentId: Previous operation this is based on
 * - content: The actual change
 * - userId: Who made the change
 * - timestamp: When it happened
 */

export class CRDT {
  constructor() {
    this.operations = new Map(); // operationId -> operation
    this.causalHistory = []; // Causal history of operations
    this.appliedOps = new Set(); // Already applied operation IDs
  }

  /**
   * Transform two concurrent operations to maintain consistency
   * Returns [transformedOp1, transformedOp2]
   */
  static transformAgainstEachOther(op1, op2) {
    if (!op1 || !op2) return [op1, op2];

    // If operations don't conflict, return as-is
    if (op1.page !== op2.page) {
      return [op1, op2];
    }

    // If same position, use timestamp for deterministic ordering
    if (op1.page === op2.page && op1.userId === op2.userId) {
      if (op1.timestamp > op2.timestamp) {
        return [op1, op2];
      }
    }

    // Adjust positions if they conflict
    const transformedOp1 = { ...op1 };
    const transformedOp2 = { ...op2 };

    if (op1.position && op2.position) {
      if (op1.position < op2.position) {
        transformedOp2.position += (op1.content?.length || 0);
      } else if (op1.position > op2.position) {
        transformedOp1.position += (op2.content?.length || 0);
      }
    }

    return [transformedOp1, transformedOp2];
  }

  /**
   * Add operation to history and apply transformation if needed
   */
  addOperation(operation) {
    if (this.appliedOps.has(operation.operationId)) {
      return false; // Already applied
    }

    const operationToApply = { ...operation };

    // Check if this operation needs to be transformed against pending operations
    for (const pendingOp of this.causalHistory) {
      if (!this.appliedOps.has(pendingOp.operationId) && pendingOp.operationId !== operation.operationId) {
        const [transformed] = CRDT.transformAgainstEachOther(operationToApply, pendingOp);
        Object.assign(operationToApply, transformed);
      }
    }

    this.operations.set(operation.operationId, operationToApply);
    this.causalHistory.push(operationToApply);
    this.appliedOps.add(operation.operationId);

    return true;
  }

  /**
   * Get history since a specific operation
   */
  getHistorySince(operationId) {
    const index = this.causalHistory.findIndex((op) => op.operationId === operationId);
    if (index === -1) return this.causalHistory;
    return this.causalHistory.slice(index + 1);
  }

  /**
   * Undo operation for user
   */
  undoOperation(operationId, userId) {
    const op = this.operations.get(operationId);
    if (!op || op.userId !== userId) return null;

    // Create inverse operation
    const inverseOp = {
      operationId: `undo-${operationId}`,
      previousOperationId: operationId,
      content: op.previousContent,
      userId,
      timestamp: Date.now(),
      isUndo: true,
    };

    this.addOperation(inverseOp);
    return inverseOp;
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return {
      operations: Array.from(this.operations.values()),
      history: this.causalHistory,
      appliedCount: this.appliedOps.size,
    };
  }

  /**
   * Merge offline changes with server state
   */
  mergeOfflineChanges(offlineOps, serverOps) {
    const merged = [];
    const processedIds = new Set();

    // Add server operations
    for (const op of serverOps) {
      if (!processedIds.has(op.operationId)) {
        merged.push(op);
        processedIds.add(op.operationId);
      }
    }

    // Transform and add offline operations
    for (const offlineOp of offlineOps) {
      let transformedOp = offlineOp;

      // Transform against each server operation
      for (const serverOp of serverOps) {
        const [transformed] = CRDT.transformAgainstEachOther(transformedOp, serverOp);
        transformedOp = transformed;
      }

      if (!processedIds.has(transformedOp.operationId)) {
        merged.push(transformedOp);
        processedIds.add(transformedOp.operationId);
      }
    }

    return merged;
  }
}

export default CRDT;
