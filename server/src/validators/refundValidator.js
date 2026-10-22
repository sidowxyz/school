import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

export const createRefundSchema = z.object({
  student_fee_no: objectIdSchema,
  amount: z.number().gt(0, 'Refund amount must be greater than zero'),
  reason: z.string().min(1, 'A reason for the refund is required').max(500),
  payment_method_no: objectIdSchema.optional()
});
