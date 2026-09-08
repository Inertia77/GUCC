#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline/promises");
const Core = require("./core.cjs");
const Cloud = require("./cloud.cjs");

function parseArgs(argv) {
  const out = { once: false, watch: false, setup: false, verbose: false, noHash: false, updateCloudWorkspaceRoot: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") out.once = true;
    else if (arg === "--watch") out.watch = true;
    else if (arg === "--setup") out.setup = true;
    else if (arg === "--verbose") out.verbose = true;
    else if (arg === "--no-hash") out.noHash = true;
    else if (arg === "--update-cloud-workspace-root") out.updateCloudWorkspaceRoot = true;
    else if (["--workspace", "--device-label", "--email", "--config"].includes(arg)) out[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!out.once && !out.watch && !out.setup) out.once = true;
  if (out.once && out.watch) throw new Error("Choose either --once or --watch, not both.");
  return out;
}

function logVerbose(args, ...values) { if (args.verbose) console.log(...values); }

async function secretPrompt(label) {
  if (!process.stdin.isTTY) throw new Error(`${label} is required in an interactive terminal.`);
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";
  return await new Promise((resolve, reject) => {
    const cleanup = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.removeListener("data", onData); };
    const onData = (char) => {
      if (char === "\u0003") { cleanup(); process.stdout.write("\n"); reject(new Error("Cancelled")); return; }
      if (char === "\r" || char === "\n") { cleanup(); process.stdout.write("\n"); resolve(value); return; }
      if (char === "\u007f" || char === "\b") { if (value) { value = value.slice(0, -1); process.stdout.write("\b \b"); } return; }
      value += char; process.stdout.write("*");
    };
    process.stdin.on("data", onData);
  });
}

async function setup(args) {
  await Core.ensureConfigDir();
  const configPath = args.config ? path.resolve(args.config) : Core.CONFIG_PATH;
  const current = await Core.loadConfig(configPath);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const label = args.deviceLabel || current.label || await rl.question("Device label [Creator Windows PC]: ") || "Creator Windows PC";
    const workspaceRoot = args.workspace || current.workspaceRoot || await rl.question("Workspace Root: ");
    const validated = await Core.validateWorkspaceRoot(workspaceRoot);
    const email = args.email || current.email || await rl.question("GUCC login email: ");
    rl.pause();
    const password = await secretPrompt("GUCC password (not saved): ");
    const session = await Cloud.passwordLogin(email.trim(), password);
    const config = await Core.saveConfig({
      ...current,
      deviceId: Core.stableDeviceId(current.deviceId),
      label: String(label).trim() || "Creator Windows PC",
      workspaceRoot: validated.root,
      workspaceRealRoot: validated.realRoot,
      email: String(email).trim(),
      refreshToken: session.refresh_token,
      lastSync: current.lastSync || null,
    }, configPath);
    const client = new Cloud.CreatorCloudClient({
      refreshToken: config.refreshToken,
      onRefreshToken: async (refreshToken) => { config.refreshToken = refreshToken; await Core.saveConfig(config, configPath); },
    });
    client.accessToken = session.access_token || "";
    await client.registerDevice(config.deviceId, deviceDescriptor(config, validated));
    console.log("\nGUCC Creator Local Agent configured.");
    console.log(`Device:    ${config.label}`);
    console.log(`Device ID: ${config.deviceId}`);
    console.log(`Workspace: ${validated.root}`);
    console.log(`Config:    ${configPath}`);
    console.log("Password was not saved. Only the user refresh token is stored locally.");
  } finally { rl.close(); }
}

function deviceDescriptor(config, validated) {
  return {
    deviceId: config.deviceId,
    label: config.label || os.hostname(),
    deviceKind: "agent",
    platform: `${process.platform}/${process.arch} Node ${process.versions.node}`,
    workspaceRoot: validated.root,
    capabilities: { filesystemObservation: true, sha256: true, watch: true, rawAssetIndexing: false },
    metadata: { agentVersion: Core.AGENT_VERSION, workspaceRootSource: "local-agent-realpath", workspaceRootVerified: true },
  };
}

