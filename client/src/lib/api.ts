// src/lib/api.ts
import axios, { AxiosHeaders } from 'axios';

export type User = { id: string; email: string };

// Read a cookie by name (works for csrf/XSRF-TOKEN/etc.)
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}\]\\/\+\^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Add CSRF header for mutating requests by reading the CSRF cookie the server sets
api.interceptors.request.use(async (config) => {
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const ensureHeader = (name: string, value: string) => {
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set(name, value);
      } else {
        (config.headers as any) = { ...(config.headers as any), [name]: value };
      }
    };

    // try common cookie names
    const csrfCandidates = ['csrf', 'XSRF-TOKEN', 'xsrf-token', 'csrfToken'];
    for (const c of csrfCandidates) {
      const val = readCookie(c);
      if (val) {
        ensureHeader('x-csrf-token', val);
        break;
      }
    }
  }
  return config;
});

// ---- API wrappers ----
export const auth = {
  me: () => api.get('/auth/me').then(r => r.data as User),
  signup: (email: string, password: string) =>
    api.post('/auth/signup', { email, password }).then(r => r.data),
  verify: (email: string, code: string) =>
    api.post('/auth/verify', { email, code }).then(r => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
};

// Dev link (keep /api in URL!)
export const devLinks = {
  mailbox: () => `${BASE}/dev/mailbox`,
};
