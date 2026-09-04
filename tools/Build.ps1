[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot 'native-host\BridgeHost.cs'
$output = Join-Path $projectRoot 'native-host\CloudMusicBridge.exe'
$compilerCandidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) { throw '未找到 Windows .NET Framework C# 编译器。请在“启用或关闭 Windows 功能”中启用 .NET Framework 4.x。' }

& $compiler /nologo /target:exe /optimize+ /out:$output /reference:System.dll /reference:System.Core.dll /reference:System.Net.Http.dll /reference:System.Security.dll /reference:System.Web.Extensions.dll $source
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output)) { throw '本地桥接编译失败。' }

Write-Host "构建完成：$output" -ForegroundColor Green

