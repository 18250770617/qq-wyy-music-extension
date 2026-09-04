[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'extension\manifest.json') | ConvertFrom-Json
if ($manifest.manifest_version -ne 3) { throw '扩展不是 Manifest V3。' }
if ($manifest.permissions -contains 'cookies' -or $manifest.permissions -contains 'webRequest') { throw '检测到禁止的高风险权限。' }
if ($manifest.host_permissions) { throw '不应默认申请网页 Host 权限。' }
if (-not $manifest.optional_host_permissions) { throw '悬浮球应使用可选站点权限。' }

Get-ChildItem -LiteralPath (Join-Path $projectRoot 'tools') -Filter '*.ps1' | ForEach-Object {
    $tokens = $null
    $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$errors)
    if ($errors.Count) { throw "PowerShell 语法错误：$($_.Name) - $($errors[0].Message)" }
}

$assistantSmoke = & powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $projectRoot 'tools\SetupAssistant.ps1') -SmokeTest | ConvertFrom-Json
if (-not $assistantSmoke.ready -or -not $assistantSmoke.extensionPathExists -or $assistantSmoke.controls -lt 10) { throw '图形设置助手运行时冒烟测试失败。' }

& (Join-Path $PSScriptRoot 'Build.ps1') -Force
if (Get-Command node -ErrorAction SilentlyContinue) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'extension') -Filter '*.js' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "JavaScript 语法错误：$($_.Name)" } }
    node (Join-Path $projectRoot 'tests\native-smoke.js')
    if ($LASTEXITCODE -ne 0) { throw 'Native Messaging 冒烟测试失败。' }
    node (Join-Path $projectRoot 'tests\verify-extension-id.js')
    if ($LASTEXITCODE -ne 0) { throw '扩展固定 ID 验证失败。' }
    node (Join-Path $projectRoot 'tests\security-static.js')
    if ($LASTEXITCODE -ne 0) { throw '前端安全边界检查失败。' }
    node (Join-Path $projectRoot 'tests\netease-response-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '网易云官方返回结构适配检查失败。' }
} else { Write-Host '未找到 Node.js，跳过 JavaScript 语法和协议冒烟测试。' -ForegroundColor Yellow }

$forbidden = Select-String -Path (Join-Path $projectRoot 'extension\*') -Pattern 'weapi|eapi|document\.cookie|webRequest' -ErrorAction SilentlyContinue
if ($forbidden) { throw '扩展中检测到禁止的逆向/Cookie 访问关键词。' }
Write-Host '全部自动检查通过。' -ForegroundColor Green
