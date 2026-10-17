import "./creator-project-folders.js?v=1";
import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";
import {
  observeArtifact,
  subtitleValid,
  contextFor,
} from "./creator-artifact-observation.mjs";
const C = window.GuccCreatorContext,
  API = CONFIG.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/";
const base = new URL("../", import.meta.url),
  pages = {
    studio: "apps/video-workspace/legacy-prompt-studio-v6.html",
    creator: "apps/video-workspace/production-system/",
    cover: "apps/cover-generator/",
    publish: "apps/publishing-console/",
  };
const names = [
  ["script", "文案"],
  ["subtitle", "精确字幕"],
  ["visual", "视觉素材"],
  ["sound", "BGM / 音效"],
  ["cover", "正式封面"],
  ["publish", "六平台发布包"],
];
const labels = {
  not_started: "未开始",
  in_progress: "制作中",
  review: "待审核",
  confirmed: "已确认",
  blocked: "需要处理",
};
function element(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...children);
  return e;
}
function button(text, fn) {
  const b = element("button", { type: "button", textContent: text });
  b.addEventListener("click", fn);
  return b;
}
function option(id, text) {
  return element("option", { value: id, textContent: text });
}
function field(text, node) {
  return element("label", {}, [element("span", { textContent: text }), node]);
}
function readJSON(k, f = {}) {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") || f;
  } catch {
    return f;
  }
}
const owner = () => getSession()?.user?.id || "local";
const draftStore = () => `gucc_outcome_editor_${owner()}`;
const recentKey = () => `gucc_creator_recents_${owner()}`;
async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = await getAccessToken();
  const r = await fetch(API + path, {
    method,
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json().catch(() => null);
  if (!r.ok)
    throw Error(data?.message || data?.error || "云端访问失败 " + r.status);
  return data;
}
const css = element("link", {
  rel: "stylesheet",
  href: new URL("./creator-shared-context.css?v=4", import.meta.url).href,
});
document.head.append(css);
// Each workspace owns the placement of its context. Never insert a second workbench.
const mount = document.querySelector("[data-creator-context]");
const nav = element("div", {
  id: "guccCreatorContextBar",
  className: "gucc-creator-context",
});
nav.setAttribute("aria-label", "当前项目与视频");
const contextProject = element("span", {
    className: "gcc-context-project",
    textContent: "选择项目",
  }),
  contextVideo = element("strong", { textContent: "本浏览器草稿" });
const contextTrigger = button("", () => openSwitcher());
contextTrigger.className = "gcc-context-trigger";
contextTrigger.setAttribute("aria-haspopup", "dialog");
contextTrigger.setAttribute("aria-label", "切换项目与视频");
contextTrigger.append(
  element("span", { className: "gcc-context-glyph", textContent: "◈" }),
  element("span", { className: "gcc-context-copy" }, [
    contextProject,
    contextVideo,
  ]),
  element("span", { className: "gcc-chevron", textContent: "⌄" }),
);
const outcomeButton = button("成果 0/6", () => openOutcome());
outcomeButton.className = "gcc-outcome-trigger";
outcomeButton.setAttribute("aria-haspopup", "dialog");
nav.append(contextTrigger, outcomeButton);
mount?.append(nav);
const status = element("p", {
  className: "gcc-connection",
  textContent: "正在连接项目…",
});
status.setAttribute("role", "status");
const selector = element("dialog", {
  id: "guccProjectSwitcher",
  className: "gcc-sheet gcc-switcher",
});
selector.setAttribute("aria-labelledby", "gccSwitcherTitle");
const selectorTitle = element("h2", {
  id: "gccSwitcherTitle",
  textContent: "你的创作项目",
});
function closeButton(dialog) {
  const b = button("×", () => dialog.close());
  b.className = "gcc-close";
  b.setAttribute("aria-label", "关闭");
  return b;
}
const search = element("input", {
  type: "search",
  placeholder: "搜索项目、游戏或版本",
});
search.setAttribute("aria-label", "搜索创作项目");
const project = element("select");
project.setAttribute("aria-label", "选择 GUCC 项目");
const video = element("select");
video.setAttribute("aria-label", "选择项目中的视频");
const apply = button("在此工具使用", () => void activate());
apply.className = "gcc-primary";
apply.disabled = true;
const create = button("＋ 新项目", () => openCreation(false)),
  addVideo = button("＋ 视频", () => openCreation(true));
const links = element("nav", { className: "gcc-links" });
links.setAttribute("aria-label", "在其他工具继续");
for (const [kind, text] of Object.entries({
  studio: "Prompt Studio",
  creator: "Creator OS",
  cover: "封面设计",
  publish: "发布工作台",
})) {
  const a = element("a", {
    textContent: text + " ↗",
    href: new URL(pages[kind], base).href,
  });
  a.dataset.kind = kind;
  links.append(a);
}
selector.append(
  element("header", { className: "gcc-sheet-head" }, [
    selectorTitle,
    closeButton(selector),
  ]),
  element("p", {
    className: "gcc-deck",
    textContent: "选定项目与视频，在熟悉的工具里继续。",
  }),
  search,
  element("div", { className: "gcc-selector" }, [
    field("项目 · 最近使用排在前面", project),
    field("视频", video),
  ]),
  status,
  element("div", { className: "gcc-selector-actions" }, [
    create,
    addVideo,
    apply,
  ]),
  element("div", { className: "gcc-tool-links" }, [
    element("span", { textContent: "继续制作" }),
    links,
  ]),
);
document.body.append(selector);
const panel = element("dialog", { className: "gcc-sheet gcc-outcome-dialog" });
panel.setAttribute("aria-labelledby", "gccOutcomeTitle");
const summary = element("p", { className: "gcc-outcome-summary" }),
  chips = element("nav", { className: "gcc-outcome-chips" }),
  editor = element("div", { className: "gcc-outcome-editor" });
chips.setAttribute("aria-label", "六项正式成果");
const outcomeTitle = element("h2", {
    id: "gccOutcomeTitle",
    textContent: "文案",
  }),
  outcomeMeta = element("p", { className: "gcc-deck" }),
  lockBadge = element("span", { className: "gcc-lock-badge" });
const kind = element("select");
kind.setAttribute("aria-label", "选择成果");
names.forEach(([k, n]) => kind.append(option(k, n)));
const state = element("select");
state.setAttribute("aria-label", "成果状态");
Object.entries(labels).forEach(([k, n]) => state.append(option(k, n)));
let content = element("textarea", {
  rows: 7,
  placeholder: "正式内容或制作说明。草稿自动保留，点击保存后同步。",
});
content.setAttribute("aria-label", "成果内容");
let prompt = element("textarea", {
  rows: 5,
  placeholder: "本轮实际使用的 AI Prompt",
});
prompt.setAttribute("aria-label", "成果 AI Prompt");
const note = element("input", {
  placeholder: "需要核对什么，或为什么确认这个版本",
});
note.setAttribute("aria-label", "成果审核备注");
const reference = element("input", {
  placeholder: "文件位置或链接，仅作为待核实线索",
});
reference.setAttribute("aria-label", "未核实文件线索");
const files = element("input", { type: "file", multiple: true });
files.setAttribute("aria-label", "选择实际成果文件");
const recording = element("input", { type: "file", accept: "audio/*,video/*" });
recording.setAttribute("aria-label", "选择真实录音");
const recordingField = field("字幕依据的真实录音", recording);
const check = element("input", { type: "checkbox" }),
  checkLabel = field("我已检查实际文件并确认；字幕已逐句核对真实录音", check);
checkLabel.className = "gcc-evidence";
const artifactList = element("div", { className: "gcc-files" }),
  message = element("small", { className: "gcc-feedback" });
message.setAttribute("role", "status");
const save = button("保存成果状态", () => void saveOutcome()),
  reload = button("读取云端最新版本", () => void loadOutcomes(C.read())),
  reopen = button("重新打开已锁定成果", () => void reopenOutcome());
save.className = "gcc-primary";
reopen.className = "gcc-caution";
const resolveDraft = button("核对后保留本浏览器草稿", async () => {
    if (
      !(await ask(
        "保留本浏览器草稿",
        "确认已核对云端历史，再以当前草稿继续制作。原云端版本会保留。",
      ))
    )
      return;
    editorBase = rows.get(selectedKey)?.revision || 0;
    keepDraft();
    resolveDraft.hidden = true;
    notice("已核对版本，请审核后再次保存");
  }),
  discardDraft = button("采用云端成果", async () => {
    if (
      !(await ask(
        "采用云端成果",
        "当前编辑会另存浏览器备份，随后读取云端内容。",
      ))
    )
      return;
    const all = readJSON(draftStore());
    all["backup:" + Date.now() + ":" + draftId()] = editorData();
    delete all[draftId()];
    localStorage.setItem(draftStore(), JSON.stringify(all));
    showEditor();
  });
const textExport = button("下载文本并登记", () => void makeText()),
  promptImport = button("带入当前工具 Prompt", () => {
    prompt.value =
      window.GuccCreatorWorkspaceAdapter?.currentPrompt?.() || prompt.value;
    keepDraft();
  });
const history = element("details", { className: "gcc-history" }),
  historyBody = element("div");
history.append(element("summary", { textContent: "版本历史" }), historyBody);
const advanced = element("details", { className: "gcc-advanced" });
advanced.append(
  element("summary", { textContent: "Prompt 与文件详情" }),
  field("本轮 Prompt", prompt),
  promptImport,
  field("待核实的文件线索", reference),
);
const destination = element("a", {
  className: "gcc-tool-destination",
  textContent: "在制作工具中继续 ↗",
});
const editorHeading = element("div", { className: "gcc-editor-heading" }, [
  element("div", {}, [outcomeTitle, outcomeMeta]),
  lockBadge,
]);
editor.append(
  editorHeading,
  element("div", { className: "gcc-editor-controls" }, [
    field("成果", kind),
    field("制作状态", state),
    destination,
  ]),
  field("内容与说明", content),
  element("section", { className: "gcc-artifact-section" }, [
    element("h3", { textContent: "实际产物" }),
    artifactList,
    field("选择文件 · 文件保留在本机", files),
    recordingField,
  ]),
  field("审核备注", note),
  checkLabel,
  advanced,
  history,
  element("div", { className: "gcc-conflict-actions" }, [
    resolveDraft,
    discardDraft,
  ]),
  message,
  element("footer", { className: "gcc-actions" }, [
    save,
    textExport,
    reopen,
    reload,
  ]),
);
panel.append(
  element("header", { className: "gcc-sheet-head" }, [
    element("div", {}, [
      element("span", { className: "gcc-kicker", textContent: "正式成果" }),
      summary,
    ]),
    closeButton(panel),
  ]),
  element("div", { className: "gcc-outcome-layout" }, [chips, editor]),
);
document.body.append(panel);
const overviewMount = document.querySelector("[data-creator-outcomes]"),
  overview = element("section", { className: "gcc-overview" }),
  overviewTitle = element("p"),
  overviewList = element("div", { className: "gcc-overview-list" });
overview.append(
  element("header", {}, [
    element("div", {}, [
      element("span", {
        className: "gcc-kicker",
        textContent: "本视频的六项成果",
      }),
      overviewTitle,
    ]),
    button("查看成果档案 ↗", () => openOutcome()),
  ]),
  overviewList,
);
overviewMount?.append(overview);
function openSwitcher() {
  selector.showModal();
  contextTrigger.setAttribute("aria-expanded", "true");
  search.focus();
}
selector.addEventListener("close", () =>
  contextTrigger.setAttribute("aria-expanded", "false"),
);
function openOutcome(key = kind.value) {
  if (!active.videoId) {
    openSwitcher();
    return;
  }
  keepDraft();
  kind.value = key;
  render();
  panel.showModal();
}
for (const d of [selector, panel])
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
// Destructive approval changes have a clear, styled confirmation instead of a native prompt.
async function ask(title, text, { reason = false } = {}) {
  return new Promise((resolve) => {
    const d = element("dialog", { className: "gcc-sheet gcc-confirm" }),
      input = element("input", { placeholder: "填写原因", required: true });
    d.setAttribute("aria-label", title);
    const f = element("form");
    f.append(
      element("h2", { textContent: title }),
      element("p", { textContent: text }),
    );
    if (reason) f.append(field("原因", input));
    f.append(
      element("div", { className: "gcc-actions" }, [
        element("button", {
          type: "submit",
          className: "gcc-primary",
          textContent: "确认",
        }),
        button("取消", () => d.close()),
      ]),
    );
    d.append(f);
    document.body.append(d);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      resolve(reason ? input.value.trim() : true);
      d.close();
    });
    d.addEventListener("close", () => {
      resolve(false);
      d.remove();
    });
    d.showModal();
  });
}
let listingEpoch = 0,
  selectionEpoch = 0;
