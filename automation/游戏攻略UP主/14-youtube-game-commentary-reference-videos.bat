@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title YouTube Game Commentary Reference Videos

REM ==================================================
REM YouTube game commentary/guide reference channels.
REM Channel video-page URLs supplied on 2026-08-15.
REM ==================================================

echo.
echo [YouTube Game Commentary Reference Videos]
echo 正在打开 YouTube 游戏解说与攻略参考频道的视频页...

call :open "https://www.youtube.com/@maguro-head/videos" "マグロヘッド - 日语"
call :open "https://www.youtube.com/@KyoStinV/videos" "KyoStinV - 英语"
call :open "https://www.youtube.com/@IWinToLose/videos" "IWinToLose Gaming - 英语"
call :open "https://www.youtube.com/@Braxophone/videos" "Braxophone - 英语"
call :open "https://www.youtube.com/@Somen-Channel/videos" "Somen Channel - 日语"
call :open "https://www.youtube.com/@guobacertified/videos" "Guoba Certified - 英语"
call :open "https://www.youtube.com/@Rexlent/videos" "Rexlent - 英语"

echo.
echo 全部 7 个 YouTube 游戏解说与攻略参考频道已打开。
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
