import { z } from 'zod';

export const ROLES = ['admin', 'principal', 'academic_officer', 'teacher', 'accountant', 'student', 'parent'];

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(', ')}` })
  })
});

export const updateUserStatusSchema = z.object({
  status: z.boolean({
    required_error: 'status is required',
    invalid_type_error: 'status must be a boolean (true = active, false = deactivated)'
  })
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Please enter a valid email address.'),
  role: z.enum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(', ')}` })
  }),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});
