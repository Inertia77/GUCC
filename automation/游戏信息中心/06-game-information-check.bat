@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Game Information Check

REM Keep this wrapper ASCII-only. cmd.exe can corrupt UTF-8 batch lines that
REM contain Chinese text, so the Unicode labels live in PowerShell instead.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp006-game-information-check.ps1" %*
set "SCRIPT_EXIT=%ERRORLEVEL%"

if not "%~1"=="-NoLaunch" pause
exit /b %SCRIPT_EXIT%
