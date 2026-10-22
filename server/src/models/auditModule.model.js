import mongoose from "mongoose";

const auditModuleSchema = new mongoose.Schema(
  {
    module_no: {
      type: Number,
      required: true,
      unique: true,
    },
    module_name: {
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

export default mongoose.model("AuditModule", auditModuleSchema);