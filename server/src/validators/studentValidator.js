import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Please select a valid option.'
  });

const guardianRegistrationSchema = z.object({
  mode: z.enum(['new', 'existing']),
  guardianId: objectIdSchema.optional(),
  name: z.string().trim().optional(),
  relationship: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().trim().email('Please enter a valid parent email address.'), z.literal('')]).optional(),
  createPortalUser: z.boolean().optional(),
}).superRefine((guardian, ctx) => {
  if (guardian.mode === 'existing' && !guardian.guardianId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guardianId'], message: 'Please select an existing parent or guardian.' });
  }
  if (guardian.mode === 'new') {
    if (!guardian.name || guardian.name.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Parent or guardian name is required.' });
    if (!guardian.relationship) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['relationship'], message: 'Relationship is required.' });
    if (!guardian.phone || guardian.phone.length < 7) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Please enter a valid parent phone number.' });
    if (guardian.createPortalUser && !guardian.email) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email is required when creating parent portal access.' });
  }
});

export const createStudentSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must contain at least 2 characters.'),

  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must contain at least 2 characters.'),

  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .nullable(),

  gender: z.enum(['Male', 'Female'], {
    errorMap: () => ({
      message: 'Please select a gender.'
    })
  }),

  birthDate: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: 'Please enter a valid birth date.'
    }),

  classId: objectIdSchema,

  // Optional: classes that aren't streamed into sections have none to pick.
  sectionId: objectIdSchema.nullable().optional(),

  yearId: objectIdSchema.nullable().optional(),

  guardian: guardianRegistrationSchema.optional(),

  phoneNumber: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number.'),

  address: z
    .string()
    .trim()
    .min(3, 'Please enter the student address.'),

  parentName: z
    .string()
    .trim()
    .min(2, 'Please enter the parent or guardian name.'),

  parentPhoneNumber: z
    .string()
    .trim()
    .min(7, 'Please enter a valid parent phone number.'),

  status: z
    .enum(['Active', 'Inactive', 'Suspended', 'Graduated'])
    .optional()
});

export const updateStudentSchema = createStudentSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(
    ['Active', 'Inactive', 'Suspended', 'Graduated'],
    {
      errorMap: () => ({
        message: 'Please select a valid student status.'
      })
    }
  )
});
