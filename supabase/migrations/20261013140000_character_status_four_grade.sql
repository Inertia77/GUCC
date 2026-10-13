-- New character status taxonomy (legacy values remain until owner confirmation).
alter table public.character_progress drop constraint if exists character_progress_research_status_chk;
alter table public.character_progress drop constraint if exists character_progress_build_status_chk;
alter table public.character_progress add constraint character_progress_research_status_chk
  check (research_status = any (array['◯','△','✕','対象外','待研究','查攻略','OK']::text[]));
alter table public.character_progress add constraint character_progress_build_status_chk
  check (build_status = any (array['◯','△','✕','対象外','待养成','DONE','NOT']::text[]));

-- Authenticated status-only mutation, preserving other character data and notes.
create or replace function public.app_update_character_status(p_payload jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_id uuid;
  v_research text;
  v_build text;
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'GUCC authorization required' using errcode = '42501';
  end if;
  v_id := (p_payload->>'id')::uuid;
  v_research := trim(coalesce(p_payload->>'research_status',''));
  v_build := trim(coalesce(p_payload->>'build_status',''));
  if v_id is null or v_research not in ('◯','△','✕','対象外')
      or v_build not in ('◯','△','✕','対象外') then
    raise exception 'Character status requires id and two valid values';
  end if;
  if not exists (select 1 from public.characters where id = v_id) then
    raise exception 'Character not found';
  end if;
  insert into public.character_progress (character_id,research_status,build_status)
  values(v_id,v_research,v_build)
  on conflict(character_id) do update
  set research_status = excluded.research_status,
      build_status = excluded.build_status,
      updated_at = now();
  select jsonb_build_object(
    'id', c.id, 'research_status', cp.research_status,
    'build_status', cp.build_status, 'updated_at', cp.updated_at
  ) into v_result
  from public.characters c
  join public.character_progress cp on cp.character_id=c.id
  where c.id = v_id;
  return v_result;
end $function$;
revoke all on function public.app_update_character_status(jsonb) from public, anon;
grant execute on function public.app_update_character_status(jsonb) to authenticated;
