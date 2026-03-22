import mongoose from "mongoose";

const sessionNotesSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
    },
    lastEditedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SessionNotes", sessionNotesSchema);
