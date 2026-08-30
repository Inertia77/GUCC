"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const UX_PATH = path.join(__dirname, "..", "assets", "creator-pipeline-ux.mjs");

function createFakeDom(pathname) {
  const state = {
    observers: [],
    textWrites: 0,
    loopDetected: false,
    timeouts: [],
    allElements: new Set(),
  };

  function notifyMutation(source = "external") {
    for (const observer of state.observers) {
      if (!observer.active || observer.pending) continue;
      observer.pending = true;
      queueMicrotask(() => {
        if (!observer.active || !observer.pending) return;
        observer.pending = false;
        observer.callbackCount += 1;
        if (observer.callbackCount > 20) {
          state.loopDetected = true;
          observer.disconnect();
          return;
        }
        observer.callback([{ type: "childList", source }], observer);
      });
    }
  }

  class FakeClassList {
    constructor(element) {
      this.element = element;
      this.values = new Set();
    }
    contains(value) { return this.values.has(value); }
    add(value) {
      this.values.add(value);
      this.element._className = [...this.values].join(" ");
    }
    setFromString(value) {
      this.values = new Set(String(value || "").split(/\s+/).filter(Boolean));
      this.element._className = [...this.values].join(" ");
    }
  }

  class FakeElement {
    constructor(tagName = "div") {
      this.tagName = String(tagName).toUpperCase();
      this.id = "";
      this.parentElement = null;
      this.children = [];
      this.attributes = {};
      this._textContent = "";
      this._className = "";
      this.classList = new FakeClassList(this);
      this.title = "";
      state.allElements.add(this);
    }
    get textContent() { return this._textContent; }
    set textContent(value) {
      this._textContent = String(value ?? "");
      state.textWrites += 1;
      notifyMutation("textContent");
    }
    get className() { return this._className; }
    set className(value) { this.classList.setFromString(value); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      notifyMutation("appendChild");
      return child;
    }
    insertAdjacentElement(_position, child) {
      if (!this.parentElement) return null;
      child.parentElement = this.parentElement;
      this.parentElement.children.push(child);
      notifyMutation("insertAdjacentElement");
      return child;
    }
    querySelector(selector) {
      if (selector === ".gcb-close") return this.children.find((child) => child.classList.contains("gcb-close")) || null;
      return null;
    }
  }

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.callbackCount = 0;
      this.active = false;
      this.pending = false;
      this.disconnected = false;
      state.observers.push(this);
    }
    observe(target, options) {
      this.target = target;
      this.options = options;
      this.active = true;
      this.disconnected = false;
    }
    disconnect() {
      this.active = false;
      this.pending = false;
      this.disconnected = true;
    }
  }

  const documentElement = new FakeElement("html");
  const head = new FakeElement("head");
  const body = new FakeElement("body");
  head.parentElement = documentElement;
  body.parentElement = documentElement;
  documentElement.children.push(head, body);

  const selectorMap = new Map();
  const document = {
    readyState: "complete",
    documentElement,
    head,
    body,
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => [...state.allElements].find((element) => element.id === id) || null,
    querySelector(selector) {
      if (selectorMap.has(selector)) return selectorMap.get(selector);
      if (selector.startsWith(".")) {
        const className = selector.slice(1);
        return [...state.allElements].find((element) => element.classList.contains(className)) || null;
      }
      return null;
    },
    addEventListener() {},
  };

  const window = {
    location: { pathname },
    setTimeout(callback, ms) {
      state.timeouts.push({ callback, ms });
      return state.timeouts.length;
    },
  };

  function addSelector(selector, element, parent = body) {
    selectorMap.set(selector, element);
    if (!element.parentElement) {
      element.parentElement = parent;
      parent.children.push(element);
    }
    return element;
  }

  return {
    state,
    document,
    window,
    MutationObserver: FakeMutationObserver,
    FakeElement,
    addSelector,
    notifyMutation,
  };
}

async function importUx(caseName, env) {
  global.window = env.window;
  global.document = env.document;
  global.MutationObserver = env.MutationObserver;
  const url = `${pathToFileURL(UX_PATH).href}?case=${encodeURIComponent(caseName)}-${Date.now()}-${Math.random()}`;
  await import(url);
  return () => {
    delete global.window;
    delete global.document;
    delete global.MutationObserver;
  };
}

async function flushMicrotasks(turns = 8) {
  for (let index = 0; index < turns; index += 1) await Promise.resolve();
}

