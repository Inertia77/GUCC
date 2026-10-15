-- Original contract IDs include version dots (for example 3.3). Preserve them verbatim.
create or replace function gucc_private.creator_workspace_register_video(p_project_id text,p_video_id text,p_title text,p_expected_revision bigint)
 returns jsonb language plpgsql security definer set search_path='' as $$
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
end $$;

do $$
declare s record; v jsonb; vs jsonb; id text; branch text;
begin
 for s in select * from public.creator_os_workspace_snapshots where coalesce(jsonb_array_length(project_data->'videos'),0)=0 loop
  vs='[]';
  for v in select value from jsonb_array_elements(coalesce(s.project_data->'rawVideoContract'->'VIDEO_TRACKS','[]')) loop
   id=coalesce(v->>'VIDEO_ID',v->>'videoId');branch=coalesce(v->>'FOLDER',v->>'branch');
   if id is not null and id~'^[A-Za-z][A-Za-z0-9_.-]{0,119}$' and branch is not null
    and exists(select 1 from jsonb_array_elements(coalesce(s.project_data->'promptFlow','[]')) n where n->>'branch'=branch)
    and not exists(select 1 from public.creator_video_workspaces where project_id=s.project_id and (video_id=branch or legacy_branch=branch))
    and not exists(select 1 from public.creator_os_publish_drafts where project_id=s.project_id and video_id=branch) then
     insert into public.creator_video_workspaces(project_id,video_id,owner_user_id,title,legacy_branch)
      values(s.project_id,id,s.owner_user_id,coalesce(v->>'CHARACTER',v->>'VIDEO_NAME',id),branch) on conflict do nothing;
     vs=vs||jsonb_build_array(jsonb_build_object('videoId',id,'branch',branch,'name',coalesce(v->>'CHARACTER',v->>'VIDEO_NAME',id),'identitySource','original_VIDEO_TRACKS'));
   end if;
  end loop;
  if jsonb_array_length(vs)>0 then
   update public.creator_os_workspace_snapshots set project_data=jsonb_set(project_data,'{videos}',vs),revision=revision+1,updated_at=now()
    where project_id=s.project_id and owner_user_id=s.owner_user_id;
  end if;
 end loop;
end $$;
