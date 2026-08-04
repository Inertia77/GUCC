# GUCC WorkSpace

视频项目工作台，用来整理选题、资料、结构、脚本、封面方向、正式发布、后期扩散和导出归档文件。

## 入口

```text
http://localhost:8000/apps/video-workspace/
```

页面已接入 GUCC Access Key，并使用 `assets/icons/gucc-icon.svg` 作为 favicon。

## 数据保存

- 浏览器草稿：自动保存到当前浏览器的 `localStorage`
- WIP Markdown：便于阅读、复盘和人工编辑
- WIP JSON：最可靠的结构化备份，可重新导入
- DONE Markdown / JSON：项目完成后的归档版本

浏览器草稿只适合防止误关页面，不替代导出文件。清缓存、换浏览器或换设备时，草稿可能读不到。

## AI 工作流

- `AI 驱动创作区` 可以独立于模板使用：在 AI 对话中持续生成或修改策划 HTML、结构、脚本与发布包。
- 普通创作讨论不要求证据编号。只有版本日期、数值、官方原话、版权与争议信息等会影响结论的事实，才放进 `事实核对 / 参考来源`。
- 需要回到模板时，使用“汇总为 Workspace JSON / Markdown”Prompt，再把结果直接粘贴导入；JSON 是最稳的结构化交接格式。
- 正式视频在 B站、抖音、小红书视频、视频号、YouTube 与 TikTok 使用同一个完整内容，只为各平台分别生成标题、简介、话题与标签。

## 推荐流程

1. 从 GUCC Portal 打开工作台。
2. 创建或导入项目。
3. 可以先在 AI 对话与独立 HTML 中完成策划；需要存档或进入模板流程时，再汇总导入 Workspace。
4. 在 06 为同一完整视频生成各平台发布包，并回填发布时间、平台和视频链接。
5. 在 07 用发布链接和图文素材生成后期扩散包，执行图文、社交帖和社区分发。
6. 在 08 汇总主视频与扩散结果后复盘。
7. 阶段性导出 WIP Markdown 和 WIP JSON；完成后导出 DONE Markdown 和 DONE JSON。
8. WIP 放同步盘工作目录，DONE 放归档目录。

## 维护规则

1. 修改工作台结构、字段、导入导出逻辑时改 `index.html`。
2. 修改 AI Prompt 文案时改 `ai-prompts.js`，不要为了迭代 Prompt 去改 `index.html`。
3. 更新 `TEMPLATE_VERSION`、页面显示版本号和 `CHANGELOG.md`。
4. 用旧版 JSON / Markdown 各做一次导入测试。
5. 不要改正式入口路径。
6. 旧 HTML 只放 `legacy/`。
