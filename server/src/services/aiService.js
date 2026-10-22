import AiConversation from '../models/AiConversation.js';
import AppError from '../utils/AppError.js';
import { buildActor } from '../ai/actor.js';
import { handleTurn, quickActionsForRole } from '../ai/orchestrator.js';
import { confirmAction, cancelAction } from '../ai/confirmation.js';

const MAX_CONVERSATIONS_LISTED = 20;

/**
 * Load the caller's conversation, or start one.
 *
 * Ownership is part of the query, not a check afterwards — a conversation id
 * belonging to another user simply does not resolve, so one user can never read
 * another's transcript by guessing an id.
 */
const resolveConversation = async (actor, conversationId, pageContext) => {
  let conversation = null;

  if (conversationId) {
    conversation = await AiConversation.findOne({ _id: conversationId, user_id: actor.id }).catch(
      () => null
    );
    if (!conversation) throw new AppError('Conversation not found.', 404);
  }

  if (!conversation) {
    conversation = new AiConversation({
      user_id: actor.id,
      role: actor.role,
      title: 'New conversation',
    });
  }

  if (pageContext) {
    conversation.pageContext = {
      pageType: pageContext.pageType ?? null,
      entityId: pageContext.entityId ?? null,
    };
  }

  return conversation;
};

export const chatService = async ({ req, message, tool, args, conversationId, pageContext }) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);

  const conversation = await resolveConversation(actor, conversationId, pageContext);

  // Title the thread from its first real question, for the history list.
  if (conversation.isNew && message) {
    conversation.title = message.slice(0, 60);
  }

  const result = await handleTurn({
    req,
    message: message ?? null,
    toolName: tool ?? null,
    conversation,
    explicitArgs: args,
  });

  // Belt and braces on top of orchestrator.js's persistTurn: never hand back an
  // id for a document that was never actually written. Mongoose assigns _id on
  // construction, before save(), so an unsaved conversation still looks valid
  // to the caller — and every future request against that id would 404. Seen
  // in production once already; if some future branch of handleTurn forgets to
  // persist, this is what stops it reaching the client instead of a real id.
  return {
    ...result,
    conversationId: conversation.isNew ? null : conversation._id.toString(),
  };
};

/**
 * Execute a prepared action. Confirmation is a distinct authenticated request
 * by design: it is the step the model provably cannot perform on its own.
 */
export const confirmActionService = async (req, actionId) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);
  return confirmAction({ req, actor, actionId });
};

export const cancelActionService = async (req, actionId) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);
  return cancelAction({ req, actor, actionId });
};

export const quickActionsService = (req) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);
  return quickActionsForRole(actor.role);
};

export const listConversationsService = async (req) => {
  const actor = buildActor(req.user);
  return AiConversation.find({ user_id: actor.id })
    .sort({ lastActivityAt: -1 })
    .limit(MAX_CONVERSATIONS_LISTED)
    .select('title lastActivityAt createdAt');
};

export const getConversationService = async (req, id) => {
  const actor = buildActor(req.user);
  const conversation = await AiConversation.findOne({ _id: id, user_id: actor.id }).catch(() => null);
  if (!conversation) throw new AppError('Conversation not found.', 404);
  return conversation;
};

export const deleteConversationService = async (req, id) => {
  const actor = buildActor(req.user);
  const deleted = await AiConversation.findOneAndDelete({ _id: id, user_id: actor.id }).catch(
    () => null
  );
  if (!deleted) throw new AppError('Conversation not found.', 404);
  return { id };
};
