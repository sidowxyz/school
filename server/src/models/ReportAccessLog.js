import mongoose from 'mongoose';

/**
 * One row per report run or export — the audit trail for §14.21. Captures
 * enough to answer "who saw what, when, filtered how" without dragging in
 * the existing AuditLog table's action/module lookup rows.
 *
 * Kept intentionally denormalised: report id and title snapshot the value
 * at the time of access so a later rename in the registry doesn't rewrite
 * history. rowCount is a lightweight signal of dataset size — useful for
 * spotting a role exporting the whole ledger vs one class.
 */
const reportAccessLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },

    reportId: { type: String, required: true, index: true },
    reportTitle: { type: String, required: true },
    department: { type: String },

    // 'view' when hitting /run/:id, 'export' when hitting /export.
    action: { type: String, enum: ['view', 'export'], required: true, index: true },
    // Only set for exports.
    format: { type: String, enum: ['pdf', 'xlsx'], default: null },

    // Filters as sent by the client, minus obviously non-filter keys like
    // "format". Small, uses Mixed so any filter descriptor works.
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },

    rowCount: { type: Number, default: null },
    durationMs: { type: Number, default: null },

    ip: { type: String, default: null },
    userAgent: { type: String, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

reportAccessLogSchema.index({ createdAt: -1 });

export default mongoose.model('ReportAccessLog', reportAccessLogSchema);
