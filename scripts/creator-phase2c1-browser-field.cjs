"use strict";

const CRITICAL_STATIC_RESOURCES = Object.freeze([
  Object.freeze({ key: "publish-html", path: "/apps/publishing-console/", marker: "creator-publish-asset-discovery.js" }),
  Object.freeze({ key: "platform-rules.js", path: "/apps/publishing-console/platform-rules.js?v=1", marker: "GuccPublishingRules" }),
  Object.freeze({ key: "app.js", path: "/apps/publishing-console/app.js?v=1", marker: "gucc_publish_console_v1" }),
  Object.freeze({ key: "creator-publish-asset-discovery.js", path: "/assets/creator-publish-asset-discovery.js?v=1", marker: "discoverProjectAssetsButton" }),
  Object.freeze({ key: "access-guard.js", path: "/assets/access-guard.js", marker: "window.GuccAccess" }),
]);

const BROWSER_RESOURCE_KEYS = Object.freeze([
  "platform-rules.js",
  "app.js",
  "creator-publish-asset-discovery.js",
  "access-guard.js",
]);

const DEFAULT_EVALUATE_TIMEOUT_MS = 3000;

function normalizedPathname(value) {
  try { return new URL(value, "http://127.0.0.1").pathname; }
  catch { return String(value || "").split("?")[0]; }
}

function resourceKeyForUrl(url) {
  const pathname = normalizedPathname(url);
  if (pathname.endsWith("/apps/publishing-console/platform-rules.js")) return "platform-rules.js";
  if (pathname.endsWith("/apps/publishing-console/app.js")) return "app.js";
  if (pathname.endsWith("/assets/creator-publish-asset-discovery.js")) return "creator-publish-asset-discovery.js";
  if (pathname.endsWith("/assets/access-guard.js")) return "access-guard.js";
  return "";
}

function capPush(list, value, limit = 40) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

