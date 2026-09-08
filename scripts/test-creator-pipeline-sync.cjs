"use strict";

// Real bridge functions, isolated storage/session/network. No production users,
// cloud data, access keys, or transactional Auth endpoints are involved.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const E = require("../apps/video-workspace/production-system/engine.js");
const tick = () => new Promise(setImmediate);
const raw = fs.readFileSync(path.join(__dirname, "../assets/creator-pipeline-bridge.mjs"), "utf8");
const source = raw.slice(0, raw.lastIndexOf("\nawait ready();")).replace(/^import[\s\S]*?;\r?\n/gm, "");
function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

async function main() {
  const Core = await import(pathToFileURL(path.join(__dirname, "../assets/creator-pipeline-core.mjs")));
  const Dashboard = await import(pathToFileURL(path.join(__dirname, "../assets/creator-dashboard-core.mjs")));
  function harness() {
    const storage = new Map(), requests = [], intervals = [], nodes = [], reloads = [], alerts = [];
    let owner = true, tokenGate;
    const projects = ["A", "B", "LOCAL"].map((id) => {
      const project = { ...E.createProject({ name: id }), projectId: id };
      project.integration = { drive: { rootId: Core.DRIVE_ROOT.id, rootUrl: Core.DRIVE_ROOT.url, rootName: Core.DRIVE_ROOT.name } };
      return id === "LOCAL" ? project : Dashboard.attachCloudMetadata(project, { revision: 2 });
    });
    storage.set(Core.PRODUCTION_STORAGE_KEY, JSON.stringify({ projects, selectedProjectId: "A", musicLibrary: [] }));
    const node = () => {
      const children = new Map();
      const result = { dataset: {}, listeners: {}, isConnected: true, className: "", textContent: "",
        querySelector(selector) { if (!children.has(selector)) children.set(selector, node()); return children.get(selector); },
        querySelectorAll() { return ["remote", "local", "merge", "cancel"].map((choice) => this.querySelector(`[data-choice="${choice}"]`)); },
        addEventListener(type, fn) { this.listeners[type] = fn; }, append() {}, appendChild() {}, remove() { this.isConnected = false; },
        setAttribute(key, value) { this[key] = value; }, showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
      };
      nodes.push(result); return result;
    };
    const panel = node();
    const context = vm.createContext({ ...Core, ...Dashboard, console, structuredClone, URL, URLSearchParams,
      crypto: { randomUUID: () => "fixture-device" },
      window: { GuccProductionEngine: E, alert(message) { alerts.push(message); }, location: { pathname: "/apps/video-workspace/production-system/", search: "?project=A", href: "https://isolated.invalid/apps/video-workspace/production-system/", reload() { reloads.push(true); } } },
      document: { createElement: node, getElementById() { return null; }, querySelector: () => nodes.find((n) => n.className === "gcb-conflict-dialog" && n.isConnected), head: node(), body: node() },
      localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
      CONFIG: { SUPABASE_URL: "https://isolated.invalid", SUPABASE_ANON_KEY: "fixture" },
      getSession: () => owner ? { access_token: "fixture-owner" } : null,
      getAccessToken() { const gate = tokenGate; tokenGate = null; return gate?.promise || Promise.resolve("fixture-owner"); },
      fetch(url, options) {
        assert.equal(url, "https://isolated.invalid/functions/v1/creator-project-api");
        const pending = deferred(); requests.push({ body: JSON.parse(options.body), ...pending }); return pending.promise;
      },
      setTimeout() {}, setInterval(fn) { intervals.push(fn); }, panel,
    });
    context.window.history = { replaceState(_state, _unused, href) { context.window.location.href = href; } };
    vm.runInContext(source, context);
    const read = () => JSON.parse(storage.get(Core.PRODUCTION_STORAGE_KEY));
    const change = (fn) => { const store = read(); fn(store); storage.set(Core.PRODUCTION_STORAGE_KEY, JSON.stringify(store)); };
    return { requests, panel, nodes, context, read, change, reloads, alerts,
      edit(id, value) { change((s) => { s.projects.find((p) => p.projectId === id).topic = value; }); },
      select(id) { change((s) => { s.selectedProjectId = id; }); },
      project(id) { return read().projects.find((p) => p.projectId === id); },
      push: () => vm.runInContext('pushCurrentProject(panel, "auto")', context),
      pull: (reload = false) => vm.runInContext(`pullCloudProjects(panel, window.GuccProductionEngine, ${reload})`, context),
      remember(id) { vm.runInContext(`rememberSyncBase(${JSON.stringify(id)}, currentProductionStore().projects.find(p => p.projectId === ${JSON.stringify(id)}))`, context); },
      base(id) { return vm.runInContext(`syncBase(${JSON.stringify(id)})`, context); },
      showConflict() {
        vm.runInContext('showConflictDialog(panel, window.GuccProductionEngine, currentProductionProject(), currentProductionProject().integration.cloud.conflict)', context);
        return nodes.find((n) => n.className === "gcb-conflict-dialog" && n.isConnected);
      },
      choose(dialog, choice) { return dialog.listeners.click({ target: { closest: () => ({ dataset: { choice } }) } }); },
      auto: () => intervals[0](),
      holdToken() { tokenGate = deferred(); return tokenGate; },
      auth(value) { owner = value; },
      answer(index, data = { revision: 3 }, status = 200) { requests[index].resolve({ ok: status === 200, status, async json() { return data; } }); },
      async start() { const starting = vm.runInContext("runProduction()", context); await tick(); this.answer(0, { projects: [] }); await starting; return this; },
    };
  }

  function row(project, revision = 3) {
    return { project_id: project.projectId, project_data: project, revision, updated_at: "2099-01-01T00:00:00.000Z" };
  }
  function conflictFixture() {
    const env = harness(); env.remember("A");
    const remote = env.project("A"); remote.notes = "independent remote note";
    env.edit("A", "local conflict topic");
    env.change((store) => { store.projects[0].integration.cloud.conflict = { currentRevision: 3, project: row(remote) }; });
    return env;
  }
  for (const choice of ["remote", "local", "merge"]) {
    for (const transition of ["edit", "revision", "base", "switch", "delete", "logout"]) {
      const env = conflictFixture(), dialog = env.showConflict(); assert.ok(dialog);
      if (transition === "edit") env.edit("A", "newer edit from another tab");
      if (transition === "revision") env.change((s) => { s.projects[0].integration.cloud.revision = 4; });
      if (transition === "base") env.remember("A");
      if (transition === "switch") env.select("B");
      if (transition === "delete") env.change((s) => { s.projects = s.projects.filter((p) => p.projectId !== "A"); });
      if (transition === "logout") env.auth(false);
      const before = JSON.stringify(env.read()), base = JSON.stringify(env.base("A"));
      await env.choose(dialog, choice);
      assert.equal(JSON.stringify(env.read()), before, `Stale ${choice}/${transition} must not replace any project`);
      assert.equal(JSON.stringify(env.base("A")), base);
      assert.equal(env.requests.length, 0); assert.equal(env.reloads.length, 1); assert.equal(dialog.isConnected, false);
      if (transition === "switch") assert.match(env.context.window.location.href, /project=B/);
    }
  }
  for (const mismatch of ["missing", "id", "revision"]) {
    const env = conflictFixture();
    env.change((s) => {
      const conflict = s.projects[0].integration.cloud.conflict;
      if (mismatch === "missing") delete conflict.project.project_data;
      if (mismatch === "id") conflict.project.project_id = "B";
      if (mismatch === "revision") conflict.project.revision = "3";
    });
    const before = JSON.stringify(env.read()); assert.equal(env.showConflict(), undefined);
    assert.equal(JSON.stringify(env.read()), before); assert.equal(env.requests.length, 0);
  }
  {
    const env = conflictFixture(), dialog = env.showConflict(), before = JSON.stringify(env.read());
    await env.choose(dialog, "unknown"); assert.equal(dialog.isConnected, true);
    await env.choose(dialog, "cancel"); assert.equal(dialog.isConnected, false);
    await env.choose(dialog, "remote");
    assert.equal(JSON.stringify(env.read()), before); assert.equal(env.requests.length, 0);
  }
  {
    const env = conflictFixture(); env.context.localStorage.removeItem("gucc_creator_sync_bases_v1");
    const dialog = env.showConflict(), before = JSON.stringify(env.read()); await env.choose(dialog, "merge");
    assert.equal(JSON.stringify(env.read()), before); assert.equal(env.requests.length, 0);
    assert.match(env.alerts[0], /缺少共同同步基线/); assert.equal(dialog.isConnected, true);
  }
  {
    const env = conflictFixture(), other = JSON.stringify(env.project("B")), dialog = env.showConflict();
    await env.choose(dialog, "remote");
    assert.equal(env.project("A").notes, "independent remote note");
    assert.notEqual(env.project("A").topic, "local conflict topic");
    assert.equal(env.project("A").integration.cloud.revision, 3);
    assert.equal(env.project("A").integration.cloud.conflict, undefined);
    assert.equal(JSON.stringify(env.project("B")), other); assert.equal(env.requests.length, 0); assert.equal(env.reloads.length, 1);
  }
  for (const choice of ["local", "merge"]) {
    const env = conflictFixture(), dialog = env.showConflict(), resolving = env.choose(dialog, choice); await tick();
    assert.equal(env.requests.length, 1, `${choice} should stage exactly one reviewed save`);
    assert.equal(env.requests[0].body.baseRevision, 3);
    assert.equal(env.requests[0].body.projectData.topic, "local conflict topic");
    if (choice === "merge") assert.equal(env.requests[0].body.projectData.notes, "independent remote note");
    assert.equal(dialog.open, true); assert.equal(dialog["aria-busy"], "true");
    await env.choose(dialog, choice); await env.choose(dialog, "remote");
    let prevented = false; dialog.listeners.cancel({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true); assert.equal(dialog.open, true, "Pending resolution keeps the stale in-memory editor blocked");
    assert.equal(env.requests.length, 1);
    env.edit("A", "latest edit from another tab during save"); env.select("B");
    env.answer(0, { revision: 4 }); await resolving;
    assert.equal(env.project("A").topic, "latest edit from another tab during save");
    assert.equal(env.project("A").integration.cloud.revision, 4);
    assert.equal(env.read().selectedProjectId, "B"); assert.equal(env.reloads.length, 1); assert.equal(dialog.isConnected, false);
    assert.match(env.context.window.location.href, /project=B/, "Resolution reload must honor the latest persisted selection");
  }
  for (const status of [503, 409]) {
    const env = conflictFixture(), dialog = env.showConflict(), resolving = env.choose(dialog, "local"); await tick();
    env.answer(0, status === 503 ? { error: "offline" } : { error: "REVISION_CONFLICT", conflict: { currentRevision: 5, project: row(env.project("A"), 5) } }, status);
    await resolving;
    assert.equal(env.project("A").topic, "local conflict topic");
    assert.equal(env.project("A").integration.cloud.revision, 3);
    if (status === 409) assert.equal(env.project("A").integration.cloud.conflict.currentRevision, 5);
    assert.equal(env.reloads.length, 1); assert.equal(env.nodes.filter((n) => n.className === "gcb-conflict-dialog").length, 1, "Failed resolutions cannot spawn nested stale dialogs");
  }
  {
    const env = await harness().start(), remote = env.project("A"); env.remember("A");
    remote.topic = "accepted cloud update";
    const pulling = env.pull(); await tick(); await env.pull(); await env.push();
    assert.equal(env.requests.length, 2, "Pull/pull and pull/push cannot overlap in this page");
    env.answer(1, { projects: [row(remote)] }); assert.equal(await pulling, true);
    assert.equal(env.project("A").topic, remote.topic);
    assert.equal(env.project("A").integration.cloud.revision, 3);
    await env.auto(); assert.equal(env.requests.length, 2, "Accepted cloud content is not a new local edit");
    const saving = env.push(); await tick(); await env.pull();
    assert.equal(env.requests.length, 3, "Push/pull cannot overlap in this page"); env.answer(2, { revision: 4 }); await saving;
  }
  for (const editTime of ["before", "during"]) {
    const env = await harness().start(), remote = env.project("A"); env.remember("A");
    const originalBase = JSON.stringify(env.base("A")), originalTime = env.project("A").updatedAt;
    if (editTime === "before") env.edit("A", "unsynced field without timestamp change");
    const pulling = env.pull(); await tick();
    if (editTime === "during") env.edit("A", "unsynced field without timestamp change");
    env.select("B"); remote.topic = "different cloud edit";
    env.answer(1, { projects: [row(remote)] }); await pulling;
    assert.equal(env.project("A").updatedAt, originalTime);
    assert.equal(env.project("A").topic, "unsynced field without timestamp change");
    assert.equal(env.project("A").integration.cloud.conflict.currentRevision, 3);
    assert.equal(env.read().selectedProjectId, "B", "Pending pull cannot restore its original selection");
    assert.equal(JSON.stringify(env.base("A")), originalBase, "Conflicts retain the original three-way merge base");
    env.select("A"); await env.auto(); assert.equal(env.requests.length, 2);
  }
  for (const revision of [1, 2]) {
    const env = await harness().start(), remote = env.project("A"); env.remember("A");
    env.edit("A", "keep this pending edit"); remote.topic = "stale remote";
    const pulling = env.pull(); await tick(); env.answer(1, { projects: [row(remote, revision)] }); await pulling;
    assert.equal(env.project("A").topic, "keep this pending edit");
    assert.equal(env.project("A").integration.cloud.revision, 2, "Client clocks never demote revisions");
    assert.notEqual(env.base("A").topic, remote.topic);
    const saving = env.auto(); await tick();
    assert.equal(env.requests[2].body.baseRevision, 2, "Ignored pulls must not mark pending edits as synchronized"); env.answer(2); await saving;
  }
  {
    const env = await harness().start(), remote = env.project("A");
    const pulling = env.pull(); await tick();
    env.change((s) => { s.projects = s.projects.filter((p) => p.projectId !== "A"); s.selectedProjectId = "B"; });
    env.answer(1, { projects: [row(remote)] }); await pulling;
    assert.equal(env.project("A"), undefined); assert.equal(env.read().selectedProjectId, "B"); assert.equal(env.base("A"), null);
  }
  for (const phase of ["token", "response"]) {
    const env = await harness().start(), before = JSON.stringify(env.read());
    const gate = phase === "token" ? env.holdToken() : null, pulling = env.pull(true); await tick();
    env.auth(false);
    if (gate) gate.resolve("expired-session");
    else env.answer(1, { projects: [row({ ...env.project("A"), topic: "must not hydrate after logout" })] });
    await pulling;
    assert.equal(env.requests.length, phase === "token" ? 1 : 2);
    assert.equal(JSON.stringify(env.read()), before); assert.equal(env.reloads.length, 0);
  }
  {
    const env = await harness().start(), before = JSON.stringify(env.read()); env.remember("A");
    const remote = { ...env.project("A"), topic: "remote" }, pulling = env.pull(true); await tick();
    env.context.document.activeElement = { matches: () => true };
    env.answer(1, { projects: [row(remote)] }); assert.equal(await pulling, false);
    assert.equal(JSON.stringify(env.read()), before); assert.equal(env.reloads.length, 0, "Unblurred edits cannot be discarded by automatic reload");
    env.context.document.activeElement = null;
    const retry = env.pull(true); await tick(); env.answer(2, { projects: [row(remote)] }); await retry;
    assert.equal(env.reloads.length, 1, "A later explicit retry can hydrate safely");
  }
  {
    const env = await harness().start(), pulling = env.pull(); await tick(); env.answer(1, { projects: {} });
    assert.equal(await pulling, false);
    const retry = env.pull(); await tick(); env.answer(2, { projects: [] }); await retry;
    assert.equal(env.requests.length, 3, "Failed pulls release the operation guard");
  }

  {
    const env = await harness().start();
    for (const id of ["B", "A", "LOCAL", "A"]) { env.select(id); await env.auto(); }
    assert.equal(env.requests.length, 1, "Navigation, including an existing local-only draft, must not save projects");
    env.change((s) => { s.projects[0].integration.cloud.revision = 5; s.projects[0].files.PROJECT_DATA.content = "generated bookkeeping echo"; });
    await env.auto(); assert.equal(env.requests.length, 1, "Cloud bookkeeping and its generated echo are not edits");
    env.edit("A", "real edit"); const saving = env.auto(); await tick();
    assert.equal(env.requests[1].body.baseRevision, 5); env.answer(1, { revision: 6 }); await saving;
    await env.auto(); assert.equal(env.requests.length, 2, "Acknowledged content must settle without a save loop");
  }
  {
    const env = await harness().start(); env.edit("A", "sent");
    const saving = env.auto(); await tick(); await env.auto(); await env.push();
    assert.equal(env.requests.length, 2, "Pending auto/manual requests must coalesce");
    env.edit("A", "newer unsent edit"); env.select("B"); env.edit("B", "other project edit");
    env.answer(1); await saving;
    assert.equal(env.read().selectedProjectId, "B");
    assert.equal(env.project("A").topic, "newer unsent edit");
    assert.equal(env.project("B").topic, "other project edit");
    assert.equal(env.project("A").integration.cloud.revision, 3);
    env.select("A"); const retry = env.auto(); await tick();
    assert.equal(env.requests[2].body.projectData.topic, "newer unsent edit");
    assert.equal(env.requests[2].body.baseRevision, 3); env.answer(2, { revision: 4 }); await retry;
    await env.auto(); assert.equal(env.requests.length, 3);
  }
  for (const transition of ["switch", "logout", "delete"]) {
    const env = await harness().start(); env.edit("A", "queued");
    const gate = env.holdToken(), saving = env.auto();
    if (transition === "switch") env.select("B");
    if (transition === "logout") env.auth(false);
    if (transition === "delete") env.change((s) => { s.projects = s.projects.filter((p) => p.projectId !== "A"); });
    gate.resolve("old-token"); await saving;
    assert.equal(env.requests.length, 1, `${transition} before token resolution must prevent the write`);
  }
  for (const status of [200, 409]) {
    const env = await harness().start(); env.edit("A", "sent"); const saving = env.auto(); await tick();
    env.change((s) => { s.projects = s.projects.filter((p) => p.projectId !== "A"); s.selectedProjectId = "B"; });
    env.answer(1, status === 200 ? { revision: 3 } : { error: "REVISION_CONFLICT", conflict: { currentRevision: 4 } }, status);
    await saving;
    assert.equal(env.project("A"), undefined, "Late success/conflict cannot resurrect a deleted project");
    assert.equal(env.read().selectedProjectId, "B");
  }
  {
    const env = await harness().start(); env.edit("A", "sent"); const saving = env.auto(); await tick();
    env.edit("A", "newer"); env.select("B"); env.edit("B", "unrelated");
    env.answer(1, { error: "REVISION_CONFLICT", conflict: { currentRevision: 4 } }, 409); await saving;
    assert.equal(env.read().selectedProjectId, "B"); assert.equal(env.project("A").topic, "newer"); assert.equal(env.project("B").topic, "unrelated");
    assert.equal(env.project("A").integration.cloud.conflict.currentRevision, 4);
    env.select("A"); await env.auto(); assert.equal(env.requests.length, 2, "Unresolved conflicts block subsequent autosaves");
  }
  {
    const env = await harness().start(); env.edit("A", "keep for retry"); const saving = env.auto(); await tick();
    env.answer(1, { error: "temporary outage" }, 503); await saving;
    const retry = env.auto(); await tick(); assert.equal(env.requests.length, 3); env.answer(2); await retry;
  }
  for (const response of [{ revision: 2 }, { revision: "3" }, { revision: 3, project: { project_id: "B" } }]) {
    const env = harness(), saving = env.push(); await tick(); env.answer(0, response); assert.equal(await saving, false);
    assert.equal(env.project("A").integration.cloud.revision, 2, "Malformed success must not advance local revision");
  }
  {
    const env = harness(), saving = env.push(); await tick();
    env.change((s) => { s.projects[0].integration.cloud.revision = 5; });
    env.answer(0); assert.equal(await saving, false); assert.equal(env.project("A").integration.cloud.revision, 5);
  }
  {
    const env = await harness().start();
    const button = env.nodes.find((n) => n.textContent === "送去 Publish Console");
    const publishing = button.listeners.click(); await tick(); env.answer(1, { error: "offline" }, 503); await publishing;
    assert.equal(env.context.localStorage.getItem(Core.PUBLISH_HANDOFF_KEY), null, "Failed sync must not create a publish handoff");
    const success = button.listeners.click(); await tick(); env.answer(2); await success;
    const handoff = JSON.parse(env.context.localStorage.getItem(Core.PUBLISH_HANDOFF_KEY));
    assert.equal(handoff.project.integration.cloud.revision, 3, "Handoff must use the acknowledged revision");
  }
  {
    const env = harness(), nodes = new Map(), listeners = {};
    const get = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, style: {}, addEventListener() {} });
      return nodes.get(selector);
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../apps/video-workspace/production-system/app.js"), "utf8"), {
      window: { GuccProductionEngine: E }, console, URLSearchParams,
      document: { querySelector: get, addEventListener(type, fn) { listeners[type] = fn; } },
      location: { search: "?project=A" }, localStorage: env.context.localStorage,
      requestAnimationFrame(fn) { fn(); },
    });
    env.change((s) => { s.projects[0].integration.cloud = { revision: 3, conflict: { currentRevision: 4 } }; });
    listeners.focusout({ target: { dataset: { projectField: "notes" }, value: "new editor note" } });
    const edited = env.project("A");
    assert.equal(edited.notes, "new editor note");
    assert.equal(edited.integration.cloud.revision, 3, "Editor save must retain async bridge's newer revision");
    assert.equal(edited.integration.cloud.conflict.currentRevision, 4, "Editor save must not clear unresolved conflicts");
    assert.equal(env.read().selectedProjectId, "A");
  }
  console.log("Creator pipeline sync behavior tests passed: isolated saves, pulls and conflict resolutions; no live API writes.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
