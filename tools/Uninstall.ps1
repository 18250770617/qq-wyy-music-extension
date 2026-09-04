[CmdletBinding()]
param()

$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.cloudmusic.edge.bridge'
if (Test-Path -LiteralPath $registryPath) { Remove-Item -LiteralPath $registryPath -Force }
Write-Host '已移除 Edge Native Messaging 注册。扩展和本地加密配置未删除。' -ForegroundColor Green
Write-Host '如需彻底删除 QQ Key，可删除 %LOCALAPPDATA%\CloudMusicEdge。'

