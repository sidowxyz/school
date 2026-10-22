import mongoose from "mongoose";
import Notice from "../models/notice.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import CommCounter from "../models/CommCounter.js";
import User from "../models/User.js";
import { sendBulkEmail, sendBulkSMS } from "./gatewayService.js";

//
// HELPER: Generate sequential IDs
//

const generateId = async (name, prefix) => {
  const counter = await CommCounter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(4, "0")}`;
};

//
// NOTICE SERVICE
//

export const createNoticeService = async (body, userId) => {
  const notice_no = await generateId("notice", "NOT");
  return await Notice.create({ ...body, notice_no, createBy: userId });
};

export const getAllNoticesService = async (query) => {
  const { page = 1, limit = 10, role, is_published, class_id, section_id } = query;
  const filter = {};
  if (role) filter.target_role = role;
  if (is_published !== undefined) filter.is_published = is_published === "true";
  if (class_id) filter.target_class_id = class_id;
  if (section_id) filter.target_section_id = section_id;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Notice.countDocuments(filter);
  const notices = await Notice.find(filter)
    .populate("createBy", "firstName lastName email")
    .populate("target_class_id", "cl_name")
    .populate("target_section_id", "name")
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return {
    pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / limit) },
    notices,
  };
};

export const getNoticeByIdService = async (id) => {
  const notice = await Notice.findById(id)
    .populate("createBy", "firstName lastName email")
    .populate("target_class_id", "cl_name")
    .populate("target_section_id", "name")
    .populate("target_users", "firstName lastName email");
  if (!notice) throw new Error("Notice not found");
  return notice;
};

export const updateNoticeService = async (id, body, userId) => {
  const notice = await Notice.findByIdAndUpdate(
    id,
    { $set: { ...body, updateBy: userId } },
    { new: true, runValidators: true }
  );
  if (!notice) throw new Error("Notice not found");
  return notice;
};

export const deleteNoticeService = async (id) => {
  const notice = await Notice.findByIdAndDelete(id);
  if (!notice) throw new Error("Notice not found");

  // Publishing a notice creates one Notification per recipient. Keep those
  // derived records in sync with their source so deleted announcements cannot
  // remain visible in dashboard/top-bar notification feeds.
  await Notification.deleteMany({ reference_model: "Notice", reference_id: notice._id });
  return notice;
};

/**
 * publishNoticeService
 * When publishing a notice, auto-creates Notification records for target users
 * and triggers the email/SMS gateway placeholders.
 */
export const publishNoticeService = async (id, userId) => {
  const notice = await Notice.findById(id);
  if (!notice) throw new Error("Notice not found");
  if (notice.is_published) throw new Error("Notice is already published");

  notice.is_published = true;
  notice.published_at = new Date();
  notice.updateBy = userId;
  await notice.save();

  // Build query to find target users
  const userQuery = {};

  // Note: User.js stores role_id as ObjectId ref to Role.
  // For role-based targeting we match against 'role_id' populated value.
  // If target_role is 'all', send to everyone; otherwise filter by role name.
  // (Adjust this query if your User model stores role differently.)
  if (notice.target_role && notice.target_role !== "all") {
    // Find Role document matching the role name, then get users with that role
    // For now we do a broad find and the controller can be refined later
    // userQuery['role_id.role_name'] needs populate — use aggregate or join.
    // Simple approach: no role filter at DB level; future enhancement.
  }

  // Get explicitly targeted users
  let targetedUserIds = [...(notice.target_users || [])];

  // If no individual users specified, get all users (simplistic default)
  // Real implementation: query by role/class/section
  if (targetedUserIds.length === 0) {
    const allUsers = await User.find({}).select("_id").lean();
    targetedUserIds = allUsers.map((u) => u._id);
  }

  // Bulk-create notifications for each target user
  if (targetedUserIds.length > 0) {
    const notifPrefix = "NTF";
    const notifications = [];

    for (const uid of targetedUserIds) {
      const notification_id = await generateId("notification", notifPrefix);
      notifications.push({
        notification_id,
        user_id: uid,
        type: "notice",
        title: notice.title,
        body: notice.content.substring(0, 200),
        reference_id: notice._id,
        reference_model: "Notice",
        createBy: userId,
      });
    }

    await Notification.insertMany(notifications, { ordered: false });
  }

  // Gateway placeholder — Email
  // In production: query each user's email from Staff/Student profile
  await sendBulkEmail([], notice.title, notice.content); // empty list = placeholder
  notice.email_sent = true;
  await notice.save();

  return notice;
};

//
// MESSAGE SERVICE
//

export const sendMessageService = async (body, senderId) => {
  const message_id = await generateId("message", "MSG");
  const message = await Message.create({
    ...body,
    message_id,
    sender_id: senderId,
    createBy: senderId,
  });

  // Auto-create notification for receiver
  const notification_id = await generateId("notification", "NTF");
  await Notification.create({
    notification_id,
    user_id: body.receiver_id,
    type: "message",
    title: `New message: ${body.subject}`,
    body: body.message.substring(0, 200),
    reference_id: message._id,
    reference_model: "Message",
    createBy: senderId,
  });

  return message;
};

export const getInboxService = async (userId, query) => {
  const { page = 1, limit = 10, is_read } = query;
  const filter = {
    receiver_id: userId,
    is_deleted_by_receiver: false,
  };
  if (is_read !== undefined) filter.is_read = is_read === "true";

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Message.countDocuments(filter);
  const messages = await Message.find(filter)
    .populate("sender_id", "firstName lastName email")
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return {
    pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / limit) },
    messages,
  };
};

export const getSentMessagesService = async (userId, query) => {
  const { page = 1, limit = 10 } = query;
  const filter = { sender_id: userId, is_deleted_by_sender: false };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Message.countDocuments(filter);
  const messages = await Message.find(filter)
    .populate("receiver_id", "firstName lastName email")
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return {
    pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / limit) },
    messages,
  };
};

export const getMessageByIdService = async (id, userId) => {
  const message = await Message.findById(id)
    .populate("sender_id", "firstName lastName email")
    .populate("receiver_id", "firstName lastName email");
  if (!message) throw new Error("Message not found");

  const isParty =
    message.sender_id._id.toString() === userId.toString() ||
    message.receiver_id._id.toString() === userId.toString();
  if (!isParty) throw new Error("Access denied");

  return message;
};

export const markMessageReadService = async (id, userId) => {
  const message = await Message.findOne({ _id: id, receiver_id: userId });
  if (!message) throw new Error("Message not found or access denied");

  if (!message.is_read) {
    message.is_read = true;
    message.read_at = new Date();
    message.updateBy = userId;
    await message.save();
  }
  return message;
};

export const deleteMessageService = async (id, userId) => {
  const message = await Message.findById(id);
  if (!message) throw new Error("Message not found");

  const isSender = message.sender_id.toString() === userId.toString();
  const isReceiver = message.receiver_id.toString() === userId.toString();
  if (!isSender && !isReceiver) throw new Error("Access denied");

  if (isSender) message.is_deleted_by_sender = true;
  if (isReceiver) message.is_deleted_by_receiver = true;
  message.updateBy = userId;
  await message.save();
  return message;
};

//
// NOTIFICATION SERVICE
//

const pruneOrphanedNoticeNotifications = async (userId) => {
  const noticeNotifications = await Notification.find({
    user_id: userId,
    reference_model: "Notice",
    reference_id: { $ne: null },
  }).select("_id reference_id").lean();

  if (noticeNotifications.length === 0) return;

  const existingNoticeIds = new Set(
    (await Notice.find({
      _id: { $in: noticeNotifications.map((notification) => notification.reference_id) },
    }).distinct("_id")).map((id) => id.toString())
  );
  const orphanIds = noticeNotifications
    .filter((notification) => !existingNoticeIds.has(notification.reference_id.toString()))
    .map((notification) => notification._id);

  if (orphanIds.length > 0) await Notification.deleteMany({ _id: { $in: orphanIds } });
};

export const getMyNotificationsService = async (userId, query) => {
  await pruneOrphanedNoticeNotifications(userId);
  const { page = 1, limit = 10, is_read, type } = query;
  const filter = { user_id: userId };
  if (is_read !== undefined) filter.is_read = is_read === "true";
  if (type) filter.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .populate('reference_id')
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return {
    pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / limit) },
    notifications,
  };
};

export const getUnreadCountService = async (userId) => {
  await pruneOrphanedNoticeNotifications(userId);
  const count = await Notification.countDocuments({ user_id: userId, is_read: false });
  return count;
};

export const markNotificationReadService = async (id, userId) => {
  const notif = await Notification.findOne({ _id: id, user_id: userId });
  if (!notif) throw new Error("Notification not found or access denied");

  if (!notif.is_read) {
    notif.is_read = true;
    notif.read_at = new Date();
    notif.updateBy = userId;
    await notif.save();
  }
  return notif;
};

export const markAllNotificationsReadService = async (userId) => {
  const result = await Notification.updateMany(
    { user_id: userId, is_read: false },
    { $set: { is_read: true, read_at: new Date() } }
  );
  return result;
};

export const deleteNotificationService = async (id, userId) => {
  const notif = await Notification.findOneAndDelete({ _id: id, user_id: userId });
  if (!notif) throw new Error("Notification not found or access denied");
  return notif;
};

// Admin: create notification manually (e.g. system announcements)
export const createNotificationService = async (body, creatorId) => {
  const notification_id = await generateId("notification", "NTF");
  return await Notification.create({ ...body, notification_id, createBy: creatorId });
};

// Admin: broadcast notifications to multiple users
export const broadcastNotificationsService = async (body, creatorId) => {
  const { user_ids, type, title, body: bodyText, reference_id, reference_model } = body;
  const notifications = [];

  for (const uid of user_ids) {
    const notification_id = await generateId("notification", "NTF");
    notifications.push({
      notification_id,
      user_id: uid,
      type,
      title,
      body: bodyText,
      reference_id: reference_id || null,
      reference_model: reference_model || null,
      createBy: creatorId,
    });
  }

  return await Notification.insertMany(notifications, { ordered: false });
};
