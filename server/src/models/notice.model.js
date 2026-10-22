import mongoose from "mongoose";

/**
 * Notice Model
 *
 * FIXES from original:
 * 1. notice_no => auto-generated String counter (NOT-0001) instead of manual Number
 * 2. target_role => String enum (matches JWT role field) instead of ObjectId ref to Role
 * 3. Added is_published + published_at for admin publish workflow
 * 4. Added target_users[] array for individual user targeting
 * 5. Removed duplicate audit field — only createBy/updateBy kept (consistent with codebase)
 * 6. Added indexes for frequent query patterns
 */

const noticeSchema = new mongoose.Schema(
  {
    notice_no: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Free-text classification shown in the UI (General / Academic / Event / …).
    category: {
      type: String,
      default: "General",
      trim: true,
    },

    // FIX: String enum matching req.user.role from JWT — NOT ObjectId ref to Role model
    target_role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent", "staff", "all"],
      default: "all",
    },

    target_class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    target_section_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    // FIX: Array instead of single ObjectId — notice can target multiple individual users
    target_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // FIX: Admin publish workflow — notice starts as draft
    is_published: {
      type: Boolean,
      default: false,
    },

    published_at: {
      type: Date,
      default: null,
    },

    // Gateway placeholder: email/SMS sent status
    email_sent: {
      type: Boolean,
      default: false,
    },

    sms_sent: {
      type: Boolean,
      default: false,
    },

    createBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

// Indexes for efficient queries
noticeSchema.index({ target_role: 1, is_published: 1 });
noticeSchema.index({ target_class_id: 1, is_published: 1 });
noticeSchema.index({ createDate: -1 });

export default mongoose.model("Notice", noticeSchema);