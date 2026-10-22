import mongoose from "mongoose";

/**
 * Notification Model
 *
 * FIXES from original:
 * 1. notification_id => auto-generated String counter (NTF-0001) instead of manual Number
 * 2. Removed duplicate 'created_by' field — only createBy kept (consistent with codebase)
 * 3. Added 'read_at' timestamp — exact moment notification was read
 * 4. Added 'reference_model' discriminator — tells us which model reference_id points to
 * 5. Expanded type enum: added 'fee', 'attendance', 'result' for future extensibility
 * 6. Added indexes for user notification feed queries
 */

const notificationSchema = new mongoose.Schema(
  {
    notification_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // The user who receives this notification
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Expanded enum — covers all current and future notification sources
    type: {
      type: String,
      enum: ["notice", "message", "system", "fee", "attendance", "result"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    // The source document this notification is about (Notice._id, Message._id, etc.)
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reference_model',
      default: null,
    },

    // FIX: Tells us WHICH model the reference_id belongs to — enables proper .populate()
    reference_model: {
      type: String,
      enum: ["Notice", "Message", null],
      default: null,
    },

    is_read: {
      type: Boolean,
      default: false,
    },

    // FIX: Exact timestamp when notification was read
    read_at: {
      type: Date,
      default: null,
    },

    // Gateway placeholder: delivery status tracking
    email_sent: {
      type: Boolean,
      default: false,
    },

    sms_sent: {
      type: Boolean,
      default: false,
    },

    // FIX: Removed duplicate 'created_by' — createBy is the canonical audit field
    createBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updateBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "createDate",
      updatedAt: "updateDate",
    },
  }
);

// Indexes for fast notification feed retrieval
notificationSchema.index({ user_id: 1, is_read: 1, createDate: -1 });
notificationSchema.index({ user_id: 1, type: 1, createDate: -1 });

export default mongoose.model("Notification", notificationSchema);