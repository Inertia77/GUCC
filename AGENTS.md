# GUCC Agent Rules

## TDX Video Editing Rules

These rules apply to work inside an AI Video Production System project directory.

1. Read `00_CONTROL/STATUS.md`, `PROJECT_MANIFEST.md`, and the relevant locked masters before changing production files. Treat `STATUS.md` as the single state source.
2. Never fabricate game UI, character art, icons, footage, damage numbers, facts, or sources. Record missing inputs in `MISSING_ASSET_REPORT.md`.
3. Do not change locked Content, Script, Music, Audio, or Picture unless the user explicitly reopens that lock.
4. `AUDIO_MASTER` is the absolute timeline. Do not trim, stretch, regenerate, or retime it to fit visuals.
5. `SUBTITLE_MASTER` is the only subtitle timing source. Never infer precise timing from `VOICE_MASTER`.
6. `EDIT_BLUEPRINT` is the structural edit contract. Visual priority is AV Anchor, then Evidence Visual, then Ambient Gameplay.
7. Build V0 as a structural cut. Do not spend the first pass on decorative motion, excessive transitions, or style experiments.
8. Apply revisions only from timecoded `REVIEW_NOTES.md`. Preserve IDs, timestamps, asset filenames, and machine-readable CSV columns.
9. When an asset is missing, stop that shot safely, keep the timeline valid, and report the exact required replacement.
10. Update `BUILD_REPORT.md`, `QC_REPORT.md`, `MISSING_ASSET_REPORT.md`, and `STATUS.md` with actual outputs. A chat response alone is not a production handoff.

The full creative constraints live in `docs/ai-video-production/CREATOR_CONSTITUTION.md`.

## Production Auth and Database Safety

GUCC is a long-term single-user personal system. The production Supabase project is not a disposable test environment.

1. Never call `/auth/v1/signup`, `supabase.auth.signUp`, or equivalent production signup flows for smoke, E2E, integration, or development tests.
2. Never create random or fake-email Auth users such as `gucc-smoke-*`, and never add temporary test users to `app_users` in production.
3. Tests that require creating users must use local Supabase or a separate isolated development project. If neither is available, skip that live-auth case and report it instead of falling back to production.
4. Production smoke tests may validate the existing owner session, API connectivity, read/write contracts, and reversible owner-scoped fixtures, but must not trigger confirmation, recovery, magic-link, or other transactional Auth emails.
5. Keep public signup UI and client signup helpers absent or blocked. Existing owner sign-in, sign-out, session refresh, and deliberate account recovery remain allowed.
6. Temporary production data tests must be clearly marked, reversible, owner-scoped, and cleaned up immediately. Prefer local fixtures whenever possible.
7. Do not change this project from single-user to multi-user behavior unless the user explicitly requests that product change.

## GameUp Git Workspace Policy

`GameUp/Game_up_projects/` is the active, version-controlled Creator workspace.

1. Prefer reading and writing active project research, scripts, subtitles, metadata, prompts, edit blueprints, release packages, code, and small visual assets directly in the repository so GPT/Codex/local work share one source.
2. Never commit production-heavy media or packaged binaries under GameUp: video, audio masters, archive packages, executables, Adobe project binaries, proxies, renders, downloader artifacts, or caches. The root `.gitignore` defines the enforced exclusions.
3. Small PNG/JPG/WebP/SVG assets may be tracked. `npm run check:gameup` enforces a default 20 MiB per tracked GameUp file and is part of CI.
4. Completed projects leave the active tree only after their trackable state is committed. Use `npm run gameup:archive -- --project "<project path>"` to move them to ignored `GameUp/_archive/<year>/` and record the recoverable final Git commit in `GameUp/archive_index.json`.
5. The existing Creator Archive / Google Drive flow is a lightweight project-state archive; it does not upload media masters. Do not treat it as a backup of raw video/audio assets.

