# GUCC Creator OS Phase 2A — Local-first Foundation

## Status

Phase 2A establishes the data contract for local-first production. It does **not** add a filesystem watcher, Local Agent, media uploader, or Google Drive media archive.

The architectural rule is:

> Logical Artifact != Physical File

GUCC Cloud State records what the project expects, where a real file was observed, and enough metadata to identify that observation. The media bytes stay on the creator's local machine unless the user explicitly archives them elsewhere.

## 1. Logical artifacts remain `creator_project_files`

`creator_project_files` is the canonical project checklist. A row such as:

- `AUDIO_MASTER` → `03_AUDIO/AUDIO_MASTER.wav`
- `SUBTITLE_MASTER` → `04_SUBTITLES/SUBTITLE_MASTER.srt`
- `VIDEO_V1` → `09_FINAL/VIDEO_V1.mp4`

means **the project expects this artifact**.

It does not mean the physical file currently exists.

The legacy columns `relative_path`, `storage_provider`, `provider_file_id`, `provider_url`, `size_bytes`, and `checksum` remain for compatibility. Phase 2A treats them as logical/default/cache metadata rather than authoritative proof of a physical file.

No existing logical-artifact row is deleted or rewritten by this phase.

## 2. Device identity: `creator_devices`

A device row is owner-scoped and keyed by `(owner_user_id, device_id)`.

Important fields:

- `device_id` — stable GUCC device identity such as the existing `web_...` identifier or a future desktop/agent identifier.
- `device_kind` — `web`, `desktop`, `agent`, or `unknown`.
- `label` / `platform` — human-readable context.
- `workspace_root` — optional local Creator workspace root for that device.
- `capabilities` — future capability flags, for example filesystem observation.
- `first_seen_at` / `last_seen_at` — device presence history.

Phase 2A backfills existing non-empty `creator_projects.last_device_id` values into `creator_devices`. This is safe because those values are real sync identities already used by GUCC.

## 3. Physical/provider observation: `creator_file_locations`

A location row points to one logical artifact and one device/provider observation.

Core identity:

- `logical_file_id`
- `project_id`
- `owner_user_id`
- `device_id`
- `storage_provider`

Observation metadata:

- `relative_path`
- `availability`: `unknown`, `present`, `missing`, or `stale`
- `filename`
- `mime_type`
- `size_bytes`
- `checksum`
- `file_modified_at`
- `observed_at`
- provider ID/URL when the provider is not purely local

For local files, `relative_path` is relative to `creator_devices.workspace_root`. Cloud State does not require the full absolute path.

Example:

```text
Device.workspace_root = D:/GUCC/Projects
Project             = Qingxiao Guide
Logical Artifact    = AUDIO_MASTER
Location.relative   = Qingxiao Guide/03_AUDIO/AUDIO_MASTER.wav
```

The file itself remains on the local machine.

## 4. No fabricated migration data

The production database already contains template logical-artifact rows. Most have paths but no provider ID, checksum, or real file size.

Phase 2A intentionally does **not** convert those rows into `creator_file_locations`.

A physical location is created only when a browser/desktop/agent explicitly reports an observation through the Local-first API contract.

This keeps `Missing` honest and prevents GUCC from claiming files exist when it has never observed them.

## 5. Creator API contract

`creator-project-api` remains the single supported Creator cloud boundary.

Existing `saveProject` behavior remains revision-safe. Phase 2A additionally touches/registers the supplied `deviceId` before the project revision RPC.

New actions:

### `registerDevice`

Registers or refreshes an owner-scoped device. The caller may provide label, kind, platform, workspace root, capabilities, and metadata.

### `saveFileLocation`

Upserts one observed location for an existing logical artifact.

Required identity:

- `projectId`
- `fileKey`
- `deviceId`
- `location.relativePath`

`relativePath` must stay inside the workspace root. Absolute Windows/POSIX paths and `..` traversal are rejected by the API.

The API accepts only metadata. It has no base64, multipart, `ArrayBuffer`, `FormData`, or media-byte upload path.

`dashboard` now returns `devices` and `fileLocations` in addition to the existing projects/files/releases payload. `getProject` returns `fileLocations` for the selected project.

## 6. Security boundary

Both new tables have owner-scoped RLS policies, but direct `anon` and `authenticated` CRUD privileges remain revoked to match the existing Creator API architecture.

The Edge Function authenticates the user, checks the GUCC `app_users` gate, and writes through the `service_role` backend path.

Location foreign keys prove that:

- the logical artifact belongs to the same project + owner;
- the project belongs to the same owner;
- the device belongs to the same owner.

## 7. Google Drive role

The existing Drive root stays:

`GUCC Creator Projects / 01_ACTIVE / 02_ARCHIVE / 03_SHARED_ASSETS`

At Phase 2A, `01_ACTIVE` contains no project folders and GUCC does not create or upload media there.

The intended future Drive role remains a **lightweight project archive** for small durable artifacts such as Markdown, JSON, SRT, CSV, manifests, and release metadata. Video/audio/gameplay captures stay local; long-term large-file archival remains outside GUCC automation.

## 8. Deferred work

Not part of Phase 2A Foundation:

- filesystem watcher / Local Agent
- automatic workspace-root discovery
- ffprobe / media inspection
- checksum scanning
- automatic `present/missing/stale` observation
- automatic Google Drive lightweight archive publishing
- any video/audio/raw-footage upload
- Baidu Cloud integration

Those features can now be built on top of stable `Device -> Logical Artifact -> File Location` identities without changing the canonical Creator Project model again.
