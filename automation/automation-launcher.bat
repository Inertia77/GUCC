@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title 自动化批处理启动器 - Automation Batch Launcher

set "ROOT=%~dp0"

:menu
cls
echo ======================================================================
echo              自动化批处理启动器 / Automation Batch Launcher
echo ======================================================================
echo.

set /a COUNT=0
set "CURRENT_GROUP="
for /r "%ROOT%" %%F in (*.bat) do (
    if /I not "%%~fF"=="%~f0" (
        set /a COUNT+=1
        set "ITEM_!COUNT!=%%~fF"
        set "RELATIVE=%%~fF"
        set "RELATIVE=!RELATIVE:%ROOT%=!"
        set "GROUP="
        for /f "tokens=1 delims=\" %%G in ("!RELATIVE!") do set "GROUP=%%G"
        set "GROUP_LABEL=!GROUP!"
        if /I "!GROUP!"=="创作中心" set "GROUP_LABEL=创作中心 / Creator Workflow"
        if /I "!GROUP!"=="游戏信息中心" set "GROUP_LABEL=游戏信息中心 / Game Information"
        if /I "!GROUP!"=="游戏攻略UP主" set "GROUP_LABEL=游戏攻略 UP主 / Guide Creators"
        if /I not "!GROUP!"=="!CURRENT_GROUP!" (
            echo.
            echo   ------------------------------------------------------------------
            echo   !GROUP_LABEL!
            echo   ------------------------------------------------------------------
            set "CURRENT_GROUP=!GROUP!"
        )
        set "DESCRIPTION="
        set "PAD_WIDTH=1"
        if /I "%%~nxF"=="01-publishing.bat" set "DESCRIPTION=内容发布"
        if /I "%%~nxF"=="02-post-diffusion.bat" set "DESCRIPTION=发布后扩散"
        if /I "%%~nxF"=="03-analytics.bat" set "DESCRIPTION=数据分析"
        if /I "%%~nxF"=="04-interactions.bat" set "DESCRIPTION=互动管理"
        if /I "%%~nxF"=="05-homepages.bat" set "DESCRIPTION=平台主页"
        if /I "%%~nxF"=="06-game-information-check.bat" set "DESCRIPTION=重点游戏官方信息检查"
        if /I "%%~nxF"=="07-game-character-pages.bat" set "DESCRIPTION=官方角色与图鉴页"
        if /I "%%~nxF"=="08-game-leak-character-pages.bat" set "DESCRIPTION=测试服与内鬼站角色资料页"
        if /I "%%~nxF"=="09-key-games-official-community-pages.bat" set "DESCRIPTION=重点游戏官方社区"
        if /I "%%~nxF"=="10-other-games-bilibili-videos.bat" set "DESCRIPTION=其他游戏 B站官方视频页"
        if /I "%%~nxF"=="11-basic-understanding-creators-videos.bat" set "DESCRIPTION=基础理解参考 UP主投稿视频页"
        if /I "%%~nxF"=="12-game-story-analysis-creators-videos.bat" set "DESCRIPTION=游戏剧情解析 UP主投稿视频页"
        if /I "%%~nxF"=="13-game-learning-creators-videos.bat" set "DESCRIPTION=值得学习游戏 UP主投稿视频页"
        if /I "%%~nxF"=="14-youtube-game-commentary-reference-videos.bat" set "DESCRIPTION=YouTube 游戏解说视频参考"
        if /I "%%~nxF"=="01-publishing.bat" set "PAD_WIDTH=22"
        if /I "%%~nxF"=="02-post-diffusion.bat" set "PAD_WIDTH=20"
        if /I "%%~nxF"=="03-analytics.bat" set "PAD_WIDTH=22"
        if /I "%%~nxF"=="04-interactions.bat" set "PAD_WIDTH=22"
        if /I "%%~nxF"=="05-homepages.bat" set "PAD_WIDTH=22"
        if /I "%%~nxF"=="06-game-information-check.bat" set "PAD_WIDTH=10"
        if /I "%%~nxF"=="07-game-character-pages.bat" set "PAD_WIDTH=14"
        if /I "%%~nxF"=="08-game-leak-character-pages.bat" set "PAD_WIDTH=6"
        if /I "%%~nxF"=="09-key-games-official-community-pages.bat" set "PAD_WIDTH=14"
        if /I "%%~nxF"=="10-other-games-bilibili-videos.bat" set "PAD_WIDTH=8"
        if /I "%%~nxF"=="11-basic-understanding-creators-videos.bat" set "PAD_WIDTH=3"
        if /I "%%~nxF"=="12-game-story-analysis-creators-videos.bat" set "PAD_WIDTH=3"
        if /I "%%~nxF"=="13-game-learning-creators-videos.bat" set "PAD_WIDTH=3"
        if /I "%%~nxF"=="14-youtube-game-commentary-reference-videos.bat" set "PAD_WIDTH=6"
        if defined DESCRIPTION (
            call :make_spaces !PAD_WIDTH! PAD
            set "NUMBER_DISPLAY= !COUNT!"
            if !COUNT! GEQ 10 set "NUMBER_DISPLAY=!COUNT!"
            echo     !NUMBER_DISPLAY!. [!DESCRIPTION!]!PAD!%%~nxF
        ) else (
            echo     !COUNT!. %%~nxF
        )
    )
)

if !COUNT! EQU 0 (
    echo 未找到批处理文件。 / No batch files were found.
    pause
    exit /b 1
)

echo.
echo   Q. 退出 / Exit
echo.
set "CHOICE="
set /p "CHOICE=请选择批处理编号 / Select a batch number: "

if /I "!CHOICE!"=="Q" exit /b 0
if not defined CHOICE goto invalid

for /f "delims=0123456789" %%A in ("!CHOICE!") do goto invalid
set /a NUMBER=CHOICE 2>nul
if !NUMBER! LSS 1 goto invalid
if !NUMBER! GTR !COUNT! goto invalid

call set "TARGET=%%ITEM_!NUMBER!%%"
if not defined TARGET goto invalid

echo.
echo 正在运行 / Running: !TARGET!
echo.
call "!TARGET!"
goto menu

:invalid
echo.
echo 选择无效，请输入列表中的数字或 Q。 / Invalid selection. Please enter a listed number or Q.
timeout /t 2 /nobreak >nul
goto menu

:make_spaces
setlocal EnableDelayedExpansion
set "RESULT="
for /l %%S in (1,1,%~1) do set "RESULT=!RESULT! "
endlocal & set "%~2=%RESULT%"
exit /b
