# Docs

部署和操作文档区。

| 文件 | 用途 |
|---|---|
| `supabase-setup.html` | Command Center 的 Supabase、GitHub Pages、本地测试部署指南 |

`supabase-setup.html` 已接入 GUCC Access Key，直接打开也会先检查门禁。

## 维护规则

- 文档文件名使用描述性 kebab-case。
- 旧文档由 Git 历史保留，不要复制 `final`、`new`、`copy` 这类版本名。
- 新增 HTML 文档时同步加入 `scripts/check-project.mjs` 的入口检查。
