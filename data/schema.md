# GUCC Supabase Schema

> Production-aligned reference. Updated 2026-08-26 after migration `20260826090950_gucc_creator_owner_fk_indexes_20260826`.
> Migration SQL under `supabase/migrations/` is authoritative for exact DDL history.

## Access model

Core game data is not exposed for direct browser CRUD. Normal management flow is:

`GUCC → Supabase Auth → Edge Function → app_users → service_role → app_* RPC → tables`

Creator Project data is also currently written through `creator-project-api`; RLS remains enabled as defense in depth.

---

## `games`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| short_code | text | nullable, unique |
| code | text | nullable, unique |
| title | text | unique, not null |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `game_status`

| Column | Type | Notes |
|---|---|---|
| game_id | uuid | PK, FK → games, cascade |
| content_tier | text | required; 创作级/兴趣级/观察级/浅尝级/抛弃级 |
| output_enabled | bool | required |
| research_depth | text | required; 深/中/微/无 |
| login_frequency | text | required; 每日/偶尔/从不 |
| spending_level | text | required; 中/微/无 |
| info_attention | text | required; 深/中/微/无 |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `characters`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| game_id | uuid | FK → games, cascade |
| name | text | canonical zh name; unique with game_id |
| element | text | nullable |
| profession | text | nullable |
| sex | text | nullable; 男/女/未定 |
| rarity | text | nullable; 4星/5星/6星/A级/S级 |
| note | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `character_names`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| character_id | uuid | FK → characters, cascade |
| lang | text | zh/en/jp/kr; unique with character_id |
| name | text | localized name |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `character_progress`

| Column | Type | Notes |
|---|---|---|
| character_id | uuid | PK, FK → characters, cascade |
| research_status | text | required; 待研究/查攻略/OK |
| build_status | text | required; 待养成/DONE/NOT |
| progress_note | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `character_evaluations`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| character_id | uuid | FK → characters, cascade |
| context | text | default current; unique with character_id |
| role_type | text | nullable |
| power_rank | text | nullable; T0–T4 |
| like_level | text | nullable; 极/优/良/中/差 |
| note | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `parties`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| game_id | uuid | FK → games, cascade |
| summary | text | required |
| party_type | text | nullable |
| status | text | nullable; 待研究/OK |
| hold_status | text | required; YES/NO |
| description | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

Unique: `(game_id, summary, party_type)`.

## `party_members`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| party_id | uuid | FK → parties, cascade |
| slot_no | int4 | unique with party_id |
| character_id | uuid | nullable, FK → characters, set null |
| member_name_raw | text | required; supports generic/composite slots |
| member_role | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `game_versions`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| game_id | uuid | FK → games, cascade |
| version_no | text | unique with game_id |
| version_name | text | nullable |
| start_date | date | nullable |
| note | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `version_banners`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| version_id | uuid | FK → game_versions, cascade |
| phase | text | first_half/second_half/other/standard/unknown |
| banner_type | text | new_limited/pickup/rerun/collab/standard_addition/unknown |
| character_id | uuid | nullable, FK → characters, set null |
| character_name_raw | text | required |
| note | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `platforms`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | unique |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

## `mechanisms`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| game_id | uuid | required, FK → games |
| title | text | unique with game_id |
| mechanism_type | text | nullable; core_combat/resource/switch/break/reaction/equipment/action/team/system |
| description | text | nullable |
| note | text | nullable |
| source_url | text | nullable |
| source_kind | text | official/official_wiki/official_community/community/guide |
| verified_at | date | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

The five maintained games are now seeded with system-level mechanics; this table is no longer intentionally empty.

## `resources`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| resource_type | text | required |
| title | text | nullable |
| url | text | nullable, globally unique when non-null |
| note | text | nullable |
| source | text | nullable legacy compatibility field |
| source_host | text | derived host when URL exists |
| source_authority | text | official/official_wiki/official_community/community/personal/unknown |
| ingested_via | text | frontend/legacy_import/manual/ai/migration/unknown |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

`source` is retained for old RPC/UI compatibility. New code should prefer `source_host`, `source_authority`, and `ingested_via` for structured provenance.

## `resource_relations`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| resource_id | uuid | FK → resources, cascade |
| entity_type | text | character/game/party/platform etc. |
| entity_id | uuid | polymorphic entity id |
| relation_type | text | required |
| source_sheet | text | nullable legacy/import provenance |
| source_field | text | nullable legacy/import provenance |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

Unique basic business relation: `(resource_id, entity_type, entity_id, relation_type)`.

## `app_users`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, FK → auth.users, cascade |
| email | text | unique |
| role | text | default owner; currently informational |
| is_active | bool | default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

---

# Creator Project

## `creator_projects`

| Column | Type | Notes |
|---|---|---|
| project_id | text | PK |
| owner_user_id | uuid | FK → auth.users, cascade |
| name | text | required |
| game | text | legacy/display value |
| game_id | uuid | nullable FK → games, set null; auto-resolved from game text |
| topic | text | required |
| project_type | text | A_FULL_GUIDE/B_SUNO_VIDEO/C_GAME_SYSTEM/D_MUSIC_RELEASE |
| current_state | text | constrained to Production System workflow states |
| target_publish_date | date | nullable |
| locks | jsonb | default {} |
| drive_root_id / drive_root_url | text | nullable |
| drive_folder_id / drive_folder_url | text | nullable |
| source_workspace_version | text | nullable |
| project_data | jsonb | canonical project payload snapshot |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |
| archived_at | timestamptz | nullable |

Unique ownership key: `(project_id, owner_user_id)`.

## `creator_project_files`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | text | part of composite FK to creator_projects |
| owner_user_id | uuid | part of composite FK; must match project owner |
| file_key | text | unique with project_id |
| relative_path | text | required |
| kind | text | current production-file kind |
| status | text | Missing/Planned/Ready/Used/Rejected |
| storage_provider | text | provider marker |
| provider_file_id / provider_url | text | nullable |
| filename / mime_type | text | nullable |
| size_bytes | int8 | nullable |
| checksum | text | nullable |
| metadata | jsonb | default {} |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

A DB trigger prunes file rows no longer present in `creator_projects.project_data.files`.

## `creator_project_events`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | text | composite FK with owner_user_id |
| owner_user_id | uuid | must match parent project owner |
| event_type | text | required |
| state | text | nullable |
| detail | jsonb | default {} |
| created_at | timestamptz | append-only event time |

## `creator_project_releases`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | text | composite FK with owner_user_id |
| owner_user_id | uuid | must match parent project owner |
| platform | text | legacy/display value |
| platform_id | uuid | nullable FK → platforms, set null; auto-resolved |
| status | text | default draft |
| post_url / post_id | text | nullable |
| published_at | timestamptz | nullable |
| snapshot | jsonb | default {} |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-touched |

Unique: `(project_id, platform)`.

---

## Trigger-managed metadata

`app_touch_updated_at()` automatically maintains `updated_at` on mutable business tables. Additional database-boundary synchronization exists for:

- resource provenance metadata;
- Creator Project game → game_id;
- Creator Project release platform → platform_id;
- removal of stale Creator Project file rows.

## Client privilege boundary

`anon` and `authenticated` do not receive direct core-table CRUD and have also had unnecessary `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges revoked. Management writes continue through the authenticated Edge Function + service-role RPC path.
