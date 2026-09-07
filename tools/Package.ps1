[CmdletBinding()]
param([switch]$IncludeCollection)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'Build.ps1')

$version = (Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'extension\manifest.json') | ConvertFrom-Json).version
$archive = Join-Path (Split-Path -Parent $projectRoot) "CloudMusicEdge-v$version.zip"
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("CloudMusicEdge-package-" + [guid]::NewGuid().ToString('N'))
$packageRoot = Join-Path $staging 'CloudMusicEdge'

try {
    New-Item -ItemType Directory -Path $packageRoot | Out-Null
    @('AGENTS.md','README.md','启动助手.cmd','安装.cmd','检测连接.cmd','卸载.cmd','extension','native-host','installer','tools','docs','tests') | ForEach-Object {
        $source = Join-Path $projectRoot $_
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $packageRoot -Recurse -Force }
    }
    $generatedHostManifest = Join-Path $packageRoot 'native-host\com.cloudmusic.edge.bridge.json'
    if (Test-Path -LiteralPath $generatedHostManifest) { Remove-Item -LiteralPath $generatedHostManifest -Force }
    Get-ChildItem -LiteralPath $packageRoot -Recurse -File | Where-Object { $_.Name -match 'qq\.key|settings\.json|netease-player\.json|\.pem$|\.pfx$|cookie' } | ForEach-Object { throw "打包已中止：发现疑似凭据文件 $($_.FullName)" }
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
    Compress-Archive -LiteralPath $packageRoot -DestinationPath $archive -CompressionLevel Optimal
    Write-Host "便携包已生成：$archive" -ForegroundColor Green
} finally {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}

& (Join-Path $PSScriptRoot 'Build-PortableSetup.ps1') -IncludeCollection:$IncludeCollection
