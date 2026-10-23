import { z } from 'zod';

// A built-in role or a custom role key; the controller checks it exists.
const roleKey = z.string({ required_error: 'role is required' }).trim().min(1, 'role is required').max(40);

export const updateUserRoleSchema = z.object({
  role: roleKey
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
  role: roleKey,
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});
