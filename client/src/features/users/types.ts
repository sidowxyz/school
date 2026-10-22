export type UserRole = "admin" | "principal" | "academic_officer" | "teacher" | "accountant" | "student" | "parent" | "librarian";

export interface AppUser {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: UserRole;
  status: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserListResult {
  total: number;
  page: number;
  limit: number;
  users: AppUser[];
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface CreateUserResult {
  user: AppUser;
  temporaryPassword: string;
}
