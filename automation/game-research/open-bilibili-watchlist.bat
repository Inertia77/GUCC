@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM GameUp Command Center - 浅尝级 / 观察级以下游戏B站主页
REM ============================================

REM ============================================
REM 浅尝级游戏 B站主页
REM ============================================

echo 正在打开：浅尝级游戏...

REM 黑神话悟空
call :open "https://space.bilibili.com/642389251/upload/video"

REM 剑星
REM 暂无有效链接，后续补充
REM call :open ""

REM 无限暖暖
call :open "https://space.bilibili.com/3461576715667734/upload/video"

REM 只狼
REM 暂无有效链接，后续补充
REM call :open ""


REM ============================================
REM 观察级以下游戏 B站主页
REM ============================================

echo 正在打开：观察级以下游戏...

REM 原神
call :open "https://space.bilibili.com/401742377/upload/video"

REM 无限大
call :open "https://space.bilibili.com/3494379073309365/upload/video"

REM 虚环
call :open "https://space.bilibili.com/320070259/upload/video"

REM 归环
call :open "https://space.bilibili.com/3546757206116480/upload/video"

REM 崩坏因缘精灵
call :open "https://space.bilibili.com/3546886017387331/upload/video"

REM 蓝色星原旅谣
call :open "https://space.bilibili.com/3546569016085336/upload/video"

REM 白银之城
call :open "https://space.bilibili.com/3546879304403742/upload/video"

REM 望月游戏
call :open "https://space.bilibili.com/3546390615559007/upload/video"

REM 星布谷地
call :open "https://space.bilibili.com/3546622923377024/upload/video"

REM Varsapura
call :open "https://space.bilibili.com/3546776462166987/upload/video"

REM 女神异闻录夜幕魅影
call :open "https://space.bilibili.com/1606210274/upload/video"

REM 阴阳师
call :open "https://space.bilibili.com/30973654/upload/video"


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
