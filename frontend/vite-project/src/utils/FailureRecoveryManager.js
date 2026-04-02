/**
 * Failure Recovery System
 * Automatic reconnection, operation replay, checkpoints, data corruption detection
 */

export class FailureRecoveryManager {
  constructor(sessionId, userId, socket, onRecovered) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.socket = socket;
    this.onRecovered = onRecovered;
    
    this.maxRetries = 5;
    this.retryDelay = 1000; // ms, exponential backoff
    this.retryCount = 0;
    this.isConnecting = false;
    
    this.checkpoints = []; // Session snapshots
    this.operationLog = []; // All operations for replay
    this.pendingReplay = [];
    this.lastVerifiedCheckpoint = null;
    this.corruptionDetected = false;
    
    this.setupRecoveryHandlers();
  }

  /**
   * Setup Socket.io event handlers for failure detection
   */
  setupRecoveryHandlers() {
    this.socket.on("disconnect", () => {
      console.error("❌ Socket disconnected - initiating recovery");
      this.initiateRecovery();
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      this.initiateRecovery();
    });

    this.socket.on("recovery-checkpoint", (checkpoint) => {
      console.log("📌 Received recovery checkpoint");
      this.processCheckpoint(checkpoint);
    });

    this.socket.on("corruption-detected", (data) => {
      console.warn("⚠️ Data corruption detected on server");
      this.handleCorruptionDetection(data);
    });
  }

  /**
   * Initiate recovery process with exponential backoff
   */
  async initiateRecovery() {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    console.log(`🔄 Starting recovery (attempt ${this.retryCount + 1}/${this.maxRetries})`);

    while (this.retryCount < this.maxRetries) {
      try {
        // Wait for exponential backoff
        await this.delay(this.retryDelay * Math.pow(2, this.retryCount));

        // Attempt to reconnect
        if (this.socket.connected) {
          console.log("✅ Socket reconnected!");
          this.retryCount = 0; // Reset counter
          await this.replayOperations();
          await this.verifyDataIntegrity();
          this.isConnecting = false;
          
          if (this.onRecovered) {
            this.onRecovered({ success: true, recovered: true });
          }
          return;
        }

        this.retryCount++;
      } catch (error) {
        console.error("❌ Recovery attempt failed:", error);
        this.retryCount++;
      }
    }

    // Max retries exceeded
    this.isConnecting = false;
    console.error("❌ Recovery failed - max retries exceeded");
    
    if (this.onRecovered) {
      this.onRecovered({ success: false, error: "Max retries exceeded" });
    }
  }

  /**
   * Record an operation for replay
   */
  recordOperation(operation) {
    this.operationLog.push({
      id: operation.id,
      type: operation.type,
      data: operation.data,
      timestamp: operation.timestamp,
      userId: this.userId,
      synced: false,
    });

    // Keep only last 1000 operations
    if (this.operationLog.length > 1000) {
      this.operationLog.shift();
    }
  }

  /**
   * Mark operation as synced (acknowledged by server)
   */
  markOperationSynced(operationId) {
    const operation = this.operationLog.find((op) => op.id === operationId);
    if (operation) {
      operation.synced = true;
    }
  }

  /**
   * Replay unsynced operations
   */
  async replayOperations() {
    const unsynced = this.operationLog.filter((op) => !op.synced);
    
    if (unsynced.length === 0) {
      console.log("✅ No operations to replay");
      return;
    }

    console.log(`🔄 Replaying ${unsynced.length} unsynced operations`);

    for (const operation of unsynced) {
      try {
        // Emit operation back to server
        await new Promise((resolve, reject) => {
          this.socket.emit(
            "operation-replay",
            {
              sessionId: this.sessionId,
              operation: operation,
            },
            (ack) => {
              if (ack?.success) {
                this.markOperationSynced(operation.id);
                resolve();
              } else {
                reject(new Error("Operation replay failed"));
              }
            }
          );
        });
      } catch (error) {
        console.error(`❌ Failed to replay operation ${operation.id}:`, error);
        this.pendingReplay.push(operation);
      }
    }

    if (this.pendingReplay.length > 0) {
      console.warn(`⚠️ ${this.pendingReplay.length} operations still pending`);
    } else {
      console.log("✅ All operations replayed successfully");
    }
  }

  /**
   * Create session checkpoint
   */
  createCheckpoint(sessionState) {
    const checkpoint = {
      id: `checkpoint-${Date.now()}`,
      sessionId: this.sessionId,
      timestamp: new Date(),
      operationCount: this.operationLog.length,
      state: JSON.stringify(sessionState), // Snapshots current session state
      hash: this.calculateCheckpointHash(sessionState),
    };

    this.checkpoints.push(checkpoint);

    // Keep only last 10 checkpoints
    if (this.checkpoints.length > 10) {
      this.checkpoints.shift();
    }

    console.log(`📌 Checkpoint created: ${checkpoint.id}`);
    return checkpoint;
  }

  /**
   * Calculate checkpoint hash for integrity verification
   */
  calculateCheckpointHash(state) {
    const stateString = JSON.stringify(state);
    let hash = 0;

    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Process checkpoint from server
   */
  processCheckpoint(checkpoint) {
    try {
      const hash = this.calculateCheckpointHash(JSON.parse(checkpoint.state));

      if (hash !== checkpoint.hash) {
        console.error("❌ Checkpoint hash mismatch - possible corruption");
        this.corruptionDetected = true;
        return false;
      }

      this.lastVerifiedCheckpoint = checkpoint;
      console.log(`✅ Checkpoint verified: ${checkpoint.id}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to process checkpoint:", error);
      return false;
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity() {
    try {
      const response = await fetch(`/api/sessions/${this.sessionId}/verify-integrity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          lastCheckpointId: this.lastVerifiedCheckpoint?.id,
          operationCount: this.operationLog.length,
        }),
      });

      const result = await response.json();

      if (result.integrityOk) {
        console.log("✅ Data integrity verified");
        this.corruptionDetected = false;
        return true;
      } else {
        console.error("❌ Data integrity check failed");
        this.corruptionDetected = true;
        
        // Attempt recovery from checkpoint
        if (this.lastVerifiedCheckpoint) {
          await this.recoverFromCheckpoint(this.lastVerifiedCheckpoint);
        }

        return false;
      }
    } catch (error) {
      console.error("❌ Integrity verification failed:", error);
      return false;
    }
  }

  /**
   * Recover from checkpoint
   */
  async recoverFromCheckpoint(checkpoint) {
    try {
      console.log(`🔄 Recovering from checkpoint: ${checkpoint.id}`);

      const response = await fetch(`/api/sessions/${this.sessionId}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkpointId: checkpoint.id,
          userId: this.userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Recovery from checkpoint successful");
        // Clear pending operations (replaced by checkpoint)
        this.operationLog = [];
        this.pendingReplay = [];
        return true;
      }
    } catch (error) {
      console.error("❌ Checkpoint recovery failed:", error);
    }

    return false;
  }

  /**
   * Handle corruption detection
   */
  async handleCorruptionDetection(data) {
    console.warn("⚠️ Data corruption detected:", data);

    this.corruptionDetected = true;

    // Try to recover from latest checkpoint
    if (this.checkpoints.length > 0) {
      const latestCheckpoint = this.checkpoints[this.checkpoints.length - 1];
      await this.recoverFromCheckpoint(latestCheckpoint);
    } else {
      // Force full session reset
      console.error("❌ No checkpoints available - requesting full sync");
      this.socket.emit("request-full-sync", { sessionId: this.sessionId, userId: this.userId });
    }
  }

  /**
   * Get recovery status
   */
  getStatus() {
    return {
      isConnected: this.socket.connected,
      isConnecting: this.isConnecting,
      retryCount: this.retryCount,
      operationCount: this.operationLog.length,
      unsyncopCount: this.operationLog.filter((op) => !op.synced).length,
      checkpoints: this.checkpoints.length,
      lastCheckpointId: this.lastVerifiedCheckpoint?.id || null,
      corruptionDetected: this.corruptionDetected,
      pendingReplay: this.pendingReplay.length,
    };
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset recovery manager
   */
  reset() {
    this.retryCount = 0;
    this.isConnecting = false;
    this.operationLog = [];
    this.pendingReplay = [];
    this.corruptionDetected = false;
    console.log("✅ Recovery manager reset");
  }
}

export default FailureRecoveryManager;
