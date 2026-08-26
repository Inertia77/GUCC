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

## Data model usage

Use the existing core tables:

- `games` / `game_status`: game identity and strategic status
- `characters`: shikigami catalog
- `character_evaluations`: current role / evaluation
- `character_progress`: only when actual research/build status is confirmed; do not invent ownership/build state
- `parties` / `party_members`: reusable PvE/PvP party skeletons and confirmed teams
- `game_versions` / `version_banners`: event/version anchors and summon pools
- `mechanisms`: durable system mechanics
- `resources` / `resource_relations`: official notices, guides and research links

Onmyoji rarities supported by `characters.rarity` are `UR / SP / SSR / SR / R / N` in addition to the existing GUCC rarity vocabulary.

## Current seeded characters

The 2026-08-27 integration intentionally seeds only currently relevant records rather than bulk-importing the entire historical shikigami catalog:

- 天照 — user confirmed two copies
- 雪御前 — obtained in the 2026-08-27 return summon
- 神无月 — current return self-select target
- 神酿星熊童子 — obtained in the 2026-08-27 return summon
- 石长姬 — official 10th-anniversary login reward on 2026-09-09; pending live-server verification
- 洛天依 / 言和 — current Vsinger collaboration banner records

A later roster audit may expand the catalog. Do not infer owned/build status from absence or presence in the self-select UI.

## Current party skeletons

1. `双天照短线生产队`
   - immediate return-production skeleton
   - stable auto clear takes priority over record-speed clears

2. `雪御前 + 神无月长线 PVE 骨架`
   - modern long-cycle PvE development target
   - three remaining slots stay generic until the exact boss/content and user-owned support roster are verified

## Version convention

Onmyoji does not always map cleanly to the numeric version naming used by other GUCC games. Use stable synthetic identifiers when necessary, for example:

- `2026-08-VSINGER`
- `10TH-2026`

`version_name`, dates and notes should preserve the official event/campaign name.

## Source priority

For changing facts such as summon windows, event deadlines, anniversary rewards and codes:

1. in-game notice / NetEase official notice
2. official Onmyoji community account / official community post
3. reliable current community guide, clearly marked as community evidence

Never promote beta/leak/community speculation into a confirmed production fact.

## Drive / Creator Project policy

GUCC remains **Local-first Production + Supabase Cloud State/History + Google Drive Lightweight Project Archive**.

Do not create a permanent game-specific large-file archive for Onmyoji. `GUCC Creator Projects/01_ACTIVE` stays project-based. Create an Onmyoji Drive project folder only when an actual Creator Project is opened. Large captures, video, audio and editing projects remain local unless the user explicitly archives them elsewhere.

Because `creator_projects.game_id` auto-resolves from `games`, a future Creator Project whose game is `阴阳师` can use the existing Creator Project API without a dedicated Edge Function.

## Current reference guide

`reference/game-guides/onmyoji-return-2026-08-27-to-2026-09-09.md`

This guide is also registered in `resources` and related to the `阴阳师` game record.
