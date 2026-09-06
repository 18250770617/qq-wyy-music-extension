const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(root, "extension", "floating.js"), "utf8");
const popup = fs.readFileSync(path.join(root, "extension", "popup.js"), "utf8");
const bridge = fs.readFileSync(path.join(root, "native-host", "BridgeHost.cs"), "utf8");

if (!/const neteaseTrackPageSize = 40/.test(floating)) {
  throw new Error("网易云歌曲首批加载量应限制为 40，避免一次渲染和传输过重");
}
if (!/const libraryInFlight = new Map\(\)/.test(floating)
    || !/if \(libraryInFlight\.has\(requestedType\)\) return libraryInFlight\.get\(requestedType\)/.test(floating)
    || !/if \(entry\.loading\) return entry\.loading/.test(floating)) {
  throw new Error("个人库或歌单缺少同键请求合并保护");
}
for (const [name, source] of [["悬浮窗", floating], ["工具栏弹窗", popup]]) {
  if (!/document\.createDocumentFragment\(\)/.test(source)) {
    throw new Error(`${name}的歌曲列表没有批量挂载 DOM`);
  }
}
if (!/NeteasePlaylistTracks[\s\S]{0,700}RunNcm\([^;]+30000, false\)/.test(bridge)
    || !/NeteaseLibrary[\s\S]{0,1000}RunNcm\([^;]+30000, false\)/.test(bridge)
    || !/if \(!includeRaw && payload != null\)/.test(bridge)) {
  throw new Error("大列表响应仍重复返回原始 stdout 和结构化 payload");
}

console.log("Playlist loading performance safeguards: OK");
