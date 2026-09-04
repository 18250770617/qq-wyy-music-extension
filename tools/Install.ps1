[CmdletBinding()]
param([switch]$NoOpenEdge)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
try {
    & (Join-Path $PSScriptRoot 'Build.ps1')
} catch {
    $prebuilt = Join-Path $projectRoot 'native-host\CloudMusicBridge.exe'
    if (-not (Test-Path -LiteralPath $prebuilt)) { throw }
    Write-Host 'Local rebuild unavailable; using the packaged bridge executable.' -ForegroundColor Yellow
}

$hostExe = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'native-host\CloudMusicBridge.exe')).Path
$hostManifest = Join-Path $projectRoot 'native-host\com.cloudmusic.edge.bridge.json'
$manifestData = [ordered]@{
    name = 'com.cloudmusic.edge.bridge'
    description = 'CloudMusic Edge secure native bridge'
    path = $hostExe
    type = 'stdio'
    allowed_origins = @('chrome-extension://obokfjbjcodhoohmlpokcmcdjlijjbmk/')
}
$manifestJson = $manifestData | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($hostManifest, $manifestJson, (New-Object Text.UTF8Encoding($false)))

$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.cloudmusic.edge.bridge'
New-Item -Path $registryPath -Force | Out-Null
Set-Item -LiteralPath $registryPath -Value $hostManifest

Write-Host ''
Write-Host 'CloudMusic Edge 本地桥接已安装。' -ForegroundColor Green
Write-Host "扩展目录：$(Join-Path $projectRoot 'extension')"
Write-Host '扩展固定 ID：obokfjbjcodhoohmlpokcmcdjlijjbmk'
Write-Host ''
Write-Host '接下来：在 Edge 扩展管理页打开“开发人员模式”，点击“加载解压缩的扩展”，选择上面的 extension 文件夹。'

if (-not $NoOpenEdge) { Start-Process 'msedge.exe' 'edge://extensions' }
