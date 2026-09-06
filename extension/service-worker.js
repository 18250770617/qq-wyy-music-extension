const SCRIPT_ID = "cloudmusic-floating-sites";
let nativePort;
const nativePending = new Map();

function failNativePending(message) {
  for (const pending of nativePending.values()) pending.reject(new Error(message));
  nativePending.clear();
}

function connectNative() {
  if (nativePort) return nativePort;
  nativePort = chrome.runtime.connectNative("com.cloudmusic.edge.bridge");
  nativePort.onMessage.addListener((response) => {
    const pending = nativePending.get(response?.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    nativePending.delete(response.id);
    pending.resolve(response);
  });
  nativePort.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError?.message || "本地桥接已断开";
    nativePort = undefined;
    failNativePending(error);
  });
  return nativePort;
}

function sendNative(action, payload) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timeoutMs = action === "netease.playPlaylist" || action === "netease.play" ? 60000 : 35000;
    const timer = setTimeout(() => {
      nativePending.delete(id);
      reject(new Error("本地桥接响应超时"));
    }, timeoutMs);
    nativePending.set(id, { resolve, reject, timer });
    try { connectNative().postMessage({ id, action, payload: payload || {} }); }
    catch (error) { clearTimeout(timer); nativePending.delete(id); reject(error); }
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
