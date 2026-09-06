const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const floating = fs.readFileSync(path.join(projectRoot, "extension", "floating.js"), "utf8");
const popup = fs.readFileSync(path.join(projectRoot, "extension", "popup.js"), "utf8");
const popupCss = fs.readFileSync(path.join(projectRoot, "extension", "popup.css"), "utf8");
const popupHtml = fs.readFileSync(path.join(projectRoot, "extension", "popup.html"), "utf8");

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`缺少函数：${name}`);
  let depth = 0;
  let opened = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; opened = true; }
    if (source[index] === "}") depth -= 1;
    if (opened && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`函数没有闭合：${name}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readCssRule(source, selector) {
  const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`缺少样式规则：${selector}`);
  return match[1];
}

function assertBadgeStyles(source, baseSelector, tones) {
  const base = readCssRule(source, baseSelector);
  for (const declaration of ["display:inline-flex", "flex:0 0 auto", "border-radius:999px", "white-space:nowrap"]) {
    if (!base.replace(/\s+/g, "").includes(declaration.replace(/\s+/g, ""))) {
      throw new Error(`${baseSelector} 缺少醒目且不收缩的徽标样式：${declaration}`);
    }
  }
  for (const tone of tones) {
    const rule = readCssRule(source, `${baseSelector}.is-${tone}`);
    for (const property of ["border", "background", "color"]) {
      if (!new RegExp(`(?:^|;)\\s*${property}(?:-color)?\\s*:`).test(rule)) {
        throw new Error(`${baseSelector}.is-${tone} 缺少 ${property} 视觉区分`);
      }
    }
  }
}

function assertAvailabilityBadges(source, iconName) {
  const badgeSource = readFunction(source, "availabilityBadge");
  for (const [code, label] of [
    ["copyright", "无版权"],
    ["vip", "会员限制"],
    ["digital_album", "需购买"],
    ["permission", "状态未知"],
    ["identity", "信息不全"],
    ["full_trial", "试听"],
    ["segment_trial", "片段"]
  ]) {
    if (!badgeSource.includes(`${code}: "${label}"`)) throw new Error(`状态徽标缺少 ${code} → ${label} 映射`);
  }
  if (!badgeSource.includes(`${iconName}.lock`) || !badgeSource.includes(`${iconName}.play`)) {
    throw new Error("状态徽标必须同时包含锁定和试听图标");
  }
}

function assertAccessibleRender(source, functionName, statusClass) {
  const render = readFunction(source, functionName);
  for (const marker of [
    `class=\"${statusClass}\"`,
    'setAttribute("aria-disabled", "true")',
    'setAttribute("aria-label"',
    "item.reasonText",
    "statusText.textContent = badge.label"
  ]) {
    if (!render.includes(marker)) throw new Error(`${functionName} 缺少不可播放状态契约：${marker}`);
  }
  if (/button\.disabled\s*=\s*item\.canPlay/.test(render)) {
    throw new Error(`${functionName} 不得使用原生 disabled 隐藏键盘焦点和原因提示`);
  }
  if (!/querySelector\("\.(?:meta|result-meta)"\)\.textContent\s*=\s*item\.meta/.test(render)) {
    throw new Error(`${functionName} 应让艺人信息与不可播放原因分栏显示`);
  }
  if (!/addEventListener\("click",\s*\(\)\s*=>\s*activate(?:Item|Result)\(item/.test(render)) {
    throw new Error(`${functionName} 没有把状态项交给安全激活入口处理`);
  }
}

function assertPlaybackGuard(source, functionName, playbackPattern) {
  const activation = readFunction(source, functionName);
  const guardIndex = activation.indexOf("item.canPlay === false");
  const playbackIndex = activation.search(playbackPattern);
  if (guardIndex < 0 || playbackIndex < 0 || guardIndex > playbackIndex) {
    throw new Error(`${functionName} 必须在任何播放请求之前拦截不可播放歌曲`);
  }
  if (!/\breturn\b/.test(activation.slice(guardIndex, playbackIndex))) {
    throw new Error(`${functionName} 的不可播放分支没有提前返回`);
  }
  if (!activation.slice(guardIndex, playbackIndex).includes("reasonText")) {
    throw new Error(`${functionName} 拦截播放时没有向用户展示具体原因`);
  }
}

assertAvailabilityBadges(floating, "svg");
assertAvailabilityBadges(popup, "resultIcons");
assertAccessibleRender(floating, "renderItems", "item-status");
assertAccessibleRender(popup, "renderResults", "result-status");
assertPlaybackGuard(floating, "activateItem", /native\("netease\.play"/);
assertPlaybackGuard(popup, "activateResult", /send\("netease\.play(?:Playlist)?"/);

assertBadgeStyles(floating, ".item-status", ["blocked", "unknown", "trial"]);
assertBadgeStyles(popupCss, ".result-status", ["blocked", "unknown", "trial"]);

if ((floating.match(/class="message [^"]+" aria-live="polite"/g) || []).length < 3) {
  throw new Error("悬浮窗搜索、音乐库和歌单原因提示都必须通过 aria-live 播报");
}
if (!/id="notice"[^>]*aria-live="polite"/.test(popupHtml)) {
  throw new Error("popup 原因提示缺少 aria-live");
}

if (/\.item(?::disabled|\.is-unavailable)[^{]*\{[^}]*\bopacity\s*:/.test(floating)) {
  throw new Error("悬浮窗不可播放歌曲不得通过整行 opacity 弱化");
}
if (/\.result(?::disabled|\.is-unavailable|\[aria-disabled[^\]]*\])[^{]*\{[^}]*\bopacity\s*:/.test(popupCss)) {
  throw new Error("popup 不可播放歌曲不得通过整行 opacity 弱化");
}

console.log("Unavailable track UI contract: OK");
