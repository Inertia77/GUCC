(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccLocalProjectContract = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WINDOWS_RESERVED = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;
  const PROJECTION_MANIFEST = "00_CONTROL/.gucc-projections.json";
  const VIDEO_EXTENSIONS = Object.freeze([".mp4", ".mov", ".webm", ".mkv"]);
  const IMAGE_EXTENSIONS = Object.freeze([".png", ".jpg", ".jpeg", ".webp"]);
  const COVER_ARTIFACTS = Object.freeze({
    COVER_16_9: Object.freeze({ key: "COVER_16_9", ratio: "16:9", stem: "COVER_16_9", directory: "10_RELEASE", generatorToken: "16x9_1920x1080" }),
    COVER_4_3: Object.freeze({ key: "COVER_4_3", ratio: "4:3", stem: "COVER_4_3", directory: "10_RELEASE", generatorToken: "4x3_1600x1200" }),
    COVER_3_4: Object.freeze({ key: "COVER_3_4", ratio: "3:4", stem: "COVER_3_4", directory: "10_RELEASE", generatorToken: "3x4_1200x1600" }),
    COVER_9_16: Object.freeze({ key: "COVER_9_16", ratio: "9:16", stem: "COVER_9_16", directory: "10_RELEASE", generatorToken: "9x16_1080x1920" }),
  });

  function text(value) { return String(value == null ? "" : value).trim(); }

  function safeProjectName(value, maxLength = 68) {
    let result = text(value || "PROJECT")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[. _]+|[. _]+$/g, "");
    if (!result) result = "PROJECT";
    if (WINDOWS_RESERVED.test(result)) result = `_${result}`;
    result = result.slice(0, Math.max(8, Number(maxLength) || 68)).replace(/[. _]+$/g, "");
    return result || "PROJECT";
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (const char of String(value)) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function shortProjectId(projectId) {
    const raw = text(projectId);
    if (!raw) throw new Error("projectId is required");
    const parts = raw.split(/[_-]+/).map((part) => part.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
    const tail = parts[parts.length - 1] || "";
    if (tail.length >= 6 && tail.length <= 12) return tail.slice(-6).toLowerCase();
    return fnv1a(raw).toString(36).padStart(6, "0").slice(-6);
  }

  function canonicalProjectFolderName(project) {
    const projectId = text(project?.projectId || project?.project_id);
    if (!projectId) throw new Error("projectId is required for canonical folder identity");
    const title = project?.name || project?.title || "PROJECT";
    return `${safeProjectName(title)}_${shortProjectId(projectId)}`;
  }

  function normalizeRelativePath(value) {
    const raw = text(value).replace(/\\/g, "/");
    if (!raw) throw new Error("relative path is empty");
    if (/^(?:[A-Za-z]:\/|\/|\/\/)/.test(raw)) throw new Error(`absolute path is not allowed: ${raw}`);
    const parts = raw.split("/").filter((part) => part && part !== ".");
    if (!parts.length || parts.includes("..")) throw new Error(`path traversal is not allowed: ${raw}`);
    return parts.join("/");
  }

  function extension(value) {
    const match = text(value).toLowerCase().match(/(\.[a-z0-9]+)$/);
    return match ? match[1] : "";
  }

  function isVideoName(name) { return VIDEO_EXTENSIONS.includes(extension(name)); }
  function isImageName(name) { return IMAGE_EXTENSIONS.includes(extension(name)); }

  return Object.freeze({
    PROJECTION_MANIFEST,
    VIDEO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    COVER_ARTIFACTS,
    safeProjectName,
    shortProjectId,
    canonicalProjectFolderName,
    normalizeRelativePath,
    extension,
    isVideoName,
    isImageName,
  });
});