async function createRuntime(args) {
  const configPath = args.config ? path.resolve(args.config) : Core.CONFIG_PATH;
  const config = await Core.loadConfig(configPath);
  if (!config.deviceId || !config.workspaceRoot || !config.refreshToken) {
    throw new Error(`Creator Agent is not configured. Run: npm run creator:agent -- --setup`);
  }
  config.deviceId = Core.stableDeviceId(config.deviceId);
  const validated = await Core.validateWorkspaceRoot(args.workspace || config.workspaceRoot);
  if (args.workspace && path.resolve(args.workspace) !== path.resolve(config.workspaceRoot)) {
    config.workspaceRoot = validated.root;
    config.workspaceRealRoot = validated.realRoot;
  }
  if (args.deviceLabel) config.label = args.deviceLabel;
  const client = new Cloud.CreatorCloudClient({
    refreshToken: config.refreshToken,
    onRefreshToken: async (refreshToken) => { config.refreshToken = refreshToken; await Core.saveConfig(config, configPath); },
  });
  await client.refresh();

  let cloudDevice = null;
  try { cloudDevice = (await client.getDevice(config.deviceId)).device; }
  catch (error) { if (error.status !== 404) throw error; }
  const cloudRoot = String(cloudDevice?.workspace_root || "").trim();
  if (cloudRoot && path.resolve(cloudRoot) !== path.resolve(validated.root) && !args.updateCloudWorkspaceRoot) {
    throw new Error(`Workspace Root mismatch for ${config.deviceId}.\nLocal: ${validated.root}\nCloud: ${cloudRoot}\nRe-run with --update-cloud-workspace-root only if this device really moved.`);
  }
  await client.registerDevice(config.deviceId, deviceDescriptor(config, validated));
  await Core.saveConfig(config, configPath);
  const cache = await Core.loadHashCache(path.join(path.dirname(configPath), "creator-agent-cache.json"));
  return { args, config, configPath, validated, client, cache };
}

function previousForDevice(fileLocations, deviceId) {
  return (fileLocations || []).filter((row) => row.device_id === deviceId && (row.storage_provider || "local") === "local");
}

async function scan(runtime) {
  const { args, config, validated, client, cache } = runtime;
  const discovery = await Core.discoverProjects(validated.root);
  for (const warning of discovery.warnings) console.warn(`WARN ${warning}`);
  const rows = [];
  let synced = 0;
  let changed = 0;
  let errors = 0;
  const contracts = new Map();

  for (const project of discovery.projects) {
    try {
      const cloud = await client.getProject(project.projectId);
      const logicalFiles = [...(Array.isArray(cloud.files) ? cloud.files : []), ...(Array.isArray(cloud.scopedArtifacts) ? cloud.scopedArtifacts : [])];
      contracts.set(project.projectId, { project, logicalFiles });
      const previous = previousForDevice(cloud.fileLocations, config.deviceId);
      const observed = await Core.observeProject({
        workspaceRealRoot: validated.realRoot, project, logicalFiles, previousLocations: previous, cache,
        noHash: args.noHash,
      });
      errors += observed.errors.length;
      for (const item of observed.errors) console.warn(`WARN ${project.name} / ${item.fileKey}: ${item.error}`);
      const payload = observed.observations.map(({ changedLocally, rehashed, ...location }) => ({ ...location, fileKey: location.fileKey }));
      let result = { saved: 0, failed: 0, events: [] };
      if (payload.length) result = await client.saveFileLocationsBatch(project.projectId, config.deviceId, deviceDescriptor(config, validated), payload);
      synced += Number(result.saved || 0);
      errors += Number(result.failed || 0);
      changed += Array.isArray(result.events) ? result.events.length : 0;
      rows.push({ project, observations: observed.observations, result });
      logVerbose(args, `DEBUG ${project.projectId}: ${JSON.stringify(result)}`);
    } catch (error) {
      errors += 1;
      console.warn(`WARN ${project.name} (${project.projectId}): ${error.message}`);
    }
  }

  config.lastSync = new Date().toISOString();
  await Core.saveConfig(config, runtime.configPath);
  await Core.saveHashCache(cache, path.join(path.dirname(runtime.configPath), "creator-agent-cache.json"));
  return { discovery, rows, synced, changed, errors, contracts };
}

