// GameUp Command Center v5 Edge Function
// Deploy path: supabase/functions/gameup-api/index.ts
// No external dependency. Uses Supabase Auth REST + PostgREST RPC via fetch.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim()).filter(Boolean);

type Json = Record<string, unknown>;

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin) ? (ALLOWED_ORIGINS.includes('*') ? '*' : origin) : ALLOWED_ORIGINS[0] ?? '*';
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8'
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function getBearer(req: Request) {
  const h = req.headers.get('authorization') ?? '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? '';
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.');
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      'accept': 'application/json',
      ...(init.headers ?? {})
    }
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`Supabase REST error ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function getUserFromToken(token: string) {
  if (!token) throw new Error('Missing Authorization Bearer token.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'authorization': `Bearer ${token}`,
      'accept': 'application/json'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) throw new Error('Invalid or expired user token. Please login again.');
  return data as { id: string; email?: string };
}

async function assertAllowedUser(userId: string) {
  const rows = await supabaseFetch(`/rest/v1/app_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,email,role,is_active`, { method: 'GET' });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Forbidden: this Auth user is not active in public.app_users. Run sql/03_register_owner_template.sql.');
  }
  return rows[0];
}

const RPC_MAP: Record<string, string> = {
  searchCharacters: 'app_search_characters',
  getCharacterDetail: 'app_get_character_detail',
  saveCharacter: 'app_save_character',
  deleteCharacter: 'app_delete_character',
  searchParties: 'app_search_parties',
  saveParty: 'app_save_party',
  deleteParty: 'app_delete_party',
  searchVersions: 'app_search_versions',
  saveVersion: 'app_save_version',
  deleteVersion: 'app_delete_version',
  searchResources: 'app_search_resources'
};

async function callRpc(fn: string, payload: Json) {
  return await supabaseFetch(`/rest/v1/rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify({ p_payload: payload ?? {} })
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { ok: false, error: 'Only POST is allowed.' }, 405);

  try {
    const token = getBearer(req);
    const user = await getUserFromToken(token);
    const appUser = await assertAllowedUser(user.id);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const payload = (body?.payload ?? {}) as Json;

    if (action === 'ping') {
      return json(req, { ok: true, data: { pong: true, user: { id: user.id, email: user.email }, app_user: appUser, time: new Date().toISOString() } });
    }

    const fn = RPC_MAP[action];
    if (!fn) return json(req, { ok: false, error: `Unknown action: ${action}` }, 400);

    const data = await callRpc(fn, payload);
    return json(req, { ok: true, data });
  } catch (e) {
    return json(req, { ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
