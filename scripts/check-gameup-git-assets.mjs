#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const activeRoot = "GameUp/Game_up_projects";
const maxMiB = Number(process.env.GUCC_GAMEUP_MAX_FILE_MB || 20);
const maxBytes = maxMiB * 1024 * 1024;

const forbiddenExtensions = new Set([
  ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v",
  ".wav", ".flac", ".m4a", ".aac", ".mp3", ".ogg", ".opus",
  ".zip", ".7z", ".rar", ".exe", ".psd", ".aep", ".prproj",
  ".part", ".ytdl",
]);

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

const errors = [];
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
const ignoreLines = gitignore.split(/\r?\n/).map((line) => line.trim());

if (ignoreLines.includes("GameUp/") || ignoreLines.includes("/GameUp/")) {
  errors.push("根 .gitignore 仍在整体忽略 GameUp/；Active Workspace 必须可追踪。");
}
if (!ignoreLines.includes("GameUp/_archive/")) {
  errors.push(".gitignore 缺少 GameUp/_archive/，完成项目可能被重新提交。");
}

const output = git(["ls-files", "-z", "--", activeRoot]);
const tracked = output.split("\0").filter(Boolean);

for (const relative of tracked) {
  const full = resolve(root, relative);
  let size;
  try {
    size = statSync(full).size;
  } catch {
    continue;
  }

  const extension = extname(relative).toLowerCase();
  if (forbiddenExtensions.has(extension)) {
    errors.push(`${relative}: 生产重资产不应进入普通 Git（${extension}）。`);
  }
  if (size > maxBytes) {
    errors.push(`${relative}: ${(size / 1024 / 1024).toFixed(1)} MiB，超过 GameUp Git 上限 ${maxMiB} MiB。`);
  }
}

if (errors.length) {
  console.error(`GameUp Git Guard 失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  console.error("请把重资产留在本地/归档区，只提交文案、字幕、配置、脚本、小型视觉资产等可版本化内容。");
  process.exit(1);
}

console.log(`GameUp Git Guard 通过：检查 ${tracked.length} 个 Active Workspace 已追踪文件，单文件上限 ${maxMiB} MiB。`);
