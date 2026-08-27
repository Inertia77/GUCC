import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GUCC_DRIVE_ROOT_FOLDER_ID = "1wVMD-nIk6ArtGDi5gyOCmhW1pY-iRM9L";
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
    version: 2,
    provider: "google_drive",
    scope: GOOGLE_DRIVE_SCOPE,
    clientId: String(config.clientId || ""),
    clientSecret: String(config.clientSecret || ""),
    refreshToken: String(config.refreshToken || ""),
    rootFolderId: String(config.rootFolderId || ""),
    rootAuthorizedAt: String(config.rootAuthorizedAt || ""),
    createdAt: config.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!safe.clientId || !safe.refreshToken) throw new Error("OAuth config requires clientId and refreshToken");
  await atomicPrivateJsonWrite(filePath, safe);
  return filePath;
}

function base64url(buffer) { return Buffer.from(buffer).toString("base64url"); }
function pkcePair() {
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function browserLaunchCommand(url, platform = process.platform) {
  if (platform === "win32") return ["explorer.exe", [String(url)]];
  if (platform === "darwin") return ["open", [String(url)]];
  return ["xdg-open", [String(url)]];
}

function openBrowser(url) {
  const command = browserLaunchCommand(url);
  try {
    const child = spawn(command[0], command[1], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    // The URL is also printed to the terminal.
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

async function accessTokenFetch(accessToken, url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${accessToken}`);
  return fetch(url, { ...init, headers });
}

export async function probeDriveRootAccessWithToken(accessToken, folderId = GUCC_DRIVE_ROOT_FOLDER_ID) {
  const url = `${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,parents,webViewLink`;
  const response = await accessTokenFetch(accessToken, url);
  if (!response.ok) {
    const detail = redactErrorText(await response.text());
    return { ok: false, status: response.status, detail: detail.slice(0, 600) };
  }
  const file = await response.json();
  if (file?.mimeType !== FOLDER_MIME) return { ok: false, status: 409, detail: "Configured GUCC Drive root is not a folder" };
  return { ok: true, status: 200, file };
}

function pickerHtml({ accessToken, developerKey, appId, expectedFolderId }) {
  const token = JSON.stringify(String(accessToken));
  const key = JSON.stringify(String(developerKey));
  const applicationId = JSON.stringify(String(appId));
  const expected = JSON.stringify(String(expectedFolderId));
  return `<!doctype html><html><head><meta charset="utf-8"><title>GUCC Drive Root Authorization</title>
<script src="https://apis.google.com/js/api.js"></script></head><body style="font-family:system-ui;padding:24px;max-width:680px;margin:auto">
<h1>Authorize GUCC Creator Projects</h1><p>Select the existing <strong>GUCC Creator Projects</strong> folder. GUCC keeps the <code>drive.file</code> scope and will reject any different folder.</p>
<p id="status">Loading Google Picker…</p><script>
const ACCESS_TOKEN=${token}; const API_KEY=${key}; const APP_ID=${applicationId}; const EXPECTED=${expected};
function showPicker(){
  const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
  const picker = new google.picker.PickerBuilder().addView(view).setOAuthToken(ACCESS_TOKEN).setDeveloperKey(API_KEY).setAppId(APP_ID).setTitle('Select GUCC Creator Projects').setCallback(async data => {
    if(data.action !== google.picker.Action.PICKED) return;
    const doc = data.docs && data.docs[0];
    const id = doc && doc.id;
    if(id !== EXPECTED){ document.getElementById('status').textContent='Wrong folder selected. Please select the existing GUCC Creator Projects root.'; return; }
    const res = await fetch('/picker/selected', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,name:doc.name||''})});
    document.getElementById('status').textContent = res.ok ? 'GUCC Drive root authorized. You may close this tab.' : 'Authorization confirmation failed.';
  }).build(); picker.setVisible(true);
}
gapi.load('picker',{callback:showPicker});
</script></body></html>`;
}

export async function authorizeExistingDriveRootWithPicker({ accessToken, expectedFolderId = GUCC_DRIVE_ROOT_FOLDER_ID, developerKey = process.env.GUCC_GOOGLE_PICKER_API_KEY, appId = process.env.GUCC_GOOGLE_APP_ID, open = true } = {}) {
  if (!developerKey || !appId) {
    throw new Error("drive.file cannot access the existing GUCC Drive root yet. Configure GUCC_GOOGLE_PICKER_API_KEY and GUCC_GOOGLE_APP_ID, then rerun --setup-drive to authorize that exact folder without widening the Drive scope.");
  }
  const server = http.createServer();
  let resolvePicked; let rejectPicked;
  const picked = new Promise((resolve, reject) => { resolvePicked = resolve; rejectPicked = reject; });
  const timer = setTimeout(() => rejectPicked(new Error("Google Picker folder authorization timed out")), 5 * 60 * 1000);
  server.on("request", async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(pickerHtml({ accessToken, developerKey, appId, expectedFolderId }));
        return;
      }
      if (req.method === "POST" && req.url === "/picker/selected") {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (String(body.id || "") !== expectedFolderId) { res.writeHead(400).end("Wrong folder"); return; }
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("Authorized");
        clearTimeout(timer); resolvePicked({ id: expectedFolderId, name: String(body.name || "") }); return;
      }
      res.writeHead(404).end("Not found");
    } catch (error) { clearTimeout(timer); rejectPicked(error); res.writeHead(500).end("Picker authorization failed"); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); const url = `http://127.0.0.1:${address.port}/`;
  console.log(`Authorize existing GUCC Drive root with Google Picker: ${url}`);
  if (open) openBrowser(url);
  try { return await picked; }
  finally { clearTimeout(timer); await new Promise((resolve) => server.close(resolve)); }
}

export async function setupDriveOAuth({ clientId = process.env.GUCC_GOOGLE_CLIENT_ID, clientSecret = process.env.GUCC_GOOGLE_CLIENT_SECRET || "", configPath = defaultOAuthConfigPath(), open = true, rootFolderId = GUCC_DRIVE_ROOT_FOLDER_ID } = {}) {
  assertClientId(clientId);
  const state = base64url(crypto.randomBytes(24)); const { verifier, challenge } = pkcePair(); const server = http.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPE); url.searchParams.set("access_type", "offline"); url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state); url.searchParams.set("code_challenge", challenge); url.searchParams.set("code_challenge_method", "S256");

  const callbackPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Google OAuth callback timed out")), 5 * 60 * 1000);
    server.on("request", (req, res) => {
      const incoming = new URL(req.url || "/", redirectUri);
      if (incoming.pathname !== "/oauth2/callback") { res.writeHead(404).end("Not found"); return; }
      const returnedState = incoming.searchParams.get("state"); const code = incoming.searchParams.get("code"); const oauthError = incoming.searchParams.get("error");
      if (returnedState !== state) { res.writeHead(400).end("GUCC Google Drive OAuth state mismatch. You may close this tab."); clearTimeout(timer); reject(new Error("Google OAuth state mismatch")); return; }
      if (oauthError || !code) { res.writeHead(400).end("GUCC Google Drive OAuth was not completed. You may close this tab."); clearTimeout(timer); reject(new Error(`Google OAuth denied: ${oauthError || "missing code"}`)); return; }
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("GUCC Google Drive OAuth completed. Folder authorization may open next.");
      clearTimeout(timer); resolve(code);
    });
  });

  console.log(`Google Drive OAuth scope: ${GOOGLE_DRIVE_SCOPE}`); console.log(`Authorize GUCC Creator Archive: ${url.href}`); if (open) openBrowser(url.href);
  let token;
  try {
    const code = await callbackPromise;
    token = await formPost(TOKEN_URL, { client_id: clientId, ...(clientSecret ? { client_secret: clientSecret } : {}), code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri });
    if (!token.refresh_token || !token.access_token) throw new Error("Google OAuth did not return the required tokens; revoke the prior grant and run setup again");
  } finally { await new Promise((resolve) => server.close(resolve)); }

  let probe = await probeDriveRootAccessWithToken(token.access_token, rootFolderId);
  if (!probe.ok && [403, 404].includes(probe.status)) {
    console.log(`Existing GUCC Drive root is not yet authorized for drive.file (${probe.status}). Starting one-time folder authorization.`);
    await authorizeExistingDriveRootWithPicker({ accessToken: token.access_token, expectedFolderId: rootFolderId, open });
    probe = await probeDriveRootAccessWithToken(token.access_token, rootFolderId);
  }
  if (!probe.ok) throw new Error(`Google Drive root authorization failed (${probe.status}): ${probe.detail}`);
  if (String(probe.file?.id || "") !== rootFolderId) throw new Error("Google Drive root authorization returned an unexpected folder id");

  await saveOAuthConfig({ clientId, clientSecret, refreshToken: token.refresh_token, rootFolderId, rootAuthorizedAt: new Date().toISOString() }, configPath);
  console.log(`Google Drive OAuth + root authorization saved locally: ${configPath}`);
  return { configPath, scope: GOOGLE_DRIVE_SCOPE, rootFolderId };
}

