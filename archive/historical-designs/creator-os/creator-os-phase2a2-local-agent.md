# GUCC Creator OS Phase 2A.2 — Local Agent / File Observation

## Purpose

Phase 2A.2 gives GUCC a truthful observation layer for local Creator files.

- Local files stay local.
- Supabase stores project state, history, device identity, and file metadata.
- `creator_project_files` remains the logical Artifact Contract.
- `creator_file_locations` records physical observations.
- Physical presence never changes logical `status` and never crosses Content / Script / Audio / Picture / Publish locks.

Google Drive and Baidu Cloud are explicitly outside this phase.

## Start

```bash
npm run creator:agent -- --setup
npm run creator:agent -- --once
npm run creator:agent -- --watch
```

Optional flags:

```text
--workspace <path>
--device-label <label>
--verbose
--no-hash
--update-cloud-workspace-root
--config <path>
```

`--setup` validates the Workspace Root and signs in with the same Supabase email/password flow as GUCC Command Center. The password is never saved. The user refresh token is stored under `~/.gucc/creator-agent.json`; the file is created with restrictive permissions where the operating system supports POSIX modes. No service-role key exists in the Local Agent.

Each Agent installation has one stable `agent_<id>` device identity. The ID is generated once and reused.

## Discovery

The Agent searches the configured Workspace Root for project directories containing:

```text
00_CONTROL/PROJECT_DATA.json
```

A valid file must contain `projectId`. Broken JSON, missing IDs, duplicate project IDs, symlink/junction discovery escapes, and unreadable directories are warnings or hard errors; the Agent does not guess.

After discovering a local Project ID, the Agent asks `creator-project-api/getProject` for the cloud `creator_project_files` rows and observes only those registered logical artifacts. It does not recursively index `05_ASSETS`.

## Observation

For each logical artifact the Agent checks the exact canonical project-relative path, for example:

```text
03_AUDIO/AUDIO_MASTER.wav
04_SUBTITLES/SUBTITLE_MASTER.srt
09_FINAL/VIDEO_V1.mp4
```

Uploaded metadata is limited to:

- file key / logical artifact relationship
- device ID
- project-relative path
- filename
- availability (`present`, `missing`, `unknown`, `stale`)
- MIME type
- size
- mtime
- SHA-256 when enabled and below the hash threshold
- observation time
- small observation metadata such as hash strategy / Agent version

No file bytes, Blob, base64 media, multipart body, or absolute local file path is sent in a File Location payload.

### Availability

- `present`: this scan verified the file.
- `missing`: this device had previously observed the artifact and the expected path is now absent.
- `unknown`: no prior presence has been proven, or the path is not yet verifiable.
- `stale`: supported cloud state for observations that are no longer current; the first Agent version does not manufacture stale rows during ordinary successful scans.

Logical Artifact `status` remains a separate concept.

## Hash cost control

Default full SHA-256 limit: 128 MiB.

Files at or below the limit are hashed once. A local cache stores `size + mtime + checksum`; unchanged files reuse the checksum. Larger files record size/mtime and use `hashStrategy=skipped-large` in v1. `--no-hash` disables hashing entirely.

## Watch mode

Watch mode performs one initial reconciliation, then watches only the project root and directories containing registered canonical artifacts. `05_ASSETS` is excluded. Events are coalesced with a 1.5 second debounce. A full contract reconciliation runs every 15 minutes to recover from missed Windows `fs.watch` events. After reconciliation, canonical directory watchers are rebuilt so newly discovered projects/directories do not require an Agent restart.

This is intentionally not a high-frequency full-disk poller.

## File events

`creator-project-api` writes an event only for meaningful transitions:

- `FILE_FIRST_SEEN`
- `FILE_DISAPPEARED`
- `FILE_REAPPEARED`
- `FILE_REPLACED`

Repeated unchanged observations only refresh `creator_file_locations.observed_at` and do not create scan spam.

The single observation write and optional FILE event are committed by `save_creator_file_location_observation(...)` in one database transaction. The function is callable only by `service_role`; Local Agent calls the user-authenticated Edge API and never receives that server credential.

## Batch API

The Agent uses:

```json
{
  "action": "saveFileLocationsBatch",
  "projectId": "...",
  "deviceId": "agent_...",
  "locations": []
}
```

Maximum batch size is 100. The Edge API still checks owner, project, logical artifact, device, expected relative path, availability, and metadata for every item. Invalid entries are returned in `errors`; successful entries are explicit in `results`.

## UI

Creator Dashboard shows a per-project Local Agent summary: present / missing / unverified.

Production → Files keeps the existing logical Artifact row and adds:

- `Expected`: canonical logical path + logical status
- `Observed`: device label + physical availability + observed path + last seen + size

A physical file being present never changes Audio Lock, Picture Lock, Publish state, or any logical Ready status.

## Security boundary

The Agent:

- refuses absolute or `..` artifact paths;
- validates real paths remain under Workspace Root and project root;
- skips/rejects symlink or junction escapes;
- never recursively indexes Raw Assets;
- never logs tokens;
- never stores the password;
- never uses `service_role`;
- never uploads file contents;
- never updates Production workflow state or locks.

## Phase 2B handoff

Phase 2B may use the stable Project / Artifact / Device / File Location truth established here to build a lightweight Google Drive Project Knowledge Archive. It should archive small final knowledge artifacts only; it should not turn Drive into media synchronization.
