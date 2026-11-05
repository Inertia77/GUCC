# GUCC 生产数据库 Schema · 2026-11-05

> **生产只读快照**。Supabase 项目 `rubjeqnuxuvupjwyksmo`。当前 public Schema 包含 **46 张基础表和 4 个视图**（基础表中含 1 张 2026-10-13 的历史备份表）。该清单从生产 `information_schema.columns` 获取；不是迁移脚本。

## 结构关系与字段语义

- **游戏与版本：** `games` 是基础字典，`characters` 通过 `game_id` 关联游戏，`character_names` 储存别名；`game_versions`、`version_banners` 和 `version_acquisitions` 分开表达版本、卡池和其他获取方式。
- **状态的三个维度：** `game_status.content_tier` 是内容创作等级；`game_play_policies.play_tier` 是 T1/T2/T3 游玩分级，`story_focus` 独立表示剧情关注；`character_progress` 则只保存角色研究、养成和备注。喜好度 `like_level` 在 `character_evaluations`。
- **角色四档：** 推荐使用 `◯ / △ / ✕ / 対象外`；旧数据库约束即使允许历史值，也不代表新记录应继续使用。
- **创作链：** `creator_projects` → `creator_video_workspaces` → `creator_deliverable_records`。视频成果人工确认；云端 `creator_os_workspace_snapshots` 与 `creator_os_publish_drafts` 分别是工作区快照与发布草稿。
- **全球化与发布：** `creator_language_tracks` + `creator_visual_masters` → `creator_variants` → `creator_channels`、`creator_platform_presentations` → `creator_publish_packages`、`creator_publications` → `creator_publication_metric_snapshots`、`creator_performance_reports`、`creator_learnings`。
- **资源存储：** 大型媒体仍保存在本地；`creator_project_files` / `creator_file_locations` 登记逻辑文件和文件位置，并不表示已上传媒体本体。
- **权限：** GUCC 前端由 Auth 和 Edge Functions 管理读写，SQL Editor 权限更高；请不要直接全表更新、删除、重建。

## 字段目录

字段格式为 `列名:PostgreSQL 数据类型`。为便于检索，下面列出 **全部 public 表及字段**；PK、FK、唯一索引、Check、默认值、RLS 应另从生产 catalog 或 `supabase/migrations/` 查验。


### 游戏与角色（16）

**public.games**（6 字段）

- `id:uuid`
- `short_code:text`
- `code:text`
- `title:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.game_status**（9 字段）

- `game_id:uuid`
- `content_tier:text`
- `output_enabled:boolean`
- `research_depth:text`
- `login_frequency:text`
- `spending_level:text`
- `info_attention:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.game_play_policies**（11 字段）

- `game_key:text`
- `game_id:uuid`
- `game_name:text`
- `play_tier:smallint`
- `story_focus:boolean`
- `game_kind:text`
- `routine_policy:text`
- `limited_event_policy:text`
- `sort_order:integer`
- `effective_on:date`
- `updated_at:timestamptz`

**public.characters**（12 字段）

- `id:uuid`
- `game_id:uuid`
- `name:text`
- `element:text`
- `profession:text`
- `sex:text`
- `rarity:text`
- `note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `full_name:text`
- `release_date:date`

**public.character_names**（6 字段）

- `id:uuid`
- `character_id:uuid`
- `lang:text`
- `name:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.character_progress**（6 字段）

- `character_id:uuid`
- `research_status:text`
- `build_status:text`
- `progress_note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.character_evaluations**（9 字段）

- `id:uuid`
- `character_id:uuid`
- `context:text`
- `role_type:text`
- `power_rank:text`
- `note:text`
- `created_at:timestamptz`
- `like_level:text`
- `updated_at:timestamptz`

**public.parties**（9 字段）

- `id:uuid`
- `game_id:uuid`
- `summary:text`
- `party_type:text`
- `status:text`
- `hold_status:text`
- `description:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.party_members**（8 字段）

- `id:uuid`
- `party_id:uuid`
- `slot_no:integer`
- `character_id:uuid`
- `member_name_raw:text`
- `member_role:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.game_versions**（9 字段）

- `id:uuid`
- `game_id:uuid`
- `version_no:text`
- `version_name:text`
- `start_date:date`
- `note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `end_date:date`

**public.version_banners**（15 字段）