export async function accessTokenFromConfig(config) {
  if (!config?.clientId || !config?.refreshToken) throw new Error("Google Drive OAuth is not configured; run npm run creator:archive -- --setup-drive");
  const token = await formPost(TOKEN_URL, { client_id: config.clientId, ...(config.clientSecret ? { client_secret: config.clientSecret } : {}), refresh_token: config.refreshToken, grant_type: "refresh_token" });
  if (!token.access_token) throw new Error("Google OAuth refresh did not return an access token");
  return token.access_token;
}

async function driveFetch(config, url, init = {}) {
  const token = await accessTokenFromConfig(config); const headers = new Headers(init.headers || {}); headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) { const text = await response.text(); throw new Error(`Google Drive API failed (${response.status}): ${redactErrorText(text).slice(0, 600)}`); }
  return response;
}

function escapeQueryValue(value) { return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
function multipartBody(metadata, content, mimeType) {
  const boundary = `gucc_${crypto.randomBytes(16).toString("hex")}`;
  const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`), Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`), Buffer.from(String(content), "utf8"), Buffer.from(`\r\n--${boundary}--\r\n`)]);
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export class GoogleDriveTransport {
  constructor(config) { if (!config) throw new Error("Google Drive OAuth config is required"); this.config = config; }
  async assertFolderAccess({ folderId = this.config.rootFolderId || GUCC_DRIVE_ROOT_FOLDER_ID } = {}) {
    const file = await this.getFile({ fileId: folderId });
    if (file?.mimeType !== FOLDER_MIME) throw new Error("Authorized Google Drive archive root is not a folder");
    return file;
  }
  async findChildren({ parentId, name, mimeType = "", excludeFolders = false }) {
    const terms = [`'${escapeQueryValue(parentId)}' in parents`, `name = '${escapeQueryValue(name)}'`, "trashed = false"];
    if (mimeType) terms.push(`mimeType = '${escapeQueryValue(mimeType)}'`); if (excludeFolders) terms.push(`mimeType != '${FOLDER_MIME}'`);
    const url = new URL(`${DRIVE_API}/files`); url.searchParams.set("q", terms.join(" and ")); url.searchParams.set("spaces", "drive");
    url.searchParams.set("fields", "files(id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink)"); url.searchParams.set("pageSize", "100");
    const response = await driveFetch(this.config, url); const payload = await response.json(); return Array.isArray(payload.files) ? payload.files : [];
  }
  async createFolder({ parentId, name }) {
    const response = await driveFetch(this.config, `${DRIVE_API}/files?fields=id,name,mimeType,parents,createdTime,modifiedTime,webViewLink`, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }) });
    return response.json();
  }
  async createTextFile({ parentId, name, content, mimeType }) {
    const multipart = multipartBody({ name, parents: [parentId] }, content, mimeType);
    const response = await driveFetch(this.config, `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`, { method: "POST", headers: { "content-type": multipart.contentType }, body: multipart.body });
    return response.json();
  }
  async updateTextFile({ fileId, name, content, mimeType }) {
    const multipart = multipartBody({ name }, content, mimeType);
    const response = await driveFetch(this.config, `${DRIVE_UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`, { method: "PATCH", headers: { "content-type": multipart.contentType }, body: multipart.body });
    return response.json();
  }
  async getFile({ fileId }) { const response = await driveFetch(this.config, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink`); return response.json(); }
  async readTextFile({ fileId }) { const response = await driveFetch(this.config, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`); return response.text(); }
}

export function oauthConfigExists(filePath = defaultOAuthConfigPath()) { return fs.existsSync(filePath); }
