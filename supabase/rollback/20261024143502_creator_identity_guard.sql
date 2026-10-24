CREATE OR REPLACE FUNCTION gucc_private.creator_workspace_register_video(p_project_id text, p_video_id text, p_title text, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); s public.creator_os_workspace_snapshots; v public.creator_video_workspaces;
begin
 if uid is null or not exists(select 1 from public.app_users where user_id=uid and is_active) then raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501';end if;
 perform 1 from public.creator_projects where project_id=p_project_id and owner_user_id=uid for update;
 if not found then raise exception 'PROJECT_NOT_AVAILABLE' using errcode='42501';end if;
 select * into s from public.creator_os_workspace_snapshots where project_id=p_project_id and owner_user_id=uid for update;
 select * into v from public.creator_video_workspaces where project_id=p_project_id and video_id=p_video_id and owner_user_id=uid;
 if found then return jsonb_build_object('video',to_jsonb(v),'snapshot',to_jsonb(s)); end if;
 if p_expected_revision is null or coalesce(s.revision,0)<>p_expected_revision then raise exception 'PROJECT_REVISION_CONFLICT' using errcode='40001';end if;
 if p_video_id is null or p_video_id!~'^[A-Za-z][A-Za-z0-9_.-]{0,119}$' or length(btrim(coalesce(p_title,''))) not between 1 and 240 then raise exception 'INVALID_VIDEO';end if;
 insert into public.creator_video_workspaces(project_id,video_id,owner_user_id,title) values(p_project_id,p_video_id,uid,btrim(p_title)) returning * into v;
 if s.project_id is not null then
  update public.creator_os_workspace_snapshots set project_data=jsonb_set(project_data,'{videos}',coalesce(project_data->'videos','[]')||jsonb_build_array(jsonb_build_object('videoId',p_video_id,'branch',p_video_id,'name',btrim(p_title)))),revision=revision+1,updated_at=now()
   where project_id=p_project_id and owner_user_id=uid returning * into s;
 end if;
 return jsonb_build_object('video',to_jsonb(v),'snapshot',to_jsonb(s));
end $function$
;
CREATE OR REPLACE FUNCTION gucc_private.creator_os_save_publish_draft(p_project_id text, p_video_id text, p_draft jsonb, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