- `id:uuid`
- `version_id:uuid`
- `phase:text`
- `banner_type:text`
- `character_id:uuid`
- `character_name_raw:text`
- `note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `start_at:timestamptz`
- `end_at:timestamptz`
- `pool_type:text`
- `entry_role:text`
- `pool_name:text`
- `is_featured:boolean`

**public.version_acquisitions**（10 字段）

- `id:uuid`
- `version_id:uuid`
- `character_id:uuid`
- `character_name_raw:text`
- `acquisition_type:text`
- `start_at:timestamptz`
- `end_at:timestamptz`
- `note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.mechanisms**（11 字段）

- `id:uuid`
- `game_id:uuid`
- `title:text`
- `mechanism_type:text`
- `description:text`
- `note:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `source_url:text`
- `source_kind:text`
- `verified_at:date`

**public.platforms**（4 字段）

- `id:uuid`
- `name:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.resources**（11 字段）

- `id:uuid`
- `resource_type:text`
- `title:text`
- `url:text`
- `note:text`
- `source:text`
- `created_at:timestamptz`
- `source_host:text`
- `source_authority:text`
- `ingested_via:text`
- `updated_at:timestamptz`

**public.resource_relations**（9 字段）

- `id:uuid`
- `resource_id:uuid`
- `entity_type:text`
- `entity_id:uuid`
- `relation_type:text`
- `source_sheet:text`
- `source_field:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`


### 系统权限（1）

**public.app_users**（6 字段）

- `user_id:uuid`
- `email:text`
- `role:text`
- `is_active:boolean`
- `created_at:timestamptz`
- `updated_at:timestamptz`


### Creator · 项目与视频（11）

**public.creator_projects**（30 字段）

- `project_id:text`
- `owner_user_id:uuid`
- `name:text`
- `game:text`
- `topic:text`
- `project_type:text`
- `current_state:text`
- `target_publish_date:date`
- `locks:jsonb`
- `drive_root_id:text`
- `drive_root_url:text`
- `drive_folder_id:text`
- `drive_folder_url:text`
- `source_workspace_version:text`
- `project_data:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `archived_at:timestamptz`
- `game_id:uuid`
- `revision:bigint`
- `last_device_id:text`
- `global_revision:bigint`
- `project_scope_locked_at:timestamptz`
- `project_scope_locked_by:uuid`
- `evidence_locked_at:timestamptz`
- `evidence_locked_by:uuid`
- `master_script_locked_at:timestamptz`
- `master_script_locked_by:uuid`
- `global_stale_at:timestamptz`
- `global_stale_reason:text`

**public.creator_video_workspaces**（8 字段）

- `project_id:text`
- `video_id:text`
- `owner_user_id:uuid`
- `title:text`
- `kind:text`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `legacy_branch:text`

**public.creator_deliverable_records**（11 字段）

- `project_id:text`
- `video_id:text`
- `deliverable_key:text`
- `owner_user_id:uuid`
- `status:text`
- `evidence:jsonb`
- `review_note:text`
- `reviewed_at:timestamptz`
- `revision:bigint`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_deliverable_versions**（7 字段）

- `project_id:text`
- `video_id:text`
- `deliverable_key:text`
- `revision:bigint`
- `owner_user_id:uuid`
- `record:jsonb`
- `created_at:timestamptz`

**public.creator_os_workspace_snapshots**（5 字段）

- `owner_user_id:uuid`
- `project_id:text`
- `project_data:jsonb`
- `revision:bigint`
- `updated_at:timestamptz`

**public.creator_os_publish_drafts**（6 字段）

- `owner_user_id:uuid`
- `project_id:text`
- `video_id:text`
- `draft_data:jsonb`
- `revision:bigint`
- `updated_at:timestamptz`

**public.creator_project_events**（7 字段）

- `id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `event_type:text`
- `state:text`
- `detail:jsonb`
- `created_at:timestamptz`

**public.creator_project_files**（19 字段）

- `id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `file_key:text`
- `relative_path:text`
- `kind:text`
- `status:text`
- `storage_provider:text`
- `provider_file_id:text`
- `provider_url:text`
- `filename:text`
- `mime_type:text`
- `size_bytes:bigint`
- `checksum:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `artifact_scope_type:text`
- `artifact_scope_id:text`

**public.creator_file_locations**（19 字段）

