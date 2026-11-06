# GUCC 历史归档（2026-11-06）

这里保存**已脱离当前运行路径，但仍有审计、恢复或研究价值**的原始资料。采取保留 Git blob 的无损移动，不做内容改写、压缩或数据清除。

| 路径 | 内容 | 处理理由 |
|---|---|---|
| `supabase-exports/2026-11-06/` | 历史 Supabase CSV 导出（12 份） | 不被前端读取，旧快照不能代表当前生产数据 |
| `reports/uiux/` | 历史 UIUX / Atelier 验收报告 | 可检索历史审计，不冒充当前验收 |
| `reports/creator-phases/` | 早期 Creator 阶段设计及 Legacy Prompt 审计 | 与当前正式工作区实现分离 |

精确源路径、目标路径、字节数和原始 Git Blob：`ARCHIVE_MANIFEST.json`。

恢复某个文件可以在 GitHub 查看该归档路径，或在本地通过 `git show <commit>:<archive-path>` 导出。迁移历史本身也可以通过 Git 恢复。

**边界：** 保留在仓库的 `archive/` 不是私有加密存储。若仓库公开，则归档文件及 Git 历史仍可公开访问；只是不再随 GitHub Pages 正式站发布。

未被迁走的兼容页面、Creator 测试 Fixture、`assets/creative/` 可编辑素材、`automation/` 本地脚本和生产迁移文件均有明确保留理由，不应仅因没有网页引用就删除。
