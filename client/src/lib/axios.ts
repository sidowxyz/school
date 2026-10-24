import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.warn('VITE_API_BASE_URL is not set; this build calls http://localhost:5000/api. See docs/DEPLOYMENT.md.');
}

// The API base URL with the trailing /api stripped, for resolving statically
// served file URLs (e.g. an uploaded document's fileUrl: "/uploads/...").
export const fileBaseURL = baseURL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const isAuthPath = (url: string) =>
  url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/refresh');

// The access token is short-lived (15m, see server/src/utils/tokenService.js).
// Without this, any request made after it expires 401s and the block below
// used to hard-redirect straight to /login — logging the user out mid-session.
// Instead, spend the long-lived refresh token once to get a new access token
// and replay the original request; only fall back to a redirect if that fails.
let refreshPromise: Promise<string | null> | null = null;

// The server swaps the refresh token on every use, so open tabs (which share
// the stored session) must take turns: one refresh at a time across tabs, and
// each tab first re-reads the session in case another tab already refreshed.
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? locks.request('sms-auth-refresh', fn) : fn();
}

async function refreshAccessToken(): Promise<string | null> {
  return withRefreshLock(async () => {
    const before = useAuthStore.getState().refreshToken;
    await useAuthStore.persist.rehydrate();
    const { token, refreshToken, user, rememberMe, setAuth } = useAuthStore.getState();
    if (!refreshToken || !user) return null;

    // Another tab refreshed while we waited: use its fresh access token.
    const expiresAt = token ? getTokenExpiryMs(token) : null;
    if (refreshToken !== before && token && expiresAt !== null && Date.now() < expiresAt - EXPIRY_BUFFER_MS) {
      return token;
    }

    try {
      const { data } = await axios.post(`${baseURL}/auth/refresh`, { token: refreshToken });
      const newAccessToken: string = data.data.accessToken;
      setAuth(newAccessToken, user, data.data.refreshToken ?? refreshToken, rememberMe);
      return newAccessToken;
    } catch {
      return null;
    }
  });
}

// Reads the `exp` claim (seconds since epoch) out of a JWT without verifying
// it — verification is the server's job, this is only used to decide whether
// it's worth proactively refreshing before sending a request.
function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json);
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh a bit ahead of actual expiry so the *first* attempt at a request
// succeeds instead of 401ing and relying on the reactive retry below —
// that reactive path still works fine, but a request made in the last few
// seconds of the token's life would otherwise show as a failed request in
// the browser console/network tab even though it's silently recovered.
const EXPIRY_BUFFER_MS = 5000;

api.interceptors.request.use(async (config) => {
  const url = config.url ?? '';
  // File uploads: with the instance's JSON Content-Type axios would turn the
  // FormData into JSON and drop the file. Clearing it lets the browser send
  // multipart/form-data with the right boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  let token = useAuthStore.getState().token;

  if (token && !isAuthPath(url)) {
    const expiresAt = getTokenExpiryMs(token);
    if (expiresAt !== null && Date.now() >= expiresAt - EXPIRY_BUFFER_MS) {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      token = (await refreshPromise) ?? token;
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let redirectingToLogin = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as RetryableConfig | undefined;
    const url = originalRequest?.url ?? '';
    // A 401 on the login/auth request itself just means bad credentials — let the
    // LoginPage surface that error instead of hard-redirecting (which wipes the
    // error message and looks like "nothing happened"). Only force a redirect when
    // an *authenticated* request comes back 401 (expired/invalid session).
    if (err.response?.status === 401 && !isAuthPath(url)) {
      // Only spend the refresh token once per request — if the retried request
      // 401s again, fall straight through to logout instead of looping.
      if (originalRequest && !originalRequest._retried) {
        originalRequest._retried = true;

        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      }

      // Several requests can fail together; send the user to sign in once.
      if (!redirectingToLogin) {
        redirectingToLogin = true;
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
