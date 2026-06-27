# Apps

这里放 GUCC 的浏览器应用。每个应用保持稳定目录入口，方便 GitHub Pages 和本地 `localhost:8000` 同时使用。

| 应用 | 入口 | 用途 |
|---|---|---|
| `command-center/` | `index.html` | Supabase 数据管理前端 |
| `video-workspace/` | `index.html` | 视频项目工作台 |
| `cover-generator/` | `index.html` | 多比例封面生成器 |
| `gameup-command-center/` | `index.html` | 旧入口兼容跳转到 `command-center/` |

本地打开：

```text
http://localhost:8000/apps/<app-name>/
```

## 门禁

主要 HTML 应用都加载 `../../assets/access-guard.js`。直接打开 app URL 时，如果当前浏览器还没通过 Portal Access Key，会先跳回 Portal，输入后再返回目标页面。

## 注意

Command Center 测后端时使用 `localhost:8000`，不要用 `127.0.0.1:8000`，除非 Supabase Edge Function 的 `ALLOWED_ORIGINS` 也加入了 127 地址。
