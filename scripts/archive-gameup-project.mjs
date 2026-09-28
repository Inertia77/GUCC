#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const activeRoot = path.join(root, "GameUp", "Game_up_projects");
const archiveRoot = path.join(root, "GameUp", "_archive");
const indexPath = path.join(root, "GameUp", "archive_index.json");

function parseArgs(argv) {
  const result = { project: "", year: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project") result.project = String(argv[++i] || "").trim();
    else if (arg === "--year") result.year = String(argv[++i] || "").trim();
    else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function usage() {
  return `Archive a completed GameUp project locally while keeping a Git pointer.

Usage:
  npm run gameup:archive -- --project "<project path>"
  npm run gameup:archive -- --project "<project path>" --year 2026

Example:
  npm run gameup:archive -- --project "鸣潮3.7"

Run this only after the project is FINAL/QC_PASS/PUBLISHED and its trackable files are committed.
Heavy media moves with the project into GameUp/_archive/, which is ignored by Git.
`;
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function normalizeProject(value) {
  if (!value) throw new Error("--project is required");
  if (path.isAbsolute(value)) throw new Error("--project must be relative to GameUp/Game_up_projects");
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid --project path");
  }
  return normalized;
}

function jstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: value.year, date: `${value.year}-${value.month}-${value.day}` };
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const project = normalizeProject(args.project);
  const source = path.join(activeRoot, ...project.split("/"));
  if (!(await exists(source))) throw new Error(`Project not found: GameUp/Game_up_projects/${project}`);
  const stat = await fs.stat(source);
  if (!stat.isDirectory()) throw new Error("--project must point to a project directory");

  const sourceRelative = path.posix.join("GameUp", "Game_up_projects", project);
  const dirty = git(["status", "--porcelain", "--untracked-files=all", "--", sourceRelative]);
  if (dirty) {
    throw new Error(
      `Project has uncommitted trackable changes. Commit them before archiving so final_git_commit is recoverable.\n${dirty}`
    );
  }

  const now = new Date();
  const jst = jstDateParts(now);
  const year = args.year || jst.year;
  if (!/^\d{4}$/.test(year)) throw new Error("--year must be four digits");

  const destination = path.join(archiveRoot, year, ...project.split("/"));
  if (await exists(destination)) throw new Error(`Archive destination already exists: ${path.relative(root, destination)}`);

  const head = git(["rev-parse", "HEAD"]);
  const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
  if (!Array.isArray(index.projects)) throw new Error("GameUp/archive_index.json has invalid schema");

  const record = {
    project_name: path.basename(project),
    source_path: sourceRelative,
    archive_path: path.posix.join("GameUp", "_archive", year, project),
    archive_date_jst: jst.date,
    archived_at: now.toISOString(),
    final_git_commit: head,
  };

  const next = {
    ...index,
    schema_version: 1,
    updated_at: now.toISOString(),
    projects: [...index.projects.filter((item) => item.source_path !== sourceRelative), record]
      .sort((a, b) => String(b.archived_at).localeCompare(String(a.archived_at))),
  };

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(source, destination);
  try {
    await fs.writeFile(indexPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch (error) {
    await fs.mkdir(path.dirname(source), { recursive: true }).catch(() => {});
    await fs.rename(destination, source).catch(() => {});
    throw error;
  }

  console.log(`Archived: ${sourceRelative} -> ${record.archive_path}`);
  console.log(`Recoverable Git snapshot: ${head}`);
  console.log("Next: git add -A GameUp && git commit -m \"archive(gameup): archive completed project\"");
}

main().catch((error) => {
  console.error(`GameUp archive failed: ${error.message}`);
  process.exit(1);
});
