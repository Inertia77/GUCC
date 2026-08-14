@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Game Learning Creators - Bilibili Videos

REM ==================================================
REM Creators worth studying - upload/video pages.
REM Verified from Bilibili user search on 2026-08-15.
REM ==================================================

echo.
echo [Game Learning Creators - Bilibili Videos]
echo 正在打开值得学习游戏 UP主的 B站投稿视频页...

call :open "https://space.bilibili.com/25048847/upload/video" "莫娜摸鱼专用"
call :open "https://space.bilibili.com/11369406/upload/video" "波波獭_"
call :open "https://space.bilibili.com/25978510/upload/video" "毕加丶"

echo.
echo 全部 3 位值得学习游戏 UP主的投稿视频页已打开。
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