- `id:uuid`
- `logical_file_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `device_id:text`
- `storage_provider:text`
- `relative_path:text`
- `availability:text`
- `provider_file_id:text`
- `provider_url:text`
- `filename:text`
- `mime_type:text`
- `size_bytes:bigint`
- `checksum:text`
- `file_modified_at:timestamptz`
- `observed_at:timestamptz`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_devices**（13 字段）

- `id:uuid`
- `owner_user_id:uuid`
- `device_id:text`
- `label:text`
- `device_kind:text`
- `platform:text`
- `workspace_root:text`
- `capabilities:jsonb`
- `metadata:jsonb`
- `first_seen_at:timestamptz`
- `last_seen_at:timestamptz`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_project_releases**（12 字段）

- `id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `platform:text`
- `status:text`
- `post_url:text`
- `post_id:text`
- `published_at:timestamptz`
- `snapshot:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `platform_id:uuid`


### Creator · 多语言与素材（9）

**public.creator_research_sources**（16 字段）

- `research_source_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `source_key:text`
- `source_kind:text`
- `source_url:text`
- `version_context:text`
- `last_checked_at:timestamptz`
- `source_updated_at:timestamptz`
- `fact_snapshot:jsonb`
- `is_stale:boolean`
- `revalidation_required:boolean`
- `source_change_note:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_language_tracks**（23 字段）

- `language_track_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `track_key:text`
- `language_code:text`
- `label:text`
- `is_source:boolean`
- `status:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `revision:bigint`
- `script_revision:bigint`
- `audio_revision:bigint`
- `timeline_revision:bigint`
- `script_locked_at:timestamptz`
- `script_locked_by:uuid`
- `voice_timeline_locked_at:timestamptz`
- `voice_timeline_locked_by:uuid`
- `timing_provenance:text`
- `alignment_status:text`
- `stale_at:timestamptz`
- `stale_reason:text`

**public.creator_visual_masters**（18 字段）

- `visual_master_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `visual_master_key:text`
- `label:text`
- `status:text`
- `revision:bigint`
- `visual_locked_at:timestamptz`
- `visual_locked_by:uuid`
- `edit_plan_locked_at:timestamptz`
- `edit_plan_locked_by:uuid`
- `master_render_locked_at:timestamptz`
- `master_render_locked_by:uuid`
- `stale_at:timestamptz`
- `stale_reason:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_visual_segments**（12 字段）

- `visual_segment_id:uuid`
- `visual_master_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `semantic_anchor:text`
- `sequence_no:integer`
- `visual_intent:text`
- `evidence_requirement:text`
- `asset_references:jsonb`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_visual_segment_projections**（9 字段）

- `visual_segment_id:uuid`
- `language_track_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `start_ms:bigint`
- `end_ms:bigint`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_assets**（20 字段）

- `asset_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `asset_key:text`
- `asset_type:text`
- `label:text`
- `relative_path:text`
- `source_name:text`
- `source_url:text`
- `rights_status:text`
- `evidence_grade:text`
- `quality_status:text`
- `horizontal_compatible:boolean`
- `vertical_compatible:boolean`
- `reusable:boolean`
- `semantic_tags:ARRAY`
- `clip_metadata:jsonb`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_asset_coverage**（11 字段）

- `coverage_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `visual_segment_id:uuid`
- `asset_id:uuid`
- `semantic_anchor:text`
- `coverage_status:text`
- `notes:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_variants**（17 字段）

- `variant_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `variant_key:text`
- `label:text`
- `status:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `visual_master_id:uuid`
- `revision:bigint`
- `output_profile:text`
- `market:text`
- `format:text`
- `stale_at:timestamptz`
- `stale_reason:text`
- `video_id:text`

**public.creator_variant_language_tracks**（10 字段）

- `variant_id:uuid`
- `language_track_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `audio_role:text`
- `subtitle_role:text`
- `sequence_no:integer`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`


### Creator · 发布与学习（8）

**public.creator_channels**（14 字段）

- `channel_id:uuid`
- `owner_user_id:uuid`
- `platform_id:uuid`
- `channel_key:text`
- `name:text`
- `account_label:text`
- `market:text`
- `primary_language:text`
- `language_mode:text`
- `supported_languages:ARRAY`
- `status:text`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_platform_presentations**（17 字段）

- `presentation_id:uuid`
- `variant_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `platform_id:uuid`
- `title:text`
- `description:text`
- `tags:ARRAY`
- `chapters:jsonb`
- `language_metadata:jsonb`
- `market_metadata:jsonb`
- `export_profile:jsonb`
- `platform_metadata:jsonb`
- `thumbnail_artifact_id:uuid`
- `revision:bigint`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_publish_packages**（25 字段）

- `publish_package_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `package_key:text`
- `variant_id:uuid`
- `presentation_id:uuid`
- `channel_id:uuid`
- `package_revision:bigint`
- `package_manifest:jsonb`
- `validation_status:text`
- `validation_errors:jsonb`
- `platform_locked_at:timestamptz`
- `platform_locked_by:uuid`
- `qa_status:text`
- `qa_package_revision:bigint`
- `qa_report_id:uuid`
- `human_reviewed_at:timestamptz`
- `human_reviewed_by:uuid`
- `release_locked_at:timestamptz`
- `release_locked_by:uuid`
- `release_snapshot:jsonb`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `video_id:text`

