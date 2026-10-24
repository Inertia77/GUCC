-- External manual publication accounting reuses the existing distribution model.

-- It does not upload, approve a package, set QA PASS, or unlock advanced releases.
alter table public.creator_variants add column video_id text;
alter table public.creator_variants add constraint creator_variants_video_fkey foreign key(project_id,video_id) references public.creator_video_workspaces(project_id,video_id) on delete restrict;
create index creator_variants_video_idx on public.creator_variants(project_id,video_id);
alter table public.creator_publications add column video_id text;
alter table public.creator_publications add constraint creator_publications_video_fkey foreign key(project_id,video_id) references public.creator_video_workspaces(project_id,video_id) on delete restrict;
create index creator_publications_video_idx on public.creator_publications(project_id,video_id,created_at desc);
alter table public.creator_publish_packages add column video_id text;
alter table public.creator_publish_packages add constraint creator_publish_packages_video_fkey foreign key(project_id,video_id) references public.creator_video_workspaces(project_id,video_id) on delete restrict;
create index creator_publish_packages_video_idx on public.creator_publish_packages(project_id,video_id);
create unique index creator_manual_publication_request_idx on public.creator_publications(owner_user_id,(metadata->>'requestId')) where metadata->>'recordSource'='external_manual';

create function gucc_private.creator_record_publication(p_project_id text,p_video_id text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); key text:=p_payload->>'platform'; platform_name text; platform uuid;
 vid uuid; channel uuid; presentation uuid; package uuid; result public.creator_publications;
 prior public.creator_publications; request_id uuid:=(p_payload->>'requestId')::uuid;
 outcome text:=p_payload->>'status'; data jsonb:=p_payload->'fields';
 link text:=nullif(btrim(p_payload->>'postUrl'),''); post text:=nullif(btrim(p_payload->>'postId'),'');
 previous_context text:=current_setting('app.creator_manual_record',true);
begin
 if uid is null or not exists(select 1 from public.app_users where user_id=uid and is_active) then raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501';end if;
 perform 1 from public.creator_video_workspaces v join public.creator_projects p using(project_id)
 where v.project_id=p_project_id and v.video_id=p_video_id and v.owner_user_id=uid and p.owner_user_id=uid for update of v;
 if not found then raise exception 'VIDEO_NOT_AVAILABLE' using errcode='42501';end if;
 platform_name:=case key when 'bilibili' then 'B站' when 'douyin' then '抖音' when 'xiaohongshu' then '小红书' when 'wechat' then 'WeChat' when 'youtube' then 'YouTube' when 'tiktok' then 'TikTok' end;
 if platform_name is null or request_id is null or outcome is null or outcome not in ('READY_TO_PUBLISH','PUBLISHED','FAILED')
 or p_payload->>'humanConfirmed' is distinct from 'true' or jsonb_typeof(data) is distinct from 'object'
 or octet_length(p_payload::text)>524288 then raise exception 'INVALID_MANUAL_PUBLICATION' using errcode='22023';end if;
 if link is not null and link !~ '^https://[^[:space:]]+$' then raise exception 'HTTPS_POST_URL_REQUIRED';end if;
 if outcome='PUBLISHED' and link is null and post is null then raise exception 'POST_URL_OR_ID_REQUIRED';end if;
 select * into result from public.creator_publications where owner_user_id=uid and metadata->>'recordSource'='external_manual' and metadata->>'requestId'=request_id::text;
 if found then
  if result.project_id<>p_project_id or result.video_id<>p_video_id or result.metadata->'requestPayload' is distinct from p_payload then raise exception 'REQUEST_ID_REUSED';end if;
  return to_jsonb(result);
 end if;
 select * into prior from public.creator_publications where project_id=p_project_id and video_id=p_video_id and owner_user_id=uid and metadata->>'platformKey'=key order by created_at desc,publication_id desc limit 1;
 if coalesce(p_payload->>'previousPublicationId','')<>coalesce(prior.publication_id::text,'') then raise exception 'PUBLICATION_REVISION_CONFLICT' using errcode='40001';end if;
 select id into platform from public.platforms where name=platform_name;
 if platform is null then raise exception 'PLATFORM_NOT_REGISTERED';end if;
 insert into public.creator_variants(project_id,owner_user_id,variant_key,label,video_id,metadata)
 values(p_project_id,uid,'VIDEO:'||p_video_id,p_video_id,p_video_id,jsonb_build_object('source','manual_console'))
 on conflict(project_id,owner_user_id,variant_key) do nothing;
 select variant_id into vid from public.creator_variants where project_id=p_project_id and owner_user_id=uid and variant_key='VIDEO:'||p_video_id and video_id=p_video_id;
 if vid is null then raise exception 'VARIANT_IDENTITY_CONFLICT';end if;
 insert into public.creator_channels(owner_user_id,platform_id,channel_key,name,primary_language)
 values(uid,platform,'manual:'||key,platform_name,case when key in ('youtube','tiktok') then 'zh-Hant' else 'zh-Hans' end)
 on conflict(owner_user_id,channel_key) do nothing;
 select channel_id into channel from public.creator_channels where owner_user_id=uid and channel_key='manual:'||key and platform_id=platform;
 if channel is null then raise exception 'CHANNEL_IDENTITY_CONFLICT';end if;
 -- Each event receives a fresh field snapshot. No approved package is overwritten.
 insert into public.creator_platform_presentations(project_id,owner_user_id,variant_id,platform_id,title,description,platform_metadata)
 values(p_project_id,uid,vid,platform,coalesce(data->>'title',''),coalesce(data->>'description',data->>'caption',data->>'body',''),data)
 on conflict(variant_id,platform_id) do update set title=excluded.title,description=excluded.description,platform_metadata=excluded.platform_metadata returning presentation_id into presentation;
 insert into public.creator_publish_packages(project_id,owner_user_id,package_key,variant_id,presentation_id,channel_id,video_id,package_manifest,metadata)
 values(p_project_id,uid,'MANUAL:'||request_id,vid,presentation,channel,p_video_id,data,jsonb_build_object('recordSource','external_manual','mediaVerified',false)) returning publish_package_id into package;
 perform set_config('app.creator_manual_record',uid::text,true);
 insert into public.creator_publications(project_id,owner_user_id,variant_id,channel_id,video_id,status,post_url,post_id,published_at,failure_reason,publish_package_id,publish_package_snapshot,
 final_publish_confirmed_at,final_publish_confirmed_by,publication_mode,retry_of_publication_id,repost_of_publication_id,metadata)
 values(p_project_id,uid,vid,channel,p_video_id,outcome,link,post,(p_payload->>'publishedAt')::timestamptz,p_payload->>'note',package,data,
 case when outcome='PUBLISHED' then now() end,case when outcome='PUBLISHED' then uid end,
 case when prior.status='FAILED' then 'RETRY' when prior.status='PUBLISHED' and prior.post_url is distinct from link then 'REPOST' else 'INITIAL' end,
 case when prior.status='FAILED' then prior.publication_id end,
 case when prior.status='PUBLISHED' and prior.post_url is distinct from link then prior.publication_id end,
 jsonb_build_object('recordSource','external_manual','platformKey',key,'requestId',request_id,'requestPayload',p_payload,'supersedesPublicationId',prior.publication_id,'humanConfirmed',true)) returning * into result;
 perform set_config('app.creator_manual_record',coalesce(previous_context,''),true);
 return to_jsonb(result);
