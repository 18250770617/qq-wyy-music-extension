[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot 'native-host\BridgeHost.cs'
$output = Join-Path $projectRoot 'native-host\CloudMusicBridge.exe'
$temporaryOutput = Join-Path $projectRoot ("native-host\CloudMusicBridge.{0}.next.exe" -f $PID)
$compilerCandidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) { throw '未找到 Windows .NET Framework C# 编译器。请在“启用或关闭 Windows 功能”中启用 .NET Framework 4.x。' }

if (-not $Force -and (Test-Path -LiteralPath $output) -and (Get-Item -LiteralPath $output).LastWriteTimeUtc -ge (Get-Item -LiteralPath $source).LastWriteTimeUtc) {
    Write-Host "桥接程序已是最新：$output" -ForegroundColor DarkGray
    return
}

try {
    & $compiler /nologo /target:exe /optimize+ /out:$temporaryOutput /reference:System.dll /reference:System.Core.dll /reference:System.Net.Http.dll /reference:System.Security.dll /reference:System.Web.Extensions.dll $source
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $temporaryOutput)) { throw '本地桥接编译失败。' }

    $resolvedOutput = [IO.Path]::GetFullPath($output)
    $resolvedHostDirectory = [IO.Path]::GetFullPath((Join-Path $projectRoot 'native-host'))
    if ([IO.Path]::GetDirectoryName($resolvedOutput) -ne $resolvedHostDirectory) { throw '桥接输出路径校验失败。' }

    $installed = $false
    for ($attempt = 0; $attempt -lt 5 -and -not $installed; $attempt++) {
        try {
            Get-CimInstance Win32_Process -Filter "Name = 'CloudMusicBridge.exe'" -ErrorAction SilentlyContinue |
                Where-Object { $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath) -eq $resolvedOutput } |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            Move-Item -LiteralPath $temporaryOutput -Destination $output -Force
            $installed = $true
        } catch {
            Start-Sleep -Milliseconds 80
        }
    }
    if (-not $installed) { throw '新版桥接无法替换：请关闭 Edge 后重试。' }
} finally {
    if (Test-Path -LiteralPath $temporaryOutput) { Remove-Item -LiteralPath $temporaryOutput -Force }
}

Write-Host "构建完成：$output" -ForegroundColor Green
