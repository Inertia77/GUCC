@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title Other Games - Bilibili Videos

REM ==================================================
REM Other Games - official Bilibili video pages only
REM Verified from Bilibili user search on 2026-08-14.
REM ==================================================

echo.
echo [Other Games - Bilibili Videos]
echo 正在打开其他游戏的 B站官方视频主页...

REM ---------- 原有：浅尝级 ----------
call :open "https://space.bilibili.com/642389251/upload/video" "黑神话：悟空"
call :open "https://space.bilibili.com/3546833404037705/upload/video" "剑星官方"
call :open "https://space.bilibili.com/3461576715667734/upload/video" "无限暖暖"

REM 只狼：截至 2026-08-14 仍未找到可确认的独立官方 B站账号。
REM call :open "" "只狼"

REM ---------- 原有：观察级以下 ----------
call :open "https://space.bilibili.com/401742377/upload/video" "原神"
call :open "https://space.bilibili.com/3494379073309365/upload/video" "无限大"
call :open "https://space.bilibili.com/320070259/upload/video" "虚环"
call :open "https://space.bilibili.com/3546757206116480/upload/video" "归环"
call :open "https://space.bilibili.com/3546886017387331/upload/video" "崩坏：因缘精灵"
call :open "https://space.bilibili.com/3546569016085336/upload/video" "蓝色星原：旅谣"
call :open "https://space.bilibili.com/3546879304403742/upload/video" "白银之城"
call :open "https://space.bilibili.com/3546390615559007/upload/video" "望月"
call :open "https://space.bilibili.com/3546622923377024/upload/video" "星布谷地"
call :open "https://space.bilibili.com/3546776462166987/upload/video" "Varsapura"
call :open "https://space.bilibili.com/1606210274/upload/video" "女神异闻录：夜幕魅影"
call :open "https://space.bilibili.com/30973654/upload/video" "阴阳师"

REM ---------- 补充：知名二游与新游 ----------
call :open "https://space.bilibili.com/27534330/upload/video" "崩坏3第一偶像爱酱"
call :open "https://space.bilibili.com/161775300/upload/video" "明日方舟"
call :open "https://space.bilibili.com/233114659/upload/video" "碧蓝航线"
call :open "https://space.bilibili.com/382651856/upload/video" "战双帕弥什"
call :open "https://space.bilibili.com/471259688/upload/video" "深空之眼"
call :open "https://space.bilibili.com/697654195/upload/video" "少女前线2：追放"
call :open "https://space.bilibili.com/1409863611/upload/video" "尘白禁区"
call :open "https://space.bilibili.com/1197454103/upload/video" "重返未来：1999"
call :open "https://space.bilibili.com/699603717/upload/video" "恋与深空"
call :open "https://space.bilibili.com/3546733590087876/upload/video" "胜利女神：新的希望"
call :open "https://space.bilibili.com/3461571554577304/upload/video" "二重螺旋"
call :open "https://space.bilibili.com/3546720799557898/upload/video" "卡厄思梦境"
call :open "https://space.bilibili.com/1038073593/upload/video" "银与绯"

echo.
echo 全部其他游戏官方视频主页已打开。
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
