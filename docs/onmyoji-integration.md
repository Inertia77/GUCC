# 阴阳师 × GUCC Integration

> Active from 2026-08-27. This document records the operational policy for maintaining 《阴阳师》 inside the existing GUCC architecture without creating a parallel system.

## Game identity

- title: `阴阳师`
- short_code: `阴`
- code: `YYS`
- content_tier: `兴趣级`
- output_enabled: `false`
- research_depth: `中`
- login_frequency: `每日`
- info_attention: `中`

The game remains an interest / play-maintenance title by default. It is not automatically promoted into the creator-output queue merely because it is actively played.

## Data model policy

Use the existing core tables:

- `games` / `game_status`: game identity and strategic status
- `characters`: static playable shikigami catalog
- `character_names`: Chinese canonical name plus verified EN / JP / KR names when available
- `character_evaluations`: current role / evaluation when the role has actually been researched
- `character_progress`: user-specific research/build state only
- `parties` / `party_members`: reusable PvE/PvP party skeletons and confirmed teams
- `game_versions` / `version_banners`: event/version anchors and summon pools
- `mechanisms`: durable system mechanics
- `resources` / `resource_relations`: official notices, official catalog, guides and research links

### Catalog is not ownership

`characters` is an encyclopedia/catalog table. A shikigami being present in `characters` **does not mean the user owns it**.

Ownership, build decisions and researched status belong in `character_progress`, party `hold_status`, and related notes. Do not infer user ownership from catalog presence, summon UI, self-select UI, or community screenshots.

This separation is especially important for Onmyoji because the full playable catalog is much larger than the user's currently relevant roster.

## Full playable shikigami catalog

As of the 2026-08-27 maintenance pass, GUCC stores **274 playable Onmyoji character records**:

- UR: 1
- SP: 50
- SSR: 87
- SR: 68
- R: 38
- N: 30

The catalog combines the current NetEase official shikigami directory with current community-catalog cross-checking for completeness. Newer 2026 releases and collaborations are included when supported by current official/current catalog evidence.

Intentional exclusions:

- deleted/non-production character records such as 玉取
- Daruma/material units that are not treated as playable character records in GUCC
- unreleased unnamed/speculative future characters

Onmyoji rarities supported by `characters.rarity` are `UR / SP / SSR / SR / R / N` in addition to the other GUCC games' rarity vocabulary.

## Naming rules

`characters.name` follows the same global GUCC rule:

- use the name the game normally presents/calls the character
- never shorten a Chinese name merely because it contains a surname or long title

`characters.full_name` stores the actual full/canonical name and may be identical to `name`.

Example:

- 雪御前: `name = 雪御前`, `full_name = 源雪姬`
- most shikigami: `full_name = name` until a separately verified full name exists

Every Onmyoji catalog row has a `zh` entry in `character_names`. EN / JP / KR names are filled only when verified; missing translations are deliberately left blank rather than guessed.

## Current user-state records

Only explicitly confirmed or explicitly planned account facts receive user-specific progress/evaluation rows. Current maintained examples include:

- 天照 — researched and already in the mature short-PvE production pool
- 雪御前 — researched, queued for build
- 神无月 — researched as a planned PvE support target; acquisition must remain separately confirmed
- 神酿星熊童子 — researched but currently marked `NOT` for build priority
- 石长姬 — pending research/build after the official anniversary distribution and live-server verification

Do not bulk-create `DONE`, `NOT`, ownership, power tier or like-level values for the static catalog.

## Current party skeletons

1. `双天照短线生产队`
   - immediate return-production skeleton
   - status: `OK`
   - hold: `YES`
   - stable auto clear takes priority over record-speed clears

2. `雪御前 + 神无月长线 PVE 骨架`
   - modern long-cycle PvE candidate
   - status: `待研究`
   - hold: `NO` until 神无月 acquisition is confirmed

3. `神无月 + 双天照长线 PVE 骨架`
   - planned modern PvE skeleton
   - status: `待研究`
   - hold: `NO` until 神无月 acquisition is confirmed
   - slots: 神无月 / 天照 / 天照 / 供火或增伤 / 增伤或功能

Generic support slots intentionally remain unbound until a concrete boss/content target and confirmed owned support roster are available.

## Current version / event anchors

Current production records include:

- `2.8.80` — `云华依言歌`, start 2026-08-19
- `SUMMER-SIGNIN-2026` — `阳阳师计划·特别签到`, start 2026-07-15
- `10TH-PREHEAT-2026` — `拾光永恒·十周年预热`, start 2026-08-26
- `10TH-2026` — `一瞬刹那·拾光永恒`, start 2026-09-09

Use the real client/version number when one is available. Synthetic stable IDs remain acceptable for event campaigns that do not map cleanly to a normal client version number.

## Resources and official-profile convention

Game-level sources include:

- NetEase official Onmyoji homepage
- NetEase official shikigami catalog
- current TapTap official game/community notices
- BWIKI shikigami catalog as a community completeness cross-check
- GUCC return guide

Every current Onmyoji character has exactly one `official_profile` relation. At present the shared official NetEase shikigami directory is used as the canonical official-profile target when a reliable stable per-character official deep link has not been established.

A future maintenance pass may replace the shared catalog target with verified per-character official deep links without changing the `official_profile` relation type.

## GUCC frontend integration

The Command Center already exposes `阴阳师` in character / party / version game filters.

The 2026-08-27 catalog expansion additionally requires:

- character search hard limit raised from 200 to 1000 so the full Onmyoji catalog is reachable
- rarity shown in character-card metadata (`UR / SP / SSR / SR / R / N`)
- redundant `式神` profession chip suppressed for Onmyoji cards
- full-name small text remains visible even when `full_name = name`
- normal research/build status rendering continues to use the global GUCC vocabulary

Do not create a separate Onmyoji frontend or API. It remains a first-class game inside the shared GUCC character / party / version workflows.

## Source priority

For changing facts such as summon windows, event deadlines, anniversary rewards and codes:

1. in-game notice / NetEase official notice
2. official Onmyoji community account / official community post
3. reliable current community guide, clearly marked as community evidence

For static catalog completeness, official directory + maintained catalog cross-checking is acceptable. Never promote beta/leak/community speculation into a confirmed production fact.

## Drive / Creator Project policy

GUCC remains **Local-first Production + Supabase Cloud State/History + Google Drive Lightweight Project Archive**.

Do not create a permanent game-specific large-file archive for Onmyoji. `GUCC Creator Projects/01_ACTIVE` stays project-based. Create an Onmyoji Drive project folder only when an actual Creator Project is opened. Large captures, video, audio and editing projects remain local unless the user explicitly archives them elsewhere.

Because `creator_projects.game_id` auto-resolves from `games`, a future Creator Project whose game is `阴阳师` can use the existing Creator Project API without a dedicated Edge Function.

## Current reference guide

`reference/game-guides/onmyoji-return-2026-08-27-to-2026-09-09.md`

This guide is registered in `resources` and related to the `阴阳师` game record.
