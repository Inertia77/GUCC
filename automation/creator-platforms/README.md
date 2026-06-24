# Creator platform automation

Windows 批处理，用于批量打开创作者平台页面。

| 文件 | 用途 |
|---|---|
| `00-daily.bat` | 每日数据和互动巡检 |
| `01-analytics.bat` | 数据分析页 |
| `02-interactions.bat` | 评论与通知 |
| `03-publishing.bat` | 上传与发布 |
| `04-homepages.bat` | 公开主页检查 |
| `99-open-all.bat` | 依次执行 01–04，会打开很多标签页 |

如 Windows 阻止脚本，可在 PowerShell 中运行：

```powershell
Unblock-File -Path ".\*.bat"
```
