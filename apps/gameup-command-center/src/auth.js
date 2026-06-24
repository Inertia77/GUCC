import { CONFIG } from './config.js';

const STORAGE_KEY = 'gameup_session_v5';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

export function setSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLoggedIn() {
  const s = getSession();
  return Boolean(s?.access_token);
}

async function authFetch(path, body) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/${path}`, {
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
  const json = await authFetch('token?grant_type=password', { email, password });
  setSession(json);
  return json;
}

export async function signUp(email, password) {
  return await authFetch('signup', { email, password });
}

export async function signOut() {
  const session = getSession();
  if (session?.access_token) {
    await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`
      }
    }).catch(() => null);
  }
  clearSession();
}
