@echo off
setlocal EnableExtensions
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-publishing-console.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Publish Console failed to start.
  pause
  exit /b 1
)
exit /b 0
