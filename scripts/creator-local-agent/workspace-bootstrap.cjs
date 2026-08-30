"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const Core = require("./core.cjs");
const Engine = require("../../apps/video-workspace/production-system/engine.js");
const Contract = require("../../assets/creator-local-project-contract.js");

function sha256Text(value) {
  return `sha256:${crypto.createHash("sha256").update(String(value), "utf8").digest("hex")}`;
}

async function pathType(target) {
  try {
    const stat = await fsp.lstat(target);
    if (stat.isSymbolicLink()) return "symlink";
    if (stat.isDirectory()) return "directory";
    if (stat.isFile()) return "file";
    return "other";
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function readText(filePath) {
  try { return await fsp.readFile(filePath, "utf8"); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

async function readSafeText(filePath, allowedRealRoot) {
  const type = await pathType(filePath);
  if (type === "missing") return null;
  if (type === "symlink") throw new Error(`Symlink/junction file is not allowed: ${filePath}`);
  if (type !== "file") throw new Error(`Expected regular file: ${filePath}`);
  const real = await fsp.realpath(filePath);
  if (!Core.isPathInside(allowedRealRoot, real)) throw new Error(`File resolves outside Project Root: ${filePath}`);
  return fsp.readFile(real, "utf8");
}

async function readJson(filePath, fallback = null, allowedRealRoot = "") {
  const text = allowedRealRoot ? await readSafeText(filePath, allowedRealRoot) : await readText(filePath);
  if (text == null) return fallback;
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`Invalid JSON at ${filePath}: ${error.message}`); }
}

async function atomicWrite(filePath, content) {
  const parent = path.dirname(filePath);
  const parentType = await pathType(parent);
  if (parentType === "symlink") throw new Error(`Symlink/junction parent is not allowed: ${parent}`);
  if (parentType !== "directory") throw new Error(`Projection parent directory is not ready: ${parent}`);
  const temp = path.join(parent, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`);
  try {
    await fsp.writeFile(temp, String(content), { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fsp.rename(temp, filePath);
  } catch (error) {
    await fsp.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function assertDirectoryInside(workspaceRealRoot, candidate) {
  const resolved = path.resolve(candidate);
  if (!Core.isPathInside(workspaceRealRoot, resolved)) throw new Error(`Project path escapes Workspace Root: ${resolved}`);
  const type = await pathType(resolved);
  if (type === "symlink") throw new Error(`Symlink/junction project root is not allowed: ${resolved}`);
  if (!["missing", "directory"].includes(type)) throw new Error(`Project path is not a directory: ${resolved}`);
  if (type === "directory") {
    const real = await fsp.realpath(resolved);
    if (!Core.isPathInside(workspaceRealRoot, real)) throw new Error(`Project directory resolves outside Workspace Root: ${resolved}`);
  }
  return resolved;
}

async function ensureProjectRoot(workspaceRealRoot, projectRoot) {
  const target = await assertDirectoryInside(workspaceRealRoot, projectRoot);
  const type = await pathType(target);
  if (type === "missing") await fsp.mkdir(target);
  const real = await fsp.realpath(target);
  if (!Core.isPathInside(workspaceRealRoot, real)) throw new Error(`Project directory resolves outside Workspace Root: ${target}`);
  return real;
}

async function ensureSafeDirectoryChain(workspaceRealRoot, projectRoot, projectRealRoot, relativeDir) {
  const relative = Contract.normalizeRelativePath(relativeDir);
  let cursor = path.resolve(projectRoot);
  for (const part of relative.split("/")) {
    cursor = path.join(cursor, part);
    if (!Core.isPathInside(projectRoot, cursor)) throw new Error(`Directory path escapes Project Root: ${relative}`);
    const type = await pathType(cursor);
    if (type === "symlink") throw new Error(`Symlink/junction directory is not allowed: ${cursor}`);
    if (type === "missing") await fsp.mkdir(cursor);
    else if (type !== "directory") throw new Error(`Expected directory but found ${type}: ${cursor}`);
    const real = await fsp.realpath(cursor);
    if (!Core.isPathInside(workspaceRealRoot, real) || !Core.isPathInside(projectRealRoot, real)) {
      throw new Error(`Directory resolves outside Project Root: ${relative}`);
    }
  }
  return cursor;
}

async function projectIdAt(projectRoot, workspaceRealRoot) {
  const rootReal = await fsp.realpath(projectRoot);
  if (!Core.isPathInside(workspaceRealRoot, rootReal)) throw new Error(`Project directory resolves outside Workspace Root: ${projectRoot}`);
  const dataPath = path.join(projectRoot, "00_CONTROL", "PROJECT_DATA.json");
  const data = await readJson(dataPath, null, rootReal);
  return data ? String(data.projectId || "").trim() : "";
}

async function hasAnyEntries(directory) {
  try { return (await fsp.readdir(directory)).length > 0; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

async function resolveBootstrapRoot(workspaceRoot, project) {
  const validated = await Core.validateWorkspaceRoot(workspaceRoot);
  const discovered = await Core.discoverProjects(validated.root);
  if ((discovered.duplicateIds || []).includes(project.projectId)) {
    throw new Error(`Duplicate local projectId ${project.projectId}; resolve the duplicate folders before bootstrap.`);
  }
  const matches = (discovered.projects || []).filter((item) => item.projectId === project.projectId);
  if (matches.length > 1) throw new Error(`Multiple local folders claim projectId ${project.projectId}`);
  if (matches.length === 1) {
    const canonicalName = Contract.canonicalProjectFolderName(project);
    return {
      projectRoot: matches[0].projectRoot,
      reusedLegacy: path.basename(matches[0].projectRoot) !== canonicalName,
      canonicalName,
      validated,
    };
  }

  const canonicalName = Contract.canonicalProjectFolderName(project);
  const target = await assertDirectoryInside(validated.realRoot, path.join(validated.root, canonicalName));
  const type = await pathType(target);
  if (type === "directory") {
    const existingId = await projectIdAt(target, validated.realRoot);
    if (existingId && existingId !== project.projectId) {
      throw new Error(`Canonical folder collision: ${canonicalName} already belongs to ${existingId}`);
    }
    if (!existingId && await hasAnyEntries(target)) {
      throw new Error(`Canonical folder already contains untracked local content: ${canonicalName}`);
    }
  }
  return { projectRoot: target, reusedLegacy: false, canonicalName, validated };
}

function stableSnapshotTimestamps(raw, row) {
  const createdAt = String(raw.createdAt || raw.created_at || row.created_at || row.updated_at || "").trim();
  const updatedAt = String(raw.updatedAt || raw.updated_at || row.updated_at || row.created_at || createdAt || "").trim();
  return { createdAt, updatedAt };
}

function projectFromSnapshot(snapshot) {
  const row = snapshot?.project || snapshot || {};
  const raw = row.project_data && typeof row.project_data === "object" ? row.project_data : row;
  const timestamps = stableSnapshotTimestamps(raw, row);
  const project = Engine.normalizeProject({
    ...raw,
    projectId: String(row.project_id || raw.projectId || "").trim(),
    name: row.name || raw.name,
    game: row.game || raw.game,
    topic: row.topic || raw.topic,
    currentState: row.current_state || raw.currentState,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  });
  if (!project.projectId) throw new Error("Cloud Creator Project is missing projectId");
  return project;
}

async function loadProjectionManifest(projectRoot, projectRealRoot) {
  const manifestPath = path.join(projectRoot, ...Contract.PROJECTION_MANIFEST.split("/"));
  const value = await readJson(manifestPath, { version: 1, projectId: "", files: {} }, projectRealRoot);
  if (!value || typeof value !== "object" || Array.isArray(value)) return { version: 1, projectId: "", files: {} };
  if (!value.files || typeof value.files !== "object" || Array.isArray(value.files)) value.files = {};
  return value;
}

async function syncProjectionFile({ workspaceRealRoot, projectRoot, projectRealRoot, relativePath, content, previousManifest, nextManifest }) {
  const relative = Contract.normalizeRelativePath(relativePath);
  const parentRelative = path.posix.dirname(relative);
  if (parentRelative && parentRelative !== ".") {
    await ensureSafeDirectoryChain(workspaceRealRoot, projectRoot, projectRealRoot, parentRelative);
  }
  const target = path.resolve(projectRoot, ...relative.split("/"));
  if (!Core.isPathInside(projectRoot, target)) throw new Error(`Projection path escapes Project Root: ${relative}`);
  const existing = await readSafeText(target, projectRealRoot);
  const desired = String(content);
  const desiredHash = sha256Text(desired);
  if (existing == null) {
    await atomicWrite(target, desired);
    nextManifest.files[relative] = desiredHash;
    return "created";
  }
  const existingHash = sha256Text(existing);
  if (existingHash === desiredHash) {
    nextManifest.files[relative] = desiredHash;
    return "unchanged";
  }
  const priorHash = previousManifest.files?.[relative] || "";
  if (priorHash && priorHash === existingHash) {
    await atomicWrite(target, desired);
    nextManifest.files[relative] = desiredHash;
    return "updated";
  }
  return "conflict";
}

async function bootstrapProjectWorkspace({ workspaceRoot, snapshot, project: explicitProject } = {}) {
  const project = explicitProject ? Engine.normalizeProject(explicitProject) : projectFromSnapshot(snapshot);
  const resolved = await resolveBootstrapRoot(workspaceRoot, project);
  const projectRealRoot = await ensureProjectRoot(resolved.validated.realRoot, resolved.projectRoot);

  for (const relativeDir of Engine.DIRECTORY_STRUCTURE) {
    await ensureSafeDirectoryChain(resolved.validated.realRoot, resolved.projectRoot, projectRealRoot, relativeDir);
  }

  const tree = Engine.projectFileTree(project);
  const previous = await loadProjectionManifest(resolved.projectRoot, projectRealRoot);
  if (previous.projectId && previous.projectId !== project.projectId) throw new Error(`Projection manifest belongs to another project: ${previous.projectId}`);
  const next = {
    version: 1,
    projectId: project.projectId,
    canonicalFolderName: resolved.canonicalName,
    updatedAt: new Date().toISOString(),
    files: { ...(previous.files || {}) },
  };
  const summary = { created: [], updated: [], unchanged: [], conflicts: [] };
  for (const [relativePath, content] of Object.entries(tree)) {
    const status = await syncProjectionFile({
      workspaceRealRoot: resolved.validated.realRoot,
      projectRoot: resolved.projectRoot,
      projectRealRoot,
      relativePath,
      content,
      previousManifest: previous,
      nextManifest: next,
    });
    if (status === "conflict") summary.conflicts.push(relativePath);
    else summary[status].push(relativePath);
  }
  await ensureSafeDirectoryChain(resolved.validated.realRoot, resolved.projectRoot, projectRealRoot, "00_CONTROL");
  const manifestPath = path.join(resolved.projectRoot, ...Contract.PROJECTION_MANIFEST.split("/"));
  const manifestType = await pathType(manifestPath);
  if (manifestType === "symlink") throw new Error(`Symlink/junction projection manifest is not allowed: ${manifestPath}`);
  if (!["missing", "file"].includes(manifestType)) throw new Error(`Projection manifest path is not a file: ${manifestPath}`);
  await atomicWrite(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  return {
    projectId: project.projectId,
    projectRoot: resolved.projectRoot,
    canonicalFolderName: resolved.canonicalName,
    reusedLegacyFolder: resolved.reusedLegacy,
    ...summary,
  };
}

module.exports = {
  sha256Text,
  atomicWrite,
  stableSnapshotTimestamps,
  projectFromSnapshot,
  resolveBootstrapRoot,
  ensureSafeDirectoryChain,
  bootstrapProjectWorkspace,
};
