"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const Global = require("../../assets/creator-global-production-core.js");

const AGENT_VERSION = "3.0.0-global-production-v1";
const DEFAULT_HASH_LIMIT_BYTES = 128 * 1024 * 1024;
const DEFAULT_DEBOUNCE_MS = 1500;
const DEFAULT_RECONCILE_MS = 15 * 60 * 1000;
const CONFIG_DIR = path.join(os.homedir(), ".gucc");
const CONFIG_PATH = path.join(CONFIG_DIR, "creator-agent.json");
const CACHE_PATH = path.join(CONFIG_DIR, "creator-agent-cache.json");
const NEVER_RECURSIVE_DIRS = new Set(["05_ASSETS"]);

const MIME_BY_EXT = Object.freeze({
  ".json": "application/json", ".md": "text/markdown", ".txt": "text/plain", ".csv": "text/csv",
  ".srt": "application/x-subrip", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
  ".aac": "audio/aac", ".flac": "audio/flac", ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".mkv": "video/x-matroska", ".webm": "video/webm", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
});

function normalizeRelativePath(value) {
  const raw = String(value || "").trim().replace(/\\/g, "/");
  if (!raw) throw new Error("relative path is empty");
  if (/^(?:[A-Za-z]:\/|\/|\/\/)/.test(raw)) throw new Error(`absolute path is not allowed: ${raw}`);
  const parts = raw.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) throw new Error(`path traversal is not allowed: ${raw}`);
  return parts.join("/");
}

function isPathInside(root, candidate) {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel));
}

function stableDeviceId(value) {
  const existing = String(value || "").trim();
  if (existing) {
    if (!existing.startsWith("agent_")) throw new Error("Creator Agent deviceId must start with agent_");
    return existing;
  }
  return `agent_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function ensureConfigDir() {
  await fsp.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await fsp.chmod(CONFIG_DIR, 0o700).catch(() => {});
}

async function readJsonFile(filePath, fallback = {}) {
  try { return JSON.parse(await fsp.readFile(filePath, "utf8")); }
  catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function loadConfig(configPath = CONFIG_PATH) {
  const config = await readJsonFile(configPath, {});
  return config && typeof config === "object" && !Array.isArray(config) ? config : {};
}

async function saveConfig(config, configPath = CONFIG_PATH) {
  await fsp.mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  const safe = { ...config, agentVersion: AGENT_VERSION };
  await fsp.writeFile(configPath, `${JSON.stringify(safe, null, 2)}\n`, { mode: 0o600 });
  if (process.platform !== "win32") await fsp.chmod(configPath, 0o600).catch(() => {});
  return safe;
}

async function loadHashCache(cachePath = CACHE_PATH) {
  const cache = await readJsonFile(cachePath, { version: 1, files: {} });
  if (!cache.files || typeof cache.files !== "object") cache.files = {};
  return cache;
}

async function saveHashCache(cache, cachePath = CACHE_PATH) {
  await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 0o700 });
  await fsp.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
  if (process.platform !== "win32") await fsp.chmod(cachePath, 0o600).catch(() => {});
}

async function validateWorkspaceRoot(workspaceRoot, fsApi = fsp) {
  const root = path.resolve(String(workspaceRoot || "").trim());
  if (!String(workspaceRoot || "").trim()) throw new Error("Workspace Root is not configured");
  let stat;
  try { stat = await fsApi.stat(root); }
  catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Workspace Root does not exist: ${root}`);
    throw new Error(`Workspace Root cannot be read: ${root} (${error.message})`);
  }
  if (!stat.isDirectory()) throw new Error(`Workspace Root is not a directory: ${root}`);
  const realRoot = await fsApi.realpath(root);
  return { root, realRoot };
}

