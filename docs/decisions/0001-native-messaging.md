# ADR 0001：使用 Native Messaging

- 状态：已接受
- 决策：扩展与本地桥接使用 Edge Native Messaging，不使用 localhost HTTP 服务。
- 原因：无需开放端口或实现配对 Token；Edge 会按固定扩展 origin 限制调用方；项目移动后可通过重新注册修复路径。
- 取舍：每台电脑必须运行一次安装脚本，并在 Edge 手动加载已解压扩展。

