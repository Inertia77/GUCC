# GUCC WorkSpace

视频项目的本地优先工作台，用来整理选题、资料、结构、脚本、发布和复盘。

## 入口

```text
http://localhost:8000/apps/video-workspace/
```

正式入口始终是 `index.html`。不要把版本号写进入口文件名；升级时更新页面内部版本号和 `CHANGELOG.md`。

## 数据保存方式

- 浏览器草稿：编辑约 0.9 秒后写入当前浏览器的 `localStorage`。
- WIP Markdown：便于阅读和分享，包含隐藏的完整项目数据，可重新导入。
- WIP JSON：最可靠的结构化备份。
- DONE Markdown / JSON：项目结束后长期归档。

浏览器草稿只用于防止意外关闭页面，不能替代导出文件。换浏览器、清理站点数据或换 URL 打开，都可能读不到原草稿。

## 推荐工作流

1. 从 GUCC Portal 或固定 URL 打开工作台。
2. 创建或导入项目。
3. 关键阶段同时导出 WIP Markdown 和 WIP JSON。
4. 项目完成后导出 DONE Markdown 和 DONE JSON。
5. WIP 放同步盘工作目录，DONE 放归档目录。

## 升级规则

1. 修改 `index.html`。
2. 更新 `TEMPLATE_VERSION`、页面标题和可见版本号。
3. 在 `CHANGELOG.md` 记录改动。
4. 用旧版 JSON 和 Markdown 各做一次导入测试。
5. 不修改正式入口路径。

只有出现无法自动迁移的格式变化时，才在 `legacy/` 保留旧 HTML。