async function discoverProjects(workspaceRoot, options = {}) {
  const fsApi = options.fsApi || fsp;
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : 2;
  const { root, realRoot } = await validateWorkspaceRoot(workspaceRoot, fsApi);
  const candidates = [];
  const warnings = [];

  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = await fsApi.readdir(dir, { withFileTypes: true }); }
    catch (error) { warnings.push(`Cannot read ${dir}: ${error.message}`); return; }

    const control = path.join(dir, "00_CONTROL", "PROJECT_DATA.json");
    try {
      const st = await fsApi.lstat(control);
      if (st.isSymbolicLink()) {
        warnings.push(`Skip symlink PROJECT_DATA: ${control}`);
        return;
      }
      if (st.isFile()) {
        const realProject = await fsApi.realpath(dir);
        if (!isPathInside(realRoot, realProject)) {
          warnings.push(`Skip project escaping Workspace Root: ${dir}`);
          return;
        }
        let data;
        try { data = JSON.parse(await fsApi.readFile(control, "utf8")); }
        catch (error) { warnings.push(`Broken PROJECT_DATA.json: ${control} (${error.message})`); return; }
        const projectId = String(data?.projectId || "").trim();
        if (!projectId) { warnings.push(`PROJECT_DATA.json missing projectId: ${control}`); return; }
        candidates.push({ projectId, name: String(data?.name || path.basename(dir)), game: String(data?.game || ""), projectRoot: dir, realProjectRoot: realProject, projectData: data });
        return; // A Creator Project is an atomic discovery root. Never recurse into 05_ASSETS etc.
      }
    } catch (error) {
      if (error?.code !== "ENOENT") warnings.push(`Cannot inspect ${control}: ${error.message}`);
    }

    if (depth === maxDepth) return;
    for (const entry of entries) {
      if (!entry.isDirectory() || NEVER_RECURSIVE_DIRS.has(entry.name)) continue;
      const child = path.join(dir, entry.name);
      try {
        const lst = await fsApi.lstat(child);
        if (lst.isSymbolicLink()) { warnings.push(`Skip symlink/junction directory: ${child}`); continue; }
        const realChild = await fsApi.realpath(child);
        if (!isPathInside(realRoot, realChild)) { warnings.push(`Skip directory escaping Workspace Root: ${child}`); continue; }
        await walk(child, depth + 1);
      } catch (error) { warnings.push(`Cannot inspect ${child}: ${error.message}`); }
    }
  }

  await walk(root, 0);
  const counts = new Map();
  for (const project of candidates) counts.set(project.projectId, (counts.get(project.projectId) || 0) + 1);
  const duplicateIds = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  for (const id of duplicateIds) warnings.push(`Duplicate projectId ${id}; all matching local folders are skipped.`);
  return { projects: candidates.filter((item) => !duplicateIds.includes(item.projectId)), warnings, duplicateIds, root, realRoot };
}

function mimeTypeFor(filename) {
  return MIME_BY_EXT[path.extname(String(filename || "")).toLowerCase()] || "application/octet-stream";
}

async function sha256File(filePath, fsModule = fs) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fsModule.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
  });
}

function cacheKey(projectId, logicalFile) { return Global.scopedCacheKey(projectId, logicalFile); }

async function observeLogicalArtifact(params) {
  const {
    workspaceRealRoot, project, logicalFile, previousLocation, cache, noHash = false,
    hashLimitBytes = DEFAULT_HASH_LIMIT_BYTES, hashFile = sha256File, fsApi = fsp,
  } = params;
  const fileKey = String(logicalFile.file_key || logicalFile.fileKey || "").trim();
  if (!fileKey) throw new Error("Logical artifact is missing file_key");
  const scopeType = String(logicalFile.artifact_scope_type || logicalFile.artifactScopeType || "project").trim() || "project";
  const scopeId = String(logicalFile.artifact_scope_id || logicalFile.artifactScopeId || (scopeType === "project" ? project.projectId : "")).trim();
  if (!scopeId) throw new Error("Logical artifact is missing artifact_scope_id");
  const relativePath = normalizeRelativePath(logicalFile.relative_path || logicalFile.relativePath);
  const projectRoot = path.resolve(project.projectRoot);
  const absolutePath = path.resolve(projectRoot, ...relativePath.split("/"));
  if (!isPathInside(projectRoot, absolutePath)) throw new Error(`Artifact path escapes project root: ${relativePath}`);

  // `projectRoot` can be a Windows 8.3/alias spelling while `workspaceRealRoot`
  // is the canonical long path returned by fs.realpath(). Comparing those two
  // spellings before resolving the candidate falsely rejects legitimate files
  // (e.g. C:\Users\RUNNER~1\... vs C:\Users\runneradmin\...). Project discovery
  // already proves realProjectRoot is inside the real Workspace Root. For files
  // that exist we additionally realpath the artifact below and enforce both the
  // project and Workspace containment boundaries, which is the security check
  // that protects against junction/symlink escapes.
  const realProjectRoot = project.realProjectRoot || projectRoot;
  if (!isPathInside(workspaceRealRoot, realProjectRoot)) throw new Error(`Project resolves outside Workspace Root: ${project.projectId || projectRoot}`);

  const observedAt = new Date().toISOString();
  let stat;
  try { stat = await fsApi.lstat(absolutePath); }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const prior = previousLocation || null;
    const availability = prior && ["present", "missing"].includes(String(prior.availability)) ? "missing" : "unknown";
    return {
      fileKey, artifactScopeType: scopeType, artifactScopeId: scopeId, relativePath, filename: path.basename(relativePath), availability,
      sizeBytes: null, mimeType: mimeTypeFor(relativePath), checksum: null, fileModifiedAt: null, observedAt,
      metadata: { observer: "creator-local-agent", agentVersion: AGENT_VERSION, hashStrategy: "not-applicable" },
      changedLocally: prior ? String(prior.availability) !== availability : availability !== "unknown",
    };
  }

  if (stat.isSymbolicLink()) throw new Error(`Symlink artifact is not observed for safety: ${relativePath}`);
  if (!stat.isFile()) throw new Error(`Canonical artifact is not a regular file: ${relativePath}`);
  const realFile = await fsApi.realpath(absolutePath);
  if (!isPathInside(workspaceRealRoot, realFile) || !isPathInside(realProjectRoot, realFile)) {
    throw new Error(`Artifact resolves outside the project/Workspace Root: ${relativePath}`);
  }

  const key = cacheKey(project.projectId, logicalFile);
  const cached = cache?.files?.[key] || null;
  const sizeBytes = stat.size;
  const mtimeMs = Math.trunc(stat.mtimeMs);
  let checksum = null;
  let hashStrategy = "disabled";
  let rehashed = false;
  if (!noHash && sizeBytes <= hashLimitBytes) {
    if (cached && cached.sizeBytes === sizeBytes && cached.mtimeMs === mtimeMs && cached.checksum) {
      checksum = cached.checksum;
      hashStrategy = "cache-reuse";
    } else {
      checksum = await hashFile(realFile);
      hashStrategy = "full-sha256";
      rehashed = true;
    }
  } else if (!noHash) {
    hashStrategy = "skipped-large";
  }
  if (cache?.files) cache.files[key] = { sizeBytes, mtimeMs, checksum, lastObservedAt: observedAt };

  const next = {
    fileKey, artifactScopeType: scopeType, artifactScopeId: scopeId, relativePath, filename: path.basename(relativePath), availability: "present", sizeBytes,
    mimeType: mimeTypeFor(relativePath), checksum, fileModifiedAt: new Date(stat.mtimeMs).toISOString(), observedAt,
    metadata: { observer: "creator-local-agent", agentVersion: AGENT_VERSION, hashStrategy, mtimeMs }, rehashed,
  };
  const prior = previousLocation || null;
  next.changedLocally = !prior || String(prior.availability) !== "present" || Number(prior.size_bytes ?? prior.sizeBytes ?? -1) !== sizeBytes ||
    String(prior.checksum || "") !== String(checksum || "") || String(prior.file_modified_at || prior.fileModifiedAt || "") !== next.fileModifiedAt;
  return next;
}

