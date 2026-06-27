# Scripts

仓库脚本区。

| 文件 | 用途 |
|---|---|
| `serve-windows.bat` | Windows 本地静态服务器，默认 `http://localhost:8000` |
| `serve-macos.command` | macOS 本地静态服务器，默认 `http://localhost:8000` |
| `check-project.mjs` | 检查入口链接、JS/TS 语法、工作台版本、SQL 回归和新增资料页 |
| `test-edge-function.ps1` | Edge Function PowerShell 请求示例 |

## 常用命令

```powershell
.\scripts\serve-windows.bat
node scripts/check-project.mjs
```

Command Center 本地测试入口：

```text
http://localhost:8000/apps/command-center/
```

不要用 `127.0.0.1:8000` 测 Command Center 后端，除非 Edge Function 的 `ALLOWED_ORIGINS` 已加入该地址。

## 自检覆盖

`check-project.mjs` 会检查：

- Command Center 前端 ES module 语法和相对 import
- `assets/access-guard.js`
- Portal、三大 app、部署指南、Prompt 页、资料页、剧情阅读页链接
- WorkSpace 版本显示一致性
- Supabase SQL 中已知回归点
