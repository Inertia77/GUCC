import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function defaultOAuthConfigPath() {
  return path.join(os.homedir(), ".gucc", "creator-archive-google-oauth.json");
}

function assertClientId(clientId) {
  if (!String(clientId || "").trim()) throw new Error("GUCC_GOOGLE_CLIENT_ID is required for Google Drive OAuth setup");
}

function redactErrorText(value) {
  return String(value || "").replace(/(?:access_token|refresh_token|authorization)[^\s,}]*/gi, "[redacted]");
}

async function atomicPrivateJsonWrite(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await fsp.chmod(temp, 0o600);
  await fsp.rename(temp, filePath);
  if (process.platform !== "win32") await fsp.chmod(filePath, 0o600);
}

export async function loadOAuthConfig(filePath = defaultOAuthConfigPath()) {
  try {
    const parsed = JSON.parse(await fsp.readFile(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveOAuthConfig(config, filePath = defaultOAuthConfigPath()) {
  const safe = {
    version: 1,
    provider: "google_drive",
    scope: GOOGLE_DRIVE_SCOPE,
    clientId: String(config.clientId || ""),
    clientSecret: String(config.clientSecret || ""),
    refreshToken: String(config.refreshToken || ""),
    createdAt: config.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!safe.clientId || !safe.refreshToken) throw new Error("OAuth config requires clientId and refreshToken");
  await atomicPrivateJsonWrite(filePath, safe);
  return filePath;
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function pkcePair() {
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url) {
  const command = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin" ? ["open", [url]]
    : ["xdg-open", [url]];
  try {
    const child = spawn(command[0], command[1], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    // Caller also receives the URL, so browser auto-open failure is non-fatal.
  }
}

async function formPost(url, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google OAuth request failed (${response.status}): ${redactErrorText(payload.error_description || payload.error || "unknown error")}`);
  return payload;
}

export async function setupDriveOAuth({ clientId = process.env.GUCC_GOOGLE_CLIENT_ID, clientSecret = process.env.GUCC_GOOGLE_CLIENT_SECRET || "", configPath = defaultOAuthConfigPath(), open = true } = {}) {
  assertClientId(clientId);
  const state = base64url(crypto.randomBytes(24));
  const { verifier, challenge } = pkcePair();
  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const callbackPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Google OAuth callback timed out")), 5 * 60 * 1000);
    server.on("request", (req, res) => {
      const incoming = new URL(req.url || "/", redirectUri);
      if (incoming.pathname !== "/oauth2/callback") { res.writeHead(404).end("Not found"); return; }
      const returnedState = incoming.searchParams.get("state");
      const code = incoming.searchParams.get("code");
      const oauthError = incoming.searchParams.get("error");
      if (returnedState !== state) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("GUCC Google Drive OAuth state mismatch. You may close this tab.");
        clearTimeout(timer); reject(new Error("Google OAuth state mismatch")); return;
      }
      if (oauthError || !code) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("GUCC Google Drive OAuth was not completed. You may close this tab.");
        clearTimeout(timer); reject(new Error(`Google OAuth denied: ${oauthError || "missing code"}`)); return;
      }
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("GUCC Google Drive archive authorization completed. You may close this tab.");
      clearTimeout(timer); resolve(code);
    });
  });

  console.log(`Google Drive OAuth scope: ${GOOGLE_DRIVE_SCOPE}`);
  console.log(`Authorize GUCC Creator Archive: ${url.href}`);
  if (open) openBrowser(url.href);
  try {
    const code = await callbackPromise;
    const token = await formPost(TOKEN_URL, {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    if (!token.refresh_token) throw new Error("Google OAuth did not return a refresh token; revoke the prior grant and run setup again");
    await saveOAuthConfig({ clientId, clientSecret, refreshToken: token.refresh_token }, configPath);
    console.log(`Google Drive OAuth saved locally: ${configPath}`);
    return { configPath, scope: GOOGLE_DRIVE_SCOPE };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function accessTokenFromConfig(config) {
  if (!config?.clientId || !config?.refreshToken) throw new Error("Google Drive OAuth is not configured; run npm run creator:archive -- --setup-drive");
  const token = await formPost(TOKEN_URL, {
    client_id: config.clientId,
    ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
  if (!token.access_token) throw new Error("Google OAuth refresh did not return an access token");
  return token.access_token;
}

async function driveFetch(config, url, init = {}) {
  const token = await accessTokenFromConfig(config);
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive API failed (${response.status}): ${redactErrorText(text).slice(0, 600)}`);
  }
  return response;
}

function escapeQueryValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function multipartBody(metadata, content, mimeType) {
  const boundary = `gucc_${crypto.randomBytes(16).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.from(String(content), "utf8"),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export class GoogleDriveTransport {
  constructor(config) {
    if (!config) throw new Error("Google Drive OAuth config is required");
    this.config = config;
  }

  async findChildren({ parentId, name, mimeType = "", excludeFolders = false }) {
    const terms = [`'${escapeQueryValue(parentId)}' in parents`, `name = '${escapeQueryValue(name)}'`, "trashed = false"];
    if (mimeType) terms.push(`mimeType = '${escapeQueryValue(mimeType)}'`);
    if (excludeFolders) terms.push(`mimeType != '${FOLDER_MIME}'`);
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set("q", terms.join(" and "));
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("fields", "files(id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink)");
    url.searchParams.set("pageSize", "100");
    const response = await driveFetch(this.config, url);
    const payload = await response.json();
    return Array.isArray(payload.files) ? payload.files : [];
  }

  async createFolder({ parentId, name }) {
    const response = await driveFetch(this.config, `${DRIVE_API}/files?fields=id,name,mimeType,parents,createdTime,modifiedTime,webViewLink`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    });
    return response.json();
  }

  async createTextFile({ parentId, name, content, mimeType }) {
    const multipart = multipartBody({ name, parents: [parentId] }, content, mimeType);
    const response = await driveFetch(this.config, `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`, {
      method: "POST", headers: { "content-type": multipart.contentType }, body: multipart.body,
    });
    return response.json();
  }

  async updateTextFile({ fileId, name, content, mimeType }) {
    const multipart = multipartBody({ name }, content, mimeType);
    const response = await driveFetch(this.config, `${DRIVE_UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`, {
      method: "PATCH", headers: { "content-type": multipart.contentType }, body: multipart.body,
    });
    return response.json();
  }

  async getFile({ fileId }) {
    const response = await driveFetch(this.config, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`);
    return response.json();
  }

  async readTextFile({ fileId }) {
    const response = await driveFetch(this.config, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
    return response.text();
  }
}

export function oauthConfigExists(filePath = defaultOAuthConfigPath()) {
  return fs.existsSync(filePath);
}
