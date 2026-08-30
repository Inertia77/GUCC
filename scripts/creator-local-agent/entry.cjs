#!/usr/bin/env node
"use strict";

const path = require("node:path");
const Core = require("./core.cjs");
const Cloud = require("./cloud.cjs");
const Bootstrap = require("./workspace-bootstrap.cjs");
const Agent = require("./index.cjs");

function bootstrapProjectId(argv) {
  const index = argv.indexOf("--bootstrap-project");
  if (index < 0) return "";
  const value = String(argv[index + 1] || "").trim();
  if (!value || value.startsWith("--")) throw new Error("--bootstrap-project requires an explicit Creator projectId");
  return value;
}

async function runBootstrap(projectId, argv) {
  if (argv.some((arg) => ["--setup", "--once", "--watch"].includes(arg))) {
    throw new Error("--bootstrap-project is an explicit standalone operation; do not combine it with --setup/--once/--watch");
  }
  const configIndex = argv.indexOf("--config");
  const configPath = configIndex >= 0 ? path.resolve(String(argv[configIndex + 1] || "")) : Core.CONFIG_PATH;
  const config = await Core.loadConfig(configPath);
  if (!config.refreshToken || !config.workspaceRoot) {
    throw new Error(`Creator Agent is not configured. Run npm run creator:agent -- --setup first (${configPath})`);
  }
  const client = new Cloud.CreatorCloudClient({
    refreshToken: config.refreshToken,
    onRefreshToken: async (refreshToken) => {
      config.refreshToken = refreshToken;
      await Core.saveConfig(config, configPath);
    },
  });
  const snapshot = await client.getProject(projectId);
  const result = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: config.workspaceRoot, snapshot });
  console.log("\nGUCC Creator Project Workspace\n");
  console.log(`Project:   ${result.projectId}`);
  console.log(`Folder:    ${result.projectRoot}`);
  console.log(`Identity:  ${result.canonicalFolderName}${result.reusedLegacyFolder ? " · legacy folder reused" : ""}`);
  console.log(`Created:   ${result.created.length}`);
  console.log(`Updated:   ${result.updated.length}`);
  console.log(`Unchanged: ${result.unchanged.length}`);
  console.log(`Conflicts: ${result.conflicts.length}`);
  if (result.conflicts.length) {
    console.log("Conflicting local files were NOT overwritten:");
    result.conflicts.forEach((relative) => console.log(`- ${relative}`));
    process.exitCode = 2;
  }
}

(async () => {
  const argv = process.argv.slice(2);
  const projectId = bootstrapProjectId(argv);
  if (!projectId) {
    await Agent.main();
    return;
  }
  await runBootstrap(projectId, argv);
})().catch((error) => {
  const message = String(error?.message || error);
  console.error(`\nCreator Agent error: ${message}`);
  if (/refresh token|Invalid login|expired|401/i.test(message)) console.error("Run --setup again if your GUCC login has expired.");
  process.exitCode = 1;
});
