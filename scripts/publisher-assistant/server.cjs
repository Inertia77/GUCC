"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright-core");
const { preparePlatform } = require("./adapters.cjs");

const HOST = "127.0.0.1";
const PORT = Number(process.env.GUCC_PUBLISHER_PORT || 17877);
const ROOT = path.resolve(__dirname, "..", "..");
const PICKER_SCRIPT = path.resolve(__dirname, "windows-file-picker.ps1");
const PROFILE_DIR = process.env.GUCC_PUBLISHER_PROFILE || path.join(process.env.LOCALAPPDATA || os.homedir(), "GUCC", "publisher-profile");
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "https://inertia77.github.io"
]);
const PLATFORM_URLS = {
  bilibili: "https://member.bilibili.com/platform/upload/video/frame/",
  douyin: "https://creator.douyin.com/creator-micro/content/upload",
  xiaohongshu: "https://creator.xiaohongshu.com/publish/publish?from=menu&target=video",
  wechat: "https://channels.weixin.qq.com/platform/post/create",
  youtube: "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/videos/upload?d=ud&filter=%5B%5D&sort=%7B%22columnType%22%3A%22date%22%2C%22sortOrder%22%3A%22DESCENDING%22%7D",
  tiktok: "https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=video"
};

const jobs = new Map();
let browserContext = null;
let launchPromise = null;
const pages = new Map();

function allowedOrigin(request) {
  const origin = request.headers.origin;
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:8000",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function sendJson(request, response, status, data) {
  response.writeHead(status, { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      reject(new Error("Content-Type 必须是 application/json"));
      return;
    }
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) { reject(new Error("请求内容超过 5MB")); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("请求 JSON 无法解析")); }
    });
    request.on("error", reject);
  });
}

function validateFile(filePath, kind) {
  const value = String(filePath || "").trim();
  if (!value || !path.isAbsolute(value)) throw new Error(`${kind === "video" ? "视频" : "封面"}路径不是有效的绝对路径`);
  const stat = fs.statSync(value);
  if (!stat.isFile()) throw new Error(`${value} 不是普通文件`);
  const extension = path.extname(value).toLowerCase();
  const allowed = kind === "video" ? new Set([".mp4", ".mov", ".webm", ".mkv"]) : new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (!allowed.has(extension)) throw new Error(`${kind === "video" ? "视频" : "封面"}扩展名 ${extension || "未知"} 不在允许列表中`);
  return path.resolve(value);
}

async function ensureBrowser() {
  if (browserContext) return browserContext;
  if (launchPromise) return launchPromise;
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  launchPromise = (async () => {
    let lastError;
    for (const channel of ["msedge", "chrome"]) {
      try {
        const context = await chromium.launchPersistentContext(PROFILE_DIR, {
          channel,
          headless: false,
          viewport: null,
          acceptDownloads: true,
          args: ["--start-maximized", "--disable-session-crashed-bubble"]
        });
        context.on("close", () => { browserContext = null; pages.clear(); });
        browserContext = context;
        console.log(`[browser] Using ${channel}; profile: ${PROFILE_DIR}`);
        return context;
      } catch (error) { lastError = error; }
    }
    throw new Error(`无法启动 Microsoft Edge 或 Google Chrome：${lastError?.message || "unknown error"}`);
  })().finally(() => { launchPromise = null; });
  return launchPromise;
}

async function platformPage(key) {
  const context = await ensureBrowser();
  const existing = pages.get(key);
  if (existing && !existing.isClosed()) return existing;
  const page = await context.newPage();
  pages.set(key, page);
  page.on("close", () => { if (pages.get(key) === page) pages.delete(key); });
  return page;
}

