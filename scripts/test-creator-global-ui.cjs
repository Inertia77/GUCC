"use strict";

// Execute the real UI module with isolated owner/session/network/DOM boundaries.
// No browser profile, production endpoint, or real human gate is used here.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const G = require("../assets/creator-global-production-core.js");
const E = require("../apps/video-workspace/production-system/engine.js");
const source = fs.readFileSync(path.join(__dirname, "../assets/creator-global-production-ui.mjs"), "utf8")
  .replace(/^import .*;\r?\n/gm, "");
const tick = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const snapshot = (id) => ({ project: { project_id: id, global_revision: 1 }, publications: [] });

function harness({ selected = "A", visible = selected } = {}) {
  const listeners = {}, windowListeners = {}, requests = [], dialogs = [];
  let observer, owner = true, tokenGate = null, html = "", generation = 0;
  const title = { dataset: { projectId: visible } }, toast = { textContent: "" };
  const root = {
    inert: false, attrs: new Map(),
    setAttribute(key, value) { this.attrs.set(key, value); },
    removeAttribute(key) { this.attrs.delete(key); },
    addEventListener(type, fn) { listeners[type] = fn; },
    contains(node) { return node.generation === generation; },
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; generation++; },
  };
  const location = { search: `?project=${selected}` };
  const context = vm.createContext({
    CONFIG: { SUPABASE_URL: "https://isolated.invalid", SUPABASE_ANON_KEY: "fixture" },
    window: { GuccCreatorGlobal: G, addEventListener(type, fn) { windowListeners[type] = fn; } },
    document: { getElementById(id) { return { globalProduction: root, projectTitle: title, toast }[id]; } },
    location, localStorage: { getItem() { return JSON.stringify({ selectedProjectId: selected }); } },
    URLSearchParams, console, setTimeout() {},
    getSession() { return owner ? { access_token: "isolated-owner" } : null; },
    getAccessToken() { const pending = tokenGate; tokenGate = null; return pending?.promise || Promise.resolve("isolated-owner"); },
    fetch(url, options) {
      assert.equal(url, "https://isolated.invalid/functions/v1/creator-project-api");
      const pending = deferred();
      requests.push({ body: JSON.parse(options.body), ...pending });
      return pending.promise;
    },
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} },
    FormData: class { constructor(form) { this.data = form.data; } get(key) { return this.data[key] ?? null; } getAll(key) { return this.data[key] || []; } },
    confirm(message) { dialogs.push(message); return true; },
    prompt(message) { dialogs.push(message); return "Isolated fixture review"; },
  });
  vm.runInContext(source, context, { filename: "creator-global-production-ui.mjs" });
  function node(selector, dataset = {}, extra = {}) {
    return { generation, dataset, ...extra, closest(query) { return query === selector || query === "button" ? this : null; } };
  }
  return {
    root, title, toast, requests, dialogs, context,
    choose(id, { notify = true, visibleId = id } = {}) {
      selected = id; location.search = id ? `?project=${id}` : ""; title.dataset.projectId = visibleId;
      if (notify) observer();
    },
    notifyTitle() { observer(); },
    auth(value, notify = true) { owner = value; if (notify) windowListeners.storage({ key: "gameup_session_v5" }); },
    holdToken() { tokenGate = deferred(); return tokenGate; },
    click(target) { return listeners.click({ target }); },
    refresh() { return listeners.click({ target: node("[data-global-refresh]") }); },
    gate() { return node("[data-human-lock]", { scopeType: "project", scopeId: selected, lockType: "project_scope", revision: "1", locked: "true" }); },
    form() { return node("[data-global-form]", { globalForm: "language" }, { data: { trackKey: "JA", languageCode: "ja" } }); },
    submit(target) { return listeners.submit({ target, preventDefault() {} }); },
    answer(index, data, ok = true) { requests[index].resolve({ ok, status: ok ? 200 : 503, async json() { return data; } }); },
    async ready() { await tick(); this.answer(0, snapshot(selected)); await tick(); return this; },
  };
}

