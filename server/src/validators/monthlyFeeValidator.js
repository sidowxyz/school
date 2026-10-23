import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid MongoDB ObjectId' });
const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Month must look like 2026-07' });

export const setClassFeeSchema = z.object({
  amount: z.number().min(0, 'The monthly fee cannot be negative'),
});

export const chargeMonthSchema = z.object({
  period: periodSchema.optional(),
  class_id: objectIdSchema.optional(),
});

export const studentDiscountSchema = z.object({
  kind: z.enum(['percent', 'amount']),
  value: z.number().min(0),
  reason: z.string().trim().max(200).optional(),
});

export const collectPaymentSchema = z.object({
  student_ids: z.array(objectIdSchema).min(1, 'Pick at least one student'),
  amount: z.number().positive('Enter the amount received'),
  pay_through: periodSchema.optional(),
  invoice_ids: z.array(objectIdSchema).optional(),
  payment_method: objectIdSchema,
  payer_name: z.string().trim().max(120).optional(),
  payer_phone: z.string().trim().max(40).optional(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});
