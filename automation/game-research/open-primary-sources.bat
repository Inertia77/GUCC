@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM GameUp Command Center - 游戏信息一键打开
REM ============================================

echo 正在打开：通用资料...
call :open "https://supabase.com/dashboard/project/rubjeqnuxuvupjwyksmo/sql"

REM ============================================
REM 创作级游戏
REM ============================================

echo 正在打开：鸣潮...
REM 鸣潮 - 官方角色页
call :open "https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105"
REM 鸣潮 - B站视频页
call :open "https://space.bilibili.com/1955897084/upload/video"
REM 鸣潮 - B站动态资讯页
call :open "https://space.bilibili.com/1955897084/dynamic"
REM 鸣潮 - 库街区资讯
call :open "https://www.kurobbs.com/mc/official"

echo 正在打开：绝区零...
REM 绝区零 - 官方角色页
call :open "https://baike.mihoyo.com/zzz/wiki/channel/map/2/43?mhy_presentation_style=fullscreen"
REM 绝区零 - B站视频页
call :open "https://space.bilibili.com/1636034895/upload/video"
REM 绝区零 - B站动态资讯页
call :open "https://space.bilibili.com/1636034895/dynamic"
REM 绝区零 - 米游社资讯
call :open "https://www.miyoushe.com/zzz/home/58?type=3"

REM ============================================
REM 兴趣级游戏
REM ============================================

echo 正在打开：崩坏星穹铁道...
REM 崩坏星穹铁道 - 米游社角色页
call :open "https://bbs.mihoyo.com/sr/wiki/channel/map/17/18?bbs_presentation_style=no_header"
REM 崩坏星穹铁道 - 米游社资讯
call :open "https://www.miyoushe.com/sr/home/53?type=3"
REM 崩坏星穹铁道 - B站视频页
call :open "https://space.bilibili.com/1340190821/upload/video"
REM 崩坏星穹铁道 - B站动态资讯页
call :open "https://space.bilibili.com/1340190821/dynamic"

echo 正在打开：明日方舟终末地...
REM 明日方舟终末地 - 深空岛角色页
call :open "https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=1"
REM 明日方舟终末地 - 深空岛资讯
call :open "https://www.skland.com/game/endfield?cateId=12"
REM 明日方舟终末地 - B站视频页
call :open "https://space.bilibili.com/1265652806/upload/video"
REM 明日方舟终末地 - B站动态资讯页
call :open "https://space.bilibili.com/1265652806/dynamic"

echo 正在打开：异环...
REM 异环 - 塔吉多角色页
REM 暂无有效链接，后续补充
REM call :open ""

REM 异环 - 塔吉多资讯
call :open "https://www.tajiduo.com/bbs/index.html#/home?id=2"
REM 异环 - B站视频页
call :open "https://space.bilibili.com/3546636978489848/upload/video"
REM 异环 - B站动态资讯页
call :open "https://space.bilibili.com/3546636978489848/dynamic"

echo.
echo 全部页面已打开。
pause
exit /b


REM ============================================
REM URL 打开函数：空链接自动跳过
REM ============================================
:open
if "%~1"=="" exit /b
start "" "%~1"
timeout /t 1 /nobreak >nul
exit /b
