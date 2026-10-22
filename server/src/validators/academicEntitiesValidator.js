import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

// Staff Schemas
export const createStaffSchema = z.object({
  stf_no: z.string().min(1, 'Staff number is required'),
  p_no: objectIdSchema,
  job_no: objectIdSchema,
  dep_no: objectIdSchema,
  role_no: objectIdSchema,
  sp_no: objectIdSchema,
  dec_no: objectIdSchema,
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  mobile: z.string().optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  role: z.string().optional(),
  status: z.string().optional()
});
export const updateStaffSchema = createStaffSchema.partial();

// CourseClass Schemas
export const createCourseClassSchema = z.object({
  cc_no: z.string().min(1, 'CourseClass number is required'),
  stf_no: objectIdSchema,
  cl_no: objectIdSchema,
  sub_no: objectIdSchema,
  y_no: objectIdSchema,
  no_periods: z.number().min(1, 'Periods must be at least 1')
});
export const updateCourseClassSchema = createCourseClassSchema.partial();

// ExamReg Schemas
export const createExamRegSchema = z.object({
  ex_r_no: z.string().min(1, 'ExamReg number (ex_r_no) is required'),
  ex_no: objectIdSchema,
  y_no: objectIdSchema,
  started: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }).optional(),
  ended: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }).optional(),
  total_marks: z.number().min(0, 'Total marks must be non-negative').optional()
});
export const updateExamRegSchema = createExamRegSchema.partial();

// Result Schemas
export const createResultSchema = z.object({
  res_no: z.string().min(1, 'Result number (res_no) is required'),
  ex_r_no: objectIdSchema,
  cc_no: objectIdSchema,
  id: objectIdSchema,
  marks: z.number().min(0, 'Marks must be non-negative').optional(),
  grade: z.string().optional(),
  remarks: z.string().optional()
});
export const updateResultSchema = createResultSchema.partial();

// Syllabus Schemas
export const createSyllabusSchema = z.object({
  syllabus_no: z.string().min(1, 'Syllabus number is required'),
  sub_no: objectIdSchema,
  topic: z.string().optional(),
  chapter: z.string().optional()
});
export const updateSyllabusSchema = createSyllabusSchema.partial();

// LessonCoverage Schemas
export const createLessonCoverageSchema = z.object({
  lc_no: z.string().min(1, 'LessonCoverage number is required'),
  syllabus_no: objectIdSchema,
  cc_no: objectIdSchema,
  date_covered: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }).optional(),
  periods_covered: z.number().min(0).optional(),
  remarks: z.string().optional()
});
export const updateLessonCoverageSchema = createLessonCoverageSchema.partial();
