import mongoose from "mongoose";

const auditActionSchema = new mongoose.Schema(
  {
    action_no: {
      type: Number,
      required: true,
      unique: true,
    },
    action_name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AuditAction", auditActionSchema);