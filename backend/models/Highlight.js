import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    page: {
      type: Number,
      required: true,
    },
    position: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    color: {
      type: String,
      default: "#FFFF00", // yellow
    },
  },
  { timestamps: true }
);

export default mongoose.model("Highlight", highlightSchema);
