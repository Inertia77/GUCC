## Table `games`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `short_code` | `text` |  Nullable Unique |
| `code` | `text` |  Nullable Unique |
| `title` | `text` |  Unique |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `game_status`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `game_id` | `uuid` | Primary |
| `content_tier` | `text` |  Nullable |
| `output_enabled` | `bool` |  Nullable |
| `research_depth` | `text` |  Nullable |
| `login_frequency` | `text` |  Nullable |
| `spending_level` | `text` |  Nullable |
| `info_attention` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `characters`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `game_id` | `uuid` |  |
| `name` | `text` |  |
| `element` | `text` |  Nullable |
| `profession` | `text` |  Nullable |
| `sex` | `text` |  Nullable |
| `rarity` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `character_names`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `character_id` | `uuid` |  |
| `lang` | `text` |  |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `character_progress`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `character_id` | `uuid` | Primary |
| `research_status` | `text` |  Nullable |
| `build_status` | `text` |  Nullable |
| `research_note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `character_evaluations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `character_id` | `uuid` |  |
| `context` | `text` |  |
| `role_type` | `text` |  Nullable |
| `power_rank` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `like_level` | `text` |  Nullable |

## Table `parties`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `game_id` | `uuid` |  |
| `summary` | `text` |  |
| `party_type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `hold_status` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `party_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `party_id` | `uuid` |  |
| `slot_no` | `int4` |  |
| `character_id` | `uuid` |  Nullable |
| `member_name_raw` | `text` |  |
| `member_role` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `game_versions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `game_id` | `uuid` |  |
| `version_no` | `text` |  |
| `version_name` | `text` |  Nullable |
| `start_date` | `date` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `version_banners`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `version_id` | `uuid` |  |
| `phase` | `text` |  |
| `banner_type` | `text` |  |
| `character_id` | `uuid` |  Nullable |
| `character_name_raw` | `text` |  |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `platforms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `created_at` | `timestamptz` |  |

## Table `mechanisms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `game_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `mechanism_type` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `resources`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `resource_type` | `text` |  |
| `title` | `text` |  Nullable |
| `url` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `source` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `resource_relations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `resource_id` | `uuid` |  |
| `entity_type` | `text` |  |
| `entity_id` | `uuid` |  |
| `relation_type` | `text` |  |
| `source_sheet` | `text` |  Nullable |
| `source_field` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

