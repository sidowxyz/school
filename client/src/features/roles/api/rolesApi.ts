import api from '../../../lib/axios';

export type RoleAction = 'view' | 'create' | 'edit' | 'delete';
export type RoleColor = 'pink' | 'yellow' | 'blue' | 'violet' | 'green';
export type PermissionMap = Record<string, RoleAction[]>;

export interface RoleModule { key: string; label: string; group: string }

export interface AppRole {
  _id?: string;
  key: string;
  name: string;
  description: string;
  color: RoleColor;
  builtIn: boolean;
  /** Built-in admin: every page and action. */
  allAccess?: boolean;
  /** Built-in student/parent: their own portal only. */
  portal?: boolean;
  permissions: PermissionMap;
  userCount: number;
}

export interface RolesResponse { modules: RoleModule[]; actions: RoleAction[]; roles: AppRole[] }

export interface RoleInput { name: string; description: string; color: RoleColor; permissions: PermissionMap }

export const rolesApi = {
  list: async (): Promise<RolesResponse> => (await api.get('/roles')).data.data,
  create: async (input: RoleInput): Promise<AppRole> => (await api.post('/roles', input)).data.data,
  update: async (id: string, input: RoleInput): Promise<AppRole> => (await api.put(`/roles/${id}`, input)).data.data,
  remove: (id: string) => api.delete(`/roles/${id}`),
};
