-- Additive metadata-only publishing drafts. Existing roots, Locks, releases,
-- snapshots and media are never rewritten by this migration or its RPC.
create table public.creator_os_publish_drafts (
  owner_user_id uuid not null references auth.users(id),
  project_id text not null references public.creator_projects(project_id),
  video_id text not null check (length(video_id) between 1 and 200),
  draft_data jsonb not null check (jsonb_typeof(draft_data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, project_id, video_id),
  constraint publish_draft_identity check (
    coalesce(draft_data->'project'->>'creatorProjectId' = project_id
    and draft_data->'project'->>'videoId' = video_id
    and draft_data->>'schemaVersion' = 'gucc-publish-console-1', false)
  )
);
create index creator_os_publish_drafts_project_idx on public.creator_os_publish_drafts(project_id);
alter table public.creator_os_publish_drafts enable row level security;
create policy creator_os_publish_drafts_owner on public.creator_os_publish_drafts
for all to authenticated
using (
  owner_user_id = (select auth.uid())
  and exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.is_active)
  and exists (select 1 from public.creator_projects p where p.project_id = creator_os_publish_drafts.project_id and p.owner_user_id = (select auth.uid()))
)
with check (
  owner_user_id = (select auth.uid())
  and exists (select 1 from public.app_users u where u.user_id = (select auth.uid()) and u.is_active)
  and exists (select 1 from public.creator_projects p where p.project_id = creator_os_publish_drafts.project_id and p.owner_user_id = (select auth.uid()))
);
revoke all on public.creator_os_publish_drafts from public, anon;
grant select, insert, update on public.creator_os_publish_drafts to authenticated;

create function public.creator_os_save_publish_draft(p_project_id text, p_video_id text, p_draft jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
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
revoke all on function public.creator_os_save_publish_draft(text,text,jsonb,bigint) from public, anon;
grant execute on function public.creator_os_save_publish_draft(text,text,jsonb,bigint) to authenticated;
comment on table public.creator_os_publish_drafts is 'Independent per-video publish metadata; browser file paths and media bytes remain on the device.';
