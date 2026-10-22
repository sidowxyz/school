import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });
const statusSchema = z.enum(['Present', 'Absent', 'Late', 'Excused']);

export const markAttendanceSchema = z.object({
  periodId: objectIdSchema,
  att_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  attendance: z.array(z.object({
    studentId: objectIdSchema,
    status: statusSchema,
    remarks: z.string().optional()
  })).min(1, 'At least one student attendance record is required')
});
