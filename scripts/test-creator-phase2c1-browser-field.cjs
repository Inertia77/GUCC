"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const BrowserField = require("./creator-phase2c1-browser-field.cjs");

function fakeResponse(status, text) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  };
}

class FakeBrowser extends EventEmitter {
  constructor() {
    super();
    this.connected = true;
  }
  isConnected() { return this.connected; }
}

class FakeContext extends EventEmitter {
  constructor(browser) {
    super();
    this._browser = browser;
  }
  browser() { return this._browser; }
}

class FakePage extends EventEmitter {
  constructor(context, evaluateResult = {}) {
    super();
    this._context = context;
    this._closed = false;
    this._url = "http://127.0.0.1:8000/apps/video-workspace/production-system/";
    this._evaluateResult = evaluateResult;
  }
  context() { return this._context; }
  isClosed() { return this._closed; }
  url() { return this._url; }
  evaluate() {
    if (typeof this._evaluateResult === "function") return this._evaluateResult();
    return Promise.resolve(this._evaluateResult);
  }
}

function healthySnapshot() {
  return {
    title: "AI Video Production System｜GUCC",
    readyState: "complete",
    accessHashPresent: true,
    guccAccessPresent: true,
    accessPassed: true,
    assistantSetupCount: 0,
    discoverButtonCount: 0,
    discoverButtonVisible: false,
    localVideoPathCount: 0,
    localCoverPathCount: 0,
    scriptSources: [],
  };
}

