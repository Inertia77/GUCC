-- GUCC Creator OS Phase 2A.2: atomic physical file observation write.
-- One observation and its optional meaningful FILE_* event commit together.
-- Client roles cannot call this RPC directly; creator-project-api is the boundary.

create or replace function public.save_creator_file_location_observation(
  p_owner_user_id uuid,
  p_logical_file_id uuid,
  p_project_id text,
  p_device_id text,
  p_storage_provider text,
  p_location jsonb,
  p_event_type text default null,
  p_state text default null,
  p_event_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_location public.creator_file_locations%rowtype;
begin
  if not exists (
    select 1 from public.creator_project_files f
    where f.id = p_logical_file_id
      and f.project_id = p_project_id
      and f.owner_user_id = p_owner_user_id
  ) then
    raise exception 'logical artifact ownership mismatch';
  end if;

  if not exists (
    select 1 from public.creator_devices d
    where d.owner_user_id = p_owner_user_id
      and d.device_id = p_device_id
  ) then
    raise exception 'creator device ownership mismatch';
  end if;

  insert into public.creator_file_locations (
    logical_file_id, project_id, owner_user_id, device_id, storage_provider,
    relative_path, availability, provider_file_id, provider_url, filename,
    mime_type, size_bytes, checksum, file_modified_at, observed_at, metadata
  ) values (
    p_logical_file_id, p_project_id, p_owner_user_id, p_device_id, coalesce(nullif(p_storage_provider, ''), 'local'),
    p_location->>'relative_path', coalesce(nullif(p_location->>'availability', ''), 'unknown'),
    nullif(p_location->>'provider_file_id', ''), nullif(p_location->>'provider_url', ''), nullif(p_location->>'filename', ''),
    nullif(p_location->>'mime_type', ''), nullif(p_location->>'size_bytes', '')::bigint, nullif(p_location->>'checksum', ''),
    nullif(p_location->>'file_modified_at', '')::timestamptz,
    coalesce(nullif(p_location->>'observed_at', '')::timestamptz, now()),
    coalesce(p_location->'metadata', '{}'::jsonb)
  )
  on conflict (owner_user_id, logical_file_id, device_id, storage_provider)
  do update set
    project_id = excluded.project_id,
    relative_path = excluded.relative_path,
    availability = excluded.availability,
    provider_file_id = excluded.provider_file_id,
    provider_url = excluded.provider_url,
    filename = excluded.filename,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    checksum = excluded.checksum,
    file_modified_at = excluded.file_modified_at,
    observed_at = excluded.observed_at,
    metadata = excluded.metadata,
    updated_at = now()
  returning * into v_location;

  if nullif(btrim(p_event_type), '') is not null then
    insert into public.creator_project_events (
      project_id, owner_user_id, event_type, state, detail
    ) values (
      p_project_id, p_owner_user_id, p_event_type, p_state, coalesce(p_event_detail, '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_location);
end;
$$;

revoke all on function public.save_creator_file_location_observation(uuid,uuid,text,text,text,jsonb,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.save_creator_file_location_observation(uuid,uuid,text,text,text,jsonb,text,text,jsonb) to service_role;

notify pgrst, 'reload schema';