let projects = [],
  snapshot = null,
  snapshotRevision = 0,
  official = [],
  rows = new Map(),
  active = C.clean({}),
  epoch = 0,
  loading = false,
  saving = false,
  loadFailed = false,
  editorId = "",
  observations = [],
  recordingObservation = null,
  selectedKey = "script",
  suppress = false,
  editorBase = 0;
function notice(text) {
  message.textContent = text;
}
function historyURL(ctx) {
  window.history.replaceState(null, "", C.url(location.href, ctx));
}
function linksFor(ctx) {
  for (const a of links.children)
    a.href = C.url(new URL(pages[a.dataset.kind], base).href, ctx);
}
function draftId(ctx = active, key = selectedKey) {
  return JSON.stringify([ctx.projectId, ctx.videoId, key]);
}
function editorData() {
  return {
    status: state.value,
    content: content.value,
    prompt: prompt.value,
    note: note.value,
    reference: reference.value,
    artifacts: observations,
    recording: recordingObservation,
    baseRevision: editorBase,
  };
}
function keepDraft() {
  if (suppress || !active.videoId || rows.get(selectedKey)?.evidence?.locked)
    return;
  try {
    const all = readJSON(draftStore());
    all[draftId()] = editorData();
    localStorage.setItem(draftStore(), JSON.stringify(all));
  } catch {
    notice("本浏览器草稿未保存，请先复制内容备份");
  }
}
for (const e of [state, content, prompt, note, reference])
  e.addEventListener("input", keepDraft);
