// A built-in role, or the key of a custom role made on the Roles page.
export type Role =
  | 'admin'
  | 'principal'
  | 'academic_officer'
  | 'teacher'
  | 'accountant'
  | 'student'
  | 'parent'
  | (string & {});

export interface User {
  id: string;
  name: string;
  role: Role;
  /** Custom roles only: the role's display name. */
  roleName?: string;
  /** Custom roles only: page -> allowed actions. */
  permissions?: Record<string, string[]>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