function printScan(runtime, result) {
  console.log("\nGUCC Creator Local Agent\n");
  console.log(`Device: ${runtime.config.label || runtime.config.deviceId}`);
  console.log(`Workspace: ${runtime.validated.root}`);
  console.log(`Projects found: ${result.discovery.projects.length}\n`);
  for (const row of result.rows) {
    console.log(row.project.name || row.project.projectId);
    for (const obs of row.observations) {
      const marker = obs.availability === "present" ? "✓" : obs.availability === "missing" ? "✗" : "?";
      const suffix = runtime.args.verbose && obs.availability === "present" ? ` · ${obs.sizeBytes} B · ${obs.metadata.hashStrategy}` : "";
      console.log(`${marker} ${obs.fileKey}${suffix}`);
    }
    console.log("");
  }
  console.log(`Synced: ${result.synced} observations`);
  console.log(`${result.changed} meaningful file changes`);
  console.log(`${result.errors} errors`);
}

async function watch(runtime, initial) {
  let watchers = [];
  let rebuilding = false;

  const closeWatchers = () => {
    for (const watcher of watchers) watcher.close();
    watchers = [];
  };

  const watchedDirectories = (result) => {
    const dirs = new Set([runtime.validated.root]);
    for (const { project, logicalFiles } of result.contracts.values()) {
      dirs.add(project.projectRoot);
      for (const dir of Core.parentDirsForLogicalFiles(project.projectRoot, logicalFiles)) dirs.add(dir);
    }
    return dirs;
  };

  let scheduler;
  const rebuildWatchers = async (result) => {
    if (rebuilding) return;
    rebuilding = true;
    try {
      closeWatchers();
      for (const dir of watchedDirectories(result)) {
        try {
          const stat = await fsp.stat(dir);
          if (!stat.isDirectory()) continue;
          watchers.push(fs.watch(dir, { persistent: true }, () => scheduler.schedule("all")));
          logVerbose(runtime.args, `WATCH ${dir}`);
        } catch (error) {
          logVerbose(runtime.args, `WATCH SKIP ${dir}: ${error.message}`);
        }
      }
    } finally {
      rebuilding = false;
    }
  };

  scheduler = Core.createDebouncedScheduler(async () => {
    try {
      const result = await scan(runtime);
      printScan(runtime, result);
      await rebuildWatchers(result);
    } catch (error) {
      console.error(`Scan failed: ${error.message}`);
    }
  }, Core.DEFAULT_DEBOUNCE_MS);

  await rebuildWatchers(initial);
  const reconcile = setInterval(() => scheduler.schedule("all"), Core.DEFAULT_RECONCILE_MS);
  const stop = () => {
    clearInterval(reconcile);
    scheduler.cancelAll();
    closeWatchers();
  };
  process.once("SIGINT", () => { stop(); process.exit(0); });
  process.once("SIGTERM", () => { stop(); process.exit(0); });
  console.log(`Watching ${watchers.length} canonical directories. Debounce ${Core.DEFAULT_DEBOUNCE_MS} ms; reconciliation every ${Core.DEFAULT_RECONCILE_MS / 60000} min.`);
  await new Promise(() => {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.setup) return setup(args);
  const runtime = await createRuntime(args);
  const result = await scan(runtime);
  printScan(runtime, result);
  if (args.watch) await watch(runtime, result);
}

if (require.main === module) {
  main().catch((error) => {
    const message = String(error?.message || error);
    console.error(`\nCreator Agent error: ${message}`);
    if (/refresh token|Invalid login|expired|401/i.test(message)) console.error("Run --setup again if your GUCC login has expired.");
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, setup, createRuntime, scan, printScan, deviceDescriptor, main };
