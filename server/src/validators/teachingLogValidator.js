import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

export const createTeachingLogSchema = z.object({
  assignmentId: objectIdSchema,
  periodId: objectIdSchema,
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  subject: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  period: z.string().min(1, 'Period is required'),

  topicTaught: z.string().min(1, 'Topic taught is required'),
  lessonObjective: z.string().min(1, 'Lesson objective is required'),
  teachingSummary: z.string().min(1, 'Teaching summary is required'),
  learningOutcomes: z.string().min(1, 'Learning outcomes are required'),

  studentParticipation: z.string().optional().nullable(),
  challengesFaced: z.string().optional().nullable(),
  extraNotes: z.string().optional().nullable(),

  homeworkGiven: z.string().optional().nullable(),
  submissionDeadline: z.string().optional().nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid submission deadline format' }),

  status: z.enum(['draft', 'completed']).optional()
});

export const updateTeachingLogSchema = createTeachingLogSchema.partial();
