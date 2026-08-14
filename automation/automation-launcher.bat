@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Automation Batch Launcher

set "ROOT=%~dp0"

:menu
cls
echo ==================================================
echo              Automation Batch Launcher
echo ==================================================
echo.

set /a COUNT=0
for /r "%ROOT%" %%F in (*.bat) do (
    if /I not "%%~fF"=="%~f0" (
        set /a COUNT+=1
        set "ITEM_!COUNT!=%%~fF"
        set "RELATIVE=%%~fF"
        set "RELATIVE=!RELATIVE:%ROOT%=!"
        echo   !COUNT!. !RELATIVE!
    )
)

if !COUNT! EQU 0 (
    echo No batch files were found.
    pause
    exit /b 1
)

echo.
echo   Q. Exit
echo.
set "CHOICE="
set /p "CHOICE=Select a batch number: "

if /I "!CHOICE!"=="Q" exit /b 0
if not defined CHOICE goto invalid

for /f "delims=0123456789" %%A in ("!CHOICE!") do goto invalid
set /a NUMBER=CHOICE 2>nul
if !NUMBER! LSS 1 goto invalid
if !NUMBER! GTR !COUNT! goto invalid

call set "TARGET=%%ITEM_!NUMBER!%%"
if not defined TARGET goto invalid

echo.
echo Running: !TARGET!
echo.
call "!TARGET!"
goto menu

:invalid
echo.
echo Invalid selection. Please enter a listed number or Q.
timeout /t 2 /nobreak >nul
goto menu
