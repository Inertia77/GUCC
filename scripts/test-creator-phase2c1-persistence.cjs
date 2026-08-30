"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Persistence = require("./creator-phase2c1-persistence.cjs");

const PROJECT_ID = "TEST_Phase2C1_LocalBootstrap";
const VIDEO_PATH = String.raw`C:\GUCC\TEST\09_FINAL\VIDEO_V1.mp4`;

function installBrowserGlobals(store, domVideoPath = VIDEO_PATH) {
  global.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
  };
  global.document = {
    querySelector(selector) {
      if (selector === "#localVideoPath") return { value: domVideoPath };
      return null;
    },
  };
}

function removeBrowserGlobals() {
  delete global.localStorage;
  delete global.document;
}

(async () => {
  const store = new Map();
  store.set(Persistence.PUBLISH_STATE_KEY, JSON.stringify({
    common: { videoPath: "", coverPath: "" },
    source: { creatorProjectId: PROJECT_ID, workspaceVersion: "production-system-v1" },
  }));
  store.set(Persistence.PROVENANCE_KEY, JSON.stringify({
    [PROJECT_ID]: {
      video: { path: VIDEO_PATH, source: "canonical", updatedAt: "2026-08-31T00:00:00.000Z" },
    },
  }));

  installBrowserGlobals(store);
  try {
    const early = Persistence.persistenceProbe({
      projectId: PROJECT_ID,
      publishKey: Persistence.PUBLISH_STATE_KEY,
      provenanceKey: Persistence.PROVENANCE_KEY,
    });
    assert.equal(early, false, "DOM + synchronous provenance must not count as persisted while debounced Publish state is still stale");

    let conditionChecks = 0;
    let persistenceCommitted = false;
    const fakePage = {
      async waitForFunction(predicate, args, options) {
        assert.equal(options.timeout, 3000, "field persistence wait must stay bounded to the formal 3s condition timeout");
        conditionChecks += 1;
        assert.equal(predicate(args), false, "first condition check must observe the real stale-publish-state intermediate state");

        const publish = JSON.parse(store.get(Persistence.PUBLISH_STATE_KEY));
        publish.common.videoPath = VIDEO_PATH;
        store.set(Persistence.PUBLISH_STATE_KEY, JSON.stringify(publish));
        persistenceCommitted = true;

        conditionChecks += 1;
        const ready = predicate(args);
        assert.ok(ready, "condition must become truthy only after debounced Publish localStorage catches up");
        return {
          async jsonValue() { return ready; },
          async dispose() {},
        };
      },
    };

    const evidence = await Persistence.waitForPublishPersistence(fakePage, { projectId: PROJECT_ID, timeoutMs: 3000 });
    assert.equal(persistenceCommitted, true);
    assert.equal(conditionChecks, 2, "condition wait must observe stale then converged persistence rather than sleeping blindly");
    assert.equal(evidence.domVideoPath, VIDEO_PATH);
    assert.equal(evidence.persistedVideoPath, VIDEO_PATH);
    assert.equal(evidence.provenanceVideoPath, VIDEO_PATH);
    assert.equal(evidence.publishState.common.videoPath, VIDEO_PATH);
    assert.equal(evidence.provenanceRecord.path, VIDEO_PATH);
    assert.equal(Persistence.assertProvenanceSeparated(evidence), true, "provenance metadata must stay outside Publish runtime state");

    const leaked = {
      ...evidence,
      publishState: {
        ...evidence.publishState,
        common: { ...evidence.publishState.common, autoDiscovered: { video: true } },
      },
    };
    assert.throws(
      () => Persistence.assertProvenanceSeparated(leaked),
      (error) => error?.code === "PUBLISH_PROVENANCE_METADATA_LEAK" && error.paths.includes("common.autoDiscovered"),
      "field contract must reject provenance metadata embedded into Publish common/source",
    );
  } finally {
    removeBrowserGlobals();
  }

  const helperSource = fs.readFileSync(path.join(__dirname, "creator-phase2c1-persistence.cjs"), "utf8");
  assert.doesNotMatch(helperSource, /setTimeout\s*\(|sleep\s*\(/, "persistence regression must use a condition wait, not a fixed delay");

  const smokeSource = fs.readFileSync(path.join(__dirname, "creator-phase2c1-field-smoke.cjs"), "utf8");
  assert.match(smokeSource, /waitForPublishPersistence/, "Windows field smoke must wait for debounced Publish localStorage convergence before provenance equality assertions");
  assert.match(smokeSource, /assertProvenanceSeparated/, "Windows field smoke must verify provenance metadata remains outside Publish state");

  console.log("Creator Phase 2C.1 Publish persistence race regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
