@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 00 Daily Data + Interaction

REM ==================================================
REM 00 Daily Data + Interaction
REM Generated as ASCII-safe batch. URLs with % are escaped.
REM ==================================================

echo.
echo [00 Daily Data + Interaction]
echo Opening pages...

REM Daily patrol: analytics + comments/notifications only.
REM Skipped mobile-only items: Xiaohongshu comments, Weibo comments, HoYoLab comments.

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
call :open "https://member.bilibili.com/platform/comment/article" "Bilibili - comments"
call :open "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/comments/inbox?filter=%%5B%%7B%%22isDisabled%%22%%3Afalse%%2C%%22isPinned%%22%%3Atrue%%2C%%22name%%22%%3A%%22SORT_BY%%22%%2C%%22value%%22%%3A%%22SORT_BY_MOST_RELEVANT%%22%%7D%%2C%%7B%%22name%%22%%3A%%22ENGAGED_STATUS%%22%%2C%%22value%%22%%3A%%5B%%22COMMENT_CATEGORY_NOT_ENGAGED%%22%%5D%%7D%%5D" "YouTube - comments"
call :open "https://creator.douyin.com/creator-micro/data/following/comment" "Douyin - comments"
call :open "https://channels.weixin.qq.com/platform/interaction/comment" "WeChat Channels - comments"
call :open "https://mp.weixin.qq.com/misc/appmsgcomment?action=list_latest_comment&begin=0&count=10&sendtype=MASSSEND&scene=1&token=1315607839&lang=zh_CN" "WeChat Official Account - latest comments"
call :open "https://www.tiktok.com/tiktokstudio/comment" "TikTok - comments"
call :open "https://x.com/notifications" "X - notifications"

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
