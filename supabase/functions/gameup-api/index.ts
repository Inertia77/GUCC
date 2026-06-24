// GameUp Command Center Edge Function
// The function verifies the Supabase Auth token itself because verify_jwt is disabled.

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '*') return trimmed;
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

type Json = Record<string, unknown>;

class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function responseOrigin(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED_ORIGINS.includes('*')) return origin || '*';
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return '';
}

function corsHeaders(req: Request) {
  const headers: Record<string, string> = {
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8',
    'vary': 'Origin'
  };
  const origin = responseOrigin(req);
  if (origin) headers['access-control-allow-origin'] = origin;
  return headers;
}

function assertOriginAllowed(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes('*') && !ALLOWED_ORIGINS.includes(origin)) {
    throw new HttpError(`Origin is not allowed: ${origin}`, 403);
  }
}

function assertSecretsConfigured() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new HttpError('Edge Function secrets are incomplete.', 500);
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function getBearer(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? '';
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        'accept': 'application/json',
        ...(init.headers ?? {})
      }
    });
  } catch {
    throw new HttpError('Unable to reach Supabase.', 502);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new HttpError(`Supabase REST error ${res.status}: ${detail}`, 502);
  }
  return data;
}

async function getUserFromToken(token: string) {
  if (!token) throw new HttpError('Missing Authorization Bearer token.', 401);

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'authorization': `Bearer ${token}`,
      'accept': 'application/json'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new HttpError('Invalid or expired user token. Please login again.', 401);
  }
  return data as { id: string; email?: string };
}

async function assertAllowedUser(userId: string) {
  const rows = await supabaseFetch(
    `/rest/v1/app_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,email,role,is_active`,
    { method: 'GET' }
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpError('This user is not active in public.app_users.', 403);
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
  return supabaseFetch(`/rest/v1/rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify({ p_payload: payload })
  });
}

Deno.serve(async (req: Request) => {
  try {
    assertOriginAllowed(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== 'POST') throw new HttpError('Only POST is allowed.', 405);

    assertSecretsConfigured();
    const user = await getUserFromToken(getBearer(req));
    const appUser = await assertAllowedUser(user.id);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new HttpError('Request body must be valid JSON.', 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError('Request body must be a JSON object.', 400);
    }

    const requestBody = body as Record<string, unknown>;
    const action = String(requestBody.action ?? '');
    const rawPayload = requestBody.payload ?? {};
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      throw new HttpError('payload must be a JSON object.', 400);
    }
    const payload = rawPayload as Json;

    if (action === 'ping') {
      return json(req, {
        ok: true,
        data: {
          pong: true,
          user: { id: user.id, email: user.email },
          app_user: appUser,
          time: new Date().toISOString()
        }
      });
    }

    const fn = RPC_MAP[action];
    if (!fn) throw new HttpError(`Unknown action: ${action}`, 400);

    return json(req, { ok: true, data: await callRpc(fn, payload) });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (status >= 500) console.error(error);
    return json(req, { ok: false, error: message }, status);
  }
});
