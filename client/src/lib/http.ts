// client/src/lib/http.ts
import axios from 'axios';

const baseOrigin = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const http = axios.create({
  baseURL: `${baseOrigin}/api`,
  withCredentials: true,
});

// simple cookie reader
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

// attach CSRF header for mutating requests
http.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const token = getCookie('csrfToken');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any)['x-csrf-token'] = token;
    }
  }
  return config;
});
