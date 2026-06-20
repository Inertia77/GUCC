@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 04 Homepage Check All

REM ==================================================
REM 04 Homepage Check All
REM Generated as ASCII-safe batch. URLs with % are escaped.
REM ==================================================

echo.
echo [04 Homepage Check All]
echo Opening pages...

call :open "https://space.bilibili.com/314599386" "Bilibili - channel"
call :open "https://www.youtube.com/@Inertia_m7y3/featured" "YouTube - featured"
call :open "https://www.douyin.com/user/self?from_tab_name=main&showTab=post" "Douyin - posts"
call :open "https://www.xiaohongshu.com/user/profile/5de6779f0000000001002f86" "Xiaohongshu - profile"
call :open "https://www.weibo.com/u/6520826377" "Weibo - profile"
call :open "https://www.tiktok.com/@inertia_m7y3" "TikTok - profile"
call :open "https://x.com/inertia_m7y3" "X - profile"
call :open "https://www.hoyolab.com/accountCenter/postList?id=366407641" "HoYoLab - posts"

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
