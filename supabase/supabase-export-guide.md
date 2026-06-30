# Supabase 数据库导出备份指南

> 适用项目：GUCC / GameUp Command Center  
> 目的：把 Supabase 项目中的 `public` schema 数据库表导出为本地备份文件，方便之后恢复、对比、迁移或留档。

---

## 1. 备份思路

Supabase 后台 Table Editor 里可以对单个表导出 CSV 或 SQL，但如果要保存整个数据库，推荐使用本地命令行工具：

- `pg_dump`：导出 SQL 备份，适合完整备份、迁移、恢复。
- `psql + COPY`：导出 CSV，适合给 AI、Excel、人工检查使用。

对于 GUCC 这种数据库项目，最推荐的备份方式是：

```text
导出 public schema 的完整 SQL 文件
= 表结构 + 表数据
```

---

## 2. 需要准备什么

### 2.1 PostgreSQL 客户端工具

本地需要能使用 `pg_dump`。

在 PowerShell 里执行：

```powershell
pg_dump --version
```

如果能看到版本号，说明可以直接导出。

如果提示找不到命令，例如：

```text
pg_dump : The term 'pg_dump' is not recognized
```

说明还没有安装 PostgreSQL 客户端，或者安装了但没有配置环境变量。

---

### 2.2 Supabase 数据库密码

导出时会提示输入密码：

```text
Password:
```

这里输入的是 Supabase 项目的 **Database Password**，不是 Supabase 网页登录密码，也不是 Access Key。

位置大致在：

```text
Supabase Dashboard
→ Project Settings
→ Database
→ Connection string / Database password
```

---

## 3. 在 GUCC 项目内保存备份

假设项目路径是：

```powershell
C:\Users\miket\Git管理下\GUCC
```

先进入项目根目录：

```powershell
cd "C:\Users\miket\Git管理下\GUCC"
```

创建备份目录：

```powershell
New-Item -ItemType Directory -Force .\supabase\backups
```

推荐保存位置：

```text
GUCC/
├─ supabase/
│  ├─ sql/
│  ├─ functions/
│  ├─ config.toml
│  └─ backups/
│     └─ gucc_public_full_YYYYMMDD_HHMMSS.sql
```

---

## 4. 导出完整备份：表结构 + 数据

在 GUCC 项目根目录执行：

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

pg_dump `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -n public `
  --no-owner `
  --no-privileges `
  -f ".\supabase\backups\gucc_public_full_$ts.sql"
```

执行后会提示输入数据库密码。

成功后，会生成类似文件：

```text
supabase/backups/gucc_public_full_20260627_231500.sql
```

这份文件包含：

- `public` schema 下的表结构
- 表数据
- sequence 等相关信息

这是最适合作为“完整存档”的备份方式。

---

## 5. 只导出数据，不导出表结构

如果数据库结构已经确定，只想保存当前数据，可以执行：

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

pg_dump `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -n public `
  --data-only `
  --column-inserts `
  --no-owner `
  --no-privileges `
  -f ".\supabase\backups\gucc_public_data_only_$ts.sql"
```

会生成类似文件：

```text
supabase/backups/gucc_public_data_only_20260627_231500.sql
```

说明：

- `--data-only`：只导出数据，不导出建表语句。
- `--column-inserts`：生成带列名的 `INSERT`，可读性更好，也更适合之后手动检查。

缺点是：如果表结构不存在，单独执行这份文件无法完整恢复数据库。

---

## 6. 导出单个表为 SQL

如果只想导出一个表，例如 `app_users`：

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

pg_dump `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  --table="public.app_users" `
  --data-only `
  --column-inserts `
  -f ".\supabase\backups\app_users_rows_$ts.sql"
```

适合临时保存某一张表。

---

## 7. 导出单个表为 CSV

如果想让 AI、Excel、Google Sheets 读取，CSV 更方便。

例：导出 `app_users` 表：

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -c "COPY (select * from public.app_users order by user_id asc nulls last) TO STDOUT WITH CSV HEADER DELIMITER ',';" `
  > ".\supabase\backups\app_users_rows_$ts.csv"
```

说明：

- `COPY (...) TO STDOUT WITH CSV HEADER`：把查询结果导出为带表头的 CSV。
- `order by user_id asc nulls last`：按 user_id 排序，空值放最后。
- 如果其他表没有 `user_id` 字段，需要改成对应表的排序字段，或者去掉 `order by`。

---

## 8. 常用表单独导出 CSV 示例

### 8.1 characters

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -c "COPY (select * from public.characters order by character_id asc nulls last) TO STDOUT WITH CSV HEADER DELIMITER ',';" `
  > ".\supabase\backups\characters_rows_$ts.csv"
