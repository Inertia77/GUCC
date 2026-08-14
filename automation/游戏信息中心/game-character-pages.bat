@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Game Character Pages

REM ==================================================
REM Character/reference pages separated from the main video check.
REM ==================================================

echo.
echo [Game Character Pages]

call :open "https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105" "鸣潮 - 官方角色页"
call :open "https://baike.mihoyo.com/zzz/wiki/channel/map/2/43?mhy_presentation_style=fullscreen" "绝区零 - 官方角色页"
call :open "https://bbs.mihoyo.com/sr/wiki/channel/map/17/18?bbs_presentation_style=no_header" "崩坏：星穹铁道 - 米游社角色页"
call :open "https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=1" "明日方舟：终末地 - 森空岛角色页"

REM 异环：暂无有效的独立角色页，保留空位。
REM call :open "" "异环 - 角色页"

echo.
echo 全部角色页已打开。
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
