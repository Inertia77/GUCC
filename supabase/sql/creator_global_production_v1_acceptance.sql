-- GUCC Creator OS Global Production v1 synthetic acceptance.
-- Production-safe by contract: all fixture rows and any sequence effects are
-- enclosed in this transaction and are always rolled back.
begin;

do $acceptance$
declare
  v_owner uuid;
  v_project constant text := 'PROJECT_GLOBAL_TEST';
  v_zh uuid; v_ja uuid; v_en uuid;
  v_vm uuid; v_segment uuid;
  v_bili uuid; v_youtube uuid; v_tiktok_jp uuid; v_tiktok_global uuid;
  v_channel_bili uuid; v_channel_youtube uuid; v_channel_tiktok_jp uuid; v_channel_tiktok_global uuid;
  v_platform_bili uuid; v_platform_youtube uuid; v_platform_tiktok uuid;
  v_presentation uuid; v_package uuid; v_publication_a uuid; v_publication_b uuid; v_publication_c uuid;
  v_report uuid; v_learning uuid;
  v_row record;
  v_revision bigint;
  v_before_projects bigint;
begin
  select user_id into v_owner from public.app_users where is_active order by created_at limit 1;
  if v_owner is null then raise exception 'ACCEPTANCE_BLOCKED: no active owner'; end if;
  if exists(select 1 from public.creator_projects where project_id=v_project) then raise exception 'ACCEPTANCE_BLOCKED: fixture identity already exists'; end if;
  select count(*) into v_before_projects from public.creator_projects where owner_user_id=v_owner;
  select id into v_platform_bili from public.platforms where name='B站';
  select id into v_platform_youtube from public.platforms where name='YouTube';
  select id into v_platform_tiktok from public.platforms where name='TikTok';
  if v_platform_bili is null or v_platform_youtube is null or v_platform_tiktok is null then raise exception 'ACCEPTANCE_BLOCKED: required Platform Dictionary rows missing'; end if;

  insert into public.creator_projects(project_id,owner_user_id,name,game,topic,project_type,current_state,project_data)
  values(v_project,v_owner,'Synthetic Global Production','Fixture','Rollback-only model acceptance','STANDARD_VIDEO','IDEA',jsonb_build_object('projectId',v_project,'name','Synthetic Global Production','files','{}'::jsonb));

  insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,metadata)
  values
    (v_project,v_owner,'project',v_project,'PROJECT_BRIEF','02_SCRIPT/PROJECT/PROJECT_BRIEF.md','md','Ready','{}'),
    (v_project,v_owner,'project',v_project,'KNOWLEDGE_BASE','01_RESEARCH/KNOWLEDGE_BASE.md','md','Ready','{}'),
    (v_project,v_owner,'project',v_project,'EVIDENCE_INDEX','01_RESEARCH/EVIDENCE_INDEX.json','json','Ready','{}'),
    (v_project,v_owner,'project',v_project,'FACT_SNAPSHOT','01_RESEARCH/FACT_SNAPSHOT.json','json','Ready','{}'),
    (v_project,v_owner,'project',v_project,'MASTER_SCRIPT_ZH','02_SCRIPT/PROJECT/MASTER_SCRIPT_ZH.md','md','Ready','{}');

  begin
    perform public.app_creator_human_lock(v_owner,'project',v_project,'project_scope',true,(select global_revision from public.creator_projects where project_id=v_project),false,'AI attempted lock');
    raise exception 'AI lock bypass unexpectedly succeeded';
  exception when others then
    if sqlerrm='AI lock bypass unexpectedly succeeded' then raise; end if;
    if position('Explicit human confirmation is required' in sqlerrm)=0 then raise; end if;
  end;
  perform public.app_creator_human_lock(v_owner,'project',v_project,'project_scope',true,(select global_revision from public.creator_projects where project_id=v_project),true,'Fixture human Project Scope confirmation');
  perform public.app_creator_human_lock(v_owner,'project',v_project,'evidence_snapshot',true,(select global_revision from public.creator_projects where project_id=v_project),true,'Fixture human Evidence confirmation');
  perform public.app_creator_human_lock(v_owner,'project',v_project,'master_script',true,(select global_revision from public.creator_projects where project_id=v_project),true,'Fixture human Master Script confirmation');

  insert into public.creator_language_tracks(project_id,owner_user_id,track_key,language_code,label,is_source,status)
    values(v_project,v_owner,'ZH_SOURCE','zh-CN','中文母轨',true,'SCRIPTING') returning language_track_id into v_zh;
  insert into public.creator_language_tracks(project_id,owner_user_id,track_key,language_code,label,status)
    values(v_project,v_owner,'JA','ja','日本語','SCRIPTING') returning language_track_id into v_ja;
  insert into public.creator_language_tracks(project_id,owner_user_id,track_key,language_code,label,status)
    values(v_project,v_owner,'EN','en','English','SCRIPTING') returning language_track_id into v_en;

  for v_row in select language_track_id,track_key from public.creator_language_tracks where project_id=v_project order by track_key loop
    insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,metadata)
      values(v_project,v_owner,'language_track',v_row.language_track_id::text,'VOICE_SCRIPT','02_SCRIPT/LANG/'||v_row.track_key||'/VOICE_SCRIPT.md','md','Ready','{}');
    perform public.app_creator_human_lock(v_owner,'language_track',v_row.language_track_id::text,'language_script',true,(select revision from public.creator_language_tracks where language_track_id=v_row.language_track_id),true,'Fixture human Language Script confirmation');
    insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,checksum,metadata)
      values
      (v_project,v_owner,'language_track',v_row.language_track_id::text,'AUDIO_MASTER','03_AUDIO/LANG/'||v_row.track_key||'/AUDIO_MASTER.wav','audio','Ready','sha256:'||repeat('a',64),'{"timing_provenance":"real_audio"}'),
      (v_project,v_owner,'language_track',v_row.language_track_id::text,'SUBTITLE_MASTER','04_SUBTITLES/LANG/'||v_row.track_key||'/SUBTITLE_MASTER.srt','srt','Ready',null,'{}'),
      (v_project,v_owner,'language_track',v_row.language_track_id::text,'TIMELINE_SENTENCE','04_SUBTITLES/LANG/'||v_row.track_key||'/TIMELINE_SENTENCE.csv','csv','Ready',null,'{}'),
      (v_project,v_owner,'language_track',v_row.language_track_id::text,'TRANSCRIPT_ALIGNED','04_SUBTITLES/LANG/'||v_row.track_key||'/TRANSCRIPT_ALIGNED.json','json','Ready',null,'{}'),
      (v_project,v_owner,'language_track',v_row.language_track_id::text,'ALIGNMENT_REPORT','04_SUBTITLES/LANG/'||v_row.track_key||'/ALIGNMENT_REPORT.md','md','Ready',null,'{}');
    update public.creator_language_tracks set timing_provenance='real_audio',alignment_status='VALID',status='TIMELINE_GENERATION' where language_track_id=v_row.language_track_id;
    perform public.app_creator_human_lock(v_owner,'language_track',v_row.language_track_id::text,'voice_timeline',true,(select revision from public.creator_language_tracks where language_track_id=v_row.language_track_id),true,'Fixture human Voice Timeline confirmation');
  end loop;

  begin
    update public.creator_language_tracks set script_locked_at=null,script_locked_by=null where language_track_id=v_zh;
    raise exception 'Generic lock mutation unexpectedly succeeded';
  exception when others then
    if sqlerrm='Generic lock mutation unexpectedly succeeded' then raise; end if;
    if position('human-owned Language Track lock' in sqlerrm)=0 then raise; end if;
  end;

  insert into public.creator_visual_masters(project_id,owner_user_id,visual_master_key,label,status)
    values(v_project,v_owner,'VM_MAIN','Unified Visual Master','STORYBOARDING') returning visual_master_id into v_vm;
  insert into public.creator_visual_segments(visual_master_id,project_id,owner_user_id,semantic_anchor,sequence_no,visual_intent,evidence_requirement)
    values(v_vm,v_project,v_owner,'ANCHOR_HOOK',1,'Show verified hook evidence','Official or user-captured evidence only') returning visual_segment_id into v_segment;
  insert into public.creator_visual_segment_projections(visual_segment_id,language_track_id,project_id,owner_user_id,start_ms,end_ms)
    values(v_segment,v_zh,v_project,v_owner,0,2500),(v_segment,v_ja,v_project,v_owner,0,2800),(v_segment,v_en,v_project,v_owner,0,2300);
  insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,metadata)
    values(v_project,v_owner,'visual_master',v_vm::text,'VISUAL_MASTER_TIMELINE','06_EDIT_PLAN/VISUAL_MASTER/VM_MAIN/VISUAL_MASTER_TIMELINE.json','json','Ready','{}');
  perform public.app_creator_human_lock(v_owner,'visual_master',v_vm::text,'visual_master',true,(select revision from public.creator_visual_masters where visual_master_id=v_vm),true,'Fixture human Visual Master confirmation');
  insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,metadata)
    values
    (v_project,v_owner,'visual_master',v_vm::text,'EDIT_DECISION_LIST','06_EDIT_PLAN/VISUAL_MASTER/VM_MAIN/EDIT_DECISION_LIST.csv','csv','Ready','{}'),
    (v_project,v_owner,'visual_master',v_vm::text,'SHOT_LIST','06_EDIT_PLAN/VISUAL_MASTER/VM_MAIN/SHOT_LIST.csv','csv','Ready','{}');
  perform public.app_creator_human_lock(v_owner,'visual_master',v_vm::text,'edit_plan',true,(select revision from public.creator_visual_masters where visual_master_id=v_vm),true,'Fixture human Edit Plan confirmation');
  insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,checksum,metadata)
    values
    (v_project,v_owner,'visual_master',v_vm::text,'MASTER_VIDEO','09_FINAL/VISUAL_MASTER/VM_MAIN/MASTER_VIDEO.mp4','video','Ready','sha256:'||repeat('b',64),'{}'),
    (v_project,v_owner,'visual_master',v_vm::text,'BUILD_REPORT','07_CODEX_BUILD/VISUAL_MASTER/VM_MAIN/BUILD_REPORT.md','md','Ready',null,'{}'),
    (v_project,v_owner,'visual_master',v_vm::text,'QC_REPORT','07_CODEX_BUILD/VISUAL_MASTER/VM_MAIN/QC_REPORT.md','md','Ready',null,'{}');
  perform public.app_creator_human_lock(v_owner,'visual_master',v_vm::text,'master_render',true,(select revision from public.creator_visual_masters where visual_master_id=v_vm),true,'Fixture human Master Render confirmation');

  insert into public.creator_variants(project_id,owner_user_id,variant_key,label,status,visual_master_id,market,format) values
    (v_project,v_owner,'BILIBILI_ZH_LONG','Bilibili ZH Long','READY',v_vm,'CN','16:9 long') returning variant_id into v_bili;
  insert into public.creator_variants(project_id,owner_user_id,variant_key,label,status,visual_master_id,market,format) values
    (v_project,v_owner,'YOUTUBE_GLOBAL_LONG','YouTube Global Long','READY',v_vm,'Global','16:9 long') returning variant_id into v_youtube;
  insert into public.creator_variants(project_id,owner_user_id,variant_key,label,status,visual_master_id,market,format) values
    (v_project,v_owner,'TIKTOK_JP_SHORT','TikTok JP Short','READY',v_vm,'JP','9:16 short') returning variant_id into v_tiktok_jp;
  insert into public.creator_variants(project_id,owner_user_id,variant_key,label,status,visual_master_id,market,format) values
    (v_project,v_owner,'TIKTOK_GLOBAL_SHORT','TikTok Global Short','READY',v_vm,'Global','9:16 short') returning variant_id into v_tiktok_global;
  insert into public.creator_variant_language_tracks(variant_id,language_track_id,project_id,owner_user_id,audio_role,subtitle_role,sequence_no) values
    (v_bili,v_zh,v_project,v_owner,'primary','default',1),
    (v_youtube,v_zh,v_project,v_owner,'primary','default',1),(v_youtube,v_ja,v_project,v_owner,'alternate','default',2),(v_youtube,v_en,v_project,v_owner,'alternate','default',3),
    (v_tiktok_jp,v_ja,v_project,v_owner,'primary','default',1),(v_tiktok_global,v_en,v_project,v_owner,'primary','default',1);

  insert into public.creator_channels(owner_user_id,platform_id,channel_key,name,market,primary_language) values
    (v_owner,v_platform_bili,'FIXTURE_BILIBILI_MAIN','Bilibili Main','CN','zh-CN') returning channel_id into v_channel_bili;
  insert into public.creator_channels(owner_user_id,platform_id,channel_key,name,market,primary_language,language_mode,supported_languages) values
    (v_owner,v_platform_youtube,'FIXTURE_YOUTUBE_GLOBAL','YouTube Global','Global','en','multi_audio',array['zh-CN','ja','en']) returning channel_id into v_channel_youtube;
  insert into public.creator_channels(owner_user_id,platform_id,channel_key,name,market,primary_language) values
    (v_owner,v_platform_tiktok,'FIXTURE_TIKTOK_JP','TikTok JP','JP','ja') returning channel_id into v_channel_tiktok_jp;
  insert into public.creator_channels(owner_user_id,platform_id,channel_key,name,market,primary_language) values
    (v_owner,v_platform_tiktok,'FIXTURE_TIKTOK_GLOBAL','TikTok Global','Global','en') returning channel_id into v_channel_tiktok_global;

  for v_row in
    select * from (values
      (v_bili,v_channel_bili,v_platform_bili,'BILIBILI_ZH_LONG'),
      (v_youtube,v_channel_youtube,v_platform_youtube,'YOUTUBE_GLOBAL_LONG'),
      (v_tiktok_jp,v_channel_tiktok_jp,v_platform_tiktok,'TIKTOK_JP_SHORT'),
      (v_tiktok_global,v_channel_tiktok_global,v_platform_tiktok,'TIKTOK_GLOBAL_SHORT')
    ) as x(variant_id,channel_id,platform_id,variant_key)
  loop
    insert into public.creator_project_files(project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status,checksum,metadata)
      values(v_project,v_owner,'variant',v_row.variant_id::text,'EXPORT_MANIFEST','10_RELEASE/VARIANTS/'||v_row.variant_key||'/export.mp4','video','Ready','sha256:'||repeat('c',64),'{}');
    insert into public.creator_platform_presentations(variant_id,project_id,owner_user_id,platform_id,title,description,export_profile)
      values(v_row.variant_id,v_project,v_owner,v_row.platform_id,v_row.variant_key,'Synthetic presentation','{"source":"fixture"}') returning presentation_id into v_presentation;
    insert into public.creator_publish_packages(project_id,owner_user_id,package_key,variant_id,presentation_id,channel_id,package_manifest,validation_status,validation_errors)
      values(v_project,v_owner,v_row.variant_key||'_PACKAGE',v_row.variant_id,v_presentation,v_row.channel_id,
        jsonb_build_object('variantId',v_row.variant_id,'presentationId',v_presentation,'channelId',v_row.channel_id,
          'languageTrackIds',(select jsonb_agg(language_track_id order by sequence_no) from public.creator_variant_language_tracks where variant_id=v_row.variant_id),
          'outputArtifact',jsonb_build_object('scopeType','variant','scopeId',v_row.variant_id,'fileKey','EXPORT_MANIFEST','relativePath','10_RELEASE/VARIANTS/'||v_row.variant_key||'/export.mp4','checksum','sha256:'||repeat('c',64)),
          'exportProfile',jsonb_build_object('source','fixture')),'VALID','[]') returning publish_package_id into v_package;
    perform public.app_creator_human_lock(v_owner,'publish_package',v_package::text,'platform_variant',true,(select package_revision from public.creator_publish_packages where publish_package_id=v_package),true,'Fixture human Platform Variant confirmation');
    insert into public.creator_qa_reports(publish_package_id,project_id,owner_user_id,package_revision,status,checks,findings,model_metadata)
      values(v_package,v_project,v_owner,(select package_revision from public.creator_publish_packages where publish_package_id=v_package),'PASS','[{"key":"FIXTURE","status":"PASS"}]','[]','{"runner":"rollback-fixture"}');
    perform public.app_creator_human_lock(v_owner,'publish_package',v_package::text,'human_final_review',true,(select package_revision from public.creator_publish_packages where publish_package_id=v_package),true,'Fixture human final aesthetic review');
    perform public.app_creator_human_lock(v_owner,'publish_package',v_package::text,'release',true,(select package_revision from public.creator_publish_packages where publish_package_id=v_package),true,'Fixture human Release confirmation');
    if v_row.variant_id=v_youtube then
      insert into public.creator_publications(project_id,owner_user_id,variant_id,channel_id,publish_package_id,publication_mode,status)
        values(v_project,v_owner,v_youtube,v_channel_youtube,v_package,'INITIAL','READY_TO_PUBLISH') returning publication_id into v_publication_a;
    end if;
  end loop;

  begin
    update public.creator_publish_packages set package_manifest=package_manifest||'{"mutated":true}' where publish_package_id=v_package;
    raise exception 'Release snapshot mutation unexpectedly succeeded';
  exception when others then
    if sqlerrm='Release snapshot mutation unexpectedly succeeded' then raise; end if;
    if position('Release-approved Publish Package snapshot is immutable' in sqlerrm)=0 then raise; end if;
  end;

  perform public.app_creator_human_lock(v_owner,'publication',v_publication_a::text,'final_publish_confirmation',true,(select revision from public.creator_publications where publication_id=v_publication_a),true,'Fixture human final publish confirmation');
  update public.creator_publications set status='PUBLISHED',post_id='fixture-post-a',post_url='https://example.invalid/fixture-a',published_at=now() where publication_id=v_publication_a;
  insert into public.creator_publications(project_id,owner_user_id,variant_id,channel_id,publish_package_id,publication_mode,retry_of_publication_id,status)
    select project_id,owner_user_id,variant_id,channel_id,publish_package_id,'RETRY',publication_id,'RETRY' from public.creator_publications where publication_id=v_publication_a returning publication_id into v_publication_b;
  insert into public.creator_publications(project_id,owner_user_id,variant_id,channel_id,publish_package_id,publication_mode,repost_of_publication_id,status)
    select project_id,owner_user_id,variant_id,channel_id,publish_package_id,'REPOST',publication_id,'REPOST' from public.creator_publications where publication_id=v_publication_a returning publication_id into v_publication_c;
  insert into public.creator_publication_metric_snapshots(publication_id,project_id,owner_user_id,captured_at,provider,views,likes,comments,shares,raw_snapshot)
    values(v_publication_a,v_project,v_owner,now(),'synthetic-fixture',100,10,2,1,'{"fixture":true}');
  insert into public.creator_performance_reports(project_id,owner_user_id,report_key,variant_id,publication_id,window_start,window_end,metrics_captured_through,report)
    values(v_project,v_owner,'YT_GLOBAL_T1',v_youtube,v_publication_a,now()-interval '1 day',now(),now(),'{"conclusion":"synthetic"}') returning performance_report_id into v_report;
  insert into public.creator_learnings(project_id,owner_user_id,learning_key,performance_report_id,category,proposal,confidence)
    values(v_project,v_owner,'LEARNING_HOOK_01',v_report,'hook','{"proposal":"Use only human-accepted learnings"}',0.8) returning learning_id into v_learning;
  begin
    perform public.app_creator_review_learning(v_owner,v_learning,'ACCEPTED','AI attempted acceptance',false);
    raise exception 'AI Learning acceptance unexpectedly succeeded';
  exception when others then
    if sqlerrm='AI Learning acceptance unexpectedly succeeded' then raise; end if;
    if position('Explicit human confirmation is required' in sqlerrm)=0 then raise; end if;
  end;
  perform public.app_creator_review_learning(v_owner,v_learning,'ACCEPTED','Fixture human accepted for next-project feedback',true);

  -- Trigger the Legacy project_data prune. It must not delete any child scope
  -- or newly introduced Global Project-scope artifact.
  update public.creator_projects set project_data=jsonb_set(project_data,'{files}','{}'::jsonb),updated_at=now() where project_id=v_project;

  if (select count(*) from public.creator_projects where owner_user_id=v_owner) <> v_before_projects+1 then raise exception 'One Content Project invariant failed'; end if;
  if (select count(*) from public.creator_language_tracks where project_id=v_project) <> 3 then raise exception 'Expected 3 Language Tracks'; end if;
  if exists(select 1 from public.creator_language_tracks where project_id=v_project and (status<>'READY' or voice_timeline_locked_at is null)) then raise exception 'Language child workflow/lock independence failed'; end if;
  if (select count(*) from public.creator_project_files where project_id=v_project and artifact_scope_type='language_track' and file_key='AUDIO_MASTER') <> 3 then raise exception '3 x AUDIO_MASTER coexistence failed'; end if;
  if (select count(*) from public.creator_project_files where project_id=v_project and artifact_scope_type='language_track' and file_key=any(array['SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT'])) <> 12 then raise exception '3 x Timeline Bundle coexistence failed'; end if;
  if (select count(*) from public.creator_visual_segment_projections where project_id=v_project) <> 3 then raise exception 'Semantic Anchor language timing projection failed'; end if;
  if (select count(*) from public.creator_variant_language_tracks where variant_id=v_youtube) <> 3 then raise exception 'YouTube multi-language composition failed'; end if;
  if (select count(*) from public.creator_variant_language_tracks where variant_id=v_bili) <> 1 then raise exception 'Bilibili ZH-only composition failed'; end if;
  if (select count(*) from public.creator_publish_packages where project_id=v_project and release_locked_at is not null and qa_status='PASS') <> 4 then raise exception 'Publish Package gates failed'; end if;
  if (select count(*) from public.creator_publications where variant_id=v_youtube and channel_id=v_channel_youtube) <> 3 then raise exception 'Initial/Retry/Repost identity failed'; end if;
  if not exists(select 1 from public.creator_learnings where learning_id=v_learning and status='ACCEPTED') then raise exception 'Human Learning acceptance failed'; end if;
  if not exists(select 1 from public.creator_project_files where project_id=v_project and artifact_scope_type='visual_master') then raise exception 'Legacy prune removed Visual Master artifacts'; end if;
  if not exists(select 1 from public.creator_project_files where project_id=v_project and artifact_scope_type='variant') then raise exception 'Legacy prune removed Variant artifacts'; end if;

  raise notice 'CREATOR_GLOBAL_PRODUCTION_V1_ACCEPTANCE_OK project=1 languages=3 visual_master=1 variants=4 packages=4 publications=3 rollback=true';
end;
$acceptance$;

rollback;
