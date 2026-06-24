# Data

- `schema.md`：当前 Supabase 业务表结构。
- `imports/`：从旧表格导出的原始 CSV，作为导入源和备份。

CSV 使用稳定的英文文件名：

- `characters.csv`
- `parties.csv`
- `game-versions.csv`
- `wiki-resources.csv`
- `game-status.csv`
- `mechanisms.csv`
- `platforms.csv`

应用运行时不直接读取这些 CSV。
