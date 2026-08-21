$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$assistantScript = Join-Path $projectRoot 'scripts\publisher-assistant\server.cjs'
$playwrightPackage = Join-Path $projectRoot 'node_modules\playwright-core\package.json'
$cacheDirectory = Join-Path $projectRoot '.cache'
$assistantOutLog = Join-Path $cacheDirectory 'publisher-assistant.out.log'
$assistantErrorLog = Join-Path $cacheDirectory 'publisher-assistant.error.log'
$siteOutLog = Join-Path $cacheDirectory 'publishing-console-site.out.log'
$siteErrorLog = Join-Path $cacheDirectory 'publishing-console-site.error.log'

if (-not (Test-Path -LiteralPath $playwrightPackage -PathType Leaf)) {
  throw '缺少 playwright-core。请先在仓库根目录运行 npm install。'
}

$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } elseif (Test-Path -LiteralPath $bundledNode -PathType Leaf) { $bundledNode } else { throw '找不到 Node.js 20+。请安装 Node.js 后重试。' }
$pythonPath = if (Test-Path -LiteralPath $bundledPython -PathType Leaf) { $bundledPython } elseif ($pythonCommand) { $pythonCommand.Source } else { throw '找不到 Python。请安装 Python 3 后重试。' }
New-Item -ItemType Directory -Path $cacheDirectory -Force | Out-Null

$assistantReady = $false
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:17877/api/health' -TimeoutSec 1
  $assistantReady = [bool]$health.ok
} catch {
  $assistantReady = $false
}

if (-not $assistantReady) {
  Start-Process -FilePath $nodePath `
    -ArgumentList @("`"$assistantScript`"") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $assistantOutLog `
    -RedirectStandardError $assistantErrorLog
}

$siteReady = $false
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8000/apps/publishing-console/' -TimeoutSec 1
  $siteReady = $response.StatusCode -eq 200
} catch {
  $siteReady = $false
}

if (-not $siteReady) {
  Start-Process -FilePath $pythonPath `
    -ArgumentList @('-m', 'http.server', '8000') `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $siteOutLog `
    -RedirectStandardError $siteErrorLog
}

Start-Sleep -Milliseconds 1200
Start-Process 'http://localhost:8000/apps/publishing-console/'

Write-Host 'GUCC Publish Console 已启动。'
Write-Host '控制台：http://localhost:8000/apps/publishing-console/'
Write-Host '本机助手：http://127.0.0.1:17877/api/health'
