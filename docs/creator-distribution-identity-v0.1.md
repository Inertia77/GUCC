# Creator Distribution Identity Foundation v0.1

Status: **WP_GLOB_001 contract**

This document defines the minimum identity layer required for one Creator content project to safely produce many distribution objects without prematurely implementing the Global Creator OS production pipeline.

## 1. Identity ladder

```text
Content Project Root
  ↓ 1:N
Distribution Variant
  ↓ N:M through Publication
Channel
  ↓
Publication instance
```

The concrete database identities are:

- `creator_projects` — **Content Project Root**.
- `creator_variants` — **Distribution Variant** under a project.
- `platforms` — **Platform Dictionary** only.
- `creator_channels` — **Platform + Account + Market + Language Strategy**.
- `creator_publications` — one concrete Variant → Channel publication event/instance.
- `creator_project_releases` — **Legacy Project Release Compatibility Model** for the current Publish Console.

No SQL rename of `creator_projects` is required. Its semantic role changes, not its physical table name.

## 2. Content Project Root

A Creator Project is the root identity for one piece of content/research/creative intent. It is **not** equivalent to one exported video file.

`creator_projects.current_state` remains a coarse global project state for current compatibility. It must not become the dumping ground for every future child workflow.

Future child identities such as:

- Language Track,
- Visual Master,
- Distribution Variant,
- Publication,

must own their own state/status/lock where required.

No new Global Creator Pipeline state is introduced by WP_GLOB_001.

## 3. Platform is not Channel

`platforms` is a dictionary of products/services:

- YouTube
- TikTok
- B站 / Bilibili
- 抖音 / Douyin

A market/account-specific destination is a `creator_channels` row, not a new Platform row.

Correct:

```text
Platform: TikTok
  ├─ Channel: TikTok JP
  └─ Channel: TikTok Global
```

Incorrect:

```text
Platform: TikTok JP
Platform: TikTok Global
```

All Channel logic must use `platform_id` foreign-key identity rather than matching platform-name strings.

## 4. Distribution Variant is not Language Track

A Variant represents a distribution/rendering target. Example identities include:

```text
YOUTUBE_GLOBAL_LONG
TIKTOK_JA_SHORT
TIKTOK_EN_SHORT
BILIBILI_ZH_LONG
```

The key may describe intended market/language/format, but the Variant itself is **not** a Language Track.

A future `YOUTUBE_GLOBAL_LONG` Variant may consume several language/audio tracks such as ZH, JA and EN. WP_GLOB_001 does not create those tracks; it only makes sure the Variant identity does not prevent them.

## 5. Channel language strategy

A Channel may describe routing strategy without implementing Language Tracks.

Example:

```text
YouTube Main
platform_id: YouTube
market: Global
language_mode: multi_audio
supported_languages: [ZH, JA, EN]
```

```text
TikTok JP
platform_id: TikTok
market: Japan
primary_language: JA
language_mode: single_language
```

```text
TikTok Global
platform_id: TikTok
market: Global
primary_language: EN
language_mode: single_language
```

Account fields are labels/identity only. Credentials, tokens and login secrets do not belong in `creator_channels`.

## 6. Publication is an event/instance

`creator_publications` represents an actual publication attempt/result, not a permanent project/platform slot.

Therefore this must remain legal:

```text
Variant A → TikTok JP → Publication 1
Variant A → TikTok JP → Publication 2  # repost / retry
```

There is intentionally no unique constraint on:

```text
(project_id, platform)
(project_id, channel_id)
(variant_id, channel_id)
```

Different Variants may publish to the same Platform or Channel, and the same Variant may be published repeatedly.

## 7. Legacy release compatibility

`creator_project_releases` remains the current Publish Console compatibility table. Its existing project/platform-slot semantics are intentionally not generalized in WP_GLOB_001.

Rules:

- Do not delete it.
- Do not migrate existing projects into the new identity tables just to satisfy the new architecture.
- Do not add Globalization fields to it.
- Do not make the current six-platform Publish Console depend on Variant/Channel/Publication rows.
- A later explicit compatibility WP may bridge legacy releases to the new identity model after the identity foundation is accepted.

## 8. Artifact scope contract

Current `creator_project_files` is a Project-level logical artifact checklist with `UNIQUE(project_id, file_key)`. Current keys such as:

```text
VOICE_MASTER
AUDIO_MASTER
SUBTITLE_MASTER
VIDEO_V1
```

remain **Legacy/default Project artifacts** for current Production compatibility.

`VIDEO_V1` means the current default/final master artifact. It does **not** mean:

```text
One Project = One Video
```

The future artifact identity layer must support explicit scope at least for:

```text
project
language_track
visual_master
variant
```

Do not emulate scope by inventing file keys such as:

```text
AUDIO_MASTER_JA
AUDIO_MASTER_EN
SUBTITLE_MASTER_JA
SUBTITLE_MASTER_EN
```

A later Work Package must introduce an explicit artifact scope/owner identity before multilingual artifacts are implemented. WP_GLOB_001 deliberately does not migrate `creator_project_files`.

## 9. Current Timeline compatibility

The existing Project-level Timeline contract, when present, belongs to the current Legacy/default Production path. It may remain useful as a compatibility invariant, but it must not be mistaken for the future multilingual Language Track / Visual Master timeline architecture.

Future Language Tracks and Visual Masters must receive their own explicit artifact/state identities rather than expanding Project-level singleton file keys or `creator_projects.current_state`.

## 10. Storage boundary

The long-term boundary is already active:

```text
Local machine
  Large Media + active production files

Supabase
  State + History + Identity + Metadata

Google Drive
  Lightweight Project Archive
```

Large media remains Local-first. Supabase does not become a media binary store. Google Drive Archive remains lightweight and contains knowledge/project artifacts such as `.md`, `.json`, `.srt`, `.csv`, `.txt`, `.vtt`; video/audio/gameplay/edit-project binaries are not part of the archive package.

The Google Drive Lightweight Project Archive is implemented and has a dedicated runtime/setup path. It is not a future/unimplemented architecture item.

## 11. WP_GLOB_001 acceptance cases

### Case A — YouTube multi-audio-ready identity

```text
Content Project Root
  → YOUTUBE_GLOBAL_LONG
  → YouTube Main
  → Publication
```

The Variant/Channel metadata can describe `multi_audio` and `[ZH, JA, EN]` without creating Language Tracks or uploading multi-audio.

### Case B — two TikTok Channels on one Platform

```text
TIKTOK_JA_SHORT → TikTok JP
TIKTOK_EN_SHORT → TikTok Global
```

Both Channels point to the same TikTok `platform_id`; their account, market and language strategy differ.

### Case C — repost

```text
Variant A → TikTok JP → Publication 1
Variant A → TikTok JP → Publication 2
```

Both Publication rows are valid independent instances.

## 12. Explicit non-scope

WP_GLOB_001 does not implement:

- Language Track tables or workflow,
- ZH/JA/EN voice production,
- ASR / Whisper,
- multilingual subtitle/timeline,
- Language Timeline,
- Visual Master / Visual Master Timeline,
- AI dubbing,
- YouTube Multi-Audio upload,
- TikTok login or automatic publish,
- Instagram / Niconico expansion,
- actual Variant rendering,
- Asset Clip DB / embeddings,
- AI Director,
- analytics warehouse / learning loop,
- Publisher UI redesign,
- media cloud upload.

The only problem solved here is:

> One Content Project Root can safely identify many different distribution and publication objects.
