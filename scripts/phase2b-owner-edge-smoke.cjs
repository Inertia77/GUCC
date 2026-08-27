#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const Engine = require(path.join(ROOT, "apps/video-workspace/production-system/engine.js"));
const Cloud = require(path.join(ROOT, "scripts/creator-local-agent/cloud.cjs"));

const OIDC_AUDIENCE = "gucc-phase2b-owner-smoke";
const BOOTSTRAP_URL = `${Cloud.SUPABASE_URL}/functions/v1/creator-smoke-bootstrap`;

function randomHex(bytes = 8) { return crypto.randomBytes(bytes).toString("hex"); }

async function githubOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error("GitHub Actions OIDC environment is unavailable");
  const url = new URL(requestUrl);
  url.searchParams.set("audience", OIDC_AUDIENCE);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${requestToken}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.value) throw new Error(`GitHub OIDC token request failed (${response.status})`);
  return payload.value;
}

async function bootstrap(action, payload = {}) {
  const oidc = await githubOidcToken();
  const response = await fetch(BOOTSTRAP_URL, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${oidc}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Smoke bootstrap failed (${response.status})`);
  return data;
}

async function expectCloudError(label, fn, status, pattern) {
  try {
    await fn();
    assert.fail(`${label}: unexpectedly succeeded`);
  } catch (error) {
    if (error && error.code === "ERR_ASSERTION") throw error;
    assert(error instanceof Cloud.CloudError, `${label}: expected CloudError`);
    assert.equal(error.status, status, `${label}: wrong HTTP status`);
    assert.match(String(error.message || ""), pattern, `${label}: wrong error message`);
  }
  console.log(`${label}=1`);
}

async function signOutLocal(accessToken) {
  if (!accessToken) return;
  const response = await fetch(`${Cloud.SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: Cloud.SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Local owner smoke sign-out failed (${response.status})`);
}

async function main() {
  const suffix = `${Date.now().toString(36)}_${randomHex(4)}`;
  const projectId = `TEST_phase2b_owner_edge_${suffix}`;
  const deviceId = `web_phase2b_owner_edge_${suffix}`;
  let accessToken = "";
  let refreshToken = "";
  let mainError = null;

  try {
    const session = await bootstrap("ownerSession");
    assert(session.userId, "owner bootstrap returned no user id");
    assert(session.accessToken && session.refreshToken, "owner bootstrap returned no session");
    accessToken = session.accessToken;
    refreshToken = session.refreshToken;

    const client = new Cloud.CreatorCloudClient({ refreshToken });
    client.accessToken = accessToken;

    const ping = await client.ping();
    assert.equal(ping.ok, true);
    assert.equal(ping.role, "owner");
    assert.equal(ping.user.id, session.userId);
    console.log("SMOKE_EXISTING_OWNER_SESSION=1");

    const project = Engine.createProject({
      projectId,
      name: "GUCC Phase 2B Owner Edge Smoke",
      game: "TEST",
      topic: "Authenticated archive state gate",
    });
    project.currentState = "PUBLISHED";
    project.updatedAt = new Date().toISOString();

    const saved = await client.api("saveProject", {
      projectData: project,
      baseRevision: 0,
      deviceId,
      device: { deviceId, label: "GUCC Phase 2B Owner Edge Smoke", deviceKind: "web", platform: "github-actions/ubuntu" },
    });
    assert.equal(saved.project.current_state, "PUBLISHED");
    assert.equal(saved.revision, 1);
    console.log("SMOKE_OWNER_SAVE_PROJECT=1");

    const forgedArchived = structuredClone(project);
    forgedArchived.currentState = "ARCHIVED";
    forgedArchived.integration = {
      ...(forgedArchived.integration || {}),
      archive: {
        status: "published",
        provider: "google_drive",
        folderId: "forged-folder",
        folderUrl: "https://drive.google.com/drive/folders/forged-folder",
        mainFileId: "forged-file",
        mainFileUrl: "https://drive.google.com/file/d/forged-file/view",
        verifiedAt: new Date().toISOString(),
        checksum: "sha256:forged",
      },
    };
    await expectCloudError(
      "SMOKE_GENERIC_ARCHIVE_BYPASS_REJECTED",
      () => client.api("saveProject", { projectData: forgedArchived, baseRevision: 1, deviceId }),
      409,
      /Generic saveProject cannot enter ARCHIVED/i,
    );

    await expectCloudError(
      "SMOKE_MANUAL_OVERRIDE_REASON_REQUIRED",
      () => client.api("manualArchiveOverride", { projectId, baseRevision: 1, reason: "" }),
      400,
      /explicit reason/i,
    );

    let result = await client.api("manualArchiveOverride", {
      projectId,
      baseRevision: 1,
      reason: "Phase 2B authenticated production smoke",
    });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "manual_override");
    assert.equal(result.revision, 2);
    console.log("SMOKE_MANUAL_OVERRIDE_ARCHIVED=1");

    result = await client.api("requestArchive", { projectId, baseRevision: result.revision });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "pending");
    console.log("SMOKE_ARCHIVED_PENDING=1");

    result = await client.api("beginArchiveGeneration", { projectId, baseRevision: result.revision });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "generating");
    console.log("SMOKE_ARCHIVED_GENERATING=1");

    result = await client.api("recordArchiveGenerated", {
      projectId,
      baseRevision: result.revision,
      archive: {
        mainFilename: "phase2b-owner-smoke.md",
        totalBytes: 128,
        fingerprint: `sha256:${"a".repeat(64)}`,
        warnings: [],
      },
    });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "generated");
    console.log("SMOKE_ARCHIVED_GENERATED=1");

    result = await client.api("recordArchiveFailed", {
      projectId,
      baseRevision: result.revision,
      error: "Intentional reversible Phase 2B authenticated smoke failure",
    });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "failed");
    console.log("SMOKE_ARCHIVED_FAILED_STAYS_ARCHIVED=1");

    result = await client.api("manualArchiveOverride", {
      projectId,
      baseRevision: result.revision,
      reason: "Phase 2B authenticated smoke final reset",
    });
    assert.equal(result.project.current_state, "ARCHIVED");
    assert.equal(result.archive.status, "manual_override");

    const stalePublished = structuredClone(project);
    stalePublished.currentState = "PUBLISHED";
    await expectCloudError(
      "SMOKE_GENERIC_REOPEN_REJECTED",
      () => client.api("saveProject", { projectData: stalePublished, baseRevision: result.revision, deviceId }),
      409,
      /cannot reopen an ARCHIVED project/i,
    );

    const snapshot = await client.getProject(projectId);
    assert.equal(snapshot.project.current_state, "ARCHIVED");
    const eventTypes = new Set((snapshot.events || []).map((event) => event.event_type));
    assert(eventTypes.has("PROJECT_ARCHIVE_MANUAL_OVERRIDE"));
    assert(eventTypes.has("PROJECT_ARCHIVE_FAILED"));
    assert(eventTypes.has("STATE_CHANGED"));
    console.log("SMOKE_ARCHIVE_EVENTS_AUDITED=1");
    console.log("SMOKE_PASS=1");
  } catch (error) {
    mainError = error;
  } finally {
    try {
      await bootstrap("cleanup", { projectId, deviceId });
      console.log("SMOKE_REMOTE_FIXTURE_CLEANED=1");
    } catch (cleanupError) {
      if (!mainError) mainError = cleanupError;
      else console.error(`SMOKE_CLEANUP_FAIL=${cleanupError.message || cleanupError}`);
    }
    try {
      await signOutLocal(accessToken);
      if (accessToken) console.log("SMOKE_OWNER_SESSION_SIGNED_OUT_LOCAL=1");
    } catch (signOutError) {
      if (!mainError) mainError = signOutError;
      else console.error(`SMOKE_SIGNOUT_FAIL=${signOutError.message || signOutError}`);
    }
  }

  if (mainError) throw mainError;
}

main().catch((error) => {
  console.error(`SMOKE_FAIL=${error.stack || error.message || error}`);
  process.exit(1);
});
