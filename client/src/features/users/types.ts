// A built-in role key or a custom role made on the Roles page.
export type UserRole = string;

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
