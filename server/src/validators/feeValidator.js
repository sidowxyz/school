import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

export const createFeeTypeSchema = z.object({
  fee_type_no: z.string().min(1, 'Fee type number is required'),
  fee_name: z.string().min(1, 'Fee name is required')
});

export const updateFeeTypeSchema = createFeeTypeSchema.partial();

export const createFeeStructureSchema = z.object({
  fee_struc_no: z.string().min(1, 'Fee structure number is required'),
  fee_type_no: objectIdSchema,
  lev_no: objectIdSchema,
  y_no: objectIdSchema,
  amount: z.number().min(0, 'Amount must be a non-negative number')
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();

export const createPaymentMethodSchema = z.object({
  payment_method_no: z.string().min(1, 'Payment method number is required'),
  payment_method_name: z.string().min(1, 'Payment method name is required')
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

export const createStudentInvoiceSchema = z.object({
  invoice_no: z.string().min(1, 'Invoice number is required').optional(),
  student: objectIdSchema,
  fee_struc_no: objectIdSchema,
  invoice_amount: z.number().min(0, 'Invoice amount must be non-negative').optional(),
  dueDate: z.string().optional()
});

export const updateStudentInvoiceSchema = createStudentInvoiceSchema.partial();

export const createBulkStudentInvoiceSchema = z.object({
  class_id: objectIdSchema,
  fee_struc_no: objectIdSchema,
  dueDate: z.string().optional()
});

export const createStudentFeeSchema = z.object({
  // Auto-generated server-side (RCPT-<year>-<seq>) when omitted — see
  // generateFeeNumber in studentFeeController.js.
  student_fee_no: z.string().min(1).optional(),
  invoice_no: objectIdSchema,
  payment_method_no: objectIdSchema,
  paid_amount: z.number().gt(0, 'Paid amount must be greater than zero'),
  acc_no: z.string().optional()
});

export const updateStudentFeeSchema = createStudentFeeSchema.partial();
