# Data

数据库结构说明、原始导入数据和 Supabase 导出备份。

| 路径 | 用途 |
|---|---|
| `schema.md` | 当前 Supabase 业务表结构说明 |
| `imports/` | 从旧表格或研究清单整理出的导入源 CSV / JSON |
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

## 研究来源 JSON

- `imports/gacha-leak-sources-2026-08-07.json`：五款游戏的测试服数据库、数据挖掘站、社区消息流与正式服交叉核验站。`reference/resource-library.html` 会直接读取该文件，并按游戏、可信度、状态和用途呈现。

这类来源会随时间失效。更新时保留 `generated_on`、`reliability`、`status` 和安全提醒，不要把单一社区消息升级成已确认事实。

应用运行时不直接读取这些 CSV。前端数据来自 Supabase，导入和修复流程通过 SQL / RPC 维护。
