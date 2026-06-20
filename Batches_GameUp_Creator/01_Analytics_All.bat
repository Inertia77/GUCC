@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 01 Analytics All

REM ==================================================
REM 01 Analytics All
REM Generated as ASCII-safe batch. URLs with % are escaped.
REM ==================================================

echo.
echo [01 Analytics All]
echo Opening pages...

call :open "https://member.bilibili.com/platform/data-up/video/" "Bilibili - analytics"
call :open "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/analytics/tab-overview/period-default" "YouTube - analytics"
call :open "https://creator.douyin.com/creator-micro/data-center/operation" "Douyin - analytics"
call :open "https://creator.xiaohongshu.com/statistics/account/v2" "Xiaohongshu - analytics"
call :open "https://channels.weixin.qq.com/platform/statistic/post" "WeChat Channels - analytics"
call :open "https://mp.weixin.qq.com/misc/appmsganalysis?action=report&type=daily_v2&token=1315607839&lang=zh_CN" "WeChat Official Account - article analytics"
call :open "https://me.weibo.com/data/overview" "Weibo - analytics"
call :open "https://www.tiktok.com/tiktokstudio/analytics" "TikTok - analytics"
call :open "https://x.com/i/jf/creators/analytics_paywall" "X - analytics"
call :open "https://creator.hoyolab.com/?&bbs_theme=light&bbs_theme_device=1#/" "HoYoLab - creator center"

echo.
echo Done.
if /I "%~1"=="/nopause" exit /b
pause
exit /b

:open
set "URL=%~1"
set "LABEL=%~2"
if "%URL%"=="" exit /b
echo [OPEN] %LABEL%
start "" "%URL%"
timeout /t 1 /nobreak >nul
exit /b