async function openLoginPages(platformKeys) {
  await ensureBrowser();
  await Promise.all(platformKeys.filter((key) => PLATFORM_URLS[key]).map(async (key) => {
    const page = await platformPage(key);
    await page.goto(PLATFORM_URLS[key], { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  }));
  const first = pages.get(platformKeys[0]);
  if (first) await first.bringToFront();
}

function newJob(platformKeys) {
  const id = crypto.randomUUID();
  const platforms = Object.fromEntries(platformKeys.map((key) => [key, { status: "queued", filled: [], warnings: [] }]));
  const job = { id, status: "queued", current: "", createdAt: new Date().toISOString(), finishedAt: "", platforms, error: "" };
  jobs.set(id, job);
  if (jobs.size > 30) jobs.delete(jobs.keys().next().value);
  return job;
}

function publicJob(job) {
  return JSON.parse(JSON.stringify(job));
}

async function runJob(job, payload) {
  job.status = "running";
  try {
    const videoPath = validateFile(payload.videoPath, "video");
    const coverPath = payload.coverPath ? validateFile(payload.coverPath, "image") : "";
    for (const key of Object.keys(job.platforms)) {
      job.current = key;
      job.platforms[key].status = "running";
      try {
        const page = await platformPage(key);
        const result = await preparePlatform({
          page,
          key,
          uploadUrl: PLATFORM_URLS[key],
          data: payload.platforms[key] || {},
          videoPath,
          coverPath
        });
        job.platforms[key] = {
          status: result.needsLogin ? "needs_login" : result.prepared ? "ready_for_review" : "needs_attention",
          filled: result.filled,
          warnings: result.warnings
        };
      } catch (error) {
        job.platforms[key] = { status: "failed", filled: [], warnings: [error.message] };
      }
    }
    const statuses = Object.values(job.platforms).map((item) => item.status);
    job.status = statuses.every((status) => status === "ready_for_review") ? "completed" : "needs_attention";
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
  } finally {
    job.current = "";
    job.finishedAt = new Date().toISOString();
  }
}

function selectFile(kind) {
  if (process.platform !== "win32") return Promise.reject(new Error("当前原生文件选择器仅支持 Windows；请在控制台输入绝对路径"));
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", PICKER_SCRIPT, "-Kind", kind], {
      windowsHide: true,
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      const value = stdout.trim();
      if (code !== 0) { reject(new Error(stderr.trim() || `文件选择器退出码 ${code}`)); return; }
      if (!value) { resolve(""); return; }
      try { resolve(validateFile(value, kind)); }
      catch (error) { reject(error); }
    });
  });
}

const server = http.createServer(async (request, response) => {
  if (!allowedOrigin(request)) { sendJson(request, response, 403, { ok: false, error: "Origin 不在允许列表" }); return; }
  if (request.method === "OPTIONS") { response.writeHead(204, corsHeaders(request)); response.end(); return; }
  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(request, response, 200, { ok: true, service: "GUCC Publisher Assistant", version: 1, browserOpen: Boolean(browserContext), profileDir: PROFILE_DIR });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/select-file") {
      const body = await readJson(request);
      const kind = body.kind === "image" ? "image" : "video";
      const filePath = await selectFile(kind);
      sendJson(request, response, 200, { ok: true, path: filePath, name: filePath ? path.basename(filePath) : "" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/open-login") {
      const body = await readJson(request);
      const platforms = Array.isArray(body.platforms) ? body.platforms.filter((key) => PLATFORM_URLS[key]) : Object.keys(PLATFORM_URLS);
      await openLoginPages(platforms);
      sendJson(request, response, 200, { ok: true, platforms });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/prepare") {
      const body = await readJson(request);
      const platforms = Array.isArray(body.enabled) ? body.enabled.filter((key) => PLATFORM_URLS[key] && body.platforms?.[key]) : [];
      if (!platforms.length) throw new Error("没有可执行的平台");
      validateFile(body.videoPath, "video");
      if (body.coverPath) validateFile(body.coverPath, "image");
      const job = newJob(platforms);
      setImmediate(() => runJob(job, body));
      sendJson(request, response, 202, { ok: true, job: publicJob(job) });
      return;
    }
    const match = request.method === "GET" && url.pathname.match(/^\/api\/jobs\/([0-9a-f-]+)$/i);
    if (match) {
      const job = jobs.get(match[1]);
      if (!job) { sendJson(request, response, 404, { ok: false, error: "任务不存在或已过期" }); return; }
      sendJson(request, response, 200, { ok: true, job: publicJob(job) });
      return;
    }
    sendJson(request, response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(request, response, 400, { ok: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`GUCC Publisher Assistant listening on http://${HOST}:${PORT}`);
  console.log(`Dedicated browser profile: ${PROFILE_DIR}`);
  console.log("The assistant prepares upload forms only; it never clicks the final publish button.");
});

function shutdown() {
  server.close(() => process.exit(0));
  if (browserContext) browserContext.close().catch(() => {});
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
