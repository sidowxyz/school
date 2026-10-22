import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });

export const createResultSheetSchema = z.object({
  student: objectIdSchema,
  class: objectIdSchema,
  examReg: objectIdSchema,
  marks: z.array(
    z.object({
      subject: objectIdSchema,
      score: z.number().min(0, 'Score must be at least 0').max(100, 'Score cannot exceed 100')
    })
  ).min(1, 'At least one mark entry is required'),
  overallScore: z.number().min(0).max(100).optional()
});

export const updateResultSheetSchema = createResultSheetSchema.partial();
