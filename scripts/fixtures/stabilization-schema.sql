-- Production schema contracts only; all test identities/data are generated locally.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema gucc_private; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth,public,gucc_private to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.app_users (user_id uuid not null, email text not null, role text default 'owner'::text not null, is_active boolean default true not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.character_progress (character_id uuid not null, research_status text not null, build_status text not null, progress_note text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.characters (id uuid default gen_random_uuid() not null, game_id uuid not null, name text not null, element text, profession text, sex text, rarity text, note text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, full_name text, release_date date);
create table public.creator_channels (channel_id uuid default gen_random_uuid() not null, owner_user_id uuid not null, platform_id uuid not null, channel_key text not null, name text not null, account_label text default ''::text not null, market text default 'Global'::text not null, primary_language text, language_mode text default 'single_language'::text not null, supported_languages text[] default '{}'::text[] not null, status text default 'active'::text not null, metadata jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.creator_deliverable_records (project_id text not null, video_id text not null, deliverable_key text not null, owner_user_id uuid default auth.uid() not null, status text default 'not_started'::text not null, evidence jsonb default '{}'::jsonb not null, review_note text default ''::text not null, reviewed_at timestamp with time zone, revision bigint default 1 not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.creator_deliverable_versions (project_id text not null, video_id text not null, deliverable_key text not null, revision bigint not null, owner_user_id uuid not null, record jsonb not null, created_at timestamp with time zone default now() not null);
create table public.creator_os_publish_drafts (owner_user_id uuid not null, project_id text not null, video_id text not null, draft_data jsonb not null, revision bigint default 1 not null, updated_at timestamp with time zone default now() not null);
create table public.creator_os_workspace_snapshots (owner_user_id uuid not null, project_id text not null, project_data jsonb not null, revision bigint default 1 not null, updated_at timestamp with time zone default now() not null);
create table public.creator_performance_reports (performance_report_id uuid default gen_random_uuid() not null, project_id text not null, owner_user_id uuid not null, report_key text not null, variant_id uuid not null, publication_id uuid, window_start timestamp with time zone not null, window_end timestamp with time zone not null, metrics_captured_through timestamp with time zone not null, report jsonb not null, report_artifact_id uuid, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.creator_platform_presentations (presentation_id uuid default gen_random_uuid() not null, variant_id uuid not null, project_id text not null, owner_user_id uuid not null, platform_id uuid not null, title text default ''::text not null, description text default ''::text not null, tags text[] default '{}'::text[] not null, chapters jsonb default '[]'::jsonb not null, language_metadata jsonb default '{}'::jsonb not null, market_metadata jsonb default '{}'::jsonb not null, export_profile jsonb default '{}'::jsonb not null, platform_metadata jsonb default '{}'::jsonb not null, thumbnail_artifact_id uuid, revision bigint default 1 not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.creator_project_files (id uuid default gen_random_uuid() not null, project_id text not null, owner_user_id uuid not null, file_key text not null, relative_path text default ''::text not null, kind text default 'other'::text not null, status text default 'Missing'::text not null, storage_provider text default 'local'::text not null, provider_file_id text, provider_url text, filename text, mime_type text, size_bytes bigint, checksum text, metadata jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, artifact_scope_type text default 'project'::text not null, artifact_scope_id text not null);
create table public.creator_projects (project_id text not null, owner_user_id uuid not null, name text default ''::text not null, game text default ''::text not null, topic text default ''::text not null, project_type text default 'A_FULL_GUIDE'::text not null, current_state text default 'IDEA'::text not null, target_publish_date date, locks jsonb default '{}'::jsonb not null, drive_root_id text, drive_root_url text, drive_folder_id text, drive_folder_url text, source_workspace_version text, project_data jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, archived_at timestamp with time zone, game_id uuid, revision bigint default 1 not null, last_device_id text, global_revision bigint default 1 not null, project_scope_locked_at timestamp with time zone, project_scope_locked_by uuid, evidence_locked_at timestamp with time zone, evidence_locked_by uuid, master_script_locked_at timestamp with time zone, master_script_locked_by uuid, global_stale_at timestamp with time zone, global_stale_reason text);
create table public.creator_publications (publication_id uuid default gen_random_uuid() not null, project_id text not null, owner_user_id uuid not null, variant_id uuid not null, channel_id uuid not null, status text default 'READY_TO_PUBLISH'::text not null, post_id text, post_url text, scheduled_at timestamp with time zone, published_at timestamp with time zone, failure_reason text, publish_package_snapshot jsonb default '{}'::jsonb not null, metadata jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, publish_package_id uuid, publication_mode text default 'INITIAL'::text not null, retry_of_publication_id uuid, repost_of_publication_id uuid, final_publish_confirmed_at timestamp with time zone, final_publish_confirmed_by uuid, revision bigint default 1 not null);
create table public.creator_publish_packages (publish_package_id uuid default gen_random_uuid() not null, project_id text not null, owner_user_id uuid not null, package_key text not null, variant_id uuid not null, presentation_id uuid not null, channel_id uuid not null, package_revision bigint default 1 not null, package_manifest jsonb default '{}'::jsonb not null, validation_status text default 'DRAFT'::text not null, validation_errors jsonb default '[]'::jsonb not null, platform_locked_at timestamp with time zone, platform_locked_by uuid, qa_status text default 'PENDING'::text not null, qa_package_revision bigint, qa_report_id uuid, human_reviewed_at timestamp with time zone, human_reviewed_by uuid, release_locked_at timestamp with time zone, release_locked_by uuid, release_snapshot jsonb default '{}'::jsonb not null, metadata jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table public.creator_variants (variant_id uuid default gen_random_uuid() not null, project_id text not null, owner_user_id uuid not null, variant_key text not null, label text default ''::text not null, status text default 'DRAFT'::text not null, metadata jsonb default '{}'::jsonb not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, visual_master_id uuid, revision bigint default 1 not null, output_profile text, market text, format text, stale_at timestamp with time zone, stale_reason text);
create table public.creator_video_workspaces (project_id text not null, video_id text not null, owner_user_id uuid default auth.uid() not null, title text not null, kind text default 'video'::text not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, legacy_branch text);
create table public.platforms (id uuid default gen_random_uuid() not null, name text not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
alter table public.characters add constraint characters_pkey PRIMARY KEY (id);
alter table public.characters add constraint characters_game_id_name_key UNIQUE (game_id, name);
alter table public.character_progress add constraint character_progress_pkey PRIMARY KEY (character_id);
alter table public.platforms add constraint platforms_pkey PRIMARY KEY (id);
alter table public.platforms add constraint platforms_name_key UNIQUE (name);
alter table public.app_users add constraint app_users_pkey PRIMARY KEY (user_id);
alter table public.app_users add constraint app_users_email_key UNIQUE (email);
alter table public.creator_projects add constraint creator_projects_pkey PRIMARY KEY (project_id);
alter table public.creator_project_files add constraint creator_project_files_pkey PRIMARY KEY (id);
alter table public.characters add constraint characters_sex_chk CHECK (((sex IS NULL) OR (sex = ANY (ARRAY['男'::text, '女'::text, '未定'::text]))));
alter table public.creator_projects add constraint creator_projects_state_chk CHECK ((current_state = ANY (ARRAY['IDEA'::text, 'PLANNING'::text, 'RESEARCHING'::text, 'RESEARCH_LOCKED'::text, 'CONTENT_LOCKED'::text, 'SCRIPTING'::text, 'SCRIPT_LOCKED'::text, 'PRE_ASSET_PREPARATION'::text, 'MUSIC_DRAFT'::text, 'MUSIC_LOCKED'::text, 'AUDIO_PRODUCTION'::text, 'AUDIO_LOCKED'::text, 'TIMELINE_GENERATION'::text, 'TIMELINE_LOCKED'::text, 'STORYBOARDING'::text, 'ASSET_COMPLETION'::text, 'PRODUCTION_READY'::text, 'CODEX_BUILD'::text, 'REVIEW'::text, 'REVISION'::text, 'FINE_EDIT'::text, 'PICTURE_LOCKED'::text, 'RELEASE_READY'::text, 'PUBLISHED'::text, 'ARCHIVED'::text])));
alter table public.creator_project_files add constraint creator_project_files_status_chk CHECK ((status = ANY (ARRAY['Missing'::text, 'Planned'::text, 'Ready'::text, 'Used'::text, 'Rejected'::text])));
alter table public.creator_projects add constraint creator_projects_project_owner_key UNIQUE (project_id, owner_user_id);
alter table public.creator_projects add constraint creator_projects_revision_positive CHECK ((revision > 0));
alter table public.creator_projects add constraint creator_projects_type_chk CHECK ((project_type = ANY (ARRAY['A_FULL_GUIDE'::text, 'B_SUNO_VIDEO'::text, 'C_GAME_SYSTEM'::text, 'D_MUSIC_RELEASE'::text, 'STANDARD_VIDEO'::text])));
alter table public.characters add constraint characters_rarity_chk CHECK (((rarity IS NULL) OR (rarity = ANY (ARRAY['4星'::text, '5星'::text, '6星'::text, 'A级'::text, 'S级'::text, 'UR'::text, 'SP'::text, 'SSR'::text, 'SR'::text, 'R'::text, 'N'::text]))));
alter table public.creator_project_files add constraint creator_project_files_id_project_owner_key UNIQUE (id, project_id, owner_user_id);
alter table public.creator_variants add constraint creator_variants_variant_key_nonempty CHECK (((length(btrim(variant_key)) >= 1) AND (length(btrim(variant_key)) <= 160)));
alter table public.creator_variants add constraint creator_variants_status_nonempty CHECK (((length(btrim(status)) >= 1) AND (length(btrim(status)) <= 80)));
alter table public.creator_variants add constraint creator_variants_pkey PRIMARY KEY (variant_id);
alter table public.creator_variants add constraint creator_variants_variant_project_owner_key UNIQUE (variant_id, project_id, owner_user_id);
alter table public.creator_variants add constraint creator_variants_project_variant_key UNIQUE (project_id, owner_user_id, variant_key);
alter table public.creator_channels add constraint creator_channels_channel_key_nonempty CHECK (((length(btrim(channel_key)) >= 1) AND (length(btrim(channel_key)) <= 160)));
alter table public.creator_channels add constraint creator_channels_name_nonempty CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 240)));
alter table public.creator_channels add constraint creator_channels_market_nonempty CHECK (((length(btrim(market)) >= 1) AND (length(btrim(market)) <= 120)));
alter table public.creator_channels add constraint creator_channels_language_mode_nonempty CHECK (((length(btrim(language_mode)) >= 1) AND (length(btrim(language_mode)) <= 80)));
alter table public.creator_channels add constraint creator_channels_status_nonempty CHECK (((length(btrim(status)) >= 1) AND (length(btrim(status)) <= 80)));
alter table public.creator_channels add constraint creator_channels_pkey PRIMARY KEY (channel_id);
alter table public.creator_channels add constraint creator_channels_channel_owner_key UNIQUE (channel_id, owner_user_id);
alter table public.creator_channels add constraint creator_channels_owner_channel_key UNIQUE (owner_user_id, channel_key);
alter table public.creator_publications add constraint creator_publications_status_nonempty CHECK (((length(btrim(status)) >= 1) AND (length(btrim(status)) <= 80)));
alter table public.creator_publications add constraint creator_publications_pkey PRIMARY KEY (publication_id);
alter table public.creator_project_files add constraint creator_project_files_artifact_scope_type_chk CHECK ((artifact_scope_type = ANY (ARRAY['project'::text, 'language_track'::text, 'visual_master'::text, 'variant'::text])));
alter table public.creator_project_files add constraint creator_project_files_scoped_file_key_key UNIQUE (project_id, artifact_scope_type, artifact_scope_id, file_key);
alter table public.creator_variants add constraint creator_variants_status_chk CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ASSEMBLING'::text, 'READY'::text, 'PLATFORM_PREPARATION'::text, 'LOCKED'::text, 'RELEASE_READY'::text])));
alter table public.creator_platform_presentations add constraint creator_platform_presentations_pkey PRIMARY KEY (presentation_id);
alter table public.creator_platform_presentations add constraint creator_presentations_variant_platform_key UNIQUE (variant_id, platform_id);
alter table public.creator_platform_presentations add constraint creator_presentations_presentation_project_owner_key UNIQUE (presentation_id, project_id, owner_user_id);
alter table public.creator_publish_packages add constraint creator_publish_packages_key_nonempty CHECK (((length(btrim(package_key)) >= 1) AND (length(btrim(package_key)) <= 160)));
alter table public.creator_publish_packages add constraint creator_publish_packages_validation_chk CHECK ((validation_status = ANY (ARRAY['DRAFT'::text, 'VALID'::text, 'INVALID'::text])));
alter table public.creator_publish_packages add constraint creator_publish_packages_qa_chk CHECK ((qa_status = ANY (ARRAY['PENDING'::text, 'PASS'::text, 'BLOCKED'::text, 'STALE'::text])));
alter table public.creator_publish_packages add constraint creator_publish_packages_pkey PRIMARY KEY (publish_package_id);
alter table public.creator_publish_packages add constraint creator_publish_packages_package_project_owner_key UNIQUE (publish_package_id, project_id, owner_user_id);
alter table public.creator_publish_packages add constraint creator_publish_packages_project_key UNIQUE (project_id, owner_user_id, package_key);
alter table public.creator_publications add constraint creator_publications_publication_project_owner_key UNIQUE (publication_id, project_id, owner_user_id);
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_revision_check CHECK ((revision > 0));
alter table public.creator_publications add constraint creator_publications_lifecycle_status_chk CHECK ((status = ANY (ARRAY['READY_TO_PUBLISH'::text, 'SCHEDULED'::text, 'PUBLISHING'::text, 'PUBLISHED'::text, 'FAILED'::text, 'RETRY'::text, 'REPOST'::text])));
alter table public.creator_publications add constraint creator_publications_mode_chk CHECK ((publication_mode = ANY (ARRAY['INITIAL'::text, 'RETRY'::text, 'REPOST'::text])));
alter table public.creator_performance_reports add constraint creator_performance_reports_window_chk CHECK ((window_end >= window_start));
alter table public.creator_performance_reports add constraint creator_performance_reports_pkey PRIMARY KEY (performance_report_id);
alter table public.creator_performance_reports add constraint creator_performance_reports_report_project_owner_key UNIQUE (performance_report_id, project_id, owner_user_id);
alter table public.creator_performance_reports add constraint creator_performance_reports_project_key UNIQUE (project_id, owner_user_id, report_key);
alter table public.creator_os_workspace_snapshots add constraint creator_os_workspace_snapshots_revision_check CHECK ((revision > 0));
alter table public.creator_os_workspace_snapshots add constraint creator_os_snapshot_project_data_object CHECK ((jsonb_typeof(project_data) = 'object'::text));
alter table public.creator_os_workspace_snapshots add constraint creator_os_snapshot_project_id_nonempty CHECK (((char_length(project_id) >= 1) AND (char_length(project_id) <= 200)));
alter table public.creator_os_workspace_snapshots add constraint creator_os_workspace_snapshots_pkey PRIMARY KEY (owner_user_id, project_id);
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_video_id_check CHECK (((length(video_id) >= 1) AND (length(video_id) <= 200)));
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_draft_data_check CHECK ((jsonb_typeof(draft_data) = 'object'::text));
alter table public.creator_os_publish_drafts add constraint publish_draft_identity CHECK (COALESCE(((((draft_data -> 'project'::text) ->> 'creatorProjectId'::text) = project_id) AND (((draft_data -> 'project'::text) ->> 'videoId'::text) = video_id) AND ((draft_data ->> 'schemaVersion'::text) = 'gucc-publish-console-1'::text)), false));
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_pkey PRIMARY KEY (owner_user_id, project_id, video_id);
alter table public.character_progress add constraint character_progress_research_status_chk CHECK ((research_status = ANY (ARRAY['◯'::text, '△'::text, '✕'::text, '対象外'::text, '待研究'::text, '查攻略'::text, 'OK'::text])));
alter table public.character_progress add constraint character_progress_build_status_chk CHECK ((build_status = ANY (ARRAY['◯'::text, '△'::text, '✕'::text, '対象外'::text, '待养成'::text, 'DONE'::text, 'NOT'::text])));
alter table public.creator_video_workspaces add constraint creator_video_workspaces_video_id_check CHECK (((length(video_id) >= 1) AND (length(video_id) <= 120)));
alter table public.creator_video_workspaces add constraint creator_video_workspaces_title_check CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 240)));
alter table public.creator_video_workspaces add constraint creator_video_workspaces_pkey PRIMARY KEY (project_id, video_id);
alter table public.creator_deliverable_records add constraint creator_deliverable_records_deliverable_key_check CHECK ((deliverable_key = ANY (ARRAY['script'::text, 'subtitle'::text, 'visual'::text, 'sound'::text, 'cover'::text, 'publish'::text])));
alter table public.creator_deliverable_records add constraint creator_deliverable_records_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'review'::text, 'confirmed'::text, 'blocked'::text])));
alter table public.creator_deliverable_records add constraint creator_deliverable_records_evidence_check CHECK ((jsonb_typeof(evidence) = 'object'::text));
alter table public.creator_deliverable_records add constraint creator_deliverable_records_revision_check CHECK ((revision >= 1));
alter table public.creator_deliverable_records add constraint creator_deliverable_records_pkey PRIMARY KEY (project_id, video_id, deliverable_key);
alter table public.creator_deliverable_versions add constraint creator_deliverable_versions_pkey PRIMARY KEY (project_id, video_id, deliverable_key, revision);
alter table public.creator_deliverable_records add constraint creator_deliverable_records_check CHECK (((status <> 'confirmed'::text) OR ((reviewed_at IS NOT NULL) AND (COALESCE((evidence ->> 'humanConfirmed'::text), ''::text) = 'true'::text) AND (((COALESCE((evidence ->> 'confirmationMethod'::text), ''::text) = 'manual'::text) AND (COALESCE((evidence ->> 'confirmationSource'::text), ''::text) = 'human_ui'::text)) OR ((length(COALESCE((evidence ->> 'fileName'::text), ''::text)) > 0) AND (COALESCE(((evidence ->> 'sizeBytes'::text))::bigint, (0)::bigint) > 0))))));
alter table public.character_progress add constraint character_progress_character_id_fkey FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
alter table public.app_users add constraint app_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_projects add constraint creator_projects_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_project_files add constraint creator_project_files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_project_files add constraint creator_project_files_project_owner_fkey FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_variants add constraint creator_variants_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_variants add constraint creator_variants_project_owner_fkey FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_channels add constraint creator_channels_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_channels add constraint creator_channels_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE RESTRICT;
alter table public.creator_publications add constraint creator_publications_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_publications add constraint creator_publications_project_owner_fkey FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_publications add constraint creator_publications_variant_project_owner_fkey FOREIGN KEY (variant_id, project_id, owner_user_id) REFERENCES creator_variants(variant_id, project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_publications add constraint creator_publications_channel_owner_fkey FOREIGN KEY (channel_id, owner_user_id) REFERENCES creator_channels(channel_id, owner_user_id) ON DELETE RESTRICT;
alter table public.creator_projects add constraint creator_projects_project_scope_locked_by_fkey FOREIGN KEY (project_scope_locked_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_projects add constraint creator_projects_evidence_locked_by_fkey FOREIGN KEY (evidence_locked_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_projects add constraint creator_projects_master_script_locked_by_fkey FOREIGN KEY (master_script_locked_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_platform_presentations add constraint creator_platform_presentations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_platform_presentations add constraint creator_platform_presentations_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE RESTRICT;
alter table public.creator_platform_presentations add constraint creator_presentations_variant_owner_fkey FOREIGN KEY (variant_id, project_id, owner_user_id) REFERENCES creator_variants(variant_id, project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_platform_presentations add constraint creator_presentations_thumbnail_owner_fkey FOREIGN KEY (thumbnail_artifact_id, project_id, owner_user_id) REFERENCES creator_project_files(id, project_id, owner_user_id) ON DELETE SET NULL (thumbnail_artifact_id);
alter table public.creator_publish_packages add constraint creator_publish_packages_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_publish_packages add constraint creator_publish_packages_platform_locked_by_fkey FOREIGN KEY (platform_locked_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_publish_packages add constraint creator_publish_packages_human_reviewed_by_fkey FOREIGN KEY (human_reviewed_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_publish_packages add constraint creator_publish_packages_release_locked_by_fkey FOREIGN KEY (release_locked_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_publish_packages add constraint creator_publish_packages_project_owner_fkey FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_publish_packages add constraint creator_publish_packages_variant_owner_fkey FOREIGN KEY (variant_id, project_id, owner_user_id) REFERENCES creator_variants(variant_id, project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_publish_packages add constraint creator_publish_packages_presentation_owner_fkey FOREIGN KEY (presentation_id, project_id, owner_user_id) REFERENCES creator_platform_presentations(presentation_id, project_id, owner_user_id) ON DELETE RESTRICT;
alter table public.creator_publish_packages add constraint creator_publish_packages_channel_owner_fkey FOREIGN KEY (channel_id, owner_user_id) REFERENCES creator_channels(channel_id, owner_user_id) ON DELETE RESTRICT;
alter table public.creator_publications add constraint creator_publications_retry_of_publication_id_fkey FOREIGN KEY (retry_of_publication_id) REFERENCES creator_publications(publication_id) ON DELETE SET NULL;
alter table public.creator_publications add constraint creator_publications_repost_of_publication_id_fkey FOREIGN KEY (repost_of_publication_id) REFERENCES creator_publications(publication_id) ON DELETE SET NULL;
alter table public.creator_publications add constraint creator_publications_final_publish_confirmed_by_fkey FOREIGN KEY (final_publish_confirmed_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.creator_publications add constraint creator_publications_package_owner_fkey FOREIGN KEY (publish_package_id, project_id, owner_user_id) REFERENCES creator_publish_packages(publish_package_id, project_id, owner_user_id) ON DELETE RESTRICT;
alter table public.creator_performance_reports add constraint creator_performance_reports_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_performance_reports add constraint creator_performance_reports_project_owner_fkey FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_performance_reports add constraint creator_performance_reports_variant_owner_fkey FOREIGN KEY (variant_id, project_id, owner_user_id) REFERENCES creator_variants(variant_id, project_id, owner_user_id) ON DELETE CASCADE;
alter table public.creator_performance_reports add constraint creator_performance_reports_publication_owner_fkey FOREIGN KEY (publication_id, project_id, owner_user_id) REFERENCES creator_publications(publication_id, project_id, owner_user_id) ON DELETE SET NULL (publication_id);
alter table public.creator_performance_reports add constraint creator_performance_reports_artifact_owner_fkey FOREIGN KEY (report_artifact_id, project_id, owner_user_id) REFERENCES creator_project_files(id, project_id, owner_user_id) ON DELETE SET NULL (report_artifact_id);
alter table public.creator_video_workspaces add constraint creator_video_workspaces_project_id_fkey FOREIGN KEY (project_id) REFERENCES creator_projects(project_id) ON DELETE RESTRICT;
alter table public.creator_os_workspace_snapshots add constraint creator_os_workspace_snapshots_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.creator_os_workspace_snapshots add constraint creator_os_snapshot_canonical_project_fk FOREIGN KEY (project_id, owner_user_id) REFERENCES creator_projects(project_id, owner_user_id) ON DELETE RESTRICT;
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);
alter table public.creator_os_publish_drafts add constraint creator_os_publish_drafts_project_id_fkey FOREIGN KEY (project_id) REFERENCES creator_projects(project_id);
alter table public.creator_deliverable_records add constraint creator_deliverable_records_project_id_video_id_fkey FOREIGN KEY (project_id, video_id) REFERENCES creator_video_workspaces(project_id, video_id) ON DELETE RESTRICT;
alter table public.creator_deliverable_versions add constraint creator_deliverable_versions_project_id_video_id_fkey FOREIGN KEY (project_id, video_id) REFERENCES creator_video_workspaces(project_id, video_id) ON DELETE RESTRICT;
CREATE OR REPLACE FUNCTION gucc_private.creator_workspace_owns_project(p_project_id text, p_owner uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select auth.uid() is not null and auth.uid()=p_owner and exists(select 1 from public.app_users where user_id=auth.uid() and is_active) and exists(select 1 from public.creator_projects where project_id=p_project_id and owner_user_id=auth.uid()); $function$;
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
end $function$;
CREATE OR REPLACE FUNCTION gucc_private.creator_workspace_save_deliverable(p_project_id text, p_video_id text, p_key text, p_status text, p_evidence jsonb, p_note text, p_expected_revision bigint)
 RETURNS creator_deliverable_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.creator_deliverable_records; uid uuid:=auth.uid(); a jsonb;
begin
 if uid is null or not exists(select 1 from public.app_users where user_id=uid and is_active) then
  raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform 1 from public.creator_video_workspaces v join public.creator_projects p using(project_id)
  where v.project_id=p_project_id and v.video_id=p_video_id and v.owner_user_id=uid and p.owner_user_id=uid for update of v;
 if not found then raise exception 'VIDEO_NOT_AVAILABLE' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision<0 or p_key is null or p_key not in ('script','subtitle','visual','sound','cover','publish')
  or p_status is null or p_status not in ('not_started','in_progress','review','confirmed','blocked')
  or coalesce(jsonb_typeof(p_evidence),'')<>'object' or octet_length(p_evidence::text)>2097152 then
  raise exception 'INVALID_DELIVERABLE' using errcode='22023'; end if;
 select * into r from public.creator_deliverable_records where project_id=p_project_id and video_id=p_video_id and deliverable_key=p_key;
 if nullif(p_evidence->>'requestId','') is not null and r.evidence->>'requestId'=p_evidence->>'requestId' then return r; end if;
 if coalesce(r.revision,0)<>p_expected_revision then raise exception 'DELIVERABLE_REVISION_CONFLICT: refresh and reconcile your retained draft' using errcode='40001'; end if;
 if r.evidence->>'locked'='true' and not (p_status='review' and p_evidence->>'locked'='false' and p_evidence->>'humanReopened'='true' and length(btrim(coalesce(p_note,'')))>0) then
  raise exception 'DELIVERABLE_LOCKED: explicitly reopen before changing' using errcode='42501'; end if;
 -- Manual status confirmation records human judgment, never a claim of observed bytes.
 -- Legacy file-backed callers keep their existing validation.
 if p_status='confirmed' then
  if p_evidence->>'humanConfirmed' is distinct from 'true' then
   raise exception 'CONFIRM_REQUIRES_HUMAN_REVIEW'; end if;
  if not (coalesce(p_evidence->>'confirmationMethod','')='manual' and coalesce(p_evidence->>'confirmationSource','')='human_ui') then
  if coalesce(jsonb_array_length(p_evidence->'artifacts'),0)=0 then
   raise exception 'CONFIRM_REQUIRES_OBSERVED_FILE_AND_HUMAN_REVIEW'; end if;
  for a in select value from jsonb_array_elements(p_evidence->'artifacts') loop
   if coalesce(a->>'observation','') not in ('browser_file','generated_bytes') or coalesce((a->>'sizeBytes')::bigint,0)<=0
    or coalesce(a->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(a->>'fileName','')='' or (a->>'fileName')~'[/\\]' then
    raise exception 'INVALID_FILE_OBSERVATION'; end if;
  end loop;
  if p_key='subtitle' and (coalesce((p_evidence->'recording'->>'sizeBytes')::bigint,0)<=0 or p_evidence->>'subtitleTimingReviewed' is distinct from 'true') then
   raise exception 'SUBTITLE_REQUIRES_REAL_RECORDING_AND_TIMING_REVIEW'; end if;
  end if;
  if p_evidence->>'locked' is distinct from 'true' then raise exception 'CONFIRMED_OUTPUT_MUST_BE_LOCKED'; end if;
 end if;
 insert into public.creator_deliverable_records(project_id,video_id,deliverable_key,owner_user_id,status,evidence,review_note,reviewed_at,revision)
 values(p_project_id,p_video_id,p_key,uid,p_status,p_evidence,left(coalesce(p_note,''),2000),case when p_status='confirmed' then now() end,coalesce(r.revision,0)+1)
 on conflict(project_id,video_id,deliverable_key) do update set status=excluded.status,evidence=excluded.evidence,review_note=excluded.review_note,
 reviewed_at=excluded.reviewed_at,revision=excluded.revision,updated_at=now() returning * into r;
 for a in select value from jsonb_array_elements(coalesce(p_evidence->'artifacts','[]')) loop
  if coalesce(a->>'observation','') in ('browser_file','generated_bytes') and coalesce(a->>'sha256','')~'^[a-f0-9]{64}$' and coalesce((a->>'sizeBytes')::bigint,0)>0 then
   insert into public.creator_project_files(project_id,owner_user_id,file_key,relative_path,filename,mime_type,size_bytes,checksum,kind,status,storage_provider,artifact_scope_type,artifact_scope_id,metadata)
   values(p_project_id,uid,'VIDEO:'||p_video_id||':'||p_key||':'||(a->>'sha256'),'',a->>'fileName',a->>'mimeType',(a->>'sizeBytes')::bigint,a->>'sha256',p_key,'Ready','local','project',p_project_id,
    jsonb_build_object('videoId',p_video_id,'deliverableKey',p_key,'observation',a,'availability','local_only','qualityConfirmed',p_status='confirmed')) on conflict do nothing;
  end if;
 end loop;
 return r;
end $function$;
CREATE OR REPLACE FUNCTION gucc_private.creator_workspace_snapshot_videos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb; merged jsonb;
begin
 for v in select value from jsonb_array_elements(coalesce(new.project_data->'videos','[]')) loop
  if coalesce(v->>'videoId','')='' or length(v->>'videoId')>120 then raise exception 'INVALID_VIDEO_ID'; end if;
  insert into public.creator_video_workspaces(project_id,video_id,owner_user_id,title,legacy_branch)
   values(new.project_id,v->>'videoId',new.owner_user_id,left(coalesce(nullif(v->>'name',''),nullif(v->>'title',''),v->>'videoId'),240),coalesce(v->>'branch',v->>'videoId')) on conflict do nothing;
 end loop;
 select coalesce(jsonb_agg(coalesce((select x from jsonb_array_elements(coalesce(new.project_data->'videos','[]')) x where x->>'videoId'=w.video_id limit 1),
  jsonb_build_object('videoId',w.video_id,'branch',coalesce(w.legacy_branch,w.video_id),'name',w.title)) order by w.created_at,w.video_id),'[]') into merged
  from public.creator_video_workspaces w where w.project_id=new.project_id and w.owner_user_id=new.owner_user_id;
 new.project_data=jsonb_set(new.project_data,'{videos}',merged);
 return new;
end $function$;
CREATE OR REPLACE FUNCTION gucc_private.creator_workspace_version_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.creator_deliverable_versions(project_id,video_id,deliverable_key,revision,owner_user_id,record)
 values(new.project_id,new.video_id,new.deliverable_key,new.revision,new.owner_user_id,to_jsonb(new));
 return new;
end $function$;
CREATE OR REPLACE FUNCTION public.app_creator_human_action_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(current_setting('app.creator_human_action', true), '') = 'confirmed';
$function$;
CREATE OR REPLACE FUNCTION public.app_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.creator_os_save_project(p_project jsonb, p_expected_revision bigint DEFAULT NULL::bigint)
 RETURNS creator_os_workspace_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_root public.creator_projects%rowtype;
  v_result public.creator_os_workspace_snapshots%rowtype;
  v_name text;
  v_game text;
  v_idea text;
begin
  if v_user is null or not exists (
    select 1 from public.app_users a where a.user_id=v_user and a.is_active
  ) then raise exception 'CREATOR_OS_NOT_AUTHORIZED' using errcode='42501'; end if;
  if jsonb_typeof(p_project) <> 'object' then raise exception 'Invalid project object'; end if;
  v_id:=nullif(trim(p_project->>'projectId'),'');
  if v_id is null or char_length(v_id)>200 then raise exception 'Invalid projectId';end if;
  v_name:=left(coalesce(nullif(trim(p_project->>'name'),''),'待命名项目'),160);
  v_game:=left(coalesce(p_project->>'game',''),150);
  v_idea:=left(coalesce(p_project->>'idea',''),2000);
  -- Project ID is immutable. Root rows owned by the old production system must never
  -- have project_data/current_state/locks overwritten by the new workspace.
  insert into public.creator_projects
   (project_id,owner_user_id,name,game,topic,project_type,current_state,source_workspace_version,project_data)
  values (v_id,v_user,v_name,v_game,v_idea,'STANDARD_VIDEO','IDEA','creator-os-v3','{}'::jsonb)
  on conflict (project_id) do nothing;
  select * into v_root from public.creator_projects where project_id=v_id for update;
  if not found or v_root.owner_user_id<>v_user then
    raise exception 'Project identity belongs to another owner' using errcode='42501';
  end if;
  if v_root.source_workspace_version='creator-os-v3' then
    update public.creator_projects set name=v_name, game=v_game,topic=v_idea
     where project_id=v_id and owner_user_id=v_user
      and (name,game,topic) is distinct from (v_name,v_game,v_idea);
  end if;
  if p_expected_revision is null then
    insert into public.creator_os_workspace_snapshots(owner_user_id,project_id,project_data,revision)
    values(v_user,v_id,p_project,1) on conflict do nothing
    returning * into v_result;
    if not found then raise exception 'CREATOR_OS_REVISION_CONFLICT' using errcode='40001';end if;
  else
    update public.creator_os_workspace_snapshots
    set project_data=p_project, revision=revision+1, updated_at=now()
    where owner_user_id=v_user and project_id=v_id and revision=p_expected_revision
    returning * into v_result;
    if not found then raise exception 'CREATOR_OS_REVISION_CONFLICT' using errcode='40001';end if;
  end if;
  return v_result;
end;
$function$;
CREATE OR REPLACE FUNCTION public.creator_workspace_register_video(p_project_id text, p_video_id text, p_title text, p_expected_revision bigint)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select gucc_private.creator_workspace_register_video(p_project_id,p_video_id,p_title,p_expected_revision);$function$;
CREATE OR REPLACE FUNCTION public.creator_workspace_save_deliverable(p_project_id text, p_video_id text, p_key text, p_status text, p_evidence jsonb, p_note text, p_expected_revision bigint)
 RETURNS creator_deliverable_records
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select gucc_private.creator_workspace_save_deliverable(p_project_id,p_video_id,p_key,p_status,p_evidence,p_note,p_expected_revision);
$function$;