function withTimeout(promise, timeoutMs, label = "operation") {
  const ms = Math.max(1, Number(timeoutMs) || DEFAULT_EVALUATE_TIMEOUT_MS);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out after ${ms}ms`);
      error.code = "BROWSER_DIAGNOSTIC_TIMEOUT";
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

async function evaluateWithTimeout(page, pageFunction, arg, timeoutMs = DEFAULT_EVALUATE_TIMEOUT_MS, label = "page.evaluate") {
  return withTimeout(page.evaluate(pageFunction, arg), timeoutMs, label);
}

async function fetchTextCheck(baseUrl, resource, fetchImpl = fetch, timeoutMs = 1500) {
  const url = new URL(resource.path, baseUrl).href;
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    const text = await response.text().catch(() => "");
    const markerOk = !resource.marker || text.includes(resource.marker);
    return {
      key: resource.key,
      url,
      status: Number(response.status || 0),
      ok: Boolean(response.ok && markerOk),
      markerOk,
      error: response.ok ? (markerOk ? "" : `missing marker ${resource.marker}`) : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { key: resource.key, url, status: 0, ok: false, markerOk: false, error: error?.message || String(error) };
  }
}

async function verifyStaticTree(baseUrl, fetchImpl = fetch, timeoutMs = 1500) {
  const checks = [];
  for (const resource of CRITICAL_STATIC_RESOURCES) checks.push(await fetchTextCheck(baseUrl, resource, fetchImpl, timeoutMs));
  return { ok: checks.every((item) => item.ok), checks };
}

function formatStaticTree(result) {
  return (result?.checks || []).map((item) => `${item.key}:${item.ok ? `PASS:${item.status}` : `FAIL:${item.status || "ERR"}:${item.error}`}`).join(" | ");
}

async function publisherHealth(url, fetchImpl = fetch, timeoutMs = 1200) {
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    return { ok: Boolean(response.ok), status: Number(response.status || 0), error: response.ok ? "" : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, status: 0, error: error?.message || String(error) };
  }
}

function lifecycleErrorCode(lifecycle, stage = "browser-stage") {
  const first = lifecycle?.events?.find((item) => ["browser:disconnected", "context:closed", "page:closed", "page:crashed"].includes(item.kind));
  const kind = first?.kind
    || (lifecycle?.pageCrashed ? "page:crashed" : "")
    || (lifecycle?.browserDisconnected ? "browser:disconnected" : "")
    || (lifecycle?.contextClosed ? "context:closed" : "")
    || (lifecycle?.pageClosed ? "page:closed" : "");
  if (kind === "browser:disconnected") return "BROWSER_DISCONNECTED";
  if (kind === "context:closed") return "BROWSER_CONTEXT_CLOSED";
  if (kind === "page:crashed") return "PAGE_CRASHED";
  if (kind === "page:closed") return `PAGE_CLOSED_BEFORE_${String(stage || "BROWSER_STAGE").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  return "";
}

function attachPageDiagnostics(page, options = {}) {
  const context = typeof page.context === "function" ? page.context() : null;
  const browser = context && typeof context.browser === "function" ? context.browser() : null;
  const events = {
    console: [],
    pageErrors: [],
    requestFailed: [],
    responses: [],
    documents: [],
  };
  const lifecycle = {
    sequence: 0,
    currentStage: "browser-init",
    browserDisconnected: false,
    contextClosed: false,
    pageClosed: false,
    pageCrashed: false,
    events: [],
  };
  const responsesByKey = new Map();
  let lastSnapshotFailure = null;

  function recordLifecycle(kind) {
    const entry = {
      order: ++lifecycle.sequence,
      kind,
      stage: lifecycle.currentStage,
      at: new Date().toISOString(),
    };
    lifecycle.events.push(entry);
    if (kind === "browser:disconnected") lifecycle.browserDisconnected = true;
    if (kind === "context:closed") lifecycle.contextClosed = true;
    if (kind === "page:closed") lifecycle.pageClosed = true;
    if (kind === "page:crashed") lifecycle.pageCrashed = true;
    console.error(`browserLifecycle=${kind}:order=${entry.order}:stage=${entry.stage}`);
  }

  if (browser?.on) browser.on("disconnected", () => recordLifecycle("browser:disconnected"));
  if (context?.on) context.on("close", () => recordLifecycle("context:closed"));
  page.on("close", () => recordLifecycle("page:closed"));
  page.on("crash", () => recordLifecycle("page:crashed"));
  page.on("console", (message) => {
    capPush(events.console, { type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    capPush(events.pageErrors, { message: error?.message || String(error), stack: String(error?.stack || "") });
  });
  page.on("requestfailed", (request) => {
    capPush(events.requestFailed, { url: request.url(), error: request.failure()?.errorText || "request failed" });
  });
  page.on("response", (response) => {
    const key = resourceKeyForUrl(response.url());
    const entry = { key, url: response.url(), status: response.status() };
    if (key) responsesByKey.set(key, entry);
    try {
      if (response.request().resourceType() === "document") capPush(events.documents, entry);
    } catch {}
    if (key || response.status() >= 400) capPush(events.responses, entry);
  });

  function setStage(stage) {
    lifecycle.currentStage = String(stage || "browser-stage");
    lastSnapshotFailure = null;
  }

  function resetResourceResponses() {
    responsesByKey.clear();
  }

  function lifecycleState() {
    let pageClosed = lifecycle.pageClosed;
    let browserConnected = !lifecycle.browserDisconnected;
    try { if (typeof page.isClosed === "function") pageClosed = pageClosed || page.isClosed(); } catch {}
    try { if (browser && typeof browser.isConnected === "function") browserConnected = browser.isConnected(); } catch {}
    return {
      ...lifecycle,
      pageClosed,
      browserConnected,
      browserDisconnected: lifecycle.browserDisconnected || !browserConnected,
      events: [...lifecycle.events],
    };
  }

  function assertAlive(stage = lifecycle.currentStage) {
    const state = lifecycleState();
    const code = lifecycleErrorCode(state, stage);
    if (code) {
      const error = new Error(`${code}: browser lifecycle terminated before ${stage}`);
      error.code = code;
      error.lifecycle = state;
      throw error;
    }
    return state;
  }

  async function snapshot(targetUrl = "") {
    let dom = {};
    let failure = null;
    const stateBefore = lifecycleState();
    const codeBefore = lifecycleErrorCode(stateBefore, lifecycle.currentStage);
    if (codeBefore) {
      failure = { code: codeBefore, message: `${codeBefore}: snapshot skipped because browser lifecycle already terminated`, stage: lifecycle.currentStage };
      dom = { evaluationError: failure.message, lifecycleTerminated: true };
    } else {
      try {
        dom = await evaluateWithTimeout(page, ({ accessKey }) => {
          const button = document.querySelector("#discoverProjectAssetsButton");
          const visible = (element) => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0;
          };
          let accessPassed = null;
          try {
            accessPassed = typeof window.GuccAccess?.hasAccess === "function" ? Boolean(window.GuccAccess.hasAccess()) : null;
          } catch { accessPassed = false; }
          return {
            title: document.title || "",
            readyState: document.readyState || "",
            accessHashPresent: Boolean(localStorage.getItem(accessKey)),
            guccAccessPresent: Boolean(window.GuccAccess),
            accessPassed,
            assistantSetupCount: document.querySelectorAll(".assistant-setup").length,
            discoverButtonCount: document.querySelectorAll("#discoverProjectAssetsButton").length,
            discoverButtonVisible: visible(button),
            localVideoPathCount: document.querySelectorAll("#localVideoPath").length,
            localCoverPathCount: document.querySelectorAll("#localCoverPath").length,
            scriptSources: [...document.scripts].map((script) => script.src).filter(Boolean),
          };
        }, { accessKey: options.accessKey || "gucc_access_hash_v2" }, options.evaluateTimeoutMs || DEFAULT_EVALUATE_TIMEOUT_MS, `browser snapshot (${lifecycle.currentStage})`);
      } catch (error) {
        const stateAfter = lifecycleState();
        const lifecycleCode = lifecycleErrorCode(stateAfter, lifecycle.currentStage);
        const code = lifecycleCode || error?.code || "BROWSER_EVALUATE_FAILED";
        failure = { code, message: error?.message || String(error), stage: lifecycle.currentStage };
        dom = { evaluationError: failure.message, evaluationCode: code, lifecycleTerminated: Boolean(lifecycleCode) };
      }
    }
    lastSnapshotFailure = failure;
    let currentUrl = "";
    try { currentUrl = page.url(); } catch {}
    let redirected = false;
    if (targetUrl) {
      try {
        const expected = new URL(targetUrl);
        const current = new URL(currentUrl);
        redirected = expected.origin !== current.origin || expected.pathname !== current.pathname;
      } catch { redirected = currentUrl !== targetUrl; }
    }
    return { targetUrl, currentUrl, redirected, ...dom };
  }

  async function assertProductionAccessPrecondition(targetUrl = "") {
    assertAlive("production-access-precondition");
    setStage("production-access-precondition");
    const snap = await snapshot(targetUrl);
    if (lastSnapshotFailure) {
      const error = new Error(`${lastSnapshotFailure.code}: could not verify seeded access on Production page: ${lastSnapshotFailure.message}`);
      error.code = lastSnapshotFailure.code;
      throw error;
    }
    if (!snap.accessHashPresent) {
      const error = new Error("ACCESS_NOT_SEEDED_ON_PRODUCTION: gucc_access_hash_v2 is absent before Publish navigation");
      error.code = "ACCESS_NOT_SEEDED_ON_PRODUCTION";
      throw error;
    }
    if (!snap.guccAccessPresent || snap.accessPassed !== true) {
      const error = new Error(`PRODUCTION_ACCESS_GUARD_NOT_READY: GuccAccess=${Boolean(snap.guccAccessPresent)} hasAccess=${snap.accessPassed}`);
      error.code = "PRODUCTION_ACCESS_GUARD_NOT_READY";
      throw error;
    }
    console.log(`browserPrecondition=pageAlive:true,browserConnected:true,accessHash:present,GuccAccess:present,hasAccess:true,url=${snap.currentUrl}`);
    return snap;
  }

  function criticalResponses() {
    return Object.fromEntries(BROWSER_RESOURCE_KEYS.map((key) => [key, responsesByKey.get(key) || null]));
  }

  function assertCriticalResponses() {
    const missing = [];
    const bad = [];
    for (const key of BROWSER_RESOURCE_KEYS) {
      const item = responsesByKey.get(key);
      if (!item) missing.push(key);
      else if (item.status < 200 || item.status >= 400) bad.push(`${key}:${item.status}:${item.url}`);
    }
    if (missing.length || bad.length) {
      throw new Error(`Publish critical script responses incomplete; missing=[${missing.join(", ")}], bad=[${bad.join(", ")}]`);
    }
    return true;
  }

  function preferredError(error, stage = lifecycle.currentStage) {
    const state = lifecycleState();
    const lifecycleCode = lifecycleErrorCode(state, stage);
    if (lifecycleCode) {
      const preferred = new Error(`${lifecycleCode}: browser lifecycle terminated during ${stage}`);
      preferred.code = lifecycleCode;
      preferred.cause = error;
      return preferred;
    }
    if (lastSnapshotFailure?.stage === stage) {
      const preferred = new Error(`${lastSnapshotFailure.code}: ${lastSnapshotFailure.message}`);
      preferred.code = lastSnapshotFailure.code;
      preferred.cause = error;
      return preferred;
    }
    return error;
  }

  async function dump(stage, targetUrl = "") {
    setStage(stage);
    const snap = await snapshot(targetUrl);
    const staticTree = options.staticUrl ? await verifyStaticTree(options.staticUrl) : null;
    const publisher = options.publisherHealthUrl ? await publisherHealth(options.publisherHealthUrl) : null;
    const life = lifecycleState();
    console.error(`browserDiagnosticsStage=${stage}`);
    console.error(`browserDiag.targetUrl=${snap.targetUrl || ""}`);
    console.error(`browserDiag.pageUrl=${snap.currentUrl || ""}`);
    console.error(`browserDiag.redirected=${Boolean(snap.redirected)}`);
    console.error(`browserDiag.title=${snap.title || ""}`);
    console.error(`browserDiag.readyState=${snap.readyState || ""}`);
    console.error(`browserDiag.accessHashPresent=${snap.accessHashPresent == null ? "unavailable" : Boolean(snap.accessHashPresent)}`);
    console.error(`browserDiag.GuccAccessPresent=${snap.guccAccessPresent == null ? "unavailable" : Boolean(snap.guccAccessPresent)}`);
    console.error(`browserDiag.hasAccess=${snap.accessPassed == null ? "unavailable" : Boolean(snap.accessPassed)}`);
    console.error(`browserDiag.assistantSetupCount=${snap.assistantSetupCount == null ? "unavailable" : Number(snap.assistantSetupCount)}`);
    console.error(`browserDiag.discoverButtonCount=${snap.discoverButtonCount == null ? "unavailable" : Number(snap.discoverButtonCount)}`);
    console.error(`browserDiag.discoverButtonVisible=${snap.discoverButtonVisible == null ? "unavailable" : Boolean(snap.discoverButtonVisible)}`);
    console.error(`browserDiag.localVideoPathCount=${snap.localVideoPathCount == null ? "unavailable" : Number(snap.localVideoPathCount)}`);
    console.error(`browserDiag.localCoverPathCount=${snap.localCoverPathCount == null ? "unavailable" : Number(snap.localCoverPathCount)}`);
    console.error(`browserDiag.browserConnected=${Boolean(life.browserConnected)}`);
    console.error(`browserDiag.pageClosed=${Boolean(life.pageClosed)}`);
    console.error(`browserDiag.contextClosed=${Boolean(life.contextClosed)}`);
    console.error(`browserDiag.pageCrashed=${Boolean(life.pageCrashed)}`);
    life.events.forEach((item) => console.error(`browserLifecycleHistory=${item.order}:${item.kind}:stage=${item.stage}:at=${item.at}`));
    events.documents.slice(-4).forEach((item) => console.error(`browserDocumentResponse=${item.url}:${item.status}`));
    for (const key of BROWSER_RESOURCE_KEYS) {
      const response = responsesByKey.get(key);
      console.error(`browserAsset=${key}:${response ? `HTTP:${response.status}:${response.url}` : "NO_RESPONSE"}`);
    }
    if (staticTree) console.error(`browserStaticTree=${formatStaticTree(staticTree)}`);
    if (publisher) console.error(`browserPublisherHealth=${publisher.ok ? `PASS:${publisher.status}` : `FAIL:${publisher.status || "ERR"}:${publisher.error}`}`);
    events.console.forEach((item) => console.error(`browserConsole=${item.type}:${item.text}`));
    events.pageErrors.forEach((item) => console.error(`browserPageError=${item.message}`));
    events.requestFailed.forEach((item) => console.error(`browserRequestFailed=${item.url}:${item.error}`));
    events.responses.filter((item) => item.status >= 400).forEach((item) => console.error(`browserHttpError=${item.url}:${item.status}`));
    if (snap.evaluationError) console.error(`browserDiag.evaluateError=${snap.evaluationError}`);
    if (snap.evaluationCode) console.error(`browserDiag.evaluateCode=${snap.evaluationCode}`);
    return { snapshot: snap, criticalResponses: criticalResponses(), staticTree, publisher, lifecycle: life, events };
  }

  return {
    events,
    lifecycle,
    setStage,
    lifecycleState,
    assertAlive,
    snapshot,
    dump,
    criticalResponses,
    assertCriticalResponses,
    resetResourceResponses,
    assertProductionAccessPrecondition,
    preferredError,
  };
}

async function navigateDocument(page, targetUrl, timeoutMs = 15000) {
  const response = await page.goto(targetUrl, { waitUntil: "commit", timeout: timeoutMs });
  if (response && (response.status() < 200 || response.status() >= 400)) {
    throw new Error(`Navigation returned HTTP ${response.status()} for ${targetUrl}`);
  }
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs });
  return response ? response.status() : null;
}

