@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Game Story Analysis Creators - Bilibili Videos

REM ==================================================
REM Game story analysis creators - upload/video pages.
REM Verified from Bilibili user search on 2026-08-15.
REM ==================================================

echo.
echo [Game Story Analysis Creators - Bilibili Videos]
echo 正在打开游戏剧情解析 UP主的 B站投稿视频页...

call :open "https://space.bilibili.com/7466789/upload/video" "Jerryprpr"

echo.
echo 游戏剧情解析 UP主的投稿视频页已打开。
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
