# Creator OS stabilization: operation and release checks

Daily progress comes from `creator_deliverable_records` grouped by registered video. Prompt node completion is an optional execution metric. Management lifecycle comes from snapshot `deletedAt`, `archivedAt`, then `completedAt`; `creator_projects.current_state` continues to represent the legacy production stage. Completing a project never rewrites deliverables or workflow nodes.

Manual confirmation requires no attachment. Optional references are location hints; a human confirmation is not a claim of file inspection. Reopening retains the immutable confirmed revision. Shared editors continue to use expected revision / CAS and per-project, per-video identities.

The Publish Console's “登记当前状态 · 保留历史” records an owner's external platform result. It does not upload or publish. Each action creates an immutable publication event and package snapshot in the existing distribution tables. Failures, retries and corrections retain predecessors. Performance snapshots can explicitly select a publication and synchronize to linked performance reports. Blank actual publication times remain blank; confirmation time is recorded separately.

Character calibration keeps choices local until “保存已选…并回读核对”. Only selected rows are saved. Explicit owner confirmation records verification metadata; preexisting states are not backfilled as verified. A changed row invalidates its old verification. Notes are preserved and expected update times prevent stale saves.

## Deployment prerequisite

GitHub Pages Settings → Build and deployment → Source must be **GitHub Actions**. The `pages-source` CI job verifies this and attempts to switch it; switching requires repository administration permission. A 403 is a blocking environment failure, not evidence of a completed deployment gate. Do not merge a release while this check fails and the legacy main-branch publishing source remains enabled.

After Source is GitHub Actions, main deployment requires `test` and `pages-source`; PR/fix pushes cannot deploy. Before publishing, the workflow checks that its SHA remains the current main SHA. The deployed `release.json`, HTML/JS/CSS release parameters, exact commit smoke check and bounded Service Worker caches identify the release. Worker updates preserve localStorage/IndexedDB drafts. Legacy worker test setup deduplicates the historical shell list to exercise the old caching strategy; the production fix also prevents duplicate requests from blocking installation.

Repository branch protection/rulesets still require an administrator to verify. Require the `test` check on main and prevent bypasses as appropriate for the owner's workflow. Workflow dependencies alone do not protect against an administrator changing the publishing source or workflow.

Rollback SQL is under `supabase/rollback/`. It restores earlier RPC behavior and disables manual writes while retaining additive identities and audit/history data. Do not delete publication history or restore a whole project snapshot after later owner edits; any data restoration must compare the current revision and preserve subsequent work.
