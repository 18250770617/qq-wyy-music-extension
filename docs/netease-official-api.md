# 网易云官方能力与接入边界

本项目只使用网易云音乐开放平台公开能力。扩展前端不保存 App ID、Private Key、登录令牌或 Cookie；签名、授权和接口调用统一委托给网易云官方 `@music163/ncm-cli`，本地桥接只执行白名单命令。

## 与当前功能直接相关的官方文档

- [网易云音乐 CLI（个人接入指南）](https://developer.music.163.com/st/developer/document?docId=f5b49eae2ab14104b279b6f77902ccb8)
- [创建应用](https://developer.music.163.com/st/developer/document?docId=cd3bd41543284c3684b61a7309164a4b)
- [API 接入指南](https://developer.music.163.com/st/developer/document?docId=5e595dd7aad44bceac72167706e28070)
- [应用签名 sign](https://developer.music.163.com/st/developer/document?docId=45aac8d12ccb4a98b14e2ea34a1a9cdb)
- [根据关键字搜索歌曲](https://developer.music.163.com/st/developer/document?docId=b175e0d52550427cbb7cd4735a9de765)
- [根据关键字搜索歌单](https://developer.music.163.com/st/developer/document?docId=7aae16d1be194e628666dd4ced17f283)
- [获取歌单详情](https://developer.music.163.com/st/developer/document?docId=730b0a8b80e745dea3b9f354eddb467e)
- [获取歌曲播放 URL](https://developer.music.163.com/st/developer/document?docId=3d2c9f695ff24f4ea37611614b7f7856)
- [获取登录二维码](https://developer.music.163.com/st/developer/document?docId=2bb12a93e71a4be0842243b930c2f33c)
- [数据验收与发布上线](https://developer.music.163.com/st/developer/document?docId=4edf1dd9ff644031820598306ca51197)

## 接入步骤

1. 完成个人开发者入驻。
2. 在“应用管理”创建应用并妥善保存 Private Key。
3. 按应用控制台实际开放范围申请所需 API 组；文档中存在的接口不代表应用默认拥有权限。
4. 在本机官方向导执行 `ncm-cli configure`，随后执行 `ncm-cli login` 扫码授权。
5. 使用 `检测连接.cmd` 验证 Node.js、ncm-cli、mpv、API 凭证和登录态。

## 费用与会员

插件本身不收费。开放平台公开个人接入材料未将音乐会员描述为 API 接入凭证；会员身份不能替代开发者入驻、应用创建或接口授权。歌曲最终能否播放、可用音质和付费内容范围，以登录账号在网易云官方服务中的权益及版权状态为准。

