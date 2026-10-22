import { z } from 'zod';

const holidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid holiday date' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid holiday end date' }).optional().nullable(),
  description: z.string().trim().max(500).optional(),
  academicYearId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid academic year').optional().nullable()
});

const calendarEventSchema = z.object({
  title: z.string().trim().min(1, 'Event title is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid event date' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid event end date' }).optional().nullable(),
  description: z.string().trim().max(500).optional(),
  academicYearId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid academic year').optional().nullable()
});

export const holidaySettingSchema = holidaySchema;
export const calendarEventSettingSchema = calendarEventSchema;

export const updateSystemSettingSchema = z.object({
  schoolName: z.string().trim().min(1, 'School name is required').optional(),
  schoolCode: z.string().trim().max(40).optional().nullable(),
  schoolEmail: z.string().trim().email('Invalid school email address').optional(),
  schoolPhone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  principalName: z.string().trim().max(120).optional().nullable(),
  timezone: z.string().trim().min(1).optional(),
  language: z.enum(['English', 'Somali']).optional(),
  logoUrl: z.string().trim().optional().nullable(),
  brandingColors: z.object({
    primary: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Invalid HEX color code').optional(),
    secondary: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Invalid HEX color code').optional()
  }).optional(),
  discountRule: z.enum(['highest_only', 'combined'], {
    errorMap: () => ({ message: "Discount rule must be either 'highest_only' or 'combined'" })
  }).optional(),
  academicYear: z.string().trim().min(1, 'Academic year is required').optional(),
  activeSemester: z.string().trim().min(1, 'Active semester is required').optional(),
  holidays: z.array(holidaySchema).optional(),
  calendarEvents: z.array(calendarEventSchema).optional()
});
