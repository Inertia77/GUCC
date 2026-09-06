# GUCC Creator OS — Global Production v1

Global Production v1 is an additive production layer over the existing 23-state Creator Project workflow. The legacy workflow, Timeline invariant, Publish Console and lightweight Drive archive remain compatible; child production state is no longer forced into `creator_projects.current_state`.

## Identity and storage

One `creator_projects` row is the Content Project Root. It owns many Language Tracks, Visual Masters, Distribution Variants, Publish Packages and Publication instances.

Logical artifacts use the stable identity:

`project_id + artifact_scope_type + artifact_scope_id + file_key`

Valid scopes are `project`, `language_track`, `visual_master` and `variant`. Language or visual identity must never be encoded as suffixes such as `AUDIO_MASTER_JA`.

Media remains local. Supabase stores state, relationships, revision, locks, history, checksums and workspace-relative physical-location observations. The Creator API rejects media bytes, base64/blob payloads, secrets and absolute paths. Google Drive remains a lightweight archive for Markdown, JSON, CSV, SRT and similar knowledge artifacts; it is not a video/audio archive.

## Child workflows

Language Track:

`DRAFT → SCRIPTING → SCRIPT_LOCKED → AUDIO_PRODUCTION → AUDIO_LOCKED → TIMELINE_GENERATION → TIMELINE_LOCKED → READY`

The UI/API treats lock-bearing states as results of explicit human gates. `AUDIO_MASTER`, `SUBTITLE_MASTER`, `TIMELINE_SENTENCE`, `TRANSCRIPT_ALIGNED` and `ALIGNMENT_REPORT` must coexist inside each Language Track scope. Voice / Timeline Lock fails closed unless all five artifacts are ready, `timing_provenance=real_audio`, and alignment is `VALID`.

Visual Master is a reusable semantic visual identity. `creator_visual_segments` records semantic anchors; `creator_visual_segment_projections` maps those anchors to the real timing of each Language Track. It is deliberately not based on subtitle line numbers. Visual Master, Edit Plan and Master Render each have independent human locks.

A Variant references one Visual Master and one or more Language Tracks. Platform Presentation owns title, description, tags, chapters and export metadata for one Variant + Platform. A Publish Package binds Variant + Presentation + Channel + registered local output artifact. Package changes invalidate QA; Platform Lock freezes automated changes; Release Lock writes an immutable snapshot.

A Publication is a real distribution instance. Initial, Retry and Repost are separate `publication_mode` rows, so one Variant + Channel can have multiple publication events. Every new mode enters the lifecycle at `READY_TO_PUBLISH`; legacy `RETRY`/`REPOST` status rows remain confirmable for compatibility. Distribution requires current QA PASS, Human Final Review, Release Lock and Final Publish Confirmation. A human may withdraw that confirmation before Distribution starts, but not after the status reaches Scheduled, Publishing or Published. External provider OAuth/upload is intentionally outside v1; the user performs or confirms the real platform publish and records the Post ID/URL.

Metric snapshots reject negative watch time and average view duration. Retention and CTR remain constrained to the inclusive `0..1` range.

Research, Asset and Publication URLs are parsed as credential-free HTTPS URLs, and metadata flags must be actual JSON booleans rather than truthy strings.

## Human/AI boundary

The only supported human-gate API action is `humanLock`. It requires `humanConfirmed=true`, `source=human_ui`, a reason and the current expected revision. Database triggers reject generic mutation of human-owned fields. AI may create drafts, analyze, validate, propose QA findings and propose learnings; it cannot set:

- Project Scope, Evidence Snapshot or Master Script Lock
- Language Script or Voice / Timeline Lock
- Visual Master, Edit Plan or Master Render Lock
- Platform Variant, Human Final Review or Release Lock
- Final Publish Confirmation
- Learning acceptance/rejection

Accepted Learning is the only learning state exposed to the next-project feedback loop. A generated report remains a proposal until the human reviews it.

## Real-audio analysis