async function observeProject(params) {
  const { workspaceRealRoot, project, logicalFiles, previousLocations = [], cache, noHash, hashLimitBytes, hashFile, fsApi } = params;
  const previousByLogicalId = new Map(previousLocations.filter((row) => row.logical_file_id).map((row) => [String(row.logical_file_id), row]));
  const previousByPath = new Map(previousLocations.map((row) => [String(row.relative_path || ""), row]));
  const observations = [];
  const errors = [];
  for (const logicalFile of logicalFiles || []) {
    try {
      const relative = normalizeRelativePath(logicalFile.relative_path || logicalFile.relativePath);
      const previous = previousByLogicalId.get(String(logicalFile.id || "")) || previousByPath.get(relative) || null;
      observations.push(await observeLogicalArtifact({ workspaceRealRoot, project, logicalFile, previousLocation: previous, cache, noHash, hashLimitBytes, hashFile, fsApi }));
    } catch (error) {
      errors.push({ fileKey: String(logicalFile.file_key || logicalFile.fileKey || "?"), error: error.message });
    }
  }
  return { observations, errors };
}

function createDebouncedScheduler(handler, delayMs = DEFAULT_DEBOUNCE_MS, timers = new Map()) {
  return {
    schedule(key, value = key) {
      if (timers.has(key)) clearTimeout(timers.get(key));
      timers.set(key, setTimeout(async () => {
        timers.delete(key);
        await handler(value);
      }, delayMs));
    },
    pending() { return timers.size; },
    cancelAll() { for (const timer of timers.values()) clearTimeout(timer); timers.clear(); },
  };
}

function parentDirsForLogicalFiles(projectRoot, logicalFiles) {
  const dirs = new Set([path.resolve(projectRoot)]);
  for (const file of logicalFiles || []) {
    try {
      const rel = normalizeRelativePath(file.relative_path || file.relativePath);
      const first = rel.split("/")[0];
      if (first === "05_ASSETS") continue;
      dirs.add(path.resolve(projectRoot, path.dirname(rel)));
    } catch {}
  }
  return [...dirs];
}

module.exports = {
  AGENT_VERSION, DEFAULT_HASH_LIMIT_BYTES, DEFAULT_DEBOUNCE_MS, DEFAULT_RECONCILE_MS, CONFIG_DIR, CONFIG_PATH, CACHE_PATH,
  cacheKey,
  normalizeRelativePath, isPathInside, stableDeviceId, ensureConfigDir, loadConfig, saveConfig, loadHashCache, saveHashCache,
  validateWorkspaceRoot, discoverProjects, mimeTypeFor, sha256File, observeLogicalArtifact, observeProject,
  createDebouncedScheduler, parentDirsForLogicalFiles,
};
