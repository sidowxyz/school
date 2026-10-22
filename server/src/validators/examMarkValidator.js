import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid MongoDB ObjectId' });

const entrySchema = z.object({
  studentId: objectIdSchema,
  // null is "not marked yet"; the service checks the range against the
  // exam's total_marks, which it has to load anyway.
  marks: z.coerce.number().min(0, 'Marks cannot be negative').nullable().optional(),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional()
});

export const saveSubmissionSchema = z.object({
  exam_id: objectIdSchema,
  class_id: objectIdSchema,
  subject_id: objectIdSchema,
  section_id: objectIdSchema.nullable().optional(),
  entries: z.array(entrySchema),
  // The rest of the workflow (approve/return/publish) moves through its own
  // endpoints so a teacher can't self-approve by posting a status.
  status: z.enum(['draft', 'submitted']).optional()
});

export const returnSubmissionSchema = z.object({
  reason: z.string().min(1, 'Give the teacher a reason for returning these marks')
});

export const publishAllSchema = z.object({
  exam_id: objectIdSchema.optional(),
  class_id: objectIdSchema.optional()
});
