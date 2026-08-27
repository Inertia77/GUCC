"use strict";

const SUPABASE_URL = "https://rubjeqnuxuvupjwyksmo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YmplcW51eHV2dXBqd3lrc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTI3MzYsImV4cCI6MjA5NzE4ODczNn0.wkepivscs96lZAsG82LI0DF3Pvi2TDue6hwuYeQXIgU";
const CREATOR_API = `${SUPABASE_URL}/functions/v1/creator-project-api`;

class CloudError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "CloudError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new CloudError(payload.error_description || payload.msg || payload.message || payload.error || `HTTP ${response.status}`, response.status, payload);
  return payload;
}

async function passwordLogin(email, password, fetchImpl = fetch) {
  const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

async function refreshSession(refreshToken, fetchImpl = fetch) {
  if (!refreshToken) throw new CloudError("Creator Agent has no refresh token. Run --setup first.", 401);
  const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return parseResponse(response);
}

class CreatorCloudClient {
  constructor({ refreshToken, onRefreshToken, fetchImpl = fetch }) {
    this.refreshToken = refreshToken || "";
    this.accessToken = "";
    this.onRefreshToken = typeof onRefreshToken === "function" ? onRefreshToken : async () => {};
    this.fetchImpl = fetchImpl;
    this.refreshing = null;
  }

  async refresh() {
    if (!this.refreshing) {
      this.refreshing = refreshSession(this.refreshToken, this.fetchImpl).then(async (session) => {
        this.accessToken = session.access_token || "";
        if (!this.accessToken) throw new CloudError("Supabase refresh response has no access token", 401);
        if (session.refresh_token && session.refresh_token !== this.refreshToken) {
          this.refreshToken = session.refresh_token;
          await this.onRefreshToken(session.refresh_token);
        }
        return session;
      }).finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  async api(action, payload = {}, retry = true) {
    if (!this.accessToken) await this.refresh();
    const response = await this.fetchImpl(CREATOR_API, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${this.accessToken}` },
      body: JSON.stringify({ action, ...payload }),
    });
    if (response.status === 401 && retry) {
      this.accessToken = "";
      await this.refresh();
      return this.api(action, payload, false);
    }
    return parseResponse(response);
  }

  ping() { return this.api("ping"); }
  getDevice(deviceId) { return this.api("getDevice", { deviceId }); }
  registerDevice(deviceId, device) { return this.api("registerDevice", { deviceId, device }); }
  getProject(projectId) { return this.api("getProject", { projectId }); }
  saveFileLocationsBatch(projectId, deviceId, device, locations) {
    return this.api("saveFileLocationsBatch", { projectId, deviceId, device, locations });
  }
}

module.exports = { SUPABASE_URL, SUPABASE_ANON_KEY, CREATOR_API, CloudError, passwordLogin, refreshSession, CreatorCloudClient };
