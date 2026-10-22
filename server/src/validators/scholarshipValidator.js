import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

export const createDiscountTypeSchema = z.object({
  discount_type_id: z.string().min(1, 'Discount type ID is required'),
  discount_type_name: z.string().min(1, 'Discount type name is required'),
  description: z.string().optional()
});

export const updateDiscountTypeSchema = createDiscountTypeSchema.partial();

export const createAppliesToSchema = z.object({
  applies_to_id: z.string().min(1, 'Applies to ID is required'),
  applies_to_name: z.string().min(1, 'Applies to name is required'),
  description: z.string().optional()
});

export const updateAppliesToSchema = createAppliesToSchema.partial();

export const createScholarshipTypeSchema = z.object({
  schola_type_no: z.string().min(1, 'Scholarship type number is required'),
  scholarship_name: z.string().min(1, 'Scholarship name is required'),
  description: z.string().optional()
});

export const updateScholarshipTypeSchema = createScholarshipTypeSchema.partial();

export const createScholarshipSchema = z.object({
  scholarship_id: z.string().min(1, 'Scholarship ID is required'),
  scholar_type_no: objectIdSchema,
  discount_type_id: objectIdSchema,
  discount_value: z.number().min(0, 'Discount value must be non-negative'),
  description: z.string().optional(),
  is_active: z.boolean().optional()
});

export const updateScholarshipSchema = createScholarshipSchema.partial();

export const createSiblingRuleSchema = z.object({
  rule_id: z.string().min(1, 'Rule ID is required'),
  rule_name: z.string().min(1, 'Rule name is required'),
  minimum_siblings: z.number().min(1, 'Minimum siblings must be at least 1'),
  discount_percentage: z.number().min(0).max(100, 'Discount percentage must be between 0 and 100'),
  applies_to_id: objectIdSchema,
  description: z.string().optional(),
  is_active: z.boolean().optional()
});

export const updateSiblingRuleSchema = createSiblingRuleSchema.partial();

const studentScholarshipBaseSchema = z.object({
  student_scholarship_id: z.string().min(1, 'Student scholarship ID is required'),
  st_no: objectIdSchema,
  scholarship_id: objectIdSchema.optional().nullable(),
  rule_id: objectIdSchema.optional().nullable(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
  status_no: objectIdSchema,
  remarks: z.string().optional()
});

export const createStudentScholarshipSchema = studentScholarshipBaseSchema.refine(data => data.scholarship_id || data.rule_id, {
  message: 'Either scholarship_id or rule_id must be provided',
  path: ['scholarship_id']
});

export const updateStudentScholarshipSchema = studentScholarshipBaseSchema.partial();
