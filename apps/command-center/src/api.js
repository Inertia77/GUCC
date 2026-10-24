import { CONFIG } from './config.js';
import { assertConfigured } from './config-state.js';
import { clearSession, getAccessToken } from './auth.js';

export async function callApi(action, payload = {}) {
  assertConfigured();
  const accessToken = await getAccessToken();
  const baseUrl = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/functions/v1/${CONFIG.EDGE_FUNCTION_NAME}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ action, payload })
    });
  } catch (error) {
    const origin = window.location.origin;
    const localHint = origin === 'http://127.0.0.1:8000'
      ? '\n当前地址是 http://127.0.0.1:8000，请改用 http://localhost:8000/apps/command-center/，或把 http://127.0.0.1:8000 加入 Supabase Edge Function 的 ALLOWED_ORIGINS。'
      : '';
    throw new Error(`无法连接后端。通常是网络、CORS 白名单或 Edge Function 配置问题。当前页面 Origin: ${origin}${localHint}\n原始错误：${error.message}`);
  }

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
  resolvePartyAnalysis: (payload) => callApi('resolvePartyAnalysis', payload),
  attachPartyNotion: (payload) => callApi('attachPartyNotion', payload),
  searchMechanisms: (payload) => callApi('searchMechanisms', payload),
  getMechanismDetail: (payload) => callApi('getMechanismDetail', payload),
  saveMechanism: (payload) => callApi('saveMechanism', payload),
  deleteMechanism: (payload) => callApi('deleteMechanism', payload),
  searchVersions: (payload) => callApi('searchVersions', payload),
  saveVersion: (payload) => callApi('saveVersion', payload),
  deleteVersion: (payload) => callApi('deleteVersion', payload),
  searchResources: (payload) => callApi('searchResources', payload)
};

// Narrow owner-authenticated status RPCs; no public table grants are needed.
async function statusRpc(name, payload){
 const token=await getAccessToken();
 const response=await fetch(CONFIG.SUPABASE_URL.replace(/\/+$/,'')+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
 const result=await response.json();if(!response.ok)throw Error(result.message||'角色状态保存失败');return result;
}
API.characterVerifications=()=>statusRpc('character_status_verifications',{});
API.verifyCharacterStatus=payload=>statusRpc('app_update_character_status',{p_payload:payload});
