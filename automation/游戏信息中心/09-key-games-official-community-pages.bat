@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Key Games Official Community Pages

REM ==================================================
REM Official community/news pages for the key games.
REM ==================================================

echo.
echo [Key Games Official Community Pages]
echo 正在打开重点游戏的官方社区与资讯入口...

call :open "https://www.miyoushe.com/sr/home/53?type=3" "崩坏：星穹铁道 - 米游社资讯"
call :open "https://www.kurobbs.com/mc/official" "鸣潮 - 库街区资讯"
call :open "https://www.miyoushe.com/zzz/home/58?type=3" "绝区零 - 米游社资讯"
call :open "https://www.skland.com/game/endfield?cateId=12" "明日方舟：终末地 - 森空岛资讯"
call :open "https://www.tajiduo.com/bbs/index.html#/home?id=2" "异环 - 塔吉多资讯"

echo.
echo 全部重点游戏官方社区与资讯入口已打开。
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
