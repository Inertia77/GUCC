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

call "%~dp001_Analytics_All.bat" /nopause
call "%~dp002_Interaction_All.bat" /nopause
call "%~dp003_Publish_All.bat" /nopause
call "%~dp004_Homepage_Check_All.bat" /nopause

echo.
echo All batches finished.
pause
exit /b
