(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccPublishMarkdown = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Markdown v1: editable headings, unknown sections never execute.
  const SPEC = {
    bilibili: { name: "B站", aliases: ["b站", "bilibili", "哔哩哔哩"], fields: {
      title: ["标题", "最终标题"], description: ["简介", "最终简介"],
      tags: ["普通标签", "标签", "tags"], category: ["分区"],
      copyright: ["版权类型"], chapters: ["分段章节", "视频章节", "章节"],
      danmakuPolls: ["弹幕投票", "弹幕投票建议", "投票弹幕"],
      pinnedComment: ["置顶评论"]
    }},
    douyin: { name: "抖音", aliases: ["抖音", "douyin"], fields: {
      caption: ["发布文案", "最终发布文案", "caption"], location: ["位置", "位置poi"],
      disclosure: ["内容披露"], pinnedComment: ["置顶评论"]
    }},
    xiaohongshu: { name: "小红书视频", aliases: ["小红书视频", "小红书", "xiaohongshu"], fields: {
      title: ["标题", "最终标题"], body: ["正文", "最终正文"],
      topics: ["话题"], pinnedComment: ["置顶评论"]
    }},
    wechat: { name: "微信视频号", aliases: ["微信视频号", "视频号", "wechat"], fields: {
      description: ["完整描述", "最终完整描述", "描述"],
      topics: ["话题"], collection: ["合集"], pinnedComment: ["置顶评论"]
    }},
    youtube: { name: "YouTube", aliases: ["youtube", "youtube繁體中文", "youtube繁体中文", "youtube简体中文", "youtube繁中", "youtube简中"], fields: {
      title: ["标题", "最终标题"], description: ["简介", "最终简介", "说明"],
      hashtags: ["hashtags", "话题标签"], backendTags: ["后台tags", "后台标签", "标签", "tags"],
      chapters: ["视频章节", "章节", "chapters"],
      playlist: ["播放列表"], visibility: ["可见性"], madeForKids: ["儿童内容设置"],
      language: ["视频语言"]
    }},
    tiktok: { name: "TikTok", aliases: ["tiktok", "tiktok繁體中文", "tiktok繁体中文", "tiktok简体中文", "tiktok繁中", "tiktok简中"], fields: {
      caption: ["caption", "最终caption", "发布文案"],
      visibility: ["可见性"], interaction: ["互动权限"],
      disclosure: ["内容披露"], pinnedComment: ["置顶评论"]
    }}
  };
  const PLACEHOLDER = "（待填写）";
  function tidy(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").trim(); }
  function heading(s) {
    return tidy(s).replace(/[*_\u200b]/g, "").replace(/[（(][^）)]*[）)]/g, "")
      .replace(/[\s　:：\-\/]/g, "").toLowerCase();
  }
  function platformFor(raw) {
    const value = heading(raw);
    return Object.keys(SPEC).find((key) =>
      SPEC[key].aliases.some((alias) => value === heading(alias))) || "";
  }
  function fieldFor(platform, raw) {
    const value = heading(raw);
    const spec = SPEC[platform];
    if (!spec) return "";
    return Object.keys(spec.fields).find((key) =>
      spec.fields[key].some((alias) => value === heading(alias))) || "";
  }
  function meaningful(s) {
    const value = tidy(s);
    return value && !["（待填写）", "(待填写)", "待填写", "TODO", "TBD", "—", "-"].includes(value);
  }
  function parse(source) {
    if (typeof source !== "string" || source.length > 350000) throw Error("发布 MD 为空或超过 350KB");
    const platforms = {}, warnings = [], sections = new Set();
    let platform = "", field = "", buffer = [], fenced = false;
    function flush() {
      if (platform && field && meaningful(buffer.join("\n"))) {
        platforms[platform] ||= {};
        if (platforms[platform][field] !== undefined) warnings.push(SPEC[platform].name + "重复字段：" + field + "（以最后一段为准）");
        platforms[platform][field] = tidy(buffer.join("\n")).replace(/^[-*] /, "");
      }
      buffer = [];
    }
    for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
      if (/^\s*([\x60]{3,}|~{3,})/.test(line)) { if (platform && field) buffer.push(line); fenced = !fenced; continue; }
      if (!fenced && /^##\s+/.test(line)) {
        flush(); const name = line.replace(/^##\s+/, "").trim();
        platform = platformFor(name); field = "";
        if (platform) sections.add(platform);
        else if (!/^(说明|备注|人工操作|执行记录|notes|instructions)$/i.test(name)) warnings.push("忽略未识别平台章节：" + name);
        continue;
      }
      if (!fenced && /^###\s+/.test(line)) {
        flush(); const name = line.replace(/^###\s+/, "").trim();
        field = platform ? fieldFor(platform, name) : "";
        if (platform && !field) warnings.push(SPEC[platform].name + "忽略未知字段：" + name);
        continue;
      }
      if (platform && field) buffer.push(line);
    }
    flush();
    const count = Object.values(platforms).reduce((n, fields) => n + Object.keys(fields).length, 0);
    if (!sections.size || !count) throw Error("未识别有效平台字段。请保留 ## B站 / ## YouTube 和 ### 标题等三级标题");
    const identity = {
      projectId: (/^<!-- gucc-project-id: (.*?) -->$/m.exec(source) || [])[1] || "",
      videoId: (/^<!-- gucc-video-id: (.*?) -->$/m.exec(source) || [])[1] || ""
    };
    return { platforms, count, sections: [...sections], warnings, identity };
  }
  function makeTemplate(state) {
    const lines = ["<!-- GUCC-PUBLISH-MD v1: 保留 ## 平台 / ### 字段标题；空字段不会覆盖原稿 -->",
      ...(state?.project?.creatorProjectId ? ["<!-- gucc-project-id: " + tidy(state.project.creatorProjectId) + " -->"] : []),
      ...(state?.project?.videoId ? ["<!-- gucc-video-id: " + tidy(state.project.videoId) + " -->"] : []),
      "# " + tidy(state?.project?.title || "未命名视频") + "｜待审核发布单", "",
      "章节时间须来自真实成片或 SRT；合规和账号选项须在官方发布页核对。", ""];
    for (const [key, spec] of Object.entries(SPEC)) {
      if (state?.enabled?.[key] === false) continue;
      lines.push("## " + spec.name, "");
      for (const [field, labels] of Object.entries(spec.fields)) {
        lines.push("### " + labels[0], tidy(state?.platforms?.[key]?.[field]) || PLACEHOLDER, "");
      }
    }
    lines.push("## 说明", "B站分段章节、弹幕投票和置顶评论可能需要发布后设置；YouTube 有效章节会由本机助手合并到简介。", "");
    return lines.join("\n");
  }
  function parseTimestamp(raw) {
    const a = raw.split(":").map(Number);
    if (a.some((v) => !Number.isInteger(v) || v < 0) || a.length < 2 || a.length > 3) return -1;
    if (a.length === 2 && a[1] >= 60) return -1;
    if (a.length === 3 && (a[1] >= 60 || a[2] >= 60)) return -1;
    return a.reduce((n, v) => n * 60 + v, 0);
  }
  function checkYouTubeChapters(raw) {
    const text = tidy(raw);
    if (!text) return { valid: false, reason: "", text: "" };
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const times = [];
    for (const line of lines) {
      const match = /^(?:-\s*)?((?:\d+:)?\d{1,2}:\d{2})\s+(.+)$/.exec(line);
      if (!match) return { valid: false, reason: "章节需逐行使用 00:00 标题 格式", text };
      times.push(parseTimestamp(match[1]));
    }
    if (times.length < 3 || times[0] !== 0) return { valid: false, reason: "YouTube 章节须至少三段且从 00:00 开始", text };
    if (times.some((t, i) => t < 0 || (i > 0 && t - times[i - 1] < 10))) {
      return { valid: false, reason: "YouTube 章节须递增且相邻起点至少间隔 10 秒", text };
    }
    return { valid: true, reason: "", text: lines.map((s) => s.replace(/^-\s*/, "")).join("\n") };
  }
  function buildYouTubeDescription(description, chapters) {
    const existing = tidy(description);
    const check = checkYouTubeChapters(chapters);
    if (!tidy(chapters)) return { description: existing, warnings: [] };
    if (!check.valid) return { description: existing, warnings: [check.reason + "，请手动检查"] };
    if (existing.includes(check.text)) return { description: existing, warnings: [] };
    if (/^\s*(?:0:00|00:00)\s+\S/m.test(existing)) {
      return { description: existing, warnings: ["简介已有时间戳；为避免重复，未自动追加章节，请手动核对"] };
    }
    return { description: [existing, check.text].filter(Boolean).join("\n\n"), warnings: [] };
  }
  function makeAiPrompt(state, uploadUrls) {
    const chosen = Object.entries(SPEC).filter(([key]) => state?.enabled?.[key] !== false);
    const refs = chosen.map(([key, p]) => "- " + p.name + "：" + (uploadUrls?.[key] || "请核实官方投稿入口")).join("\n");
    return [
      "请作为游戏视频发行编辑，基于以下 GUCC 可编辑发布单，生成【同格式的完整 Markdown 文件】。",
      "先核查各平台当前真实的投稿字段、字数和标签限制、账号权限；优先官方来源。无法确认的控件标记人工检查，不能编造功能或硬限制。",
      "B站、抖音、小红书、视频号用简体中文；YouTube、TikTok 用繁体中文。",
      "基于我提供的锁稿、最终成片和真实 SRT/时间轴编写章节；没有真实时间信息就保留待填写，禁止猜测。",
      "B站原生章节、弹幕投票、置顶评论可能需要发布后处理，分别放到专用字段，不得声称已自动提交。",
      "六平台同一完整视频，但标题、简介、话题和后台标签独立适配，不夸大、不诱导违规互动。",
      "严守 Markdown 结构：## 平台 与 ### 字段标题原样保留；不加未知平台，不用 JSON 或代码围栏包裹全文；不确定就保留（待填写）。",
      "仅输出可直接保存为 .md 后导入 GUCC 的正文；保留已审核字段，除非理由充分。",
      "GUCC 实际自动化源码请先阅读：https://github.com/Inertia77/GUCC/blob/main/apps/publishing-console/platform-rules.js 和 https://github.com/Inertia77/GUCC/blob/main/scripts/publisher-assistant/adapters.cjs。逐字段区分可预填和发布后手动操作，不要把平台页面未实测等同于已支持。",
      "已有官方投稿入口（供核查页面，不代表开放上传 API）：\n" + refs,
      "以下是待加工的 Markdown：\n\n" + makeTemplate(state)
    ].join("\n\n");
  }
  return { SPEC, parse, makeTemplate, makeAiPrompt, checkYouTubeChapters, buildYouTubeDescription };
});
