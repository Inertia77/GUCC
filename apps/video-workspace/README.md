# GUCC WorkSpace

视频项目工作台，用来整理选题、资料、结构、脚本、封面方向和导出归档文件。

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

- 先把官方、社区、实测材料整理到 `证据池 / Evidence Locker`，推荐用 `O1/C1/T1` 这类编号。
- 后续 AI Prompt 会要求结构、脚本和发布标题绑定证据编号；没有证据的内容应标 `待核实` 或 `个人判断`。
- 如果生成内容变空，优先补证据池和素材线索，而不是直接让 AI “再详细一点”。

## 推荐流程

1. 从 GUCC Portal 打开工作台。
2. 创建或导入项目。
3. 阶段性导出 WIP Markdown 和 WIP JSON。
4. 项目完成后导出 DONE Markdown 和 DONE JSON。
5. WIP 放同步盘工作目录，DONE 放归档目录。

## 维护规则

1. 修改工作台结构、字段、导入导出逻辑时改 `index.html`。
2. 修改 AI Prompt 文案时改 `ai-prompts.js`，不要为了迭代 Prompt 去改 `index.html`。
3. 更新 `TEMPLATE_VERSION`、页面显示版本号和 `CHANGELOG.md`。
4. 用旧版 JSON / Markdown 各做一次导入测试。
5. 不要改正式入口路径。
6. 旧 HTML 只放 `legacy/`。
