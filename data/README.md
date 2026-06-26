# Data

数据库结构说明、原始导入 CSV 和 Supabase 导出备份。

| 路径 | 用途 |
|---|---|
| `schema.md` | 当前 Supabase 业务表结构说明 |
| `imports/` | 从旧表格整理出的导入源 CSV |
| `exports from supabase/` | 从 Supabase 导出的表备份 |

## CSV 文件

`imports/` 使用稳定英文文件名：

- `characters.csv`
- `parties.csv`
- `game-versions.csv`
- `wiki-resources.csv`
- `game-status.csv`
- `mechanisms.csv`
- `platforms.csv`

应用运行时不直接读取这些 CSV。前端数据来自 Supabase，导入和修复流程通过 SQL / RPC 维护。
