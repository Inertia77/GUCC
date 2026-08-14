# Automation

Windows 批处理脚本区，用于批量打开网页入口，不修改仓库数据。

| 目录/文件 | 用途 |
|---|---|
| `创作中心/` | 创作者平台的数据、互动、视频发布、后期扩散和主页巡检 |
| `游戏信息中心/` | 游戏官方 Bilibili 视频主页、角色资料与低频保留入口 |
| `游戏攻略UP主/` | 游戏攻略、剧情解析与学习参考创作者的 Bilibili 和 YouTube 视频页 |
| `automation-launcher.bat` | 双击后从编号菜单选择并启动任意批处理脚本 |

使用方式：

1. 在 Windows 文件资源管理器中双击 `automation-launcher.bat`。
2. 输入脚本前的编号并按 Enter。
3. 脚本执行结束后可继续选择，输入 `Q` 退出。

> VS Code 的资源管理器会把 `.bat` 当作文本打开，双击行为不能由仓库文件改写；本仓库已配置默认任务，在 VS Code 中按 `Ctrl+Shift+B` 即可打开选择菜单。也可以右键该文件在终端运行，或执行 `./automation/automation-launcher.bat`。

这些脚本只负责打开页面，不负责登录、抓取、写入或发布。如果 Windows 阻止脚本，可在对应目录执行：

```powershell
Get-ChildItem -Recurse -Filter *.bat | Unblock-File
```
