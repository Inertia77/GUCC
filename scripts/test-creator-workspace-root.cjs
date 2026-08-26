"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const moduleSource = fs.readFileSync(path.join(ROOT, "assets/creator-workspace-root.mjs"), "utf8");
const productionHtml = fs.readFileSync(path.join(ROOT, "apps/video-workspace/production-system/index.html"), "utf8");
const creatorEdge = fs.readFileSync(path.join(ROOT, "supabase/functions/creator-project-api/index.ts"), "utf8");

// Production must load the Phase 2A.1 Workspace Root UI.
assert.match(productionHtml, /creator-workspace-root\.mjs\?v=1/);

// It must reuse the same persistent browser device identity as the Creator bridge.
assert.match(moduleSource, /gucc_creator_device_id_v1/);
assert.match(moduleSource, /gucc_creator_workspace_root_v1/);
assert.match(moduleSource, /web_\$\{/);

// Registration is explicitly user-declared metadata, never a fake filesystem scan.
assert.match(moduleSource, /本机工作区登记/);
assert.match(moduleSource, /这是“登记”，不是扫描/);
assert.match(moduleSource, /workspaceRootSource:\s*"user-declared-web"/);
assert.match(moduleSource, /workspaceRootVerified:\s*false/);
assert.match(moduleSource, /filesystemObservation:\s*false/);
assert.doesNotMatch(moduleSource, /showDirectoryPicker|FileSystemDirectoryHandle|getFile\(|createWritable\(/);

// Saving uses the existing Creator API device contract and contains no file-location or media-upload behavior.
assert.match(moduleSource, /creatorApi\("registerDevice"/);
assert.match(moduleSource, /device:\s*deviceDescriptor\(config, true\)/);
assert.doesNotMatch(moduleSource, /saveFileLocation|base64|multipart\/form-data|arrayBuffer\(\)|formData\(\)/i);

// Cloud hydration may reuse a previously registered root, but must not invent one.
assert.match(moduleSource, /if \(!local\.workspaceRoot && cloud\.workspace_root\)/);
assert.doesNotMatch(moduleSource, /workspaceRoot\s*=\s*["'`]D:/i);

// Server contract must still support the fields used by this browser UI.
assert.match(creatorEdge, /async function registerDevice\(/);
assert.match(creatorEdge, /descriptor\.workspaceRoot/);
assert.match(creatorEdge, /workspace_root/);

console.log("Creator Workspace Root registration contract passed.");
