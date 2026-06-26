# Automation

Windows 批处理脚本区，用于批量打开网页入口，不修改仓库数据。

| 目录 | 用途 |
|---|---|
| `creator-platforms/` | 创作者平台的数据、互动、发布和主页巡检 |
| `game-research/` | 游戏官方资料、Wiki、Bilibili 观察列表 |

运行前提醒：

- `99-open-all.bat` 会打开很多浏览器标签页。
- 这些脚本只负责打开页面，不负责登录、抓取、写入或发布。
- 如果 Windows 阻止脚本，进入对应目录后执行 `Unblock-File -Path ".\*.bat"`。
