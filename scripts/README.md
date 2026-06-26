# Scripts

仓库级脚本区。

| 文件 | 用途 |
|---|---|
| `serve-windows.bat` | Windows 本地静态服务器，默认 `http://localhost:8000` |
| `serve-macos.command` | macOS 本地静态服务器，默认 `http://localhost:8000` |
| `check-project.mjs` | 检查入口链接、JS/TS 语法、目录约定和 SQL 回归 |
| `test-edge-function.ps1` | Edge Function PowerShell 请求示例 |

## 常用命令

启动本地站点：

```powershell
.\scripts\serve-windows.bat
```

项目检查：

```powershell
node scripts/check-project.mjs
```

Command Center 本地测试请用：

```text
http://localhost:8000/apps/command-center/
```

不要用 `127.0.0.1:8000` 测后端连接，除非 Supabase Edge Function 的 `ALLOWED_ORIGINS` 已加入它。
