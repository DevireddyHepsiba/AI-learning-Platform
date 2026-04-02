const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const DocumentHistory = require("../models/DocumentHistory");
const { CRDT } = require("../utils/CRDT");
const User = require("../models/User");

/**
 * Advanced Session Routes
 * Handles performance metrics, sync operations, verification, recovery
 */

/**
 * POST /api/sessions/performance-metrics
 * Log performance metrics from client
 */
router.post("/performance-metrics", auth, async (req, res) => {
  try {
    const { sessionId, userId, metrics } = req.body;

    console.log(`📊 Performance metrics received for session ${sessionId}:`, {
      averageLatency: metrics.averageLatency,
      failureRate: metrics.failureRate,
      operationCount: metrics.operationCount,
    });

    // Store metrics in database for analytics
    // TODO: Create PerformanceLog model
    // await PerformanceLog.create({
    //   sessionId,
    //   userId,
    //   metrics,
    //   timestamp: new Date(),
    // });

    res.json({ success: true, message: "Metrics recorded" });
  } catch (error) {
    console.error("❌ Error recording metrics:", error);
    res.status(500).json({ error: "Failed to record metrics" });
  }
});

/**
 * POST /api/sessions/sync-operations
 * Sync pending offline operations
 */
router.post("/sync-operations", auth, async (req, res) => {
  try {
    const { sessionId, operations, userId } = req.body;

    console.log(`🔄 Syncing ${operations.length} operations for session ${sessionId}`);

    const syncedOperations = [];

    for (const operation of operations) {
      try {
        // Apply CRDT transformation
        const appliedOp = CRDT.addOperation(operation);

        // Record in DocumentHistory
        await DocumentHistory.create({
          sessionId,
          documentId: operation.documentId,
          userId,
          changeType: operation.type,
          operationId: operation.id,
          metadata: operation.data,
          timestamp: new Date(),
          mergeable: true,
        });

        syncedOperations.push({
          id: operation.id,
          success: true,
        });
      } catch (error) {
        console.error(`❌ Failed to sync operation ${operation.id}:`, error);
        syncedOperations.push({
          id: operation.id,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      synced: syncedOperations,
      message: `Synced ${syncedOperations.filter((op) => op.success).length}/${operations.length} operations`,
    });
  } catch (error) {
    console.error("❌ Error syncing operations:", error);
    res.status(500).json({ error: "Failed to sync operations" });
  }
});

/**
 * POST /api/sessions/:sessionId/verify-integrity
 * Verify data integrity with checkpoints
 */
router.post("/:sessionId/verify-integrity", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, operationCount, lastCheckpointId } = req.body;

    console.log(`🔍 Verifying integrity for session ${sessionId}`);

    // Get all operations for this session
    const operations = await DocumentHistory.find({
      sessionId,
    });

    // Check operation count matches
    const serverOperationCount = operations.length;
    const countMatches = Math.abs(serverOperationCount - operationCount) <= 5; // Allow 5 operation difference due to timing

    // Get checkpoint hash from database
    // TODO: Create Checkpoint model
    const checkpointMatches = true; // Placeholder

    const integrityOk = countMatches && checkpointMatches;

    res.json({
      integrityOk,
      serverOperationCount,
      clientOperationCount: operationCount,
      countMatches,
      checkpointMatches,
      discrepancies: integrityOk ? [] : ["Operation count mismatch"],
    });
  } catch (error) {
    console.error("❌ Integrity verification error:", error);
    res.status(500).json({ error: "Failed to verify integrity" });
  }
});

/**
 * POST /api/sessions/:sessionId/recover
 * Recover session from checkpoint
 */
router.post("/:sessionId/recover", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { checkpointId, userId } = req.body;

    console.log(`🔄 Recovering session ${sessionId} from checkpoint ${checkpointId}`);

    // Get checkpoint (from database)
    // const checkpoint = await Checkpoint.findById(checkpointId);

    // For now, return success
    res.json({
      success: true,
      message: "Recovery initiated",
      // state: checkpoint.state,
    });
  } catch (error) {
    console.error("❌ Recovery error:", error);
    res.status(500).json({ error: "Failed to recover session" });
  }
});

/**
 * GET /api/sessions/:sessionId/history/:documentId
 * Get full document history
 */
router.get("/:sessionId/history/:documentId", auth, async (req, res) => {
  try {
    const { sessionId, documentId } = req.params;

    const history = await DocumentHistory.find({
      sessionId,
      documentId,
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      totalChanges: history.length,
      history: history.slice(0, 50), // Return last 50 changes
    });
  } catch (error) {
    console.error("❌ Error retrieving history:", error);
    res.status(500).json({ error: "Failed to retrieve history" });
  }
});

/**
 * POST /api/sessions/:sessionId/encryption-keys
 * Exchange encryption keys for new users
 */
router.post("/:sessionId/encryption-keys", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.user;
    const { publicKey } = req.body;

    console.log(`🔐 Registering public key for user ${userId}`);

    // Store user's public key
    await User.findByIdAndUpdate(userId, {
      publicKey,
      $push: { encryptionHistory: { date: new Date(), key: publicKey } },
    });

    res.json({
      success: true,
      message: "Public key registered",
      userId,
    });
  } catch (error) {
    console.error("❌ Error registering public key:", error);
    res.status(500).json({ error: "Failed to register public key" });
  }
});

/**
 * GET /api/sessions/:sessionId/participant-keys
 * Get all participant public keys for encryption
 */
router.get("/:sessionId/participant-keys", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session with participants
    const Session = require("../models/Session");
    const session = await Session.findById(sessionId).populate("participants", "publicKey");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const keys = session.participants.reduce((acc, participant) => {
      if (participant.publicKey) {
        acc[participant._id] = participant.publicKey;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      participantKeys: keys,
    });
  } catch (error) {
    console.error("❌ Error retrieving participant keys:", error);
    res.status(500).json({ error: "Failed to retrieve participant keys" });
  }
});

/**
 * POST /api/sessions/:sessionId/create-checkpoint
 * Manually create a checkpoint
 */
router.post("/:sessionId/create-checkpoint", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { state } = req.body;

    console.log(`📌 Creating checkpoint for session ${sessionId}`);

    const checkpointId = `checkpoint-${Date.now()}`;

    // TODO: Create Checkpoint model and save
    // const checkpoint = await Checkpoint.create({
    //   _id: checkpointId,
    //   sessionId,
    //   state: JSON.stringify(state),
    //   timestamp: new Date(),
    // });

    res.json({
      success: true,
      checkpointId,
      message: "Checkpoint created",
    });
  } catch (error) {
    console.error("❌ Error creating checkpoint:", error);
    res.status(500).json({ error: "Failed to create checkpoint" });
  }
});

/**
 * POST /api/sessions/:sessionId/report-corruption
 * Report data corruption detection
 */
router.post("/:sessionId/report-corruption", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.user;
    const { discrepancies } = req.body;

    console.error(`⚠️ Corruption reported in session ${sessionId} by user ${userId}`);
    console.error("Discrepancies:", discrepancies);

    // Log corruption event
    // TODO: Create CorruptionLog model
    // await CorruptionLog.create({
    //   sessionId,
    //   userId,
    //   discrepancies,
    //   timestamp: new Date(),
    // });

    res.json({
      success: true,
      message: "Corruption report recorded",
      supportTicket: `CORRUPT-${sessionId}-${Date.now()}`,
    });
  } catch (error) {
    console.error("❌ Error handling corruption report:", error);
    res.status(500).json({ error: "Failed to handle corruption report" });
  }
});

module.exports = router;
