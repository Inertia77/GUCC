-- Creator OS Global Production v1 foreign-key index hardening.
-- Canonical Production migration identity:
-- 20260901040409_creator_global_production_v1_fk_indexes.sql
-- These indexes cover the exact leading-column order of every foreign key
-- introduced by the Global Production schema so joins, restrict checks and
-- cascading deletes do not degrade into sequential scans at scale.

create index if not exists creator_projects_project_scope_locked_by_idx
  on public.creator_projects(project_scope_locked_by);
create index if not exists creator_projects_evidence_locked_by_idx
  on public.creator_projects(evidence_locked_by);
create index if not exists creator_projects_master_script_locked_by_idx
  on public.creator_projects(master_script_locked_by);

create index if not exists creator_language_tracks_script_locked_by_idx
  on public.creator_language_tracks(script_locked_by);
create index if not exists creator_language_tracks_voice_timeline_locked_by_idx
  on public.creator_language_tracks(voice_timeline_locked_by);

create index if not exists creator_visual_masters_visual_locked_by_idx
  on public.creator_visual_masters(visual_locked_by);
create index if not exists creator_visual_masters_edit_plan_locked_by_idx
  on public.creator_visual_masters(edit_plan_locked_by);
create index if not exists creator_visual_masters_master_render_locked_by_idx
  on public.creator_visual_masters(master_render_locked_by);

create index if not exists creator_visual_segments_master_owner_idx
  on public.creator_visual_segments(visual_master_id, project_id, owner_user_id);
create index if not exists creator_visual_projection_segment_owner_idx
  on public.creator_visual_segment_projections(visual_segment_id, project_id, owner_user_id);
create index if not exists creator_visual_projection_track_owner_idx
  on public.creator_visual_segment_projections(language_track_id, project_id, owner_user_id);

create index if not exists creator_asset_coverage_project_owner_idx
  on public.creator_asset_coverage(project_id, owner_user_id);
create index if not exists creator_asset_coverage_segment_owner_idx
  on public.creator_asset_coverage(visual_segment_id, project_id, owner_user_id);
create index if not exists creator_asset_coverage_asset_owner_idx
  on public.creator_asset_coverage(asset_id, project_id, owner_user_id);

create index if not exists creator_variants_visual_master_owner_idx
  on public.creator_variants(visual_master_id, project_id, owner_user_id);
create index if not exists creator_variant_tracks_variant_owner_idx
  on public.creator_variant_language_tracks(variant_id, project_id, owner_user_id);
create index if not exists creator_variant_tracks_language_owner_idx
  on public.creator_variant_language_tracks(language_track_id, project_id, owner_user_id);

create index if not exists creator_presentations_variant_owner_idx
  on public.creator_platform_presentations(variant_id, project_id, owner_user_id);
create index if not exists creator_presentations_thumbnail_owner_idx
  on public.creator_platform_presentations(thumbnail_artifact_id, project_id, owner_user_id);

create index if not exists creator_publish_packages_variant_owner_idx
  on public.creator_publish_packages(variant_id, project_id, owner_user_id);
create index if not exists creator_publish_packages_presentation_owner_idx
  on public.creator_publish_packages(presentation_id, project_id, owner_user_id);
create index if not exists creator_publish_packages_channel_owner_idx
  on public.creator_publish_packages(channel_id, owner_user_id);
create index if not exists creator_publish_packages_latest_qa_owner_idx
  on public.creator_publish_packages(qa_report_id, project_id, owner_user_id);
create index if not exists creator_publish_packages_platform_locked_by_idx
  on public.creator_publish_packages(platform_locked_by);
create index if not exists creator_publish_packages_human_reviewed_by_idx
  on public.creator_publish_packages(human_reviewed_by);
create index if not exists creator_publish_packages_release_locked_by_idx
  on public.creator_publish_packages(release_locked_by);

create index if not exists creator_qa_reports_package_owner_idx
  on public.creator_qa_reports(publish_package_id, project_id, owner_user_id);
create index if not exists creator_qa_reports_artifact_owner_idx
  on public.creator_qa_reports(report_artifact_id, project_id, owner_user_id);

create index if not exists creator_publications_package_owner_idx
  on public.creator_publications(publish_package_id, project_id, owner_user_id);
create index if not exists creator_publications_final_publish_confirmed_by_idx
  on public.creator_publications(final_publish_confirmed_by);
create index if not exists creator_metric_snapshots_publication_owner_idx
  on public.creator_publication_metric_snapshots(publication_id, project_id, owner_user_id);

create index if not exists creator_performance_reports_variant_owner_idx
  on public.creator_performance_reports(variant_id, project_id, owner_user_id);
create index if not exists creator_performance_reports_publication_owner_idx
  on public.creator_performance_reports(publication_id, project_id, owner_user_id);
create index if not exists creator_performance_reports_artifact_owner_idx
  on public.creator_performance_reports(report_artifact_id, project_id, owner_user_id);

create index if not exists creator_learnings_report_owner_idx
  on public.creator_learnings(performance_report_id, project_id, owner_user_id);
create index if not exists creator_learnings_reviewed_by_idx
  on public.creator_learnings(reviewed_by);
