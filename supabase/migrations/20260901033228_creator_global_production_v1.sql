-- GUCC Creator OS Global Production v1.
-- Canonical Production migration identity:
-- 20260901033228_creator_global_production_v1.sql
-- Repository identity matches supabase_migrations.schema_migrations.

-- Project-owned hard locks remain separate from the Legacy `locks` JSON so the
-- 23-state compatibility flow can continue unchanged.
alter table public.creator_projects
  add column global_revision bigint not null default 1,
  add column project_scope_locked_at timestamptz,
  add column project_scope_locked_by uuid references auth.users(id) on delete restrict,
  add column evidence_locked_at timestamptz,
  add column evidence_locked_by uuid references auth.users(id) on delete restrict,
  add column master_script_locked_at timestamptz,
  add column master_script_locked_by uuid references auth.users(id) on delete restrict,
  add column global_stale_at timestamptz,
  add column global_stale_reason text;

alter table public.creator_language_tracks
  add column revision bigint not null default 1,
  add column script_revision bigint not null default 1,
  add column audio_revision bigint not null default 0,
  add column timeline_revision bigint not null default 0,
  add column script_locked_at timestamptz,
  add column script_locked_by uuid references auth.users(id) on delete restrict,
  add column voice_timeline_locked_at timestamptz,
  add column voice_timeline_locked_by uuid references auth.users(id) on delete restrict,
  add column timing_provenance text,
  add column alignment_status text not null default 'PENDING',
  add column stale_at timestamptz,
  add column stale_reason text;

update public.creator_language_tracks set status=upper(status), alignment_status=upper(alignment_status);
alter table public.creator_language_tracks alter column status set default 'DRAFT';
alter table public.creator_language_tracks
  add constraint creator_language_tracks_workflow_status_chk
    check (status in ('DRAFT','SCRIPTING','SCRIPT_LOCKED','AUDIO_PRODUCTION','AUDIO_LOCKED','TIMELINE_GENERATION','TIMELINE_LOCKED','READY')),
  add constraint creator_language_tracks_alignment_status_chk
    check (alignment_status in ('PENDING','VALID','REVIEW_REQUIRED','INVALID')),
  add constraint creator_language_tracks_real_timing_chk
    check (timing_provenance is null or timing_provenance in ('real_audio'));

create table public.creator_research_sources (
  research_source_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  source_kind text not null default 'official',
  source_url text,
  version_context text,
  last_checked_at timestamptz,
  source_updated_at timestamptz,
  fact_snapshot jsonb not null default '{}'::jsonb,
  is_stale boolean not null default false,
  revalidation_required boolean not null default false,
  source_change_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_research_sources_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_research_sources_project_key unique (project_id, owner_user_id, source_key),
  constraint creator_research_sources_key_nonempty check (length(btrim(source_key)) between 1 and 160),
  constraint creator_research_sources_url_chk check (source_url is null or source_url ~ '^https://')
);

create table public.creator_assets (
  asset_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  asset_key text not null,
  asset_type text not null,
  label text not null default '',
  relative_path text,
  source_name text,
  source_url text,
  rights_status text not null default 'unknown',
  evidence_grade text not null default 'unknown',
  quality_status text not null default 'unreviewed',
  horizontal_compatible boolean,
  vertical_compatible boolean,
  reusable boolean not null default false,
  semantic_tags text[] not null default '{}'::text[],
  clip_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_assets_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_assets_asset_project_owner_key unique (asset_id, project_id, owner_user_id),
  constraint creator_assets_project_key unique (project_id, owner_user_id, asset_key),
  constraint creator_assets_key_nonempty check (length(btrim(asset_key)) between 1 and 160),
  constraint creator_assets_relative_path_chk check (
    relative_path is null or (
      relative_path !~ '^(?:[A-Za-z]:[\\/]|[\\/])'
      and relative_path !~ '(^|[\\/])\.\.([\\/]|$)'
    )
  )
);

create table public.creator_visual_masters (
  visual_master_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visual_master_key text not null,
  label text not null default '',
  status text not null default 'DRAFT',
  revision bigint not null default 1,
  visual_locked_at timestamptz,
  visual_locked_by uuid references auth.users(id) on delete restrict,
  edit_plan_locked_at timestamptz,
  edit_plan_locked_by uuid references auth.users(id) on delete restrict,
  master_render_locked_at timestamptz,
  master_render_locked_by uuid references auth.users(id) on delete restrict,
  stale_at timestamptz,
  stale_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_visual_masters_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_visual_masters_visual_project_owner_key unique (visual_master_id, project_id, owner_user_id),
  constraint creator_visual_masters_project_key unique (project_id, owner_user_id, visual_master_key),
  constraint creator_visual_masters_key_nonempty check (length(btrim(visual_master_key)) between 1 and 160),
  constraint creator_visual_masters_status_chk check (status in ('DRAFT','PLANNING','STORYBOARDING','ASSET_COMPLETION','READY','LOCKED'))
);

create table public.creator_visual_segments (
  visual_segment_id uuid primary key default gen_random_uuid(),
  visual_master_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  semantic_anchor text not null,
  sequence_no integer not null,
  visual_intent text not null,
  evidence_requirement text,
  asset_references jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_visual_segments_master_owner_fkey foreign key (visual_master_id, project_id, owner_user_id)
    references public.creator_visual_masters(visual_master_id, project_id, owner_user_id) on delete cascade,
  constraint creator_visual_segments_segment_project_owner_key unique (visual_segment_id, project_id, owner_user_id),
  constraint creator_visual_segments_anchor_key unique (visual_master_id, semantic_anchor),
  constraint creator_visual_segments_sequence_key unique (visual_master_id, sequence_no),
  constraint creator_visual_segments_sequence_positive check (sequence_no > 0),
  constraint creator_visual_segments_anchor_nonempty check (length(btrim(semantic_anchor)) between 1 and 240)
);

create table public.creator_visual_segment_projections (
  visual_segment_id uuid not null,
  language_track_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  start_ms bigint not null,
  end_ms bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (visual_segment_id, language_track_id),
  constraint creator_visual_projection_segment_owner_fkey foreign key (visual_segment_id, project_id, owner_user_id)
    references public.creator_visual_segments(visual_segment_id, project_id, owner_user_id) on delete cascade,
  constraint creator_visual_projection_track_owner_fkey foreign key (language_track_id, project_id, owner_user_id)
    references public.creator_language_tracks(language_track_id, project_id, owner_user_id) on delete cascade,
  constraint creator_visual_projection_timing_chk check (start_ms >= 0 and end_ms > start_ms)
);

create table public.creator_asset_coverage (
  coverage_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visual_segment_id uuid,
  asset_id uuid,
  semantic_anchor text not null,
  coverage_status text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_asset_coverage_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_asset_coverage_segment_owner_fkey foreign key (visual_segment_id, project_id, owner_user_id)
    references public.creator_visual_segments(visual_segment_id, project_id, owner_user_id) on delete cascade,
  constraint creator_asset_coverage_asset_owner_fkey foreign key (asset_id, project_id, owner_user_id)
    references public.creator_assets(asset_id, project_id, owner_user_id) on delete set null (asset_id),
  constraint creator_asset_coverage_status_chk check (coverage_status in ('MATCHED','BROLL','MISSING','PIXEL_ANIMATION','DIAGRAM','ADDITIONAL_RECORDING'))
);

alter table public.creator_variants
  add column visual_master_id uuid,
  add column revision bigint not null default 1,
  add column output_profile text,
  add column market text,
  add column format text,
  add column stale_at timestamptz,
  add column stale_reason text;
update public.creator_variants set status=upper(status);
alter table public.creator_variants alter column status set default 'DRAFT';
alter table public.creator_variants
  add constraint creator_variants_status_chk check (status in ('DRAFT','ASSEMBLING','READY','PLATFORM_PREPARATION','LOCKED','RELEASE_READY')),
  add constraint creator_variants_visual_master_owner_fkey foreign key (visual_master_id, project_id, owner_user_id)
    references public.creator_visual_masters(visual_master_id, project_id, owner_user_id) on delete restrict;