end $$;
revoke all on function gucc_private.creator_record_publication(text,text,jsonb) from public,anon;
grant execute on function gucc_private.creator_record_publication(text,text,jsonb) to authenticated;
create function public.creator_record_publication(p_project_id text,p_video_id text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select gucc_private.creator_record_publication(p_project_id,p_video_id,p_payload);
$$;
revoke all on function public.creator_record_publication(text,text,jsonb) from public,anon;
grant execute on function public.creator_record_publication(text,text,jsonb) to authenticated;

create function gucc_private.creator_publication_history(p_project_id text,p_video_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not gucc_private.creator_workspace_owns_project(p_project_id,auth.uid()) then raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p)-'owner_user_id' order by p.created_at desc,p.publication_id desc) from public.creator_publications p where p.project_id=p_project_id and p.video_id=p_video_id and p.owner_user_id=auth.uid()),'[]');
end $$;
revoke all on function gucc_private.creator_publication_history(text,text) from public,anon;
grant execute on function gucc_private.creator_publication_history(text,text) to authenticated;
create function public.creator_publication_history(p_project_id text,p_video_id text) returns jsonb language sql stable security invoker set search_path='' as $$ select gucc_private.creator_publication_history(p_project_id,p_video_id); $$;
revoke all on function public.creator_publication_history(text,text) from public,anon;
grant execute on function public.creator_publication_history(text,text) to authenticated;

