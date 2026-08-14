@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Basic Understanding Creators - Bilibili Videos

REM ==================================================
REM Basic understanding/reference creators - upload/video pages.
REM Verified from Bilibili user search on 2026-08-15.
REM ==================================================

echo.
echo [Basic Understanding Creators - Bilibili Videos]
echo 正在打开基础理解参考 UP主的 B站投稿视频页...

call :open "https://space.bilibili.com/1438375628/upload/video" "粥粥的终极理解"
call :open "https://space.bilibili.com/43222001/upload/video" "卡特亚"
call :open "https://space.bilibili.com/3546583140403261/upload/video" "打游戏的老二"
call :open "https://space.bilibili.com/27500557/upload/video" "梦轩dada"
call :open "https://space.bilibili.com/6014992/upload/video" "叫我棉被"
call :open "https://space.bilibili.com/50111839/upload/video" "小琨爱小蛊"

echo.
echo 全部 6 位基础理解参考 UP主的投稿视频页已打开。
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