async function tests() {
  {
    const env = await harness().ready();
    const stale = env.gate();
    env.choose("B"); await tick();
    assert.equal(env.root.inert, true);
    assert.doesNotMatch(env.root.innerHTML, /data-human-lock/);
    await env.click(stale);
    assert.equal(env.dialogs.length, 0, "No human prompt while the old project is being replaced");
    env.answer(1, snapshot("B")); await tick();
    await env.click(stale);
    assert.equal(env.requests.length, 2, "Detached old controls cannot write against the new snapshot");
    assert.equal(env.root.inert, false);
  }
  {
    const env = await harness().ready();
    const stale = env.gate();
    env.choose("B", { notify: false });
    await env.click(stale);
    assert.equal(env.dialogs.length, 0, "Identity must be checked even before MutationObserver runs");
  }
  {
    const env = harness(); await tick();
    env.choose("B"); await tick();
    env.answer(1, snapshot("B")); await tick();
    const current = env.root.innerHTML;
    env.answer(0, snapshot("A")); await tick();
    assert.equal(env.root.innerHTML, current, "Late success cannot overwrite the current project");
  }
  {
    const env = harness(); await tick();
    env.choose("B"); await tick();
    env.answer(1, snapshot("B")); await tick();
    const current = env.root.innerHTML;
    env.answer(0, { error: "Old request failed" }, false); await tick();
    assert.equal(env.root.innerHTML, current, "Late errors cannot replace the current project");
  }
  {
    const env = await harness().ready();
    const token = env.holdToken();
    const operation = env.submit(env.form());
    env.choose("B"); await tick();
    token.resolve("isolated-owner"); await operation;
    assert.equal(env.requests.filter((r) => r.body.action !== "getProject").length, 0,
      "A write queued behind token refresh must be cancelled on project switch");
    assert.equal(env.root.inert, true, "Finishing an old mutation cannot clear the new project's busy state");
    env.answer(1, snapshot("B")); await tick();
    assert.equal(env.root.inert, false);
  }
  {
    const env = await harness().ready();
    const form = env.form(); const operation = env.submit(form); await tick();
    await env.submit(form);
    assert.equal(env.requests.length, 2, "Double submit must send exactly one write");
    assert.equal(env.requests[1].body.projectId, "A");
    env.answer(1, {}); await tick();
    assert.equal(env.root.inert, true, "Post-write snapshot refresh is still busy");
    env.answer(2, snapshot("A")); await operation;
    assert.equal(env.root.inert, false);
    assert.equal(env.root.attrs.has("aria-busy"), false);
    assert.equal(env.toast.textContent, "Language Track 已建立");
  }
  {
    const env = await harness().ready();
    const operation = env.submit(env.form()); await tick();
    env.choose("B"); await tick();
    env.answer(2, snapshot("B")); await tick();
    env.answer(1, {}); await operation;
    assert.equal(env.requests.length, 3, "Old write success must not refresh or toast the new project");
    assert.equal(env.toast.textContent, "");
    assert.equal(env.root.inert, false);
  }
  {
    const env = await harness().ready();
    const token = env.holdToken(); const operation = env.submit(env.form());
    env.auth(false); token.resolve("expired"); await operation;
    assert.equal(env.requests.length, 1, "Logout while obtaining a token prevents the write");
    assert.match(env.root.innerHTML, /我已登录，重试/);
    assert.equal(env.root.inert, false);
    env.auth(true); await tick(); env.answer(1, snapshot("A")); await tick();
    assert.match(env.root.innerHTML, /data-human-lock/);
  }
  {
    const env = harness(); await tick();
    env.auth(false, false); env.answer(0, snapshot("A")); await tick();
    assert.match(env.root.innerHTML, /我已登录，重试/, "Same-tab expiry must not leave a loading dead end");
    assert.equal(env.root.inert, false);
  }
  {
    const env = await harness().ready();
    const pending = env.refresh(); await tick();
    env.answer(1, { error: "Temporary outage" }, false); await pending;
    assert.match(env.root.innerHTML, /Temporary outage/);
    assert.equal(env.root.inert, false);
    const retry = env.refresh(); await tick(); env.answer(2, snapshot("A")); await retry;
    assert.match(env.root.innerHTML, /data-human-lock/);
  }
  {
    const env = harness({ selected: "A", visible: "B" }); await env.ready();
    assert.doesNotMatch(env.root.innerHTML, /data-human-lock/, "Deep link must not expose writes under another project's title");
    env.choose("A");
    assert.match(env.root.innerHTML, /data-human-lock/);
    const form = env.form(); env.notifyTitle();
    assert.equal(env.root.contains(form), true, "Unrelated title updates must not discard a setup draft");
  }
  {
    const env = harness(); await tick(); env.answer(0, snapshot("B")); await tick();
    assert.match(env.root.innerHTML, /云响应与当前项目不匹配/);
    assert.doesNotMatch(env.root.innerHTML, /data-human-lock/);
  }
  {
    const env = await harness().ready(); const pending = env.refresh(); await tick();
    env.choose(""); env.answer(1, snapshot("A")); await pending;
    assert.match(env.root.innerHTML, /选择一个 Project/);
    assert.equal(env.root.inert, false);
  }
  {
    const env = await harness().ready();
    // Simulates an auth/project transition during a native prompt boundary.
    env.context.confirm = () => { env.choose("B"); return true; };
    await env.click(env.gate()); await tick();
    assert.equal(env.requests.filter((r) => r.body.action === "humanLock").length, 0);
  }
}

function deepLinkTests() {
  const appSource = fs.readFileSync(path.join(__dirname, "../apps/video-workspace/production-system/app.js"), "utf8");
  for (const [query, saved, expected] of [["A", "B", "A"], ["", "B", "B"], ["", "missing", "A"]]) {
    const nodes = new Map();
    const get = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, style: {}, addEventListener() {} });
      return nodes.get(selector);
    };
    const projects = ["A", "B"].map((id) => ({ ...E.createProject({ name: id }), projectId: id }));
    vm.runInNewContext(appSource, {
      window: { GuccProductionEngine: E },
      document: { querySelector: get, addEventListener() {} },
      location: { search: query ? `?project=${query}` : "" }, URLSearchParams,
      localStorage: { getItem() { return JSON.stringify({ projects, selectedProjectId: saved }); } }, console,
    });
    assert.equal(get("#projectTitle").dataset.projectId, expected);
    assert.equal(get("#projectTitle").textContent, expected, "Visible title and Global identity must agree");
  }
}

tests().then(() => {
  deepLinkTests();
  console.log("Creator Global UI behavior tests passed: 14 async cases and 3 deep-link selection cases; no live API writes.");
}).catch((error) => { console.error(error); process.exitCode = 1; });