create table public.creator_variant_language_tracks (
  variant_id uuid not null,
  language_track_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  audio_role text not null default 'primary',
  subtitle_role text not null default 'default',
  sequence_no integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (variant_id, language_track_id),
  constraint creator_variant_tracks_variant_owner_fkey foreign key (variant_id, project_id, owner_user_id)
    references public.creator_variants(variant_id, project_id, owner_user_id) on delete cascade,
  constraint creator_variant_tracks_language_owner_fkey foreign key (language_track_id, project_id, owner_user_id)
    references public.creator_language_tracks(language_track_id, project_id, owner_user_id) on delete restrict,
  constraint creator_variant_tracks_sequence_positive check (sequence_no > 0)
);

create table public.creator_platform_presentations (
  presentation_id uuid primary key default gen_random_uuid(),
  variant_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  title text not null default '',
  description text not null default '',
  tags text[] not null default '{}'::text[],
  chapters jsonb not null default '[]'::jsonb,
  language_metadata jsonb not null default '{}'::jsonb,
  market_metadata jsonb not null default '{}'::jsonb,
  export_profile jsonb not null default '{}'::jsonb,
  platform_metadata jsonb not null default '{}'::jsonb,
  thumbnail_artifact_id uuid,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_presentations_variant_owner_fkey foreign key (variant_id, project_id, owner_user_id)
    references public.creator_variants(variant_id, project_id, owner_user_id) on delete cascade,
  constraint creator_presentations_thumbnail_owner_fkey foreign key (thumbnail_artifact_id, project_id, owner_user_id)
    references public.creator_project_files(id, project_id, owner_user_id) on delete set null (thumbnail_artifact_id),
  constraint creator_presentations_variant_platform_key unique (variant_id, platform_id),
  constraint creator_presentations_presentation_project_owner_key unique (presentation_id, project_id, owner_user_id)
);

create table public.creator_publish_packages (
  publish_package_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  package_key text not null,
  variant_id uuid not null,
  presentation_id uuid not null,
  channel_id uuid not null,
  package_revision bigint not null default 1,
  package_manifest jsonb not null default '{}'::jsonb,
  validation_status text not null default 'DRAFT',
  validation_errors jsonb not null default '[]'::jsonb,
  platform_locked_at timestamptz,
  platform_locked_by uuid references auth.users(id) on delete restrict,
  qa_status text not null default 'PENDING',
  qa_package_revision bigint,
  qa_report_id uuid,
  human_reviewed_at timestamptz,
  human_reviewed_by uuid references auth.users(id) on delete restrict,
  release_locked_at timestamptz,
  release_locked_by uuid references auth.users(id) on delete restrict,
  release_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_publish_packages_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_publish_packages_variant_owner_fkey foreign key (variant_id, project_id, owner_user_id)
    references public.creator_variants(variant_id, project_id, owner_user_id) on delete cascade,
  constraint creator_publish_packages_presentation_owner_fkey foreign key (presentation_id, project_id, owner_user_id)
    references public.creator_platform_presentations(presentation_id, project_id, owner_user_id) on delete restrict,
  constraint creator_publish_packages_channel_owner_fkey foreign key (channel_id, owner_user_id)
    references public.creator_channels(channel_id, owner_user_id) on delete restrict,
  constraint creator_publish_packages_package_project_owner_key unique (publish_package_id, project_id, owner_user_id),
  constraint creator_publish_packages_project_key unique (project_id, owner_user_id, package_key),
  constraint creator_publish_packages_key_nonempty check (length(btrim(package_key)) between 1 and 160),
  constraint creator_publish_packages_validation_chk check (validation_status in ('DRAFT','VALID','INVALID')),
  constraint creator_publish_packages_qa_chk check (qa_status in ('PENDING','PASS','BLOCKED','STALE'))
);

create table public.creator_qa_reports (
  qa_report_id uuid primary key default gen_random_uuid(),
  publish_package_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  package_revision bigint not null,
  status text not null,
  checks jsonb not null default '[]'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  report_artifact_id uuid,
  model_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creator_qa_reports_package_owner_fkey foreign key (publish_package_id, project_id, owner_user_id)
    references public.creator_publish_packages(publish_package_id, project_id, owner_user_id) on delete cascade,
  constraint creator_qa_reports_artifact_owner_fkey foreign key (report_artifact_id, project_id, owner_user_id)
    references public.creator_project_files(id, project_id, owner_user_id) on delete set null (report_artifact_id),
  constraint creator_qa_reports_report_project_owner_key unique (qa_report_id, project_id, owner_user_id),
  constraint creator_qa_reports_status_chk check (status in ('PASS','BLOCKED'))
);

alter table public.creator_publish_packages
  add constraint creator_publish_packages_latest_qa_owner_fkey foreign key (qa_report_id, project_id, owner_user_id)
    references public.creator_qa_reports(qa_report_id, project_id, owner_user_id) on delete set null (qa_report_id);

alter table public.creator_publications
  add column publish_package_id uuid,
  add column publication_mode text not null default 'INITIAL',
  add column retry_of_publication_id uuid references public.creator_publications(publication_id) on delete set null,
  add column repost_of_publication_id uuid references public.creator_publications(publication_id) on delete set null,
  add column final_publish_confirmed_at timestamptz,
  add column final_publish_confirmed_by uuid references auth.users(id) on delete restrict,
  add column revision bigint not null default 1;
update public.creator_publications set status=upper(status);
alter table public.creator_publications alter column status set default 'READY_TO_PUBLISH';
alter table public.creator_publications
  add constraint creator_publications_package_owner_fkey foreign key (publish_package_id, project_id, owner_user_id)
    references public.creator_publish_packages(publish_package_id, project_id, owner_user_id) on delete restrict,
  add constraint creator_publications_publication_project_owner_key unique (publication_id, project_id, owner_user_id),
  add constraint creator_publications_lifecycle_status_chk check (status in ('READY_TO_PUBLISH','SCHEDULED','PUBLISHING','PUBLISHED','FAILED','RETRY','REPOST')),
  add constraint creator_publications_mode_chk check (publication_mode in ('INITIAL','RETRY','REPOST'));

create table public.creator_publication_metric_snapshots (
  metric_snapshot_id uuid primary key default gen_random_uuid(),
  publication_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null,
  provider text not null,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  watch_time_seconds numeric,
  average_view_duration_seconds numeric,
  retention_rate numeric,
  ctr numeric,
  followers_gained bigint,
  raw_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creator_metric_snapshots_publication_owner_fkey foreign key (publication_id, project_id, owner_user_id)
    references public.creator_publications(publication_id, project_id, owner_user_id) on delete cascade,
  constraint creator_metric_snapshots_identity unique (publication_id, captured_at, provider),
  constraint creator_metric_snapshots_nonnegative check (
    coalesce(views,0) >= 0 and coalesce(likes,0) >= 0 and coalesce(comments,0) >= 0 and coalesce(shares,0) >= 0
    and coalesce(saves,0) >= 0 and coalesce(watch_time_seconds,0) >= 0 and coalesce(average_view_duration_seconds,0) >= 0
    and coalesce(followers_gained,0) >= 0
  ),
  constraint creator_metric_snapshots_rates check (
    (retention_rate is null or retention_rate between 0 and 1) and (ctr is null or ctr between 0 and 1)
  )
);

