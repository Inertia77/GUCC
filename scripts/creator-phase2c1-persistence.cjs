"use strict";

const PUBLISH_STATE_KEY = "gucc_publish_console_v1";
const PROVENANCE_KEY = "gucc_publish_asset_discovery_v1";
const DEFAULT_TIMEOUT_MS = 3000;

function persistenceProbe({ projectId = "", publishKey = PUBLISH_STATE_KEY, provenanceKey = PROVENANCE_KEY } = {}) {
  let publishState = null;
  let provenanceState = null;
  try { publishState = JSON.parse(localStorage.getItem(publishKey) || "null"); } catch {}
  try { provenanceState = JSON.parse(localStorage.getItem(provenanceKey) || "{}"); } catch {}

  const domVideoPath = document.querySelector("#localVideoPath")?.value || "";
  const persistedVideoPath = publishState?.common?.videoPath || "";
  const resolvedProjectId = projectId || publishState?.source?.creatorProjectId || "";
  const provenanceRecord = resolvedProjectId ? provenanceState?.[resolvedProjectId]?.video || null : null;
  const provenanceVideoPath = provenanceRecord?.path || "";

  if (!domVideoPath || persistedVideoPath !== domVideoPath || provenanceVideoPath !== domVideoPath) return false;

  return {
    projectId: resolvedProjectId,
    domVideoPath,
    persistedVideoPath,
    provenanceVideoPath,
    publishState,
    provenanceRecord,
  };
}

function provenanceMetadataPaths(publishState) {
  const hits = [];
  const suspicious = (key) => {
    const normalized = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    return normalized.includes("provenance")
      || normalized.includes("autodiscovered")
      || normalized === "discoverysource"
      || normalized === "discoveryupdatedat";
  };
  const walk = (value, prefix) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const next = `${prefix}.${key}`;
      if (suspicious(key)) hits.push(next);
      if (child && typeof child === "object") walk(child, next);
    }
  };
  walk(publishState?.common, "common");
  walk(publishState?.source, "source");
  return hits;
}

async function waitForPublishPersistence(page, { projectId = "", timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let handle;
  try {
    handle = await page.waitForFunction(
      persistenceProbe,
      { projectId, publishKey: PUBLISH_STATE_KEY, provenanceKey: PROVENANCE_KEY },
      { timeout: timeoutMs },
    );
    const result = await handle.jsonValue();
    if (!result) throw new Error("Publish persistence condition resolved without evidence");
    return result;
  } catch (error) {
    const wrapped = new Error(`PUBLISH_PERSISTENCE_TIMEOUT: DOM, publish state and provenance did not converge within ${timeoutMs}ms: ${error?.message || error}`);
    wrapped.code = "PUBLISH_PERSISTENCE_TIMEOUT";
    wrapped.cause = error;
    throw wrapped;
  } finally {
    if (handle?.dispose) await handle.dispose().catch(() => {});
  }
}

function assertProvenanceSeparated(persistence) {
  const leaks = provenanceMetadataPaths(persistence?.publishState);
  if (leaks.length) {
    const error = new Error(`Publish state must not embed discovery provenance metadata: ${leaks.join(", ")}`);
    error.code = "PUBLISH_PROVENANCE_METADATA_LEAK";
    error.paths = leaks;
    throw error;
  }
  return true;
}

module.exports = {
  PUBLISH_STATE_KEY,
  PROVENANCE_KEY,
  DEFAULT_TIMEOUT_MS,
  persistenceProbe,
  provenanceMetadataPaths,
  waitForPublishPersistence,
  assertProvenanceSeparated,
};
