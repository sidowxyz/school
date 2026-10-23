import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { User } from '../types/auth.types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  rememberMe: boolean;
  setAuth: (token: string, user: User, refreshToken: string, rememberMe: boolean) => void;
  clearAuth: () => void;
  updateUser: (patch: Partial<User>) => void;
}

// "Remember me" decides *where* the session lives, not just whether it's saved:
// - checked   -> localStorage, survives closing the browser
// - unchecked -> sessionStorage, gone as soon as the tab/browser closes
// Both stores are kept in sync on every write so a stale copy never lingers
// in the other one (e.g. leftover localStorage token after an unchecked login).
const rememberAwareStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem: (name, value) => {
    const remember = JSON.parse(value)?.state?.rememberMe;
    if (remember) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      rememberMe: false,
      setAuth: (token, user, refreshToken, rememberMe) =>
        set({ token, user, refreshToken, rememberMe }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null }),
      updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
    }),
    { name: 'sms-auth', storage: createJSONStorage(() => rememberAwareStorage) }
  )
);