create table public.creator_performance_reports (
  performance_report_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  report_key text not null,
  variant_id uuid not null,
  publication_id uuid,
  window_start timestamptz not null,
  window_end timestamptz not null,
  metrics_captured_through timestamptz not null,
  report jsonb not null,
  report_artifact_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_performance_reports_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_performance_reports_variant_owner_fkey foreign key (variant_id, project_id, owner_user_id)
    references public.creator_variants(variant_id, project_id, owner_user_id) on delete cascade,
  constraint creator_performance_reports_publication_owner_fkey foreign key (publication_id, project_id, owner_user_id)
    references public.creator_publications(publication_id, project_id, owner_user_id) on delete set null (publication_id),
  constraint creator_performance_reports_artifact_owner_fkey foreign key (report_artifact_id, project_id, owner_user_id)
    references public.creator_project_files(id, project_id, owner_user_id) on delete set null (report_artifact_id),
  constraint creator_performance_reports_report_project_owner_key unique (performance_report_id, project_id, owner_user_id),
  constraint creator_performance_reports_project_key unique (project_id, owner_user_id, report_key),
  constraint creator_performance_reports_window_chk check (window_end >= window_start)
);

create table public.creator_learnings (
  learning_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  learning_key text not null,
  performance_report_id uuid not null,
  category text not null,
  status text not null default 'PROPOSED',
  proposal jsonb not null,
  confidence numeric,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_note text,
  supersedes_learning_id uuid references public.creator_learnings(learning_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_learnings_project_owner_fkey foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id) on delete cascade,
  constraint creator_learnings_report_owner_fkey foreign key (performance_report_id, project_id, owner_user_id)
    references public.creator_performance_reports(performance_report_id, project_id, owner_user_id) on delete cascade,
  constraint creator_learnings_project_key unique (project_id, owner_user_id, learning_key),
  constraint creator_learnings_status_chk check (status in ('PROPOSED','ACCEPTED','REJECTED','SUPERSEDED')),
  constraint creator_learnings_confidence_chk check (confidence is null or confidence between 0 and 1)
);

comment on table public.creator_visual_masters is 'Reusable unified visual identity under one Content Project; distinct from Language Track, Variant, Platform and Channel.';
comment on table public.creator_visual_segments is 'Semantic Visual Master Timeline. Timing is projected per Language Track and never tied to subtitle line numbers.';
comment on table public.creator_assets is 'Local-first Asset Index metadata only. No media bytes or absolute local paths are stored.';
comment on table public.creator_publish_packages is 'Revisioned platform/channel publish candidate. Release Lock creates an immutable metadata snapshot; media remains local.';
comment on table public.creator_publication_metric_snapshots is 'Historical normalized metrics captured for a concrete Publication instance.';
comment on table public.creator_learnings is 'AI proposals require explicit human acceptance before becoming reusable GUCC knowledge.';

create index creator_research_sources_owner_project_idx on public.creator_research_sources(owner_user_id, project_id, updated_at desc);
create index creator_research_sources_freshness_idx on public.creator_research_sources(owner_user_id, is_stale, revalidation_required, last_checked_at);
create index creator_assets_owner_project_idx on public.creator_assets(owner_user_id, project_id, updated_at desc);
create index creator_assets_tags_idx on public.creator_assets using gin(semantic_tags);
create index creator_visual_masters_owner_project_idx on public.creator_visual_masters(owner_user_id, project_id, updated_at desc);
create index creator_visual_segments_master_idx on public.creator_visual_segments(visual_master_id, sequence_no);
create index creator_visual_segments_owner_idx on public.creator_visual_segments(owner_user_id, project_id);
create index creator_visual_projections_track_idx on public.creator_visual_segment_projections(language_track_id, start_ms);
create index creator_visual_projections_owner_idx on public.creator_visual_segment_projections(owner_user_id, project_id);
create index creator_asset_coverage_owner_project_idx on public.creator_asset_coverage(owner_user_id, project_id, coverage_status);
create index creator_asset_coverage_segment_idx on public.creator_asset_coverage(visual_segment_id);
create index creator_asset_coverage_asset_idx on public.creator_asset_coverage(asset_id);
create index creator_variants_visual_master_idx on public.creator_variants(visual_master_id);
create index creator_variant_tracks_language_idx on public.creator_variant_language_tracks(language_track_id);
create index creator_variant_tracks_owner_idx on public.creator_variant_language_tracks(owner_user_id, project_id);
create index creator_presentations_owner_project_idx on public.creator_platform_presentations(owner_user_id, project_id, updated_at desc);
create index creator_presentations_platform_idx on public.creator_platform_presentations(platform_id);
create index creator_presentations_thumbnail_idx on public.creator_platform_presentations(thumbnail_artifact_id);
create index creator_publish_packages_owner_project_idx on public.creator_publish_packages(owner_user_id, project_id, updated_at desc);
create index creator_publish_packages_variant_idx on public.creator_publish_packages(variant_id);
create index creator_publish_packages_presentation_idx on public.creator_publish_packages(presentation_id);
create index creator_publish_packages_channel_idx on public.creator_publish_packages(channel_id);
create index creator_publish_packages_qa_idx on public.creator_publish_packages(qa_report_id);
create index creator_qa_reports_package_idx on public.creator_qa_reports(publish_package_id, package_revision, created_at desc);
create index creator_qa_reports_owner_idx on public.creator_qa_reports(owner_user_id, project_id);
create index creator_publications_package_idx on public.creator_publications(publish_package_id, created_at desc);
create index creator_publications_retry_idx on public.creator_publications(retry_of_publication_id);
create index creator_publications_repost_idx on public.creator_publications(repost_of_publication_id);
create index creator_metric_snapshots_owner_project_idx on public.creator_publication_metric_snapshots(owner_user_id, project_id, captured_at desc);
create index creator_metric_snapshots_publication_idx on public.creator_publication_metric_snapshots(publication_id, captured_at desc);
create index creator_performance_reports_owner_project_idx on public.creator_performance_reports(owner_user_id, project_id, updated_at desc);
create index creator_performance_reports_variant_idx on public.creator_performance_reports(variant_id, window_end desc);
create index creator_performance_reports_publication_idx on public.creator_performance_reports(publication_id);
create index creator_learnings_owner_status_idx on public.creator_learnings(owner_user_id, status, updated_at desc);
create index creator_learnings_report_idx on public.creator_learnings(performance_report_id);
create index creator_learnings_supersedes_idx on public.creator_learnings(supersedes_learning_id);

-- Server-mediated posture: owner RLS is defense in depth, while direct browser
-- CRUD remains revoked. Edge/server code is the supported write surface.
do $security$
declare
  v_table text;
