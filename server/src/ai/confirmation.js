import aiConfig from '../config/aiConfig.js';
import AppError from '../utils/AppError.js';
import { logAudit } from '../utils/auditHelper.js';
import AiPendingAction from '../models/AiPendingAction.js';
import { resolveTool, parseArgs } from './registry/index.js';
import { LEVEL } from './registry/defineTool.js';

export const AI_AUDIT_MODULE = 'AIAssistant';

/**
 * Prepare a consequential action without performing it.
 *
 * The preview is built here, server-side, by the tool's own buildPreview() from
 * live data. It is never assembled from model output, so the description the
 * user approves is guaranteed to match the arguments that will execute.
 */
export const prepareAction = async ({ req, actor, toolName, rawArgs }) => {
  const tool = resolveTool(toolName, actor);

  if (tool.level !== LEVEL.CONFIRM) {
    throw new AppError('That action does not require confirmation.', 400);
  }

  const args = parseArgs(tool, rawArgs);
  const preview = await tool.buildPreview({ req, args, actor });

  const pending = await AiPendingAction.create({
    user_id: actor.id,
    role: actor.role,
    tool: tool.name,
    args,
    preview,
    expiresAt: new Date(Date.now() + aiConfig.pendingActionTtlMinutes * 60 * 1000),
  });

  await logAudit({
    userId: actor.id,
    action: 'AI_ACTION_PREPARED',
    module: AI_AUDIT_MODULE,
    recordId: pending._id.toString(),
    after: { tool: tool.name, argKeys: Object.keys(args ?? {}), impact: preview.impact },
    ip: req.ip,
  });

  return {
    type: 'confirmation_required',
    tool: tool.name,
    actionId: pending._id.toString(),
    preview,
    expiresAt: pending.expiresAt,
  };
};

/**
 * Execute a previously prepared action.
 *
 * Everything is re-checked here rather than trusted from preparation time:
 * ownership (part of the query, so another user's action simply does not
 * resolve), status, expiry, and — importantly — the caller's *current* role.
 * A user demoted between preparing and confirming cannot execute.
 */
export const confirmAction = async ({ req, actor, actionId }) => {
  const pending = await AiPendingAction.findOne({
    _id: actionId,
    user_id: actor.id,
  }).catch(() => null);

  if (!pending) throw new AppError('That action was not found.', 404);

  if (pending.status !== 'pending') {
    throw new AppError(`That action was already ${pending.status}.`, 409);
  }

  if (!pending.isExecutable()) {
    throw new AppError('That action has expired. Please ask again to get a fresh preview.', 410);
  }

  // Re-authorize against the role the caller holds now, not the one recorded.
  const tool = resolveTool(pending.tool, actor);

  // Re-validate the stored arguments. If a schema changed since preparation,
  // fail rather than execute something that no longer conforms.
  const args = parseArgs(tool, pending.args);

  let result;
  try {
    result = await tool.handler({ req, args, actor });
    pending.status = 'confirmed';
    pending.confirmedAt = new Date();
    pending.resultRecordId = result?._id?.toString() ?? result?.id?.toString() ?? null;
  } catch (err) {
    pending.status = 'failed';
    pending.error = err.message?.slice(0, 300) ?? 'Unknown error';
    await pending.save();

    await logAudit({
      userId: actor.id,
      action: 'AI_ACTION_FAILED',
      module: AI_AUDIT_MODULE,
      recordId: pending._id.toString(),
      after: { tool: pending.tool, error: pending.error },
      ip: req.ip,
    });

    throw err;
  }

  await pending.save();

  await logAudit({
    userId: actor.id,
    action: 'AI_ACTION_CONFIRMED',
    module: AI_AUDIT_MODULE,
    recordId: pending.resultRecordId ?? pending._id.toString(),
    after: {
      tool: pending.tool,
      actionId: pending._id.toString(),
      impact: pending.preview?.impact,
      confirmed: true,
    },
    ip: req.ip,
  });

  return { type: 'action_executed', tool: pending.tool, data: result };
};

export const cancelAction = async ({ req, actor, actionId }) => {
  const pending = await AiPendingAction.findOne({
    _id: actionId,
    user_id: actor.id,
    status: 'pending',
  }).catch(() => null);

  if (!pending) throw new AppError('That action was not found.', 404);

  pending.status = 'cancelled';
  await pending.save();

  await logAudit({
    userId: actor.id,
    action: 'AI_ACTION_CANCELLED',
    module: AI_AUDIT_MODULE,
    recordId: pending._id.toString(),
    after: { tool: pending.tool },
    ip: req.ip,
  });

  return { id: pending._id.toString(), status: 'cancelled' };
};