**public.creator_qa_reports**（11 字段）

- `qa_report_id:uuid`
- `publish_package_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `package_revision:bigint`
- `status:text`
- `checks:jsonb`
- `findings:jsonb`
- `report_artifact_id:uuid`
- `model_metadata:jsonb`
- `created_at:timestamptz`

**public.creator_publications**（23 字段）

- `publication_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `variant_id:uuid`
- `channel_id:uuid`
- `status:text`
- `post_id:text`
- `post_url:text`
- `scheduled_at:timestamptz`
- `published_at:timestamptz`
- `failure_reason:text`
- `publish_package_snapshot:jsonb`
- `metadata:jsonb`
- `created_at:timestamptz`
- `updated_at:timestamptz`
- `publish_package_id:uuid`
- `publication_mode:text`
- `retry_of_publication_id:uuid`
- `repost_of_publication_id:uuid`
- `final_publish_confirmed_at:timestamptz`
- `final_publish_confirmed_by:uuid`
- `revision:bigint`
- `video_id:text`

**public.creator_publication_metric_snapshots**（18 字段）

- `metric_snapshot_id:uuid`
- `publication_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `captured_at:timestamptz`
- `provider:text`
- `views:bigint`
- `likes:bigint`
- `comments:bigint`
- `shares:bigint`
- `saves:bigint`
- `watch_time_seconds:numeric`
- `average_view_duration_seconds:numeric`
- `retention_rate:numeric`
- `ctr:numeric`
- `followers_gained:bigint`
- `raw_snapshot:jsonb`
- `created_at:timestamptz`

**public.creator_performance_reports**（13 字段）

- `performance_report_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `report_key:text`
- `variant_id:uuid`
- `publication_id:uuid`
- `window_start:timestamptz`
- `window_end:timestamptz`
- `metrics_captured_through:timestamptz`
- `report:jsonb`
- `report_artifact_id:uuid`
- `created_at:timestamptz`
- `updated_at:timestamptz`

**public.creator_learnings**（15 字段）

- `learning_id:uuid`
- `project_id:text`
- `owner_user_id:uuid`
- `learning_key:text`
- `performance_report_id:uuid`
- `category:text`
- `status:text`
- `proposal:jsonb`
- `confidence:numeric`
- `reviewed_at:timestamptz`
- `reviewed_by:uuid`
- `review_note:text`
- `supersedes_learning_id:uuid`
- `created_at:timestamptz`
- `updated_at:timestamptz`


### 历史备份（1）

**public.gucc_character_status_backup_20261013**（8 字段）

- `character_id:uuid`
- `existed_before:boolean`
- `research_status:text`
- `build_status:text`
- `progress_note:text`
- `original_created_at:timestamptz`
- `original_updated_at:timestamptz`
- `captured_at:timestamptz`


### 视图（4）

- `public.v_character_overview`：character_id:uuid, game_title:text, game_short_code:text, character_name:text, element:text, profession:text, sex:text, rarity:text, character_note:text, research_status:text, build_status:text, research_note:text, like_level:text, role_type:text, power_rank:text, evaluation_note:text, created_at:timestamptz, updated_at:timestamptz, character_full_name:text
- `public.v_character_progress_overview`：game_title:text, character_name:text, research_status:text, build_status:text, progress_note:text, official_profile_urls:text, research_urls:text, element:text, profession:text, character_full_name:text
- `public.v_party_overview`：game_short_code:text, game_code:text, game_title:text, party_id:uuid, summary:text, party_type:text, status:text, hold_status:text, description:text, members:text, created_at:timestamptz, updated_at:timestamptz
- `public.v_platform_resource_overview`：platform_name:text, resource_type:text, resource_title:text, url:text, resource_note:text, source:text, entity_type:text, relation_type:text, source_sheet:text, source_field:text, resource_created_at:timestamptz, relation_created_at:timestamptz

## 维护边界

- 生产库结构变更：提交 `supabase/migrations/`，同步前端与 Edge Function，并通过 CI。
- 只读核验：`select table_name,column_name,data_type from information_schema.columns where table_schema='public' order by table_name,ordinal_position;`
- 日常 SQL 操作：[查询手册](../reference/query-guides/query-manual.md)；部署：[系统指南](../docs/supabase-setup.html)。
- 不包括 `auth`、`storage` 或私有 schema 内部表。
