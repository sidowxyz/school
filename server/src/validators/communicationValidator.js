import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: "Invalid MongoDB ObjectId" });

const VALID_ROLES = ["admin", "teacher", "student", "parent", "staff", "all"];

//
// NOTICE VALIDATORS
//

export const createNoticeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().max(50).optional(),
  target_role: z.enum(["admin", "teacher", "student", "parent", "staff", "all"]).default("all"),
  target_class_id: objectIdSchema.nullable().optional(),
  target_section_id: objectIdSchema.nullable().optional(),
  target_users: z.array(objectIdSchema).optional().default([]),
});

export const updateNoticeSchema = createNoticeSchema.partial();

export const publishNoticeSchema = z.object({
  is_published: z.boolean(),
});

//
// MESSAGE VALIDATORS
//

export const createMessageSchema = z.object({
  receiver_id: objectIdSchema,
  subject: z.string().min(2, "Subject must be at least 2 characters").max(200, "Subject cannot exceed 200 characters"),
  message: z.string().min(1, "Message body cannot be empty"),
  attachment_url: z.string().url("Invalid attachment URL").nullable().optional(),
});

export const updateMessageSchema = createMessageSchema.partial();

//
// NOTIFICATION VALIDATORS
//

export const createNotificationSchema = z.object({
  user_id: objectIdSchema,
  type: z.enum(["notice", "message", "system", "fee", "attendance", "result"]),
  title: z.string().min(2, "Title must be at least 2 characters").max(200, "Title cannot exceed 200 characters"),
  body: z.string().min(1, "Body cannot be empty"),
  reference_id: objectIdSchema.nullable().optional(),
  reference_model: z.enum(["Notice", "Message"]).nullable().optional(),
});

export const bulkNotificationSchema = z.object({
  user_ids: z.array(objectIdSchema).min(1, "At least one user_id is required"),
  type: z.enum(["notice", "message", "system", "fee", "attendance", "result"]),
  title: z.string().min(2).max(200),
  body: z.string().min(1),
  reference_id: objectIdSchema.nullable().optional(),
  reference_model: z.enum(["Notice", "Message"]).nullable().optional(),
});
