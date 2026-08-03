# Creator Platform Automation

批量打开创作者平台页面，用于日常巡检数据、互动、正式视频发布、后期扩散和公开主页。

| 文件 | 用途 |
|---|---|
| `00-daily.bat` | 每日数据和互动巡检 |
| `01-analytics.bat` | 数据分析页 |
| `02-interactions.bat` | 评论与通知 |
| `03-publishing.bat` | 正式视频发布：Bilibili、YouTube、抖音、小红书视频、视频号、TikTok |
| `04-post-diffusion.bat` | 后期扩散：小红书图文、公众号、微博、X、HoYoLab |
| `05-homepages.bat` | 公开主页检查 |
| `04-homepages.bat` | 旧入口兼容别名，转到 `05-homepages.bat` |
| `99-open-all.bat` | 依次执行 01-05，会打开很多标签页 |

如果 Windows 阻止脚本：

```powershell
Unblock-File -Path ".\*.bat"
```

脚本只打开网页，不自动发送、上传或修改平台内容。建议先运行 `03-publishing.bat` 完成正片发布并拿到视频链接，再运行 `04-post-diffusion.bat` 做图文与社交扩散。