function showArtifacts() {
  artifactList.replaceChildren();
  if (!observations.length)
    artifactList.append(
      element("p", {
        className: "gcc-empty",
        textContent: "尚未登记实际文件。制作完成后，选择文件核对。",
      }),
    );
  for (const a of observations) {
    const d = element("details"),
      size =
        a.sizeBytes < 1048576
          ? (a.sizeBytes / 1024).toFixed(1) + " KB"
          : (a.sizeBytes / 1048576).toFixed(1) + " MB";
    d.append(
      element("summary", {}, [
        element("strong", { textContent: a.fileName }),
        element("span", {
          textContent: [size, a.ratio, "已读取文件"]
            .filter(Boolean)
            .join(" · "),
        }),
      ]),
      element("p", { textContent: "文件校验值（SHA-256）" }),
      element("code", { textContent: a.sha256 || "未核验" }),
    );
    artifactList.append(d);
  }
  if (recordingObservation)
    artifactList.append(
      element("p", {
        textContent: "依据录音：" + recordingObservation.fileName,
      }),
    );
}
function showEditor() {
  suppress = true;
  selectedKey = kind.value;
  editorId = draftId();
  const row = rows.get(selectedKey),
    e = row?.evidence || {},
    draft = readJSON(draftStore())[editorId];
  const d = (!e.locked && draft) || {
    status: row?.status || "not_started",
    content: e.content || "",
    prompt: e.prompt || "",
    note: row?.review_note || "",
    reference: e.reference || "",
    artifacts: e.artifacts || [],
    recording: e.recording || null,
  };
  editorBase =
    (!e.locked && draft ? draft.baseRevision : undefined) ?? row?.revision ?? 0;
  resolveDraft.hidden =
    e.locked || !draft || editorBase === (row?.revision || 0);
  discardDraft.hidden = !draft;
  state.value = d.status;
  content.value = d.content;
  prompt.value = d.prompt;
  note.value = d.note;
  reference.value = d.reference;
  observations = d.artifacts || [];
  recordingObservation = d.recording || null;
  check.checked = false;
  files.value = "";
  recording.value = "";
  recordingField.hidden = selectedKey !== "subtitle";
  const locked = e.locked === true;
  // Recreate native text controls when leaving a disabled locked/loading view.
  // This also clears stale browser editing state without touching authored text.
  if (!locked && !loading && !saving && !loadFailed) {
    if (content.disabled) {
      const next = content.cloneNode(true);
      next.disabled = false;
      next.readOnly = false;
      content.replaceWith(next);
      content = next;
      content.addEventListener("input", keepDraft);
    }
    if (prompt.disabled) {
      const next = prompt.cloneNode(true);
      next.disabled = false;
      next.readOnly = false;
      prompt.replaceWith(next);
      prompt = next;
      prompt.addEventListener("input", keepDraft);
    }
  }
  for (const input of [
    state,
    content,
    prompt,
    note,
    reference,
    files,
    recording,
    check,
    save,
    textExport,
    promptImport,
  ])
    input.disabled = locked || loading || saving || loadFailed;
  content.readOnly = locked || loading || saving || loadFailed;
  prompt.readOnly = locked || loading || saving || loadFailed;
  reopen.hidden = !locked;
  reopen.disabled = saving;
  showArtifacts();
  historyBody.replaceChildren();
  suppress = false;
  if (
    !loadFailed &&
    !loading &&
    draft &&
    draft.baseRevision !== (row?.revision || 0)
  )
    notice(
      "本浏览器有另一版本的未提交草稿。已保留内容；保存前请核对云端历史。",
    );
  void loadHistory();
}
function render() {
  const hasVideo = Boolean(active.projectId && active.videoId),
    n = [...rows.values()].filter((r) => r.status === "confirmed").length;
  overview.hidden = !hasVideo;
  outcomeButton.disabled = !hasVideo;
  outcomeButton.textContent = loadFailed
    ? "成果 · 连接异常"
    : loading
      ? "成果 · 读取中"
      : `成果 ${n}/6`;
  const p = projects.find((p) => p.projectId === active.projectId),
    v = official.find((v) => v.videoId === active.videoId);
  contextProject.textContent = p?.name || "选择项目";
  contextVideo.textContent =
    v?.name || (active.projectId ? "选择视频" : "本浏览器草稿");
  contextTrigger.title = [p?.name, v?.name].filter(Boolean).join(" / ");
  contextTrigger.setAttribute(
    "aria-label",
    "切换项目与视频：" + (contextTrigger.title || "本浏览器草稿"),
  );
  summary.textContent = v?.name || "当前视频";
  overviewTitle.textContent = loadFailed
    ? "暂不能读取成果，请打开档案重试"
    : loading
      ? "正在核对本视频成果…"
      : n === 6
        ? "六项成果均已确认"
        : snapshot?.completedAt
          ? `${n} / 6 已确认 · 成果与历史`
          : `${n} / 6 已确认 · 下一步，${names.find(([k]) => rows.get(k)?.status !== "confirmed")?.[1] || "核验"}`;
  chips.replaceChildren();
  overviewList.replaceChildren();
  for (const [i, [k, name]] of names.entries()) {
    const r = rows.get(k),
      status = r?.status || "not_started";
    for (const [target, compact] of [
      [chips, true],
      [overviewList, false],
    ]) {
      const b = button("", () => {
        keepDraft();
        kind.value = k;
        if (compact) render();
        else openOutcome(k);
      });
      b.dataset.status = status;
      b.dataset.gccOutcome = k;
      b.title = name;
      b.setAttribute("aria-pressed", String(kind.value === k));
      b.append(
        element("span", {
          className: "gcc-outcome-number",
          textContent: String(i + 1).padStart(2, "0"),
        }),
        element("strong", {
          textContent: !compact && k === "publish" ? "发布包" : name,
        }),
        element("span", {
          className: "gcc-state",
          textContent: loadFailed
            ? "暂未读取"
            : loading
              ? "读取中"
              : labels[status],
        }),
      );
      target.append(b);
    }
  }
  showEditor();
  const row = rows.get(kind.value);
  outcomeTitle.textContent = names.find(([k]) => k === kind.value)?.[1];
  outcomeMeta.textContent = loadFailed
    ? "连接暂不可用，已暂停写入。请重新读取云端。"
    : row
      ? `版本 ${row.revision} · ${row.updated_at ? new Date(row.updated_at).toLocaleDateString("zh-CN") : "已同步"}`
      : "尚无正式记录 · 草稿仅保留在本浏览器";
  lockBadge.textContent = row?.evidence?.locked ? "已确认 · 已锁定" : "";
  lockBadge.hidden = !row?.evidence?.locked;
  const tool = {
    script: "studio",
    subtitle: "studio",
    visual: "studio",
    sound: "studio",
    cover: "cover",
    publish: "publish",
  }[kind.value];
  destination.href = C.url(new URL(pages[tool], base).href, active);
  requestAnimationFrame(() => {
    if (!panel.open || !matchMedia("(max-width: 700px)").matches) return;
    const selected = chips.querySelector('[aria-pressed="true"]');
    if (selected) chips.scrollLeft = selected.offsetLeft - chips.offsetLeft - 12;
  });
}
async function loadHistory() {
  const id = editorId,
    ctx = { ...active },
    k = selectedKey;
  if (!ctx.videoId) return;
  try {
    const result = await request(
      "creator_deliverable_versions?select=revision,record,created_at&project_id=eq." +
        encodeURIComponent(ctx.projectId) +
        "&video_id=eq." +
        encodeURIComponent(ctx.videoId) +
        "&deliverable_key=eq." +
        k +
        "&order=revision.desc&limit=50",
    );
    if (editorId !== id) return;
    historyBody.replaceChildren();
    if (!result.length)
      historyBody.append(
        element("p", {
          className: "gcc-empty",
          textContent: "首次保存后，版本会保留在这里。",
        }),
      );
    for (const v of result) {
      const d = element("article", { className: "gcc-version" }),
        r = v.record || {},
        e = r.evidence || {},
        raw = element("details");
      raw.append(
        element("summary", { textContent: "原始记录" }),
        element("pre", { textContent: JSON.stringify(r, null, 2) }),
      );
      d.append(
        element("header", {}, [
          element("strong", { textContent: "版本 " + v.revision }),
          element("span", {
            textContent:
              (labels[r.status] || "已保存") + (e.locked ? " · 已锁定" : ""),
          }),
        ]),
        element("time", {
          textContent: new Date(v.created_at).toLocaleString("zh-CN"),
        }),
        element("p", {
          textContent:
            r.review_note ||
            (e.artifacts || []).length +
              " 个实际文件 · " +
              (e.humanConfirmed ? "人工已确认" : "等待核验"),
        }),
      );
      if (e.content) {
        const detail = element("details");
        detail.append(
          element("summary", { textContent: "查看此版本内容" }),
          element("pre", { textContent: e.content }),
        );
        d.append(detail);
      }
      d.append(raw);
      historyBody.append(d);
    }
  } catch (e) {
    if (editorId === id)
      historyBody.textContent = "暂不能读取历史：" + e.message;
  }
}
async function loadOutcomes(ctx) {
  const run = ++epoch;
  loading = true;
  loadFailed = false;
  active = C.clean(ctx);
  rows = new Map();
  render();
  if (!active.videoId) {
    loading = false;
    return;
  }
  try {
    const result = [];
    for(let offset=0;;offset+=200){
      const page=await request("creator_deliverable_records?select=*&project_id=eq."+
        encodeURIComponent(ctx.projectId)+"&order=video_id.asc,deliverable_key.asc&limit=200&offset="+offset);
      if(run!==epoch)return;
      if(!Array.isArray(page))throw Error("正式成果返回格式不正确");
      result.push(...page);
      if(page.length<200)break;
    }
    if (run !== epoch) return;
    rows = new Map(
      result
        .filter((r) => r.video_id === ctx.videoId)
        .map((r) => [r.deliverable_key, r]),
    );
    window.dispatchEvent(
      new CustomEvent("gucc:workspace-project-records", {
        detail: { projectId: ctx.projectId, records: result },
      }),
    );
    notice("已读取云端成果；未提交的编辑仍保留在本浏览器");
  } catch (e) {
    if (run === epoch) {
      loadFailed = true;
      notice("云端读取失败：" + e.message + "。已暂停写入，请重试。");
    }
    return;
  } finally {
    if (run === epoch) {
      loading = false;
      render();
    }
  }
}
async function writeOutcome(
  ctx,
  key,
  evidence,
  newStatus,
  reviewNote,
  revision,
) {
  const result = await request("rpc/creator_workspace_save_deliverable", {
    method: "POST",
    body: {
      p_project_id: ctx.projectId,
      p_video_id: ctx.videoId,
      p_key: key,
      p_status: newStatus,
      p_evidence: evidence,
      p_note: reviewNote,
      p_expected_revision: revision,
    },
  });
  if (
    result?.project_id !== ctx.projectId ||
    result.video_id !== ctx.videoId ||
    result.deliverable_key !== key
  )
    throw Error("云端回执身份不匹配");
  window.dispatchEvent(
    new CustomEvent("gucc:creator-outcome-saved", {
      detail: { ...ctx, kind: key, status: result.status },
    }),
  );
  try {
    localStorage.setItem(
      "gucc_creator_outcome_signal",
      JSON.stringify({
        ...ctx,
        key,
        revision: result.revision,
        at: Date.now(),
      }),
    );
  } catch {}
  return result;
}
async function saveOutcome({ reopening = false } = {}) {
  if (loading || saving || loadFailed || !active.videoId) return;
  const ctx = { ...active },
    key = selectedKey,
    old = rows.get(key),
    d = editorData();
  keepDraft();
  if (d.baseRevision !== (old?.revision || 0)) {
    resolveDraft.hidden = false;
    notice("本浏览器编辑与云端来自不同版本，请先核对历史并选择保留的内容。");
    return;
  }
  if (d.status === "confirmed" && (!check.checked || !d.artifacts.length)) {
    notice("必须选择实际文件并勾选人工核验；文件路径不能作为已生成成果的证明");
    return;
  }
  if (d.status === "confirmed" && key === "subtitle" && !d.recording) {
    notice("字幕确认前必须选择真实录音，并逐句核对时序");
    return;
  }
  const pendingKey = draftId(ctx, key),
    pendingStore = "gucc_outcome_pending_" + owner(),
    pending = readJSON(pendingStore),
    signature = JSON.stringify([d, old?.revision || 0, reopening]);
  const requestId =
    pending[pendingKey]?.signature === signature
      ? pending[pendingKey].requestId
      : crypto.randomUUID();
  pending[pendingKey] = { signature, requestId };
  localStorage.setItem(pendingStore, JSON.stringify(pending));
  const evidence = {
    ...(old?.evidence || {}),
    content: d.content,
    prompt: d.prompt,
    reference: d.reference,
    artifacts: d.artifacts,
    recording: d.recording,
    fileName: d.artifacts[0]?.fileName || "",
    sizeBytes: d.artifacts[0]?.sizeBytes || 0,
    humanConfirmed: d.status === "confirmed",
    subtitleTimingReviewed: key === "subtitle" && check.checked,
    locked: d.status === "confirmed",
    requestId,
    ...(reopening ? { humanReopened: true } : {}),
  };
  saving = true;
  save.disabled = true;
  try {
    const result = await writeOutcome(
      ctx,
      key,
      evidence,
      d.status,
      d.note,
      old?.revision || 0,
    );
    if (C.key(ctx) !== C.key(active)) return;
    rows.set(key, result);
    delete pending[pendingKey];
    localStorage.setItem(pendingStore, JSON.stringify(pending));
    const all = readJSON(draftStore());
    delete all[draftId(ctx, key)];
    localStorage.setItem(draftStore(), JSON.stringify(all));
    render();
    notice("已同步 · " + labels[result.status] + " · 版本 " + result.revision);
  } catch (e) {
    notice(
      "保存未完成：" +
        e.message +
        "。你的编辑已保留在本浏览器；请核对历史后重新读取云端。",
    );
  } finally {
    saving = false;
    if (C.key(ctx) === C.key(active)) showEditor();
  }
}
async function reopenOutcome() {
  const reason = await ask(
    "重新打开已确认成果",
    "原版本、文件与批准记录会完整保留。请说明重新制作的原因。",
    { reason: true },
  );
  if (!reason) return;
  state.value = "review";
  note.value = reason;
  await saveOutcome({ reopening: true });
}
async function makeText() {
  if (!content.value.trim()) return notice("请先填写成果内容");
  if (selectedKey === "subtitle" && !subtitleValid(content.value))
    return notice("字幕文本不符合 SRT 时间码格式");
  const file = new File(
    [content.value],
    `${active.videoId}_${selectedKey}.${selectedKey === "subtitle" ? "srt" : "md"}`,
    { type: "text/plain;charset=utf-8" },
  );
  const a = await observeArtifact(file, { generated: true });
  observations = [...observations.filter((x) => x.fileName !== a.fileName), a];
  state.value = "review";
  showArtifacts();
  keepDraft();
  const url = URL.createObjectURL(file),
    link = element("a", { href: url, download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await saveOutcome();
}
files.addEventListener("change", async () => {
  const id = editorId,
    picked = [...files.files];
  files.disabled = true;
  try {
    const next = [];
    for (const f of picked) {
      if (
        selectedKey === "subtitle" &&
        /\.srt$/i.test(f.name) &&
        !subtitleValid(await f.text())
      )
        throw Error("SRT 时间码格式不正确");
      next.push(await observeArtifact(f));
    }
    if (id !== editorId) return;
    observations = [
      ...observations.filter(
        (a) => !next.some((n) => n.fileName === a.fileName),
      ),
      ...next,
    ];
    showArtifacts();
    keepDraft();
    notice("已读取真实文件及校验值；媒体仍在本地，待人工审核");
  } catch (e) {
    notice(e.message);
  } finally {
    files.disabled = false;
  }
});
recording.addEventListener("change", async () => {
  const f = recording.files[0],
    id = editorId;
  if (!f) return;
  try {
    const a = await observeArtifact(f);
    if (id === editorId) {
      recordingObservation = a;
      showArtifacts();
      keepDraft();
    }
  } catch (e) {
    notice(e.message);
  }
});
kind.addEventListener("change", () => {
  keepDraft();
  render();
});
function populateProjects(selected = project.value) {
  const recents = readJSON(recentKey(), []);
  const list = projects
    .filter(
      (p) =>
        !search.value ||
        [p.name, p.game, p.version]
          .join(" ")
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    )
    .sort((a, b) => {
      const ai = recents.indexOf(a.projectId),
        bi = recents.indexOf(b.projectId);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
  project.replaceChildren(option("", "本浏览器独立草稿"));
  for (const p of list)
    project.append(
      option(
        p.projectId,
        (recents.includes(p.projectId) ? "最近 · " : "") +
          (p.lifecycle === "completed"
            ? "[已完成] "
            : p.lifecycle === "archived"
              ? "[已归档] "
              : "") +
          p.name,
      ),
    );
  project.value = list.some((p) => p.projectId === selected) ? selected : "";
}
search.addEventListener("input", () => populateProjects());
async function selectProject(id, requested = "") {
  const ticket = ++selectionEpoch;
  apply.disabled = true;
  snapshot = null;
  snapshotRevision = 0;
  official = [];
  video.replaceChildren(option("", "正在读取视频…"));
  if (!id) {
    video.replaceChildren(option("", "独立草稿"));
    apply.disabled = false;
    return;
  }
  try {
    const [snaps, vids] = await Promise.all([
      request(
        "creator_os_workspace_snapshots?select=project_data,revision&project_id=eq." +
          encodeURIComponent(id) +
          "&limit=1",
      ),
      request(
        "creator_video_workspaces?select=video_id,title,legacy_branch&project_id=eq." +
          encodeURIComponent(id) +
          "&order=created_at.asc",
      ),
    ]);
    if (project.value !== id || ticket !== selectionEpoch) return;
    snapshot = snaps[0]?.project_data || null;
    snapshotRevision = snaps[0]?.revision || 0;
    official = C.videosFor(snapshot);
    for (const v of vids)
      if (!official.some((x) => x.videoId === v.video_id))
        official.push({
          videoId: v.video_id,
          name: v.title,
          branch: v.legacy_branch || v.video_id,
        });
    video.replaceChildren(option("", "项目资料（请选择具体视频）"));
    for (const v of official) video.append(option(v.videoId, v.name));
    for (const b of C.legacyBranches(snapshot))
      if (!official.some((v) => v.videoId === b || v.branch === b))
        video.append(option(b, b + " · 旧分支，待登记身份"));
    video.value = [...video.options].some((o) => o.value === requested)
      ? requested
      : official.length === 1
        ? official[0].videoId
        : "";
    apply.disabled = false;
    status.textContent = "项目已核对 · " + official.length + " 条正式视频";
  } catch (e) {
    status.textContent = "视频读取失败：" + e.message;
    video.replaceChildren(option("", "暂不可用"));
  }
}
project.addEventListener("change", () => void selectProject(project.value));
async function activate({ automatic = false } = {}) {
  if (loading || saving || apply.disabled) return;
  const row = projects.find((p) => p.projectId === project.value);
  if (project.value && !row) return;
  const ctx = C.clean({ projectId: project.value, videoId: video.value });
  if (ctx.videoId && !official.some((v) => v.videoId === ctx.videoId)) {
    if (!automatic) openCreation(true, ctx.videoId);
    return;
  }
  keepDraft();
  apply.disabled = true;
  try {
    const videoInfo = official.find((v) => v.videoId === ctx.videoId) || null,
      info = contextFor(snapshot, videoInfo, row);
    const adapter = window.GuccCreatorWorkspaceAdapter;
    if (
      adapter?.applyContext &&
      (await adapter.applyContext({
        ctx,
        project: info,
        video: videoInfo,
        snapshot,
        confirmed: [],
        automatic,
      })) === false
    ) {
      status.textContent = "当前工具尚未准备好，原草稿已保留";
      return;
    }
    active = { ...ctx };
    selector.close();
    C.set(ctx);
    linksFor(ctx);
    historyURL(ctx);
    if (ctx.projectId) {
      const recent = [
        ctx.projectId,
        ...readJSON(recentKey(), []).filter((x) => x !== ctx.projectId),
      ].slice(0, 12);
      localStorage.setItem(recentKey(), JSON.stringify(recent));
    }
    await loadOutcomes(ctx);
    status.textContent = ctx.projectId
      ? "当前：" + row.name + (videoInfo ? " / " + videoInfo.name : "")
      : "本浏览器独立草稿";
    window.dispatchEvent(
      new CustomEvent("gucc:workspace-ready", {
        detail: { ...ctx, rows: [...rows.values()] },
      }),
    );
  } catch (e) {
    status.textContent = "切换未完成：" + e.message;
  } finally {
    apply.disabled = false;
  }
}
const dialog = element("dialog", { className: "gcc-sheet gcc-dialog" }),
  form = element("form"),
  dialogTitle = element("h2"),
  nameInput = element("input", { required: true, maxLength: 240 }),
  gameInput = element("input", { placeholder: "例如：绝区零" }),
  versionInput = element("input", { placeholder: "例如：3.3" }),
  idInput = element("input", {
    placeholder: "留空自动生成；旧分支请输入原标识",
  }),
  dialogMessage = element("p");
const gameField = field("游戏", gameInput),
  versionField = field("版本", versionInput),
  idField = field("视频标识", idInput);
let adding = false;
form.append(
  dialogTitle,
  field("名称", nameInput),
  gameField,
  versionField,
  idField,
  dialogMessage,
  element("div", { className: "gcc-actions" }, [
    element("button", { type: "submit", textContent: "创建并使用" }),
    button("取消", () => dialog.close()),
  ]),
);
dialog.append(form);
dialog.setAttribute("aria-label", "创建项目或视频");
document.body.append(dialog);
function openCreation(isVideo, legacy = "") {
  adding = isVideo;
  if (isVideo && !project.value) {
    status.textContent = "请先选择项目，再添加视频";
    return;
  }
  selector.close();
  form.reset();
  dialogTitle.textContent = isVideo
    ? "添加视频 · 保留原有制作记录"
    : "创建统一创作项目";
  gameField.hidden = isVideo;
  versionField.hidden = isVideo;
  idField.hidden = !isVideo;
  const folderHelper=form.querySelector(".creator-folder-command");
  if(folderHelper)folderHelper.hidden=isVideo;
  idInput.value = legacy;
  dialogMessage.textContent = legacy
    ? "此标识来自旧流程。核对视频身份后登记，旧节点、Lock 与文件不会被改写。"
    : "只需创建一次，各创作工具共用这个项目。";
  dialog.showModal();
}
async function orchestrator() {
  if (window.GuccCreatorOrchestrator) return window.GuccCreatorOrchestrator;
  for (const path of [
    "apps/video-workspace/creator-six-deliverables.js",
    "apps/video-workspace/production-system/core-rules.js",
    "apps/video-workspace/production-system/capability-library.js",
    "apps/video-workspace/production-system/failure-prevention.js",
    "apps/video-workspace/production-system/orchestrator.js",
  ])
    await new Promise((ok, no) => {
      const s = element("script", { src: new URL(path, base).href });
      s.onload = ok;
      s.onerror = no;
      document.head.append(s);
    });
  return window.GuccCreatorOrchestrator;
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    let projectId = project.value,
      videoId;
    if (adding) {
      videoId =
        idInput.value.trim() ||
        "VID-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      const result = await request("rpc/creator_workspace_register_video", {
        method: "POST",
        body: {
          p_project_id: projectId,
          p_video_id: videoId,
          p_title: nameInput.value.trim(),
          p_expected_revision: snapshotRevision,
        },
      });
      const s = result.snapshot;
      if (
        s?.project_data?.workflowMode === "six" &&
        !(s.project_data.promptFlow || []).some(
          (n) => n.videoId === videoId || n.branch === videoId,
        )
      ) {
        const O = await orchestrator(),
          candidate = structuredClone(s.project_data),
          compiled = structuredClone(candidate);
        O.buildWorkflow(compiled);
        O.compilePromptFlow(compiled);
        candidate.promptFlow = [
          ...(candidate.promptFlow || []),
          ...compiled.promptFlow.filter((n) => n.videoId === videoId),
        ];
        candidate.flowRevision = (candidate.flowRevision || 0) + 1;
        await request("rpc/creator_os_save_project", {
          method: "POST",
          body: { p_project: candidate, p_expected_revision: s.revision },
        });
      }
    } else {
      const O = await orchestrator();
      projectId = "PROJECT-" + crypto.randomUUID();
      videoId = "MAIN";
      const p = O.createProject({
        projectId,
        name: nameInput.value.trim(),
        idea: nameInput.value.trim(),
        game: gameInput.value.trim(),
        version: versionInput.value.trim(),
        workflowMode: "six",
        videos: [{ videoId, branch: videoId, name: nameInput.value.trim() }],
      });
      O.buildWorkflow(p);
      O.compilePromptFlow(p);
      p.status = "FLOW_READY";
      await request("rpc/creator_os_save_project", {
        method: "POST",
        body: { p_project: p, p_expected_revision: null },
      });
    }
    dialog.close();
    window.dispatchEvent(
      new CustomEvent("gucc:workspace-project-created", {
        detail: { projectId, videoId },
      }),
    );
    await load({ projectId, videoId });
  } catch (e) {
    dialogMessage.textContent = "未保存：" + e.message;
  } finally {
    submit.disabled = false;
  }
});
async function load(desired) {
  const ticket = ++listingEpoch;
  if (!getSession()) {
    status.textContent = "请先在 GUCC DB 登录 · 本浏览器草稿保留";
    project.replaceChildren(option("", "尚未登录"));
    outcomeButton.disabled = true;
    overview.hidden = true;
    return;
  }
  try {
    const result = await request("rpc/creator_os_portal_dashboard", {
      method: "POST",
      body: {},
    });
    if (ticket !== listingEpoch) return;
    projects = result.filter((p) => p.lifecycle !== "trash");
    populateProjects();
    const saved = C.read(),
      ctx =
        desired || (active.projectId ? saved : C.candidate(location.search));
    const wanted = projects.some((p) => p.projectId === ctx.projectId)
      ? ctx
      : projects.some((p) => p.projectId === saved.projectId)
        ? saved
        : C.clean({});
    project.value = wanted.projectId;
    await selectProject(wanted.projectId, wanted.videoId);
    if (ticket !== listingEpoch) return;
    linksFor(wanted);
    if (wanted.projectId) await activate({ automatic: true });
    else {
      active = C.clean({});
      render();
      status.textContent = projects.length + " 个云端项目 · 选择项目继续制作";
    }
  } catch (e) {
    status.textContent = "项目暂不可读取：" + e.message;
    apply.disabled = true;
  }
}
// Export producers pass the captured identity plus actual File/Blob bytes. No AI DONE -> approval transition.
async function registerGenerated(
  ctx,
  key,
  artifacts,
  { prompt: usedPrompt = "", content: text = "" } = {},
) {
  const observed = [];
  for (const a of artifacts)
    observed.push(
      await observeArtifact(a.file, { generated: true, ratio: a.ratio || "" }),
    );
  const result = await request(
    "creator_deliverable_records?select=*&project_id=eq." +
      encodeURIComponent(ctx.projectId) +
      "&video_id=eq." +
      encodeURIComponent(ctx.videoId) +
      "&deliverable_key=eq." +
      key,
  );
  const old = result[0];
  const evidence = {
    ...(old?.evidence || {}),
    artifacts: [
      ...(old?.evidence?.artifacts || []).filter(
        (x) => !observed.some((n) => n.fileName === x.fileName),
      ),
      ...observed,
    ],
    prompt: usedPrompt || old?.evidence?.prompt || "",
    content: text || old?.evidence?.content || "",
    humanConfirmed: false,
    locked: false,
    requestId: crypto.randomUUID(),
    fileName: observed[0]?.fileName,
    sizeBytes: observed[0]?.sizeBytes,
  };
  if (old?.evidence?.locked) {
    const all = readJSON(draftStore());
    all[draftId(ctx, key)] = {
      status: "review",
      ...evidence,
      note: "新的导出已生成；正式成果已锁定，请先重新打开",
      baseRevision: old.revision,
    };
    localStorage.setItem(draftStore(), JSON.stringify(all));
    throw Error("正式成果已锁定；新导出线索已保留，请先重新打开成果");
  }
  await writeOutcome(
    ctx,
    key,
    evidence,
    "review",
    "工具已生成真实文件，等待人工确认",
    old?.revision || 0,
  );
  if (C.key(active) === C.key(ctx)) await loadOutcomes(ctx);
}
window.GuccCreatorWorkspace = {
  registerGenerated,
  request,
  context: () => ({ ...active }),
  records: () => [...rows.values()],
};
window.GuccCreatorContextUI = {
  reload: load,
  openSwitcher,
  openOutcome,
  selected: () => ({ projectId: project.value, videoId: video.value }),
};
window.addEventListener("storage", (e) => {
  if (
    e.key === "gucc_creator_active_context_v1" &&
    C.key(C.read()) !== C.key(active)
  )
    status.textContent =
      "另一标签页切换了项目；点击“在此工具使用”同步本页，当前草稿已保留";
  if (e.key === "gucc_creator_outcome_signal")
    status.textContent = "其他工具更新了成果；点击“读取云端最新版本”核对";
  if (e.key === "gameup_session_v5") void load();
});
window.addEventListener(
  "online",
  () => (status.textContent = "网络已恢复 · 可重新读取并核对云端"),
);
window.addEventListener("gucc:workspace-project-created", () => {
  window.GuccCreatorCloud?.refresh?.();
});
window.addEventListener("gucc:creator-context-changed", (e) => {
  linksFor(e.detail);
  if (C.key(e.detail) !== C.key(active) && !loading && !saving) {
    void load(e.detail);
  }
});
window.addEventListener("gucc:creator-cloud-ready", () => {
  if (!active.projectId) void load();
});
void load();
