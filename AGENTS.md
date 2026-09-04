# CloudMusic Edge 开发约定

- 项目目标：提供可携带、可诊断的 Edge 音乐控制扩展。
- `extension/` 只负责界面和消息编排，不保存服务端账号 Cookie，不直接调用逆向接口。
- `native-host/` 是唯一允许访问本机命令和官方服务的模块；所有动作必须在白名单中，并校验输入。
- 网易云集成只能调用官方 `@music163/ncm-cli`；QQ 音乐只能调用腾讯公开的 `a.y.qq.com` Skills API 或打开官方 H5 页面。
- 密钥不得写入仓库、日志、命令行参数或压缩包。QQ API Key 使用 Windows DPAPI 加密到当前用户目录。
- 新增 Provider 时实现相同的搜索、诊断和动作契约，不得把平台特例塞进公共消息层。
- 修改安装逻辑后必须重新运行 `tools/Build.ps1`、`tools/Test.ps1` 和 `tools/Doctor.ps1`。

