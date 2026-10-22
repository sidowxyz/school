import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid MongoDB ObjectId' });

const decisionSchema = z.object({
  studentId: objectIdSchema,
  decision: z.enum(['promote', 'retain']),
  percentage: z.number().nullable().optional(),
  reason: z.string().max(500).optional()
});

export const promoteClassSchema = z.object({
  class_id: objectIdSchema,
  year_id: objectIdSchema.optional(),
  decisions: z.array(decisionSchema).min(1, 'Select at least one student to promote'),
  // Destination sections, keyed by student id. '*' places everyone in the same
  // section. Omitted entirely when the destination class has no sections.
  section_map: z.record(z.string(), objectIdSchema.nullable()).optional()
});

export const promoteSpecialSchema = z.object({
  student_id: objectIdSchema,
  to_class_id: objectIdSchema,
  to_section_id: objectIdSchema.nullable().optional(),
  year_id: objectIdSchema.optional(),
  // The whole point of the special path: an exceptional move must say why.
  reason: z
    .string()
    .trim()
    .min(10, 'Explain why this student is moving outside the normal promotion path (at least 10 characters)')
    .max(500)
});
