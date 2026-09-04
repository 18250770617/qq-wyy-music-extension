[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$hostExe = Join-Path $projectRoot 'native-host\CloudMusicBridge.exe'
$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.cloudmusic.edge.bridge'

Write-Host 'CloudMusic Edge 连接检测' -ForegroundColor Cyan
Write-Host '========================'

if (Test-Path -LiteralPath $registryPath) {
    $registeredManifest = (Get-Item -LiteralPath $registryPath).GetValue('')
    $manifestOk = $registeredManifest -and (Test-Path -LiteralPath $registeredManifest)
    Write-Host ("[Host 注册] " + $(if ($manifestOk) { '正常' } else { '路径已失效，请重新运行安装.cmd' })) -ForegroundColor $(if ($manifestOk) { 'Green' } else { 'Yellow' })
} else {
    Write-Host '[Host 注册] 未安装，请运行安装.cmd' -ForegroundColor Yellow
}

if (Test-Path -LiteralPath $hostExe) {
    try {
        $result = & $hostExe --self-test | ConvertFrom-Json
        Write-Host '[桥接程序] 正常' -ForegroundColor Green
        Write-Host ("[Node.js]  " + $(if ($result.environment.node) { '已安装' } else { '缺失' }))
        Write-Host ("[ncm-cli]  " + $(if ($result.environment.ncmCli) { '已安装' } else { '缺失' }))
        Write-Host ("[mpv]      " + $(if ($result.environment.mpv) { '已安装' } else { '缺失' }))
        Write-Host ("[网易云]   " + $result.providers.netease.summary)
        Write-Host ("[QQ 音乐]  " + $result.providers.qq.summary)
    } catch { Write-Host "[桥接程序] 检测失败：$($_.Exception.Message)" -ForegroundColor Red }
} else {
    Write-Host '[桥接程序] 尚未构建，请运行安装.cmd' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '提示：项目文件夹移动后，只需重新运行安装.cmd 更新连接位置。'
