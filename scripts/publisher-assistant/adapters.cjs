"use strict";

const PLATFORM_FIELDS = {
  bilibili: {
    title: ["标题", "稿件标题", "title"],
    description: ["简介", "视频简介", "description"],
    tags: ["标签", "稿件标签", "tag"],
    category: ["分区", "投稿分区", "category"]
  },
  douyin: {
    caption: ["作品描述", "发布文案", "描述", "caption"],
    location: ["位置", "添加位置", "location"]
  },
  xiaohongshu: {
    title: ["标题", "填写标题", "title"],
    body: ["正文", "填写正文", "描述", "description"],
    topics: ["话题", "添加话题", "topic"]
  },
  wechat: {
    description: ["描述", "视频描述", "写个描述", "description"],
    topics: ["话题", "添加话题", "topic"]
  },
  youtube: {
    title: ["标题", "Title"],
    description: ["说明", "简介", "Description"],
    hashtags: ["Hashtags"],
    backendTags: ["标签", "Tags"],
    playlist: ["播放列表", "Playlist"],
    language: ["视频语言", "Language"]
  },
  tiktok: {
    caption: ["Caption", "描述", "说明", "description"]
  }
};

const TEXT_SELECTOR = 'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea, [contenteditable="true"]';
const PROTECTED_ACTION = /(?:立即)?发布|提交|保存并发布|\bpost\b|\bpublish\b|\bschedule\b/i;

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function tagItems(value) {
  return clean(value).split(/[\n,，、]+/).map((item) => item.trim()).filter(Boolean);
}

async function visible(locator) {
  try { return await locator.isVisible({ timeout: 800 }); }
  catch { return false; }
}

async function editable(locator) {
  try { return await locator.isEditable({ timeout: 800 }); }
  catch { return false; }
}

async function locateByHint(page, hints, selector = TEXT_SELECTOR) {
  for (const hint of hints) {
    const pattern = new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const candidates = [page.getByLabel(pattern), page.getByPlaceholder(pattern)];
    for (const candidate of candidates) {
      const count = Math.min(await candidate.count().catch(() => 0), 4);
      for (let index = 0; index < count; index += 1) {
        const item = candidate.nth(index);
        if (await visible(item) && await editable(item)) return item;
      }
    }
  }

  const candidates = page.locator(selector);
  const scores = await candidates.evaluateAll((elements, rawHints) => elements.map((element, index) => {
    const parentText = (element.closest("label")?.innerText || element.parentElement?.innerText || "").slice(0, 180);
    const context = [
      element.getAttribute("aria-label"), element.getAttribute("placeholder"), element.getAttribute("name"),
      element.getAttribute("id"), element.getAttribute("data-placeholder"), parentText
    ].filter(Boolean).join(" ").toLowerCase();
    let score = 0;
    for (const hint of rawHints) if (context.includes(String(hint).toLowerCase())) score += String(hint).length + 4;
    if (element.tagName === "TEXTAREA") score += 1;
    return { index, score };
  }), hints).catch(() => []);
  scores.sort((a, b) => b.score - a.score);
  for (const match of scores) {
    if (match.score <= 0) break;
    const item = candidates.nth(match.index);
    if (await visible(item) && await editable(item)) return item;
  }
  return null;
}

async function fillSmart(page, value, hints) {
  const text = clean(value);
  if (!text) return false;
  const locator = await locateByHint(page, hints);
  if (!locator) return false;
  try {
    await locator.fill(text, { timeout: 5000 });
    return true;
  } catch {
    try {
      await locator.click({ timeout: 2000 });
      await page.keyboard.press("Control+A");
      await page.keyboard.insertText(text);
      return true;
    } catch { return false; }
  }
}

async function fillTags(page, value, hints) {
  const items = tagItems(value);
  if (!items.length) return false;
  const locator = await locateByHint(page, hints, 'input:not([type="file"]), textarea, [contenteditable="true"]');
  if (!locator) return false;
  try {
    await locator.click();
    for (const item of items) {
      await locator.fill(item);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
    }
    return true;
  } catch {
    try { await locator.fill(items.join(", ")); return true; }
    catch { return false; }
  }
}

async function clickSafeText(page, value) {
  const text = clean(value);
  if (!text || PROTECTED_ACTION.test(text)) return false;
  const pattern = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const candidates = [page.getByRole("radio", { name: pattern }), page.getByRole("option", { name: pattern }), page.getByText(pattern, { exact: false })];
  for (const candidate of candidates) {
    const count = Math.min(await candidate.count().catch(() => 0), 3);
    for (let index = 0; index < count; index += 1) {
      const item = candidate.nth(index);
      if (!await visible(item)) continue;
      try { await item.click({ timeout: 2500 }); return true; }
      catch { /* try next */ }
    }
  }
  return false;
}

async function tryFileInput(page, filePath, kind) {
  const inputs = page.locator('input[type="file"]');
  const count = await inputs.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    const accept = String(await input.getAttribute("accept").catch(() => "") || "").toLowerCase();
    const looksImage = /image|\.png|\.jpe?g|\.webp/.test(accept);
    const looksVideo = /video|\.mp4|\.mov|\.webm|\.mkv/.test(accept);
    if (kind === "video" && looksImage) continue;
    if (kind === "image" && looksVideo && !looksImage) continue;
    if (kind === "image" && !looksImage && !accept) continue;
    try { await input.setInputFiles(filePath, { timeout: 8000 }); return true; }
    catch { /* try next */ }
  }
  return false;
}

