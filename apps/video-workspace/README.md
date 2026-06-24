# GUCC WorkSpace

GUCC WorkSpace 是视频项目的本地优先模板工作台。正式入口始终是：

```text
apps/video-workspace/index.html
```

不要再把版本号写进正式入口文件名。以后从 v4.0.3 升级到 v4.0.4 时，直接更新 `index.html` 内的模板版本，并在 `CHANGELOG.md` 记录改动。Git 本身负责保存每一版源码历史。

## 数据保存方式

- 浏览器草稿：编辑约 0.9 秒后自动写入当前浏览器的 `localStorage`。
- WIP Markdown：便于阅读、分享，也包含隐藏的完整项目数据，可重新导入。
- WIP JSON：推荐作为最可靠的结构化备份。
- DONE Markdown / JSON：项目结束时存入长期归档目录。

浏览器草稿只用于防止意外关闭页面，不能替代导出文件。换浏览器、清理网站数据或直接用不同的本地文件路径打开，都可能无法读取原草稿。

## 推荐工作流

1. 从 GUCC Portal 或固定 URL 打开工作台。
2. 创建或导入项目，编辑过程由浏览器自动保存。
3. 每个关键阶段同时导出 WIP Markdown 和 WIP JSON。
4. 项目完成后导出 DONE Markdown 和 DONE JSON。
5. 将 WIP 放入同步盘的 `01_Working/`，DONE 放入 `99_Archive/`。

## 版本升级

升级模板时：

1. 修改 `index.html`。
2. 更新页面中的 `TEMPLATE_VERSION`、标题和可见版本号。
3. 在 `CHANGELOG.md` 增加一条记录。
4. 用旧版 JSON 和 Markdown 各做一次导入测试。
5. 不要修改正式入口路径。

只有发生无法自动迁移的格式变化时，才需要在 `legacy/` 保留一份旧 HTML。

## 旧版本

3.8.x 文件位于 `legacy/`，只用于排查旧项目兼容问题，不作为日常入口。
