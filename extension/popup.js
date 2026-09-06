let provider = "netease";
let searchType = "song";
let playbackRequestPending = false;
const searchCache = new Map();
const latestSearchRequest = new Map();
const resultIcons = {
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
};

const $ = (id) => document.getElementById(id);

async function send(action, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type: "native", action, payload });
  if (!response?.ok) throw new Error(response?.error || "本地桥接返回错误");
  return response.data;
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
  rememberSearchScroll();
  provider = next;
  chrome.storage.local.set({ provider });
  document.querySelectorAll(".provider").forEach((button) => button.classList.toggle("active", button.dataset.provider === provider));
  $("player").classList.toggle("hidden", provider !== "netease");
  $("settings-title").textContent = provider === "netease" ? "网易云音乐" : "QQ 音乐";
  $("netease-settings").classList.toggle("hidden", provider !== "netease");
  $("qq-settings").classList.toggle("hidden", provider !== "qq");
  restoreSearchResults();
  refreshConnection();
}

function searchCacheKey(sourceProvider = provider, type = searchType) { return `${sourceProvider}:${type}`; }
function rememberSearchScroll() {
  const entry = searchCache.get(searchCacheKey());
  if (entry) entry.scrollTop = $("results").scrollTop;
}
function restoreSearchResults() {
  const entry = searchCache.get(searchCacheKey());
  $("keyword").value = entry?.keyword || "";
  if (entry) {
    renderResults(entry.items, entry.rawFallback);
    $("results").scrollTop = entry.scrollTop || 0;
  } else {
    $("results").innerHTML = '<div class="empty"><span>♫</span><p>搜索结果会按平台和分类保留</p></div>';
  }
  $("search").disabled = false;
}

function collectArrays(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) output.push(value);
  Object.values(value).forEach((child) => collectArrays(child, output));
  return output;
}

function neteaseAvailability(item) {
  if (item?.visible === false) return { availability: "blocked", playMode: null, reasonCode: "copyright", reasonText: "当前端无版权", canPlay: false };
  if (item?.playFlag === true) return { availability: "playable", playMode: "full", reasonCode: "full", reasonText: "完整播放", canPlay: true };
  if (item?.resConsumable === true && item?.userConsumable === true) return { availability: "trial", playMode: "full_trial", reasonCode: "full_trial", reasonText: "试听", canPlay: true };
  if (item?.freeTrailFlag === true) return { availability: "trial", playMode: "segment_trial", reasonCode: "segment_trial", reasonText: "片段试听", canPlay: true };
  if (Number(item?.songFee) === 1) return { availability: "blocked", playMode: null, reasonCode: "vip", reasonText: "需要音乐会员", canPlay: false };
  if (Number(item?.songFee) === 4) return { availability: "blocked", playMode: null, reasonCode: "digital_album", reasonText: "需购买数字专辑", canPlay: false };
  return { availability: "unknown", playMode: null, reasonCode: "permission", reasonText: "播放状态未知", canPlay: false };
}

function artistText(item) {
  const artists = item.artists || item.fullArtists || [];
  if (typeof artists === "string") return artists;
  return Array.isArray(artists) ? artists.map((artist) => typeof artist === "string" ? artist : artist?.name).filter(Boolean).join(" / ") : "";
}

function availabilityBadge(item) {
  if (item.provider !== "netease" || item.kind !== "song" || item.availability === "playable") return { label: "›", tone: "arrow", icon: "" };
  const labels = {
    copyright: "无版权",
    vip: "会员限制",
    digital_album: "需购买",
    permission: "状态未知",
    identity: "信息不全",
    full_trial: "试听",
    segment_trial: "片段"
  };
  if (item.availability === "trial") return { label: labels[item.reasonCode] || "试听", tone: "trial", icon: resultIcons.play };
  return { label: labels[item.reasonCode] || "不可播放", tone: item.availability === "unknown" ? "unknown" : "blocked", icon: resultIcons.lock };
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
    let access = type === "song" ? neteaseAvailability(item) : { availability: "playable", playMode: "full", reasonCode: "playlist", reasonText: "打开歌单", canPlay: true };
    if (type === "song" && (!/^[a-f\d]{32}$/i.test(String(encryptedId || "")) || !/^\d{1,20}$/.test(String(originalId || "")))) {
      access = { availability: "unknown", playMode: null, reasonCode: "identity", reasonText: "资源标识不完整", canPlay: false };
    }
    return {
      provider: "netease",
      kind: type,
      title: item.name || item.songName || item.playlistName || item.title || "未命名",
      meta: item.artistName || item.singerName || artistText(item) || item.creatorName || item.description || "网易云音乐",
      encryptedId: typeof encryptedId === "string" ? encryptedId : "",
      originalId: String(originalId || ""),
      visible: access.canPlay,
      ...access
    };
  }).filter((item) => type === "playlist" ? item.encryptedId : true);
}

