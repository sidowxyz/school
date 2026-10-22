import mongoose from "mongoose";

/**
 * Message Model
 *
 * FIXES from original:
 * 1. message_id => auto-generated String counter (MSG-0001) instead of manual Number
 * 2. Removed duplicate 'created_by' field — only createBy/updateBy kept (same pattern as codebase)
 * 3. Added 'subject' field for message headline
 * 4. Added 'read_at' timestamp — shows exact time message was read (not just boolean)
 * 5. Added 'attachment_url' for file sharing
 * 6. Added indexes for inbox/outbox queries
 */

const messageSchema = new mongoose.Schema(
  {
    message_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // FIX: Added subject/headline for the message
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    is_read: {
      type: Boolean,
      default: false,
    },

    // FIX: Timestamp showing exact moment the message was read
    read_at: {
      type: Date,
      default: null,
    },

    // Optional file/image attachment link
    attachment_url: {
      type: String,
      default: null,
    },

    // Gateway placeholder: email notification sent
    email_sent: {
      type: Boolean,
      default: false,
    },

    // Soft delete — allow receiver to delete from inbox without losing record
    is_deleted_by_sender: {
      type: Boolean,
      default: false,
    },

    is_deleted_by_receiver: {
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

// Indexes for inbox/outbox queries
messageSchema.index({ receiver_id: 1, is_read: 1, createDate: -1 });
messageSchema.index({ sender_id: 1, createDate: -1 });

export default mongoose.model("Message", messageSchema);