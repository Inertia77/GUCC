@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Game Information Check

REM ==================================================
REM Game Information Check - official Bilibili video pages
REM All links use /upload/video; dynamic pages are intentionally excluded.
REM ==================================================

echo.
echo [Game Information Check]
echo 正在打开重点游戏的 B站官方视频主页...

REM 鸣潮
call :open "https://space.bilibili.com/1955897084/upload/video" "鸣潮 - 主官方号"
call :open "https://space.bilibili.com/3493090606188642/upload/video" "鸣潮先行公约 - 官方同人账号"

REM 绝区零
call :open "https://space.bilibili.com/1636034895/upload/video" "绝区零 - 主官方号"
call :open "https://space.bilibili.com/3546687932991974/upload/video" "绝区零第一可爱兔宝 - 官方运营/角色账号"

REM 崩坏：星穹铁道
call :open "https://space.bilibili.com/1340190821/upload/video" "崩坏星穹铁道 - 主官方号"
call :open "https://space.bilibili.com/508103429/upload/video" "帕姆的收藏夹 - 官方活动/图片/资讯账号"
call :open "https://space.bilibili.com/3493120220071960/upload/video" "星穹铁道小呜呜 - 官方角色/运营账号"
call :open "https://space.bilibili.com/3707025802398400/upload/video" "星穹铁道银河风物 - 官方周边资讯账号"

REM 明日方舟：终末地
call :open "https://space.bilibili.com/1265652806/upload/video" "明日方舟终末地 - 主官方号"
call :open "https://space.bilibili.com/3546983822264909/upload/video" "终末地Delta机器人 - 官方资讯/辅助账号"
call :open "https://space.bilibili.com/3546978883472274/upload/video" "明日方舟终末地山团团 - 官方衍生品账号"

REM 异环
call :open "https://space.bilibili.com/3546636978489848/upload/video" "异环 - 主官方号"
call :open "https://space.bilibili.com/3546735515274028/upload/video" "咻啪的小背包 - 异环官方运营角色账号"

echo.
echo 全部重点游戏官方视频主页已打开。
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