`scripts/creator-audio-analysis.cjs` reads the real local audio duration (RIFF/WAV directly or `ffprobe`), computes SHA-256, consumes timestamped ASR segments, aligns them to the locked script and writes the four Timeline Bundle files. If no timestamped ASR JSON is supplied, it may invoke a local Whisper CLI. Missing ASR, unreadable audio, overlapping/out-of-bounds timestamps, estimated/script-derived providers or invalid alignment all block the lock.

The tool refuses to overwrite any existing formal Timeline output by default. Only after a human explicitly reopens the Voice / Timeline Lock may the operator rerun it with `--force`; the flag is never implied by automation.

Example:

```powershell
node scripts/creator-audio-analysis.cjs --audio AUDIO_MASTER.wav --asr whisper-result.json --script VOICE_SCRIPT.md --language ja --output .
```

## Local workspace and UI

The Local Agent understands the full scoped Artifact identity and uses scope-aware hash-cache keys. Cloud bootstrap creates dynamic directories such as:

- `02_SCRIPT/LANG/{TRACK_KEY}`
- `03_AUDIO/LANG/{TRACK_KEY}`
- `04_SUBTITLES/LANG/{TRACK_KEY}`
- `06_EDIT_PLAN/VISUAL_MASTER/{VISUAL_MASTER_KEY}`
- `10_RELEASE/VARIANTS/{VARIANT_KEY}`

The daily UI path is Portal → Creator Dashboard → Open Project → Global Production. It presents one next action, human-required state, Language Tracks, Visual Master, Variants, Packages/QA/Release, Publications, Analytics and Learning. Architecture details and setup forms are collapsed by default. Portal and Production observe the shared Owner-session storage event, so completing Command Center login in another tab refreshes their cloud state without a manual reload. The versioned Dashboard and Production assets are included in the PWA application shell for deterministic cache updates and offline startup.

## Verification

### 2026-09-06 resumed integration

Synced `origin/main` through `716db12` into the existing PR #37 feature branch; the PR remains open and must not be merged automatically.

Global Production now clears old controls while loading, verifies the rendered Project identity, and rechecks the captured snapshot/refresh epoch after obtaining an access token before sending a write. A project switch or session change cancels a queued write; late results cannot overwrite another project's UI or clear its busy state. Deep links select a locally available requested project before rendering. The active project is visually distinct and marked with `aria-current`; scoped notification colors override the shared theme's dark panel background.

- `node scripts/test-creator-global-ui.cjs`: 14 isolated async behavior cases plus 3 real-app deep-link selection cases. Included in `npm test`.
- `node scripts/test-creator-global-browser.cjs`: optional installed Edge/Chrome test (`GUCC_TEST_BROWSER` selects the Playwright channel). Every request is locally fulfilled or blocked; it does not reuse an Owner browser profile, connect to Supabase, or test Access Guard authentication. Covers actual DOM replacement, detached controls, an isolated language form write, active-project semantics, notification colors and responsive widths. Latest Edge `152.0.4191.66` run passed at 1440×900, 768×1024 and 390×844 with no page errors, external network attempts or horizontal overflow. Local screenshots: `tmp/global-browser-20260906/` (not committed).
- Cache versions: Global UI `v7`, Production app `v3`, Production CSS `v4`, Service Worker static/runtime `v20`.
- The real authenticated Owner-session visual smoke was completed on 2026-09-01 against `f0a68d7`; the isolated 2026-09-06 regression does **not** extend that claim to a new authenticated session. At resume, the in-app browser had no open tabs and port 8000 had no server. A fresh Owner-session final check remains separate from these automated results.
- Production connectivity was checked read-only on 2026-09-06: still two projects. No production human gates, child fixtures, Auth users, emails or media were created/modified for this regression.

The formal migration is paired with `supabase/sql/creator_global_production_v1_acceptance.sql`. The acceptance fixture creates one rollback-only synthetic project with ZH/JA/EN tracks, one Visual Master, four Variants/Channels/Packages, Initial/Retry/Repost Publications, analytics, a Performance Report and a human-accepted Learning. It also proves human-lock rejection, Release snapshot immutability, scoped artifact coexistence and Legacy prune safety before `ROLLBACK`.
