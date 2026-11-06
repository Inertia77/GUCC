# Data

数据库结构说明、原始导入数据和 Supabase 导出备份。

| 路径 | 用途 |
|---|---|
| `schema.md` | 当前 Supabase 业务表结构说明 |
| `imports/` | 从旧表格或研究清单整理出的导入源 CSV / JSON |
| `../archive/supabase-exports/2026-11-06/` | 历史 Supabase 导出 CSV（2026-11-06 归档，非导出日期） |

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


历史导出 CSV 均非当前运行时数据源，已于 2026-11-06 移入仓库根目录 `archive/supabase-exports/2026-11-06/`。文件字节与 Git blob 不变；当前数据库应以生产 Supabase 实际数据为准，旧导出不代表最新状态。
