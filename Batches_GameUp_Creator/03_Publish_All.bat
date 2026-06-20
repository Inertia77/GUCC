@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 03 Publish All

REM ==================================================
REM 03 Publish All
REM Generated as ASCII-safe batch. URLs with % are escaped.
REM ==================================================

echo.
echo [03 Publish All]
echo Opening pages...

call :open "https://member.bilibili.com/platform/upload/video/frame/" "Bilibili - upload video"
call :open "https://studio.youtube.com/channel/UCbucMjzSeSynZTb4wnQt-_Q/videos/upload?d=ud&filter=%%5B%%5D&sort=%%7B%%22columnType%%22%%3A%%22date%%22%%2C%%22sortOrder%%22%%3A%%22DESCENDING%%22%%7D" "YouTube - upload video"
call :open "https://creator.douyin.com/creator-micro/content/upload" "Douyin - upload"
call :open "https://creator.xiaohongshu.com/publish/publish?from=menu&target=video" "Xiaohongshu - publish video"
call :open "https://creator.xiaohongshu.com/publish/publish?from=menu&target=image" "Xiaohongshu - publish image"
call :open "https://channels.weixin.qq.com/platform/post/create" "WeChat Channels - create post"
call :open "https://mp.weixin.qq.com/cgi-bin/appmsg?begin=0&count=10&type=77&action=list_card&token=1315607839&lang=zh_CN" "WeChat Official Account - image/text publish"
call :open "https://www.weibo.com/u/6520826377" "Weibo - post/profile page"
call :open "https://x.com/compose/post" "X - compose post"
call :open "https://www.hoyolab.com/newArticle/1" "HoYoLab - new article"

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
