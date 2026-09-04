const SCRIPT_ID = "cloudmusic-floating-sites";

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
    chrome.runtime.sendNativeMessage("com.cloudmusic.edge.bridge", {
      id: crypto.randomUUID(), action: message.action, payload: message.payload || {}
    }).then((response) => sendResponse(response)).catch((error) => sendResponse({ ok: false, error: error.message }));
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