begin
  foreach v_table in array array[
    'creator_research_sources', 'creator_assets', 'creator_visual_masters',
    'creator_visual_segments', 'creator_visual_segment_projections', 'creator_asset_coverage',
    'creator_variant_language_tracks', 'creator_platform_presentations', 'creator_publish_packages',
    'creator_qa_reports', 'creator_publication_metric_snapshots', 'creator_performance_reports',
    'creator_learnings'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = owner_user_id)', v_table || '_owner_select', v_table);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = owner_user_id)', v_table || '_owner_insert', v_table);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id)', v_table || '_owner_update', v_table);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = owner_user_id)', v_table || '_owner_delete', v_table);
    execute format('revoke all on table public.%I from anon, authenticated', v_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', v_table);
  end loop;
end;
$security$;

do $touch$
declare
  v_table text;
begin
  foreach v_table in array array[
    'creator_research_sources', 'creator_assets', 'creator_visual_masters',
    'creator_visual_segments', 'creator_visual_segment_projections', 'creator_asset_coverage',
    'creator_variant_language_tracks', 'creator_platform_presentations', 'creator_publish_packages',
    'creator_performance_reports', 'creator_learnings'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.app_touch_updated_at()', 'trg_' || v_table || '_touch_updated_at', v_table);
  end loop;
end;
$touch$;

create or replace function public.app_creator_human_action_active()
returns boolean
language sql
stable
set search_path to ''
as $function$
  select coalesce(current_setting('app.creator_human_action', true), '') = 'confirmed';
$function$;

revoke all on function public.app_creator_human_action_active() from public, anon, authenticated;
grant execute on function public.app_creator_human_action_active() to service_role;

create or replace function public.app_creator_artifact_ready(
  p_project_id text,
  p_owner_user_id uuid,
  p_scope_type text,
  p_scope_id text,
  p_file_key text,
  p_require_real_audio boolean default false
)
returns boolean
language sql
stable
set search_path to ''
as $function$
  select exists (
    select 1
    from public.creator_project_files f
    where f.project_id = p_project_id
      and f.owner_user_id = p_owner_user_id
      and f.artifact_scope_type = p_scope_type
      and f.artifact_scope_id = p_scope_id
      and f.file_key = p_file_key
      and lower(f.status) in ('ready','present','available','locked')
      and (not p_require_real_audio or f.metadata->>'timing_provenance' = 'real_audio')
  );
$function$;

revoke all on function public.app_creator_artifact_ready(text, uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.app_creator_artifact_ready(text, uuid, text, text, text, boolean) to service_role;

-- Human-owned lock fields can only change inside the explicit confirmed-human
-- RPC below. Generic REST/AI writes fail closed.
create or replace function public.app_guard_creator_project_global_locks()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (
    new.project_scope_locked_at is distinct from old.project_scope_locked_at
    or new.project_scope_locked_by is distinct from old.project_scope_locked_by
    or new.evidence_locked_at is distinct from old.evidence_locked_at
    or new.evidence_locked_by is distinct from old.evidence_locked_by
    or new.master_script_locked_at is distinct from old.master_script_locked_at
    or new.master_script_locked_by is distinct from old.master_script_locked_by
  ) and not public.app_creator_human_action_active() then
    raise exception 'human-owned Project lock cannot be changed by generic or AI write';
  end if;
  return new;
end;
$function$;

create trigger trg_creator_projects_global_lock_guard
before update on public.creator_projects
for each row execute function public.app_guard_creator_project_global_locks();

create or replace function public.app_guard_creator_language_track_locks()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (
    new.script_locked_at is distinct from old.script_locked_at
    or new.script_locked_by is distinct from old.script_locked_by
    or new.voice_timeline_locked_at is distinct from old.voice_timeline_locked_at
    or new.voice_timeline_locked_by is distinct from old.voice_timeline_locked_by
  ) and not public.app_creator_human_action_active() then
    raise exception 'human-owned Language Track lock cannot be changed by generic or AI write';
  end if;
  if old.voice_timeline_locked_at is not null and not public.app_creator_human_action_active()
     and (new.timing_provenance, new.alignment_status, new.audio_revision, new.timeline_revision)
         is distinct from (old.timing_provenance, old.alignment_status, old.audio_revision, old.timeline_revision) then
    raise exception 'Voice / Timeline locked Language Track is immutable until explicit human unlock';
  end if;
  new.revision := case when to_jsonb(new) - array['updated_at','revision'] is distinct from to_jsonb(old) - array['updated_at','revision'] then old.revision + 1 else old.revision end;
  return new;
end;
$function$;

create trigger trg_creator_language_tracks_global_lock_guard
before update on public.creator_language_tracks
for each row execute function public.app_guard_creator_language_track_locks();

create or replace function public.app_guard_creator_visual_master_locks()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (
    new.visual_locked_at is distinct from old.visual_locked_at
    or new.visual_locked_by is distinct from old.visual_locked_by
    or new.edit_plan_locked_at is distinct from old.edit_plan_locked_at
    or new.edit_plan_locked_by is distinct from old.edit_plan_locked_by
    or new.master_render_locked_at is distinct from old.master_render_locked_at
    or new.master_render_locked_by is distinct from old.master_render_locked_by
  ) and not public.app_creator_human_action_active() then
    raise exception 'human-owned Visual Master lock cannot be changed by generic or AI write';
  end if;
  new.revision := case when to_jsonb(new) - array['updated_at','revision'] is distinct from to_jsonb(old) - array['updated_at','revision'] then old.revision + 1 else old.revision end;
  return new;
end;
$function$;

create trigger trg_creator_visual_masters_lock_guard
before update on public.creator_visual_masters
for each row execute function public.app_guard_creator_visual_master_locks();

create or replace function public.app_guard_creator_publish_package()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_content_changed boolean;
begin
  v_content_changed := (new.variant_id, new.presentation_id, new.channel_id, new.package_manifest, new.metadata)
    is distinct from (old.variant_id, old.presentation_id, old.channel_id, old.package_manifest, old.metadata);

  if old.release_locked_at is not null and to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
    raise exception 'Release-approved Publish Package snapshot is immutable; create a new package revision identity';
  end if;
  if old.platform_locked_at is not null and v_content_changed and not public.app_creator_human_action_active() then
    raise exception 'Platform Variant locked package cannot be changed by generic or AI write';
  end if;
  if (
    new.platform_locked_at is distinct from old.platform_locked_at
    or new.platform_locked_by is distinct from old.platform_locked_by
    or new.human_reviewed_at is distinct from old.human_reviewed_at
    or new.human_reviewed_by is distinct from old.human_reviewed_by
    or new.release_locked_at is distinct from old.release_locked_at
    or new.release_locked_by is distinct from old.release_locked_by
    or new.release_snapshot is distinct from old.release_snapshot
  ) and not public.app_creator_human_action_active() then
    raise exception 'human-owned Publish Package gate cannot be changed by generic or AI write';
  end if;
  if v_content_changed then
    new.package_revision := old.package_revision + 1;
    new.qa_status := 'STALE';
    new.qa_package_revision := null;
    new.qa_report_id := null;
    new.human_reviewed_at := null;
    new.human_reviewed_by := null;
  end if;
  return new;
end;
$function$;

create trigger trg_creator_publish_packages_gate_guard
before update on public.creator_publish_packages
for each row execute function public.app_guard_creator_publish_package();

create or replace function public.app_guard_creator_publication()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_package public.creator_publish_packages%rowtype;
begin
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

create trigger trg_creator_publications_distribution_gate
before insert or update on public.creator_publications
for each row execute function public.app_guard_creator_publication();

create or replace function public.app_guard_creator_learning_review()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status and not public.app_creator_human_action_active() then
    raise exception 'Learning acceptance/rejection is a human-only decision';
  end if;
  return new;
end;
$function$;

create trigger trg_creator_learnings_human_review_guard
before update on public.creator_learnings
for each row execute function public.app_guard_creator_learning_review();

-- Activate the reserved visual_master and variant Artifact scopes with strict
-- same-project/same-owner validation. Locked upstream artifacts are immutable
-- until the corresponding explicit human unlock.
create or replace function public.app_guard_creator_artifact_scope()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_changed boolean := true;
  v_track public.creator_language_tracks%rowtype;
  v_visual public.creator_visual_masters%rowtype;
  v_variant public.creator_variants%rowtype;
begin
  new.artifact_scope_type := coalesce(nullif(btrim(new.artifact_scope_type), ''), 'project');
  if tg_op = 'UPDATE' then
    v_changed := (new.relative_path, new.kind, new.status, new.storage_provider, new.provider_file_id, new.provider_url,
      new.filename, new.mime_type, new.size_bytes, new.checksum, new.metadata)
      is distinct from (old.relative_path, old.kind, old.status, old.storage_provider, old.provider_file_id, old.provider_url,
      old.filename, old.mime_type, old.size_bytes, old.checksum, old.metadata);
  end if;

  if new.artifact_scope_type = 'project' then
    new.artifact_scope_id := coalesce(nullif(btrim(new.artifact_scope_id), ''), new.project_id);
    if new.artifact_scope_id <> new.project_id then raise exception 'project artifact scope_id must equal project_id'; end if;
    if v_changed and not public.app_creator_human_action_active() and exists (
      select 1 from public.creator_projects p where p.project_id=new.project_id and p.owner_user_id=new.owner_user_id
        and ((new.file_key='PROJECT_BRIEF' and p.project_scope_locked_at is not null)
          or (new.file_key in ('KNOWLEDGE_BASE','EVIDENCE_INDEX','COMMUNITY_QUESTION_POOL','RESEARCH_CONCLUSIONS','SOURCE_FRESHNESS','FACT_SNAPSHOT') and p.evidence_locked_at is not null)
          or (new.file_key in ('MASTER_SCRIPT_ZH','CONTENT_OUTLINE','CHAPTER_PLAN','VISUAL_CUE_MAP') and p.master_script_locked_at is not null))
    ) then raise exception 'locked Project artifact cannot be changed without explicit human unlock'; end if;
  elsif new.artifact_scope_type = 'language_track' then
    if nullif(btrim(new.artifact_scope_id), '') is null then raise exception 'language_track artifact requires artifact_scope_id'; end if;
    select * into v_track from public.creator_language_tracks t
      where t.language_track_id::text=new.artifact_scope_id and t.project_id=new.project_id and t.owner_user_id=new.owner_user_id;
    if not found then raise exception 'language_track artifact scope ownership mismatch'; end if;
    if v_changed and not public.app_creator_human_action_active()
       and ((new.file_key='VOICE_SCRIPT' and v_track.script_locked_at is not null)
         or (new.file_key in ('AUDIO_MASTER','SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT') and v_track.voice_timeline_locked_at is not null)) then
      raise exception 'locked Language Track artifact cannot be changed without explicit human unlock';
    end if;
  elsif new.artifact_scope_type = 'visual_master' then
    if nullif(btrim(new.artifact_scope_id), '') is null then raise exception 'visual_master artifact requires artifact_scope_id'; end if;
    select * into v_visual from public.creator_visual_masters v
      where v.visual_master_id::text=new.artifact_scope_id and v.project_id=new.project_id and v.owner_user_id=new.owner_user_id;
    if not found then raise exception 'visual_master artifact scope ownership mismatch'; end if;
    if v_changed and not public.app_creator_human_action_active()
       and ((new.file_key='VISUAL_MASTER_TIMELINE' and v_visual.visual_locked_at is not null)
         or (new.file_key in ('EDIT_DECISION_LIST','SHOT_LIST','ANIMATION_INSTRUCTIONS','SUBTITLE_INSTRUCTIONS','BGM_INSTRUCTIONS','SFX_INSTRUCTIONS','ASSET_ASSIGNMENT','TIMING_PROJECTION') and v_visual.edit_plan_locked_at is not null)
         or (new.file_key in ('BUILD_MANIFEST','CODEX_BUILD_INSTRUCTIONS','BUILD_REPORT','QC_REPORT','MISSING_ASSET_REPORT','MASTER_VIDEO') and v_visual.master_render_locked_at is not null)) then
      raise exception 'locked Visual Master artifact cannot be changed without explicit human unlock';
    end if;
  elsif new.artifact_scope_type = 'variant' then
    if nullif(btrim(new.artifact_scope_id), '') is null then raise exception 'variant artifact requires artifact_scope_id'; end if;
    select * into v_variant from public.creator_variants v
      where v.variant_id::text=new.artifact_scope_id and v.project_id=new.project_id and v.owner_user_id=new.owner_user_id;
    if not found then raise exception 'variant artifact scope ownership mismatch'; end if;
    if v_changed and new.file_key in ('BUILD_MANIFEST','EXPORT_MANIFEST','PUBLISH_PACKAGE','RELEASE_PACK')
       and not public.app_creator_human_action_active() and exists (
         select 1 from public.creator_publish_packages p where p.variant_id=v_variant.variant_id
           and p.owner_user_id=new.owner_user_id and p.platform_locked_at is not null
       ) then raise exception 'Platform Variant locked artifact cannot be changed without explicit human unlock'; end if;
  else
    raise exception 'unsupported artifact scope type: %', new.artifact_scope_type;
  end if;
  return new;
end;
$function$;

create or replace function public.app_guard_creator_visual_timeline_rows()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_visual_master_id uuid;
  v_lock timestamptz;
begin
  v_visual_master_id := case when tg_op='DELETE' then old.visual_master_id else new.visual_master_id end;
  select visual_locked_at into v_lock from public.creator_visual_masters where visual_master_id=v_visual_master_id;
  if v_lock is not null and not public.app_creator_human_action_active() then
    raise exception 'Visual Master Timeline is human-locked';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_visual_segments_lock_guard
before insert or update or delete on public.creator_visual_segments
for each row execute function public.app_guard_creator_visual_timeline_rows();

create or replace function public.app_guard_creator_visual_projection_rows()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_segment_id uuid;
  v_edit_lock timestamptz;
begin
  v_segment_id := case when tg_op='DELETE' then old.visual_segment_id else new.visual_segment_id end;
  select vm.edit_plan_locked_at into v_edit_lock
  from public.creator_visual_segments s join public.creator_visual_masters vm on vm.visual_master_id=s.visual_master_id
  where s.visual_segment_id=v_segment_id;
  if v_edit_lock is not null and not public.app_creator_human_action_active() then
    raise exception 'Edit Plan locked Visual Projection is immutable';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_visual_projections_lock_guard
before insert or update or delete on public.creator_visual_segment_projections
for each row execute function public.app_guard_creator_visual_projection_rows();

create or replace function public.app_invalidate_creator_visual_timeline()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_visual_master_id uuid;
begin
  if tg_table_name='creator_visual_segments' then
    v_visual_master_id := case when tg_op='DELETE' then old.visual_master_id else new.visual_master_id end;
  else
    select s.visual_master_id into v_visual_master_id
    from public.creator_visual_segments s
    where s.visual_segment_id=case when tg_op='DELETE' then old.visual_segment_id else new.visual_segment_id end;
  end if;
  if v_visual_master_id is not null then
    update public.creator_visual_masters set stale_at=now(), stale_reason=case when tg_table_name='creator_visual_segments' then 'SEMANTIC_TIMELINE_CHANGED' else 'LANGUAGE_PROJECTION_CHANGED' end
    where visual_master_id=v_visual_master_id;
    update public.creator_variants set revision=revision+1, stale_at=now(), stale_reason='VISUAL_TIMELINE_CHANGED'
    where visual_master_id=v_visual_master_id;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_visual_segments_invalidation
after insert or update or delete on public.creator_visual_segments
for each row execute function public.app_invalidate_creator_visual_timeline();
create trigger trg_creator_visual_projections_invalidation
after insert or update or delete on public.creator_visual_segment_projections
for each row execute function public.app_invalidate_creator_visual_timeline();

create or replace function public.app_guard_creator_variant_dependencies()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_variant_id uuid;
begin
  v_variant_id := case when tg_op='DELETE' then old.variant_id else new.variant_id end;
  if exists (
    select 1 from public.creator_publish_packages p
    where p.variant_id=v_variant_id and p.platform_locked_at is not null
  ) and not public.app_creator_human_action_active() then
    raise exception 'Platform Variant locked composition/presentation is immutable';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_variants_package_lock_guard
before update or delete on public.creator_variants
for each row execute function public.app_guard_creator_variant_dependencies();
create trigger trg_creator_variant_tracks_package_lock_guard
before insert or update or delete on public.creator_variant_language_tracks
for each row execute function public.app_guard_creator_variant_dependencies();

create or replace function public.app_guard_creator_presentation_dependencies()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_presentation_id uuid;
begin
  v_presentation_id := case when tg_op='DELETE' then old.presentation_id else new.presentation_id end;
  if exists (
    select 1 from public.creator_publish_packages p
    where p.presentation_id=v_presentation_id and p.platform_locked_at is not null
  ) and not public.app_creator_human_action_active() then
    raise exception 'Platform Variant locked presentation is immutable';
  end if;
  if tg_op='UPDATE' then new.revision := old.revision + 1; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_presentations_package_lock_guard
before update or delete on public.creator_platform_presentations
for each row execute function public.app_guard_creator_presentation_dependencies();

create or replace function public.app_invalidate_creator_global_dependents()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_scope_type text := case when tg_op='DELETE' then old.artifact_scope_type else new.artifact_scope_type end;
  v_scope_id text := case when tg_op='DELETE' then old.artifact_scope_id else new.artifact_scope_id end;
  v_file_key text := case when tg_op='DELETE' then old.file_key else new.file_key end;
  v_project_id text := case when tg_op='DELETE' then old.project_id else new.project_id end;
  v_owner_user_id uuid := case when tg_op='DELETE' then old.owner_user_id else new.owner_user_id end;
  v_metadata jsonb := case when tg_op='DELETE' then '{}'::jsonb else new.metadata end;
begin
  if v_scope_type='project' and v_file_key=any(array['PROJECT_BRIEF','KNOWLEDGE_BASE','EVIDENCE_INDEX','COMMUNITY_QUESTION_POOL','RESEARCH_CONCLUSIONS','SOURCE_FRESHNESS','FACT_SNAPSHOT','CONTENT_OUTLINE','CHAPTER_PLAN','MASTER_SCRIPT_ZH','VISUAL_CUE_MAP']) then
    update public.creator_projects set global_revision=global_revision+1, global_stale_at=now(), global_stale_reason=v_file_key||'_CHANGED'
    where project_id=v_project_id and owner_user_id=v_owner_user_id;
  elsif v_scope_type='language_track' then
    if v_file_key='VOICE_SCRIPT' then
      update public.creator_language_tracks set script_revision=script_revision+1, status='SCRIPTING', stale_at=now(), stale_reason='VOICE_SCRIPT_CHANGED'
      where language_track_id::text=v_scope_id and owner_user_id=v_owner_user_id;
    elsif v_file_key='AUDIO_MASTER' then
      update public.creator_language_tracks set audio_revision=audio_revision+1, timeline_revision=0, timing_provenance=nullif(v_metadata->>'timing_provenance',''),
        alignment_status='PENDING', status='AUDIO_PRODUCTION', stale_at=now(), stale_reason='AUDIO_MASTER_CHANGED'
      where language_track_id::text=v_scope_id and owner_user_id=v_owner_user_id;
    elsif v_file_key=any(array['SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT']) then
      update public.creator_language_tracks set timeline_revision=timeline_revision+1, status='TIMELINE_GENERATION', stale_at=now(), stale_reason='TIMELINE_BUNDLE_CHANGED'
      where language_track_id::text=v_scope_id and owner_user_id=v_owner_user_id;
    end if;
  elsif v_scope_type='visual_master' then
    update public.creator_visual_masters set stale_at=now(), stale_reason=v_file_key||'_CHANGED'
    where visual_master_id::text=v_scope_id and owner_user_id=v_owner_user_id;
  elsif v_scope_type='variant' then
    update public.creator_variants set revision=revision+1, stale_at=now(), stale_reason=v_file_key||'_CHANGED'
    where variant_id::text=v_scope_id and owner_user_id=v_owner_user_id;
    update public.creator_publish_packages set validation_status='DRAFT', validation_errors=jsonb_build_array('Variant artifact changed'), qa_status='STALE', qa_package_revision=null, qa_report_id=null,
      human_reviewed_at=null, human_reviewed_by=null
    where variant_id::text=v_scope_id and owner_user_id=v_owner_user_id and platform_locked_at is null and release_locked_at is null;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_project_files_global_invalidation
after insert or update or delete on public.creator_project_files
for each row execute function public.app_invalidate_creator_global_dependents();

create or replace function public.app_invalidate_creator_package_dependencies()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_variant_id uuid;
  v_presentation_id uuid;
begin
  if tg_table_name='creator_platform_presentations' then
    v_presentation_id := case when tg_op='DELETE' then old.presentation_id else new.presentation_id end;
    update public.creator_publish_packages set validation_status='DRAFT', validation_errors=jsonb_build_array('Platform Presentation changed'), qa_status='STALE', qa_package_revision=null, qa_report_id=null,
      human_reviewed_at=null, human_reviewed_by=null
    where presentation_id=v_presentation_id and platform_locked_at is null and release_locked_at is null;
  else
    v_variant_id := case when tg_op='DELETE' then old.variant_id else new.variant_id end;
    update public.creator_publish_packages set validation_status='DRAFT', validation_errors=jsonb_build_array('Variant composition changed'), qa_status='STALE', qa_package_revision=null, qa_report_id=null,
      human_reviewed_at=null, human_reviewed_by=null
    where variant_id=v_variant_id and platform_locked_at is null and release_locked_at is null;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create trigger trg_creator_variants_invalidate_packages
after update or delete on public.creator_variants
for each row execute function public.app_invalidate_creator_package_dependencies();
create trigger trg_creator_variant_tracks_invalidate_packages
after insert or update or delete on public.creator_variant_language_tracks
for each row execute function public.app_invalidate_creator_package_dependencies();
create trigger trg_creator_presentations_invalidate_packages
after update or delete on public.creator_platform_presentations
for each row execute function public.app_invalidate_creator_package_dependencies();

-- Legacy project_data.files owns only the original 24 Project-scope keys.
-- New Project-scope Global artifacts and every child-scope artifact survive a
-- Legacy save even when absent from the old JSON projection.
create or replace function public.app_prune_creator_project_files()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_files jsonb := coalesce(new.project_data->'files', '{}'::jsonb);
  v_legacy_keys text[] := array[
    'PROJECT_DATA','PROJECT_MANIFEST','STATUS','RESEARCH','CONTENT_LOCK','VOICE_MASTER','TTS_MANIFEST',
    'LYRICS','SUNO_PROMPT','AUDIO_MASTER','MUSIC_MASTER','INSTRUMENTAL','SUBTITLE_MASTER','TIMELINE_SENTENCE',
    'TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT','PRE_ASSET_GUIDE','ASSET_INDEX','EDIT_BLUEPRINT','VISUAL_STYLE',
    'EXPORT_SPEC','VIDEO_V0_REVIEW','BUILD_REPORT','QC_REPORT','MISSING_ASSET_REPORT','REVIEW_NOTES','VIDEO_V1','RELEASE_PACK'
  ];
begin
  if jsonb_typeof(v_files) <> 'object' then v_files := '{}'::jsonb; end if;
  delete from public.creator_project_files f
  where f.project_id=new.project_id and f.owner_user_id=new.owner_user_id
    and f.artifact_scope_type='project' and f.artifact_scope_id=new.project_id
    and f.file_key=any(v_legacy_keys) and not (v_files ? f.file_key);
  return new;
end;
$function$;

create or replace function public.app_creator_human_lock(
  p_owner_user_id uuid,
  p_scope_type text,
  p_scope_id text,
  p_lock_type text,
  p_locked boolean,
  p_expected_revision bigint,
  p_confirmed_by_human boolean,
  p_reason text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_now timestamptz := now();
  v_project public.creator_projects%rowtype;
  v_track public.creator_language_tracks%rowtype;
  v_visual public.creator_visual_masters%rowtype;
  v_package public.creator_publish_packages%rowtype;
  v_publication public.creator_publications%rowtype;
  v_result jsonb;
  v_missing text[] := '{}'::text[];
  v_key text;
begin
  if p_owner_user_id is null or not coalesce(p_confirmed_by_human,false) then
    raise exception 'Explicit human confirmation is required';
  end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'Human lock/unlock reason is required'; end if;
  perform set_config('app.creator_human_action', 'confirmed', true);

  if p_scope_type='project' then
    select * into v_project from public.creator_projects where project_id=p_scope_id and owner_user_id=p_owner_user_id for update;
    if not found then raise exception 'Creator Project not found'; end if;
    if p_expected_revision is distinct from v_project.global_revision then raise exception 'Global Project revision conflict'; end if;
    if p_locked and p_lock_type='project_scope' and not public.app_creator_artifact_ready(v_project.project_id,p_owner_user_id,'project',v_project.project_id,'PROJECT_BRIEF',false) then
      raise exception 'Project Scope Lock requires PROJECT_BRIEF';
    elsif p_locked and p_lock_type='evidence_snapshot' then
      foreach v_key in array array['KNOWLEDGE_BASE','EVIDENCE_INDEX','FACT_SNAPSHOT'] loop
        if not public.app_creator_artifact_ready(v_project.project_id,p_owner_user_id,'project',v_project.project_id,v_key,false) then v_missing:=array_append(v_missing,v_key); end if;
      end loop;
      if cardinality(v_missing)>0 then raise exception 'Evidence Snapshot Lock missing artifacts: %', array_to_string(v_missing,', '); end if;
    elsif p_locked and p_lock_type='master_script' and not public.app_creator_artifact_ready(v_project.project_id,p_owner_user_id,'project',v_project.project_id,'MASTER_SCRIPT_ZH',false) then
      raise exception 'Master Script Lock requires MASTER_SCRIPT_ZH';
    end if;

    if p_lock_type='project_scope' then
      update public.creator_projects set project_scope_locked_at=case when p_locked then v_now else null end, project_scope_locked_by=case when p_locked then p_owner_user_id else null end, global_revision=global_revision+1 where project_id=v_project.project_id returning to_jsonb(creator_projects.*) into v_result;
    elsif p_lock_type='evidence_snapshot' then
      update public.creator_projects set evidence_locked_at=case when p_locked then v_now else null end, evidence_locked_by=case when p_locked then p_owner_user_id else null end,
        global_stale_at=case when p_locked then global_stale_at else v_now end, global_stale_reason=case when p_locked then global_stale_reason else 'EVIDENCE_UNLOCKED' end,
        global_revision=global_revision+1 where project_id=v_project.project_id returning to_jsonb(creator_projects.*) into v_result;
    elsif p_lock_type='master_script' then
      update public.creator_projects set master_script_locked_at=case when p_locked then v_now else null end, master_script_locked_by=case when p_locked then p_owner_user_id else null end,
        global_revision=global_revision+1 where project_id=v_project.project_id returning to_jsonb(creator_projects.*) into v_result;
      if not p_locked then
        update public.creator_language_tracks set status='SCRIPTING', script_locked_at=null, script_locked_by=null, voice_timeline_locked_at=null, voice_timeline_locked_by=null,
          stale_at=v_now, stale_reason='MASTER_SCRIPT_REVISED' where project_id=v_project.project_id and owner_user_id=p_owner_user_id;
      end if;
    else raise exception 'Unsupported Project lock type'; end if;

  elsif p_scope_type='language_track' then
    select * into v_track from public.creator_language_tracks where language_track_id::text=p_scope_id and owner_user_id=p_owner_user_id for update;
    if not found then raise exception 'Language Track not found'; end if;
    if p_expected_revision is distinct from v_track.revision then raise exception 'Language Track revision conflict'; end if;
    if p_lock_type='language_script' then
      if p_locked and not public.app_creator_artifact_ready(v_track.project_id,p_owner_user_id,'language_track',v_track.language_track_id::text,'VOICE_SCRIPT',false) then raise exception 'Language Script Lock requires VOICE_SCRIPT'; end if;
      update public.creator_language_tracks set script_locked_at=case when p_locked then v_now else null end, script_locked_by=case when p_locked then p_owner_user_id else null end,
        voice_timeline_locked_at=case when p_locked then voice_timeline_locked_at else null end, voice_timeline_locked_by=case when p_locked then voice_timeline_locked_by else null end,
        status=case when p_locked then 'SCRIPT_LOCKED' else 'SCRIPTING' end, stale_at=case when p_locked then null else v_now end,
        stale_reason=case when p_locked then null else 'LANGUAGE_SCRIPT_UNLOCKED' end where language_track_id=v_track.language_track_id returning to_jsonb(creator_language_tracks.*) into v_result;
    elsif p_lock_type='voice_timeline' then
      if p_locked then
        if v_track.script_locked_at is null then raise exception 'Voice / Timeline Lock requires Language Script Lock'; end if;
        foreach v_key in array array['AUDIO_MASTER','SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT'] loop
          if not public.app_creator_artifact_ready(v_track.project_id,p_owner_user_id,'language_track',v_track.language_track_id::text,v_key,v_key='AUDIO_MASTER') then v_missing:=array_append(v_missing,v_key); end if;
        end loop;
        if cardinality(v_missing)>0 then raise exception 'Voice / Timeline Lock missing or invalid real-audio artifacts: %', array_to_string(v_missing,', '); end if;
        if v_track.alignment_status<>'VALID' or v_track.timing_provenance<>'real_audio' then raise exception 'Voice / Timeline Lock requires VALID real-audio alignment'; end if;
      end if;
      update public.creator_language_tracks set voice_timeline_locked_at=case when p_locked then v_now else null end, voice_timeline_locked_by=case when p_locked then p_owner_user_id else null end,
        status=case when p_locked then 'READY' else 'TIMELINE_GENERATION' end, stale_at=case when p_locked then null else v_now end,
        stale_reason=case when p_locked then null else 'VOICE_TIMELINE_UNLOCKED' end where language_track_id=v_track.language_track_id returning to_jsonb(creator_language_tracks.*) into v_result;
    else raise exception 'Unsupported Language Track lock type'; end if;

  elsif p_scope_type='visual_master' then
    select * into v_visual from public.creator_visual_masters where visual_master_id::text=p_scope_id and owner_user_id=p_owner_user_id for update;
    if not found then raise exception 'Visual Master not found'; end if;
    if p_expected_revision is distinct from v_visual.revision then raise exception 'Visual Master revision conflict'; end if;
    if p_lock_type='visual_master' then
      if p_locked and (not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'VISUAL_MASTER_TIMELINE',false)
        or not exists(select 1 from public.creator_visual_segments s where s.visual_master_id=v_visual.visual_master_id)) then raise exception 'Visual Master Lock requires semantic Visual Timeline'; end if;
      update public.creator_visual_masters set visual_locked_at=case when p_locked then v_now else null end, visual_locked_by=case when p_locked then p_owner_user_id else null end,
        edit_plan_locked_at=case when p_locked then edit_plan_locked_at else null end, edit_plan_locked_by=case when p_locked then edit_plan_locked_by else null end,
        master_render_locked_at=case when p_locked then master_render_locked_at else null end, master_render_locked_by=case when p_locked then master_render_locked_by else null end,
        status=case when p_locked then 'LOCKED' else 'STORYBOARDING' end, stale_at=case when p_locked then null else v_now end, stale_reason=case when p_locked then null else 'VISUAL_MASTER_UNLOCKED' end
        where visual_master_id=v_visual.visual_master_id returning to_jsonb(creator_visual_masters.*) into v_result;
    elsif p_lock_type='edit_plan' then
      if p_locked and (v_visual.visual_locked_at is null
        or not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'EDIT_DECISION_LIST',false)
        or not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'SHOT_LIST',false)) then raise exception 'Edit Plan Lock requires Visual Master Lock, EDIT_DECISION_LIST and SHOT_LIST'; end if;
      update public.creator_visual_masters set edit_plan_locked_at=case when p_locked then v_now else null end, edit_plan_locked_by=case when p_locked then p_owner_user_id else null end,
        master_render_locked_at=case when p_locked then master_render_locked_at else null end, master_render_locked_by=case when p_locked then master_render_locked_by else null end
        where visual_master_id=v_visual.visual_master_id returning to_jsonb(creator_visual_masters.*) into v_result;
    elsif p_lock_type='master_render' then
      if p_locked and (v_visual.edit_plan_locked_at is null
        or not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'MASTER_VIDEO',false)
        or not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'BUILD_REPORT',false)
        or not public.app_creator_artifact_ready(v_visual.project_id,p_owner_user_id,'visual_master',v_visual.visual_master_id::text,'QC_REPORT',false)) then raise exception 'Master Render Lock requires Edit Plan Lock, MASTER_VIDEO, BUILD_REPORT and QC_REPORT'; end if;
      update public.creator_visual_masters set master_render_locked_at=case when p_locked then v_now else null end, master_render_locked_by=case when p_locked then p_owner_user_id else null end
        where visual_master_id=v_visual.visual_master_id returning to_jsonb(creator_visual_masters.*) into v_result;
    else raise exception 'Unsupported Visual Master lock type'; end if;
    if not p_locked then
      update public.creator_variants set status='ASSEMBLING', stale_at=v_now, stale_reason='VISUAL_MASTER_REVISED', revision=revision+1 where visual_master_id=v_visual.visual_master_id;
      update public.creator_publish_packages set platform_locked_at=null, platform_locked_by=null, qa_status='STALE', qa_package_revision=null, qa_report_id=null,
        human_reviewed_at=null, human_reviewed_by=null where variant_id in (select variant_id from public.creator_variants where visual_master_id=v_visual.visual_master_id) and release_locked_at is null;
    end if;

  elsif p_scope_type='publish_package' then
    select * into v_package from public.creator_publish_packages where publish_package_id::text=p_scope_id and owner_user_id=p_owner_user_id for update;
    if not found then raise exception 'Publish Package not found'; end if;
    if p_expected_revision is distinct from v_package.package_revision then raise exception 'Publish Package revision conflict'; end if;
    if v_package.release_locked_at is not null and not p_locked then raise exception 'Release Lock is immutable; create a new Publish Package identity'; end if;
    if p_lock_type='platform_variant' then
      if p_locked and (v_package.validation_status<>'VALID' or v_package.package_manifest='{}'::jsonb) then raise exception 'Platform Variant Lock requires a validated Publish Package'; end if;
      update public.creator_publish_packages set platform_locked_at=case when p_locked then v_now else null end, platform_locked_by=case when p_locked then p_owner_user_id else null end,
        qa_status=case when p_locked then 'PENDING' else 'STALE' end, qa_package_revision=null, qa_report_id=null, human_reviewed_at=null, human_reviewed_by=null
        where publish_package_id=v_package.publish_package_id returning to_jsonb(creator_publish_packages.*) into v_result;
    elsif p_lock_type='human_final_review' then
      if not p_locked then raise exception 'Human Final Review is recorded as completion, not an unlock'; end if;
      if v_package.platform_locked_at is null or v_package.qa_status<>'PASS' or v_package.qa_package_revision<>v_package.package_revision then raise exception 'Human Final Review requires current QA PASS after Platform Variant Lock'; end if;
      update public.creator_publish_packages set human_reviewed_at=v_now, human_reviewed_by=p_owner_user_id where publish_package_id=v_package.publish_package_id returning to_jsonb(creator_publish_packages.*) into v_result;
    elsif p_lock_type='release' then
      if not p_locked then raise exception 'Release Lock is immutable; create a new Publish Package identity'; end if;
      if v_package.platform_locked_at is null or v_package.qa_status<>'PASS' or v_package.qa_package_revision<>v_package.package_revision or v_package.human_reviewed_at is null then raise exception 'Release Lock requires Platform Variant Lock, current QA PASS and Human Final Review'; end if;
      update public.creator_publish_packages set release_locked_at=v_now, release_locked_by=p_owner_user_id,
        release_snapshot=jsonb_build_object('publishPackageId',publish_package_id,'projectId',project_id,'variantId',variant_id,'presentationId',presentation_id,'channelId',channel_id,'packageRevision',package_revision,'packageManifest',package_manifest,'qaReportId',qa_report_id,'approvedAt',v_now)
        where publish_package_id=v_package.publish_package_id returning to_jsonb(creator_publish_packages.*) into v_result;
    else raise exception 'Unsupported Publish Package lock type'; end if;

  elsif p_scope_type='publication' then
    select * into v_publication from public.creator_publications where publication_id::text=p_scope_id and owner_user_id=p_owner_user_id for update;
    if not found then raise exception 'Publication not found'; end if;
    if p_expected_revision is distinct from v_publication.revision then raise exception 'Publication revision conflict'; end if;
    if p_lock_type<>'final_publish_confirmation' then raise exception 'Unsupported Publication lock type'; end if;
    if not p_locked and v_publication.status in ('SCHEDULED','PUBLISHING','PUBLISHED') then raise exception 'Final Publish Confirmation cannot be withdrawn after Distribution starts'; end if;
    update public.creator_publications set final_publish_confirmed_at=case when p_locked then v_now else null end, final_publish_confirmed_by=case when p_locked then p_owner_user_id else null end
      where publication_id=v_publication.publication_id returning to_jsonb(creator_publications.*) into v_result;
  else raise exception 'Unsupported human lock scope'; end if;

  insert into public.creator_project_events(project_id, owner_user_id, event_type, state, detail)
  values (coalesce(v_project.project_id,v_track.project_id,v_visual.project_id,v_package.project_id,v_publication.project_id), p_owner_user_id,
    'GLOBAL_HUMAN_GATE_CHANGED', upper(p_scope_type), jsonb_build_object('scopeType',p_scope_type,'scopeId',p_scope_id,'lockType',p_lock_type,'locked',p_locked,'reason',p_reason));
  return jsonb_build_object('status','saved','entity',v_result);
