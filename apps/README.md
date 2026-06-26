# Apps

这里放 GUCC 的浏览器应用。每个应用都有稳定目录入口，不把版本号写进公开路径。

| 应用 | 入口 | 定位 |
|---|---|---|
| `command-center/` | `index.html` | Supabase 数据管理前端 |
| `video-workspace/` | `index.html` | 视频项目本地优先工作台 |
| `cover-generator/` | `index.html` | 多比例封面生成器 |
| `gameup-command-center/` | `index.html` | 旧入口兼容跳转到 `command-center/` |

本地打开时使用：

```text
http://localhost:8000/apps/<app-name>/
```

Command Center 测后端时不要用 `127.0.0.1:8000`，Supabase CORS 默认允许的是 `localhost:8000`。
