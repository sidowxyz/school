import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
  createNoticeSchema,
  updateNoticeSchema,
  createMessageSchema,
  bulkNotificationSchema,
} from "../validators/communicationValidator.js";
import {
  // Notice
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  publishNotice,
  // Message
  sendMessage,
  getInbox,
  getSentMessages,
  getMessageById,
  markMessageRead,
  deleteMessage,
  // Notification
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  broadcastNotifications,
} from "../controllers/communicationController.js";

const router = express.Router();

//
// NOTICE ROUTES
//

// Admin: full CRUD on notices
router.post(
  "/notices",
  authenticate,
  authorize("admin"),
  validate(createNoticeSchema),
  createNotice
);

router.get(
  "/notices",
  authenticate,
  authorize("admin", "teacher"),
  getAllNotices
);

router.get(
  "/notices/:id",
  authenticate,
  getNoticeById
);

router.put(
  "/notices/:id",
  authenticate,
  authorize("admin"),
  validate(updateNoticeSchema),
  updateNotice
);

router.delete(
  "/notices/:id",
  authenticate,
  authorize("admin"),
  deleteNotice
);

// Admin: publish notice (triggers notifications + gateway)
router.patch(
  "/notices/:id/publish",
  authenticate,
  authorize("admin"),
  publishNotice
);

//
// MESSAGE ROUTES
//

// Send a direct message (all authenticated users)
router.post(
  "/messages",
  authenticate,
  validate(createMessageSchema),
  sendMessage
);

// Inbox — messages received by logged-in user
router.get(
  "/messages/inbox",
  authenticate,
  getInbox
);

// Sent — messages sent by logged-in user
router.get(
  "/messages/sent",
  authenticate,
  getSentMessages
);

// Get single message (sender or receiver only)
router.get(
  "/messages/:id",
  authenticate,
  getMessageById
);

// Mark message as read (receiver only — enforced in service)
router.patch(
  "/messages/:id/read",
  authenticate,
  markMessageRead
);

// Soft-delete message (sender or receiver)
router.delete(
  "/messages/:id",
  authenticate,
  deleteMessage
);

//
// NOTIFICATION ROUTES
//

// Get my notification feed
router.get(
  "/notifications",
  authenticate,
  getMyNotifications
);

// Get unread badge count
router.get(
  "/notifications/unread-count",
  authenticate,
  getUnreadCount
);

// Mark ALL notifications as read (must come before /:id to avoid route conflict)
router.patch(
  "/notifications/read-all",
  authenticate,
  markAllNotificationsRead
);

// Mark single notification as read
router.patch(
  "/notifications/:id/read",
  authenticate,
  markNotificationRead
);

// Delete a notification
router.delete(
  "/notifications/:id",
  authenticate,
  deleteNotification
);

// Admin: broadcast system notification to multiple users
router.post(
  "/notifications/broadcast",
  authenticate,
  authorize("admin"),
  validate(bulkNotificationSchema),
  broadcastNotifications
);

export default router;
