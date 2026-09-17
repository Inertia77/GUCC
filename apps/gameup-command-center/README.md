# Legacy Compatibility Route

**Status: COMPATIBILITY — not an active application.**

`apps/gameup-command-center/` 只保留旧 GitHub Pages / bookmark URL，并通过 `index.html` 跳转到：

```text
../command-center/
```

当前 Command Center 的唯一实现和 source of truth 是：

```text
apps/command-center/
```

## Rules

- 不在这里新增业务逻辑、CSS、数据访问代码或第二份 Command Center assets。
- 保留 `index.html`，除非已经证明旧 public URL 不再需要兼容。
- 修改 redirect 时继续保留 Access Guard 与相对路径可用性。
