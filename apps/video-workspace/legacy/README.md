# Legacy WorkSpace Templates

旧版工作台兼容区。

日常入口是上一级的：

```text
apps/video-workspace/index.html
```

当前保留的旧文件只用于排查 3.x 项目的导入兼容问题。

## 使用规则

- 不继续修改旧 HTML。
- 优先把旧项目导出为 JSON，再导入当前工作台。
- 只有新版导入出现实际兼容问题时，才打开 `project-forge-v3.8.9.html`。
- 3.8.8 及更早版本由 Git 历史保存，不再重复占用当前目录。
