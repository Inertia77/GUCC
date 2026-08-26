# GUCC Creator OS Phase 2A.1 — Workspace Root Registration

## Purpose

Phase 2A.1 makes the current Creator device's local workspace root visible and user-configurable.

It uses the `creator_devices.workspace_root` field introduced by Phase 2A. No new database table or file-scanning subsystem is required.

## Truth boundary

A browser cannot reliably reveal the full operating-system path behind a `FileSystemDirectoryHandle`. Therefore GUCC does **not** claim that selecting a directory in Chrome/Edge proves a path such as `D:\GUCC\Projects`.

The Production UI instead asks the user to declare the root path explicitly.

The saved value is tagged as:

- `workspaceRootSource = user-declared-web`
- `workspaceRootVerified = false`
- `filesystemObservation = false`

This means the cloud record is a device configuration pointer, not filesystem evidence.

## User flow

Production shows a `本机工作区` action.

The dialog displays the stable browser `deviceId` and lets the user enter:

1. a human-readable device label, for example `主力 Windows 创作机`;
2. a Workspace Root, for example `D:\GUCC\Projects`.

The value is stored locally under `gucc_creator_workspace_root_v1` and, when the GUCC session is available, is synchronized through `creator-project-api -> registerDevice`.

If this browser has no local Workspace Root configuration but the same device already has one in Supabase, the UI may hydrate the local setting from that existing device record. It never invents a default path.

## What this phase does not do

Phase 2A.1 does not:

- scan the workspace;
- verify that the declared path exists;
- persist `FileSystemDirectoryHandle` objects;
- create `creator_file_locations` rows;
- inspect media metadata;
- calculate checksums;
- upload local files;
- change the Google Drive archive model.

Those behaviors require an actual trusted local observation layer and belong to a later Local Agent / filesystem-observation phase.
