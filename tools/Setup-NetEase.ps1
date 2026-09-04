[CmdletBinding()]
param([ValidateSet('Install','Configure','Tui')][string]$Mode = 'Install')

$ErrorActionPreference = 'Stop'
function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($env:Path, $machine, $user) -join ';'
    $env:Path = (($parts -split ';' | Where-Object { $_ } | Select-Object -Unique) -join ';')
}
function Add-ToUserPath([string]$Directory) {
    if (-not $Directory -or -not (Test-Path -LiteralPath $Directory)) { return }
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($userPath -split ';' | Where-Object { $_ })
    if ($entries | Where-Object { $_.TrimEnd('\') -ieq $Directory.TrimEnd('\') }) { return }
    [Environment]::SetEnvironmentVariable('Path', (($entries + $Directory) -join ';'), 'User')
    Write-Host "已将 mpv 目录加入当前用户 PATH：$Directory" -ForegroundColor DarkGray
}
function Require-Command([string]$Name, [string]$Help) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw $Help }
}

Write-Host '网易云官方 ncm-cli 助手' -ForegroundColor Cyan
Write-Host '本工具不会读取或保存 App ID、Private Key 和网易云登录态。' -ForegroundColor DarkGray

if ($Mode -eq 'Install') {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Require-Command winget '未找到 Node.js 或 winget。请从 https://nodejs.org 安装 Node.js 18+。'
        Write-Host '正在通过 winget 安装 Node.js LTS，需要你确认系统提示…'
        winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
        Refresh-Path
    }
    $nodeVersion = [version]((node --version).TrimStart('v'))
    if ($nodeVersion.Major -lt 18) { throw 'ncm-cli 要求 Node.js 18 或更高版本。' }

    Require-Command npm 'npm 不可用，请重新安装 Node.js。'
    Write-Host '正在从 npm 官方仓库安装/更新 @music163/ncm-cli…'
    npm install -g '@music163/ncm-cli@latest'
    if ($LASTEXITCODE -ne 0) { throw 'ncm-cli 安装失败。' }
    Refresh-Path

    if (-not (Get-Command mpv -ErrorAction SilentlyContinue)) {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            Write-Host '正在通过 winget 安装 mpv…'
            winget install --id shinchiro.mpv -e --accept-package-agreements --accept-source-agreements
            $mpvInstallExitCode = $LASTEXITCODE
            Refresh-Path
        } else {
            Write-Host '未找到 mpv 和 winget。请从 https://mpv.io/installation/ 安装 mpv。' -ForegroundColor Yellow
        }
    }
    if (-not (Get-Command mpv -ErrorAction SilentlyContinue)) {
        $knownMpv = @(
            (Join-Path $env:ProgramFiles 'MPV Player\mpv.exe'),
            (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\mpv.exe')
        ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if ($knownMpv) {
            Add-ToUserPath (Split-Path -Parent $knownMpv)
            Refresh-Path
        }
    }
    if (-not (Get-Command mpv -ErrorAction SilentlyContinue)) {
        if ($mpvInstallExitCode) { throw "mpv 安装失败（winget 退出码 $mpvInstallExitCode）。" }
        Write-Host 'mpv 已安装但当前终端仍无法定位；请重开 Edge，或重新运行本助手。' -ForegroundColor Yellow
    }
    Write-Host '依赖安装完成。下一步请选择“配置并登录”，或运行：ncm-cli configure' -ForegroundColor Green
}
elseif ($Mode -eq 'Configure') {
    Refresh-Path
    Require-Command ncm-cli '未找到 ncm-cli，请先选择“安装/更新依赖”。'
    Write-Host '即将进入网易云官方配置向导。私钥输入由 ncm-cli 直接处理。'
    ncm-cli configure
    if ($LASTEXITCODE -ne 0) { throw 'ncm-cli 配置未完成。' }
    Write-Host '即将进入网易云官方扫码登录。'
    ncm-cli login
}
else {
    Refresh-Path
    Require-Command ncm-cli '未找到 ncm-cli，请先安装。'
    ncm-cli tui
}