async function testPublishObserverDoesNotSelfTrigger() {
  const env = createFakeDom("/apps/publishing-console/");
  const { FakeElement } = env;

  const importButton = new FakeElement("button");
  importButton.id = "importWorkspaceButton";
  importButton._textContent = "导入 WorkSpace JSON";
  const heroText = new FakeElement("p");
  heroText._textContent = "旧说明";
  const flowNav = new FakeElement("nav");
  flowNav.className = "flow-nav";

  env.addSelector(".hero > div > p:last-child", heroText);
  env.addSelector(".flow-nav", flowNav);
  importButton.parentElement = env.document.body;
  env.document.body.children.push(importButton);

  const cleanup = await importUx("publish-observer", env);
  try {
    assert.equal(importButton.textContent, "兼容导入旧 JSON", "Publish copy must still be updated before observer startup");
    assert.equal(heroText.textContent, "优先接收 Production 的正式发布交接，自动拆分六平台字段、预检、执行与记录；旧 WorkSpace JSON 仅作为兼容入口。", "Publish hero copy must remain correct");
    assert.equal(env.state.observers.length, 1, "Publish without bridge must start one bounded observer");
    const observer = env.state.observers[0];
    assert.equal(observer.active, true, "Observer must wait for a late creator bridge");

    const writesAfterInit = env.state.textWrites;
    env.notifyMutation("unrelated-shell-mutation");
    await flushMicrotasks();

    assert.equal(observer.callbackCount, 1, "One unrelated childList mutation must cause only one observer callback when bridge is absent");
    assert.equal(env.state.textWrites, writesAfterInit, "Observer callback must not rewrite watched text and self-trigger");
    assert.equal(env.state.loopDetected, false, "Observer must not enter a self-trigger loop");
    assert.equal(observer.active, true, "Observer remains armed while bridge is still absent");

    let nextTaskRan = false;
    await new Promise((resolve) => setImmediate(() => { nextTaskRan = true; resolve(); }));
    assert.equal(nextTaskRan, true, "Event loop must progress after unrelated DOM mutation");

    const bridge = new FakeElement("section");
    bridge.id = "guccCreatorBridge";
    const close = new FakeElement("button");
    close.className = "gcb-close";
    bridge.children.push(close);
    close.parentElement = bridge;
    env.document.documentElement.appendChild(bridge);
    await flushMicrotasks();

    assert.equal(bridge.classList.contains("gcb-inline"), true, "Late creator bridge must still integrate into Publish host");
    const host = env.document.querySelector(".gcb-publish-host");
    assert.ok(host, "Publish integration host must be created when bridge appears");
    assert.equal(host.children.includes(bridge), true, "Bridge must move into integrated Publish host");
    assert.equal(observer.disconnected, true, "Observer must disconnect immediately after successful integration");
    assert.equal(env.state.loopDetected, false, "Bridge integration mutations must not restart an observer loop");
    assert.equal(importButton.textContent, "兼容导入旧 JSON", "Final Publish copy must remain correct after integration");
  } finally {
    cleanup();
  }
}

async function testProductionAndStudioRemainCompatible() {
  const production = createFakeDom("/apps/video-workspace/production-system/");
  const topbar = new production.FakeElement("header");
  topbar.className = "topbar";
  production.addSelector(".topbar", topbar);
  const productionBridge = new production.FakeElement("section");
  productionBridge.id = "guccCreatorBridge";
  productionBridge.parentElement = production.document.body;
  production.document.body.children.push(productionBridge);
  const cleanupProduction = await importUx("production", production);
  try {
    assert.equal(productionBridge.classList.contains("gcb-inline"), true, "Production bridge must still integrate immediately");
    assert.ok(production.document.querySelector(".gcb-production-host"), "Production host must still be created");
  } finally {
    cleanupProduction();
  }

  const studio = createFakeDom("/apps/video-workspace/");
  const studioHeader = new studio.FakeElement("header");
  studioHeader.className = "studio-header";
  studio.addSelector(".studio-header", studioHeader);
  const productionLink = new studio.FakeElement("a");
  productionLink._textContent = "Production";
  studio.addSelector('a[href="./production-system/"]', productionLink);
  const studioBridge = new studio.FakeElement("section");
  studioBridge.id = "guccCreatorBridge";
  studioBridge.parentElement = studio.document.body;
  studio.document.body.children.push(studioBridge);
  const cleanupStudio = await importUx("studio", studio);
  try {
    assert.equal(productionLink.textContent, "正式制作 Production", "Studio production-link copy must remain correct");
    assert.equal(studioBridge.classList.contains("gcb-inline"), true, "Studio bridge must still integrate immediately");
    assert.ok(studio.document.querySelector(".gcb-studio-host"), "Studio host must still be created");
  } finally {
    cleanupStudio();
  }
}

(async () => {
  await testPublishObserverDoesNotSelfTrigger();
  await testProductionAndStudioRemainCompatible();

  const source = fs.readFileSync(UX_PATH, "utf8");
  const observerMatch = source.match(/new MutationObserver\(\(\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(observerMatch, "Creator Pipeline UX must retain a bounded late-bridge MutationObserver");
  assert.doesNotMatch(observerMatch[1], /updateCopy\s*\(/, "Observer callback must never reintroduce copy writes into its watched subtree");
  assert.doesNotMatch(observerMatch[1], /textContent\s*=|innerHTML\s*=|appendChild\s*\(/, "Observer callback must not directly mutate the watched subtree before integration succeeds");

  console.log("Creator Pipeline UX observer starvation regression tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
