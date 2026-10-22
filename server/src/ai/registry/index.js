import AppError from '../../utils/AppError.js';
import { tools } from './tools.js';

/**
 * The controlled tool registry.
 *
 * The model may only ever emit a tool *name*. Resolution, role checking and
 * argument validation all happen here, server-side, against the authenticated
 * request — never against anything the model said. This is the boundary that
 * makes "the model must never be the authorization authority" true in code
 * rather than in a prompt instruction.
 */

const byName = new Map();
for (const tool of tools) {
  if (byName.has(tool.name)) {
    throw new Error(`[ai/registry] Duplicate tool name "${tool.name}".`);
  }
  byName.set(tool.name, tool);
}

export const getTool = (name) => byName.get(name) ?? null;

export const allTools = () => [...byName.values()];

/** Tools a given role may call. Drives both the model's menu and the UI's. */
export const toolsForRole = (role) => allTools().filter((t) => t.roles.includes(role));

/** Role-aware quick actions — same registry entries the chat path uses, so a
 *  button and a sentence can never diverge in behaviour or permissions. */
export const quickActionsForRole = (role) =>
  toolsForRole(role)
    .filter((t) => t.quickAction)
    .map((t) => ({
      tool: t.name,
      label: t.quickAction.label,
      icon: t.quickAction.icon,
      group: t.quickAction.group,
      /* A quick action is only a one-click button when the tool needs no
         arguments; anything else has to be asked for conversationally, so the
         client opens the composer with `prompt` instead of firing blind. */
      instant: isArgFree(t),
      prompt: t.quickAction.prompt ?? null,
    }));

const isArgFree = (tool) => {
  const shape = tool.input?.shape;
  if (!shape) return false;
  return Object.keys(shape).every((key) => {
    const field = shape[key];
    return typeof field?.isOptional === 'function' ? field.isOptional() : false;
  });
};

/**
 * Resolve a tool for an authenticated caller.
 * Throws rather than returning null so no caller can forget to check.
 */
export const resolveTool = (name, actor) => {
  const tool = getTool(name);

  // Deliberately identical errors for "no such tool" and "not allowed": a
  // caller probing tool names should not be able to map the registry.
  if (!tool || !actor || !tool.roles.includes(actor.role)) {
    throw new AppError('That action is not available for your role.', 403);
  }

  return tool;
};

/** Validate model- or client-supplied arguments against the tool's own schema. */
export const parseArgs = (tool, rawArgs) => {
  const result = tool.input.safeParse(rawArgs ?? {});
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
      .join('; ');
    throw new AppError(`Invalid arguments for ${tool.name} — ${detail}`, 400);
  }
  return result.data;
};

export { LEVEL, SCOPE } from './defineTool.js';
