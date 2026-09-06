const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(projectRoot, "extension", "floating.js"), "utf8");
const worker = fs.readFileSync(path.join(projectRoot, "extension", "service-worker.js"), "utf8");

for (const marker of [
  "mini-wave", "data-open-panel", "class=\"waveform\"", "class=\"bass-bars\"", "class=\"range progress\"",
  "volume-range", "data-search-type=\"playlist\"", "data-mode=\"library\"", "data-library-type=\"favorite\"",
  "searchCache", "libraryCache", "latestSearchRequest", "latestLibraryRequest", "pointercancel",
  "loadMoreLibrary", "class=\"load-more hidden\"", "netease.library", 'control("seek"', "schedulePoll", "host.isConnected", "placePanel"
]) {
  if (!floating.includes(marker)) throw new Error(`悬浮播放器缺少交互契约：${marker}`);
}
if (!worker.includes("chrome.runtime.connectNative")) throw new Error("状态轮询必须复用 Native Messaging 长连接");
if (worker.includes("floatingAllSites")) throw new Error("不得在未明确授权时启用全站注入");

const popup = fs.readFileSync(path.join(projectRoot, "extension", "popup.js"), "utf8");
if (!popup.includes("searchCache") || !popup.includes("restoreSearchResults")) throw new Error("工具栏搜索切换缺少结果缓存");

console.log("Floating player UI and persistent bridge contract: OK");
