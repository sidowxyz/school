import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

// Exam Type Schemas
export const createExamTypeSchema = z.object({
  exam_type_no: z.string().min(1, 'Exam type number is required'),
  type_name: z.string().min(1, 'Type name is required')
});

export const updateExamTypeSchema = createExamTypeSchema.partial();

// Exam Schemas
//
// Scheduling: start_time is always required; the caller supplies either
// duration_minutes or end_time and the service derives the other
// (see utils/examTime.js). Cross-field checks that need the stored document
// (an update that only moves start_time) happen in examService.

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:MM format' });

const durationSchema = z.coerce
  .number()
  .int('Duration must be a whole number of minutes')
  .min(1, 'Duration must be at least 1 minute')
  .max(24 * 60, 'Duration cannot exceed 24 hours');

const examScheduleFields = {
  exam_date: z.coerce.date(),
  start_time: timeSchema,
  end_time: timeSchema.optional(),
  duration_minutes: durationSchema.optional()
};

const hasEndOrDuration = (data) => Boolean(data.end_time || data.duration_minutes);
const endOrDurationMessage = {
  message: 'Provide an examination duration or an end time',
  path: ['duration_minutes']
};

const passNotAboveTotal = (data) =>
  data.total_marks === undefined ||
  data.pass_marks === undefined ||
  data.pass_marks <= data.total_marks;
const passMarksMessage = {
  message: 'Pass marks cannot be greater than total marks',
  path: ['pass_marks']
};

export const createExamSchema = z.object({
  ex_no: z.string().min(1).optional(), // auto-generated server-side when omitted
  ex_name: z.string().min(2, 'Exam name must be at least 2 characters').optional(),
  name: z.string().min(2, 'Exam name must be at least 2 characters').optional(),
  class_id: objectIdSchema,
  subject_id: objectIdSchema.optional(),
  section_id: objectIdSchema.optional(),
  academic_year_id: objectIdSchema.optional(),
  term_id: objectIdSchema.optional(),
  exam_period_id: objectIdSchema.optional(),
  exam_type: objectIdSchema,
  total_marks: z.coerce.number().min(0, 'Total marks cannot be negative'),
  pass_marks: z.coerce.number().min(0, 'Pass marks cannot be negative'),
  ...examScheduleFields,
  description: z.string().optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed']).optional(),
  createBy: objectIdSchema.optional(),
  updateBy: objectIdSchema.optional()
})
  .refine((data) => data.ex_name || data.name, {
    message: 'Exam name is required',
    path: ['name']
  })
  .refine(hasEndOrDuration, endOrDurationMessage)
  .refine(passNotAboveTotal, passMarksMessage);

export const updateExamSchema = z.object({
  ex_no: z.string().min(1).optional(),
  ex_name: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  class_id: objectIdSchema.optional(),
  // Explicit null clears the optional reference (e.g. detaching an exam
  // from a timetable period or removing its section restriction).
  subject_id: objectIdSchema.nullable().optional(),
  section_id: objectIdSchema.nullable().optional(),
  academic_year_id: objectIdSchema.nullable().optional(),
  term_id: objectIdSchema.nullable().optional(),
  exam_period_id: objectIdSchema.nullable().optional(),
  exam_type: objectIdSchema.optional(),
  total_marks: z.coerce.number().min(0).optional(),
  pass_marks: z.coerce.number().min(0).optional(),
  exam_date: z.coerce.date().optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  duration_minutes: durationSchema.optional(),
  description: z.string().optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed']).optional(),
  createBy: objectIdSchema.optional(),
  updateBy: objectIdSchema.optional()
}).refine(passNotAboveTotal, passMarksMessage);

// Bulk Exam Creation (one Exam per selected class, sharing a batch_id).
// Kept as a plain (unrefined) object too, so updateBulkExamSchema below can
// call .partial() on it — z.object.refine() returns a ZodEffects, which has
// no .partial() method.
const createBulkExamSchemaBase = z.object({
  class_ids: z.array(objectIdSchema).min(1, 'At least one class is required'),
  subject_id: objectIdSchema.optional(),
  name: z.string().min(2, 'Exam name must be at least 2 characters'),
  exam_type: objectIdSchema,
  total_marks: z.coerce.number().min(0, 'Total marks cannot be negative'),
  pass_marks: z.coerce.number().min(0, 'Pass marks cannot be negative'),
  ...examScheduleFields,
  description: z.string().optional(),
  academic_year_id: objectIdSchema.optional(),
  term_id: objectIdSchema.optional(),
  exam_period_id: objectIdSchema.optional()
});

export const createBulkExamSchema = createBulkExamSchemaBase
  .refine(hasEndOrDuration, endOrDurationMessage)
  .refine(passNotAboveTotal, passMarksMessage);

// Examination Period Schemas — the window a timetable is built inside
export const createExamPeriodSchema = z.object({
  name: z.string().min(2, 'Examination period name must be at least 2 characters'),
  academic_year_id: objectIdSchema.optional(),
  term_id: objectIdSchema.optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional()
}).refine((data) => data.end_date >= data.start_date, {
  message: 'End date cannot be before the start date',
  path: ['end_date']
});

export const updateExamPeriodSchema = z.object({
  name: z.string().min(2).optional(),
  academic_year_id: objectIdSchema.nullable().optional(),
  term_id: objectIdSchema.nullable().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'closed']).optional()
}).refine(
  (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
  { message: 'End date cannot be before the start date', path: ['end_date'] }
);

// Bulk Exam Update — every field optional, since a batch update only touches
// whatever the caller supplies (see examService.updateBulkExams). Only the
// cross-field checks that still make sense on a partial payload apply.
export const updateBulkExamSchema = createBulkExamSchemaBase.partial().refine(passNotAboveTotal, passMarksMessage);
