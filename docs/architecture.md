# 系统架构

## 形态与技术栈

项目是一个轻量双应用结构：原生 JavaScript 的 Edge Manifest V3 扩展，以及一个基于 Windows .NET Framework 的单文件 Native Messaging Host。无数据库、无后台服务、无监听端口。

```text
Edge popup
   │ chrome.runtime.connectNative
   ▼
CloudMusicBridge.exe
   ├─ NetEaseProvider ── 官方 ncm-cli ── mpv
   └─ QQProvider ─────── 官方 a.y.qq.com API / QQ H5
```

## 模块边界

- `extension/`：拥有平台选择和非敏感 UI 偏好；发送结构化动作；不运行命令、不保存密钥。
- `native-host/`：拥有动作白名单、输入校验、进程执行、官方 HTTP 调用和 DPAPI 密钥存储。
- `tools/`：构建、注册、卸载、诊断、网易云安装与打包；不保存用户配置。
- `docs/`：范围、架构、设计、安装与安全说明。

## 消息契约

请求统一为 `{ id, action, payload }`，响应统一为 `{ id, ok, data?, error? }`。动作分为 `system.*`、`settings.*`、`netease.*`、`qq.*`。未知动作直接拒绝。

## 数据与生命周期

- 扩展本地存储：只保存所选 Provider。
- `%LOCALAPPDATA%\CloudMusicEdge\qq.key`：DPAPI 加密 QQ API Key。
- 网易云配置与登录：ncm-cli 自有目录。
- 卸载脚本只移除注册表连接，不删除用户密钥；如需删除，用户可手动删除本地配置目录。

## 依赖规则

- Popup 只能通过消息契约访问 Provider。
- Provider 不互相调用。
- 所有外部 URL 必须是 HTTPS 且域名在固定允许列表内。
- 所有 CLI 参数独立传给目标进程，不拼接进 PowerShell/cmd 用户输入。

## 扩展方式

新增官方 Provider 时，在 Host 中新增动作处理和诊断，在 Popup 中增加独立渲染映射。只有多个 Provider 已产生稳定重复后才抽取公共映射。

