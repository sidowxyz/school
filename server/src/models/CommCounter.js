import mongoose from "mongoose";

/**
 * CommCounter — Atomic sequential ID generator for communication module.
 * Used to generate: NOT-0001 (notice), MSG-0001 (message), NTF-0001 (notification)
 *
 * Separate from the student Counter model to avoid collisions.
 */
const commCounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "notice", "message", "notification"
  seq: { type: Number, default: 0 },
});

const CommCounter = mongoose.model("CommCounter", commCounterSchema);
export default CommCounter;
