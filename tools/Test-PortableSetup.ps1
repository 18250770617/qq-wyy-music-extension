[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$InstallerPath)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$installer = [IO.Path]::GetFullPath($InstallerPath)
if (-not (Test-Path -LiteralPath $installer)) { throw "找不到安装器：$installer" }
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
$testRoot = Join-Path $tempBase ("CloudMusicEdge-installer-test-" + [guid]::NewGuid().ToString('N'))
$personalInstaller = Join-Path $testRoot 'CloudMusicEdge-Personal-Setup.exe'
$sampleCollection = Join-Path $testRoot 'plugin-collection.json'

function Invoke-ExtractTest([string]$Exe, [string]$Destination) {
    $process = Start-Process -FilePath $Exe -ArgumentList @('--extract-test', ('"' + $Destination + '"')) -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "安装器解包测试失败，退出码 $($process.ExitCode)" }
    if (-not (Test-Path -LiteralPath (Join-Path $Destination 'extension\manifest.json'))) { throw '安装器缺少扩展文件。' }
    if (-not (Test-Path -LiteralPath (Join-Path $Destination 'native-host\CloudMusicBridge-0.8.0.exe'))) { throw '安装器缺少版本化桥接程序。' }
    if (-not (Test-Path -LiteralPath (Join-Path $Destination 'tools\Setup-NetEase.ps1'))) { throw '安装器缺少网易云设置脚本。' }
    Get-ChildItem -LiteralPath $Destination -Recurse -File | Where-Object { $_.Name -match 'qq\.key|settings\.json|netease-player\.json|\.pem$|\.pfx$|cookie' } | ForEach-Object {
        throw "安装器含禁止携带的文件：$($_.FullName)"
    }
}

try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    $plainExtract = Join-Path $testRoot 'plain'
    Invoke-ExtractTest $installer $plainExtract
    if (Test-Path -LiteralPath (Join-Path $plainExtract 'migration\plugin-collection.json')) { throw '标准安装器不应携带个人特藏。' }

    $sampleTrack = [ordered]@{
        key='netease:song:1'; provider='netease'; kind='song'; title='迁移测试'; meta='本地测试'; availability='playable';
        reasonCode=''; reasonText=''; canPlay=$true; encryptedId='0123456789abcdef0123456789abcdef'; originalId='1'; addedAt='2026-01-01T00:00:00.0000000Z'
    }
    $sample = [ordered]@{
        version = 2
        items = @($sampleTrack)
        playlists = @([ordered]@{
            id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; name='迁移歌单'; createdAt='2026-01-01T00:00:00.0000000Z'; updatedAt='2026-01-01T00:00:00.0000000Z'; tracks=@($sampleTrack)
        })
    }
    [IO.File]::WriteAllText($sampleCollection, ($sample | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
    & (Join-Path $PSScriptRoot 'Build-PortableSetup.ps1') -OutputPath $personalInstaller -IncludeCollection -CollectionPath $sampleCollection
    $personalExtract = Join-Path $testRoot 'personal'
    Invoke-ExtractTest $personalInstaller $personalExtract
    $migrated = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $personalExtract 'migration\plugin-collection.json') | ConvertFrom-Json
    if ($migrated.version -ne 2 -or $migrated.items.Count -ne 1 -or $migrated.playlists.Count -ne 1 -or $migrated.playlists[0].tracks.Count -ne 1) { throw '个人迁移安装器的特藏与自建歌单副本无效。' }
    Write-Host '单文件安装器标准包、个人迁移包和敏感文件边界检查通过。' -ForegroundColor Green
} finally {
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