create function gucc_private.creator_record_performance(p_project_id text,p_video_id text,p_publication_id uuid,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); publication public.creator_publications; result public.creator_performance_reports; captured timestamptz;
begin
 if not gucc_private.creator_workspace_owns_project(p_project_id,uid) then raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501';end if;
 select * into publication from public.creator_publications where publication_id=p_publication_id and project_id=p_project_id and video_id=p_video_id and owner_user_id=uid and status='PUBLISHED' for update;
 if not found then raise exception 'PUBLISHED_RECORD_REQUIRED' using errcode='42501';end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' or length(coalesce(p_snapshot->>'id','')) not between 1 and 150 or octet_length(p_snapshot::text)>262144 then raise exception 'INVALID_METRIC_SNAPSHOT';end if;
 captured:=(p_snapshot->>'capturedAt')::timestamptz;
 if captured is null or captured>now()+interval '5 minutes' then raise exception 'VALID_CAPTURE_TIME_REQUIRED';end if;
 select * into result from public.creator_performance_reports where project_id=p_project_id and owner_user_id=uid and report_key='MANUAL:'||p_publication_id||':'||(p_snapshot->>'id');
 if found then
  if result.report is distinct from p_snapshot then raise exception 'METRIC_HISTORY_IMMUTABLE';end if;
  return to_jsonb(result);
 end if;
 insert into public.creator_performance_reports(project_id,owner_user_id,report_key,variant_id,publication_id,window_start,window_end,metrics_captured_through,report)
 values(p_project_id,uid,'MANUAL:'||p_publication_id||':'||(p_snapshot->>'id'),publication.variant_id,p_publication_id,captured,captured,captured,p_snapshot) returning * into result;
 return to_jsonb(result);
end $$;
revoke all on function gucc_private.creator_record_performance(text,text,uuid,jsonb) from public,anon;
grant execute on function gucc_private.creator_record_performance(text,text,uuid,jsonb) to authenticated;
create function public.creator_record_performance(p_project_id text,p_video_id text,p_publication_id uuid,p_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$ select gucc_private.creator_record_performance(p_project_id,p_video_id,p_publication_id,p_snapshot); $$;
revoke all on function public.creator_record_performance(text,text,uuid,jsonb) from public,anon;
grant execute on function public.creator_record_performance(text,text,uuid,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.app_guard_creator_publication()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_package public.creator_publish_packages%rowtype;
begin
  if new.metadata->>'recordSource'='external_manual' then
    if tg_op<>'INSERT' then raise exception 'MANUAL_PUBLICATION_HISTORY_IMMUTABLE';end if;
    if auth.uid() is null or new.owner_user_id<>auth.uid()
      or coalesce(current_setting('app.creator_manual_record',true),'')<>auth.uid()::text
      or new.metadata->>'humanConfirmed' is distinct from 'true'
      or new.video_id is null or new.publish_package_id is null
      or new.status not in ('READY_TO_PUBLISH','FAILED','PUBLISHED') then
      raise exception 'EXPLICIT_MANUAL_RECORD_REQUIRED' using errcode='42501';
    end if;
    select * into v_package from public.creator_publish_packages where publish_package_id=new.publish_package_id;
    if not found or v_package.project_id<>new.project_id or v_package.owner_user_id<>new.owner_user_id
      or v_package.video_id is distinct from new.video_id or v_package.metadata->>'recordSource' is distinct from 'external_manual' then
      raise exception 'MANUAL_PACKAGE_IDENTITY_MISMATCH';
    end if;
    if new.status='PUBLISHED' and (new.final_publish_confirmed_at is null or new.final_publish_confirmed_by is distinct from auth.uid()
      or (nullif(btrim(new.post_url),'') is null and nullif(btrim(new.post_id),'') is null)) then
      raise exception 'MANUAL_PUBLISH_CONFIRMATION_REQUIRED';
    end if;
    return new;
  end if;
  if (
    (tg_op = 'INSERT' and (new.final_publish_confirmed_at is not null or new.final_publish_confirmed_by is not null))
    or (tg_op = 'UPDATE' and (
      new.final_publish_confirmed_at is distinct from old.final_publish_confirmed_at
      or new.final_publish_confirmed_by is distinct from old.final_publish_confirmed_by
    ))
  ) and not public.app_creator_human_action_active() then
    raise exception 'Final Publish Confirmation is a human-only gate';
  end if;

  if new.status in ('SCHEDULED','PUBLISHING','PUBLISHED') then
    if new.publish_package_id is null then raise exception 'Distribution requires a Publish Package'; end if;
    select * into v_package from public.creator_publish_packages where publish_package_id = new.publish_package_id;
    if not found or v_package.project_id <> new.project_id or v_package.owner_user_id <> new.owner_user_id then
      raise exception 'Publication package ownership mismatch';
    end if;
    if v_package.platform_locked_at is null or v_package.qa_status <> 'PASS'
       or v_package.qa_package_revision <> v_package.package_revision
       or v_package.human_reviewed_at is null or v_package.release_locked_at is null then
      raise exception 'Distribution blocked: Platform Lock, current QA PASS, Human Review and Release Lock are required';
    end if;
    if new.final_publish_confirmed_at is null then
      raise exception 'Distribution blocked: Final Publish Confirmation is required';
    end if;
    if new.publish_package_snapshot = '{}'::jsonb then new.publish_package_snapshot := v_package.release_snapshot; end if;
  end if;
  if new.status = 'PUBLISHED' and (nullif(btrim(new.post_id), '') is null or nullif(btrim(new.post_url), '') is null or new.published_at is null) then
    raise exception 'Published Publication requires post_id, post_url and published_at';
  end if;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  return new;
end;
$function$;
