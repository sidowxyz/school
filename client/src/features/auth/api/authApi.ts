import api from '../../../lib/axios';
import type { LoginPayload, AuthResponse } from '../../../types/auth.types';
import type { ApiResponse } from '../../../types/api.types';

export const authApi = {
  login:  (payload: LoginPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', payload),
  logout: (refreshToken: string | null) => api.post('/auth/logout', { token: refreshToken }),
};
