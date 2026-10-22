import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { token, refreshToken, user, setAuth, clearAuth } = useAuthStore();
  return { token, refreshToken, user, role: user?.role, isAuthenticated: !!token, setAuth, clearAuth };
}