(async () => {
  const bodies = {
    "/apps/publishing-console/": '<div class="assistant-setup"></div><script src="../../assets/creator-publish-asset-discovery.js?v=1"></script>',
    "/apps/publishing-console/platform-rules.js": "root.GuccPublishingRules = api;",
    "/apps/publishing-console/app.js": 'const STORAGE_KEY = "gucc_publish_console_v1";',
    "/assets/creator-publish-asset-discovery.js": 'document.querySelector("#discoverProjectAssetsButton");',
    "/assets/access-guard.js": "window.GuccAccess = { hasAccess };",
  };
  const goodFetch = async (url) => {
    const parsed = new URL(url);
    return fakeResponse(200, bodies[parsed.pathname] || "");
  };
  const good = await BrowserField.verifyStaticTree("http://127.0.0.1:8000", goodFetch);
  assert.equal(good.ok, true, "complete current Publish Console tree must pass static readiness");
  assert.equal(good.checks.length, 5, "static readiness must verify HTML plus all critical browser scripts");

  const missingDiscoveryFetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/assets/creator-publish-asset-discovery.js") return fakeResponse(404, "Not found");
    return fakeResponse(200, bodies[parsed.pathname] || "");
  };
  const missingDiscovery = await BrowserField.verifyStaticTree("http://127.0.0.1:8000", missingDiscoveryFetch);
  assert.equal(missingDiscovery.ok, false, "a server missing creator-publish-asset-discovery.js must not be accepted as compatible");
  assert.match(BrowserField.formatStaticTree(missingDiscovery), /creator-publish-asset-discovery\.js:FAIL:404/);

  const staleHtmlFetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/apps/publishing-console/") return fakeResponse(200, "<html><body>stale publish console</body></html>");
    return fakeResponse(200, bodies[parsed.pathname] || "");
  };
  const staleHtml = await BrowserField.verifyStaticTree("http://127.0.0.1:8000", staleHtmlFetch);
  assert.equal(staleHtml.ok, false, "a stale Publish Console HTML must not pass because one unrelated feature asset exists");
  assert.match(BrowserField.formatStaticTree(staleHtml), /publish-html:FAIL/);

  assert.equal(BrowserField.resourceKeyForUrl("http://127.0.0.1:8000/apps/publishing-console/platform-rules.js?v=1"), "platform-rules.js");
  assert.equal(BrowserField.resourceKeyForUrl("http://127.0.0.1:8000/apps/publishing-console/app.js?v=1"), "app.js");
  assert.equal(BrowserField.resourceKeyForUrl("http://127.0.0.1:8000/assets/creator-publish-asset-discovery.js?v=1"), "creator-publish-asset-discovery.js");
  assert.equal(BrowserField.resourceKeyForUrl("http://127.0.0.1:8000/assets/access-guard.js"), "access-guard.js");
  assert.equal(BrowserField.resourceKeyForUrl("http://127.0.0.1:8000/assets/gucc-shell.js"), "");

  await assert.rejects(
    () => BrowserField.evaluateWithTimeout({ evaluate: () => new Promise(() => {}) }, () => null, null, 25, "test snapshot"),
    (error) => error?.code === "BROWSER_DIAGNOSTIC_TIMEOUT" && /timed out after 25ms/.test(error.message),
    "snapshot/evaluate must fail-fast rather than hang",
  );

  {
    const browser = new FakeBrowser();
    const context = new FakeContext(browser);
    const page = new FakePage(context, healthySnapshot());
    const diagnostics = BrowserField.attachPageDiagnostics(page, { evaluateTimeoutMs: 50 });
    diagnostics.setStage("publish-access");
    page._closed = true;
    page.emit("close");
    assert.throws(
      () => diagnostics.assertAlive("publish-access"),
      (error) => error?.code === "PAGE_CLOSED_BEFORE_PUBLISH_ACCESS",
      "closed page must be classified as lifecycle failure before access assertions",
    );
    const snapshot = await diagnostics.snapshot("http://127.0.0.1:8000/apps/publishing-console/");
    assert.equal(snapshot.accessHashPresent, undefined, "closed page must not be misreported as accessHash=false");
    assert.equal(snapshot.lifecycleTerminated, true);
  }

  {
    const browser = new FakeBrowser();
    const context = new FakeContext(browser);
    const page = new FakePage(context, healthySnapshot());
    const diagnostics = BrowserField.attachPageDiagnostics(page, { evaluateTimeoutMs: 50 });
    diagnostics.setStage("publish-access");
    browser.connected = false;
    browser.emit("disconnected");
    assert.throws(
      () => diagnostics.assertAlive("publish-access"),
      (error) => error?.code === "BROWSER_DISCONNECTED",
      "browser disconnect must be explicit rather than becoming an access failure",
    );
  }

  {
    const browser = new FakeBrowser();
    const context = new FakeContext(browser);
    const page = new FakePage(context, healthySnapshot());
    const diagnostics = BrowserField.attachPageDiagnostics(page, { evaluateTimeoutMs: 50 });
    diagnostics.setStage("production-ui");
    const precondition = await diagnostics.assertProductionAccessPrecondition("http://127.0.0.1:8000/apps/video-workspace/production-system/");
    assert.equal(precondition.accessHashPresent, true, "Production precondition must prove access was seeded before Publish navigation");
    assert.equal(precondition.guccAccessPresent, true);
    assert.equal(precondition.accessPassed, true);
  }

  {
    const browser = new FakeBrowser();
    const context = new FakeContext(browser);
    const page = new FakePage(context, healthySnapshot());
    const diagnostics = BrowserField.attachPageDiagnostics(page, { evaluateTimeoutMs: 50 });
    const errorLines = [];
    const originalError = console.error;
    console.error = (...args) => errorLines.push(args.join(" "));
    try {
      page.emit("response", {
        url: () => "http://127.0.0.1:8000/assets/icons/missing-field-smoke.svg",
        status: () => 404,
        request: () => ({ resourceType: () => "image" }),
      });
      await diagnostics.dump("critical-404", "http://127.0.0.1:8000/apps/publishing-console/");
    } finally {
      console.error = originalError;
    }
    assert.ok(
      errorLines.some((line) => line.includes("browserHttpError=http://127.0.0.1:8000/assets/icons/missing-field-smoke.svg:404")),
      "critical HTTP diagnostics must print the concrete failing URL and status",
    );
  }

  const smokeSource = fs.readFileSync(path.join(__dirname, "creator-phase2c1-field-smoke.cjs"), "utf8");
  for (const stage of [
    "production-navigation",
    "production-ui",
    "publish-navigation",
    "publish-access",
    "publish-script",
    "publish-discovery-ui",
  ]) assert.match(smokeSource, new RegExp(`runStage\\(\\s*[\"']${stage}[\"']`), `smoke must expose browserStage=${stage}`);

  assert.match(smokeSource, /attachPageDiagnostics/, "field smoke must attach browser diagnostics before Publish navigation");
  assert.match(smokeSource, /verifyStaticTree\(STATIC_URL\)/, "field smoke must verify the whole critical static tree");
  assert.match(smokeSource, /incomplete\/stale GUCC browser tree/, "field smoke must reject a stale server rather than silently reuse it");
  assert.match(smokeSource, /waitUntil:\s*["']commit["']/, "navigation must separate document commit from DOM readiness diagnostics");
  assert.match(smokeSource, /waitForLoadState\(["']domcontentloaded["']/, "DOM readiness must remain explicitly verified");
  assert.match(smokeSource, /browserNavigation=/, "navigation target/final/status diagnostics must be emitted");
  assert.match(smokeSource, /browserAccess=/, "access-guard diagnostics must be emitted");
  assert.match(smokeSource, /browserPublishDom=/, "Publish DOM diagnostics must be emitted");
  assert.match(smokeSource, /browserAsset=/, "critical script response diagnostics must be emitted");

  const helperSource = fs.readFileSync(path.join(__dirname, "creator-phase2c1-browser-field.cjs"), "utf8");
  assert.match(helperSource, /browser\.on\(["']disconnected["']/, "browser disconnect lifecycle must be retained");
  assert.match(helperSource, /context\.on\(["']close["']/, "browser context close lifecycle must be retained");
  assert.match(helperSource, /page\.on\(["']close["']/, "page close lifecycle must be retained");
  assert.match(helperSource, /page\.on\(["']crash["']/, "page crash lifecycle must be retained");
  assert.match(helperSource, /page\.on\(["']console["']/, "console events must be retained");
  assert.match(helperSource, /page\.on\(["']pageerror["']/, "pageerror events must be retained");
  assert.match(helperSource, /page\.on\(["']requestfailed["']/, "requestfailed events must be retained");
  assert.match(helperSource, /page\.on\(["']response["']/, "HTTP response status must be retained");
  assert.match(helperSource, /browserLifecycle=/, "lifecycle events must print in event order with current stage");
  assert.match(helperSource, /production-access-precondition/, "Publish navigation must verify seeded access on the still-live Production page first");
  assert.match(helperSource, /BROWSER_DIAGNOSTIC_TIMEOUT/, "diagnostic evaluate must have a hard fail-fast timeout");
  assert.match(helperSource, /browserHttpError=.*url/i, "HTTP diagnostics must preserve concrete URL evidence");
  for (const field of [
    "accessHashPresent",
    "guccAccessPresent",
    "accessPassed",
    "assistantSetupCount",
    "discoverButtonCount",
    "discoverButtonVisible",
    "localVideoPathCount",
    "localCoverPathCount",
    "browserConnected",
    "pageClosed",
    "contextClosed",
    "pageCrashed",
  ]) assert.match(helperSource, new RegExp(field), `diagnostics must include ${field}`);

  const publishHtml = fs.readFileSync(path.join(__dirname, "..", "apps", "publishing-console", "index.html"), "utf8");
  assert.match(publishHtml, /class="assistant-setup"/, "real Publish Console page remains under test");
  assert.match(publishHtml, /platform-rules\.js/, "real Publish Console must load platform-rules.js");
  assert.match(publishHtml, /app\.js/, "real Publish Console must load app.js");
  assert.match(publishHtml, /creator-publish-asset-discovery\.js/, "real Publish Console must load creator-publish-asset-discovery.js");
  assert.match(publishHtml, /access-guard\.js/, "real Publish Console must load access-guard.js");

  const accessGuard = fs.readFileSync(path.join(__dirname, "..", "assets", "access-guard.js"), "utf8");
  assert.match(accessGuard, /function guardPage\(\)/, "real Access Guard remains part of the field path");
  assert.doesNotMatch(accessGuard, /window\.close\s*\(/, "field remediation must not replace the real guard with a close-based shortcut");

  console.log("Creator Phase 2C.1 browser lifecycle/readiness tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
