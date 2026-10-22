import { z } from 'zod';

/**
 * Page context is a strict whitelist, not a passthrough.
 *
 * The client may tell the assistant which page the user is on so "show his
 * attendance" can resolve to the student being viewed. It may not ship page
 * state, form contents, or anything else — those would end up in prompts.
 */
const pageContextSchema = z
  .object({
    pageType: z.string().trim().max(60).optional(),
    entityId: z.string().trim().max(64).optional(),
  })
  .strict()
  .optional();

export const chatSchema = z
  .object({
    // Either a typed question or an explicit quick-action tool. At least one.
    message: z.string().trim().min(1).max(2000).optional(),
    tool: z
      .string()
      .trim()
      .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Invalid tool name')
      .max(64)
      .optional(),
    args: z.record(z.unknown()).optional(),
    conversationId: z.string().trim().max(64).optional(),
    pageContext: pageContextSchema,
  })
  .strict()
  .refine((v) => Boolean(v.message || v.tool), {
    message: 'Provide either a message or a tool.',
  });
