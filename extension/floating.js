(() => {
  if (globalThis.__cloudMusicEdgeFloating) return;
  globalThis.__cloudMusicEdgeFloating = true;

  const miniBars = Array.from({ length: 5 }, (_, i) => `<i style="--i:${i};--h:${4 + (i % 3) * 3}px"></i>`).join("");
  const spectrumBars = Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--h:${7 + (i % 7) * 4}px"></i>`).join("");
  const host = document.createElement("div");
  host.id = "cloudmusic-edge-floating";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:calc(100vw - 72px);top:38vh;width:60px;height:60px;pointer-events:auto";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}button,input{font:13px/1.35 Inter,system-ui,"Microsoft YaHei",sans-serif}.shell{--accent:#ff4d58;--progress:0deg;color:#f7f8fb}
      button{border:0}.orb{position:absolute;width:60px;height:60px;padding:3px;border-radius:22px;background:conic-gradient(var(--accent) var(--progress),#30343d var(--progress));box-shadow:0 16px 42px #0008;cursor:grab;user-select:none;transition:transform .2s,border-radius .2s}.orb:hover{transform:translateY(-2px) scale(1.035)}.orb:active{cursor:grabbing}
      .orb-core{width:54px;height:54px;border:1px solid #ffffff24;border-radius:19px;background:radial-gradient(circle at 32% 22%,#323742,#111319 70%);display:grid;place-items:center;overflow:hidden}.note{font-size:21px;font-weight:800;transform:translateY(-2px)}
      .mini-spectrum{position:absolute;left:17px;bottom:12px;height:12px;display:flex;align-items:end;gap:2px}.mini-spectrum i,.spectrum i{display:block;width:3px;border-radius:4px;background:var(--accent);animation:wave .8s ease-in-out calc(var(--i)*-.07s) infinite alternate;animation-play-state:paused}.playing .mini-spectrum i,.playing .spectrum i{animation-play-state:running}.mini-spectrum i{height:var(--h)}
      .status-dot{position:absolute;right:9px;bottom:9px;width:8px;height:8px;border:2px solid #17191f;border-radius:50%;background:#697080}.playing .status-dot{background:#4bdf91;box-shadow:0 0 10px #4bdf91}.paused .status-dot{background:#ffb84d}
      .dock{pointer-events:none;position:absolute;top:5px;display:flex;align-items:center;gap:4px;padding:5px;border:1px solid #ffffff1f;border-radius:20px;background:#101219ed;box-shadow:0 16px 46px #0008;backdrop-filter:blur(22px);opacity:0;transform:scale(.9);transition:.18s ease}.right .dock{right:68px;transform-origin:right center}.left .dock{left:68px;transform-origin:left center}.open .dock{pointer-events:auto;opacity:1;transform:scale(1)}
      .icon{width:38px;height:38px;border-radius:14px;background:transparent;color:#dce0e8;cursor:pointer;font-size:15px}.icon:hover{background:#ffffff12}.icon.primary{background:#f7f8fa;color:#101218}.icon.more{color:#fff;background:linear-gradient(135deg,var(--accent),#ff704c)}
      .panel{pointer-events:auto;position:absolute;top:72px;width:360px;max-height:min(610px,calc(100vh - 26px));overflow:auto;border:1px solid #ffffff21;border-radius:26px;background:linear-gradient(155deg,#1b1e26f5,#0e1015f8 55%);color:#f7f8fb;box-shadow:0 30px 90px #000b;backdrop-filter:blur(28px);opacity:0;visibility:hidden;transform:translateY(-10px) scale(.975);transition:.2s ease}.right .panel{right:0}.left .panel{left:0}.lower .panel{top:auto;bottom:72px}.panel.show{opacity:1;visibility:visible;transform:none}
      .head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px 4px}.brand{font-size:10px;letter-spacing:.19em;color:#9299a7}.provider{padding:7px 10px;border:1px solid #ffffff20;border-radius:11px;background:#ffffff0b;color:#fff;cursor:pointer}
      .now{display:grid;grid-template-columns:74px 1fr;gap:14px;align-items:center;padding:15px 18px 10px}.disc{width:74px;height:74px;border-radius:50%;background:repeating-radial-gradient(circle,#282c35 0 4px,#171920 5px 7px);box-shadow:0 10px 30px #0008;display:grid;place-items:center;animation:spin 8s linear infinite;animation-play-state:paused}.playing .disc{animation-play-state:running}.disc:after{content:"♪";width:34px;height:34px;display:grid;place-items:center;border:5px solid #111319;border-radius:50%;background:var(--accent);font-size:14px}.track{min-width:0}.track-title{font-size:17px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track-meta{margin-top:5px;color:#969dab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.badges{display:flex;gap:6px;margin-top:9px}.badge{padding:3px 7px;border-radius:7px;background:#ffffff0c;color:#aeb4c0;font-size:10px}
      .spectrum{height:43px;padding:4px 18px 0;display:flex;align-items:end;justify-content:space-between}.spectrum i{width:5px;min-height:4px;height:var(--h);opacity:.78}
      .timeline{padding:2px 18px 5px}.range{width:100%;height:4px;accent-color:var(--accent);cursor:pointer}.times{display:flex;justify-content:space-between;margin-top:3px;color:#747b89;font-size:10px;font-variant-numeric:tabular-nums}
      .controls{display:flex;justify-content:center;align-items:center;gap:9px;padding:5px 18px 14px}.controls .icon{width:42px;height:42px}.controls .toggle{width:52px;height:52px;border-radius:18px;background:#f7f8fb;color:#12141a;font-size:18px}
      .volume{display:flex;align-items:center;gap:10px;padding:0 19px 15px;color:#838a97}.volume input{min-width:0;flex:1;accent-color:var(--accent)}
      .divider{height:1px;margin:0 18px;background:#ffffff12}.search-wrap{padding:14px 14px 16px}.tabs{display:flex;gap:5px;margin-bottom:10px}.tab{padding:6px 11px;border-radius:9px;background:transparent;color:#838b99;cursor:pointer}.tab.active{background:#ffffff10;color:#fff}.search{display:flex;gap:7px}.search input{min-width:0;flex:1;border:1px solid #303540;border-radius:13px;background:#0b0d12;color:#fff;padding:11px 12px;outline:0}.search input:focus{border-color:#667083}.search button{border-radius:13px;background:var(--accent);color:#fff;padding:0 15px;cursor:pointer;font-weight:700}.message{padding:9px 2px 2px;color:#9299a6;font-size:11px}.results{max-height:240px;overflow:auto;margin:8px -2px -2px}.item{display:flex;width:100%;gap:9px;padding:9px 8px;border-radius:12px;background:transparent;color:#fff;text-align:left;cursor:pointer}.item:hover{background:#ffffff0b}.num{width:20px;color:#656d7a}.grow{min-width:0;flex:1}.title,.meta{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-weight:650}.meta{margin-top:2px;color:#858c99;font-size:11px}
      @keyframes wave{to{height:7px;transform:scaleY(.35);opacity:.5}}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    </style>
    <div class="shell right paused">
      <button class="orb" aria-label="打开 CloudMusic Edge 播放控制"><span class="orb-core"><b class="note">♪</b><span class="mini-spectrum">${miniBars}</span><i class="status-dot"></i></span></button>
      <div class="dock"><button class="icon" data-control="prev" title="上一首">◀</button><button class="icon primary" data-toggle title="播放/暂停">▶</button><button class="icon" data-control="next" title="下一首">▶▶</button><button class="icon more" data-open-panel title="打开播放器">⌁</button></div>
      <section class="panel" aria-label="CloudMusic Edge 播放器">
        <div class="head"><span class="brand">CLOUDMUSIC EDGE</span><button class="provider">网易云</button></div>
        <div class="now"><div class="disc"></div><div class="track"><div class="track-title">尚未播放</div><div class="track-meta">搜索一首歌，轻轻开始</div><div class="badges"><span class="badge state-badge">已暂停</span><span class="badge queue-badge">队列 0</span></div></div></div>
        <div class="spectrum">${spectrumBars}</div>
        <div class="timeline"><input class="range progress" type="range" min="0" max="100" value="0" aria-label="播放进度"><div class="times"><span class="position">0:00</span><span class="duration">0:00</span></div></div>
        <div class="controls"><button class="icon" data-control="prev" title="上一首">◀</button><button class="icon toggle" data-toggle title="播放/暂停">▶</button><button class="icon" data-control="next" title="下一首">▶▶</button><button class="icon" data-control="stop" title="停止">■</button></div>
        <div class="volume"><span>♬</span><input type="range" min="0" max="100" value="70" aria-label="音量"><span class="volume-label">70</span></div>
        <div class="divider"></div>
        <div class="search-wrap"><div class="tabs"><button class="tab active" data-type="song">歌曲</button><button class="tab" data-type="playlist">歌单</button></div><div class="search"><input maxlength="100" placeholder="搜索歌曲"><button>搜索</button></div><div class="message">拖动悬浮球可吸附到屏幕边缘</div><div class="results"></div></div>
      </section>
    </div>`;

  const shell = root.querySelector(".shell");
  const orb = root.querySelector(".orb");
  const panel = root.querySelector(".panel");
  const input = root.querySelector(".search input");
  const message = root.querySelector(".message");
  const results = root.querySelector(".results");
  const providerButton = root.querySelector(".provider");
  const progress = root.querySelector(".progress");
  const volume = root.querySelector(".volume input");
  let provider = "netease";
  let searchType = "song";
  let drag;
  let suppressClick = false;
  let state = { status: "paused", position: 0, duration: 0, volume: 70, title: "", meta: "", currentIndex: -1, queueLength: 0 };
  let pollTimer;
  let seeking = false;

  const native = async (action, payload = {}) => {
    const response = await chrome.runtime.sendMessage({ type: "native", action, payload });
    if (!response?.ok) throw new Error(response?.error || "本地桥接未连接");
    return response.data;
  };
  const savePosition = () => chrome.storage.local.set({ [`float:${location.origin}`]: { left: parseFloat(host.style.left), top: parseFloat(host.style.top) } });

  chrome.storage.local.get({ provider: "netease", [`float:${location.origin}`]: null }, (data) => {
    provider = data.provider === "qq" ? "qq" : "netease";
    renderProvider();
    const pos = data[`float:${location.origin}`];
    if (pos) {
      host.style.left = `${Math.max(8, Math.min(innerWidth - 68, pos.left))}px`;
      host.style.top = `${Math.max(8, Math.min(innerHeight - 68, pos.top))}px`;
      updateSide();
    }
    refreshState();
  });

  function renderProvider() {
    providerButton.textContent = provider === "qq" ? "QQ 音乐" : "网易云";
    shell.style.setProperty("--accent", provider === "qq" ? "#31c27c" : "#ff4d58");
  }
  function updateSide() {
    const leftSide = (parseFloat(host.style.left) || 0) < innerWidth / 2;
    shell.classList.toggle("left", leftSide);
    shell.classList.toggle("right", !leftSide);
    shell.classList.toggle("lower", (parseFloat(host.style.top) || 0) > innerHeight / 2);
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
    root.querySelectorAll("[data-toggle]").forEach((button) => { button.textContent = playing ? "Ⅱ" : "▶"; });
    root.querySelector(".track-title").textContent = state.title || "尚未播放";
    root.querySelector(".track-meta").textContent = state.meta || "搜索一首歌，轻轻开始";
    root.querySelector(".state-badge").textContent = state.status === "stopped" ? "已停止" : playing ? "播放中" : "已暂停";
    root.querySelector(".queue-badge").textContent = `队列 ${Number(state.queueLength) || 0}`;
    const duration = Number(state.duration) || 0;
    const position = Math.min(Number(state.position) || 0, duration || Infinity);
    if (!seeking) progress.value = duration ? String(position / duration * 100) : "0";
    root.querySelector(".position").textContent = formatTime(position);
    root.querySelector(".duration").textContent = formatTime(duration);
    shell.style.setProperty("--progress", `${duration ? position / duration * 360 : 0}deg`);
    if (root.activeElement !== volume) volume.value = String(Number.isFinite(Number(state.volume)) ? state.volume : 70);
    root.querySelector(".volume-label").textContent = volume.value;
    schedulePoll(playing || panel.classList.contains("show"));
  }
  async function refreshState() {
    if (provider !== "netease") return;
    try {
      const data = await native("netease.control", { name: "state" });
      state = { ...state, ...parseState(data) };
      renderState();
    } catch (error) {
      if (panel.classList.contains("show")) message.textContent = error.message;
      schedulePoll(false);
    }
  }
  function schedulePoll(active) {
    clearTimeout(pollTimer);
    if (active) pollTimer = setTimeout(refreshState, 1500);
  }
  async function control(name, value) {
    if (provider === "qq") {
      panel.classList.add("show");
      message.textContent = "QQ 官方接口暂不提供插件内播控，可通过搜索结果打开官方播放器。";
      return;
    }
    try {
      await native("netease.control", value === undefined ? { name } : { name, value });
      await refreshState();
    } catch (error) {
      panel.classList.add("show");
      message.textContent = error.message;
    }
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
    host.style.left = `${Math.max(0, Math.min(innerWidth - 60, drag.left + dx))}px`;
    host.style.top = `${Math.max(6, Math.min(innerHeight - 66, drag.top + dy))}px`;
    updateSide();
  });
  orb.addEventListener("pointerup", () => {
    if (!drag) return;
    suppressClick = drag.moved;
    host.style.left = `${(parseFloat(host.style.left) || 0) < innerWidth / 2 ? 8 : innerWidth - 68}px`;
    updateSide();
    savePosition();
    drag = null;
    setTimeout(() => { suppressClick = false; }, 0);
  });
  orb.addEventListener("click", () => {
    if (suppressClick) return;
    shell.classList.toggle("open");
    if (!shell.classList.contains("open")) panel.classList.remove("show");
  });
  root.querySelector("[data-open-panel]").addEventListener("click", () => {
    panel.classList.toggle("show");
    if (panel.classList.contains("show")) { refreshState(); input.focus(); }
  });
  root.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", () => control(button.dataset.control)));
  root.querySelectorAll("[data-toggle]").forEach((button) => button.addEventListener("click", () => control(state.status === "playing" ? "pause" : "resume")));
  providerButton.addEventListener("click", () => {
    provider = provider === "netease" ? "qq" : "netease";
    chrome.storage.local.set({ provider });
    renderProvider();
    results.replaceChildren();
    message.textContent = `已切换到${providerButton.textContent}`;
    if (provider === "netease") refreshState(); else schedulePoll(false);
  });
  progress.addEventListener("pointerdown", () => { seeking = true; });
  progress.addEventListener("input", () => {
    const next = (Number(progress.value) / 100) * (Number(state.duration) || 0);
    root.querySelector(".position").textContent = formatTime(next);
  });
  progress.addEventListener("change", async () => {
    const next = (Number(progress.value) / 100) * (Number(state.duration) || 0);
    seeking = false;
    if (state.duration) await control("seek", Math.round(next));
  });
  volume.addEventListener("input", () => { root.querySelector(".volume-label").textContent = volume.value; });
  volume.addEventListener("change", () => control("volume", Number(volume.value)));
  root.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => {
    searchType = button.dataset.type;
    root.querySelectorAll("[data-type]").forEach((tab) => tab.classList.toggle("active", tab === button));
    input.placeholder = searchType === "playlist" ? "搜索歌单" : "搜索歌曲";
    results.replaceChildren();
  }));

  function arrays(value, out = []) {
    if (!value || typeof value !== "object") return out;
    if (Array.isArray(value)) out.push(value);
    Object.values(value).forEach((entry) => arrays(entry, out));
    return out;
  }
  function normalize(data) {
    if (provider === "qq") {
      const qqItems = searchType === "song" ? (data.songs || data.songlist || data.trackList || []) : (data.playlists || []);
      return qqItems.map((x) => ({ kind: searchType, title: x.songName || x.dissName || "未命名", meta: x.singerName || x.creatorName || x.dissDesc || "QQ 音乐", url: x.songH5Url, mid: x.songMid, playlistId: x.dissId }));
    }
    const list = arrays(data.payload).sort((a, b) => b.length - a.length)[0] || [];
    return list.map((x) => ({ kind: searchType, title: x.name || x.songName || x.playlistName || x.title || "未命名", meta: x.artistName || x.singerName || (x.artists || x.fullArtists || []).map((artist) => artist?.name).filter(Boolean).join(" / ") || x.creatorName || x.description || "网易云音乐", encryptedId: x.encryptedId || x.encrypted_id || x.id || x.resourceId, originalId: String(x.originalId || x.original_id || x.originId || x.rawId || ""), visible: x.visible !== false && x.playFlag !== false && x.plLevel !== "none" })).filter((x) => x.encryptedId && x.visible);
  }
  function officialQqUrl(candidate, mid) {
    let url;
    try { url = new URL(candidate || ""); } catch { url = null; }
    if (url && url.protocol === "https:" && ["y.qq.com", "i2.y.qq.com"].includes(url.hostname)) return url.href;
    if (/^[A-Za-z0-9_-]{4,64}$/.test(mid || "")) return `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(mid)}`;
    throw new Error("QQ 音乐返回了无效的官方播放地址");
  }
  async function search() {
    const keyword = input.value.trim();
    if (!keyword) return;
    message.textContent = "正在搜索…";
    results.replaceChildren();
    try {
      const data = await native(`${provider}.search`, { keyword, type: searchType });
      const items = normalize(data);
      message.textContent = items.length ? `${items.length} 个结果` : "没有可显示的结果";
      items.forEach((item, index) => {
        const button = document.createElement("button");
        button.className = "item";
        button.innerHTML = `<span class="num">${index + 1}</span><span class="grow"><span class="title"></span><span class="meta"></span></span>`;
        button.querySelector(".title").textContent = item.title;
        button.querySelector(".meta").textContent = item.meta;
        button.addEventListener("click", async () => {
          try {
            if (provider === "qq") {
              if (item.kind === "playlist" && item.playlistId) window.open(`https://y.qq.com/n/ryqq/playlist/${encodeURIComponent(item.playlistId)}`, "_blank", "noopener");
              else window.open(officialQqUrl(item.url, item.mid), "_blank", "noopener");
            } else { await native(item.kind === "playlist" ? "netease.playPlaylist" : "netease.play", item); message.textContent = `正在播放：${item.title}`; await refreshState(); }
          } catch (error) { message.textContent = error.message; }
        });
        results.appendChild(button);
      });
    } catch (error) { message.textContent = error.message; }
  }
  root.querySelector(".search button").addEventListener("click", search);
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") search(); });
  addEventListener("resize", () => {
    host.style.left = `${shell.classList.contains("left") ? 8 : innerWidth - 68}px`;
    host.style.top = `${Math.max(6, Math.min(innerHeight - 66, parseFloat(host.style.top) || 100))}px`;
    updateSide();
  });
})();
