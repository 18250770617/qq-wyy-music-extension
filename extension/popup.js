const HOST = "com.cloudmusic.edge.bridge";
let provider = "netease";
let searchType = "song";
let port;
let sequence = 0;
const pending = new Map();

const $ = (id) => document.getElementById(id);

function connect() {
  if (port) return;
  port = chrome.runtime.connectNative(HOST);
  port.onMessage.addListener((message) => {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.ok ? waiter.resolve(message.data) : waiter.reject(new Error(message.error || "本地桥接返回错误"));
  });
  port.onDisconnect.addListener(() => {
    const message = chrome.runtime.lastError?.message || "本地桥接已断开";
    for (const waiter of pending.values()) waiter.reject(new Error(message));
    pending.clear();
    port = null;
    setConnection(false, "本地桥接未连接", "请运行文件夹中的“安装.cmd”");
  });
}

function send(action, payload = {}) {
  connect();
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${++sequence}`;
    pending.set(id, { resolve, reject });
    port.postMessage({ id, action, payload });
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error("操作超时，请重新检测连接"));
    }, 35000);
  });
}

function setConnection(ok, title, detail) {
  $("status-dot").className = `status-dot ${ok ? "ok" : "error"}`;
  $("status-title").textContent = title;
  $("status-detail").textContent = detail;
}

function showNotice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("hidden", !message);
  $("notice").style.background = error ? "#351d20" : "#31271b";
  $("notice").style.color = error ? "#ffaaaa" : "#f3c878";
}

async function refreshConnection() {
  $("status-dot").className = "status-dot checking";
  $("status-title").textContent = "正在检测本地连接…";
  try {
    const info = await send("system.doctor");
    const p = info.providers[provider];
    if (p.ready) {
      setConnection(true, provider === "qq" ? "配置已保存" : "连接可用", p.summary);
      showNotice("");
    } else {
      setConnection(false, "需要完成设置", p.summary);
    }
  } catch (error) {
    setConnection(false, "本地桥接未连接", "请运行文件夹中的“安装.cmd”");
    showNotice(error.message, true);
  }
}

function setProvider(next) {
  provider = next;
  chrome.storage.local.set({ provider });
  document.querySelectorAll(".provider").forEach((button) => button.classList.toggle("active", button.dataset.provider === provider));
  $("player").classList.toggle("hidden", provider !== "netease");
  $("settings-title").textContent = provider === "netease" ? "网易云音乐" : "QQ 音乐";
  $("netease-settings").classList.toggle("hidden", provider !== "netease");
  $("qq-settings").classList.toggle("hidden", provider !== "qq");
  $("results").innerHTML = '<div class="empty"><span>♫</span><p>搜索想听的歌曲或歌单</p></div>';
  refreshConnection();
}

function collectArrays(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) output.push(value);
  Object.values(value).forEach((child) => collectArrays(child, output));
  return output;
}

function normalizeNetease(data, type) {
  let payload = data.payload;
  if (!payload && data.stdout) {
    try { payload = JSON.parse(data.stdout); } catch { payload = null; }
  }
  const arrays = collectArrays(payload);
  const items = arrays.sort((a, b) => b.length - a.length)[0] || [];
  return items.map((item) => {
    const encryptedId = item.encryptedId || item.encrypted_id || item.id || item.resourceId;
    const originalId = item.originalId || item.original_id || item.originId || item.rawId;
    return {
      kind: type,
      title: item.name || item.songName || item.playlistName || item.title || "未命名",
      meta: item.artistName || item.singerName || item.creatorName || item.description || "网易云音乐",
      encryptedId: typeof encryptedId === "string" ? encryptedId : "",
      originalId: String(originalId || ""),
      visible: item.visible !== false && item.plLevel !== "none" && item.freeTrailFlag !== true
    };
  }).filter((item) => item.encryptedId);
}

function normalizeQQ(data, type) {
  const items = type === "song" ? (data.songs || data.songlist || data.trackList || []) : (data.playlists || []);
  return items.map((item) => ({
    kind: type,
    title: item.songName || item.dissName || "未命名",
    meta: item.singerName || item.creatorName || item.dissDesc || "QQ 音乐",
    songMid: item.songMid,
    playlistId: item.dissId,
    url: item.songH5Url
  }));
}

function officialQqUrl(candidate, songMid) {
  let url;
  try { url = new URL(candidate || ""); } catch { url = null; }
  if (url && url.protocol === "https:" && ["y.qq.com", "i2.y.qq.com"].includes(url.hostname)) return url.href;
  if (/^[A-Za-z0-9_-]{4,64}$/.test(songMid || "")) return `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(songMid)}`;
  throw new Error("QQ 音乐返回了无效的官方播放地址");
}

function renderResults(items, rawFallback) {
  const root = $("results");
  root.innerHTML = "";
  if (!items.length) {
    const message = rawFallback ? `未能识别结构化结果。\n${rawFallback.slice(0, 600)}` : "没有找到结果";
    root.innerHTML = `<div class="empty"><p></p></div>`;
    root.querySelector("p").textContent = message;
    return;
  }
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "result";
    button.innerHTML = `<span class="result-index">${index + 1}</span><span class="grow"><span class="result-title"></span><span class="result-meta"></span></span>`;
    button.querySelector(".result-title").textContent = item.title;
    button.querySelector(".result-meta").textContent = item.visible === false ? `${item.meta} · 暂不可播` : item.meta;
    button.disabled = item.visible === false;
    button.addEventListener("click", () => activateResult(item));
    root.appendChild(button);
  });
}

async function runSearch() {
  const keyword = $("keyword").value.trim();
  if (!keyword) return showNotice("请先输入搜索关键词", true);
  showNotice("正在搜索…");
  $("search").disabled = true;
  try {
    const data = await send(`${provider}.search`, { keyword, type: searchType });
    const items = provider === "netease" ? normalizeNetease(data, searchType) : normalizeQQ(data, searchType);
    renderResults(items, data.stdout);
    showNotice(items.length ? `找到 ${items.length} 项结果` : "没有可显示的结果");
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    $("search").disabled = false;
  }
}

async function activateResult(item) {
  try {
    if (provider === "qq") {
      if (item.kind === "playlist") {
        showNotice("正在读取歌单…");
        const data = await send("qq.playlistDetail", { playlistId: item.playlistId, page: 0 });
        renderResults(normalizeQQ(data, "song"));
        showNotice("");
      } else {
        const url = officialQqUrl(item.url, item.songMid);
        await chrome.tabs.create({ url });
      }
      return;
    }
    if (item.kind === "playlist") {
      showNotice("正在打开歌单…");
      await send("netease.playPlaylist", item);
      $("track-title").textContent = item.title;
      $("track-detail").textContent = `${item.meta} · 网易云歌单`;
      showNotice("歌单已开始播放");
    } else {
      await send("netease.play", item);
      $("track-title").textContent = item.title;
      $("track-detail").textContent = item.meta;
      showNotice("已发送播放命令");
    }
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function control(name, value) {
  try {
    const data = await send("netease.control", { name, value });
    if (name === "state") {
      $("track-detail").textContent = (data.stdout || "状态已刷新").trim().slice(0, 180);
    }
  } catch (error) {
    showNotice(error.message, true);
  }
}

document.querySelectorAll(".provider").forEach((button) => button.addEventListener("click", () => setProvider(button.dataset.provider)));
document.querySelectorAll(".type").forEach((button) => button.addEventListener("click", () => {
  searchType = button.dataset.type;
  document.querySelectorAll(".type").forEach((item) => item.classList.toggle("active", item === button));
}));
document.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", () => control(button.dataset.control)));
$("volume").addEventListener("change", (event) => control("volume", Number(event.target.value)));
$("search").addEventListener("click", runSearch);
$("keyword").addEventListener("keydown", (event) => { if (event.key === "Enter") runSearch(); });
$("refresh").addEventListener("click", refreshConnection);
$("setup").addEventListener("click", () => $("settings").showModal());
async function currentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("无法识别当前页面");
  const url = new URL(tab.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Edge 内部页面不支持悬浮球，请打开普通网页后重试");
  return { tab, pattern: `${url.origin}/*` };
}

async function updateFloatingButton() {
  try {
    const { pattern } = await currentSite();
    const granted = await chrome.permissions.contains({ origins: [pattern] });
    $("enable-floating").querySelector("strong").textContent = granted ? "关闭当前网站悬浮球" : "在当前网站启用悬浮球";
    $("enable-floating").dataset.granted = String(granted);
  } catch {
    $("enable-floating").querySelector("strong").textContent = "当前页面不支持悬浮球";
    $("enable-floating").disabled = true;
  }
}

$("enable-floating").addEventListener("click", async () => {
  try {
    const { tab, pattern } = await currentSite();
    const alreadyGranted = await chrome.permissions.contains({ origins: [pattern] });
    if (alreadyGranted) {
      await chrome.permissions.remove({ origins: [pattern] });
      const response = await chrome.runtime.sendMessage({ type: "unregisterSite", pattern, tabId: tab.id });
      if (!response?.ok) throw new Error(response?.error || "关闭悬浮球失败");
      showNotice("已关闭当前网站悬浮球");
      await updateFloatingButton();
      return;
    }
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) throw new Error("未授予当前网站权限");
    const response = await chrome.runtime.sendMessage({ type: "registerSite", pattern, tabId: tab.id });
    if (!response?.ok) throw new Error(response?.error || "注册悬浮球失败");
    showNotice("悬浮球已在当前网站启用，可关闭此弹窗使用");
    await updateFloatingButton();
  } catch (error) { showNotice(error.message, true); }
});
$("netease-install").addEventListener("click", () => send("netease.launchSetup", { mode: "install" }).catch((e) => showNotice(e.message, true)));
$("netease-configure").addEventListener("click", () => send("netease.launchSetup", { mode: "configure" }).catch((e) => showNotice(e.message, true)));
$("netease-tui").addEventListener("click", () => send("netease.launchSetup", { mode: "tui" }).catch((e) => showNotice(e.message, true)));
$("qq-key-page").addEventListener("click", () => send("qq.openKeyPage").catch((e) => showNotice(e.message, true)));
$("qq-save").addEventListener("click", async () => {
  const key = $("qq-key").value.trim();
  try {
    await send("settings.setQqKey", { key });
    $("qq-key").value = "";
    $("settings-message").textContent = "已加密保存，正在检测…";
    await send("qq.test");
    $("settings-message").textContent = "官方接口连接成功";
    await refreshConnection();
  } catch (error) { $("settings-message").textContent = error.message; }
});
$("qq-clear").addEventListener("click", async () => {
  await send("settings.clearQqKey");
  $("settings-message").textContent = "本机 Key 已清除";
  await refreshConnection();
});

chrome.storage.local.get({ provider: "netease" }, (value) => setProvider(value.provider));
updateFloatingButton();
