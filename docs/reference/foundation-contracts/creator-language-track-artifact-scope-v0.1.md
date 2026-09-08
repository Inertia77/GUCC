# Creator Language Track + Scoped Artifact Identity Foundation v0.1

Status: **WP_GLOB_002 contract**

This contract extends the accepted distribution identity model without turning the current Production state machine into a multilingual workflow.

## 1. Identity ladder

```text
Content Project Root
  ├─ Language Track: ZH
  ├─ Language Track: JA
  └─ Language Track: EN

Content Project Root
  ├─ Distribution Variant
  ├─ Channel
  └─ Publication Instance
```

A Language Track is a child identity of a Content Project Root. It is **not** a Distribution Variant and it is **not** a separate Creator Project.

Do not create ZH / JA / EN Creator Projects just to represent localization.

## 2. Language Track identity

`creator_language_tracks` provides stable identities such as:

```text
ZH_SOURCE
JA
EN
KO
FR
ES
DE
```

`language_code` is open-ended language/locale metadata. The database must not hard-code a three-language universe and must not mix language identity with Platform identity.

A project may have many tracks, but at most one `is_source=true` track.

WP_GLOB_002 does not implement translation, dubbing, recording, subtitle generation, or child locks.

## 3. Scoped Logical Artifact identity

`creator_project_files` remains the single Project-owned Logical Artifact Registry. It gains explicit scope:

```text
Project ID
+ Artifact Scope Type
+ Artifact Scope ID
+ File Key
```

The canonical unique identity is:

```text
(project_id, artifact_scope_type, artifact_scope_id, file_key)
```

Implemented scope identities in this WP:

- `project`
- `language_track`

Reserved for later architecture:

- `visual_master`
- `variant`

Reserved names do not mean their child workflow is implemented.

## 4. Project scope

Legacy/default Project artifacts are normalized to:

```text
artifact_scope_type = project
artifact_scope_id   = project_id
```

All existing logical-file IDs are preserved in place. Existing rows are not deleted/reinserted.

The current Project-level artifacts remain valid compatibility identities, including:

- `VOICE_MASTER`
- `AUDIO_MASTER`
- `SUBTITLE_MASTER`
- `TIMELINE_SENTENCE`
- `TRANSCRIPT_ALIGNED`
- `ALIGNMENT_REPORT`
- `VIDEO_V1`

## 5. Language Track scope

A Language Track artifact uses:

```text
artifact_scope_type = language_track
artifact_scope_id   = creator_language_tracks.language_track_id
```

The track must belong to the same `project_id` and `owner_user_id` as the logical artifact.

This makes the following identities independent:

```text
Project / project / <project_id> / AUDIO_MASTER
Project / language_track / <ZH track id> / AUDIO_MASTER
Project / language_track / <JA track id> / AUDIO_MASTER
Project / language_track / <EN track id> / AUDIO_MASTER
```

The same applies to `SUBTITLE_MASTER` and the four-artifact Timeline Bundle.

## 6. Never encode scope in file_key

Forbidden:

```text
AUDIO_MASTER_ZH
AUDIO_MASTER_JA
AUDIO_MASTER_EN
SUBTITLE_MASTER_ZH
SUBTITLE_MASTER_JA
SUBTITLE_MASTER_EN
```

Language belongs in the scope identity, not in a file-key suffix.

## 7. Legacy Production compatibility

Current browser/Production `project.files` remains the Legacy/default Project-scope projection.

Legacy `saveProject` callers may omit scope fields. The server/RPC interprets missing scope as:

```text
artifact_scope_type = project
artifact_scope_id   = project_id
```

The revision RPC upserts on the four-part scoped identity, so a Legacy Project save cannot overwrite a Language Track artifact with the same `file_key`.

The Project-data prune trigger also prunes only Project-scope artifacts. Child-scoped artifacts are not deleted merely because `project_data.files` does not list them.

## 8. API compatibility projection

The current Creator API keeps its existing response contract:

- `dashboard().files` = Project-scope compatibility files only.
- `getProject().files` = Project-scope compatibility files only.
- `ownedLogicalFile(projectId,fileKey)` = explicit Project-scope lookup.

`getProject()` may additionally expose:

- `languageTracks`
- `scopedArtifacts`

as additive future-facing projections without changing existing `files` semantics.

## 9. Timeline boundary

Phase 2C.2 remains the **Legacy/default Project Timeline Compatibility Layer**.

The current top-level 23-state Production workflow does not change in WP_GLOB_002. No states such as `JA_AUDIO_LOCKED`, `EN_TIMELINE_LOCKED`, or `LANGUAGE_SCRIPTING` are added to `creator_projects.current_state`.

Language Track child state/locks are a later concern. A future child workflow may define Language Script / Voice / Timeline locks under the track identity, but this WP deliberately does not implement them.

## 10. Local Workspace boundary

WP_GLOB_002 does not change local directories or watchers.

Current paths remain:

```text
02_SCRIPT
03_AUDIO
04_SUBTITLES
```

Do not introduce `ZH/`, `JA/`, `EN/` local folders yet. Multilingual local layout belongs to a later explicitly approved Work Package.

## 11. Storage boundary

Unchanged:

```text
Local machine = Large Media + active production files
Supabase      = State + Identity + Metadata
Google Drive  = Lightweight Project Archive
```

Scoped artifact rows are logical metadata identities only. They do not store media bytes, Supabase Storage objects, or absolute local paths.

## 12. Visual Master / Variant boundary

`visual_master` and `variant` are reserved artifact scope names so future architecture has stable vocabulary.

WP_GLOB_002 does **not** create a Visual Master table, Visual Master Timeline, Variant Rendering, multilingual Production UI, or publishing globalization.

The next architecture review must decide those identities before they become writable workflow scopes.
