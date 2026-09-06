const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(projectRoot, "extension", "floating.js"), "utf8");
const worker = fs.readFileSync(path.join(projectRoot, "extension", "service-worker.js"), "utf8");

for (const marker of [
  "mini-spectrum", "data-open-panel", "class=\"spectrum\"", "class=\"range progress\"",
  "class=\"volume\"", "data-type=\"playlist\"", 'control("seek"', "schedulePoll"
]) {
  if (!floating.includes(marker)) throw new Error(`悬浮播放器缺少交互契约：${marker}`);
}
if (!worker.includes("chrome.runtime.connectNative")) throw new Error("状态轮询必须复用 Native Messaging 长连接");
if (worker.includes("floatingAllSites")) throw new Error("不得在未明确授权时启用全站注入");

console.log("Floating player UI and persistent bridge contract: OK");
