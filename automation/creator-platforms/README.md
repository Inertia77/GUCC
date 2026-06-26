# Creator Platform Automation

批量打开创作者平台页面，用于日常巡检数据、互动、发布入口和公开主页。

| 文件 | 用途 |
|---|---|
| `00-daily.bat` | 每日数据和互动巡检 |
| `01-analytics.bat` | 数据分析页 |
| `02-interactions.bat` | 评论与通知 |
| `03-publishing.bat` | 上传与发布 |
| `04-homepages.bat` | 公开主页检查 |
| `99-open-all.bat` | 依次执行 01-04，会打开很多标签页 |

如果 Windows 阻止脚本：

```powershell
Unblock-File -Path ".\*.bat"
```

脚本只打开网页，不自动发送、上传或修改平台内容。
