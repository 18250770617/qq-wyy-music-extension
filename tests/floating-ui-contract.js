const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(projectRoot, "extension", "floating.js"), "utf8");
const worker = fs.readFileSync(path.join(projectRoot, "extension", "service-worker.js"), "utf8");

for (const marker of [
  "mini-wave", "data-open-panel", "class=\"waveform\"", "class=\"bass-bars\"", "class=\"range progress\"",
  "volume-range", "data-search-type=\"playlist\"", "data-mode=\"library\"", "data-library-type=\"favorite\"",
  "searchCache", "libraryCache", "latestSearchRequest", "latestLibraryRequest", "pointercancel",
  "loadMoreLibrary", "library-load-more hidden", "netease.library", 'control("seek"', "schedulePoll", "host.isConnected", "placePanel",
  "grid-template-columns", "player-column", "browser-column", "playlist-pane hidden", "playlistCache", "latestPlaylistRequest",
  "openPlaylist", "loadPlaylist", "playlist-back", "playlist-load-more", "qq.playlistDetail", "netease.playlistTracks",
  "floatingAppearance", "applyAppearance", "appearance-opacity", "appearance-size", "data-theme-option", "data-font",
  "const above =", "else if (below", 'panel.dataset.placement = placement', "setPanelOpen(false)",
  "netease.visualizer", "live-spectrum", "renderVisualizerBands", 'mode: "stop"', "10 频段实时",
  "spectrum-dock hidden", "spectrum-dock-bar", "appearance-dock", "appearance-dock-height", "dockEnabled", "dockHeight",
  "音源：当前音乐（不采集系统声音）", "--spectrum-dock-height", "当前音乐 · 10 频段实时",
  "--viewport-width", "--viewport-height", "syncViewportStyles"
]) {
  if (!floating.includes(marker)) throw new Error(`悬浮播放器缺少交互契约：${marker}`);
}
if (!/if \(!drag\.moved[\s\S]{0,180}setPanelOpen\(false\)/.test(floating)) throw new Error("拖动悬浮球时没有关闭播放器面板");
if (!/const edgeSnapDistance = 64/.test(floating) || !/leftDistance <= edgeSnapDistance[\s\S]{0,260}rightDistance <= edgeSnapDistance[\s\S]{0,260}clamp\(rect\.left, 0, viewportWidth\(\) - 44\)/.test(floating)) {
  throw new Error("悬浮球必须仅在靠近边缘时吸附，并允许停留在页面中间");
}
if (!/snapSide === "left" \? 6 : snapSide === "right" \? viewportWidth\(\) - 50/.test(floating) || !/snapSide = null/.test(floating)) {
  throw new Error("窗口尺寸改变时必须保持已吸附侧，同时保留中间自由位置");
}
if (!/document\.documentElement\.clientWidth \|\| innerWidth/.test(floating)) throw new Error("悬浮播放器必须排除滚动条宽度，避免贴边元素被裁切");
if (!/setProperty\("--viewport-width", `\$\{viewportWidth\(\)\}px`\)[\s\S]{0,120}setProperty\("--viewport-height", `\$\{viewportHeight\(\)\}px`\)/.test(floating)) throw new Error("CSS 响应式宽高必须与无滚动条的真实视口同步");
if (!/panel\.offsetWidth \|\| bounds\.width[\s\S]{0,120}panel\.offsetHeight \|\| bounds\.height/.test(floating)) throw new Error("面板定位必须忽略开场缩放动画，避免最终尺寸越界");
if (!/if \(item\.kind === "playlist"\) return openPlaylist\(item\)/.test(floating)) throw new Error("歌单项目必须先进入详情，不能直接播放");
if (!/width:min\(660px[\s\S]*height:min\(404px/.test(floating)) throw new Error("桌面播放器尺寸未收敛为紧凑双栏");
if (!/@media\(max-width:640px\)[\s\S]{0,220}grid-template-columns:minmax\(0,1fr\)/.test(floating)) throw new Error("窄屏布局必须覆盖桌面双列，确保浏览栏进入第二行");
if (!/\.appearance-panel\{[\s\S]{0,180}max-height:calc\(100% - 58px\);overflow:auto/.test(floating)) throw new Error("短窗口中的外观设置必须可独立滚动");
if (!/width:clamp\(520px,62vw,1080px\)[\s\S]{0,120}height:var\(--spectrum-dock-height\)/.test(floating)) throw new Error("页面底部频谱坞没有扩展到长频谱尺寸");
if (!/\.spectrum-dock\{pointer-events:none;[\s\S]{0,500}background:none/.test(floating)) throw new Error("页面底部频谱坞仍有整块背景或会拦截网页点击");
if (!/\.spectrum-dock-actions\{[^}]*pointer-events:auto/.test(floating)) throw new Error("透明频谱坞的操作按钮不可点击");
if (!/\.spectrum-dock-bar:before\{[^}]*bottom:2px[^}]*transform-origin:bottom/.test(floating) || !/\.spectrum-dock-bar:after\{display:none\}/.test(floating)) throw new Error("页面底部频谱必须只从底边向上生长");
if (!/\.spectrum-dock-actions\{[^}]*border:0[^}]*background:none[^}]*box-shadow:none/.test(floating) || !/\.spectrum-dock-actions \.icon,[^}]*background:transparent/.test(floating)) throw new Error("底部频谱操作按钮仍有容器或按钮背景");
if (!/appearance-opacity[^>]*min="32"/.test(floating)) throw new Error("背景透明度下限没有放宽到 32%");
if (!/dockHeight:\s*clamp\(Number\(next\.dockHeight\) \|\| 112, 72, 180\)/.test(floating)) throw new Error("底部频谱高度持久化值缺少范围校验");
if (!/panel\.classList\.contains\("show"\) \|\| appearance\.dockEnabled/.test(floating)) throw new Error("面板关闭后底部频谱无法继续使用实时频段");
if (!/querySelectorAll\("\.spectrum-dock-bar"\)[\s\S]{0,300}style\.setProperty\("--level"/.test(floating)) throw new Error("真实频段数据没有驱动底部单侧频谱");
if (!/squareSignedDifference[\s\S]{0,1600}spectralSquare[\s\S]{0,500}riseSquare/.test(floating) || !/expandSpectrumLevels[\s\S]{0,900}squaredDifference/.test(floating)) {
  throw new Error("实时频谱没有采用频段差值与瞬态差值的平方增强");
}
if (!worker.includes("chrome.runtime.connectNative")) throw new Error("状态轮询必须复用 Native Messaging 长连接");
if (worker.includes("floatingAllSites")) throw new Error("不得在未明确授权时启用全站注入");

const popup = fs.readFileSync(path.join(projectRoot, "extension", "popup.js"), "utf8");
if (!popup.includes("searchCache") || !popup.includes("restoreSearchResults")) throw new Error("工具栏搜索切换缺少结果缓存");

console.log("Floating player UI and persistent bridge contract: OK");
