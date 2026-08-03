@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 04 Post-publish Diffusion

REM ==================================================
REM 04 Post-publish Diffusion
REM Non-video distribution after the main video is live.
REM URLs with % are escaped.
REM ==================================================

echo.
echo [04 Post-publish Diffusion]
echo Opening image, article and social post pages...

call :open "https://creator.xiaohongshu.com/publish/publish?from=menu&target=image" "Xiaohongshu - publish image/text"
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
