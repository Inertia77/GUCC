(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccPublishingRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PLATFORMS = {
    bilibili: {
      label: "B站",
      code: "BI",
      accent: "#62d8ff",
      uploadUrl: "https://member.bilibili.com/platform/upload/video/frame/",
      analyticsUrl: "https://member.bilibili.com/platform/data-up/video/",
      fields: [
        { key: "title", label: "标题", type: "text", required: true, hardMax: 80, safeMax: 48 },
        { key: "description", label: "简介", type: "textarea", required: true, hardMax: 250, safeMax: 220 },
        { key: "tags", label: "普通标签", type: "tags", required: true, safeItems: 5 },
        { key: "category", label: "分区", type: "text", required: true, placeholder: "例：游戏 / 手机游戏" },
        { key: "copyright", label: "版权类型", type: "select", required: true, options: ["原创", "转载"] },
        { key: "pinnedComment", label: "置顶评论", type: "textarea" }
      ]
    },
    douyin: {
      label: "抖音",
      code: "DY",
      accent: "#ff4f88",
      uploadUrl: "https://creator.douyin.com/creator-micro/content/upload",
      analyticsUrl: "https://creator.douyin.com/creator-micro/data-center/operation",
      fields: [
        { key: "caption", label: "发布文案（含 #话题）", type: "textarea", required: true, safeMax: 160 },
        { key: "location", label: "位置 / POI", type: "text", placeholder: "没有就留空" },
        { key: "disclosure", label: "内容披露", type: "select", required: true, options: ["无特殊披露", "包含 AI 生成内容", "商业合作", "其他：发布页人工确认"] },
        { key: "pinnedComment", label: "置顶评论", type: "textarea" }
      ]
    },
    xiaohongshu: {
      label: "小红书视频",
      code: "RED",
      accent: "#ff6b72",
      uploadUrl: "https://creator.xiaohongshu.com/publish/publish?from=menu&target=video",
      analyticsUrl: "https://creator.xiaohongshu.com/statistics/account/v2",
      fields: [
        { key: "title", label: "标题", type: "text", required: true, safeMax: 20 },
        { key: "body", label: "正文", type: "textarea", required: true, safeMax: 260 },
        { key: "topics", label: "话题", type: "tags", required: true, safeItems: 5 },
        { key: "pinnedComment", label: "置顶评论", type: "textarea" }
      ]
    },
    wechat: {
      label: "微信视频号",
      code: "WX",
      accent: "#4dd58b",
      uploadUrl: "https://channels.weixin.qq.com/platform/post/create",
      analyticsUrl: "https://channels.weixin.qq.com/platform/statistic/post",
      fields: [
        { key: "description", label: "完整描述（第一行即首句）", type: "textarea", required: true, safeMax: 120 },
        { key: "topics", label: "话题", type: "tags", required: true, safeItems: 4 },
        { key: "collection", label: "合集", type: "text", placeholder: "没有就留空" },
        { key: "pinnedComment", label: "置顶评论", type: "textarea" }
      ]
    },
    youtube: {
      label: "YouTube",
      code: "YT",
      accent: "#ff5353",
      uploadUrl: "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/videos/upload?d=ud&filter=%5B%5D&sort=%7B%22columnType%22%3A%22date%22%2C%22sortOrder%22%3A%22DESCENDING%22%7D",
      analyticsUrl: "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/analytics/tab-overview/period-default",
      fields: [
        { key: "title", label: "标题", type: "text", required: true, hardMax: 100, safeMax: 65 },
        { key: "description", label: "简介", type: "textarea", required: true, hardMax: 5000, safeMax: 500 },
        { key: "hashtags", label: "Hashtags", type: "tags", required: true, hardItems: 3 },
        { key: "backendTags", label: "后台 Tags", type: "tags", safeItems: 8 },
        { key: "playlist", label: "播放列表", type: "text" },
        { key: "visibility", label: "可见性", type: "select", required: true, options: ["私享", "不公开列出", "公开", "定时发布"] },
        { key: "madeForKids", label: "儿童内容设置", type: "select", required: true, options: ["否，不是面向儿童的内容", "是，面向儿童的内容", "发布页人工确认"] },
        { key: "language", label: "视频语言", type: "text", required: true, placeholder: "例：简体中文" }
      ]
    },
    tiktok: {
      label: "TikTok",
      code: "TT",
      accent: "#7ef7e7",
      uploadUrl: "https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=video",
      analyticsUrl: "https://www.tiktok.com/tiktokstudio/analytics",
      fields: [
        { key: "caption", label: "Caption（含 hashtags）", type: "textarea", required: true, safeMax: 300 },
        { key: "visibility", label: "可见性", type: "select", required: true, options: ["Only you / 仅自己", "Friends / 好友", "Everyone / 所有人", "发布页人工确认"] },
        { key: "interaction", label: "互动权限", type: "select", required: true, options: ["允许评论、Duet、Stitch", "仅允许评论", "全部关闭", "发布页人工确认"] },
        { key: "disclosure", label: "内容披露", type: "select", required: true, options: ["无特殊披露", "包含 AI 生成内容", "商业合作", "其他：发布页人工确认"] },
        { key: "pinnedComment", label: "置顶评论", type: "textarea" }
      ]
    }
  };

  const PLATFORM_ALIASES = {
    bilibili: ["B站", "Bilibili"],
    douyin: ["抖音", "Douyin"],
    xiaohongshu: ["小红书视频", "小红书"],
    wechat: ["微信视频号", "视频号"],
    youtube: ["YouTube 简体中文", "YouTube 简中", "YouTube"],
    tiktok: ["TikTok 简体中文", "TikTok 简中", "TikTok"]
  };

  const PACKAGE_MAP = {
    bilibili: { title: "最终标题", description: "最终简介", tags: "普通标签", pinnedComment: "置顶评论" },
    douyin: { caption: "最终发布文案", pinnedComment: "置顶评论" },
    xiaohongshu: { title: "最终标题", body: "最终正文", topics: "话题", pinnedComment: "置顶评论" },
    wechat: { description: "最终完整描述", topics: "话题", pinnedComment: "置顶评论" },
    youtube: { title: "最终标题", description: "最终简介", hashtags: "Hashtags", backendTags: "后台 Tags" },
    tiktok: { caption: "最终 Caption", pinnedComment: "置顶评论" }
  };

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\r\n?/g, "\n").trim();
  }

  function tagItems(value) {
    return normalizeText(value)
      .split(/[\n,，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function findPlatformBlock(text, aliases) {
    const source = normalizeText(text);
    let best = null;
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(source);
      if (match && (!best || match.index < best.index)) best = match;
    }
    if (!best) return "";
    const start = best.index + best[0].length;
    const rest = source.slice(start);
    const end = /^##\s+/m.exec(rest);
    return normalizeText(end ? rest.slice(0, end.index) : rest);
  }

  function findSubsection(block, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const heading = new RegExp(`^###\\s+${escaped}[^\\n]*$`, "im").exec(block);
    if (!heading) return "";
    const rest = block.slice(heading.index + heading[0].length);
    const end = /^###\s+|^##\s+/m.exec(rest);
    return normalizeText(end ? rest.slice(0, end.index) : rest)
      .replace(/^[-*]\s+/, "")
      .replace(/[（(]\s*\d+\s*(?:字|字符|characters?)\s*[）)]\s*$/i, "")
      .trim();
  }

  function parseWorkspacePackage(text) {
    const output = {};
    for (const [platformKey, aliases] of Object.entries(PLATFORM_ALIASES)) {
      const block = findPlatformBlock(text, aliases);
      if (!block) continue;
      output[platformKey] = {};
      for (const [fieldKey, heading] of Object.entries(PACKAGE_MAP[platformKey])) {
        output[platformKey][fieldKey] = findSubsection(block, heading);
      }
    }
    return output;
  }

  function validateField(value, rule) {
    const text = normalizeText(value);
    const errors = [];
    const warnings = [];
    if (rule.required && !text) errors.push(`${rule.label}未填写`);
    if (!text) return { errors, warnings };

    if (rule.hardMax && [...text].length > rule.hardMax) {
      errors.push(`${rule.label}为 ${[...text].length} 字符，超过硬上限 ${rule.hardMax}`);
    } else if (rule.safeMax && [...text].length > rule.safeMax) {
      warnings.push(`${rule.label}为 ${[...text].length} 字符，超过本地保守线 ${rule.safeMax}；以发布页计数器为准`);
    }

    if (rule.type === "tags") {
      const count = tagItems(text).length;
      if (rule.hardItems && count > rule.hardItems) errors.push(`${rule.label}有 ${count} 个，超过限定数量 ${rule.hardItems}`);
      else if (rule.safeItems && count > rule.safeItems) warnings.push(`${rule.label}有 ${count} 个，超过建议数量 ${rule.safeItems}`);
    }
    return { errors, warnings };
  }

  function scanCopyRisk(text) {
    const value = normalizeText(text);
    const warnings = [];
    const absoluteWords = ["绝对", "100%", "全网第一", "必看", "必抽", "血亏", "无脑", "封神"];
    const engagementWords = ["扣1", "扣数字", "互关", "互赞", "转发抽奖", "私信领取", "加群", "网盘口令", "主页见"];
    const hitAbsolute = absoluteWords.filter((word) => value.includes(word));
    const hitEngagement = engagementWords.filter((word) => value.includes(word));
    if (hitAbsolute.length) warnings.push(`发现可能需要核对兑现的绝对化表达：${hitAbsolute.join("、")}`);
    if (hitEngagement.length) warnings.push(`发现可能有诱导互动或站外导流风险的表达：${hitEngagement.join("、")}`);
    return warnings;
  }

  return {
    PLATFORMS,
    PLATFORM_ALIASES,
    normalizeText,
    tagItems,
    parseWorkspacePackage,
    validateField,
    scanCopyRisk
  };
});