async function runStage(name, action, diagnostics, targetUrl = "") {
  try {
    if (diagnostics?.setStage) diagnostics.setStage(name);
    if (name === "publish-navigation" && diagnostics?.assertProductionAccessPrecondition) {
      try {
        await diagnostics.assertProductionAccessPrecondition();
        console.log("browserStage=production-access-precondition:PASS");
      } catch (error) {
        console.error("browserStage=production-access-precondition:FAIL");
        if (diagnostics) await diagnostics.dump("production-access-precondition", targetUrl).catch((dumpError) => console.error(`browserDiagnosticsError=${dumpError?.message || dumpError}`));
        throw error;
      } finally {
        if (diagnostics?.setStage) diagnostics.setStage(name);
      }
    }
    if (diagnostics?.assertAlive) diagnostics.assertAlive(name);
    if (name === "publish-navigation" && diagnostics?.resetResourceResponses) diagnostics.resetResourceResponses();
    const value = await action();
    if (diagnostics?.assertAlive) diagnostics.assertAlive(name);
    console.log(`browserStage=${name}:PASS`);
    return value;
  } catch (error) {
    const preferred = diagnostics?.preferredError ? diagnostics.preferredError(error, name) : error;
    console.error(`browserStage=${name}:FAIL`);
    if (diagnostics) await diagnostics.dump(name, targetUrl).catch((dumpError) => console.error(`browserDiagnosticsError=${dumpError?.message || dumpError}`));
    throw preferred;
  }
}

module.exports = {
  CRITICAL_STATIC_RESOURCES,
  BROWSER_RESOURCE_KEYS,
  DEFAULT_EVALUATE_TIMEOUT_MS,
  resourceKeyForUrl,
  withTimeout,
  evaluateWithTimeout,
  lifecycleErrorCode,
  verifyStaticTree,
  formatStaticTree,
  publisherHealth,
  attachPageDiagnostics,
  navigateDocument,
  runStage,
};
