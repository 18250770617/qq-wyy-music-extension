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
$setupArtifact = Join-Path $projectRoot 'artifacts\CloudMusicEdge-Setup-v0.8.0.exe'
& (Join-Path $PSScriptRoot 'Build-PortableSetup.ps1') -OutputPath $setupArtifact
& (Join-Path $PSScriptRoot 'Test-PortableSetup.ps1') -InstallerPath $setupArtifact
if (Get-Command node -ErrorAction SilentlyContinue) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'extension') -Filter '*.js' | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "JavaScript 语法错误：$($_.Name)" } }
    node (Join-Path $projectRoot 'tests\native-smoke.js')
    if ($LASTEXITCODE -ne 0) { throw 'Native Messaging 冒烟测试失败。' }
    node (Join-Path $projectRoot 'tests\native-collection.js')
    if ($LASTEXITCODE -ne 0) { throw '插件特藏数据层检查失败。' }
    node (Join-Path $projectRoot 'tests\native-channel-isolation.js')
    if ($LASTEXITCODE -ne 0) { throw '耗时数据请求与实时播放通道隔离检查失败。' }
    node (Join-Path $projectRoot 'tests\playlist-performance-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '歌单加载性能保护检查失败。' }
    node (Join-Path $projectRoot 'tests\load-more-scroll-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '加载更多滚动位置保护检查失败。' }
    node (Join-Path $projectRoot 'tests\infinite-scroll-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '滚动到底自动加载检查失败。' }
    node (Join-Path $projectRoot 'tests\playback-click-guard.js')
    if ($LASTEXITCODE -ne 0) { throw '播放请求重复点击保护检查失败。' }
    node (Join-Path $projectRoot 'tests\unavailable-ui-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '不可播放歌曲状态与原因样式检查失败。' }
    node (Join-Path $projectRoot 'tests\verify-extension-id.js')
    if ($LASTEXITCODE -ne 0) { throw '扩展固定 ID 验证失败。' }
    node (Join-Path $projectRoot 'tests\security-static.js')
    if ($LASTEXITCODE -ne 0) { throw '前端安全边界检查失败。' }
    node (Join-Path $projectRoot 'tests\netease-response-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '网易云官方返回结构适配检查失败。' }
    node (Join-Path $projectRoot 'tests\netease-library-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '网易云个人库协议检查失败。' }
    node (Join-Path $projectRoot 'tests\netease-visualizer-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '网易云实时频段协议检查失败。' }
    node (Join-Path $projectRoot 'tests\spectrum-mapping-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '频谱四次方差值映射检查失败。' }
    node (Join-Path $projectRoot 'tests\native-player-identity-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '网易云实际曲目身份同步检查失败。' }
    node (Join-Path $projectRoot 'tests\floating-ui-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '悬浮播放器交互契约检查失败。' }
    node (Join-Path $projectRoot 'tests\collection-ui-contract.js')
    if ($LASTEXITCODE -ne 0) { throw '插件特藏悬浮界面检查失败。' }
} else { Write-Host '未找到 Node.js，跳过 JavaScript 语法和协议冒烟测试。' -ForegroundColor Yellow }

$forbidden = Select-String -Path (Join-Path $projectRoot 'extension\*') -Pattern 'weapi|eapi|document\.cookie|webRequest' -ErrorAction SilentlyContinue
if ($forbidden) { throw '扩展中检测到禁止的逆向/Cookie 访问关键词。' }
Write-Host '全部自动检查通过。' -ForegroundColor Green
