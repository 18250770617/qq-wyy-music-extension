# V1 验证记录

验证日期：2026-09-04

## 已自动验证

- C# Native Host 可由 Windows .NET Framework 编译。
- Native Messaging 4 字节长度帧可往返，未知动作被白名单拒绝。
- Manifest 为 V3，无 Cookie、webRequest 或默认全站 Host 权限。
- Manifest 公钥稳定生成扩展 ID `obokfjbjcodhoohmlpokcmcdjlijjbmk`。
- Host manifest 的 allowed origin、EXE 路径和当前用户注册表项一致。
- JavaScript 文件通过 Node 语法检查。
- 所有 PowerShell 工具通过 AST 语法检查；图形助手与命令行工具共用同一套脚本入口。
- 图形助手已完成无交互运行时冒烟测试，窗口控件和扩展路径均可正常初始化。
- 已在隔离的 Edge 临时配置中加载真实扩展；Edge 成功创建固定 ID 对应的 Manifest V3 Service Worker，证明 manifest、固定公钥和后台入口可被当前 Edge 接受。
- 压缩包在临时目录解压后可重新安装，注册路径能随文件夹位置更新；测试后已恢复桌面项目路径。
- 压缩包审计未发现 QQ Key、settings、PEM/PFX 或机器相关 Host manifest。
- 已从 npm 安装官方 ncm-cli 0.1.7，Host 可在真实全局安装目录发现它，并正确识别尚未配置 API Key 的状态。
- 已确认 Windows Package Manager 中 `shinchiro.mpv` 包存在，可供安装助手使用。

## 已进行界面验证

- 悬浮球初始状态、右侧展开方向、快捷控制栏和紧凑搜索卡片已在本地测试页渲染。
- 搜索加载态及两条模拟结果已验证。
- Shadow DOM 事件边界经过修正，悬浮球与快捷栏按钮不会互相误触。

## 需要用户账号验证

- 网易云开放平台配置、扫码登录、会员/版权歌曲播放与 mpv 实际音频输出。
- QQ 音乐真实 API Key 鉴权、账号个性化结果和官方 H5 页面播放。

这些验证需要向对应音乐服务发送用户凭据或使用真实账号，因此项目构建过程没有代替用户执行。
