import ApiResponse from '../utils/ApiResponse.js';
import {
  chatService,
  quickActionsService,
  listConversationsService,
  getConversationService,
  deleteConversationService,
  confirmActionService,
  cancelActionService,
} from '../services/aiService.js';
import {
  reviewAssignmentUploadHttpService,
} from '../services/aiUploadService.js';

/**
 * @desc    Ask the assistant a question, or run a quick action
 * @route   POST /api/ai/chat
 * @access  Private (any authenticated role; tool access is role-gated)
 */
export const chat = async (req, res, next) => {
  try {
    const { message, tool, args, conversationId, pageContext } = req.body;
    const result = await chatService({ req, message, tool, args, conversationId, pageContext });
    res.status(200).json(new ApiResponse(200, result, 'Assistant response generated'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute an action the assistant prepared, after explicit confirmation
 * @route   POST /api/ai/actions/:id/confirm
 * @access  Private (owner; role re-checked at execution time)
 */
export const confirmAction = async (req, res, next) => {
  try {
    const data = await confirmActionService(req, req.params.id);
    res.status(200).json(new ApiResponse(200, data, 'Action executed'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a prepared action
 * @route   DELETE /api/ai/actions/:id
 * @access  Private (owner only)
 */
export const cancelAction = async (req, res, next) => {
  try {
    const data = await cancelActionService(req, req.params.id);
    res.status(200).json(new ApiResponse(200, data, 'Action cancelled'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick actions available to the caller's role
 * @route   GET /api/ai/quick-actions
 * @access  Private
 */
export const quickActions = async (req, res, next) => {
  try {
    res.status(200).json(new ApiResponse(200, quickActionsService(req), 'Quick actions retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List the caller's own conversations
 * @route   GET /api/ai/conversations
 * @access  Private (owner only)
 */
export const listConversations = async (req, res, next) => {
  try {
    const data = await listConversationsService(req);
    res.status(200).json(new ApiResponse(200, data, 'Conversations retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch one conversation
 * @route   GET /api/ai/conversations/:id
 * @access  Private (owner only)
 */
export const getConversation = async (req, res, next) => {
  try {
    const data = await getConversationService(req, req.params.id);
    res.status(200).json(new ApiResponse(200, data, 'Conversation retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete one conversation
 * @route   DELETE /api/ai/conversations/:id
 * @access  Private (owner only)
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const data = await deleteConversationService(req, req.params.id);
    res.status(200).json(new ApiResponse(200, data, 'Conversation deleted'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review an uploaded student assignment: writing-integrity signals
 *          and rubric-grounded feedback
 * @route   POST /api/ai/assignments/review-upload  (multipart, field "file")
 * @access  Private (admin, principal, academic_officer; teacher scoped to
 *          their own assigned classes)
 */
export const reviewAssignmentUpload = async (req, res, next) => {
  try {
    const data = await reviewAssignmentUploadHttpService(req);
    res.status(200).json(new ApiResponse(200, data, 'Assignment review complete'));
  } catch (error) {
    next(error);
  }
};
