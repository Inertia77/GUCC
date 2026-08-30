"use strict";

const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const Core = require("./core.cjs");
const Contract = require("../../assets/creator-local-project-contract.js");

async function resolveProjectRootById(workspaceRoot, projectId) {
  const id = String(projectId || "").trim();
  if (!id) throw new Error("projectId is required");
  const discovered = await Core.discoverProjects(workspaceRoot);
  if ((discovered.duplicateIds || []).includes(id)) throw new Error(`Multiple local folders claim projectId ${id}`);
  const matches = (discovered.projects || []).filter((project) => project.projectId === id);
  if (!matches.length) return null;
  if (matches.length > 1) throw new Error(`Multiple local folders claim projectId ${id}`);
  return matches[0];
}

async function listSafeFiles(directory, projectRealRoot, predicate) {
  let entries;
  try { entries = await fsp.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  const rows = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (predicate && !predicate(entry.name)) continue;
    const full = path.resolve(directory, entry.name);
    const lst = await fsp.lstat(full);
    if (lst.isSymbolicLink() || !lst.isFile()) continue;
    const real = await fsp.realpath(full);
    if (!Core.isPathInside(projectRealRoot, real)) throw new Error(`Publish asset resolves outside Project Root: ${entry.name}`);
    rows.push({ name: entry.name, path: full });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

async function regularSafeFile(filePath, projectRealRoot) {
  try {
    const lst = await fsp.lstat(filePath);
    if (lst.isSymbolicLink() || !lst.isFile()) return null;
    const real = await fsp.realpath(filePath);
    if (!Core.isPathInside(projectRealRoot, real)) throw new Error(`Publish asset resolves outside Project Root: ${filePath}`);
    return { name: path.basename(filePath), path: path.resolve(filePath) };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function publicCandidate(status, item, extra = {}) {
  return { status, path: item?.path || "", name: item?.name || "", ...extra };
}

async function discoverVideo(project) {
  const finalDir = path.join(project.projectRoot, "09_FINAL");
  const canonical = await regularSafeFile(path.join(finalDir, "VIDEO_V1.mp4"), project.realProjectRoot);
  if (canonical) return publicCandidate("found", canonical, { source: "canonical" });

  const strong = await listSafeFiles(finalDir, project.realProjectRoot, (name) => /^VIDEO_V1\.(mp4|mov|webm|mkv)$/i.test(name));
  if (strong.length === 1) return publicCandidate("found", strong[0], { source: "video_v1_extension_fallback" });
  if (strong.length > 1) return publicCandidate("ambiguous", null, { source: "video_v1_extension_fallback", candidates: strong });

  const candidates = await listSafeFiles(finalDir, project.realProjectRoot, Contract.isVideoName);
  if (!candidates.length) return publicCandidate("missing", null, { source: "09_FINAL" });
  if (candidates.length === 1) return publicCandidate("found", candidates[0], { source: "single_final_candidate" });
  return publicCandidate("ambiguous", null, { source: "09_FINAL", candidates });
}

function coverMatchesDefinition(name, definition) {
  const ext = Contract.extension(name);
  if (!Contract.IMAGE_EXTENSIONS.includes(ext)) return false;
  const stem = name.slice(0, -ext.length);
  return stem.toUpperCase() === definition.stem || stem.toLowerCase().endsWith(`_${definition.generatorToken}`.toLowerCase());
}

async function discoverCovers(project) {
  const releaseDir = path.join(project.projectRoot, "10_RELEASE");
  const allImages = await listSafeFiles(releaseDir, project.realProjectRoot, Contract.isImageName);
  const byKey = {};
  for (const [key, definition] of Object.entries(Contract.COVER_ARTIFACTS)) {
    const candidates = allImages.filter((item) => coverMatchesDefinition(item.name, definition));
    byKey[key] = candidates.length === 0
      ? publicCandidate("missing", null, { ratio: definition.ratio })
      : candidates.length === 1
        ? publicCandidate("found", candidates[0], { ratio: definition.ratio })
        : publicCandidate("ambiguous", null, { ratio: definition.ratio, candidates });
  }

  let preferred = byKey.COVER_16_9?.status === "found" ? { ...byKey.COVER_16_9, key: "COVER_16_9" } : null;
  if (!preferred) {
    const found = Object.entries(byKey).filter(([, value]) => value.status === "found");
    if (found.length === 1) {
      preferred = { ...found[0][1], key: found[0][0] };
    } else if (found.length > 1) {
      const candidates = found.map(([key, value]) => ({ key, ratio: value.ratio, name: value.name, path: value.path }));
      preferred = publicCandidate("ambiguous", null, { key: "MULTI_RATIO", ratio: "multiple", source: "ratio_specific", candidates });
    } else if (allImages.length === 1) {
      preferred = publicCandidate("found", allImages[0], { key: "GENERIC_COVER", ratio: "unknown", source: "single_release_image" });
    } else if (allImages.length > 1) {
      preferred = publicCandidate("ambiguous", null, { key: "GENERIC_COVER", ratio: "unknown", source: "10_RELEASE", candidates: allImages });
    }
  }
  if (!preferred) preferred = publicCandidate("missing", null, { key: "COVER_16_9", ratio: "16:9" });
  return { ...byKey, preferred };
}

function projectIdentity(project) {
  const canonicalFolderName = Contract.canonicalProjectFolderName(project.projectData || { projectId: project.projectId, name: project.name });
  return {
    canonicalFolderName,
    folderName: path.basename(project.projectRoot),
    reusedLegacyFolder: path.basename(project.projectRoot) !== canonicalFolderName,
  };
}

async function discoverProjectAssets({ workspaceRoot, projectId } = {}) {
  const project = await resolveProjectRootById(workspaceRoot, projectId);
  if (!project) {
    return {
      projectId: String(projectId || ""),
      projectRoot: "",
      canonicalFolderName: "",
      reusedLegacyFolder: false,
      status: "project_missing",
      video: publicCandidate("missing"),
      covers: { preferred: publicCandidate("missing") },
      warnings: ["未在已配置 Workspace Root 中找到该 creatorProjectId"],
    };
  }
  const video = await discoverVideo(project);
  const covers = await discoverCovers(project);
  const identity = projectIdentity(project);
  const warnings = [];
  if (video.status === "missing") warnings.push("未找到本项目成片，请手动选择");
  if (video.status === "ambiguous") warnings.push("发现多个 Final Video 候选，必须手动选择");
  if (covers.preferred.status === "missing") warnings.push("未找到封面；封面是可选项，可手动选择");
  if (covers.preferred.status === "ambiguous") warnings.push("发现多个封面候选，必须手动选择");
  return { projectId: project.projectId, projectRoot: project.projectRoot, ...identity, status: "resolved", video, covers, warnings };
}

module.exports = { resolveProjectRootById, discoverVideo, discoverCovers, discoverProjectAssets, projectIdentity };
