const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(root, "extension", "floating.js"), "utf8");
const popup = fs.readFileSync(path.join(root, "extension", "popup.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "extension", "service-worker.js"), "utf8");

for (const [name, source, transport] of [
  ["悬浮播放器", floating, "native"],
  ["工具栏弹窗", popup, "send"]
]) {
  if (!/let playbackRequestPending = false/.test(source)
      || !/if \(playbackRequestPending\)[\s\S]{0,180}正在处理/.test(source)
      || !/setAttribute\("aria-busy", "true"\)/.test(source)
      || !/finally[\s\S]{0,220}playbackRequestPending = false/.test(source)) {
    throw new Error(`${name}缺少播放请求单飞与加载态保护`);
  }
  const playCall = new RegExp(`${transport}\\(\\"netease\\.play\\"`);
  if (!playCall.test(source)) throw new Error(`${name}没有受测的网易云播放调用`);
}
if (!/playWholePlaylist\(entry, trigger\)[\s\S]{0,120}playbackRequestPending/.test(floating)) {
  throw new Error("悬浮播放器的整张歌单播放没有纳入重复点击保护");
}
if (!/const key = playlistKey\(entry\.playlist\)/.test(floating)
    || !/if \(activePlaylistKey === key\) playlistMessage\.textContent/.test(floating)
    || !/if \(trigger\)[\s\S]{0,90}removeAttribute\("aria-busy"\)[\s\S]{0,100}if \(activePlaylistKey === key\)/.test(floating)) {
  throw new Error("旧歌单的播放响应可能覆盖当前歌单按钮或提示");
}
if (popup.includes("connectNative") || !/chrome\.runtime\.sendMessage\(\{ type: "native", action, payload \}\)/.test(popup)) {
  throw new Error("工具栏弹窗绕过了后台共享通道和全局播放锁");
}
if (!/const PLAYBACK_ACTIONS/.test(worker)
    || !/if \(isPlayback && playbackTransactionPending\) return Promise\.reject/.test(worker)
    || !/sendNativeRequest\(action, payload\)\.finally/.test(worker)) {
  throw new Error("后台缺少跨悬浮窗和工具栏弹窗的播放事务锁");
}

console.log("Playback repeated-click guard: OK");
