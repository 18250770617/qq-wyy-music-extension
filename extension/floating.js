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
    close: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18h1.4a2 2 0 001.2-3.6l-.4-.3a1.8 1.8 0 011.1-3.2H18A3 3 0 0021 11a8 8 0 00-9-8z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="6.8" r="1"/><circle cx="14" cy="7" r="1"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>'
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
  const spectrumDockBars = Array.from({ length: 42 }, (_, i) => {
    const height = 10 + Math.round((Math.sin(i * .91) + 1) * 12 + (i % 9 === 0 ? 8 : 0));
    return `<i class="spectrum-dock-bar" style="--i:${i};--h:${height}%;--level:.08"></i>`;
  }).join("");
  const viewportWidth = () => document.documentElement.clientWidth || innerWidth;
  const viewportHeight = () => document.documentElement.clientHeight || innerHeight;

  const host = document.createElement("div");
  host.id = "cloudmusic-edge-floating";
  host.style.cssText = `all:initial;position:fixed;z-index:2147483647;left:${Math.max(6, viewportWidth() - 50)}px;top:${Math.round(viewportHeight() * .62)}px;width:44px;height:44px;pointer-events:auto`;
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}button,input{font:calc(13px * var(--font-scale,1))/1.35 var(--ui-font,Inter,"Segoe UI",system-ui,"Microsoft YaHei",sans-serif)}button{border:0;color:inherit;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.46}svg{width:18px;height:18px;fill:currentColor;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.hidden{display:none!important}
      .shell{--accent:#ff5968;--provider:#ff5968;--seek:0%;--volume:70%;--panel-opacity:.96;--font-scale:1;--spectrum-dock-height:112px;--ui-font:Inter,"Segoe UI",system-ui,"Microsoft YaHei",sans-serif;--panel-top:25,28,35;--panel-bottom:10,12,16;--visual-glow:104,64,72;color:#f8f9fb;font-family:var(--ui-font)}.shell[data-provider="qq"]{--provider:#31c27c}.shell[data-theme="frost"]{--accent:#8bb7ff;--panel-top:28,36,50;--panel-bottom:13,18,27;--visual-glow:80,111,164}.shell[data-theme="jade"]{--accent:#42d6a0;--panel-top:17,37,35;--panel-bottom:8,18,19;--visual-glow:39,124,102}.shell[data-theme="dusk"]{--accent:#e795d1;--panel-top:42,29,44;--panel-bottom:18,12,22;--visual-glow:136,70,130}
      .orb{position:absolute;width:44px;height:44px;padding:0;border:1px solid #ffffff31;border-radius:50%;background:rgba(var(--panel-bottom),.96);color:#fff;box-shadow:0 10px 28px #0007,inset 0 1px #ffffff20;cursor:grab;user-select:none;transition:transform .18s,box-shadow .18s}.orb:hover{transform:scale(1.05);box-shadow:0 14px 34px #0009,0 0 0 4px #ffffff0a}.orb:active{cursor:grabbing}.orb-ring{position:absolute;inset:-1px;border-radius:inherit;background:conic-gradient(var(--accent) var(--seek),transparent 0);mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0)}.mini-wave{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:2px}.mini-wave i{width:2px;height:var(--h);border-radius:3px;background:linear-gradient(#fff,var(--accent));animation:miniPulse .65s ease-in-out calc(var(--i)*-.1s) infinite alternate;animation-play-state:paused}.playing .mini-wave i{animation-play-state:running}
      .dock{pointer-events:none;position:absolute;top:1px;display:flex;gap:1px;padding:4px;border:1px solid #ffffff20;border-radius:17px;background:rgba(var(--panel-bottom),.94);box-shadow:0 15px 40px #0008;backdrop-filter:blur(24px);opacity:0;transform:scale(.9);transition:.18s ease}.right .dock{right:52px;transform-origin:right}.left .dock{left:52px;transform-origin:left}.open .dock{pointer-events:auto;opacity:1;transform:scale(1)}.icon{display:grid;place-items:center;width:34px;height:34px;padding:0;border-radius:11px;background:transparent;color:#cdd2db}.icon:hover{background:#ffffff10;color:#fff}.icon.toggle{background:#f7f8fa;color:#111319}.icon.panel-button{background:var(--accent);color:#111319}.play-glyph,.pause-glyph{display:grid}.playing .play-glyph,.paused .pause-glyph{display:none}
      .orb,.dock{z-index:7}.panel{pointer-events:auto;position:fixed;z-index:8;top:8px;left:8px;width:min(660px,calc(var(--viewport-width,100vw) - 16px));height:min(404px,calc(var(--viewport-height,100vh) - 16px));overflow:hidden;display:flex;flex-direction:column;border:1px solid #ffffff26;border-radius:24px;background:linear-gradient(155deg,rgba(var(--panel-top),var(--panel-opacity)),rgba(var(--panel-bottom),var(--panel-opacity)) 62%);color:#f7f8fa;box-shadow:0 28px 80px #000b;backdrop-filter:blur(30px) saturate(1.18);opacity:0;visibility:hidden;transform:translateY(7px) scale(.985);transition:opacity .18s ease,transform .18s ease,visibility .18s}.panel[data-placement="above"]{transform:translateY(-7px) scale(.985)}.panel.show{opacity:1;visibility:visible;transform:none}.panel-head{position:relative;display:flex;flex:0 0 50px;align-items:center;justify-content:space-between;padding:9px 13px 7px 17px;border-bottom:1px solid #ffffff0e}.brand{font-size:10px;font-weight:750;letter-spacing:.2em;color:#929aa8}.head-actions{display:flex;align-items:center;gap:5px}.provider{padding:7px 10px;border:1px solid #ffffff1d;border-radius:10px;background:#ffffff09}.provider:after{content:"";display:inline-block;width:6px;height:6px;margin-left:7px;border-radius:50%;background:var(--provider);box-shadow:0 0 8px var(--provider)}.head-icon{width:30px;height:30px;border-radius:9px;background:transparent;color:#89909c}.head-icon:hover{background:#ffffff0d;color:#fff}
      .panel-grid{display:grid;grid-template-columns:minmax(270px,.92fr) minmax(310px,1.08fr);flex:1;min-height:0}.player-column{display:flex;min-width:0;min-height:0;flex-direction:column;padding:10px 13px 11px;border-right:1px solid #ffffff10;overflow:auto;scrollbar-width:thin;scrollbar-color:#3c414c transparent}.visual-stage{position:relative;height:164px;flex:0 0 164px;overflow:hidden;border:1px solid #ffffff1c;border-radius:18px;background:radial-gradient(circle at 74% 20%,rgba(var(--visual-glow),.42),transparent 34%),radial-gradient(circle at 20% 75%,rgba(39,59,82,var(--panel-opacity)),transparent 42%),linear-gradient(145deg,rgba(39,41,49,var(--panel-opacity)),rgba(18,21,26,var(--panel-opacity)));box-shadow:inset 0 1px #ffffff14}.visual-stage:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.7%,#ffffff0b 50%,transparent 50.3%),linear-gradient(#ffffff05 1px,transparent 1px);background-size:100% 100%,100% 34px;opacity:.55}.visual-glow{position:absolute;inset:0;background:linear-gradient(110deg,transparent 20%,#ffffff0c 48%,transparent 72%);transform:translateX(-100%);animation:scan 5s linear infinite}.now{position:absolute;z-index:3;top:13px;left:14px;right:14px;display:flex;align-items:center;gap:10px}.disc{width:42px;height:42px;flex:0 0 auto;border:7px solid #171a20;border-radius:50%;background:repeating-radial-gradient(circle,#2d323d 0 2px,#171a20 3px 5px);box-shadow:0 8px 20px #0008;display:grid;place-items:center;animation:spin 8s linear infinite;animation-play-state:paused}.playing .disc{animation-play-state:running}.disc:after{content:"";width:11px;height:11px;border:4px solid #181a20;border-radius:50%;background:var(--accent)}.track{min-width:0;flex:1}.track-title{font-size:calc(16px * var(--font-scale));font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track-meta{margin-top:3px;color:#b0b6c1;font-size:calc(11px * var(--font-scale));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.state-pill,.spectrum-pill{padding:4px 7px;border-radius:7px;background:#090b0fa6;color:#cbd0d8;font-size:9px;letter-spacing:.05em}.spectrum-pill{position:absolute;right:9px;bottom:6px;color:#828a97}
      .visual-glow{animation-play-state:paused}.playing .visual-glow{animation-play-state:running}.waveform{position:absolute;z-index:2;left:12px;right:12px;top:74px;height:38px;display:flex;align-items:center;justify-content:space-between}.waveform:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#fff9}.waveform i{z-index:1;width:2px;height:var(--h);border-radius:3px;background:#fff;box-shadow:0 0 5px var(--accent);animation:wavePulse .8s ease-in-out calc(var(--i)*-.025s) infinite alternate;animation-play-state:paused}.playing .waveform i{animation-play-state:running}.bass-bars{position:absolute;z-index:2;left:10px;right:10px;bottom:0;height:55px;display:flex;align-items:end;gap:3px}.bass-bars i{flex:1;height:var(--h);min-height:7px;border:1px solid var(--accent);border-bottom:0;border-radius:3px 3px 0 0;background:#fff;box-shadow:0 0 8px var(--accent);animation:bassPulse .72s ease-in-out calc(var(--i)*-.055s) infinite alternate;animation-play-state:paused;transform-origin:bottom}.playing .bass-bars i{animation-play-state:running}.live-spectrum .waveform i,.live-spectrum .bass-bars i{animation:none;transition:height .09s linear,opacity .16s ease}.live-spectrum .bass-bars i{min-height:0}.live-spectrum .spectrum-pill{color:var(--accent)}.paused .mini-wave i,.paused .waveform i{height:0!important;opacity:0!important}.paused .bass-bars i{height:0!important;min-height:0;opacity:0!important}
      .timeline{flex:0 0 auto;padding:10px 3px 3px}.range{appearance:none;width:100%;height:3px;border-radius:4px;background:linear-gradient(90deg,var(--accent) var(--seek),#5c626d var(--seek));cursor:pointer}.range::-webkit-slider-thumb{appearance:none;width:11px;height:11px;border:3px solid #fff;border-radius:50%;background:var(--accent);box-shadow:0 2px 9px #0008}.times{display:flex;justify-content:space-between;margin-top:4px;color:#757d8b;font-size:10px;font-variant-numeric:tabular-nums}.controls{display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:10px;padding:1px 3px 7px}.controls .icon{width:36px;height:36px}.controls .toggle{width:47px;height:47px;border-radius:15px}.volume{display:flex;flex:0 0 auto;align-items:center;gap:9px;padding:2px 3px 0;color:#858d9a}.volume svg{width:15px}.volume .range{min-width:0;flex:1;background:linear-gradient(90deg,var(--accent) var(--volume),#5c626d var(--volume))}.volume-label{width:24px;text-align:right;font-variant-numeric:tabular-nums}
      .browser-column{display:flex;min-width:0;min-height:0;flex-direction:column;padding:11px 12px 12px}.mode-tabs,.subtabs{display:flex;align-items:center;gap:4px}.mode-tabs{flex:0 0 auto;margin-bottom:8px}.mode,.subtab{padding:7px 9px;border-radius:9px;background:transparent;color:#858d9a;font-weight:650}.mode.active,.subtab.active{background:#ffffff10;color:#fff}.mode svg{width:14px;height:14px;margin-right:4px;vertical-align:-3px}.browse-pane,.search-pane,.library-pane,.collection-pane,.playlist-pane{display:flex;flex:1;min-height:0;flex-direction:column}.search-toolbar{display:flex;flex:0 0 auto;align-items:center;gap:6px}.search-toolbar .subtabs{flex:0 0 auto}.search-row{display:flex;min-width:0;flex:1;gap:6px}.search-row input{min-width:0;flex:1;border:1px solid #343945;border-radius:11px;background:#090b0fcc;color:#fff;padding:9px 10px;outline:0}.search-row input:focus{border-color:#6c7482}.search-button{padding:0 12px;border-radius:11px;background:var(--accent);color:#111319;font-weight:700}.pane-head{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:6px}.pane-actions{display:flex;align-items:center;gap:4px}.refresh-library,.refresh-collection{width:29px;height:29px;border-radius:9px;background:#ffffff08;color:#9ba2ad}.save-liked,.new-local-playlist{padding:6px 8px;border-radius:9px;background:#ffffff0a;color:#cbd0d8;font-size:10px}.message{flex:0 0 auto;min-height:25px;padding:7px 3px 4px;color:#8c94a1;font-size:11px}.results{flex:1;min-height:58px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#3c414c transparent}.item-row{display:flex;align-items:center;width:100%;gap:2px;border-radius:11px}.item-row:hover{background:#ffffff0b}.item{display:flex;align-items:center;min-width:0;flex:1;gap:9px;padding:8px 5px 8px 7px;border-radius:11px;background:transparent;text-align:left}.favorite-button,.playlist-add-button,.playlist-edit-button,.playlist-delete-button,.playlist-remove-button{display:grid;place-items:center;width:29px;height:29px;flex:0 0 auto;padding:0;border-radius:9px;background:transparent;color:#68717f;font-size:17px;line-height:1}.favorite-button:hover,.favorite-button.is-saved,.playlist-add-button:hover,.playlist-edit-button:hover{color:var(--accent);background:#ffffff09}.playlist-delete-button:hover,.playlist-remove-button:hover{color:#ff8994;background:#ff596812}.favorite-button:disabled,.playlist-add-button:disabled{opacity:.25}.index{display:grid;place-items:center;width:26px;height:26px;flex:0 0 auto;border-radius:8px;background:#ffffff09;color:#777f8c;font-size:9px}.grow{min-width:0;flex:1}.title,.meta{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-weight:650}.meta{margin-top:1px;color:#858d99;font-size:11px}.empty{padding:23px 8px;text-align:center;color:#747c89}.empty strong{display:block;color:#aeb4be;font-size:13px}.empty span{display:block;margin-top:4px;font-size:11px}
      .item.is-unavailable{background:linear-gradient(90deg,#ff59680d,transparent 78%);box-shadow:inset 2px 0 #ff788544}.item.is-unavailable:hover{background:linear-gradient(90deg,#ff596817,transparent 82%)}.item.is-unavailable .title{color:#c8ced8}.item.is-unavailable .meta{color:#747d8b}.item-status{display:inline-flex;flex:0 0 auto;align-items:center;gap:4px;padding:3px 6px;border:1px solid transparent;border-radius:999px;font-size:9px;font-weight:750;line-height:1;white-space:nowrap}.item-status svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2}.item-status.is-blocked{border-color:#ff66752e;background:#ff59681a;color:#ff9aa3}.item-status.is-unknown{border-color:#aab5c52b;background:#aab5c512;color:#adb5c4}.item-status.is-trial{border-color:#f3ca7530;background:#f3ca7515;color:#f3ca75}.item-status.is-arrow{padding:0;border:0;background:none;color:var(--accent);font-size:14px}.item.is-loading{pointer-events:none}.item.is-loading .item-status>*{display:none}.item.is-loading .item-status:after{content:"加载中"}
      .collection-dialog{position:absolute;z-index:15;inset:0;display:grid;place-items:center;padding:18px;background:#05070aa8;backdrop-filter:blur(8px)}.collection-dialog-card{width:min(320px,100%);max-height:310px;overflow:auto;padding:14px;border:1px solid #ffffff20;border-radius:18px;background:rgba(var(--panel-top),.98);box-shadow:0 22px 60px #000c;scrollbar-width:thin}.dialog-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.dialog-title{font-weight:750}.dialog-close{width:27px;height:27px;border-radius:8px;background:transparent;color:#89909c}.dialog-name-row{display:flex;gap:6px}.dialog-name{min-width:0;flex:1;padding:9px 10px;border:1px solid #39404c;border-radius:10px;background:#090b0f;color:#fff;outline:0}.dialog-name:focus{border-color:var(--accent)}.dialog-confirm{padding:8px 11px;border-radius:10px;background:var(--accent);color:#111319;font-weight:750}.dialog-message{min-height:18px;margin-top:7px;color:#939ba8;font-size:10px}.dialog-choices{display:grid;gap:5px;margin-top:8px}.dialog-choice{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-radius:10px;background:#ffffff09;color:#eef1f5;text-align:left}.dialog-choice small{color:#858d99}.dialog-danger{background:#ff59681a;color:#ff9aa3}
      .playlist-head{display:grid;grid-template-columns:31px minmax(0,1fr) auto;align-items:center;gap:7px;flex:0 0 auto;padding-bottom:5px}.playlist-back{width:31px;height:31px;padding:0;border-radius:9px;background:#ffffff09;color:#b9c0ca}.playlist-copy{min-width:0}.playlist-title,.playlist-meta{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.playlist-title{font-weight:720}.playlist-meta{margin-top:1px;color:#858d99;font-size:10px}.playlist-play-all{padding:7px 9px;border-radius:9px;background:var(--accent);color:#111319;font-size:11px;font-weight:750}
      .appearance-panel{position:absolute;z-index:12;top:47px;right:11px;width:270px;max-height:calc(100% - 58px);overflow:auto;padding:13px;border:1px solid #ffffff23;border-radius:16px;background:rgba(var(--panel-top),var(--panel-opacity));box-shadow:0 18px 50px #000b;backdrop-filter:blur(28px);scrollbar-width:thin;scrollbar-color:#3c414c transparent}.appearance-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:720}.appearance-title small{color:#8e96a3;font-weight:500}.theme-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.theme-option{height:38px;border:1px solid #ffffff18;border-radius:10px;background:linear-gradient(140deg,var(--sample-a),var(--sample-b));color:#fff;font-size:10px}.theme-option.active{border-color:var(--accent);box-shadow:0 0 0 2px #ffffff12}.setting-row{display:grid;grid-template-columns:72px minmax(0,1fr) 38px;align-items:center;gap:8px;margin-top:11px;color:#b4bbc5;font-size:11px}.setting-row output{text-align:right;color:#8c94a1}.font-options{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:10px}.font-option{padding:6px 4px;border-radius:8px;background:#ffffff08;color:#929aa6;font-size:10px}.font-option.active{background:#ffffff16;color:#fff}
      .dock-setting{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid #ffffff12;color:#d1d5dc;font-size:11px}.dock-setting input{width:15px;height:15px;accent-color:var(--accent)}.dock-source{margin:7px 0 0;color:#7f8794;font-size:9px;line-height:1.45}.dock-height-row.is-disabled{opacity:.45}.dock-height-row input:disabled{cursor:not-allowed}
      .spectrum-dock{pointer-events:none;position:fixed;z-index:4;left:50%;bottom:env(safe-area-inset-bottom,0px);width:clamp(520px,62vw,1080px);height:var(--spectrum-dock-height);min-height:72px;max-height:180px;display:grid;grid-template-columns:minmax(120px,.72fr) minmax(260px,2.6fr) auto;align-items:end;gap:14px;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;transform:translateX(-50%);overflow:visible;filter:drop-shadow(0 3px 5px #000b)}.spectrum-dock-copy{min-width:0;align-self:end;margin-bottom:3px;text-shadow:0 1px 2px #000,0 2px 8px #000}.spectrum-dock-kicker{display:block;margin-bottom:4px;color:var(--accent);font-size:8px;font-weight:800;letter-spacing:.14em}.spectrum-dock-title,.spectrum-dock-meta{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.spectrum-dock-title{font-size:calc(13px * var(--font-scale));font-weight:740}.spectrum-dock-meta{margin-top:3px;color:#d4d8df;font-size:calc(9px * var(--font-scale))}.spectrum-dock-spectrum{position:relative;align-self:stretch;min-width:0;display:flex;align-items:stretch;gap:2px;padding:0 0 2px;overflow:hidden}.spectrum-dock-spectrum:after{content:"";position:absolute;left:0;right:0;bottom:1px;height:1px;background:linear-gradient(90deg,transparent,#ffffff9b 12%,#ffffff9b 88%,transparent)}.spectrum-dock-bar{position:relative;flex:1;min-width:1px}.spectrum-dock-bar:before{content:"";position:absolute;left:0;bottom:2px;width:100%;height:var(--h);border-radius:3px 3px 0 0;background:linear-gradient(90deg,var(--accent),#fff);box-shadow:0 0 7px var(--accent),0 1px 3px #000;opacity:.9;transform-origin:bottom;animation:dockPulse .72s ease-in-out calc(var(--i)*-.031s) infinite alternate;animation-play-state:paused}.spectrum-dock-bar:after{display:none}.playing:not(.live-spectrum) .spectrum-dock-bar:before,.shell[data-provider="qq"] .spectrum-dock-bar:before{animation-play-state:running}.live-spectrum .spectrum-dock-bar:before{height:calc(100% - 2px);transform:scaleY(var(--level,.08));animation:none;transition:transform .075s linear,opacity .12s ease}.paused .spectrum-dock-bar:before{transform:scaleY(0);opacity:0!important;animation:none}.spectrum-dock-actions{pointer-events:auto;display:flex;align-self:end;align-items:center;gap:2px;margin-bottom:1px;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none}.spectrum-dock-actions .icon,.spectrum-dock-actions .icon.toggle,.spectrum-dock-actions .icon:hover{width:30px;height:30px;border:0;border-radius:10px;background:transparent;color:#f7f8fa;box-shadow:none;filter:drop-shadow(0 1px 3px #000)}.spectrum-dock-actions .icon:hover{color:var(--accent);transform:translateY(-1px)}.spectrum-dock-actions .toggle{width:36px;height:36px}.spectrum-dock-actions .icon:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.spectrum-dock-mode{position:absolute;right:58px;bottom:0;color:#e1e4e9;font-size:8px;text-shadow:0 1px 3px #000,0 2px 8px #000}.live-spectrum .spectrum-dock-mode{color:var(--accent)}
      @media(max-width:700px){.spectrum-dock{bottom:env(safe-area-inset-bottom,0px);width:calc(var(--viewport-width,100vw) - 20px);grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:0}.spectrum-dock-copy,.spectrum-dock-meta,.spectrum-dock-mode{display:none}.spectrum-dock-spectrum{gap:1px}.spectrum-dock-actions .icon{width:27px;height:27px}.spectrum-dock-actions .toggle{width:32px;height:32px}}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes miniPulse{to{transform:scaleY(.35)}}@keyframes wavePulse{to{height:4px;opacity:.55}}@keyframes bassPulse{to{transform:scaleY(.35);opacity:.78}}@keyframes dockPulse{to{transform:scaleY(.28);opacity:.5}}@keyframes scan{to{transform:translateX(100%)}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}@media(max-width:640px){.panel{width:min(374px,calc(var(--viewport-width,100vw) - 16px));height:min(600px,calc(var(--viewport-height,100vh) - 16px))}.panel-grid{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(150px,284px) minmax(112px,1fr)}.player-column{min-height:0;border-right:0;border-bottom:1px solid #ffffff10;overflow:auto}.visual-stage{height:144px;flex-basis:144px}.browser-column{min-height:112px}.appearance-panel{width:min(270px,calc(100% - 22px))}}@media(max-width:640px) and (max-height:450px){.panel-head{flex-basis:42px}.panel-grid{grid-template-rows:minmax(132px,46%) minmax(112px,1fr)}.player-column{padding:7px 10px}.visual-stage{height:118px;flex-basis:118px}}@media(max-height:450px) and (min-width:641px){.panel{height:calc(var(--viewport-height,100vh) - 12px)}.panel-head{flex-basis:46px}.player-column{padding-top:8px}.visual-stage{height:146px;flex-basis:146px}.appearance-panel{top:42px}}
    </style>
    <div class="shell right paused" data-provider="netease" data-theme="obsidian">
      <button class="orb" aria-label="打开音乐控制"><i class="orb-ring"></i><span class="mini-wave">${miniBars}</span></button>
      <div class="dock"><button class="icon" data-control="prev" aria-label="上一首">${svg.prev}</button><button class="icon toggle" data-toggle aria-label="播放或暂停"><span class="play-glyph">${svg.play}</span><span class="pause-glyph">${svg.pause}</span></button><button class="icon" data-control="next" aria-label="下一首">${svg.next}</button><button class="icon panel-button" data-open-panel aria-label="展开播放器">${svg.panel}</button></div>
      <section class="panel" aria-label="CloudMusic Edge 播放器">
        <header class="panel-head"><span class="brand">CLOUDMUSIC EDGE</span><div class="head-actions"><button class="provider">网易云</button><button class="head-icon appearance-toggle" aria-label="外观设置">${svg.palette}</button><button class="head-icon close-panel" aria-label="关闭播放器">${svg.close}</button></div></header>
         <aside class="appearance-panel hidden" aria-label="外观设置"><div class="appearance-title"><span>外观</span><small>即时保存</small></div><div class="theme-grid"><button class="theme-option active" data-theme-option="obsidian" style="--sample-a:#242831;--sample-b:#0b0e12">曜石</button><button class="theme-option" data-theme-option="frost" style="--sample-a:#33435d;--sample-b:#111821">雾蓝</button><button class="theme-option" data-theme-option="jade" style="--sample-a:#1d4941;--sample-b:#091413">墨绿</button><button class="theme-option" data-theme-option="dusk" style="--sample-a:#533a56;--sample-b:#171018">暮色</button></div><label class="setting-row"><span>背景不透明度</span><input class="appearance-opacity range" type="range" min="32" max="100" value="96"><output class="opacity-value">96%</output></label><div class="font-options"><button class="font-option active" data-font="modern">现代</button><button class="font-option" data-font="rounded">圆润</button><button class="font-option" data-font="serif">衬线</button></div><label class="setting-row"><span>文字大小</span><input class="appearance-size range" type="range" min="90" max="112" value="100"><output class="size-value">100%</output></label><label class="dock-setting"><span>页面底部频谱</span><input class="appearance-dock" type="checkbox"></label><label class="setting-row dock-height-row is-disabled"><span>频谱高度</span><input class="appearance-dock-height range" type="range" min="72" max="180" value="112" disabled><output class="dock-height-value">112px</output></label><p class="dock-source">音源：当前音乐（不采集系统声音）</p></aside>
         <div class="collection-dialog hidden" role="dialog" aria-modal="true" aria-label="插件歌单操作"><div class="collection-dialog-card"><div class="dialog-head"><span class="dialog-title">插件歌单</span><button class="dialog-close" aria-label="关闭">${svg.close}</button></div><div class="dialog-name-row"><input class="dialog-name" maxlength="40" placeholder="歌单名称"><button class="dialog-confirm">保存</button></div><div class="dialog-message" aria-live="polite"></div><div class="dialog-choices"></div></div></div>
        <div class="panel-grid">
          <section class="player-column">
            <div class="visual-stage" aria-label="播放状态视觉效果"><i class="visual-glow"></i><div class="now"><div class="disc"></div><div class="track"><div class="track-title">尚未播放</div><div class="track-meta">搜索一首歌，轻轻开始</div></div><span class="state-pill">已暂停</span></div><div class="waveform" aria-hidden="true">${waveBars}</div><div class="bass-bars" aria-hidden="true">${bassBars}</div><span class="spectrum-pill">状态动画</span></div>
            <div class="timeline"><input class="range progress" type="range" min="0" max="100" value="0" aria-label="播放进度"><div class="times"><span class="position">0:00</span><span class="duration">0:00</span></div></div>
            <div class="controls"><button class="icon" data-control="prev" aria-label="上一首">${svg.prev}</button><button class="icon toggle" data-toggle aria-label="播放或暂停"><span class="play-glyph">${svg.play}</span><span class="pause-glyph">${svg.pause}</span></button><button class="icon" data-control="next" aria-label="下一首">${svg.next}</button><button class="icon" data-control="stop" aria-label="停止">${svg.stop}</button></div>
            <label class="volume">${svg.volume}<input class="range volume-range" type="range" min="0" max="100" value="70" aria-label="音量"><span class="volume-label">70</span></label>
          </section>
          <section class="browser-column">
             <nav class="mode-tabs"><button class="mode active" data-mode="search">${svg.search}搜索</button><button class="mode library-mode" data-mode="library">${svg.library}我的音乐</button><button class="mode" data-mode="collection">☆ 插件特藏</button></nav>
             <div class="browse-pane"><section class="search-pane"><div class="search-toolbar"><div class="subtabs"><button class="subtab active" data-search-type="song">歌曲</button><button class="subtab" data-search-type="playlist">歌单</button></div><div class="search-row"><input maxlength="100" placeholder="搜索歌曲"><button class="search-button">搜索</button></div></div><div class="message search-message" aria-live="polite">搜索结果会按分类保留</div><div class="results search-results"></div></section><section class="library-pane hidden"><div class="pane-head"><div class="subtabs"><button class="subtab active" data-library-type="favorite">喜欢</button><button class="subtab" data-library-type="created">创建</button><button class="subtab" data-library-type="collected">收藏</button></div><div class="pane-actions"><button class="save-liked" title="只保存当前已经加载的喜欢歌曲">特藏已加载</button><button class="refresh-library" aria-label="刷新我的音乐">${svg.refresh}</button></div></div><div class="message library-message" aria-live="polite">从官方账号读取，不保存个人歌单数据</div><div class="results library-results"></div></section><section class="collection-pane hidden"><div class="pane-head"><div class="subtabs"><button class="subtab active" data-collection-type="song">单曲</button><button class="subtab" data-collection-type="playlist">收藏歌单</button><button class="subtab" data-collection-type="local">自建歌单</button></div><div class="pane-actions"><button class="new-local-playlist hidden">＋ 新建</button><button class="refresh-collection" aria-label="刷新插件特藏">${svg.refresh}</button></div></div><div class="message collection-message" aria-live="polite">只保存在本机，不修改音乐账号</div><div class="results collection-results"></div></section></div>
            <section class="playlist-pane hidden"><header class="playlist-head"><button class="playlist-back" aria-label="返回列表">${svg.back}</button><span class="playlist-copy"><span class="playlist-title">歌单</span><span class="playlist-meta"></span></span><button class="playlist-play-all">播放全部</button></header><div class="message playlist-message" aria-live="polite">正在读取歌单…</div><div class="results playlist-results"></div></section>
          </section>
        </div>
      </section>
      <section class="spectrum-dock hidden" aria-label="页面底部音乐频谱">
        <div class="spectrum-dock-copy"><span class="spectrum-dock-kicker">NOW PLAYING</span><strong class="spectrum-dock-title">尚未播放</strong><span class="spectrum-dock-meta">等待网易云音乐播放</span></div>
        <div class="spectrum-dock-spectrum" aria-hidden="true">${spectrumDockBars}</div>
        <div class="spectrum-dock-actions"><button class="icon" data-control="prev" aria-label="上一首">${svg.prev}</button><button class="icon toggle" data-toggle aria-label="播放或暂停"><span class="play-glyph">${svg.play}</span><span class="pause-glyph">${svg.pause}</span></button><button class="icon" data-control="next" aria-label="下一首">${svg.next}</button></div>
        <span class="spectrum-dock-mode">当前音乐 · 状态动画</span>
      </section>
    </div>`;

  const shell = root.querySelector(".shell");
  const orb = root.querySelector(".orb");
  const panel = root.querySelector(".panel");
  const providerButton = root.querySelector(".provider");
  const progress = root.querySelector(".progress");
  const volume = root.querySelector(".volume-range");
  const input = root.querySelector(".search-row input");
  const searchButton = root.querySelector(".search-button");
  const searchMessage = root.querySelector(".search-message");
  const searchResults = root.querySelector(".search-results");
  const libraryMessage = root.querySelector(".library-message");
  const libraryResults = root.querySelector(".library-results");
  const collectionMessage = root.querySelector(".collection-message");
  const collectionResults = root.querySelector(".collection-results");
  const collectionDialog = root.querySelector(".collection-dialog");
  const dialogTitle = root.querySelector(".dialog-title");
  const dialogInput = root.querySelector(".dialog-name");
  const dialogConfirm = root.querySelector(".dialog-confirm");
  const dialogMessage = root.querySelector(".dialog-message");
  const dialogChoices = root.querySelector(".dialog-choices");
  const playlistPane = root.querySelector(".playlist-pane");
  const playlistMessage = root.querySelector(".playlist-message");
  const playlistResults = root.querySelector(".playlist-results");
  const appearancePanel = root.querySelector(".appearance-panel");
  const spectrumDock = root.querySelector(".spectrum-dock");
  const searchCache = new Map();
  const libraryCache = new Map();
  const collectionCache = new Map();
  const playlistCache = new Map();
  const latestSearchRequest = new Map();
  const latestLibraryRequest = new Map();
  const latestPlaylistRequest = new Map();
  const libraryInFlight = new Map();
  const fonts = {
    modern: 'Inter,"Segoe UI",system-ui,"Microsoft YaHei",sans-serif',
    rounded: '"Arial Rounded MT Bold","Microsoft YaHei UI",system-ui,sans-serif',
    serif: 'Georgia,"Songti SC","Microsoft YaHei",serif'
  };
  let provider = "netease";
  let viewMode = "search";
  let searchType = "song";
  let libraryType = "favorite";
  let collectionType = "song";
  let collectionKeys = new Set();
  let collectionDialogState = null;
  let activePlaylistKey = "";
  let latestSearchUiRequest = 0;
  let appearance = { theme: "obsidian", opacity: 96, font: "modern", size: 100, dockEnabled: false, dockHeight: 112 };
  let state = { status: "paused", position: 0, duration: 0, volume: 70, title: "", meta: "", queueLength: 0 };
  let drag;
  let snapSide = "right";
  let suppressClick = false;
  let pollTimer;
  let visualizerTimer;
  let visualizerAttached = false;
  let visualizerStarted = false;
  let visualizerPending = false;
  let visualizerGeneration = 0;
  let playbackRequestPending = false;
  const visualizerLevels = Array(10).fill(.03);
  const visualizerPreviousAbsolute = Array(10).fill(0);
  let seeking = false;

  const native = async (action, payload = {}) => {
    const response = await chrome.runtime.sendMessage({ type: "native", action, payload });
    if (!response?.ok) throw new Error(response?.error || "本地桥接未连接");
    return response.data;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const edgeSnapDistance = 64;
  const neteaseTrackPageSize = 40;
  const savePosition = () => chrome.storage.local.set({ [`float:${location.origin}`]: { left: parseFloat(host.style.left), top: parseFloat(host.style.top), snapSide } });
  const cacheKey = (sourceProvider = provider, type = searchType) => `${sourceProvider}:${type}`;
  const playlistKey = (item) => item.kind === "localPlaylist" ? `local:${item.localPlaylistId}` : `${item.provider}:${item.encryptedId || item.playlistId}`;
  const collectionKey = (item) => item.key || (item.provider === "netease"
    ? `${item.provider}:${item.kind}:${item.originalId || ""}`
    : `${item.provider}:${item.kind}:${item.kind === "playlist" ? item.playlistId || "" : item.mid || item.url || ""}`);
  const visualizerClientId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const value = Math.floor(Math.random() * 16);
    return (token === "x" ? value : (value & 3) | 8).toString(16);
  });

  chrome.storage.local.get({ provider: "netease", floatingAppearance: appearance, [`float:${location.origin}`]: null }, (data) => {
    provider = data.provider === "qq" ? "qq" : "netease";
    appearance = sanitizeAppearance(data.floatingAppearance);
    applyAppearance();
    renderProvider();
    const pos = data[`float:${location.origin}`];
    if (pos) {
      snapSide = pos.snapSide === "left" || pos.snapSide === "right" ? pos.snapSide : null;
      if (!snapSide && Number(pos.left) <= 7) snapSide = "left";
      if (!snapSide && Number(pos.left) >= viewportWidth() - 51) snapSide = "right";
      host.style.left = `${snapSide === "left" ? 6 : snapSide === "right" ? viewportWidth() - 50 : clamp(Number(pos.left) || 6, 0, viewportWidth() - 44)}px`;
      host.style.top = `${clamp(Number(pos.top) || 100, 6, viewportHeight() - 50)}px`;
      updateSide();
    }
    restoreSearch();
    loadCollectionKeys();
    refreshState();
  });

  function sanitizeAppearance(raw) {
    const themes = ["obsidian", "frost", "jade", "dusk"];
    const next = raw && typeof raw === "object" ? raw : {};
    return {
      theme: themes.includes(next.theme) ? next.theme : "obsidian",
      opacity: clamp(Number(next.opacity) || 96, 32, 100),
      font: fonts[next.font] ? next.font : "modern",
      size: clamp(Number(next.size) || 100, 90, 112),
      dockEnabled: next.dockEnabled === true,
      dockHeight: clamp(Number(next.dockHeight) || 112, 72, 180)
    };
  }
  function applyAppearance(save = false) {
    syncViewportStyles();
    shell.dataset.theme = appearance.theme;
    shell.style.setProperty("--panel-opacity", String(appearance.opacity / 100));
    shell.style.setProperty("--ui-font", fonts[appearance.font]);
    shell.style.setProperty("--font-scale", String(appearance.size / 100));
    root.querySelectorAll("[data-theme-option]").forEach((button) => button.classList.toggle("active", button.dataset.themeOption === appearance.theme));
    root.querySelectorAll("[data-font]").forEach((button) => button.classList.toggle("active", button.dataset.font === appearance.font));
    root.querySelector(".appearance-opacity").value = String(appearance.opacity);
    root.querySelector(".opacity-value").textContent = `${appearance.opacity}%`;
    root.querySelector(".appearance-size").value = String(appearance.size);
    root.querySelector(".size-value").textContent = `${appearance.size}%`;
    shell.style.setProperty("--spectrum-dock-height", `${appearance.dockHeight}px`);
    spectrumDock.classList.toggle("hidden", !appearance.dockEnabled);
    root.querySelector(".appearance-dock").checked = appearance.dockEnabled;
    root.querySelector(".appearance-dock-height").value = String(appearance.dockHeight);
    root.querySelector(".appearance-dock-height").disabled = !appearance.dockEnabled;
    root.querySelector(".dock-height-row").classList.toggle("is-disabled", !appearance.dockEnabled);
    root.querySelector(".dock-height-value").textContent = `${appearance.dockHeight}px`;
    if (save) chrome.storage.local.set({ floatingAppearance: appearance });
    schedulePoll(state.status === "playing" || panel.classList.contains("show") || appearance.dockEnabled);
    syncVisualizer();
  }
  function renderProvider() {
    const isQq = provider === "qq";
    shell.dataset.provider = provider;
    providerButton.textContent = isQq ? "QQ 音乐" : "网易云";
    root.querySelector(".library-mode").classList.toggle("hidden", isQq);
    if (isQq && viewMode === "library") setMode("search");
    renderSpectrumDockTrack();
    renderSpectrumMode();
  }
  function selectProvider(nextProvider) {
    const next = nextProvider === "qq" ? "qq" : "netease";
    if (provider === next) return;
    if (provider === "netease") stopVisualizer();
    provider = next;
    chrome.storage.local.set({ provider });
    renderProvider();
    if (provider === "netease") refreshState(); else schedulePoll(false);
  }
  function updateSide() {
    const leftSide = host.getBoundingClientRect().left < viewportWidth() / 2;
    shell.classList.toggle("left", leftSide);
    shell.classList.toggle("right", !leftSide);
    if (panel.classList.contains("show")) placePanel();
  }
  function syncViewportStyles() {
    shell.style.setProperty("--viewport-width", `${viewportWidth()}px`);
    shell.style.setProperty("--viewport-height", `${viewportHeight()}px`);
  }
  function placePanel() {
    syncViewportStyles();
    const rect = host.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    const margin = 8;
    const gap = 12;
    const availableWidth = viewportWidth();
    const availableHeight = viewportHeight();
    const panelWidth = Math.min(panel.offsetWidth || bounds.width || 660, availableWidth - margin * 2);
    const panelHeight = Math.min(panel.offsetHeight || bounds.height || 404, availableHeight - margin * 2);
    const above = rect.top - gap - panelHeight;
    const below = rect.bottom + gap;
    let top;
    let placement;
    if (above >= margin) {
      top = above;
      placement = "above";
    } else if (below + panelHeight <= availableHeight - margin) {
      top = below;
      placement = "below";
    } else {
      top = clamp(rect.top + rect.height / 2 - panelHeight / 2, margin, availableHeight - panelHeight - margin);
      placement = top < rect.top ? "above" : "below";
    }
    const left = rect.left < availableWidth / 2
      ? clamp(rect.left, margin, availableWidth - panelWidth - margin)
      : clamp(rect.right - panelWidth, margin, availableWidth - panelWidth - margin);
    panel.dataset.placement = placement;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }
  function setPanelOpen(open) {
    panel.classList.toggle("show", open);
    if (open) {
      placePanel();
      refreshState();
    } else {
      appearancePanel.classList.add("hidden");
      closeCollectionDialog();
    }
    syncVisualizer();
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
  function renderSpectrumDockTrack() {
    const isQq = provider === "qq";
    root.querySelector(".spectrum-dock-title").textContent = isQq ? "QQ 音乐" : state.title || "尚未播放";
    root.querySelector(".spectrum-dock-meta").textContent = isQq ? "从搜索结果前往官方播放器" : state.meta || "等待网易云音乐播放";
  }
  function renderSpectrumMode() {
    const live = shell.classList.contains("live-spectrum");
    root.querySelector(".spectrum-dock-mode").textContent = live ? "当前音乐 · 10 频段实时" : provider === "qq" ? "QQ 音乐 · 状态动画" : state.status === "playing" ? "当前音乐 · 状态动画" : "当前音乐 · 等待播放";
    root.querySelector(".spectrum-pill").textContent = live ? "10 频段实时" : state.status === "playing" ? "状态动画" : "等待播放";
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
    renderSpectrumDockTrack();
    renderSpectrumMode();
    schedulePoll(playing || panel.classList.contains("show") || appearance.dockEnabled);
    syncVisualizer();
  }
  async function refreshState() {
    if (!host.isConnected) { clearTimeout(pollTimer); return; }
    if (provider !== "netease") return;
    try {
      state = { ...state, ...parseState(await native("netease.control", { name: "state" })) };
      renderState();
    } catch (error) {
      if (panel.classList.contains("show")) visibleMessage().textContent = error.message;
      schedulePoll(false);
    }
  }
  function schedulePoll(active) {
    clearTimeout(pollTimer);
    if (active && host.isConnected) pollTimer = setTimeout(refreshState, 1500);
  }
  function syncVisualizer() {
    if (!document.hidden && provider === "netease" && state.status === "playing" && (panel.classList.contains("show") || appearance.dockEnabled)) startVisualizer();
    else stopVisualizer();
  }
  async function startVisualizer() {
    if (visualizerStarted || visualizerPending || provider !== "netease" || state.status !== "playing" || (!panel.classList.contains("show") && !appearance.dockEnabled)) return;
    const generation = visualizerGeneration;
    visualizerPending = true;
    try {
      const data = await native("netease.visualizer", { mode: "start", clientId: visualizerClientId });
      if (generation !== visualizerGeneration) return;
      visualizerAttached = Boolean(data?.attached);
      visualizerStarted = Boolean(data?.available);
      if (visualizerStarted) {
        renderVisualizerBands(data.bands);
        shell.classList.add("live-spectrum");
        renderSpectrumMode();
        visualizerTimer = setTimeout(readVisualizer, 80);
      }
    } catch {}
    finally { if (generation === visualizerGeneration) visualizerPending = false; }
  }
  async function readVisualizer() {
    if (!visualizerStarted || visualizerPending || provider !== "netease" || state.status !== "playing" || (!panel.classList.contains("show") && !appearance.dockEnabled)) return syncVisualizer();
    const generation = visualizerGeneration;
    visualizerPending = true;
    try {
      const data = await native("netease.visualizer", { mode: "read", clientId: visualizerClientId });
      if (generation !== visualizerGeneration) return;
      visualizerAttached = Boolean(data?.attached);
      if (!data?.available) throw new Error("频段数据尚未就绪");
      renderVisualizerBands(data.bands);
      visualizerTimer = setTimeout(readVisualizer, 80);
    } catch {
      if (generation === visualizerGeneration) stopVisualizer();
    } finally { if (generation === visualizerGeneration) visualizerPending = false; }
  }
  function quarticSignedDifference(difference, scale = 1) {
    const normalized = difference / Math.max(.0001, scale);
    const magnitude = Math.min(1, Math.abs(normalized));
    return Math.sign(normalized) * Math.pow(magnitude, 4);
  }
  function mapSpectrumTargets(rawBands, previousAbsolute) {
    const decibels = rawBands.map((raw) => {
      const value = Number(raw);
      return Number.isFinite(value) ? clamp(value, -90, 0) : -90;
    });
    const sorted = [...decibels].sort((a, b) => a - b);
    const floor = sorted[1];
    const ceiling = sorted[sorted.length - 2];
    const span = Math.max(6, ceiling - floor);
    const absolute = decibels.map((decibel) => Math.pow(clamp((decibel + 78) / 66, 0, 1), 1.2));
    const relative = decibels.map((decibel) => clamp((decibel - floor) / span, 0, 1));
    const localDifference = relative.map((value, index) => {
      const before = relative[Math.max(0, index - 1)];
      const after = relative[Math.min(relative.length - 1, index + 1)];
      return value - (before + after) / 2;
    });
    const differenceScale = Math.max(.1, ...localDifference.map(Math.abs));
    const spectralQuartic = localDifference.map((difference) => quarticSignedDifference(difference, differenceScale));
    const rises = absolute.map((value, index) => Math.max(0, value - Number(previousAbsolute?.[index] || 0)));
    const riseScale = Math.max(.06, ...rises);
    const riseQuartic = rises.map((difference) => Math.pow(clamp(difference / riseScale, 0, 1), 4));
    const targets = absolute.map((value, index) => clamp(
      .03 + .42 * value + .3 * Math.pow(relative[index], 1.55) + .26 * spectralQuartic[index] + .22 * riseQuartic[index],
      .03,
      1
    ));
    return { absolute, targets };
  }
  function smoothSpectrumLevels(current, targets) {
    return targets.map((target, index) => {
      const level = Number(current[index]) || .03;
      const difference = target - level;
      const strength = Math.min(1, Math.abs(difference));
      const alpha = difference >= 0 ? .42 + .4 * strength * strength : .16 + .2 * strength * strength;
      return clamp(level + difference * alpha, .03, 1);
    });
  }
  function expandSpectrumLevels(levels, count) {
    const adjacent = levels.slice(1).map((value, index) => value - levels[index]);
    const differenceScale = Math.max(.08, ...adjacent.map(Math.abs));
    return Array.from({ length: count }, (_, index) => {
      const scaled = index / Math.max(1, count - 1) * (levels.length - 1);
      const low = Math.floor(scaled);
      const high = Math.min(levels.length - 1, low + 1);
      const progress = scaled - low;
      const difference = levels[high] - levels[low];
      const base = levels[low] + difference * progress;
      const quarticDifference = quarticSignedDifference(difference, differenceScale);
      const bend = quarticDifference * .14 * Math.sin(Math.PI * progress);
      return clamp(base + bend, Math.min(levels[low], levels[high]), Math.max(levels[low], levels[high]));
    });
  }
  function subtractSpectrumFloor(levels, restingLevel = .015) {
    const clean = levels.map((value) => clamp(Number(value) || 0, 0, 1));
    const minimum = clean.length ? Math.min(...clean) : 0;
    return clean.map((value) => clamp(value - minimum + restingLevel, restingLevel, 1));
  }
  function renderVisualizerBands(rawBands) {
    if (!Array.isArray(rawBands) || rawBands.length !== 10) return;
    const mapped = mapSpectrumTargets(rawBands, visualizerPreviousAbsolute);
    mapped.absolute.forEach((value, index) => { visualizerPreviousAbsolute[index] = value; });
    smoothSpectrumLevels(visualizerLevels, mapped.targets).forEach((value, index) => { visualizerLevels[index] = value; });
    const waveformLevels = subtractSpectrumFloor(expandSpectrumLevels(visualizerLevels, root.querySelectorAll(".waveform i").length));
    root.querySelectorAll(".waveform i").forEach((bar, index, bars) => {
      const level = waveformLevels[index];
      bar.style.height = `${level * 36}px`;
      bar.style.opacity = String(.28 + level * .72);
    });
    const bassLevels = subtractSpectrumFloor(expandSpectrumLevels(visualizerLevels, root.querySelectorAll(".bass-bars i").length));
    root.querySelectorAll(".bass-bars i").forEach((bar, index, bars) => {
      const level = bassLevels[index];
      bar.style.height = `${level * 52}px`;
      bar.style.opacity = String(.3 + level * .7);
    });
    const dockLevels = subtractSpectrumFloor(expandSpectrumLevels(visualizerLevels, root.querySelectorAll(".spectrum-dock-bar").length));
    root.querySelectorAll(".spectrum-dock-bar").forEach((bar, index, bars) => {
      const level = dockLevels[index];
      bar.style.setProperty("--level", String(level));
      bar.style.opacity = String(.58 + level * .42);
    });
  }
  function stopVisualizer() {
    const shouldStop = visualizerAttached || visualizerStarted || visualizerPending || visualizerTimer;
    if (!shouldStop) return;
    visualizerGeneration += 1;
    clearTimeout(visualizerTimer);
    visualizerTimer = null;
    visualizerAttached = false;
    visualizerStarted = false;
    visualizerPending = false;
    visualizerLevels.fill(.03);
    visualizerPreviousAbsolute.fill(0);
    shell.classList.remove("live-spectrum");
    renderSpectrumMode();
    native("netease.visualizer", { mode: "stop", clientId: visualizerClientId }).catch(() => {});
  }
  async function control(name, value) {
    if (provider === "qq") {
      setPanelOpen(true);
      visibleMessage().textContent = "QQ 官方接口暂不提供插件内播控，请从结果打开官方播放器。";
      return;
    }
    try {
      await native("netease.control", value === undefined ? { name } : { name, value });
      await refreshState();
    } catch (error) { setPanelOpen(true); visibleMessage().textContent = error.message; }
  }

  function visibleMessage() {
    if (activePlaylistKey) return playlistMessage;
    return viewMode === "library" ? libraryMessage : viewMode === "collection" ? collectionMessage : searchMessage;
  }
  function releaseSearchButton() {
    latestSearchUiRequest += 1;
    searchButton.disabled = false;
  }
  function setMode(mode) {
    rememberViewScroll();
    releaseSearchButton();
    closePlaylist();
    viewMode = mode;
    root.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    root.querySelector(".search-pane").classList.toggle("hidden", mode !== "search");
    root.querySelector(".library-pane").classList.toggle("hidden", mode !== "library");
    root.querySelector(".collection-pane").classList.toggle("hidden", mode !== "collection");
    if (mode === "library") loadLibrary();
    else if (mode === "collection") loadCollection();
    else restoreSearch();
  }
  function rememberViewScroll() {
    if (activePlaylistKey) {
      const entry = playlistCache.get(activePlaylistKey);
      if (entry) entry.scrollTop = playlistResults.scrollTop;
    } else if (viewMode === "search") {
      const cached = searchCache.get(cacheKey());
      if (cached) cached.scrollTop = searchResults.scrollTop;
    } else if (viewMode === "library") {
      const cached = libraryCache.get(libraryType);
      if (cached) cached.scrollTop = libraryResults.scrollTop;
    } else {
      const cached = collectionCache.get(collectionType);
      if (cached) cached.scrollTop = collectionResults.scrollTop;
    }
  }
  function empty(container, title, detail) {
    container.innerHTML = '<div class="empty"><strong></strong><span></span></div>';
    container.querySelector("strong").textContent = title;
    container.querySelector("span").textContent = detail;
  }
  function availabilityBadge(item) {
    if (item.kind !== "song" || item.availability === "playable") return { label: "›", tone: "arrow", icon: "" };
    const labels = {
      copyright: "无版权",
      vip: "会员限制",
      digital_album: "需购买",
      permission: "状态未知",
      identity: "信息不全",
      full_trial: "试听",
      segment_trial: "片段"
    };
    if (item.availability === "trial") return { label: labels[item.reasonCode] || "试听", tone: "trial", icon: svg.play };
    return { label: labels[item.reasonCode] || "不可播放", tone: item.availability === "unknown" ? "unknown" : "blocked", icon: svg.lock };
  }
  function renderItems(container, items, source, options) {
    options = options || {};
    const append = options.append === true;
    const startIndex = Math.max(0, Number(options.startIndex) || 0);
    if (!append) container.replaceChildren();
    if (!items.length) return append ? undefined : empty(container, "这里还是空的", source === "library" ? "登录账号还没有相关内容" : ["playlist", "localPlaylist"].includes(source) ? "该歌单暂无歌曲" : source === "collection" ? "去搜索、我的音乐添加内容，或新建插件歌单" : "换个关键词试试");
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item-row";
      const button = document.createElement("button");
      button.className = `item${item.canPlay === false ? " is-unavailable" : item.availability === "trial" ? " is-trial" : ""}`;
      if (item.canPlay === false) button.setAttribute("aria-disabled", "true");
      button.innerHTML = `<span class="index"></span><span class="grow"><span class="title"></span><span class="meta"></span></span><span class="item-status"></span>`;
      button.querySelector(".index").textContent = item.kind === "localPlaylist" ? "自建" : item.kind === "playlist" ? "歌单" : String(startIndex + index + 1).padStart(2, "0");
      button.querySelector(".title").textContent = item.title;
      button.querySelector(".meta").textContent = item.meta;
      const badge = availabilityBadge(item);
      const status = button.querySelector(".item-status");
      status.classList.add(`is-${badge.tone}`);
      if (badge.icon) status.insertAdjacentHTML("afterbegin", badge.icon);
      const statusText = document.createElement("span");
      statusText.textContent = badge.label;
      status.appendChild(statusText);
      if (item.canPlay === false) {
        button.title = item.reasonText || "当前不可播放";
        button.setAttribute("aria-label", `${item.title}，${item.meta}，不可播放：${item.reasonText || badge.label}`);
      }
      button.addEventListener("click", () => activateItem(item, source, button));
      row.appendChild(button);
      if (item.kind === "localPlaylist") {
        const edit = document.createElement("button");
        edit.className = "playlist-edit-button";
        edit.textContent = "✎";
        edit.title = "重命名插件歌单";
        edit.setAttribute("aria-label", edit.title);
        edit.addEventListener("click", () => showPlaylistNameDialog("rename", item));
        const remove = document.createElement("button");
        remove.className = "playlist-delete-button";
        remove.textContent = "×";
        remove.title = "删除插件歌单";
        remove.setAttribute("aria-label", remove.title);
        remove.addEventListener("click", () => showDeletePlaylistDialog(item));
        row.append(edit, remove);
      } else {
        const favorite = document.createElement("button");
        const key = collectionKey(item);
        const saved = collectionKeys.has(key);
        favorite.className = `favorite-button${saved ? " is-saved" : ""}`;
        favorite.dataset.collectionKey = key;
        favorite.textContent = saved ? "★" : "☆";
        favorite.title = saved ? "从插件特藏移除" : "加入插件特藏";
        favorite.setAttribute("aria-label", favorite.title);
        favorite.disabled = !canCollect(item);
        favorite.addEventListener("click", () => toggleCollection(item, favorite));
        row.appendChild(favorite);
        if (item.kind === "song" && source !== "localPlaylist") {
          const add = document.createElement("button");
          add.className = "playlist-add-button";
          add.textContent = "＋";
          add.title = "加入插件歌单";
          add.setAttribute("aria-label", add.title);
          add.disabled = !canCollect(item);
          add.addEventListener("click", () => showAddToPlaylistDialog(item));
          row.appendChild(add);
        }
        if (item.kind === "song" && source === "localPlaylist") {
          const remove = document.createElement("button");
          remove.className = "playlist-remove-button";
          remove.textContent = "−";
          remove.title = "从当前插件歌单移除";
          remove.setAttribute("aria-label", remove.title);
          remove.addEventListener("click", () => removeFromLocalPlaylist(item, remove));
          row.appendChild(remove);
        }
      }
      fragment.appendChild(row);
    });
    container.appendChild(fragment);
  }
  function renderItemsAtScroll(container, items, source, scrollTop) {
    const preservedTop = Math.max(0, Number(scrollTop) || 0);
    renderItems(container, items, source);
    container.scrollTop = preservedTop;
  }
  function restoreSearch() {
    const cached = searchCache.get(cacheKey());
    input.value = cached?.keyword || "";
    searchMessage.textContent = cached?.message || "搜索结果会按平台和分类保留";
    if (cached) { renderItems(searchResults, cached.items, "search"); searchResults.scrollTop = cached.scrollTop || 0; }
    else empty(searchResults, searchType === "song" ? "搜索歌曲" : "搜索歌单", "切换分类不会清空已有结果");
  }

  function canCollect(item) {
    if (!item || !["song", "playlist"].includes(item.kind)) return false;
    if (item.provider === "netease") return /^[a-f0-9]{32}$/i.test(item.encryptedId || "") && /^\d{1,20}$/.test(item.originalId || "");
    if (item.provider !== "qq") return false;
    if (item.kind === "playlist") return /^\d{1,20}$/.test(item.playlistId || "");
    return /^[A-Za-z0-9_-]{4,64}$/.test(item.mid || "") || /^https:\/\/(y|i2)\.qq\.com\//.test(item.url || "");
  }
  function renderFavoriteStates() {
    root.querySelectorAll(".favorite-button").forEach((button) => {
      const saved = collectionKeys.has(button.dataset.collectionKey);
      button.classList.toggle("is-saved", saved);
      button.textContent = saved ? "★" : "☆";
      button.title = saved ? "从插件特藏移除" : "加入插件特藏";
      button.setAttribute("aria-label", button.title);
    });
  }
  async function loadCollectionKeys() {
    try {
      const data = await native("collection.keys");
      collectionKeys = new Set(Array.isArray(data?.keys) ? data.keys : []);
      renderFavoriteStates();
    } catch {}
  }
  async function toggleCollection(item, trigger) {
    if (!canCollect(item) || trigger.disabled) return;
    trigger.disabled = true;
    try {
      const result = await native("collection.toggle", { item });
      if (result.added) collectionKeys.add(result.key); else collectionKeys.delete(result.key);
      renderFavoriteStates();
      visibleMessage().textContent = result.added ? `已加入插件特藏：${item.title}` : `已从插件特藏移除：${item.title}`;
      if (viewMode === "collection" && !activePlaylistKey) await loadCollection(true);
    } catch (error) { visibleMessage().textContent = error.message; }
    finally { trigger.disabled = !canCollect(item); }
  }
  function renderCollectionEntry(entry) {
    const labels = { song: "单曲", playlist: "收藏歌单", local: "自建歌单" };
    collectionMessage.textContent = `${labels[collectionType] || "特藏"} · 已加载 ${entry.items.length} / ${entry.total}`;
    renderItemsAtScroll(collectionResults, entry.items, "collection", entry.scrollTop);
  }
  async function loadCollection(force = false, append = false) {
    const requestedType = collectionType;
    let entry = collectionCache.get(requestedType);
    if (!force && !append && entry) return renderCollectionEntry(entry);
    if (entry?.loading) return entry.loading;
    if (append && (!entry?.hasMore || entry.loading)) return;
    const offset = append ? entry.items.length : 0;
    let finish;
    const loading = new Promise((resolve) => { finish = resolve; });
    if (!entry) entry = { items: [], total: 0, hasMore: false, scrollTop: 0 };
    entry.loading = loading;
    collectionCache.set(requestedType, entry);
    collectionMessage.textContent = append ? "正在加载更多特藏…" : "正在读取插件特藏…";
    try {
      const data = requestedType === "local"
        ? await native("collection.playlists")
        : await native("collection.list", { kind: requestedType, limit: 60, offset });
      const additions = requestedType === "local"
        ? (Array.isArray(data?.playlists) ? data.playlists : []).map((playlist) => ({
            provider: "local",
            kind: "localPlaylist",
            localPlaylistId: playlist.id,
            title: playlist.name,
            meta: `插件自建 · ${Number(playlist.trackCount) || 0} 首`,
            trackCount: Number(playlist.trackCount) || 0,
            availability: "playable",
            canPlay: true,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt
          }))
        : (Array.isArray(data?.items) ? data.items : []);
      if (append) {
        const startIndex = entry.items.length;
        entry.items.push(...additions);
        entry.total = Number(data.recordCount) || entry.items.length;
        entry.hasMore = requestedType !== "local" && data.hasMore === true;
        if (collectionType === requestedType && viewMode === "collection" && !activePlaylistKey) {
          const labels = { song: "单曲", playlist: "收藏歌单", local: "自建歌单" };
          collectionMessage.textContent = `${labels[requestedType] || "特藏"} · 已加载 ${entry.items.length} / ${entry.total}`;
          renderItems(collectionResults, additions, "collection", { append: true, startIndex });
        }
      } else {
        entry.items = additions;
        entry.total = Number(data.recordCount) || additions.length;
        entry.hasMore = requestedType !== "local" && data.hasMore === true;
        entry.scrollTop = 0;
        if (collectionType === requestedType && viewMode === "collection" && !activePlaylistKey) renderCollectionEntry(entry);
      }
      await loadCollectionKeys();
    } catch (error) {
      if (collectionType === requestedType && viewMode === "collection" && !activePlaylistKey) {
        collectionMessage.textContent = `特藏读取失败：${error.message}`;
        if (!entry.items.length) empty(collectionResults, "读取失败", "请确认本地桥接已安装");
      }
    } finally {
      entry.loading = null;
      finish();
    }
  }
  function closeCollectionDialog() {
    collectionDialog.classList.add("hidden");
    collectionDialogState = null;
    dialogConfirm.disabled = false;
    dialogConfirm.classList.remove("dialog-danger");
    dialogChoices.replaceChildren();
    dialogMessage.textContent = "";
  }
  function openCollectionDialog(mode, options = {}) {
    collectionDialogState = { mode, ...options };
    collectionDialog.classList.remove("hidden");
    dialogChoices.replaceChildren();
    dialogMessage.textContent = "";
    dialogConfirm.disabled = false;
    dialogConfirm.classList.toggle("dialog-danger", mode === "delete");
    const nameRow = dialogInput.parentElement;
    nameRow.classList.toggle("hidden", mode === "delete");
    dialogInput.value = options.playlist?.title || "";
    if (mode === "create") {
      dialogTitle.textContent = "新建插件歌单";
      dialogConfirm.textContent = "创建";
      dialogInput.placeholder = "歌单名称（1–40 个字符）";
    } else if (mode === "rename") {
      dialogTitle.textContent = "重命名插件歌单";
      dialogConfirm.textContent = "保存";
      dialogInput.placeholder = "新的歌单名称";
    } else if (mode === "delete") {
      dialogTitle.textContent = "删除插件歌单";
      dialogConfirm.textContent = "确认删除";
      dialogMessage.textContent = `将删除“${options.playlist?.title || "这个歌单"}”及其中的插件缓存，不影响音乐账号。`;
    } else if (mode === "add") {
      dialogTitle.textContent = "加入插件歌单";
      dialogConfirm.textContent = "新建并加入";
      dialogInput.placeholder = "输入名称可新建歌单";
      dialogMessage.textContent = "正在读取自建歌单…";
      loadDialogPlaylistChoices(options.song);
    }
    if (mode !== "delete") setTimeout(() => dialogInput.focus(), 0);
  }
  function showPlaylistNameDialog(mode, playlist) {
    openCollectionDialog(mode, { playlist });
  }
  function showDeletePlaylistDialog(playlist) {
    openCollectionDialog("delete", { playlist });
  }
  function showAddToPlaylistDialog(song) {
    if (!canCollect(song)) return;
    openCollectionDialog("add", { song });
  }
  async function loadDialogPlaylistChoices(song) {
    try {
      const data = await native("collection.playlists");
      if (collectionDialogState?.mode !== "add" || collectionDialogState.song !== song) return;
      const playlists = Array.isArray(data?.playlists) ? data.playlists : [];
      dialogChoices.replaceChildren();
      playlists.forEach((playlist) => {
        const choice = document.createElement("button");
        choice.className = "dialog-choice";
        const label = document.createElement("span");
        label.textContent = playlist.name;
        const count = document.createElement("small");
        count.textContent = `${Number(playlist.trackCount) || 0} / 500`;
        choice.append(label, count);
        choice.addEventListener("click", () => addSongToLocalPlaylist(playlist.id, song, choice));
        dialogChoices.appendChild(choice);
      });
      dialogMessage.textContent = playlists.length ? "选择已有歌单，或输入名称新建后加入" : "还没有自建歌单，请输入名称后创建";
    } catch (error) {
      if (collectionDialogState?.mode === "add") dialogMessage.textContent = error.message;
    }
  }
  function invalidateLocalPlaylist(playlistId) {
    collectionCache.delete("local");
    if (playlistId) playlistCache.delete(`local:${playlistId}`);
  }
  async function addSongToLocalPlaylist(playlistId, song, trigger) {
    if (trigger?.disabled || !collectionDialogState) return;
    if (trigger) trigger.disabled = true;
    dialogConfirm.disabled = true;
    try {
      const result = await native("collection.addToPlaylist", { playlistId, item: song });
      invalidateLocalPlaylist(playlistId);
      closeCollectionDialog();
      visibleMessage().textContent = result.added
        ? `已加入插件歌单：${result.playlist?.name || song.title}`
        : `“${song.title}”已在该插件歌单中`;
    } catch (error) {
      dialogMessage.textContent = error.message;
      dialogConfirm.disabled = false;
      if (trigger) trigger.disabled = false;
    }
  }
  async function submitCollectionDialog() {
    const dialogState = collectionDialogState;
    if (!dialogState || dialogConfirm.disabled) return;
    const name = dialogInput.value.trim();
    if (dialogState.mode !== "delete" && !name) {
      dialogMessage.textContent = "请输入 1–40 个字符的歌单名称";
      dialogInput.focus();
      return;
    }
    dialogConfirm.disabled = true;
    try {
      if (dialogState.mode === "create") {
        const result = await native("collection.createPlaylist", { name });
        invalidateLocalPlaylist(result.playlist?.id);
        closeCollectionDialog();
        await loadCollection(true);
      } else if (dialogState.mode === "rename") {
        const playlistId = dialogState.playlist.localPlaylistId;
        await native("collection.renamePlaylist", { playlistId, name });
        invalidateLocalPlaylist(playlistId);
        closeCollectionDialog();
        await loadCollection(true);
      } else if (dialogState.mode === "delete") {
        const playlistId = dialogState.playlist.localPlaylistId;
        await native("collection.deletePlaylist", { playlistId });
        invalidateLocalPlaylist(playlistId);
        closeCollectionDialog();
        await loadCollection(true);
      } else if (dialogState.mode === "add") {
        const created = await native("collection.createPlaylist", { name });
        const playlistId = created.playlist?.id;
        if (!playlistId) throw new Error("创建插件歌单失败");
        await addSongToLocalPlaylist(playlistId, dialogState.song);
      }
    } catch (error) {
      dialogMessage.textContent = error.message;
      dialogConfirm.disabled = false;
    }
  }
  async function removeFromLocalPlaylist(song, trigger) {
    const entry = playlistCache.get(activePlaylistKey);
    const playlistId = entry?.playlist?.localPlaylistId;
    if (!entry?.local || !playlistId || trigger.disabled) return;
    entry.scrollTop = playlistResults.scrollTop;
    trigger.disabled = true;
    try {
      const result = await native("collection.removeFromPlaylist", { playlistId, trackKey: collectionKey(song) });
      entry.items = entry.items.filter((item) => collectionKey(item) !== result.trackKey);
      entry.total = Number(result.playlist?.trackCount) || 0;
      entry.hasMore = entry.items.length < entry.total;
      entry.playlist.trackCount = entry.total;
      entry.playlist.meta = `插件自建 · ${entry.total} 首`;
      entry.message = `${availabilitySummary(entry.items)}${entry.total > entry.items.length ? ` / 共 ${entry.total}` : ""} · 点击可播歌曲`;
      collectionCache.delete("local");
      if (activePlaylistKey === `local:${playlistId}`) showPlaylist(entry);
    } catch (error) {
      playlistMessage.textContent = error.message;
      trigger.disabled = false;
    }
  }
  function maybeAutoLoadCollection() {
    const entry = collectionCache.get(collectionType);
    if (viewMode === "collection" && !activePlaylistKey && entry?.hasMore && !entry.loading && isNearListEnd(collectionResults)) loadCollection(false, true);
  }
  async function saveLoadedFavorites() {
    const entry = libraryCache.get("favorite");
    const button = root.querySelector(".save-liked");
    const items = (entry?.items || []).filter(canCollect);
    if (!items.length) { libraryMessage.textContent = "请先加载喜欢的歌曲"; return; }
    button.disabled = true;
    let added = 0;
    try {
      for (let offset = 0; offset < items.length; offset += 100) {
        const result = await native("collection.import", { items: items.slice(offset, offset + 100) });
        added += Number(result.addedCount) || 0;
      }
      await loadCollectionKeys();
      collectionCache.clear();
      libraryMessage.textContent = `已把当前加载的 ${items.length} 首加入插件特藏（新增 ${added} 首）`;
    } catch (error) { libraryMessage.textContent = error.message; }
    finally { button.disabled = false; }
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
  function qqList(data, kind) {
    const direct = kind === "song" ? (data?.songs || data?.songlist || data?.trackList || []) : (data?.playlists || data?.dissList || []);
    if (direct.length) return direct;
    const candidates = arrays(data).filter((list) => list.some((item) => item && typeof item === "object" && (kind === "song" ? (item.songMid || item.songName) : (item.dissId || item.dissName))));
    return candidates.sort((a, b) => b.length - a.length)[0] || [];
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
  function availabilitySummary(items) {
    const tracks = items.filter((item) => item.kind === "song");
    if (!tracks.length) return `${items.length} 项`;
    const playable = tracks.filter((item) => item.canPlay !== false).length;
    return `已加载 ${tracks.length} · 可播 ${playable} · 暂不可播 ${tracks.length - playable}`;
  }
  function normalize(data) {
    const kind = arguments[1] || searchType;
    const sourceProvider = arguments[2] || provider;
    if (sourceProvider === "qq") {
      return qqList(data, kind).map((x) => ({
        provider: sourceProvider,
        kind,
        title: x.songName || x.name || x.dissName || "未命名",
        meta: x.singerName || x.artistName || x.creatorName || x.dissDesc || "QQ 音乐",
        url: x.songH5Url || x.h5Url,
        mid: x.songMid || x.mid,
        playlistId: String(x.dissId || x.playlistId || ""),
        trackCount: Number(x.songCount || x.trackCount) || 0,
        visible: true
      })).filter((x) => kind === "song" ? x.mid || x.url : /^\d{1,20}$/.test(x.playlistId));
    }
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const explicit = Array.isArray(body) ? body : body?.records || body?.songs || body?.playlists;
    const list = explicit || arrays(payload).sort((a, b) => b.length - a.length)[0] || [];
    return list.map((x) => {
      const encryptedId = x.encryptedId || x.encrypted_id || x.id || x.resourceId || "";
      const originalId = String(x.originalId || x.original_id || x.originId || x.rawId || "");
      let access = kind === "song" ? neteaseAvailability(x) : { availability: "playable", playMode: "full", reasonCode: "playlist", reasonText: "打开歌单", canPlay: true };
      if (kind === "song" && (!/^[a-f\d]{32}$/i.test(String(encryptedId)) || !/^\d{1,20}$/.test(originalId))) {
        access = { availability: "unknown", playMode: null, reasonCode: "identity", reasonText: "资源标识不完整", canPlay: false };
      }
      return { provider: sourceProvider, kind, title: x.name || x.songName || x.playlistName || x.title || "未命名", meta: x.artistName || x.singerName || artistText(x) || x.creatorNickName || x.creatorName || x.description || `${Number(x.trackCount) || 0} 首`, encryptedId: String(encryptedId), originalId, trackCount: Number(x.trackCount) || 0, visible: access.canPlay, ...access };
    }).filter((x) => kind === "playlist" ? x.encryptedId : true);
  }
  function normalizeLibrary(data, kind) {
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const records = kind === "favorite" ? (body ? [body] : []) : (body?.records || []);
    return records.map((x) => ({ provider: "netease", kind: "playlist", title: x.name || "未命名歌单", meta: `${x.creatorNickName || (kind === "created" ? "我创建" : kind === "collected" ? "我收藏" : "我的红心")} · ${Number(x.trackCount) || 0} 首`, encryptedId: x.id, originalId: String(x.originalId || ""), trackCount: Number(x.trackCount) || 0, visible: true })).filter((x) => x.encryptedId && x.originalId);
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
    const uiRequest = ++latestSearchUiRequest;
    latestSearchRequest.set(requestedKey, requestId);
    searchMessage.textContent = "正在搜索…";
    searchButton.disabled = true;
    try {
      const data = await native(`${requestedProvider}.search`, { keyword, type: requestedType });
      if (latestSearchRequest.get(requestedKey) !== requestId) return;
      const items = normalize(data, requestedType, requestedProvider);
      const entry = { keyword, items, message: items.length ? `${availabilitySummary(items)} · 已缓存此分类` : "没有找到结果" };
      searchCache.set(requestedKey, entry);
      if (cacheKey() !== requestedKey || activePlaylistKey) return;
      searchMessage.textContent = entry.message;
      renderItems(searchResults, items, "search");
    } catch (error) {
      if (latestSearchRequest.get(requestedKey) === requestId && cacheKey() === requestedKey && !activePlaylistKey) searchMessage.textContent = error.message;
    } finally {
      if (latestSearchUiRequest === uiRequest) searchButton.disabled = false;
    }
  }
  function libraryBatch(data) {
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    const raw = Array.isArray(body) ? body : (body?.records || []);
    return { raw, total: Number(body?.recordCount) || raw.length };
  }
  function libraryStatus(type, items, total) {
    const label = type === "favorite" ? "喜欢的歌曲" : type === "created" ? "我创建的歌单" : "我收藏的歌单";
    const loaded = items.length;
    return type === "favorite" ? `${label} · ${availabilitySummary(items)}${total > loaded ? ` / 共 ${total}` : ""}` : `${label} · ${loaded}${total > loaded ? ` / ${total}` : ""}`;
  }
  function renderLibraryEntry(type, entry) {
    libraryMessage.textContent = entry.message;
    renderItemsAtScroll(libraryResults, entry.items, "library", entry.scrollTop);
  }
  async function loadLibrary(force = false) {
    if (provider !== "netease") return;
    const requestedType = libraryType;
    if (!force && libraryCache.has(requestedType)) return renderLibraryEntry(requestedType, libraryCache.get(requestedType));
    const pending = libraryInFlight.get(requestedType);
    if (pending) {
      if (force && libraryCache.get(requestedType)?.loadingMore === pending) {
        await pending;
        return loadLibrary(true);
      }
      return pending;
    }
    let finishLoading;
    const inFlight = new Promise((resolve) => { finishLoading = resolve; });
    libraryInFlight.set(requestedType, inFlight);
    const requestId = (latestLibraryRequest.get(requestedType) || 0) + 1;
    latestLibraryRequest.set(requestedType, requestId);
    libraryMessage.textContent = requestedType === "favorite" ? "正在读取喜欢的歌曲…" : "正在读取个人歌单…";
    if (!libraryCache.has(requestedType)) libraryResults.replaceChildren();
    try {
      let items;
      let favoritePlaylist;
      let batch;
      if (requestedType === "favorite") {
        const favorite = normalizeLibrary(await native("netease.library", { kind: "favorite" }), "favorite")[0];
        if (!favorite) throw new Error("没有找到红心歌单");
        favoritePlaylist = favorite;
        const tracks = await native("netease.playlistTracks", { playlistId: favorite.encryptedId, limit: neteaseTrackPageSize, offset: 0 });
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
      entry.message = libraryStatus(requestedType, entry.items, entry.total);
      libraryCache.set(requestedType, entry);
      if (libraryType === requestedType && viewMode === "library" && !activePlaylistKey) renderLibraryEntry(requestedType, entry);
    } catch (error) {
      if (latestLibraryRequest.get(requestedType) !== requestId || libraryType !== requestedType || viewMode !== "library" || activePlaylistKey) return;
      const cached = libraryCache.get(requestedType);
      if (cached) { renderLibraryEntry(requestedType, cached); libraryMessage.textContent = `刷新失败：${error.message}`; }
      else { libraryMessage.textContent = error.message; empty(libraryResults, "读取失败", "请确认网易云账号仍处于登录状态"); }
    } finally {
      if (libraryInFlight.get(requestedType) === inFlight) libraryInFlight.delete(requestedType);
      finishLoading();
    }
  }
  async function loadMoreLibrary() {
    const requestedType = libraryType;
    const entry = libraryCache.get(requestedType);
    if (!entry?.hasMore || entry.loadingMore || libraryInFlight.has(requestedType) || provider !== "netease") return;
    let finishLoading;
    const inFlight = new Promise((resolve) => { finishLoading = resolve; });
    entry.loadingMore = inFlight;
    libraryInFlight.set(requestedType, inFlight);
    const requestId = (latestLibraryRequest.get(requestedType) || 0) + 1;
    latestLibraryRequest.set(requestedType, requestId);
    entry.scrollTop = libraryResults.scrollTop;
    libraryMessage.textContent = "正在自动加载更多…";
    try {
      const data = requestedType === "favorite"
        ? await native("netease.playlistTracks", { playlistId: entry.favoritePlaylist.encryptedId, limit: neteaseTrackPageSize, offset: entry.offset })
        : await native("netease.library", { kind: requestedType, limit: 80, offset: entry.offset });
      if (latestLibraryRequest.get(requestedType) !== requestId) return;
      const batch = libraryBatch(data);
      const additions = requestedType === "favorite" ? normalize(data, "song", "netease") : normalizeLibrary(data, requestedType);
      const startIndex = entry.items.length;
      const appended = mergeUnique(entry.items, additions);
      entry.offset += batch.raw.length;
      entry.hasMore = batch.raw.length > 0 && entry.offset < entry.total;
      entry.message = libraryStatus(requestedType, entry.items, entry.total);
      if (libraryType === requestedType && viewMode === "library" && !activePlaylistKey) {
        libraryMessage.textContent = entry.message;
        renderItems(libraryResults, appended, "library", { append: true, startIndex });
      }
    } catch (error) {
      if (latestLibraryRequest.get(requestedType) === requestId && libraryType === requestedType && viewMode === "library" && !activePlaylistKey) {
        libraryMessage.textContent = `自动加载失败：${error.message}；再次滚到底部可重试`;
      }
    } finally {
      if (entry.loadingMore === inFlight) entry.loadingMore = null;
      if (libraryInFlight.get(requestedType) === inFlight) libraryInFlight.delete(requestedType);
      finishLoading();
    }
  }
  function mergeUnique(target, additions) {
    const identity = (item, index) => {
      const stable = item.encryptedId || item.originalId || item.mid || item.url;
      return stable ? `${item.kind}:${stable}` : `${item.kind}:unidentified:${index}:${item.title}\u0000${item.meta}`;
    };
    const existing = new Set(target.map((item, index) => identity(item, index)));
    const appended = additions.filter((item, index) => {
      const key = identity(item, target.length + index);
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    target.push(...appended);
    return appended;
  }
  function findTotal(value) {
    if (!value || typeof value !== "object") return 0;
    for (const key of ["recordCount", "trackCount", "songCount", "songTotalNum", "totalNum", "total"]) {
      const count = Number(value[key]);
      if (Number.isFinite(count) && count > 0) return count;
    }
    for (const child of Object.values(value)) {
      const found = findTotal(child);
      if (found) return found;
    }
    return 0;
  }
  function rawTrackCount(data, sourceProvider) {
    if (sourceProvider === "qq") return qqList(data, "song").length;
    const payload = payloadOf(data);
    const body = payload?.data || payload;
    if (Array.isArray(body)) return body.length;
    return (body?.records || body?.songs || []).length;
  }
  function showPlaylist(entry) {
    activePlaylistKey = playlistKey(entry.playlist);
    root.querySelector(".mode-tabs").classList.add("hidden");
    root.querySelector(".browse-pane").classList.add("hidden");
    playlistPane.classList.remove("hidden");
    root.querySelector(".playlist-title").textContent = entry.playlist.title;
    root.querySelector(".playlist-meta").textContent = entry.playlist.meta || `${entry.items.length} 首`;
    const playAll = root.querySelector(".playlist-play-all");
    playAll.textContent = entry.local ? "逐首选择" : entry.playlist.provider === "qq" ? "官方打开" : "播放全部";
    playAll.disabled = entry.local || (entry.playlist.provider === "netease" && !/^\d{1,20}$/.test(entry.playlist.originalId || ""));
    playlistMessage.textContent = entry.message || "选择一首歌曲播放";
    renderItemsAtScroll(playlistResults, entry.items, entry.local ? "localPlaylist" : "playlist", entry.scrollTop);
  }
  function closePlaylist() {
    if (!activePlaylistKey) return;
    const entry = playlistCache.get(activePlaylistKey);
    if (entry) entry.scrollTop = playlistResults.scrollTop;
    activePlaylistKey = "";
    playlistPane.classList.add("hidden");
    root.querySelector(".browse-pane").classList.remove("hidden");
    root.querySelector(".mode-tabs").classList.remove("hidden");
    if (viewMode === "library") {
      const cached = libraryCache.get(libraryType);
      if (cached) renderLibraryEntry(libraryType, cached);
    } else if (viewMode === "collection") {
      const cached = collectionCache.get(collectionType);
      if (cached) renderCollectionEntry(cached); else loadCollection();
    } else restoreSearch();
  }
  async function openPlaylist(item) {
    rememberViewScroll();
    const key = playlistKey(item);
    let entry = playlistCache.get(key);
    if (!entry) {
      entry = { playlist: item, items: [], offset: 0, page: 0, total: item.trackCount || 0, hasMore: false, scrollTop: 0, message: "正在读取歌单…" };
      playlistCache.set(key, entry);
    }
    showPlaylist(entry);
    if (!entry.loaded) await loadPlaylist(true);
  }
  async function openLocalPlaylist(item) {
    rememberViewScroll();
    const key = playlistKey(item);
    let entry = playlistCache.get(key);
    if (!entry) {
      entry = { playlist: item, local: true, items: [], offset: 0, page: 0, total: item.trackCount || 0, hasMore: false, scrollTop: 0, message: "正在读取插件歌单…" };
      playlistCache.set(key, entry);
    }
    showPlaylist(entry);
    if (!entry.loaded) await loadPlaylist(true);
  }
  async function loadPlaylist(force = false) {
    const key = activePlaylistKey;
    const entry = playlistCache.get(key);
    if (!entry) return;
    if (entry.loading) return entry.loading;
    let finishLoading;
    const loading = new Promise((resolve) => { finishLoading = resolve; });
    entry.loading = loading;
    const requestId = (latestPlaylistRequest.get(key) || 0) + 1;
    latestPlaylistRequest.set(key, requestId);
    const requestedPage = force ? 0 : entry.page;
    const requestedOffset = force ? 0 : entry.offset;
    if (!force) entry.scrollTop = playlistResults.scrollTop;
    playlistMessage.textContent = force ? "正在读取歌单…" : "正在加载更多歌曲…";
    try {
      const data = entry.local
        ? await native("collection.playlistTracks", { playlistId: entry.playlist.localPlaylistId, limit: 60, offset: requestedOffset })
        : entry.playlist.provider === "qq"
          ? await native("qq.playlistDetail", { playlistId: entry.playlist.playlistId, page: requestedPage })
          : await native("netease.playlistTracks", { playlistId: entry.playlist.encryptedId, limit: neteaseTrackPageSize, offset: requestedOffset });
      if (latestPlaylistRequest.get(key) !== requestId) return;
      const additions = entry.local ? (Array.isArray(data?.items) ? data.items : []) : normalize(data, "song", entry.playlist.provider);
      const rawCount = entry.local ? additions.length : rawTrackCount(data, entry.playlist.provider);
      const startIndex = force ? 0 : entry.items.length;
      const appended = force ? additions : mergeUnique(entry.items, additions);
      if (force) entry.items = additions;
      entry.offset = requestedOffset + rawCount;
      entry.page = requestedPage + 1;
      entry.total = entry.local ? Number(data.recordCount) || additions.length : Math.max(entry.total, findTotal(data));
      if (entry.local && data.playlist) {
        entry.playlist.title = data.playlist.name || entry.playlist.title;
        entry.playlist.trackCount = Number(data.playlist.trackCount) || 0;
        entry.playlist.meta = `插件自建 · ${entry.playlist.trackCount} 首`;
      }
      const pageSize = entry.local ? 60 : entry.playlist.provider === "qq" ? 20 : neteaseTrackPageSize;
      entry.hasMore = data.hasMore === true || (rawCount > 0 && (entry.total > 0 ? entry.offset < entry.total : rawCount >= pageSize));
      entry.loaded = true;
      entry.message = `${availabilitySummary(entry.items)}${entry.total > entry.items.length ? ` / 共 ${entry.total}` : ""} · 点击可播歌曲`;
      if (activePlaylistKey === key) {
        if (force) showPlaylist(entry);
        else {
          playlistMessage.textContent = entry.message;
          renderItems(playlistResults, appended, entry.local ? "localPlaylist" : "playlist", { append: true, startIndex });
        }
      }
    } catch (error) {
      if (latestPlaylistRequest.get(key) !== requestId || activePlaylistKey !== key) return;
      entry.message = `读取失败：${error.message}`;
      if (force) showPlaylist(entry);
      else playlistMessage.textContent = `${entry.message}；再次滚到底部可重试`;
    } finally {
      if (entry.loading === loading) entry.loading = null;
      finishLoading();
    }
  }
  function isNearListEnd(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight <= 48;
  }
  function maybeAutoLoadLibrary() {
    const entry = libraryCache.get(libraryType);
    if (provider === "netease" && viewMode === "library" && !activePlaylistKey && entry?.hasMore && !entry.loadingMore && isNearListEnd(libraryResults)) loadMoreLibrary();
  }
  function maybeAutoLoadPlaylist() {
    const entry = playlistCache.get(activePlaylistKey);
    if (entry?.hasMore && !entry.loading && isNearListEnd(playlistResults)) loadPlaylist(false);
  }
  async function playWholePlaylist(entry, trigger) {
    if (entry.local) {
      playlistMessage.textContent = "插件自建歌单可混合音乐平台，请逐首选择播放";
      return;
    }
    if (playbackRequestPending) {
      playlistMessage.textContent = "上一条播放请求正在处理，请稍候";
      return;
    }
    playbackRequestPending = true;
    const key = playlistKey(entry.playlist);
    const originalLabel = trigger?.textContent;
    if (trigger) {
      trigger.disabled = true;
      trigger.setAttribute("aria-busy", "true");
      trigger.textContent = "正在启动…";
    }
    const item = entry.playlist;
    try {
      if (item.provider === "qq") {
        if (!/^\d{1,20}$/.test(item.playlistId || "")) throw new Error("QQ 歌单地址无效");
        window.open(`https://y.qq.com/n/ryqq/playlist/${encodeURIComponent(item.playlistId)}`, "_blank", "noopener");
        return;
      }
      const result = await native("netease.playPlaylist", item);
      state = { ...state, ...parseState(result) };
      renderState();
      if (activePlaylistKey === key) playlistMessage.textContent = `正在播放：${state.title || item.title}`;
    } catch (error) {
      if (activePlaylistKey === key) playlistMessage.textContent = error.message;
    }
    finally {
      playbackRequestPending = false;
      if (trigger) {
        trigger.removeAttribute("aria-busy");
        if (activePlaylistKey === key) {
          trigger.disabled = false;
          trigger.textContent = originalLabel;
        }
      }
    }
  }
  async function activateItem(item, source, trigger) {
    if (item.kind === "localPlaylist") return openLocalPlaylist(item);
    if (item.provider && item.provider !== provider) selectProvider(item.provider);
    if (item.kind === "playlist") return openPlaylist(item);
    if (item.canPlay === false) {
      visibleMessage().textContent = item.reasonText || "当前歌曲不可播放";
      return;
    }
    if (playbackRequestPending) {
      visibleMessage().textContent = "上一条播放请求正在处理，请稍候";
      return;
    }
    playbackRequestPending = true;
    trigger?.classList.add("is-loading");
    trigger?.setAttribute("aria-busy", "true");
    try {
      if (item.provider === "qq") {
        window.open(officialQqUrl(item.url, item.mid), "_blank", "noopener");
        return;
      }
      const result = await native("netease.play", item);
      state = { ...state, ...parseState(result) };
      renderState();
      visibleMessage().textContent = `${result?.payload?.message || "正在播放"}：${state.title || item.title}`;
    } catch (error) { visibleMessage().textContent = error.message; }
    finally {
      playbackRequestPending = false;
      trigger?.classList.remove("is-loading");
      trigger?.removeAttribute("aria-busy");
    }
  }

  root.querySelector(".dock").addEventListener("click", (event) => event.stopPropagation());
  spectrumDock.addEventListener("click", (event) => event.stopPropagation());
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!appearancePanel.classList.contains("hidden") && !appearancePanel.contains(event.target) && !event.target.closest(".appearance-toggle")) appearancePanel.classList.add("hidden");
  });
  orb.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, left: host.getBoundingClientRect().left, top: host.getBoundingClientRect().top, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) {
      drag.moved = true;
      setPanelOpen(false);
    }
    host.style.left = `${clamp(drag.left + dx, 0, viewportWidth() - 44)}px`;
    host.style.top = `${clamp(drag.top + dy, 5, viewportHeight() - 49)}px`;
    updateSide();
  });
  function finishDrag() {
    if (!drag) return;
    suppressClick = drag.moved;
    const rect = host.getBoundingClientRect();
    const leftDistance = rect.left;
    const rightDistance = viewportWidth() - rect.right;
    let restingLeft;
    if (leftDistance <= edgeSnapDistance) {
      restingLeft = 6;
      snapSide = "left";
    } else if (rightDistance <= edgeSnapDistance) {
      restingLeft = viewportWidth() - 50;
      snapSide = "right";
    } else {
      restingLeft = clamp(rect.left, 0, viewportWidth() - 44);
      snapSide = null;
    }
    host.style.left = `${restingLeft}px`;
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
    if (!shell.classList.contains("open")) setPanelOpen(false);
  });
  root.querySelector("[data-open-panel]").addEventListener("click", () => setPanelOpen(!panel.classList.contains("show")));
  root.querySelector(".close-panel").addEventListener("click", () => setPanelOpen(false));
  root.querySelector(".appearance-toggle").addEventListener("click", () => appearancePanel.classList.toggle("hidden"));
  root.querySelectorAll("[data-theme-option]").forEach((button) => button.addEventListener("click", () => { appearance.theme = button.dataset.themeOption; applyAppearance(true); }));
  root.querySelectorAll("[data-font]").forEach((button) => button.addEventListener("click", () => { appearance.font = button.dataset.font; applyAppearance(true); }));
  root.querySelector(".appearance-opacity").addEventListener("input", (event) => { appearance.opacity = Number(event.target.value); applyAppearance(true); });
  root.querySelector(".appearance-size").addEventListener("input", (event) => { appearance.size = Number(event.target.value); applyAppearance(true); });
  root.querySelector(".appearance-dock").addEventListener("change", (event) => { appearance.dockEnabled = event.target.checked; applyAppearance(true); });
  root.querySelector(".appearance-dock-height").addEventListener("input", (event) => { appearance.dockHeight = Number(event.target.value); applyAppearance(true); });
  root.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", () => control(button.dataset.control)));
  root.querySelectorAll("[data-toggle]").forEach((button) => button.addEventListener("click", () => control(state.status === "playing" ? "pause" : "resume")));
  root.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  root.querySelectorAll("[data-search-type]").forEach((button) => button.addEventListener("click", () => {
    releaseSearchButton();
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
    root.querySelector(".save-liked").classList.toggle("hidden", libraryType !== "favorite");
    loadLibrary();
  }));
  root.querySelectorAll("[data-collection-type]").forEach((button) => button.addEventListener("click", () => {
    const previous = collectionCache.get(collectionType);
    if (previous) previous.scrollTop = collectionResults.scrollTop;
    collectionType = button.dataset.collectionType;
    root.querySelectorAll("[data-collection-type]").forEach((tab) => tab.classList.toggle("active", tab === button));
    root.querySelector(".new-local-playlist").classList.toggle("hidden", collectionType !== "local");
    loadCollection();
  }));
  root.querySelector(".new-local-playlist").addEventListener("click", () => showPlaylistNameDialog("create"));
  root.querySelector(".dialog-close").addEventListener("click", closeCollectionDialog);
  collectionDialog.addEventListener("click", (event) => { if (event.target === collectionDialog) closeCollectionDialog(); });
  dialogConfirm.addEventListener("click", submitCollectionDialog);
  dialogInput.addEventListener("keydown", (event) => { if (event.key === "Enter") submitCollectionDialog(); });
  root.querySelector(".save-liked").addEventListener("click", saveLoadedFavorites);
  root.querySelector(".refresh-library").addEventListener("click", () => loadLibrary(true));
  root.querySelector(".refresh-collection").addEventListener("click", () => loadCollection(true));
  libraryResults.addEventListener("scroll", maybeAutoLoadLibrary, { passive: true });
  collectionResults.addEventListener("scroll", maybeAutoLoadCollection, { passive: true });
  playlistResults.addEventListener("scroll", maybeAutoLoadPlaylist, { passive: true });
  root.querySelector(".playlist-back").addEventListener("click", closePlaylist);
  root.querySelector(".playlist-play-all").addEventListener("click", (event) => {
    const entry = playlistCache.get(activePlaylistKey);
    if (entry) playWholePlaylist(entry, event.currentTarget);
  });
  providerButton.addEventListener("click", () => {
    releaseSearchButton();
    rememberViewScroll();
    closePlaylist();
    selectProvider(provider === "netease" ? "qq" : "netease");
    restoreSearch();
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
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!collectionDialog.classList.contains("hidden")) closeCollectionDialog();
    else setPanelOpen(false);
  });
  addEventListener("pagehide", stopVisualizer);
  addEventListener("pageshow", syncVisualizer);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopVisualizer(); else syncVisualizer(); });
  addEventListener("resize", () => {
    syncViewportStyles();
    host.style.left = `${snapSide === "left" ? 6 : snapSide === "right" ? viewportWidth() - 50 : clamp(parseFloat(host.style.left) || 6, 0, viewportWidth() - 44)}px`;
    host.style.top = `${clamp(parseFloat(host.style.top) || 100, 5, viewportHeight() - 49)}px`;
    updateSide();
  });
  const removalObserver = new MutationObserver(() => {
    if (host.isConnected) return;
    clearTimeout(pollTimer);
    stopVisualizer();
    removalObserver.disconnect();
  });
  removalObserver.observe(document.documentElement, { childList: true });
})();
