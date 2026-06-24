import { CONFIG } from './config.js';
import { assertConfigured } from './config-state.js';
import { clearSession, getAccessToken } from './auth.js';

export async function callApi(action, payload = {}) {
  assertConfigured();
  const accessToken = await getAccessToken();
  const baseUrl = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/functions/v1/${CONFIG.EDGE_FUNCTION_NAME}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ action, payload })
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok || json?.ok === false) {
    if (res.status === 401) clearSession();
    const message = json?.error || json?.message || `API error ${res.status}`;
    const detail = json?.detail ? `\n${JSON.stringify(json.detail, null, 2)}` : '';
    throw new Error(message + detail);
  }
  return json.data ?? json;
}

export const API = {
  ping: () => callApi('ping'),
  searchCharacters: (payload) => callApi('searchCharacters', payload),
  getCharacterDetail: (payload) => callApi('getCharacterDetail', payload),
  saveCharacter: (payload) => callApi('saveCharacter', payload),
  deleteCharacter: (payload) => callApi('deleteCharacter', payload),
  searchParties: (payload) => callApi('searchParties', payload),
  saveParty: (payload) => callApi('saveParty', payload),
  deleteParty: (payload) => callApi('deleteParty', payload),
  searchVersions: (payload) => callApi('searchVersions', payload),
  saveVersion: (payload) => callApi('saveVersion', payload),
  deleteVersion: (payload) => callApi('deleteVersion', payload),
  searchResources: (payload) => callApi('searchResources', payload)
};
