-- Canonical roots are intentionally not exposed to authenticated SQL clients.
-- Keep that boundary; put narrowly authorized privileged work in a private
-- schema and retain an invoker wrapper as the public Data API endpoint.
create schema if not exists gucc_private;
revoke all on schema gucc_private from public, anon;
grant usage on schema gucc_private to authenticated;
revoke insert, update on public.creator_os_publish_drafts from authenticated;

create function gucc_private.creator_os_owns_publish_project(p_project_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from public.app_users where user_id=auth.uid() and is_active)
    and exists (select 1 from public.creator_projects where project_id=p_project_id and owner_user_id=auth.uid());
$$;
revoke all on function gucc_private.creator_os_owns_publish_project(text) from public, anon;
grant execute on function gucc_private.creator_os_owns_publish_project(text) to authenticated;
alter policy creator_os_publish_drafts_owner on public.creator_os_publish_drafts
using (owner_user_id=(select auth.uid()) and gucc_private.creator_os_owns_publish_project(project_id))
with check (owner_user_id=(select auth.uid()) and gucc_private.creator_os_owns_publish_project(project_id));

create function gucc_private.creator_os_save_publish_draft(p_project_id text, p_video_id text, p_draft jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.creator_os_publish_drafts;
begin
  if v_uid is null or not exists (select 1 from public.app_users where user_id = v_uid and is_active) then
    raise exception 'OWNER_ACCESS_REQUIRED' using errcode = '42501';
  end if;
  -- Canonical project ownership is checked under RLS. The root lock serializes
  -- first insert and update races without modifying the root or its revision.
  perform 1 from public.creator_projects where project_id = p_project_id and owner_user_id = v_uid for update;
  if not found then raise exception 'PROJECT_NOT_AVAILABLE' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0
    or coalesce(jsonb_typeof(p_draft), '') <> 'object'
    or p_draft->'project'->>'creatorProjectId' is distinct from p_project_id
    or p_draft->'project'->>'videoId' is distinct from p_video_id
    or p_draft->>'schemaVersion' is distinct from 'gucc-publish-console-1'
    or length(coalesce(p_video_id, '')) not between 1 and 200
    or octet_length(p_draft::text) > 2097152 then
    raise exception 'INVALID_PUBLISH_DRAFT' using errcode = '22023';
  end if;
  select * into v_row from public.creator_os_publish_drafts
    where owner_user_id = v_uid and project_id = p_project_id and video_id = p_video_id for update;
  if coalesce(v_row.revision, 0) <> p_expected_revision then
    return jsonb_build_object('conflict', true, 'current', to_jsonb(v_row));
  end if;
  if v_row.revision is null then
    insert into public.creator_os_publish_drafts(owner_user_id, project_id, video_id, draft_data)
      values (v_uid, p_project_id, p_video_id, p_draft) returning * into v_row;
  else
    update public.creator_os_publish_drafts set draft_data = p_draft, revision = revision + 1, updated_at = now()
      where owner_user_id = v_uid and project_id = p_project_id and video_id = p_video_id returning * into v_row;
  end if;
  return jsonb_build_object('conflict', false, 'current', to_jsonb(v_row));
end;
$$;
revoke all on function gucc_private.creator_os_save_publish_draft(text,text,jsonb,bigint) from public, anon;
grant execute on function gucc_private.creator_os_save_publish_draft(text,text,jsonb,bigint) to authenticated;

create or replace function public.creator_os_save_publish_draft(p_project_id text,p_video_id text,p_draft jsonb,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path = '' as $$
  select gucc_private.creator_os_save_publish_draft(p_project_id,p_video_id,p_draft,p_expected_revision);
$$;
revoke all on function public.creator_os_save_publish_draft(text,text,jsonb,bigint) from public, anon;
grant execute on function public.creator_os_save_publish_draft(text,text,jsonb,bigint) to authenticated;
