import * as commService from "../services/communicationService.js";
import AppError from "../utils/AppError.js";
import ApiResponse from "../utils/ApiResponse.js";

//
// NOTICE CONTROLLER
//

// @desc    Create a notice (admin only, starts as draft)
// @route   POST /api/communication/notices
// @access  Admin
export const createNotice = async (req, res, next) => {
  try {
    const notice = await commService.createNoticeService(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, notice, "Notice created successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get all notices (with filters: role, class, section, published status)
// @route   GET /api/communication/notices
// @access  Admin, Teacher
export const getAllNotices = async (req, res, next) => {
  try {
    const data = await commService.getAllNoticesService(req.query);
    res.json(new ApiResponse(200, data, "Notices retrieved successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single notice by ID
// @route   GET /api/communication/notices/:id
// @access  Authenticated
export const getNoticeById = async (req, res, next) => {
  try {
    const notice = await commService.getNoticeByIdService(req.params.id);
    res.json(new ApiResponse(200, notice, "Notice retrieved successfully"));
  } catch (err) {
    next(new AppError(err.message, 404));
  }
};

// @desc    Update a notice (only if not yet published)
// @route   PUT /api/communication/notices/:id
// @access  Admin
export const updateNotice = async (req, res, next) => {
  try {
    const notice = await commService.updateNoticeService(req.params.id, req.body, req.user.id);
    res.json(new ApiResponse(200, notice, "Notice updated successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notice
// @route   DELETE /api/communication/notices/:id
// @access  Admin
export const deleteNotice = async (req, res, next) => {
  try {
    await commService.deleteNoticeService(req.params.id);
    res.json(new ApiResponse(200, null, "Notice deleted successfully"));
  } catch (err) {
    next(new AppError(err.message, 404));
  }
};

// @desc    Publish a notice — creates notifications for all targeted users
// @route   PATCH /api/communication/notices/:id/publish
// @access  Admin
export const publishNotice = async (req, res, next) => {
  try {
    const notice = await commService.publishNoticeService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, notice, "Notice published and notifications dispatched"));
  } catch (err) {
    next(new AppError(err.message, 400));
  }
};

//
// MESSAGE CONTROLLER
//

// @desc    Send a direct message to a user
// @route   POST /api/communication/messages
// @access  Authenticated
export const sendMessage = async (req, res, next) => {
  try {
    const message = await commService.sendMessageService(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, message, "Message sent successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged-in user's inbox
// @route   GET /api/communication/messages/inbox
// @access  Authenticated
export const getInbox = async (req, res, next) => {
  try {
    const data = await commService.getInboxService(req.user.id, req.query);
    res.json(new ApiResponse(200, data, "Inbox retrieved successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged-in user's sent messages
// @route   GET /api/communication/messages/sent
// @access  Authenticated
export const getSentMessages = async (req, res, next) => {
  try {
    const data = await commService.getSentMessagesService(req.user.id, req.query);
    res.json(new ApiResponse(200, data, "Sent messages retrieved successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single message by ID (sender or receiver only)
// @route   GET /api/communication/messages/:id
// @access  Authenticated (sender or receiver)
export const getMessageById = async (req, res, next) => {
  try {
    const message = await commService.getMessageByIdService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, message, "Message retrieved successfully"));
  } catch (err) {
    next(new AppError(err.message, 403));
  }
};

// @desc    Mark a message as read
// @route   PATCH /api/communication/messages/:id/read
// @access  Authenticated (receiver only)
export const markMessageRead = async (req, res, next) => {
  try {
    const message = await commService.markMessageReadService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, message, "Message marked as read"));
  } catch (err) {
    next(new AppError(err.message, 403));
  }
};

// @desc    Delete (soft-delete) a message
// @route   DELETE /api/communication/messages/:id
// @access  Authenticated (sender or receiver)
export const deleteMessage = async (req, res, next) => {
  try {
    await commService.deleteMessageService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, null, "Message deleted successfully"));
  } catch (err) {
    next(new AppError(err.message, 403));
  }
};

//
// NOTIFICATION CONTROLLER
//

// @desc    Get logged-in user's notification feed
// @route   GET /api/communication/notifications
// @access  Authenticated
export const getMyNotifications = async (req, res, next) => {
  try {
    const data = await commService.getMyNotificationsService(req.user.id, req.query);
    res.json(new ApiResponse(200, data, "Notifications retrieved successfully"));
  } catch (err) {
    next(err);
  }
};

// @desc    Get unread notification count (badge count)
// @route   GET /api/communication/notifications/unread-count
// @access  Authenticated
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await commService.getUnreadCountService(req.user.id);
    res.json(new ApiResponse(200, { count }, "Unread count retrieved"));
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/communication/notifications/:id/read
// @access  Authenticated (owner only)
export const markNotificationRead = async (req, res, next) => {
  try {
    const notif = await commService.markNotificationReadService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, notif, "Notification marked as read"));
  } catch (err) {
    next(new AppError(err.message, 403));
  }
};

// @desc    Mark ALL notifications as read
// @route   PATCH /api/communication/notifications/read-all
// @access  Authenticated
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await commService.markAllNotificationsReadService(req.user.id);
    res.json(new ApiResponse(200, { modified: result.modifiedCount }, "All notifications marked as read"));
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/communication/notifications/:id
// @access  Authenticated (owner only)
export const deleteNotification = async (req, res, next) => {
  try {
    await commService.deleteNotificationService(req.params.id, req.user.id);
    res.json(new ApiResponse(200, null, "Notification deleted successfully"));
  } catch (err) {
    next(new AppError(err.message, 403));
  }
};

// @desc    Admin: broadcast system notification to multiple users
// @route   POST /api/communication/notifications/broadcast
// @access  Admin
export const broadcastNotifications = async (req, res, next) => {
  try {
    const result = await commService.broadcastNotificationsService(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, { count: result.length }, "Notifications broadcast successfully"));
  } catch (err) {
    next(err);
  }
};
