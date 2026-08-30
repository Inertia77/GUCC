"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs").promises;
const os = require("node:os");
const path = require("node:path");
const Bootstrap = require("./creator-local-agent/workspace-bootstrap.cjs");

const TEST_ID = "project_cloudsnap123";
const CREATED_AT = "2026-08-28T01:02:03.000Z";
const UPDATED_AT = "2026-08-29T04:05:06.000Z";

function cloudSnapshot() {
  return {
    project: {
      project_id: TEST_ID,
      name: "Cloud Snapshot Determinism",
      game: "绝区零",
      topic: "Phase 2C.1 Cloud snapshot regression",
      current_state: "IDEA",
      created_at: CREATED_AT,
      updated_at: UPDATED_AT,
      project_data: {
        projectId: TEST_ID,
        name: "Cloud Snapshot Determinism",
        game: "绝区零",
        topic: "Phase 2C.1 Cloud snapshot regression",
        currentState: "IDEA"
        // Intentionally no createdAt / updatedAt: Production snapshot shape that failed Windows field acceptance.
      }
    }
  };
}

async function readProjectionSet(projectRoot) {
  const files = [
    "00_CONTROL/PROJECT_DATA.json",
    "00_CONTROL/PROJECT_MANIFEST.md",
    "00_CONTROL/STATUS.md"
  ];
  return Object.fromEntries(await Promise.all(files.map(async (relative) => [
    relative,
    await fsp.readFile(path.join(projectRoot, ...relative.split("/")), "utf8")
  ])));
}

(async () => {
  const snapshot = cloudSnapshot();
  const projected = Bootstrap.projectFromSnapshot(snapshot);
  assert.equal(projected.createdAt, CREATED_AT, "Cloud row created_at must be the deterministic createdAt fallback");
  assert.equal(projected.updatedAt, UPDATED_AT, "Cloud row updated_at must be the deterministic updatedAt fallback");

  const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-cloud-snapshot-"));
  try {
    const first = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, snapshot });
    assert.equal(first.conflicts.length, 0, "first Cloud snapshot bootstrap must be conflict-free");
    const before = await readProjectionSet(first.projectRoot);

    const projectData = JSON.parse(before["00_CONTROL/PROJECT_DATA.json"]);
    assert.equal(projectData.createdAt, CREATED_AT, "PROJECT_DATA must preserve stable Cloud created_at fallback");
    assert.equal(projectData.updatedAt, UPDATED_AT, "PROJECT_DATA must preserve stable Cloud updated_at fallback");
    assert.match(before["00_CONTROL/PROJECT_MANIFEST.md"], new RegExp(`created_at: ${CREATED_AT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    const second = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, snapshot });
    const after = await readProjectionSet(second.projectRoot);

    assert.equal(second.projectRoot, first.projectRoot, "same Cloud snapshot must reuse the same local Project Root");
    assert.equal(second.created.length, 0, "second Cloud snapshot bootstrap must create no projection files");
    assert.equal(second.updated.length, 0, "second Cloud snapshot bootstrap must rewrite no projection files");
    assert.equal(second.conflicts.length, 0, "second Cloud snapshot bootstrap must remain conflict-free");
    assert.deepEqual(after, before, "PROJECT_DATA, PROJECT_MANIFEST and STATUS must be byte-identical across identical Cloud snapshot bootstraps");

    const noTimestampSnapshot = {
      project: {
        project_id: "project_cloudsnap_missing_ts",
        name: "Missing Timestamp Snapshot",
        game: "绝区零",
        topic: "deterministic empty fallback",
        current_state: "IDEA",
        project_data: {
          projectId: "project_cloudsnap_missing_ts",
          name: "Missing Timestamp Snapshot",
          game: "绝区零",
          currentState: "IDEA"
        }
      }
    };
    const fallbackA = Bootstrap.projectFromSnapshot(noTimestampSnapshot);
    const fallbackB = Bootstrap.projectFromSnapshot(noTimestampSnapshot);
    assert.equal(fallbackA.createdAt, "", "snapshot normalization must not inject wall-clock createdAt when Cloud timestamps are absent");
    assert.equal(fallbackA.updatedAt, "", "snapshot normalization must not inject wall-clock updatedAt when Cloud timestamps are absent");
    assert.equal(fallbackB.createdAt, fallbackA.createdAt);
    assert.equal(fallbackB.updatedAt, fallbackA.updatedAt);

    console.log("Creator Cloud snapshot bootstrap determinism tests passed");
  } finally {
    await fsp.rm(workspace, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