end;
$function$;

revoke all on function public.app_creator_human_lock(uuid,text,text,text,boolean,bigint,boolean,text) from public, anon, authenticated;
grant execute on function public.app_creator_human_lock(uuid,text,text,text,boolean,bigint,boolean,text) to service_role;

create or replace function public.app_apply_creator_qa_report()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_package public.creator_publish_packages%rowtype;
begin
  select * into v_package from public.creator_publish_packages where publish_package_id=new.publish_package_id for update;
  if not found or v_package.project_id<>new.project_id or v_package.owner_user_id<>new.owner_user_id then raise exception 'QA package ownership mismatch'; end if;
  if v_package.release_locked_at is not null then raise exception 'Released package cannot receive a replacement QA report'; end if;
  if v_package.platform_locked_at is null then raise exception 'AI QA requires Platform Variant Lock'; end if;
  if new.package_revision<>v_package.package_revision then raise exception 'QA report revision is stale'; end if;
  update public.creator_publish_packages set qa_status=new.status, qa_package_revision=new.package_revision, qa_report_id=new.qa_report_id,
    human_reviewed_at=case when new.status='PASS' then human_reviewed_at else null end,
    human_reviewed_by=case when new.status='PASS' then human_reviewed_by else null end
    where publish_package_id=new.publish_package_id;
  return new;
