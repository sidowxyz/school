import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid MongoDB ObjectId' });
const statusSchema = z.enum(['Present', 'Absent', 'Late', 'Excused']);

export const recordStaffAttendanceSchema = z.object({
  att_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  attendance: z.array(z.object({
    teacherId: objectIdSchema,
    status: statusSchema,
    time_in: z.string().optional().nullable(),
    time_out: z.string().optional().nullable(),
    remarks: z.string().optional().nullable()
  })).min(1, 'At least one staff attendance record is required')
});

export const updateStaffAttendanceSchema = z.object({
  status: statusSchema.optional(),
  time_in: z.string().optional().nullable(),
  time_out: z.string().optional().nullable(),
  remarks: z.string().optional().nullable()
});
