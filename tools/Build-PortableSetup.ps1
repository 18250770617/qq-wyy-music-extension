[CmdletBinding()]
param(
    [string]$OutputPath,
    [switch]$IncludeCollection,
    [string]$CollectionPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'Build.ps1')
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'extension\manifest.json') | ConvertFrom-Json
$version = $manifest.version
$suffix = if ($IncludeCollection) { 'Personal-Setup' } else { 'Setup' }
if (-not $OutputPath) { $OutputPath = Join-Path (Split-Path -Parent $projectRoot) "CloudMusicEdge-$suffix-v$version.exe" }
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
$work = Join-Path ([IO.Path]::GetTempPath()) ("CloudMusicEdge-setup-" + [guid]::NewGuid().ToString('N'))
$payload = Join-Path $work 'payload'
$payloadZip = Join-Path $work 'payload.zip'
$compiled = Join-Path $work 'CloudMusicEdge-Setup.exe'
$compiler = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) { throw '未找到 Windows .NET Framework C# 编译器。' }

try {
    New-Item -ItemType Directory -Path (Join-Path $payload 'extension'),(Join-Path $payload 'native-host'),(Join-Path $payload 'tools') -Force | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'extension') | Copy-Item -Destination (Join-Path $payload 'extension') -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot 'native-host\CloudMusicBridge.exe') -Destination (Join-Path $payload "native-host\CloudMusicBridge-$version.exe") -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot 'tools\Setup-NetEase.ps1') -Destination (Join-Path $payload 'tools\Setup-NetEase.ps1') -Force
    Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination (Join-Path $payload 'README.md') -Force
    if ($IncludeCollection) {
        $collection = if ($CollectionPath) { [IO.Path]::GetFullPath($CollectionPath) } else { Join-Path $env:LOCALAPPDATA 'CloudMusicEdge\plugin-collection.json' }
        if (-not (Test-Path -LiteralPath $collection)) { throw '当前电脑还没有 plugin-collection.json，无法生成个人迁移安装包。' }
        $collectionData = Get-Content -Raw -Encoding UTF8 -LiteralPath $collection | ConvertFrom-Json
        $items = if ($null -eq $collectionData.items) { @() } else { @($collectionData.items) }
        if (@(1, 2) -notcontains [int]$collectionData.version -or $items.Count -gt 2000) { throw '插件特藏文件版本或数量无效。' }
        if ((Get-Item -LiteralPath $collection).Length -gt 2MB) { throw '插件特藏文件异常过大。' }
        $allowedRootFields = @('version','items','playlists')
        foreach ($name in $collectionData.PSObject.Properties.Name) {
            if ($allowedRootFields -notcontains $name) { throw "插件特藏根对象包含非白名单字段：$name" }
        }
        $allowedFields = @('key','provider','kind','title','meta','availability','reasonCode','reasonText','canPlay','encryptedId','originalId','playlistId','mid','url','trackCount','addedAt')
        foreach ($item in $items) {
            foreach ($name in $item.PSObject.Properties.Name) {
                if ($allowedFields -notcontains $name) { throw "插件特藏包含非白名单字段：$name" }
            }
        }
        $playlists = if ($collectionData.PSObject.Properties.Name -notcontains 'playlists' -or $null -eq $collectionData.playlists) { @() } else { @($collectionData.playlists) }
        if ($playlists.Count -gt 100) { throw '插件自建歌单数量超过 100 个上限。' }
        $allowedPlaylistFields = @('id','name','createdAt','updatedAt','tracks')
        $playlistIds = @{}
        $playlistNames = @{}
        foreach ($playlist in $playlists) {
            foreach ($name in $playlist.PSObject.Properties.Name) {
                if ($allowedPlaylistFields -notcontains $name) { throw "插件自建歌单包含非白名单字段：$name" }
            }
            if ([string]$playlist.id -notmatch '^[a-fA-F0-9]{32}$' -or [string]::IsNullOrWhiteSpace([string]$playlist.name) -or ([string]$playlist.name).Length -gt 40) {
                throw '插件自建歌单 ID 或名称无效。'
            }
            $idKey = ([string]$playlist.id).ToLowerInvariant()
            $nameKey = ([string]$playlist.name).Trim().ToLowerInvariant()
            if ($playlistIds.ContainsKey($idKey) -or $playlistNames.ContainsKey($nameKey)) { throw '插件自建歌单存在重复 ID 或名称。' }
            $playlistIds[$idKey] = $true
            $playlistNames[$nameKey] = $true
            $tracks = if ($null -eq $playlist.tracks) { @() } else { @($playlist.tracks) }
            if ($tracks.Count -gt 500) { throw "插件自建歌单 $($playlist.name) 超过 500 首上限。" }
            foreach ($item in $tracks) {
                foreach ($name in $item.PSObject.Properties.Name) {
                    if ($allowedFields -notcontains $name) { throw "插件歌单歌曲包含非白名单字段：$name" }
                }
            }
        }
        New-Item -ItemType Directory -Path (Join-Path $payload 'migration') -Force | Out-Null
        Copy-Item -LiteralPath $collection -Destination (Join-Path $payload 'migration\plugin-collection.json') -Force
    }
    Get-ChildItem -LiteralPath $payload -Recurse -File | Where-Object { $_.Name -match 'qq\.key|settings\.json|netease-player\.json|\.pem$|\.pfx$|cookie' } | ForEach-Object {
        throw "安装包构建已中止：发现禁止携带的文件 $($_.FullName)"
    }
    Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $payloadZip -CompressionLevel Optimal
    & $compiler /nologo /target:winexe /optimize+ "/out:$compiled" "/resource:$payloadZip,CloudMusicEdge.Payload.zip" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll (Join-Path $projectRoot 'installer\SetupBootstrap.cs')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $compiled)) { throw '单文件安装器编译失败。' }
    $parent = Split-Path -Parent $resolvedOutput
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Move-Item -LiteralPath $compiled -Destination $resolvedOutput -Force
    Write-Host "单文件安装器已生成：$resolvedOutput" -ForegroundColor Green
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
