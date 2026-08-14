@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Game Leak Character Pages

REM ==================================================
REM Unofficial beta/leak character pages.
REM ==================================================

echo.
echo [Game Leak Character Pages]

call :open "https://hsr.gachabase.net/characters/beta?lang=chs" "崩坏：星穹铁道 - GachaBase 测试服角色页"
call :open "https://ww.nanoka.cc/character/" "鸣潮 - Nanoka 角色页"
call :open "https://zzz.gachabase.net/agents/beta?lang=chs" "绝区零 - GachaBase 测试服代理人页"
call :open "%~dp0endfield-unofficial-character-page-reminder.html" "明日方舟：终末地 - 非官方参考站提示"
call :open "https://nte.nanoka.cc/character/" "异环 - Nanoka 角色页"

echo.
echo 全部非官方角色页或提示页已打开。
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
