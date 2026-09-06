-- Creator Project API resolves platform identities server-side through PostgREST.
-- Keep browser roles revoked; service_role only needs read access to this shared dictionary.
grant select on table public.platforms to service_role;