async function tryFileChooser(page, filePath, names) {
  for (const name of names) {
    if (PROTECTED_ACTION.test(name)) continue;
    const button = page.getByRole("button", { name: new RegExp(name, "i") }).first();
    if (!await visible(button)) continue;
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 3500 }),
        button.click({ timeout: 2500 })
      ]);
      await chooser.setFiles(filePath);
      return true;
    } catch { /* try next */ }
  }
  return false;
}

async function uploadVideo(page, videoPath) {
  if (await tryFileInput(page, videoPath, "video")) return true;
  return tryFileChooser(page, videoPath, ["选择视频", "上传视频", "Select file", "Select video", "Upload video"]);
}

async function uploadCover(page, coverPath) {
  if (!coverPath) return false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await tryFileInput(page, coverPath, "image")) return true;
    if (await tryFileChooser(page, coverPath, ["上传封面", "更换封面", "自定义缩略图", "Upload thumbnail", "Edit cover"])) return true;
    await page.waitForTimeout(1800);
  }
  return false;
}

async function fillYouTube(page, data, result) {
  const textboxes = page.locator('#textbox[contenteditable="true"]');
  await textboxes.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  if (await textboxes.count() >= 2) {
    if (clean(data.title)) { await textboxes.nth(0).fill(clean(data.title)); result.filled.push("标题"); }
    if (clean(data.description)) { await textboxes.nth(1).fill(clean(data.description)); result.filled.push("简介"); }
  } else {
    if (await fillSmart(page, data.title, PLATFORM_FIELDS.youtube.title)) result.filled.push("标题"); else result.warnings.push("未定位到 YouTube 标题字段");
    if (await fillSmart(page, data.description, PLATFORM_FIELDS.youtube.description)) result.filled.push("简介"); else result.warnings.push("未定位到 YouTube 简介字段");
  }

  if (/否|not made for kids/i.test(clean(data.madeForKids))) {
    if (await clickSafeText(page, "否，不是面向儿童的内容") || await clickSafeText(page, "No, it's not made for kids")) result.filled.push("儿童内容设置");
    else result.warnings.push("儿童内容设置需要最终检查");
  } else if (/^是|made for kids/i.test(clean(data.madeForKids))) {
    if (await clickSafeText(page, "是，面向儿童的内容") || await clickSafeText(page, "Yes, it's made for kids")) result.filled.push("儿童内容设置");
  }

  const showMore = page.getByRole("button", { name: /显示更多|Show more/i }).first();
  if (await visible(showMore)) await showMore.click().catch(() => {});
  if (await fillTags(page, data.backendTags, PLATFORM_FIELDS.youtube.backendTags)) result.filled.push("后台 Tags");
  else if (clean(data.backendTags)) result.warnings.push("后台 Tags 未自动填入，请最终检查");
}

async function fillGeneric(page, key, data, result) {
  const definitions = PLATFORM_FIELDS[key] || {};
  for (const [fieldKey, hints] of Object.entries(definitions)) {
    const value = data[fieldKey];
    if (!clean(value)) continue;
    const isTags = /tags|topics|hashtags/i.test(fieldKey);
    const filled = isTags ? await fillTags(page, value, hints) : await fillSmart(page, value, hints);
    if (filled) result.filled.push(fieldKey);
    else result.warnings.push(`未自动定位字段：${fieldKey}`);
  }
}

async function applyChoices(page, key, data, result) {
  const choices = [];
  if (key === "bilibili") choices.push(["版权类型", data.copyright]);
  if (key === "douyin") choices.push(["内容披露", data.disclosure]);
  if (key === "youtube") choices.push(["可见性", data.visibility]);
  if (key === "tiktok") choices.push(["可见性", data.visibility], ["互动权限", data.interaction], ["内容披露", data.disclosure]);
  for (const [label, value] of choices) {
    if (!clean(value) || /人工确认|无特殊披露/i.test(value)) continue;
    if (await clickSafeText(page, value)) result.filled.push(label);
    else result.warnings.push(`${label}需要最终检查`);
  }
}

async function preparePlatform({ page, key, uploadUrl, data, videoPath, coverPath }) {
  const result = { prepared: false, needsLogin: false, filled: [], warnings: [] };
  await page.goto(uploadUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((error) => result.warnings.push(`打开页面超时：${error.message}`));
  await page.waitForTimeout(1600);

  const uploaded = await uploadVideo(page, videoPath);
  if (!uploaded) {
    const url = page.url();
    const body = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
    result.needsLogin = /login|passport|signin|登录|扫码登录/i.test(`${url}\n${body.slice(0, 1500)}`);
    result.warnings.push(result.needsLogin ? "当前平台需要先登录，登录后重新执行即可" : "未找到视频上传入口；平台页面结构可能已变化");
    await page.bringToFront();
    return result;
  }
  result.filled.push("完整成片");
  await page.waitForTimeout(2200);

  if (key === "youtube") await fillYouTube(page, data, result);
  else await fillGeneric(page, key, data, result);

  if (coverPath) {
    const coverUploaded = await uploadCover(page, coverPath);
    if (coverUploaded) result.filled.push("封面");
    else result.warnings.push("封面入口尚未出现或需要视频处理完成，请最终检查");
  }
  await applyChoices(page, key, data, result);
  result.prepared = true;
  await page.bringToFront();
  return result;
}

module.exports = { preparePlatform, PLATFORM_FIELDS };
