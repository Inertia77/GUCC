[CmdletBinding()]
param(
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

$pages = @(
    [pscustomobject]@{ Url = 'https://space.bilibili.com/1340190821/upload/video'; Label = '崩坏星穹铁道 - 主官方号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/508103429/upload/video'; Label = '帕姆的收藏夹 - 官方活动/图片/资讯账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3493120220071960/upload/video'; Label = '星穹铁道小呜呜 - 官方角色/运营账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3707025802398400/upload/video'; Label = '星穹铁道银河风物 - 官方周边资讯账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/1955897084/upload/video'; Label = '鸣潮 - 主官方号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3493090606188642/upload/video'; Label = '鸣潮先行公约 - 官方同人账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/1636034895/upload/video'; Label = '绝区零 - 主官方号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3546687932991974/upload/video'; Label = '绝区零第一可爱兔宝 - 官方运营/角色账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/1265652806/upload/video'; Label = '明日方舟终末地 - 主官方号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3546983822264909/upload/video'; Label = '终末地Delta机器人 - 官方资讯/辅助账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3546978883472274/upload/video'; Label = '明日方舟终末地山团团 - 官方衍生品账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3546636978489848/upload/video'; Label = '异环 - 主官方号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/3546735515274028/upload/video'; Label = '咻啪的小背包 - 异环官方运营角色账号' }
    [pscustomobject]@{ Url = 'https://space.bilibili.com/30973654/upload/video'; Label = '阴阳师 - 主官方号' }
)

Write-Host ''
Write-Host '[Game Information Check]'
Write-Host '正在打开重点游戏的 B站官方视频主页...'

foreach ($page in $pages) {
    Write-Host "[OPEN] $($page.Label)"

    if (-not $NoLaunch) {
        Start-Process -FilePath $page.Url
        Start-Sleep -Seconds 1
    }
}

Write-Host ''
if ($NoLaunch) {
    Write-Host "检查完成：共找到 $($pages.Count) 个有效页面。"
}
else {
    Write-Host "全部重点游戏官方视频主页已打开（共 $($pages.Count) 个）。"
}