function normalizeQQ(data, type) {
  const items = type === "song" ? (data.songs || data.songlist || data.trackList || []) : (data.playlists || []);
  return items.map((item) => ({
    provider: "qq",
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
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = `result${item.canPlay === false ? " is-unavailable" : item.availability === "trial" ? " is-trial" : ""}`;
    if (item.canPlay === false) button.setAttribute("aria-disabled", "true");
    button.innerHTML = `<span class="result-index">${index + 1}</span><span class="grow"><span class="result-title"></span><span class="result-meta"></span></span><span class="result-status"></span>`;
    button.querySelector(".result-title").textContent = item.title;
    button.querySelector(".result-meta").textContent = item.meta;
    const badge = availabilityBadge(item);
    const status = button.querySelector(".result-status");
    status.classList.add(`is-${badge.tone}`);
    if (badge.icon) status.insertAdjacentHTML("afterbegin", badge.icon);
    const statusText = document.createElement("span");
    statusText.textContent = badge.label;
    status.appendChild(statusText);
    if (item.canPlay === false) {
      button.title = item.reasonText || "当前不可播放";
      button.setAttribute("aria-label", `${item.title}，${item.meta}，不可播放：${item.reasonText || badge.label}`);
    }
    button.addEventListener("click", () => activateResult(item, button));
    fragment.appendChild(button);
  });
  root.appendChild(fragment);
}

async function runSearch() {
  const keyword = $("keyword").value.trim();
  if (!keyword) return showNotice("请先输入搜索关键词", true);
  const requestedProvider = provider;
  const requestedType = searchType;
  const requestedKey = searchCacheKey(requestedProvider, requestedType);
  const requestId = (latestSearchRequest.get(requestedKey) || 0) + 1;
  latestSearchRequest.set(requestedKey, requestId);
  showNotice("正在搜索…");
  $("search").disabled = true;
  try {
    const data = await send(`${requestedProvider}.search`, { keyword, type: requestedType });
    if (latestSearchRequest.get(requestedKey) !== requestId) return;
    const items = requestedProvider === "netease" ? normalizeNetease(data, requestedType) : normalizeQQ(data, requestedType);
    searchCache.set(requestedKey, { keyword, items, rawFallback: data.stdout, scrollTop: 0 });
    if (searchCacheKey() !== requestedKey) return;
    renderResults(items, data.stdout);
    showNotice(items.length ? `找到 ${items.length} 项结果` : "没有可显示的结果");
  } catch (error) {
    if (latestSearchRequest.get(requestedKey) === requestId && searchCacheKey() === requestedKey) showNotice(error.message, true);
  } finally {
    if (latestSearchRequest.get(requestedKey) === requestId && searchCacheKey() === requestedKey) $("search").disabled = false;
  }
}

async function activateResult(item, trigger) {
  if (item.canPlay === false) return showNotice(item.reasonText || "当前歌曲不可播放", true);
  if (playbackRequestPending) return showNotice("上一条播放请求正在处理，请稍候");
  playbackRequestPending = true;
  trigger?.classList.add("is-loading");
  trigger?.setAttribute("aria-busy", "true");
  try {
    if (item.provider === "qq") {
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
      const result = await send("netease.playPlaylist", item);
      const actual = result.payload?.state || {};
      $("track-title").textContent = actual.title || item.title;
      $("track-detail").textContent = actual.meta || `${item.meta} · 网易云歌单`;
      showNotice("歌单已开始播放");
    } else {
      const result = await send("netease.play", item);
      const actual = result.payload?.state || {};
      $("track-title").textContent = actual.title || item.title;
      $("track-detail").textContent = actual.meta || item.meta;
      showNotice(result.payload?.message || "已发送播放命令");
    }
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    playbackRequestPending = false;
    trigger?.classList.remove("is-loading");
    trigger?.removeAttribute("aria-busy");
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
  rememberSearchScroll();
  searchType = button.dataset.type;
  document.querySelectorAll(".type").forEach((item) => item.classList.toggle("active", item === button));
  restoreSearchResults();
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
