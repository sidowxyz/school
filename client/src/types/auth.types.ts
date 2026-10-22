export type Role =
  | 'admin'
  | 'principal'
  | 'academic_officer'
  | 'teacher'
  | 'accountant'
  | 'student'
  | 'parent'
  | 'librarian';

export interface User {
  id: string;
  name: string;
  role: Role;
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
