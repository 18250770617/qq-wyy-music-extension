const SCRIPT_ID = "cloudmusic-floating-sites";
const CONTROL_ACTIONS = new Set([
  "netease.play",
  "netease.playPlaylist",
  "netease.queueAdd",
  "netease.control"
]);
const PLAYBACK_ACTIONS = new Set(["netease.play", "netease.playPlaylist"]);
let playbackTransactionPending = false;
const nativeChannels = {
  visualizer: { port: undefined, pending: new Map() },
  control: { port: undefined, pending: new Map() },
  data: { port: undefined, pending: new Map() }
};

function channelFor(action) {
  if (action === "netease.visualizer") return nativeChannels.visualizer;
  if (CONTROL_ACTIONS.has(action)) return nativeChannels.control;
  return nativeChannels.data;
}

function failNativePending(channel, message) {
  for (const pending of channel.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(new Error(message));
  }
  channel.pending.clear();
}

function connectNative(channel) {
  if (channel.port) return channel.port;
  const port = chrome.runtime.connectNative("com.cloudmusic.edge.bridge");
  channel.port = port;
  port.onMessage.addListener((response) => {
    const pending = channel.pending.get(response?.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    channel.pending.delete(response.id);
    pending.resolve(response);
  });
  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError?.message || "本地桥接已断开";
    if (channel.port === port) channel.port = undefined;
    failNativePending(channel, error);
  });
  return port;
}

function sendNativeRequest(action, payload) {
  return new Promise((resolve, reject) => {
    const channel = channelFor(action);
    const id = crypto.randomUUID();
    const timeoutMs = action === "netease.playPlaylist" || action === "netease.play" ? 60000 : 35000;
    const timer = setTimeout(() => {
      channel.pending.delete(id);
      reject(new Error("本地桥接响应超时"));
    }, timeoutMs);
    channel.pending.set(id, { resolve, reject, timer });
    try { connectNative(channel).postMessage({ id, action, payload: payload || {} }); }
    catch (error) { clearTimeout(timer); channel.pending.delete(id); reject(error); }
  });
}

function sendNative(action, payload) {
  const isPlayback = PLAYBACK_ACTIONS.has(action);
  if (isPlayback && playbackTransactionPending) return Promise.reject(new Error("上一条播放请求正在处理，请稍候"));
  if (isPlayback) playbackTransactionPending = true;
  return sendNativeRequest(action, payload).finally(() => {
    if (isPlayback) playbackTransactionPending = false;
  });
}

async function syncContentScript() {
  const { floatingSites = [] } = await chrome.storage.local.get({ floatingSites: [] });
  try { await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }); } catch {}
  if (!floatingSites.length) return;
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches: floatingSites,
    js: ["floating.js"],
    runAt: "document_idle",
    persistAcrossSessions: true
  }]);
}

chrome.runtime.onInstalled.addListener(syncContentScript);
chrome.runtime.onStartup.addListener(syncContentScript);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "native") {
    sendNative(message.action, message.payload).then((response) => sendResponse(response)).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "registerSite") {
    (async () => {
      const pattern = String(message.pattern || "");
      if (!/^https?:\/\/[^/]+\/\*$/.test(pattern)) throw new Error("站点规则无效");
      const granted = await chrome.permissions.contains({ origins: [pattern] });
      if (!granted) throw new Error("站点权限尚未授予");
      const { floatingSites = [] } = await chrome.storage.local.get({ floatingSites: [] });
      const next = [...new Set([...floatingSites, pattern])];
      await chrome.storage.local.set({ floatingSites: next });
      await syncContentScript();
      if (message.tabId) {
        try { await chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ["floating.js"] }); } catch {}
      }
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "unregisterSite") {
    (async () => {
      const pattern = String(message.pattern || "");
      const { floatingSites = [] } = await chrome.storage.local.get({ floatingSites: [] });
      await chrome.storage.local.set({ floatingSites: floatingSites.filter((item) => item !== pattern) });
      await syncContentScript();
      if (message.tabId) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: message.tabId }, func: () => {
            document.getElementById("cloudmusic-edge-floating")?.remove();
            delete globalThis.__cloudMusicEdgeFloating;
          }});
        } catch {}
      }
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
