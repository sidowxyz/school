import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

// Author
export const createAuthorSchema = z.object({
  author_name: z.string().min(2, 'Author name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  author_photo: z.string().optional().nullable()
});
export const updateAuthorSchema = createAuthorSchema.partial();

// Category
export const createCategorySchema = z.object({
  cat_name: z.string().min(2, 'Category name must be at least 2 characters')
});
export const updateCategorySchema = createCategorySchema.partial();

// Shelf
export const createShelfSchema = z.object({
  sh_name: z.string().min(1, 'Shelf name is required')
});
export const updateShelfSchema = createShelfSchema.partial();

// Book
export const createBookSchema = z.object({
  book_name: z.string().min(1, 'Book name is required'),
  author_id: objectIdSchema,
  cat_id: objectIdSchema,
  sh_id: objectIdSchema.optional().nullable(),
  pages: z.number().int().positive().optional().nullable(),
  qty: z.number().int().min(0, 'Quantity must be 0 or more'),
  version: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  file_name: z.string().optional().nullable(),
  book_cover: z.string().optional().nullable()
});
export const updateBookSchema = createBookSchema.partial();

// Book Issue
export const issueBookSchema = z.object({
  book_id: objectIdSchema,
  student_id: objectIdSchema.optional().nullable(),
  staff_id: objectIdSchema.optional().nullable(),
  issue_date: z.string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid issue date' })
    .optional(),
  expected_return_date: z.string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid expected return date' })
    .optional()
}).refine(data => data.student_id || data.staff_id, {
  message: 'Either student_id or staff_id must be provided'
});

// Book Return
export const returnBookSchema = z.object({
  issue_id: objectIdSchema,
  return_date: z.string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Invalid return date' })
    .optional()
});

// Fine Status Update
export const updateFineStatusSchema = z.object({
  status: z.enum(['unpaid', 'paid', 'waived'], {
    errorMap: () => ({ message: 'Status must be unpaid, paid, or waived' })
  })
});

// Reading Session
export const createReadingSessionSchema = z.object({
  st_id:     objectIdSchema,
  book_id:   objectIdSchema,
  status:    z.enum(['reading', 'completed', 'interrupted']).optional(),
  timeOut:   z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid timeOut date' }).optional().nullable(),
  hoursRead: z.number().min(0, 'Hours read cannot be negative').optional()
});

export const updateReadingSessionSchema = z.object({
  status:    z.enum(['reading', 'completed', 'interrupted']).optional(),
  timeOut:   z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid timeOut date' }).optional().nullable(),
  hoursRead: z.number().min(0, 'Hours read cannot be negative').optional()
});

