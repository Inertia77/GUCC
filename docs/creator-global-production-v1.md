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

The WAV reader validates the declared RIFF boundary, complete padded chunks and complete sample frames. It supports PCM 8/16/24/32-bit and IEEE float 32/64-bit, including standard extensible subformat headers; compressed WAV, segmented `wavl`, duplicate `fmt`/`data`, empty audio and inconsistent rate/alignment fields fail closed. It never treats a truncated file as a shorter valid master. Container rules follow Microsoft's [RIFF description](https://learn.microsoft.com/en-us/windows/win32/xaudio2/resource-interchange-file-format--riff-), [WAVEFORMATEX](https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatex) and [WAVEFORMATEXTENSIBLE](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ksmedia/ns-ksmedia-waveformatextensible).

Timestamped ASR JSON must contain numeric, finite, non-negative `start`/`end` seconds or `startMs`/`endMs` milliseconds, string transcript text and unique segment IDs. Nulls, booleans and numeric strings are rejected instead of coerced; supplied numeric ID `0` is preserved. No timestamps are inferred from the script. Synthetic byte fixtures are used only in local tests; they are not production analysis evidence. Set `GUCC_AUDIO_FFPROBE_SMOKE=1` when running `test-creator-audio-analysis.cjs` to additionally compare a generated WAV fixture with an installed `ffprobe`.

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
- `node scripts/test-creator-global-browser.cjs`: installed Edge/Chrome or Playwright Chromium test (`GUCC_TEST_BROWSER` selects a channel; Linux defaults to the installed headless shell). Every request is locally fulfilled or blocked; it does not reuse an Owner browser profile, connect to Supabase, or test Access Guard authentication. Covers actual DOM replacement, detached controls, an isolated language form write, active-project semantics, notification colors and responsive widths. Latest Edge `152.0.4191.66` run passed at 1440×900, 768×1024 and 390×844 with no page errors, external network attempts or horizontal overflow. Local screenshots: `tmp/creator-global-browser/` (not committed).
- File observations now coalesce repeated reads, resolve rows after I/O, discard old project/session responses (including A → B → A), clear private annotations on logout and recover automatically on cross-tab login. `test-creator-file-observation-races.cjs` adds 7 isolated behavior cases to `npm test`; the real-browser regression also verifies rapid file-tab/project switches against delayed local responses.
- Cache versions: Global UI `v7`, Production app `v4`, Production CSS `v4`, File observations `v2`, Production Access Guard / Pipeline Bridge `v5`, Service Worker static/runtime `v22`. Production explicitly versions the Access Guard loader too: an unversioned cached loader was observed still requesting bridge `v4` after an ordinary reload.
- CI for `1734e9a`: [GUCC CI #619 success](https://github.com/Inertia77/GUCC/actions/runs/34037091077).
- CI for `1b06782`: [GUCC CI #621 success](https://github.com/Inertia77/GUCC/actions/runs/34037331150).
- CI for `89ba178`: [GUCC CI #625 success](https://github.com/Inertia77/GUCC/actions/runs/34066319326), including installed Chromium, actual browser execution and uploaded fixture screenshot artifact `creator-global-browser-34066319326`.
- 2026-09-07 audio-input regression: strict RIFF/format/frame validation, timestamp/identity validation and full CLI rejection behavior passed using local fixtures; the installed `ffprobe` independently agreed with the fixture duration. Invalid input left the source bytes and existing Timeline outputs unchanged. No production audio was analyzed or modified by these tests.
- CI runs the same isolated browser regression after `npm test`, installing only the pinned Playwright package's Chromium headless shell and Linux dependencies. It retains fixture-only screenshots for 7 days. The test does not require repository secrets or Owner credentials, and all page requests are intercepted; failed runs also attempt a failure screenshot. This is continuous UI regression coverage, not a replacement for authenticated Owner-session acceptance.
- Historical authenticated Owner-session visual smoke: 2026-09-01 against `f0a68d7`. The isolated 2026-09-06 regression did not extend that claim; the fresh 2026-09-07 real-session results are recorded below.

### 2026-09-07 authenticated Owner-session acceptance and sync repair

The existing Owner session was reused in the in-app browser at `http://localhost:8000/`. The verified path is Portal → a real cloud project card → Production → Global Production / Files. No Auth users, child fixtures, transactional emails, media uploads, human gates or external publishing were created or invoked.

The initial read-only navigation exposed an existing bridge defect: switching projects compared the newly selected project with a single previous-project baseline and automatically saved it. Project `project_mt8dpi2k_ngq16k` advanced from r9 to r10 at `2026-09-06T23:19:49.250948Z`. This unintended write is **not** reported as zero-change acceptance. The recorded workflow remained IDEA and all human locks remained unset; no state/lock change event was recorded. There is no historical full-project revision snapshot available to prove every content field was unchanged. r10 was preserved, not silently rolled back.

The fix compares canonical content per project, excluding generated bookkeeping changes. Existing local-only drafts are baselined without being uploaded by navigation. Auto/manual saves share one in-flight guard; project/session changes during token acquisition cancel queued writes. Late success/conflict responses reread current storage and preserve newer authored edits, the selected project and removed-project state. Acknowledgements update only cloud metadata; the editor preserves that metadata on subsequent local saves. Publish handoff requires successful synchronization of the exact latest content. Unchanged sidebar/tab controls are retained so textarea focusout cannot swallow the next navigation click.

- `test-creator-pipeline-sync.cjs`: 15 isolated behavioral cases, included in `npm test`.
- The isolated real-browser test now loads the **real Pipeline Bridge**, routes all requests locally, asserts zero saves for navigation, deliberately edits a fixture during a delayed save, and verifies both retained edits and monotonically acknowledged revisions. It still tests delayed Global/Files reads, detached controls, form isolation and three responsive widths.
- Full `npm test` and isolated Edge `152.0.4191.66` browser regression passed. The 38 Story Library warnings are nonblocking content/freshness work, not test failures.
- Fresh authenticated post-fix smoke passed for both real projects at measured CSS sizes 1440×900, 768×1024 and 390×844. No page-level horizontal overflow, broken images, invalid `aria-labelledby` or console warnings/errors were observed. Project selection, visible title and Global gate scope matched. Setup remained collapsed. Both Files views displayed 24 Expected / Observed annotations, correctly reporting physical files as not yet verified by Local Agent.
- Portal displayed the two real projects at r10 / r2 and opened the matching project. The pre-existing local-only “浏览器验收项目” was not selected, uploaded or removed. Temporary viewport overrides were reset.
- Before/after the repaired navigation smoke, both `revision`, `updated_at` and `md5(project_data::text)` were identical: IDEA r10 (`40e4243e42ac9e98d9eeca9a76e7a40c`) and PLANNING r2 (`73fcabcc465534e00bb739df1f155d74`). All five legacy locks remained false; Project Scope, Evidence and Master Script timestamps remained null.
- Readback found 24 logical files per project and zero rows in all 17 Global child/association tables checked (including research/assets, languages, visual identities/projections, variants/channels, packages/QA, publications, metrics, reports and learnings). No synthetic residue was created by this session.

This closes the fresh authenticated **visual/navigation** acceptance point. It does not claim real media analysis, physical local-file validation, human lock approval or provider distribution occurred. PR #37 remains open and unmerged; feature-head Pages deployment is not configured, and ongoing hardening continues under the user's continuation request.

The formal migration is paired with `supabase/sql/creator_global_production_v1_acceptance.sql`. The acceptance fixture creates one rollback-only synthetic project with ZH/JA/EN tracks, one Visual Master, four Variants/Channels/Packages, Initial/Retry/Repost Publications, analytics, a Performance Report and a human-accepted Learning. It also proves human-lock rejection, Release snapshot immutability, scoped artifact coexistence and Legacy prune safety before `ROLLBACK`.
