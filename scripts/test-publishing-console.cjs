const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const {
  PLATFORMS,
  parseWorkspacePackage,
  validateField,
  scanCopyRisk
} = require('../apps/publishing-console/platform-rules.js');

const samplePackage = `
# 可粘贴到【06 发布包：简中】的内容

## B站
### 最终标题（可直接复制）
测试 B 站标题（8 字符）
### 最终简介（可直接复制）
这是 B 站简介。
### 普通标签
鸣潮，攻略，角色
### 置顶评论
你最关心哪一部分？

## 抖音
### 最终发布文案（可直接复制，已含 #话题）
一分钟说清这个机制 #鸣潮 #攻略
### 置顶评论
你在实战中遇到过吗？

## 小红书视频
### 最终标题（可直接复制，保守目标 20 字内）
这个机制终于讲清了
### 最终正文（可直接复制）
这次把容易误解的地方集中讲清。
### 话题
#鸣潮，#游戏攻略

## 微信视频号
### 最终完整描述（可直接复制，第一行即首句）
这个机制终于讲清了
正文第二行。
### 话题
#鸣潮，#攻略

## YouTube 简体中文
### 最终标题（可直接复制）
这个机制为什么总被误解？
### 最终简介（可直接复制）
本期从实战和规则两方面解释。
### Hashtags
#鸣潮, #攻略, #游戏
### 后台 Tags
鸣潮, Wuthering Waves, 攻略

## TikTok 简体中文
### 最终 Caption（可直接复制，已含 hashtags）
把这个机制讲清楚。#鸣潮 #攻略
### 置顶评论
你还想看哪个机制？
`;

const parsed = parseWorkspacePackage(samplePackage);
assert.equal(Object.keys(parsed).length, 6, '应识别六个平台');
assert.equal(parsed.bilibili.title, '测试 B 站标题', '应移除末尾字符计数');
assert.equal(parsed.douyin.caption, '一分钟说清这个机制 #鸣潮 #攻略');
assert.equal(parsed.xiaohongshu.body, '这次把容易误解的地方集中讲清。');
assert.match(parsed.wechat.description, /正文第二行/);
assert.equal(parsed.youtube.hashtags, '#鸣潮, #攻略, #游戏');
assert.match(parsed.tiktok.caption, /把这个机制讲清楚/);

const youtubeTitleRule = PLATFORMS.youtube.fields.find((field) => field.key === 'title');
assert.equal(validateField('a'.repeat(101), youtubeTitleRule).errors.length, 1, 'YouTube 标题超过硬上限应报错');
assert.equal(validateField('a'.repeat(70), youtubeTitleRule).warnings.length, 1, '超过保守线但未超过硬上限应提醒');
assert.equal(scanCopyRisk('这是全网第一，转发抽奖')[0].includes('全网第一'), true, '应提示绝对化表达');
assert.equal(scanCopyRisk('这是全网第一，转发抽奖').length, 2, '应分别提示绝对化和诱导互动风险');

const html = readFileSync(resolve(__dirname, '../apps/publishing-console/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, '发布控制台不应包含重复 HTML id');
for (const requiredAsset of ['./styles.css?v=1', './platform-rules.js?v=1', './app.js?v=1']) {
  assert.equal(html.includes(requiredAsset), true, `发布控制台应加载 ${requiredAsset}`);
}
for (const requiredId of ['assistantState', 'pickVideoPathButton', 'openLoginButton', 'oneClickPrepareButton', 'automationJob']) {
  assert.equal(html.includes(`id="${requiredId}"`), true, `发布控制台应包含 #${requiredId}`);
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
assert.equal(packageJson.devDependencies['playwright-core'], '1.62.1', '本机助手应锁定 Playwright Core 版本');
assert.equal(packageJson.scripts['publisher:assistant'], 'node scripts/publisher-assistant/server.cjs');

const assistantServer = readFileSync(resolve(__dirname, 'publisher-assistant/server.cjs'), 'utf8');
const assistantAdapters = readFileSync(resolve(__dirname, 'publisher-assistant/adapters.cjs'), 'utf8');
assert.equal(assistantServer.includes('const HOST = "127.0.0.1"'), true, '本机助手必须只监听 loopback');
assert.equal(assistantServer.includes('ready_for_review'), true, '本机助手应停在最终检查阶段');
assert.equal(assistantAdapters.includes('PROTECTED_ACTION'), true, '适配器必须保护最终发布动作');

console.log('发布控制台测试通过：发布包解析、字段限制、本机助手安全边界与一键准备入口正常。');
