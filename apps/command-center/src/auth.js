import { CONFIG } from './config.js';
import { assertConfigured } from './config-state.js';

const STORAGE_KEY = 'gameup_session_v5';
const REFRESH_MARGIN_SECONDS = 60;
let refreshPromise = null;

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(session) {
  const normalized = {
    ...session,
    expires_at: session?.expires_at
      ?? (session?.expires_in ? Math.floor(Date.now() / 1000) + Number(session.expires_in) : null)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLoggedIn() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}

async function authFetch(path, body) {
  assertConfigured();
  const baseUrl = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error_description || json.msg || json.message || `Auth failed: ${res.status}`);
  }
  return json;
}

export async function signIn(email, password) {
  if (!email || !password) throw new Error('请输入邮箱和密码。');
  const json = await authFetch('token?grant_type=password', { email, password });
  setSession(json);
  return json;
}

export async function signUp(email, password) {
  if (!email || !password) throw new Error('请输入邮箱和密码。');
  return authFetch('signup', { email, password });
}

export async function getAccessToken() {
  const session = getSession();
  if (!session) throw new Error('请先登录。');

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Number(session.expires_at || 0);
  if (session.access_token && (!expiresAt || expiresAt > now + REFRESH_MARGIN_SECONDS)) {
    return session.access_token;
  }
  if (!session.refresh_token) {
    clearSession();
    throw new Error('登录已过期，请重新登录。');
  }

  if (!refreshPromise) {
    refreshPromise = authFetch('token?grant_type=refresh_token', {
      refresh_token: session.refresh_token
    })
      .then((refreshed) => setSession({
        ...session,
        ...refreshed,
        refresh_token: refreshed.refresh_token || session.refresh_token
      }))
      .catch((error) => {
        clearSession();
        throw new Error(`登录已过期，请重新登录。${error?.message ? ` ${error.message}` : ''}`);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  const refreshed = await refreshPromise;
  return refreshed.access_token;
}

export async function signOut() {
  const session = getSession();
  try {
    if (session?.access_token) {
      const baseUrl = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
      await fetch(`${baseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`
        }
      }).catch(() => null);
    }
  } finally {
    clearSession();
  }
}
