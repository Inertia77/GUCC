# GUCC Unified Creator Context — Phase 1

This first incremental change introduces `assets/creator-shared-context.js`, a browser-only navigation preference for `projectId` and `videoId`.

- It is **not** a second project registry, cloud synchronization, or a claim that cover/publishing drafts are connected.
- The existing Supabase `creator_projects` root and Creator OS snapshots remain authoritative; no production records or locks are modified.
- The context is scoped to the same browser/origin, is carried through project/video URL parameters, and never writes project records.
- Future phases must load and validate project/video membership from authenticated Supabase, implement explicit selectors and per-video deliverables, and only then wire fixed Studio, cover generator, and Publish Console to persisted records.
- Cross-device context requires an authenticated backend preference or explicit URL; localStorage alone is not cross-device sync.

## Acceptance tests for next phases
1. One project, two videos: independent script/subtitle/visual/audio/cover/publish states; no cross-video overwrites.
2. All tools open the same selected project and video, including completed/archived projects in read-only-safe mode.
3. Existing fixed Studio drafts, cover JSON, publish drafts, and Creator OS locks survive migration.
4. File metadata is linked to actual artifacts; generated output never falsely counts as approved.
5. Concurrent edits use scoped revision/CAS, not whole-project last-write-wins.
6. Real browser login, mobile, refresh, multi-tab and two-device conflict flows are verified before production rollout.
