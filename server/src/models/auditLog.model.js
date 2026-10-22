import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    audit_no: {
      type: Number,
      required: true,
      unique: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action_no: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditAction",
      required: true,
    },

    module_no: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditModule",
      required: true,
    },

    record_id: {
      type: String,
      required: true,
    },

    before_changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    after_changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ip_address: {
      type: String,
      required: true,
    },

    createDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AuditLog", auditLogSchema);