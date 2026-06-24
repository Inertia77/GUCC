@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 99 Open All - Careful

REM ==================================================
REM 99 Open All - Careful
REM This will open many browser tabs.
REM ==================================================

echo.
echo [WARNING] This will open analytics, interaction, publish and homepage pages.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

call "%~dp001-analytics.bat" /nopause
call "%~dp002-interactions.bat" /nopause
call "%~dp003-publishing.bat" /nopause
call "%~dp004-homepages.bat" /nopause

echo.
echo All batches finished.
pause
exit /b
