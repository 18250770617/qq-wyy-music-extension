(() => {
  if (globalThis.__cloudMusicEdgeFloating) return;
  globalThis.__cloudMusicEdgeFloating = true;

  const host = document.createElement("div");
  host.id = "cloudmusic-edge-floating";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:calc(100vw - 64px);top:42vh;width:52px;height:52px;pointer-events:auto";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}button,input{font:13px/1.3 system-ui,"Microsoft YaHei",sans-serif}
      .orb{pointer-events:auto;position:absolute;width:52px;height:52px;border:1px solid #ffffff3b;border-radius:18px;background:linear-gradient(145deg,#272b34,#0f1116);color:#fff;box-shadow:0 14px 36px #0007,inset 0 1px #ffffff20;display:grid;place-items:center;cursor:grab;user-select:none;transition:border-radius .2s,transform .2s,box-shadow .2s}
      .orb:hover{transform:scale(1.04);box-shadow:0 17px 42px #0009,0 0 0 1px #ffffff18}.orb:active{cursor:grabbing}.orb span{font-weight:800;font-size:16px;letter-spacing:-.08em}.orb i{position:absolute;right:8px;bottom:8px;width:7px;height:7px;border-radius:50%;background:#ec4141;box-shadow:0 0 0 2px #15171c}
      .tray{pointer-events:none;position:absolute;top:4px;display:flex;gap:6px;padding:4px;border:1px solid #ffffff20;border-radius:18px;background:#101218e8;box-shadow:0 12px 34px #0007;backdrop-filter:blur(18px);opacity:0;transform:scale(.88);transition:.18s ease}
      .right .tray{right:58px;transform-origin:right center}.left .tray{left:58px;transform-origin:left center}.open .tray{pointer-events:auto;opacity:1;transform:scale(1)}
      .tray button{width:36px;height:36px;border:0;border-radius:13px;background:transparent;color:#e9ebef;cursor:pointer}.tray button:hover{background:#ffffff13}.tray .primary{background:#f1f2f4;color:#101218}
      .panel{pointer-events:auto;position:absolute;top:62px;width:310px;max-height:390px;overflow:hidden;border:1px solid #ffffff21;border-radius:20px;background:#111319f2;color:#f7f7f8;box-shadow:0 24px 70px #000a;backdrop-filter:blur(22px);opacity:0;transform:translateY(-8px) scale(.98);visibility:hidden;transition:.18s ease}
      .right .panel{right:0}.left .panel{left:0}.lower .panel{top:auto;bottom:62px}.panel.show{opacity:1;transform:none;visibility:visible}
      .head{display:flex;align-items:center;justify-content:space-between;padding:14px 15px 8px}.brand{font-size:10px;letter-spacing:.17em;color:#9299a7}.provider{border:1px solid #343945;border-radius:9px;background:#20232b;color:#fff;padding:6px 9px;cursor:pointer}
      .search{display:flex;gap:7px;padding:8px 12px 12px}.search input{min-width:0;flex:1;border:1px solid #30343e;border-radius:11px;background:#0c0e12;color:#fff;padding:10px 11px;outline:0}.search input:focus{border-color:#7e8798}.search button{border:0;border-radius:11px;background:#ec4141;color:#fff;padding:0 13px;cursor:pointer;font-weight:700}
      .message{padding:0 14px 10px;color:#a5abb7;font-size:11px}.results{max-height:280px;overflow:auto;border-top:1px solid #282b33}.item{display:flex;width:100%;gap:10px;padding:10px 13px;border:0;border-bottom:1px solid #24272e;background:transparent;color:#fff;text-align:left;cursor:pointer}.item:hover{background:#ffffff0a}.num{color:#697180;width:18px}.title{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:650}.meta{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8e95a2;font-size:11px;margin-top:2px}.grow{min-width:0;flex:1}
    </style>
    <div class="shell right">
      <button class="orb" aria-label="打开 CloudMusic Edge"><span>CM</span><i></i></button>
      <div class="tray">
        <button data-control="prev" title="上一首">◀</button><button data-control="pause" title="暂停">Ⅱ</button><button data-control="resume" class="primary" title="继续">▶</button><button data-control="next" title="下一首">▶▶</button><button data-control="stop" title="停止">■</button><button data-open-search title="搜索">⌕</button>
      </div>
      <section class="panel">
        <div class="head"><span class="brand">CLOUDMUSIC EDGE</span><button class="provider">网易云</button></div>
        <div class="search"><input maxlength="100" placeholder="搜索歌曲"/><button>搜索</button></div>
        <div class="message">拖动悬浮球可吸附到任一侧</div><div class="results"></div>
      </section>
    </div>`;

  const shell = root.querySelector(".shell"), orb = root.querySelector(".orb"), panel = root.querySelector(".panel");
  const input = root.querySelector("input"), message = root.querySelector(".message"), results = root.querySelector(".results"), providerButton = root.querySelector(".provider");
  let provider = "netease", drag, suppressClick = false;
  root.querySelector(".tray").addEventListener("click", (event) => event.stopPropagation());
  panel.addEventListener("click", (event) => event.stopPropagation());

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
    if (pos) { host.style.left = `${Math.max(8, Math.min(innerWidth - 60, pos.left))}px`; host.style.top = `${Math.max(8, Math.min(innerHeight - 60, pos.top))}px`; updateSide(); }
  });

  function renderProvider() {
    providerButton.textContent = provider === "qq" ? "QQ 音乐" : "网易云";
    orb.querySelector("i").style.background = provider === "qq" ? "#31c27c" : "#ec4141";
  }
  function updateSide() {
    const leftSide = (parseFloat(host.style.left) || 0) < innerWidth / 2;
    shell.classList.toggle("left", leftSide); shell.classList.toggle("right", !leftSide);
    shell.classList.toggle("lower", (parseFloat(host.style.top) || 0) > innerHeight / 2);
  }

  orb.addEventListener("pointerdown", (event) => {
    drag = { x:event.clientX, y:event.clientY, left:host.getBoundingClientRect().left, top:host.getBoundingClientRect().top, moved:false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y; drag.moved ||= Math.abs(dx)+Math.abs(dy)>6;
    host.style.left=`${Math.max(0,Math.min(innerWidth-52,drag.left+dx))}px`; host.style.top=`${Math.max(6,Math.min(innerHeight-58,drag.top+dy))}px`; updateSide();
  });
  orb.addEventListener("pointerup", () => {
    if (!drag) return;
    suppressClick = drag.moved;
    host.style.left=`${(parseFloat(host.style.left)||0)<innerWidth/2?8:innerWidth-60}px`; updateSide(); savePosition(); drag=null;
    setTimeout(() => { suppressClick = false; }, 0);
  });
  orb.addEventListener("click", () => { if (!suppressClick) shell.classList.toggle("open"); });

  root.querySelector("[data-open-search]").addEventListener("click", () => { panel.classList.toggle("show"); input.focus(); });
  root.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", async () => {
    if (provider === "qq") { panel.classList.add("show"); message.textContent="QQ 官方接口暂不提供插件内播控，请通过搜索结果打开官方播放器。"; return; }
    try { await native("netease.control", { name:button.dataset.control }); message.textContent="操作已发送"; }
    catch (error) { panel.classList.add("show"); message.textContent=error.message; }
  }));
  providerButton.addEventListener("click", () => {
    provider=provider==="netease"?"qq":"netease"; chrome.storage.local.set({provider}); renderProvider(); results.innerHTML=""; message.textContent=`已切换到${providerButton.textContent}`;
  });

  function arrays(value,out=[]) { if(!value||typeof value!=="object")return out; if(Array.isArray(value))out.push(value); Object.values(value).forEach(v=>arrays(v,out)); return out; }
  function normalize(data) {
    if(provider==="qq") return (data.songs||[]).map(x=>({title:x.songName,meta:x.singerName,url:x.songH5Url,mid:x.songMid}));
    const list=arrays(data.payload).sort((a,b)=>b.length-a.length)[0]||[];
    return list.map(x=>({title:x.name||x.songName||"未命名",meta:x.artistName||x.singerName||(x.artists||x.fullArtists||[]).map(a=>a&&a.name).filter(Boolean).join(" / ")||"网易云音乐",encryptedId:x.encryptedId||x.encrypted_id||x.id,originalId:String(x.originalId||x.original_id||""),visible:x.visible!==false&&x.playFlag!==false&&x.plLevel!=="none"})).filter(x=>x.encryptedId&&x.visible);
  }
  function officialQqUrl(candidate, mid) {
    let url; try { url=new URL(candidate||""); } catch { url=null; }
    if(url&&url.protocol==="https:"&&["y.qq.com","i2.y.qq.com"].includes(url.hostname))return url.href;
    if(/^[A-Za-z0-9_-]{4,64}$/.test(mid||""))return `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(mid)}`;
    throw new Error("QQ 音乐返回了无效的官方播放地址");
  }
  async function search() {
    const keyword=input.value.trim(); if(!keyword)return;
    message.textContent="正在搜索…"; results.innerHTML="";
    try {
      const data=await native(`${provider}.search`,{keyword,type:"song"}), items=normalize(data); message.textContent=items.length?`${items.length} 个结果`:"没有可显示的结果";
      items.forEach((item,index)=>{
        const button=document.createElement("button"); button.className="item"; button.innerHTML=`<span class="num">${index+1}</span><span class="grow"><span class="title"></span><span class="meta"></span></span>`;
        button.querySelector(".title").textContent=item.title; button.querySelector(".meta").textContent=item.meta;
        button.addEventListener("click",async()=>{try{if(provider==="qq")window.open(officialQqUrl(item.url,item.mid),"_blank","noopener");else{await native("netease.play",item);message.textContent=`正在播放：${item.title}`}}catch(error){message.textContent=error.message}}); results.appendChild(button);
      });
    } catch(error) { message.textContent=error.message; }
  }
  root.querySelector(".search button").addEventListener("click",search); input.addEventListener("keydown",event=>{if(event.key==="Enter")search()});
  addEventListener("resize",()=>{host.style.left=`${shell.classList.contains("left")?8:innerWidth-60}px`;host.style.top=`${Math.max(6,Math.min(innerHeight-58,parseFloat(host.style.top)||100))}px`;updateSide()});
})();
