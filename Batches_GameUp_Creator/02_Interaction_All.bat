@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 02 Interaction All

REM ==================================================
REM 02 Interaction All
REM Generated as ASCII-safe batch. URLs with % are escaped.
REM ==================================================

echo.
echo [02 Interaction All]
echo Opening pages...

REM Skipped mobile-only items from the original table.

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
