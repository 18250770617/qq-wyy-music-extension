# CloudMusic Edge

一个面向 Windows + Microsoft Edge 的轻量音乐控制扩展。它提供可吸附到网页左右边缘的悬浮球，并通过安全的本地桥接连接网易云音乐或 QQ 音乐官方能力。

## 目前能做什么

### 网易云音乐

- 调用网易云官方 `@music163/ncm-cli` 搜索歌曲和歌单。
- 点击歌曲播放；读取歌单后将可播歌曲加入队列。
- 暂停、继续、停止、上一首、下一首、音量和播放状态。
- 使用官方配置向导和网易云 App 扫码登录。

### QQ 音乐

- 调用腾讯官方 QQ Music Skills API 搜索歌曲和歌单、读取歌单详情。
- 点击歌曲打开 QQ 音乐官方 H5 页面播放。
- API Key 用 Windows DPAPI 加密，只能由保存它的 Windows 用户解密。

QQ 的公开官方 API 当前不返回第三方音频播放流，因此 QQ 模式不伪装成插件内播放器，也不使用逆向接口绕过这一限制。

## 第一次安装

1. 解压整个 `CloudMusicEdge` 文件夹，不要只复制其中的扩展目录。
2. 推荐双击 `启动助手.cmd`，按窗口中的 1、2、3 步骤操作。也可以直接双击 `安装.cmd` 使用纯命令行流程。
3. “安装/修复本地桥接”会编译小型本地桥接并注册当前文件夹位置，不需要管理员权限。
4. 在 `edge://extensions` 打开“开发人员模式”。
5. 点击“加载解压缩的扩展”，选择助手复制的 `extension` 文件夹。
6. 固定工具栏上的 CloudMusic Edge 图标并打开它。

如果整个项目文件夹被移动，重新双击一次 `安装.cmd` 即可刷新连接路径。

## 启用网页悬浮球

1. 打开希望使用悬浮球的普通网页。
2. 点击 Edge 工具栏中的 CloudMusic Edge。
3. 点击“在当前网站启用悬浮球”，确认 Edge 的当前站点授权。
4. 页面右侧出现 `CM` 悬浮球。拖动后松手会自动吸附到最近边缘；单击展开快捷按钮，点击搜索按钮展开紧凑搜索卡片。

授权是按网站保存的。未授权网站不会注入脚本；扩展不会读取网页正文、表单、Cookie 或网络请求。Edge 内部页、扩展商店和部分受保护页面不允许扩展注入，这是浏览器的正常限制。

需要关闭时，在同一网站再次打开扩展，点击“关闭当前网站悬浮球”。

## 连接网易云音乐

1. 打开扩展，选择“网易云音乐”，点击“设置”。
2. 点击“安装/更新依赖”。助手会检查 Node.js 18+、安装官方 ncm-cli，并安装 mpv。
3. 点击“配置并登录”。按官方向导填写开放平台 App ID 和 Private Key，再用网易云 App 扫码。
4. 回到扩展点击右上角刷新按钮，看到“连接可用”后即可搜索播放。

API 凭证申请入口：<https://developer.music.163.com/st/developer/apply/account?type=INDIVIDUAL>。先完成个人开发者入驻审核，再到“应用管理”创建应用，最后把该应用的 App ID 和 Private Key 直接填入官方 `ncm-cli configure` 向导。会员身份不能替代开发者认证。

相关官方接口、签名与上线文档索引见 [`docs/netease-official-api.md`](docs/netease-official-api.md)。

本项目不会接触网易云 Private Key 或登录态，它们由 ncm-cli 自己管理。会员歌曲能否播放仍由账号权益和歌曲版权决定。

Windows 上通过 winget 安装的 mpv 有时不会自动加入 PATH；安装助手会补齐当前用户 PATH，桥接程序也会识别默认的 `C:\Program Files\MPV Player\mpv.exe`。若安装时 Edge 已经打开，请重启 Edge 后再检测。

`ncm-cli 0.1.7` 在 Windows 上的控制命令偶尔会先超时、随后才开始播放。0.3.0 仍由官方 CLI 完成鉴权、搜索、取流和歌单队列，但暂停、继续、停止、音量和播放进度会直接连接 CLI 创建的 `ncm-mpv` 本地管道，避免播放已经出声后控制状态丢失。扩展不会读取或接收播放 URL。

### 网页悬浮播放器

在普通网页中打开扩展，点击“在当前网站启用悬浮球”。悬浮球可以拖动并自动吸附左右边缘；单击会展开上一首、播放/暂停、下一首快捷操作，再点击末端按钮可打开完整播放器。完整播放器包含实时进度圆环、动态频谱、唱片动画、进度拖动、音量以及歌曲/歌单搜索。授权按网站保存，扩展不会读取网页正文；Edge 设置页、扩展页等内部页面不能注入。

## 连接 QQ 音乐

1. 打开扩展，选择“QQ 音乐”，点击“设置”。
2. 点击“打开官方 Key 页面”，登录 QQ 音乐并获取以 `qmk-` 开头的 Key。
3. 把 Key 粘贴到设置框，点击“安全保存并检测”。
4. 搜索歌曲或歌单；点击歌曲会打开 QQ 音乐官方播放页。

官方 Key 页面：<https://y.qq.com/n/ryqq_v2/qqmusic_skills>

## 检测、更新和卸载

- `启动助手.cmd`：图形化集中入口，可安装、检测、复制扩展路径、打开授权页面和重新打包。
- `检测连接.cmd`：检查 Host 注册路径、Node.js、ncm-cli、mpv 和两种 Provider 的配置状态。
- 网易云“安装/更新依赖”：运行 `npm install -g @music163/ncm-cli@latest`，由用户主动确认更新。
- 再次运行 `安装.cmd`：重新构建 Host 并修复移动后的路径。
- `卸载.cmd`：删除 Edge Native Messaging 注册，不删除扩展和用户配置。
- 完全清除 QQ Key：卸载后手动删除 `%LOCALAPPDATA%\CloudMusicEdge`。

## 复制到另一台电脑

运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Package.ps1
```

桌面会生成 `CloudMusicEdge-v0.3.0.zip`。压缩包不包含 QQ Key、网易云凭据或登录态。另一台 Windows 电脑解压后重新运行 `安装.cmd`，再分别完成账号授权即可。

## 安全设计

- 扩展和本机程序之间使用 Edge Native Messaging，不监听 localhost 端口。
- Host 只允许固定扩展 ID 调用，并拒绝所有未列入白名单的动作。
- 网易云关键词以独立进程参数传递，不拼接进 shell 命令。
- QQ 请求只发往 `https://a.y.qq.com`，播放入口只允许 QQ 官方 HTTPS 域名。
- QQ Key 不会回显给扩展、不写入日志、不放进环境变量或命令行。
- 扩展没有 Cookie、webRequest 或默认全站访问权限。

## 开发验证

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Test.ps1
```

测试覆盖 Manifest 权限、JavaScript 语法、C# 构建、Native Messaging 帧和动作白名单。真实账号登录、会员版权以及第三方官方服务可用性必须由用户在自己的账号环境中人工验证。

已完成网易云真实账号端到端验证时，还可运行 `node .\tests\native-live-netease.js`。它会搜索并播放一个歌单，严格检查播放、暂停、继续、下一首和状态，随后自动停止音乐。
