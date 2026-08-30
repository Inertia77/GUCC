"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const entry = path.join(__dirname, "creator-local-agent", "entry.cjs");

const result = spawnSync(process.execPath, [entry, "--definitely-invalid-option"], {
  cwd: root,
  encoding: "utf8",
  timeout: 10000,
});

if (result.error) throw result.error;
assert.notEqual(result.status, 0, "creator:agent wrapper must execute the legacy Agent parser instead of silently exiting");
assert.match(`${result.stdout || ""}\n${result.stderr || ""}`, /Unknown option: --definitely-invalid-option/, "legacy Agent parse errors must propagate through entry.cjs");

console.log("Creator Agent entrypoint regression test passed");
