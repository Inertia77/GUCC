# GUCC Unified Creative Workspace

The original PR #52 scaffolding has been reviewed and extended into this integration. `creator_projects` remains the project identity. `creator_video_workspaces` is the stable child-video registry. All tools read the same authenticated project list, including completed and archived projects.

## User workflow

Choose or create a project, select a video, then use any of the six deliverables. The shared surface is available on Portal, fixed Studio, Creator OS, Cover Generator and Publish Console. Search and recents belong to the current owner. URLs carry the validated project/video pair; URL input alone never creates an identity.

Every deliverable stores its five-state progress, content, actual prompt, artifact metadata, review note, revision and approval/lock evidence. Uploaded media stays on the device. Actual browser File or generated Blob bytes produce SHA-256 observations. Typing a local path remains an unverified reference. AI node DONE remains a separate receipt, never human approval. Subtitle confirmation requires an observed recording plus explicit timing review.

Each successful save appends an immutable row in `creator_deliverable_versions`. Confirmed outputs are locked; explicit reopening requires a reason and retains the prior revision. Revision conflicts retain the browser editor and require explicit reconciliation against the newly read cloud version. Request IDs make network retries idempotent.

## Tool integration

- Studio retains six-outcome mode, full task catalog, independent browser drafts and import/export. Project/video IDs and confirmed project context feed prompts. The shared outcome editor accepts text and actual files.
- Creator OS retains legacy Prompt Flow and lifecycle. Video selection scopes the next task without modifying other branches. Official six-outcome counts are displayed separately from AI node receipts.
- Cover canvases use separate browser keys for each project/video. The pre-integration canvas is backed up. Same-video cross-tab edits refuse stale overwrite. Exported image bytes and aspect ratios are associated as **pending review**; canvas state is not a finished image. Large image/media bytes never enter Supabase.
- Publish Console retains video-scoped cloud drafts and six-platform fields. Confirmed package text is inherited into empty platform fields, preserving authored drafts. New YouTube drafts default to Traditional Chinese. A bundle export creates a reviewable deliverable. A user-entered published status with an HTTPS post URL appends a `VIDEO_PUBLICATION_RECORDED` event to the existing project ledger; this integration performs no platform upload or publication.

## Identity and historical compatibility

Snapshot saves register only explicit structured video IDs. Existing canonical videos are merged back into snapshots, so a stale old client cannot remove them by sending an empty videos array. New video registration patches only that list under the project/snapshot locks and expected revision. Six-outcome nodes for a new video are appended using snapshot CAS; existing flow nodes remain intact.

The historical dual-video project was verified against its original `rawVideoContract.VIDEO_TRACKS`, matching existing flow branches:

| Video ID from original contract | Existing branch |
| --- | --- |
| `ZZZ-3.3-PHOENIX-PREVIEW` | `FIONI` |
| `ZZZ-3.3-SEVERIAN-PREVIEW` | `SEVERIAN` |

The project root ID, existing nodes, Locks, available-artifact strings and file records were preserved. No names were used to invent replacement IDs. Other ambiguous branch-only records remain unregistered and visibly require identity review.

## Database recovery and verification

Production migration versions are mirrored by filenames. Before changes, a private checkpoint captures roots, snapshots, videos, deliverables, files, publish drafts and replaced function definitions. It has no browser-role access. Rollback of application code does not require deleting the added tables. Restore any project snapshot only after comparing the current revision and preserving newer edits; never blanket-replace the production database.

`supabase/sql/unified_workspace_acceptance.sql` runs owner-scoped fixtures inside a transaction and rolls them back. It tests video isolation, revision rejection, idempotent requests, file evidence, file metadata registration, immutable history, lock/reopen, subtitle recording and canonical-video preservation. No Auth users or Auth emails are created.

RLS authorization reads private roots/app-users through a narrowly scoped private helper. Root tables remain inaccessible to the browser. Deliverable writes use a private active-owner function behind an invoker RPC; direct record UPDATE/INSERT is revoked.

Browser regression: `scripts/test-creator-unified-browser.cjs` uses real Chromium with isolated APIs, desktop/mobile widths, same-project dual videos, cross-tool drafts, real exported cover bytes, refresh, independent browser context and conflict reconciliation. Existing GUCC browser suites and `npm test` remain required by CI.

Production signed-in browser acceptance needs the existing owner session. A browser stopped at GUCC's access-key page cannot establish this result. The report must distinguish isolated-browser results, real database transactional results, Pages deployment and authenticated production UI acceptance.