```

### 8.2 character_names

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -c "COPY (select * from public.character_names order by character_id asc nulls last) TO STDOUT WITH CSV HEADER DELIMITER ',';" `
  > ".\supabase\backups\character_names_rows_$ts.csv"
```

### 8.3 resources

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -c "COPY (select * from public.resources order by resource_id asc nulls last) TO STDOUT WITH CSV HEADER DELIMITER ',';" `
  > ".\supabase\backups\resources_rows_$ts.csv"
```

### 8.4 resource_relations

```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -c "COPY (select * from public.resource_relations order by relation_id asc nulls last) TO STDOUT WITH CSV HEADER DELIMITER ',';" `
  > ".\supabase\backups\resource_relations_rows_$ts.csv"
```

---

## 9. 检查备份文件是否生成

执行：

```powershell
Get-ChildItem .\supabase\backups
```

或者：

```powershell
ls .\supabase\backups
```

能看到 `.sql` 或 `.csv` 文件就说明导出成功。

---

## 10. 恢复备份的基本方式

如果之后要把完整 SQL 备份恢复到数据库，可以使用：

```powershell
psql `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -f ".\supabase\backups\gucc_public_full_YYYYMMDD_HHMMSS.sql"
```

注意：

- 恢复前最好先确认目标数据库是否已有同名表。
- 如果是恢复到全新数据库，完整备份最方便。
- 如果是恢复到已有数据库，可能会出现重复主键、重复表、重复约束等错误，需要先清理或改写 SQL。

---

## 11. 推荐日常操作流程

日常最省事流程：

```powershell
cd "C:\Users\miket\Git管理下\GUCC"

New-Item -ItemType Directory -Force .\supabase\backups

$ts = Get-Date -Format "yyyyMMdd_HHmmss"

pg_dump `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -n public `
  --no-owner `
  --no-privileges `
  -f ".\supabase\backups\gucc_public_full_$ts.sql"
```

一句话总结：

```text
平时备份用 pg_dump 导出完整 SQL。
临时给 AI 或 Excel 检查数据时，再单独导出 CSV。
```

---

## 12. 常见问题

### Q1. 为什么 Supabase 页面给的是单表导出命令？

因为 Table Editor 当前选中的就是某一张表，例如 `app_users`。  
所以它生成的是只导出当前表的命令。

如果要导出整个 `public` schema，不要使用：

```powershell
--table="public.app_users"
```

而是使用：

```powershell
-n public
```

---

### Q2. `-n public` 是什么意思？

`-n public` 表示只导出 `public` schema。

GUCC 自己建的业务表基本都在 `public` 下，所以用它最合适。

---

### Q3. `--no-owner --no-privileges` 是什么意思？

这两个参数可以让导出的 SQL 更适合迁移和恢复：

```powershell
--no-owner
```

不导出对象所有者信息。

```powershell
--no-privileges
```

不导出权限授权信息。

这样之后恢复到另一个 Supabase 项目时，不容易因为角色或权限不存在而报错。

---

### Q4. SQL 和 CSV 应该选哪个？

| 目标 | 推荐格式 |
|---|---|
| 完整备份 | SQL |
| 迁移数据库 | SQL |
| 恢复数据库 | SQL |
| 给 AI 检查表数据 | CSV |
| 给 Excel / Google Sheets 看 | CSV |
| 人工编辑几行数据 | CSV |

---

### Q5. 备份文件可以提交到 Git 吗？

技术上可以。

不过 SQL / CSV 里会包含数据库里的实际内容，例如邮箱、用户 ID、角色资料、资源链接等。  
如果仓库是公开的，提交前最好确认自己能接受这些内容被公开。

如果只是个人项目、自己愿意公开或不介意，那就按自己的项目管理方式来。

---

## 13. 一键备份脚本草案

之后可以把下面内容保存成：

```text
scripts/backup-supabase-public.ps1
```

内容：

```powershell
$ErrorActionPreference = "Stop"

Set-Location "C:\Users\miket\Git管理下\GUCC"

New-Item -ItemType Directory -Force .\supabase\backups | Out-Null

$ts = Get-Date -Format "yyyyMMdd_HHmmss"

$out = ".\supabase\backups\gucc_public_full_$ts.sql"

pg_dump `
  -h db.rubjeqnuxuvupjwyksmo.supabase.co `
  -p 5432 `
  -d postgres `
  -U postgres `
  -n public `
  --no-owner `
  --no-privileges `
  -f $out

Write-Host "Backup saved to: $out"
```

执行方式：

```powershell
.\scripts\backup-supabase-public.ps1
```

这样以后就不用每次手敲一长串命令了。
