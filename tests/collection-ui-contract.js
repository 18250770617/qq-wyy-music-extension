const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "extension", "floating.js"), "utf8");
for (const marker of [
  'data-mode="collection"', "插件特藏", 'data-collection-type="song"', 'data-collection-type="playlist"', 'data-collection-type="local"',
  "collection.list", "collection.keys", "collection.toggle", "collection.import", "collectionCache",
  "collectionKeys", "toggleCollection", "loadCollection", "maybeAutoLoadCollection", "saveLoadedFavorites",
  "favorite-button", "item-row", "特藏已加载", "new-local-playlist", "collection-dialog",
  "collection.playlists", "collection.createPlaylist", "collection.renamePlaylist", "collection.deletePlaylist",
  "collection.addToPlaylist", "collection.removeFromPlaylist", "collection.playlistTracks",
  "openLocalPlaylist", "localPlaylist", "playlist-add-button", "playlist-remove-button"
]) {
  if (!source.includes(marker)) throw new Error(`插件特藏 UI 缺少契约：${marker}`);
}
const rowStart = source.indexOf('const row = document.createElement("div")');
const mainButton = source.indexOf('const button = document.createElement("button")', rowStart);
const favoriteButton = source.indexOf('const favorite = document.createElement("button")', mainButton);
const mainAppend = source.indexOf("row.appendChild(button)", mainButton);
const favoriteAppend = source.indexOf("row.appendChild(favorite)", favoriteButton);
if (rowStart < 0 || mainButton < rowStart || favoriteButton < mainButton || mainAppend < mainButton || favoriteAppend < favoriteButton || source.includes("button.appendChild(favorite)")) {
  throw new Error("收藏按钮必须是播放按钮的同级元素，不能形成嵌套按钮");
}
if (!/if \(item\.provider && item\.provider !== provider\) selectProvider\(item\.provider\)/.test(source)) {
  throw new Error("跨平台特藏项目没有在播放前切换到对应平台");
}
if (!/for \(let offset = 0; offset < items\.length; offset \+= 100\)/.test(source)) {
  throw new Error("批量特藏喜欢歌曲没有按 Host 上限分批");
}
if (!/collectionResults\.addEventListener\("scroll", maybeAutoLoadCollection/.test(source)) {
  throw new Error("插件特藏没有滚动到底自动加载");
}
if (/\b(?:window\.)?(?:prompt|confirm)\s*\(/.test(source)) {
  throw new Error("插件歌单必须使用自有对话框，不能调用浏览器 prompt/confirm");
}
console.log("Plugin collection floating UI contract: OK");