end;
$function$;

create trigger trg_creator_qa_reports_apply
after insert on public.creator_qa_reports
for each row execute function public.app_apply_creator_qa_report();

create or replace function public.app_creator_review_learning(
  p_owner_user_id uuid,
  p_learning_id uuid,
  p_decision text,
  p_review_note text,
  p_confirmed_by_human boolean
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_learning public.creator_learnings%rowtype;
begin
  if not coalesce(p_confirmed_by_human,false) then raise exception 'Explicit human confirmation is required'; end if;
  if upper(p_decision) not in ('ACCEPTED','REJECTED') then raise exception 'Learning decision must be ACCEPTED or REJECTED'; end if;
  select * into v_learning from public.creator_learnings where learning_id=p_learning_id and owner_user_id=p_owner_user_id for update;
  if not found then raise exception 'Learning Proposal not found'; end if;
  if v_learning.status<>'PROPOSED' then raise exception 'Only a PROPOSED Learning can be reviewed'; end if;
  perform set_config('app.creator_human_action','confirmed',true);
  if upper(p_decision)='ACCEPTED' and v_learning.supersedes_learning_id is not null then
    update public.creator_learnings set status='SUPERSEDED', reviewed_at=now(), reviewed_by=p_owner_user_id, review_note='Superseded by accepted learning '||p_learning_id::text where learning_id=v_learning.supersedes_learning_id and owner_user_id=p_owner_user_id;
  end if;
  update public.creator_learnings set status=upper(p_decision), reviewed_at=now(), reviewed_by=p_owner_user_id, review_note=nullif(btrim(p_review_note),'') where learning_id=p_learning_id returning * into v_learning;
  return jsonb_build_object('status','saved','learning',to_jsonb(v_learning));
end;
$function$;

revoke all on function public.app_creator_review_learning(uuid,uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.app_creator_review_learning(uuid,uuid,text,text,boolean) to service_role;

notify pgrst, 'reload schema';
