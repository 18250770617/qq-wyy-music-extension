(() => {
  if (globalThis.__cloudMusicEdgeFloating) return;
  globalThis.__cloudMusicEdgeFloating = true;

  const svg = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 6l-9 6 9 6z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 6l9 6-9 6z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM14 5h4v14h-4z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><path d="M7 7h10v10H7z"/></svg>',
    panel: '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l4.5 4.5"/></svg>',
    library: '<svg viewBox="0 0 24 24"><path d="M5 5h12v14H5zM9 9h8v10M9 9V5"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M5 10v4h4l5 4V6l-5 4zM17 9a4 4 0 010 6"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M19 8a7 7 0 10.4 7M19 4v4h-4"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>'
  };
  const waveBars = Array.from({ length: 66 }, (_, i) => {
    const height = 5 + Math.round((Math.sin(i * 1.71) + 1) * 7 + (i % 7 === 0 ? 8 : 0));
    return `<i style="--i:${i};--h:${height}px"></i>`;
  }).join("");
  const bassBars = Array.from({ length: 18 }, (_, i) => {
    const height = 10 + Math.round((Math.sin(i * .83) + 1) * 15);
    return `<i style="--i:${i};--h:${height}px"></i>`;
  }).join("");
  const miniBars = Array.from({ length: 3 }, (_, i) => `<i style="--i:${i};--h:${7 + (i % 2) * 5}px"></i>`).join("");

  const host = document.createElement("div");
  host.id = "cloudmusic-edge-floating";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:calc(100vw - 56px);top:38vh;width:48px;height:48px;pointer-events:auto";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}button,input{font:13px/1.35 Inter,"Segoe UI",system-ui,"Microsoft YaHei",sans-serif}button{border:0;color:inherit;cursor:pointer}svg{width:18px;height:18px;fill:currentColor;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.shell{--accent:#ff5361;--seek:0%;--volume:70%;color:#f8f9fb}.hidden{display:none!important}
      .orb{position:absolute;width:48px;height:48px;padding:0;border:1px solid #ffffff2b;border-radius:50%;background:#14171df2;color:#fff;box-shadow:0 12px 34px #0007,inset 0 1px #ffffff1c;cursor:grab;user-select:none;transition:transform .18s,box-shadow .18s}.orb:hover{transform:scale(1.055);box-shadow:0 16px 42px #0009,0 0 0 4px #ffffff09}.orb:active{cursor:grabbing}.orb-ring{position:absolute;inset:-1px;border-radius:inherit;background:conic-gradient(var(--accent) var(--seek),transparent 0);mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0)}.mini-wave{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:3px}.mini-wave i{width:3px;height:var(--h);border-radius:3px;background:linear-gradient(#fff,var(--accent));animation:miniPulse .65s ease-in-out calc(var(--i)*-.1s) infinite alternate;animation-play-state:paused}.playing .mini-wave i{animation-play-state:running}
      .dock{pointer-events:none;position:absolute;top:2px;display:flex;gap:2px;padding:4px;border:1px solid #ffffff21;border-radius:18px;background:#11141aee;box-shadow:0 15px 40px #0008;backdrop-filter:blur(24px);opacity:0;transform:scale(.9);transition:.18s ease}.right .dock{right:56px;transform-origin:right}.left .dock{left:56px;transform-origin:left}.open .dock{pointer-events:auto;opacity:1;transform:scale(1)}.icon{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:transparent;color:#cdd2db}.icon:hover{background:#ffffff10;color:#fff}.icon.toggle{background:#f7f8fa;color:#111319}.icon.panel-button{background:var(--accent);color:#fff}.play-glyph,.pause-glyph{display:grid}.playing .play-glyph,.paused .pause-glyph{display:none}
      .orb,.dock{z-index:3}.panel{pointer-events:auto;position:fixed;z-index:1;top:8px;left:8px;width:min(392px,calc(100vw - 16px));height:min(680px,calc(100vh - 16px));overflow:hidden;display:flex;flex-direction:column;border:1px solid #ffffff25;border-radius:27px;background:linear-gradient(160deg,#1b1e25fa,#0d0f13fb 58%);color:#f7f8fa;box-shadow:0 30px 90px #000c;backdrop-filter:blur(30px);opacity:0;visibility:hidden;transform:translateY(-8px) scale(.98);transition:.2s ease}.panel.show{opacity:1;visibility:visible;transform:none}.panel-head{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;padding:16px 17px 12px}.brand{font-size:10px;font-weight:750;letter-spacing:.2em;color:#929aa8}.head-actions{display:flex;align-items:center;gap:6px}.provider{padding:7px 10px;border:1px solid #ffffff1d;border-radius:10px;background:#ffffff09}.close-panel{width:30px;height:30px;border-radius:10px;background:transparent;color:#89909c}
      .visual-stage{position:relative;height:172px;flex:0 0 172px;margin:0 12px;overflow:hidden;border:1px solid #ffffff1c;border-radius:20px;background:radial-gradient(circle at 74% 20%,#68404866,transparent 34%),radial-gradient(circle at 20% 75%,#273b5266,transparent 42%),linear-gradient(145deg,#272931,#12151a);box-shadow:inset 0 1px #ffffff14}.visual-stage:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.7%,#ffffff0b 50%,transparent 50.3%),linear-gradient(#ffffff05 1px,transparent 1px);background-size:100% 100%,100% 34px;opacity:.55}.visual-glow{position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,#ffffff0c 48%,transparent 72%);transform:translateX(-100%);animation:scan 5s linear infinite}.now{position:absolute;z-index:3;top:14px;left:15px;right:15px;display:flex;align-items:center;gap:11px}.disc{width:45px;height:45px;flex:0 0 auto;border:7px solid #171a20;border-radius:50%;background:repeating-radial-gradient(circle,#2d323d 0 2px,#171a20 3px 5px);box-shadow:0 8px 20px #0008;display:grid;place-items:center;animation:spin 8s linear infinite;animation-play-state:paused}.playing .disc{animation-play-state:running}.disc:after{content:"";width:12px;height:12px;border:4px solid #181a20;border-radius:50%;background:var(--accent)}.track{min-width:0;flex:1}.track-title{font-size:16px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track-meta{margin-top:3px;color:#b0b6c1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.state-pill{padding:4px 7px;border-radius:7px;background:#090b0fa6;color:#cbd0d8;font-size:9px;letter-spacing:.05em}
      .visual-glow{animation-play-state:paused}.playing .visual-glow{animation-play-state:running}.waveform{position:absolute;z-index:2;left:12px;right:12px;top:74px;height:38px;display:flex;align-items:center;justify-content:space-between}.waveform:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#fff9}.waveform i{z-index:1;width:2px;height:var(--h);border-radius:3px;background:#fff;box-shadow:0 0 5px var(--accent);animation:wavePulse .8s ease-in-out calc(var(--i)*-.025s) infinite alternate;animation-play-state:paused}.playing .waveform i{animation-play-state:running}.bass-bars{position:absolute;z-index:2;left:10px;right:10px;bottom:0;height:55px;display:flex;align-items:end;gap:3px}.bass-bars i{flex:1;height:var(--h);min-height:7px;border:1px solid #ff8b95;border-bottom:0;border-radius:3px 3px 0 0;background:#fff;box-shadow:0 0 8px #ff536180;animation:bassPulse .72s ease-in-out calc(var(--i)*-.055s) infinite alternate;animation-play-state:paused;transform-origin:bottom}.playing .bass-bars i{animation-play-state:running}
      .timeline{flex:0 0 auto;padding:11px 18px 5px}.range{appearance:none;width:100%;height:3px;border-radius:4px;background:linear-gradient(90deg,var(--accent) var(--seek),#5c626d var(--seek));cursor:pointer}.range::-webkit-slider-thumb{appearance:none;width:12px;height:12px;border:3px solid #fff;border-radius:50%;background:var(--accent);box-shadow:0 2px 9px #0008}.times{display:flex;justify-content:space-between;margin-top:5px;color:#757d8b;font-size:10px;font-variant-numeric:tabular-nums}.controls{display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:12px;padding:5px 18px 14px}.controls .icon{width:40px;height:40px}.controls .toggle{width:52px;height:52px;border-radius:17px}.volume{display:flex;flex:0 0 auto;align-items:center;gap:10px;padding:0 19px 14px;color:#858d9a}.volume svg{width:15px}.volume .range{min-width:0;flex:1;background:linear-gradient(90deg,var(--accent) var(--volume),#5c626d var(--volume))}.volume-label{width:24px;text-align:right;font-variant-numeric:tabular-nums}
      .content{display:flex;flex:1;min-height:0;flex-direction:column;margin:0 12px 12px;border-top:1px solid #ffffff12;padding-top:12px}.mode-tabs,.subtabs{display:flex;align-items:center;gap:4px}.mode-tabs{flex:0 0 auto;margin-bottom:10px}.mode,.subtab{padding:7px 11px;border-radius:10px;background:transparent;color:#858d9a;font-weight:650}.mode.active,.subtab.active{background:#ffffff10;color:#fff}.mode svg{width:14px;height:14px;margin-right:5px;vertical-align:-3px}.search-pane,.library-pane{display:flex;flex:1;min-height:0;flex-direction:column}.search-row{display:flex;flex:0 0 auto;gap:7px}.search-row input{min-width:0;flex:1;border:1px solid #343945;border-radius:13px;background:#090b0f;color:#fff;padding:11px 12px;outline:0}.search-row input:focus{border-color:#6c7482}.search-button{padding:0 16px;border-radius:13px;background:var(--accent);font-weight:700}.pane-head{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between}.refresh-library{width:29px;height:29px;border-radius:9px;background:#ffffff08;color:#9ba2ad}.message{flex:0 0 auto;min-height:25px;padding:8px 3px 4px;color:#8c94a1;font-size:11px}.results{flex:1;min-height:58px;overflow:auto;scrollbar-width:thin;scrollbar-color:#3c414c transparent}.item{display:flex;align-items:center;width:100%;gap:10px;padding:9px 8px;border-radius:12px;background:transparent;text-align:left}.item:hover{background:#ffffff0b}.index{display:grid;place-items:center;width:27px;height:27px;flex:0 0 auto;border-radius:9px;background:#ffffff09;color:#777f8c;font-size:10px}.item-icon{font-size:14px;color:var(--accent)}.grow{min-width:0;flex:1}.title,.meta{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-weight:650}.meta{margin-top:2px;color:#858d99;font-size:11px}.empty{padding:25px 8px;text-align:center;color:#747c89}.empty strong{display:block;color:#aeb4be;font-size:13px}.empty span{display:block;margin-top:4px;font-size:11px}
      .load-more{flex:0 0 auto;width:100%;margin-top:6px;padding:8px;border:1px solid #ffffff14;border-radius:10px;background:#ffffff08;color:#b8bec8;font-size:11px}.load-more:hover{background:#ffffff10;color:#fff}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes miniPulse{to{transform:scaleY(.35)}}@keyframes wavePulse{to{height:4px;opacity:.55}}@keyframes bassPulse{to{transform:scaleY(.35);opacity:.78}}@keyframes scan{to{transform:translateX(100%)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    </style>
    <div class="shell right paused">
      <button class="orb" aria-label="打开音乐控制"><i class="orb-ring"></i><span class="mini-wave">${miniBars}</span></button>
      <div class="dock"><button class="icon" data-control="prev" aria-label="上一首">${svg.prev}</button><button class="icon toggle" data-toggle aria-label="播放或暂停"><span class="play-glyph">${svg.play}</span><span class="pause-glyph">${svg.pause}</span></button><button class="icon" data-control="next" aria-label="下一首">${svg.next}</button><button class="icon panel-button" data-open-panel aria-label="展开播放器">${svg.panel}</button></div>
      <section class="panel" aria-label="CloudMusic Edge 播放器">
        <header class="panel-head"><span class="brand">CLOUDMUSIC EDGE</span><div class="head-actions"><button class="provider">网易云</button><button class="close-panel" aria-label="关闭播放器">${svg.close}</button></div></header>
        <div class="visual-stage" aria-label="播放状态视觉效果"><i class="visual-glow"></i><div class="now"><div class="disc"></div><div class="track"><div class="track-title">尚未播放</div><div class="track-meta">搜索一首歌，轻轻开始</div></div><span class="state-pill">已暂停</span></div><div class="waveform" aria-hidden="true">${waveBars}</div><div class="bass-bars" aria-hidden="true">${bassBars}</div></div>
        <div class="timeline"><input class="range progress" type="range" min="0" max="100" value="0" aria-label="播放进度"><div class="times"><span class="position">0:00</span><span class="duration">0:00</span></div></div>
        <div class="controls"><button class="icon" data-control="prev" aria-label="上一首">${svg.prev}</button><button class="icon toggle" data-toggle aria-label="播放或暂停"><span class="play-glyph">${svg.play}</span><span class="pause-glyph">${svg.pause}</span></button><button class="icon" data-control="next" aria-label="下一首">${svg.next}</button><button class="icon" data-control="stop" aria-label="停止">${svg.stop}</button></div>
        <label class="volume">${svg.volume}<input class="range volume-range" type="range" min="0" max="100" value="70" aria-label="音量"><span class="volume-label">70</span></label>
        <div class="content">
          <nav class="mode-tabs"><button class="mode active" data-mode="search">${svg.search}搜索</button><button class="mode library-mode" data-mode="library">${svg.library}我的音乐</button></nav>
          <section class="search-pane"><div class="subtabs"><button class="subtab active" data-search-type="song">歌曲</button><button class="subtab" data-search-type="playlist">歌单</button></div><div class="search-row"><input maxlength="100" placeholder="搜索歌曲"><button class="search-button">搜索</button></div><div class="message search-message">搜索结果会按分类保留</div><div class="results search-results"></div></section>
          <section class="library-pane hidden"><div class="pane-head"><div class="subtabs"><button class="subtab active" data-library-type="favorite">喜欢</button><button class="subtab" data-library-type="created">创建</button><button class="subtab" data-library-type="collected">收藏</button></div><button class="refresh-library" aria-label="刷新我的音乐">${svg.refresh}</button></div><div class="message library-message">从官方账号读取，不保存个人歌单数据</div><div class="results library-results"></div><button class="load-more hidden">加载更多</button></section>
        </div>
      </section>
    </div>`;

  const shell = root.querySelector(".shell");
  const orb = root.querySelector(".orb");
  const panel = root.querySelector(".panel");
  const providerButton = root.querySelector(".provider");
  const progress = root.querySelector(".progress");
  const volume = root.querySelector(".volume-range");
  const input = root.querySelector(".search-row input");
  const searchMessage = root.querySelector(".search-message");
  const searchResults = root.querySelector(".search-results");
  const libraryMessage = root.querySelector(".library-message");
  const libraryResults = root.querySelector(".library-results");
  const loadMoreButton = root.querySelector(".load-more");
  const searchCache = new Map();
  const libraryCache = new Map();
  const latestSearchRequest = new Map();
  const latestLibraryRequest = new Map();
  let provider = "netease";
  let viewMode = "search";
  let searchType = "song";
  let libraryType = "favorite";
  let state = { status: "paused", position: 0, duration: 0, volume: 70, title: "", meta: "", queueLength: 0 };
  let drag;
  let suppressClick = false;
  let pollTimer;
  let seeking = false;

  const native = async (action, payload = {}) => {
    const response = await chrome.runtime.sendMessage({ type: "native", action, payload });
    if (!response?.ok) throw new Error(response?.error || "本地桥接未连接");
    return response.data;
  };
  const savePosition = () => chrome.storage.local.set({ [`float:${location.origin}`]: { left: parseFloat(host.style.left), top: parseFloat(host.style.top) } });
  const cacheKey = (sourceProvider = provider, type = searchType) => `${sourceProvider}:${type}`;

  chrome.storage.local.get({ provider: "netease", [`float:${location.origin}`]: null }, (data) => {
    provider = data.provider === "qq" ? "qq" : "netease";
    renderProvider();
    const pos = data[`float:${location.origin}`];
    if (pos) {
      host.style.left = `${Math.max(6, Math.min(innerWidth - 54, pos.left))}px`;
      host.style.top = `${Math.max(6, Math.min(innerHeight - 54, pos.top))}px`;
      updateSide();
    }
    restoreSearch();
    refreshState();
  });

  function renderProvider() {
    const isQq = provider === "qq";
    providerButton.textContent = isQq ? "QQ 音乐" : "网易云";
    shell.style.setProperty("--accent", isQq ? "#31c27c" : "#ff5361");
    root.querySelector(".library-mode").classList.toggle("hidden", isQq);
    if (isQq && viewMode === "library") setMode("search");
  }
  function updateSide() {
    const leftSide = (parseFloat(host.style.left) || 0) < innerWidth / 2;
    shell.classList.toggle("left", leftSide);
    shell.classList.toggle("right", !leftSide);
    shell.classList.toggle("lower", (parseFloat(host.style.top) || 0) > innerHeight / 2);
    if (panel.classList.contains("show")) placePanel();
  }
  function placePanel() {
    const rect = host.getBoundingClientRect();
    const panelWidth = Math.min(392, innerWidth - 16);
    const panelHeight = Math.min(680, innerHeight - 16);
    const left = rect.left < innerWidth / 2
      ? Math.max(8, Math.min(rect.left, innerWidth - panelWidth - 8))
      : Math.max(8, Math.min(rect.right - panelWidth, innerWidth - panelWidth - 8));
    const top = Math.max(8, Math.min(rect.top - panelHeight / 2 + rect.height / 2, innerHeight - panelHeight - 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }
  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function parseState(data) {
    if (data?.payload?.state) return data.payload.state;
    if (data?.state) return data.state;
    if (typeof data?.stdout === "string") {
      try { return JSON.parse(data.stdout).state || {}; } catch { return {}; }
    }
    return {};
  }
  function renderState() {
    const playing = state.status === "playing";
    shell.classList.toggle("playing", playing);
    shell.classList.toggle("paused", !playing);
    root.querySelector(".track-title").textContent = state.title || "尚未播放";
    root.querySelector(".track-meta").textContent = state.meta || "搜索一首歌，轻轻开始";
    root.querySelector(".state-pill").textContent = state.status === "stopped" ? "已停止" : playing ? `播放中 · ${Number(state.queueLength) || 1}` : "已暂停";
    const duration = Number(state.duration) || 0;
    const position = Math.min(Number(state.position) || 0, duration || Infinity);
    const percent = duration ? position / duration * 100 : 0;
    if (!seeking) progress.value = String(percent);
    root.querySelector(".position").textContent = formatTime(position);
    root.querySelector(".duration").textContent = formatTime(duration);
    shell.style.setProperty("--seek", `${percent}%`);
    if (root.activeElement !== volume) volume.value = String(Number.isFinite(Number(state.volume)) ? state.volume : 70);
    root.querySelector(".volume-label").textContent = volume.value;
    shell.style.setProperty("--volume", `${volume.value}%`);
    schedulePoll(playing || panel.classList.contains("show"));
  }
  async function refreshState() {
    if (!host.isConnected) { clearTimeout(pollTimer); return; }
    if (provider !== "netease") return;
    try {
      state = { ...state, ...parseState(await native("netease.control", { name: "state" })) };
      renderState();
    } catch (error) {
      if (panel.classList.contains("show")) searchMessage.textContent = error.message;
      schedulePoll(false);
    }
  }
  function schedulePoll(active) {
    clearTimeout(pollTimer);
    if (active && host.isConnected) pollTimer = setTimeout(refreshState, 1500);
  }
  async function control(name, value) {
    if (provider === "qq") {
      panel.classList.add("show");
      searchMessage.textContent = "QQ 官方接口暂不提供插件内播控，请从结果打开官方播放器。";
      return;
    }
    try {
      await native("netease.control", value === undefined ? { name } : { name, value });
      await refreshState();
    } catch (error) { panel.classList.add("show"); searchMessage.textContent = error.message; }
  }

  function setMode(mode) {
    rememberViewScroll();
    viewMode = mode;
    root.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    root.querySelector(".search-pane").classList.toggle("hidden", mode !== "search");
    root.querySelector(".library-pane").classList.toggle("hidden", mode !== "library");
    if (mode === "library") loadLibrary(); else restoreSearch();
  }
  function rememberViewScroll() {
    if (viewMode === "search") {
      const cached = searchCache.get(cacheKey());
      if (cached) cached.scrollTop = searchResults.scrollTop;
    } else {
      const cached = libraryCache.get(libraryType);
      if (cached) cached.scrollTop = libraryResults.scrollTop;
    }
  }
  function empty(container, title, detail) {
    container.innerHTML = '<div class="empty"><strong></strong><span></span></div>';
    container.querySelector("strong").textContent = title;
    container.querySelector("span").textContent = detail;
  }
  function renderItems(container, items, source) {
    container.replaceChildren();
    if (!items.length) return empty(container, "这里还是空的", source === "library" ? "登录账号还没有相关内容" : "换个关键词试试");
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = "item";
      button.innerHTML = `<span class="index"></span><span class="grow"><span class="title"></span><span class="meta"></span></span><span class="item-icon">›</span>`;
      button.querySelector(".index").textContent = item.kind === "playlist" ? "歌单" : String(index + 1).padStart(2, "0");
      button.querySelector(".title").textContent = item.title;
      button.querySelector(".meta").textContent = item.meta;
      button.addEventListener("click", () => activateItem(item, source));
      container.appendChild(button);
    });
  }
  function restoreSearch() {
    const cached = searchCache.get(cacheKey());
    input.value = cached?.keyword || "";
    searchMessage.textContent = cached?.message || "搜索结果会按平台和分类保留";
    if (cached) { renderItems(searchResults, cached.items, "search"); searchResults.scrollTop = cached.scrollTop || 0; }
    else empty(searchResults, searchType === "song" ? "搜索歌曲" : "搜索歌单", "切换分类不会清空已有结果");
  }

  function arrays(value, out = []) {
    if (!value || typeof value !== "object") return out;
    if (Array.isArray(value)) out.push(value);
    Object.values(value).forEach((entry) => arrays(entry, out));
    return out;
  }
  function payloadOf(data) {
    if (data?.payload) return data.payload;
    if (typeof data?.stdout === "string") {
      try { return JSON.parse(data.stdout); } catch { return {}; }
    }
    return data || {};
  }
  function normalize(data) {
    const kind = arguments[1] || searchType;
    const sourceProvider = arguments[2] || provider;
    if (sourceProvider === "qq") {
      const qqItems = kind === "song" ? (data.songs || data.songlist || data.trackList || []) : (data.playlists || []);
      return qqItems.map((x) => ({ provider: sourceProvider, kind, title: x.songName || x.dissName || "未命名", meta: x.singerName || x.creatorName || x.dissDesc || "QQ 音乐", url: x.songH5Url, mid: x.songMid, playlistId: x.dissId }));
    }
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const explicit = Array.isArray(body) ? body : body?.records || body?.songs || body?.playlists;
    const list = explicit || arrays(payload).sort((a, b) => b.length - a.length)[0] || [];
    return list.map((x) => ({ provider: sourceProvider, kind, title: x.name || x.songName || x.playlistName || x.title || "未命名", meta: x.artistName || x.singerName || (x.artists || x.fullArtists || []).map((artist) => artist?.name).filter(Boolean).join(" / ") || x.creatorNickName || x.creatorName || x.description || `${Number(x.trackCount) || 0} 首`, encryptedId: x.encryptedId || x.encrypted_id || x.id || x.resourceId, originalId: String(x.originalId || x.original_id || x.originId || x.rawId || ""), visible: x.visible !== false && x.playFlag !== false && x.plLevel !== "none" })).filter((x) => x.encryptedId && x.visible);
  }
  function normalizeLibrary(data, kind) {
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const records = kind === "favorite" ? (body ? [body] : []) : (body?.records || []);
    return records.map((x) => ({ provider: "netease", kind: "playlist", title: x.name || "未命名歌单", meta: `${x.creatorNickName || (kind === "created" ? "我创建" : kind === "collected" ? "我收藏" : "我的红心")} · ${Number(x.trackCount) || 0} 首`, encryptedId: x.id, originalId: String(x.originalId || ""), trackCount: Number(x.trackCount) || 0 })).filter((x) => x.encryptedId && x.originalId);
  }
  function officialQqUrl(candidate, mid) {
    let url;
    try { url = new URL(candidate || ""); } catch { url = null; }
    if (url && url.protocol === "https:" && ["y.qq.com", "i2.y.qq.com"].includes(url.hostname)) return url.href;
    if (/^[A-Za-z0-9_-]{4,64}$/.test(mid || "")) return `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(mid)}`;
    throw new Error("QQ 音乐返回了无效的官方播放地址");
  }
  async function runSearch() {
    const keyword = input.value.trim();
    if (!keyword) return;
    const requestedProvider = provider;
    const requestedType = searchType;
    const requestedKey = cacheKey(requestedProvider, requestedType);
    const requestId = (latestSearchRequest.get(requestedKey) || 0) + 1;
    latestSearchRequest.set(requestedKey, requestId);
    searchMessage.textContent = "正在搜索…";
    try {
      const data = await native(`${requestedProvider}.search`, { keyword, type: requestedType });
      if (latestSearchRequest.get(requestedKey) !== requestId) return;
      const items = normalize(data, requestedType, requestedProvider);
      const entry = { keyword, items, message: items.length ? `找到 ${items.length} 项 · 已缓存此分类` : "没有找到结果" };
      searchCache.set(requestedKey, entry);
      if (cacheKey() !== requestedKey) return;
      searchMessage.textContent = entry.message;
      renderItems(searchResults, items, "search");
    } catch (error) {
      if (latestSearchRequest.get(requestedKey) === requestId && cacheKey() === requestedKey) searchMessage.textContent = error.message;
    }
  }
  function libraryBatch(data) {
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const raw = Array.isArray(body) ? body : (body?.records || []);
    return { raw, total: Number(body?.recordCount) || raw.length };
  }
  function libraryStatus(type, loaded, total) {
    const label = type === "favorite" ? "喜欢的歌曲" : type === "created" ? "我创建的歌单" : "我收藏的歌单";
    return `${label} · ${loaded}${total > loaded ? ` / ${total}` : ""}`;
  }
  function renderLibraryEntry(type, entry) {
    libraryMessage.textContent = entry.message;
    renderItems(libraryResults, entry.items, "library");
    libraryResults.scrollTop = entry.scrollTop || 0;
    loadMoreButton.classList.toggle("hidden", !entry.hasMore);
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "加载更多";
  }
  async function loadLibrary(force = false) {
    if (provider !== "netease") return;
    const requestedType = libraryType;
    if (!force && libraryCache.has(requestedType)) return renderLibraryEntry(requestedType, libraryCache.get(requestedType));
    const requestId = (latestLibraryRequest.get(requestedType) || 0) + 1;
    latestLibraryRequest.set(requestedType, requestId);
    libraryMessage.textContent = requestedType === "favorite" ? "正在读取喜欢的歌曲…" : "正在读取个人歌单…";
    loadMoreButton.classList.add("hidden");
    if (!libraryCache.has(requestedType)) libraryResults.replaceChildren();
    try {
      let items;
      let favoritePlaylist;
      let batch;
      if (requestedType === "favorite") {
        const favorite = normalizeLibrary(await native("netease.library", { kind: "favorite" }), "favorite")[0];
        if (!favorite) throw new Error("没有找到红心歌单");
        favoritePlaylist = favorite;
        const tracks = await native("netease.playlistTracks", { playlistId: favorite.encryptedId, limit: 80, offset: 0 });
        batch = libraryBatch(tracks);
        items = normalize(tracks, "song", "netease");
        batch.total = favorite.trackCount || batch.total;
      } else {
        const playlists = await native("netease.library", { kind: requestedType, limit: 80, offset: 0 });
        batch = libraryBatch(playlists);
        items = normalizeLibrary(playlists, requestedType);
      }
      if (latestLibraryRequest.get(requestedType) !== requestId) return;
      const entry = { items, favoritePlaylist, offset: batch.raw.length, total: batch.total, hasMore: batch.raw.length > 0 && batch.raw.length < batch.total, scrollTop: 0 };
      entry.message = libraryStatus(requestedType, entry.items.length, entry.total);
      libraryCache.set(requestedType, entry);
      if (libraryType === requestedType && viewMode === "library") renderLibraryEntry(requestedType, entry);
    } catch (error) {
      if (latestLibraryRequest.get(requestedType) !== requestId || libraryType !== requestedType || viewMode !== "library") return;
      const cached = libraryCache.get(requestedType);
      if (cached) { renderLibraryEntry(requestedType, cached); libraryMessage.textContent = `刷新失败：${error.message}`; }
      else { libraryMessage.textContent = error.message; empty(libraryResults, "读取失败", "请确认网易云账号仍处于登录状态"); }
    }
  }
  async function loadMoreLibrary() {
    const requestedType = libraryType;
    const entry = libraryCache.get(requestedType);
    if (!entry?.hasMore || provider !== "netease") return;
    const requestId = (latestLibraryRequest.get(requestedType) || 0) + 1;
    latestLibraryRequest.set(requestedType, requestId);
    entry.scrollTop = libraryResults.scrollTop;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "正在加载…";
    try {
      const data = requestedType === "favorite"
        ? await native("netease.playlistTracks", { playlistId: entry.favoritePlaylist.encryptedId, limit: 80, offset: entry.offset })
        : await native("netease.library", { kind: requestedType, limit: 80, offset: entry.offset });
      if (latestLibraryRequest.get(requestedType) !== requestId) return;
      const batch = libraryBatch(data);
      const additions = requestedType === "favorite" ? normalize(data, "song", "netease") : normalizeLibrary(data, requestedType);
      const existing = new Set(entry.items.map((item) => `${item.kind}:${item.encryptedId}:${item.originalId}`));
      entry.items.push(...additions.filter((item) => !existing.has(`${item.kind}:${item.encryptedId}:${item.originalId}`)));
      entry.offset += batch.raw.length;
      entry.hasMore = batch.raw.length > 0 && entry.offset < entry.total;
      entry.message = libraryStatus(requestedType, entry.items.length, entry.total);
      if (libraryType === requestedType && viewMode === "library") renderLibraryEntry(requestedType, entry);
    } catch (error) {
      if (latestLibraryRequest.get(requestedType) === requestId && libraryType === requestedType && viewMode === "library") {
        libraryMessage.textContent = error.message;
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "重试加载更多";
      }
    }
  }
  async function activateItem(item) {
    try {
      if (item.provider === "qq") {
        if (item.kind === "playlist" && item.playlistId) window.open(`https://y.qq.com/n/ryqq/playlist/${encodeURIComponent(item.playlistId)}`, "_blank", "noopener");
        else window.open(officialQqUrl(item.url, item.mid), "_blank", "noopener");
        return;
      }
      await native(item.kind === "playlist" ? "netease.playPlaylist" : "netease.play", item);
      const targetMessage = viewMode === "library" ? libraryMessage : searchMessage;
      targetMessage.textContent = `正在播放：${item.title}`;
      await refreshState();
    } catch (error) { (viewMode === "library" ? libraryMessage : searchMessage).textContent = error.message; }
  }

  root.querySelector(".dock").addEventListener("click", (event) => event.stopPropagation());
  panel.addEventListener("click", (event) => event.stopPropagation());
  orb.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, left: host.getBoundingClientRect().left, top: host.getBoundingClientRect().top, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved ||= Math.abs(dx) + Math.abs(dy) > 6;
    host.style.left = `${Math.max(0, Math.min(innerWidth - 48, drag.left + dx))}px`;
    host.style.top = `${Math.max(5, Math.min(innerHeight - 53, drag.top + dy))}px`;
    updateSide();
  });
  function finishDrag() {
    if (!drag) return;
    suppressClick = drag.moved;
    host.style.left = `${(parseFloat(host.style.left) || 0) < innerWidth / 2 ? 6 : innerWidth - 54}px`;
    updateSide();
    savePosition();
    drag = null;
    setTimeout(() => { suppressClick = false; }, 0);
  }
  orb.addEventListener("pointerup", finishDrag);
  orb.addEventListener("pointercancel", finishDrag);
  orb.addEventListener("click", () => {
    if (suppressClick) return;
    shell.classList.toggle("open");
    if (!shell.classList.contains("open")) panel.classList.remove("show");
  });
  root.querySelector("[data-open-panel]").addEventListener("click", () => {
    panel.classList.toggle("show");
    if (panel.classList.contains("show")) { placePanel(); refreshState(); }
  });
  root.querySelector(".close-panel").addEventListener("click", () => panel.classList.remove("show"));
  root.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", () => control(button.dataset.control)));
  root.querySelectorAll("[data-toggle]").forEach((button) => button.addEventListener("click", () => control(state.status === "playing" ? "pause" : "resume")));
  root.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  root.querySelectorAll("[data-search-type]").forEach((button) => button.addEventListener("click", () => {
    const previous = searchCache.get(cacheKey());
    if (previous) previous.scrollTop = searchResults.scrollTop;
    searchType = button.dataset.searchType;
    root.querySelectorAll("[data-search-type]").forEach((tab) => tab.classList.toggle("active", tab === button));
    input.placeholder = searchType === "playlist" ? "搜索歌单" : "搜索歌曲";
    restoreSearch();
  }));
  root.querySelectorAll("[data-library-type]").forEach((button) => button.addEventListener("click", () => {
    const previous = libraryCache.get(libraryType);
    if (previous) previous.scrollTop = libraryResults.scrollTop;
    libraryType = button.dataset.libraryType;
    root.querySelectorAll("[data-library-type]").forEach((tab) => tab.classList.toggle("active", tab === button));
    loadLibrary();
  }));
  root.querySelector(".refresh-library").addEventListener("click", () => loadLibrary(true));
  loadMoreButton.addEventListener("click", loadMoreLibrary);
  providerButton.addEventListener("click", () => {
    rememberViewScroll();
    provider = provider === "netease" ? "qq" : "netease";
    chrome.storage.local.set({ provider });
    renderProvider();
    restoreSearch();
    if (provider === "netease") refreshState(); else schedulePoll(false);
  });
  progress.addEventListener("pointerdown", () => { seeking = true; });
  progress.addEventListener("input", () => {
    const next = Number(progress.value) / 100 * (Number(state.duration) || 0);
    root.querySelector(".position").textContent = formatTime(next);
    shell.style.setProperty("--seek", `${progress.value}%`);
  });
  progress.addEventListener("change", async () => {
    const next = Number(progress.value) / 100 * (Number(state.duration) || 0);
    seeking = false;
    if (state.duration) await control("seek", Math.round(next));
  });
  volume.addEventListener("input", () => { root.querySelector(".volume-label").textContent = volume.value; shell.style.setProperty("--volume", `${volume.value}%`); });
  volume.addEventListener("change", () => control("volume", Number(volume.value)));
  root.querySelector(".search-button").addEventListener("click", runSearch);
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") runSearch(); });
  addEventListener("keydown", (event) => { if (event.key === "Escape") panel.classList.remove("show"); });
  addEventListener("resize", () => {
    host.style.left = `${shell.classList.contains("left") ? 6 : innerWidth - 54}px`;
    host.style.top = `${Math.max(5, Math.min(innerHeight - 53, parseFloat(host.style.top) || 100))}px`;
    updateSide();
    if (panel.classList.contains("show")) placePanel();
  });
})();
