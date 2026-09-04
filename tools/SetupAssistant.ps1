[CmdletBinding()]
param([switch]$SmokeTest)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()

$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionPath = Join-Path $projectRoot 'extension'
$hostExe = Join-Path $projectRoot 'native-host\CloudMusicBridge.exe'
$registryPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.cloudmusic.edge.bridge'

$form = New-Object Windows.Forms.Form
$form.Text = 'CloudMusic Edge 设置助手'
$form.Size = New-Object Drawing.Size(720, 610)
$form.MinimumSize = New-Object Drawing.Size(720, 610)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [Drawing.Color]::FromArgb(15, 17, 22)
$form.ForeColor = [Drawing.Color]::White
$form.Font = New-Object Drawing.Font('Microsoft YaHei UI', 9)

$title = New-Object Windows.Forms.Label
$title.Text = 'CloudMusic Edge'
$title.Font = New-Object Drawing.Font('Microsoft YaHei UI', 22, [Drawing.FontStyle]::Bold)
$title.Location = New-Object Drawing.Point(28, 22)
$title.AutoSize = $true
$form.Controls.Add($title)

$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = '本地安装、连接检测与更新'
$subtitle.ForeColor = [Drawing.Color]::FromArgb(151, 158, 172)
$subtitle.Location = New-Object Drawing.Point(32, 65)
$subtitle.AutoSize = $true
$form.Controls.Add($subtitle)

$statusBox = New-Object Windows.Forms.TextBox
$statusBox.Location = New-Object Drawing.Point(30, 98)
$statusBox.Size = New-Object Drawing.Size(640, 150)
$statusBox.Multiline = $true
$statusBox.ReadOnly = $true
$statusBox.ScrollBars = 'Vertical'
$statusBox.BackColor = [Drawing.Color]::FromArgb(25, 28, 35)
$statusBox.ForeColor = [Drawing.Color]::FromArgb(226, 230, 237)
$statusBox.BorderStyle = 'FixedSingle'
$form.Controls.Add($statusBox)

function Add-Button([string]$Text, [int]$X, [int]$Y, [scriptblock]$Action, [bool]$Primary = $false) {
    $button = New-Object Windows.Forms.Button
    $button.Text = $Text
    $button.Location = New-Object Drawing.Point($X, $Y)
    $button.Size = New-Object Drawing.Size(200, 45)
    $button.FlatStyle = 'Flat'
    $button.FlatAppearance.BorderSize = 1
    $button.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(60, 66, 78)
    $button.BackColor = if ($Primary) { [Drawing.Color]::FromArgb(236, 65, 65) } else { [Drawing.Color]::FromArgb(31, 35, 43) }
    $button.ForeColor = [Drawing.Color]::White
    $button.Cursor = 'Hand'
    $button.Add_Click($Action)
    $form.Controls.Add($button)
}

function Start-Helper([string]$ScriptName, [string]$Arguments = '') {
    $script = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path -LiteralPath $script)) { throw "找不到工具脚本：$ScriptName" }
    $argumentLine = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" $Arguments"
    Start-Process powershell.exe -ArgumentList $argumentLine -WindowStyle Normal
}

function Refresh-Status {
    $lines = New-Object Collections.Generic.List[string]
    if (Test-Path -LiteralPath $registryPath) {
        $registered = (Get-Item -LiteralPath $registryPath).GetValue('')
        if ($registered -and (Test-Path -LiteralPath $registered)) { $lines.Add('✓ 本地桥接已注册，路径有效') }
        else { $lines.Add('! 本地桥接路径已失效，请点击“安装/修复本地桥接”') }
    } else { $lines.Add('! 本地桥接尚未注册') }

    if (Test-Path -LiteralPath $hostExe) {
        try {
            $result = & $hostExe --self-test | ConvertFrom-Json
            $lines.Add('✓ 桥接程序可运行')
            $lines.Add($(if ($result.environment.node) { '✓ Node.js 已安装' } else { '! Node.js 未安装' }))
            $lines.Add($(if ($result.environment.ncmCli) { '✓ 网易云官方 ncm-cli 已安装' } else { '! ncm-cli 未安装' }))
            $lines.Add($(if ($result.environment.mpv) { '✓ mpv 已安装' } else { '! mpv 未安装，网易云暂不能输出音频' }))
            $lines.Add("网易云：$($result.providers.netease.summary)")
            $lines.Add("QQ 音乐：$($result.providers.qq.summary)")
        } catch { $lines.Add("! 桥接检测失败：$($_.Exception.Message)") }
    } else { $lines.Add('! 桥接程序尚未构建') }
    $statusBox.Lines = $lines.ToArray()
}

Add-Button '1. 安装/修复本地桥接' 30 270 {
    try { & (Join-Path $PSScriptRoot 'Install.ps1') -NoOpenEdge; Refresh-Status; [Windows.Forms.MessageBox]::Show('本地桥接已安装或修复。', 'CloudMusic Edge') | Out-Null }
    catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message, '安装失败', 'OK', 'Error') | Out-Null }
} $true

Add-Button '2. 打开 Edge 扩展页' 250 270 { Start-Process 'msedge.exe' 'edge://extensions' }
Add-Button '3. 复制扩展目录' 470 270 { [Windows.Forms.Clipboard]::SetText($extensionPath); [Windows.Forms.MessageBox]::Show("扩展目录已复制：`n$extensionPath", 'CloudMusic Edge') | Out-Null }
Add-Button '安装/更新网易云依赖' 30 335 { Start-Helper 'Setup-NetEase.ps1' '-Mode Install' }
Add-Button '配置并登录网易云' 250 335 { Start-Helper 'Setup-NetEase.ps1' '-Mode Configure' }
Add-Button '打开网易云终端播放器' 470 335 { Start-Helper 'Setup-NetEase.ps1' '-Mode Tui' }
Add-Button '打开 QQ 官方 Key 页面' 30 400 { Start-Process 'https://y.qq.com/n/ryqq_v2/qqmusic_skills' }
Add-Button '运行完整连接检测' 250 400 { Start-Helper 'Doctor.ps1' }
Add-Button '重新生成便携压缩包' 470 400 { Start-Helper 'Package.ps1' }
Add-Button '刷新状态' 30 465 { Refresh-Status } $true
Add-Button '打开项目文件夹' 250 465 { Start-Process explorer.exe $projectRoot }
Add-Button '查看中文说明' 470 465 { Start-Process (Join-Path $projectRoot 'README.md') }

$notice = New-Object Windows.Forms.Label
$notice.Text = '安全提示：助手不会读取或显示网易云私钥、登录态或 QQ API Key。加载扩展和账号授权必须由你本人确认。'
$notice.ForeColor = [Drawing.Color]::FromArgb(151, 158, 172)
$notice.Location = New-Object Drawing.Point(31, 530)
$notice.Size = New-Object Drawing.Size(640, 35)
$form.Controls.Add($notice)

if ($SmokeTest) {
    Refresh-Status
    [pscustomobject]@{
        ready = $true
        controls = $form.Controls.Count
        extensionPathExists = Test-Path -LiteralPath $extensionPath
        statusLines = $statusBox.Lines.Count
    } | ConvertTo-Json -Compress
    $form.Dispose()
    return
}

$form.Add_Shown({ Refresh-Status })
[void]$form.ShowDialog()
