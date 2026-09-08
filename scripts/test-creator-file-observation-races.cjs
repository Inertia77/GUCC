"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../assets/creator-file-observations.mjs"), "utf8")
  .replace(/^import .*;\r?\n/gm, "");
const tick = () => new Promise(setImmediate);
const data = (id, label = id) => ({ project: { project_id: id }, files: [{ id: `${id}-audio`, file_key: "AUDIO_MASTER", relative_path: `${label}/AUDIO_MASTER.wav`, status: "Ready" }] });

function harness() {
  let observer, rows = [], owner = true;
  const requests = [], warnings = [], events = {};
  const title = { dataset: { projectId: "A" } }, location = { search: "?project=A" };
  function row() {
    return {
      annotation: null,
      querySelector(selector) { return selector === "[data-upload-file]" ? { dataset: { uploadFile: "AUDIO_MASTER" } } : this.annotation; },
      appendChild(node) { this.annotation = node; node.remove = () => { this.annotation = null; }; },
    };
  }
  rows = [row()];
  const document = {
    hidden: false, head: { appendChild() {} },
    getElementById(id) { return id === "projectTitle" ? title : id === "tabContent" ? {} : null; },
    createElement() { return {}; },
    querySelectorAll(selector) { return selector.endsWith(".file-row") ? rows : rows.map((item) => item.annotation).filter(Boolean); },
    addEventListener(type, callback) { events[type] = callback; },
  };
  vm.runInNewContext(source, {
    CONFIG: { SUPABASE_URL: "https://isolated.invalid", SUPABASE_ANON_KEY: "fixture" },
    document, window: { addEventListener(type, callback) { events[type] = callback; } },
    location, URLSearchParams, localStorage: { getItem() { return null; } },
    getSession() { return owner ? { access_token: "isolated" } : null; }, getAccessToken: async () => "isolated",
    console: { warn(...args) { warnings.push(args); } },
    fetch(url, options) { return new Promise((resolve) => requests.push({ body: JSON.parse(options.body), resolve })); },
    MutationObserver: class { constructor(callback) { observer = callback; } observe() {} },
  }, { filename: "creator-file-observations.mjs" });
  return {
    requests, warnings,
    get row() { return rows[0]; },
    choose(id) { location.search = `?project=${id}`; title.dataset.projectId = id; rows = [row()]; observer(); },
    redraw() { rows = [row()]; observer(); },
    leave() { rows = []; observer(); },
    notify() { observer(); },
    auth(value) { owner = value; events.storage({ key: "gameup_session_v5" }); },
    answer(index, result, ok = true) { requests[index].resolve({ ok, status: ok ? 200 : 503, async json() { return result; } }); },
    show() { events.visibilitychange(); },
  };
}

async function main() {
  {
    const env = harness(); await tick(); const old = env.row;
    env.choose("B"); await tick();
    assert.equal(env.requests.length, 2, "New project must not wait for the previous project's request");
    env.answer(1, data("B")); await tick(); env.answer(0, data("A")); await tick();
    assert.match(env.row.annotation.innerHTML, /B\/AUDIO_MASTER/);
    assert.equal(old.annotation, null, "Detached rows must not be annotated after a project switch");
  }
  {
    const env = harness(); await tick(); const old = env.row;
    env.redraw(); env.notify(); env.notify(); await tick();
    assert.equal(env.requests.length, 1, "DOM churn must share the in-flight project read");
    env.answer(0, data("A")); await tick();
    assert.match(env.row.annotation.innerHTML, /A\/AUDIO_MASTER/);
    assert.equal(old.annotation, null, "Same-project tab replacement must annotate only current rows");
    env.notify(); await tick();
    assert.equal(env.requests.length, 1, "Self-generated observation DOM updates must use the cache");
  }
  {
    const env = harness(); await tick(); env.leave(); env.answer(0, data("A")); await tick();
    env.redraw(); await tick();
    assert.equal(env.requests.length, 1);
    assert.match(env.row.annotation.innerHTML, /A\/AUDIO_MASTER/);
  }
  {
    const env = harness(); await tick(); env.auth(false); env.answer(0, data("A", "PRIVATE_OLD")); await tick();
    assert.equal(env.row.annotation, null, "Logout must reject a pending private observation response");
    env.auth(true); await tick();
    assert.equal(env.requests.length, 2, "Login must refresh without another tab click");
    env.answer(1, data("A", "NEW_SESSION")); await tick();
    assert.match(env.row.annotation.innerHTML, /NEW_SESSION/);
    env.auth(false); assert.equal(env.row.annotation, null, "Logout must remove existing observations");
  }
  {
    const env = harness(); await tick(); env.auth(false); env.auth(true); await tick();
    env.answer(1, data("A", "NEW_SESSION")); await tick(); env.answer(0, data("A", "OLD_SESSION")); await tick();
    env.redraw(); await tick();
    assert.match(env.row.annotation.innerHTML, /NEW_SESSION/);
    assert.doesNotMatch(env.row.annotation.innerHTML, /OLD_SESSION/);
  }
  {
    const env = harness(); await tick(); env.choose("B"); await tick(); env.choose("A"); await tick();
    env.answer(0, data("A", "STALE_A")); await tick(); env.notify(); await tick();
    assert.equal(env.row.annotation, null, "An older A response must not poison the cache after A → B → A");
    assert.equal(env.requests.length, 3);
    env.answer(2, data("A", "FRESH_A")); await tick(); env.answer(1, data("B")); await tick();
    assert.match(env.row.annotation.innerHTML, /FRESH_A/);
  }
  {
    const env = harness(); await tick(); env.answer(0, data("B")); await tick();
    assert.equal(env.row.annotation, null, "Wrong-project API responses fail closed");
    assert.equal(env.warnings.length, 1);
    env.show(); await tick(); env.answer(1, data("A")); await tick();
    assert.match(env.row.annotation.innerHTML, /A\/AUDIO_MASTER/);
  }
  console.log("Creator file observation races passed: 7 isolated cases, project/session isolation and in-flight read coalescing.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
