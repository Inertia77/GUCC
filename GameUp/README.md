# GameUp Active Workspace

`GameUp/Game_up_projects/` is the version-controlled workspace for active game-video projects.

## What belongs in Git

Track the assets that benefit from review, diffing, reuse, or direct GPT/Codex editing:

- Markdown / TXT research and scripts
- SRT / VTT subtitles
- JSON / YAML / CSV metadata
- prompts, edit blueprints, timelines and release packages
- code and automation scripts
- small PNG / JPG / WebP / SVG visual assets

The repository guard uses **20 MiB per tracked GameUp file** by default. Override only for a deliberate local check with `GUCC_GAMEUP_MAX_FILE_MB`.

## What stays out of ordinary Git

The root `.gitignore` excludes video, audio masters, packaged archives, editor project binaries, download caches, proxies, renders and similar production-heavy assets.

Do not use ordinary Git as the media master store.

## Completed projects

After a project reaches FINAL / QC_PASS / PUBLISHED:

1. Make sure all trackable project files are committed.
2. Run the existing Creator Archive flow when a long-term Drive archive is required:
   `npm run creator:archive -- --once --project <projectId>`
3. Move the local completed project out of the active workspace:
   `npm run gameup:archive -- --project "<project path>"`

The local move goes to `GameUp/_archive/<year>/...`, which is intentionally ignored by Git.
`GameUp/archive_index.json` keeps the last Git commit that still contains the project, so GPT or a human can recover the final tracked snapshot from repository history.

## Safety checks

Run:

`npm run check:gameup`

The same guard is included in the repository test suite used by CI.
