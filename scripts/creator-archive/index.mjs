#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { generateArchivePackage, evaluateArchiveFile } from "../../assets/creator-project-archive-core.mjs";
import { applyArchiveSafeSnapshot } from "../../assets/creator-archive-safe-snapshot.mjs";
import { DriveArchivePublisher } from "./drive-publisher.mjs";
import {
  defaultOAuthConfigPath,
  loadOAuthConfig,
  oauthConfigExists,
  setupDriveOAuth,
  GoogleDriveTransport,
} from "./google-drive-oauth.mjs";

const require = createRequire(import.meta.url);
const Core = require("../creator-local-agent/core.cjs");
const Cloud = require("../creator-local-agent/cloud.cjs");
const DRIVE_ROOT_FOLDER_ID = "1wVMD-nIk6ArtGDi5gyOCmhW1pY-iRM9L";
const ARCHIVE_CONTENT_KEYS = new Set(["RESEARCH", "CONTENT_LOCK", "VOICE_MASTER", "SUBTITLE_MASTER", "RELEASE_PACK", "EDIT_BLUEPRINT", "REVIEW_NOTES"]);

function parseArgs(argv) {
  const result = { once: false, setupDrive: false, projectId: "", workspaceRoot: "", configPath: Core.CONFIG_PATH, oauthPath: defaultOAuthConfigPath() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") result.once = true;
    else if (arg === "--setup-drive") result.setupDrive = true;
    else if (arg === "--project") result.projectId = String(argv[++i] || "").trim();
    else if (arg === "--workspace") result.workspaceRoot = String(argv[++i] || "").trim();
    else if (arg === "--config") result.configPath = String(argv[++i] || "").trim();
    else if (arg === "--oauth-config") result.oauthPath = String(argv[++i] || "").trim();
    else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function usage() {
  return `GUCC Creator Project Archive\n\nUsage:\n  npm run creator:archive -- --setup-drive\n  npm run creator:archive -- --once [--project <projectId>] [--workspace <path>]\n\nNotes:\n  - Reuses the Creator Local Agent normal user session; never uses service_role.\n  - Google Drive uses user OAuth with drive.file scope.\n  - Media bytes are never part of the Archive Package.\n`;
}

async function cloudClient(configPath) {
  const config = await Core.loadConfig(configPath);
  if (!config.refreshToken) throw new Error(`Creator user session is not configured. Run npm run creator:agent -- --setup first (${configPath})`);
  const client = new Cloud.CreatorCloudClient({
    refreshToken: config.refreshToken,
    onRefreshToken: async (refreshToken) => {
      const latest = await Core.loadConfig(configPath);
      await Core.saveConfig({ ...latest, refreshToken }, configPath);
    },
  });
  await client.ping();
  return { client, config };
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function localProjectFor(projectId, workspaceRoot) {
  if (!workspaceRoot) return null;
  const discovered = await Core.discoverProjects(workspaceRoot, { maxDepth: 2 });
  for (const warning of discovered.warnings || []) console.warn(`Archive workspace warning: ${warning}`);
  return discovered.projects.find((project) => project.projectId === projectId) || null;
}

async function lightweightArtifactContents(localProject, files) {
  const result = {};
  if (!localProject) return result;
  for (const file of files || []) {
    if (!ARCHIVE_CONTENT_KEYS.has(file.file_key)) continue;
    const relative = Core.normalizeRelativePath(file.relative_path);
    const full = path.resolve(localProject.projectRoot, relative);
    let real;
    let stat;
    try {
      real = await fs.realpath(full);
      if (!isInside(localProject.realProjectRoot, real)) continue;
      stat = await fs.stat(real);
    } catch { continue; }
    if (!stat.isFile()) continue;
    const check = evaluateArchiveFile({ filename: path.basename(real), kind: file.kind, sizeBytes: stat.size });
    if (!check.allowed) continue;
    result[file.file_key] = await fs.readFile(real, "utf8");
  }
  return result;
}

function packageFingerprint(pkg) {
  const hash = crypto.createHash("sha256");
  const files = [pkg.mainMarkdown, pkg.snapshotJson, pkg.eventsJson, ...(pkg.companions || [])]
    .slice()
    .sort((a, b) => String(a.filename).localeCompare(String(b.filename)));
  for (const file of files) {
    hash.update(String(file.filename));
    hash.update("\0");
    hash.update(String(file.content));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function saveLocalPackage(pkg) {
  const dir = path.join(os.homedir(), ".gucc", "archive-packages", pkg.identity.projectId);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const files = [pkg.mainMarkdown, pkg.snapshotJson, pkg.eventsJson, ...(pkg.companions || [])];
  for (const file of files) {
    const target = path.join(dir, file.filename);
    await fs.writeFile(target, file.content, { encoding: "utf8", mode: 0o600 });
    if (process.platform !== "win32") await fs.chmod(target, 0o600).catch(() => {});
  }
  return dir;
}

function archiveStatus(row) {
  return row?.project_data?.integration?.archive?.status || "not_generated";
}

function shouldProcess(row, explicitId) {
  if (explicitId) return row.project_id === explicitId;
  if (!["PUBLISHED", "ARCHIVED"].includes(row.current_state)) return false;
  return ["pending", "generating", "generated", "failed"].includes(archiveStatus(row));
}

async function processProject(client, row, options, googleConfig) {
  const projectId = row.project_id;
  const snapshot = await client.getProject(projectId);
  if (!["PUBLISHED", "ARCHIVED"].includes(snapshot.project.current_state)) throw new Error(`${projectId} is ${snapshot.project.current_state}; Archive is available only after PUBLISHED`);

  const workspaceRoot = options.workspaceRoot || options.agentConfig.workspaceRoot || "";
  const localProject = await localProjectFor(projectId, workspaceRoot);
  const artifactContents = await lightweightArtifactContents(localProject, snapshot.files || []);
  const generatedAt = snapshot.project.project_data?.integration?.archive?.generatedAt || new Date().toISOString();
  const archiveInput = {
    project: snapshot.project,
    files: snapshot.files || [],
    fileLocations: snapshot.fileLocations || [],
    devices: snapshot.devices || [],
    events: snapshot.events || [],
    releases: snapshot.releases || [],
    analytics: snapshot.analytics || [],
    artifactContents,
  };
  let pkg = generateArchivePackage(archiveInput, { generatedAt });
  pkg = applyArchiveSafeSnapshot(pkg, archiveInput);
  const fingerprint = packageFingerprint(pkg);
  const localDir = await saveLocalPackage(pkg);
  console.log(`Archive generated: ${projectId} -> ${localDir} (${pkg.totalBytes} bytes)`);

  const currentArchive = snapshot.project.project_data?.integration?.archive || {};
  let baseRevision = Number(snapshot.project.revision || 0);
  const identicalGenerated = currentArchive.status === "generated"
    && currentArchive.archiveVersion === pkg.archiveVersion
    && currentArchive.fingerprint === fingerprint
    && currentArchive.mainFilename === pkg.mainMarkdown.filename
    && Number(currentArchive.totalBytes || 0) === Number(pkg.totalBytes || 0);

  if (!identicalGenerated) {
    const generated = await client.api("recordArchiveGenerated", {
      projectId,
      baseRevision,
      archive: {
        archiveVersion: pkg.archiveVersion,
        generatedAt: pkg.identity.generatedAt,
        mainFilename: pkg.mainMarkdown.filename,
        fingerprint,
        totalBytes: pkg.totalBytes,
        warnings: pkg.warnings,
      },
    });
    baseRevision = generated.revision;
  } else {
    console.log(`Archive unchanged: ${projectId} · generated state already matches ${fingerprint}`);
  }

  if (!googleConfig) {
    console.log("Drive Runtime Publisher Pending OAuth Setup. Run: npm run creator:archive -- --setup-drive");
    return { projectId, status: "generated", localDir, drivePending: true, fingerprint };
  }

  try {
    const publisher = new DriveArchivePublisher({ transport: new GoogleDriveTransport(googleConfig), rootFolderId: DRIVE_ROOT_FOLDER_ID });
    const published = await publisher.publish(pkg);
    const recorded = await client.api("recordArchivePublished", {
      projectId,
      baseRevision,
      archive: {
        provider: published.provider,
        archiveVersion: published.archiveVersion,
        folderId: published.folderId,
        folderUrl: published.folderUrl,
        mainFileId: published.mainFileId,
        mainFileUrl: published.mainFileUrl,
        checksum: published.checksum,
        fingerprint,
        verifiedAt: published.verifiedAt,
        publishedAt: new Date().toISOString(),
        warnings: published.warnings,
      },
    });
    console.log(`Archive published + verified: ${projectId} -> ${published.mainFileUrl}`);
    return { projectId, status: recorded.project?.current_state === "ARCHIVED" ? "archived" : "published", published, fingerprint };
  } catch (error) {
    await client.api("recordArchiveFailed", { projectId, baseRevision, error: String(error?.message || error).slice(0, 1200) }).catch(() => {});
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage()); return; }
  if (options.setupDrive) {
    await setupDriveOAuth({ configPath: options.oauthPath });
    if (!options.once) return;
  }
  if (!options.once && !options.projectId) { console.log(usage()); return; }

  const { client, config } = await cloudClient(options.configPath);
  options.agentConfig = config;
  const googleConfig = oauthConfigExists(options.oauthPath) ? await loadOAuthConfig(options.oauthPath) : null;
  const dashboard = await client.api("listProjects");
  const rows = (dashboard.projects || []).filter((row) => shouldProcess(row, options.projectId));
  if (options.projectId && !rows.length) throw new Error(`Creator project not found or not eligible: ${options.projectId}`);
  if (!rows.length) { console.log("No Creator Archive work is pending."); return; }
  for (const row of rows) {
    try { await processProject(client, row, options, googleConfig); }
    catch (error) { console.error(`Archive failed for ${row.project_id}: ${error.message}`); process.exitCode = 1; }
  }
}

main().catch((error) => { console.error(`Creator Archive failed: ${error.message}`); process.exit(1); });
