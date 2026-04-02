import mongoose from "mongoose";

/**
 * DocumentHistory - Tracks all changes to documents
 * Enables version control, rollback, and change tracking
 */
const documentHistorySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    changeType: {
      type: String,
      enum: ["edit", "highlight", "annotation", "drawing", "comment", "delete"],
      required: true,
    },
    previousContent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newContent: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    page: {
      type: Number,
      default: 1,
    },
    metadata: {
      x: Number,
      y: Number,
      color: String,
      toolUsed: String,
      textSelected: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    operationId: {
      type: String,
      unique: true,
      sparse: true,
    },
    mergeable: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient history queries
documentHistorySchema.index({ sessionId: 1, documentId: 1, timestamp: -1 });

export default mongoose.model("DocumentHistory", documentHistorySchema);
