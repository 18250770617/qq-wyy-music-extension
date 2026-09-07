const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "extension", "floating.js"), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

const renderItemsAtScrollSource = readFunction("renderItemsAtScroll");
let renderCalls = 0;
const renderItemsAtScroll = Function("renderItems", `${renderItemsAtScrollSource}; return renderItemsAtScroll;`)(
  (container) => {
    renderCalls += 1;
    container.scrollTop = 0;
    container.scrollHeight = 1200;
  }
);

const container = { scrollTop: 386, scrollHeight: 600, clientHeight: 200 };
renderItemsAtScroll(container, [{ title: "new item" }], "playlist", 386);
if (renderCalls !== 1 || container.scrollTop !== 386) {
  throw new Error(`list rerender lost its scroll position: ${container.scrollTop}`);
}

const libraryFunction = readFunction("renderLibraryEntry");
const playlistFunction = readFunction("showPlaylist");
const loadMoreLibraryFunction = readFunction("loadMoreLibrary");
const loadPlaylistFunction = readFunction("loadPlaylist");

if (!/renderItemsAtScroll\(libraryResults, entry\.items, "library", entry\.scrollTop\)/.test(libraryFunction)
    || !/renderItemsAtScroll\(playlistResults, entry\.items, entry\.local \? "localPlaylist" : "playlist", entry\.scrollTop\)/.test(playlistFunction)) {
  throw new Error("library and playlist rerenders do not share scroll-preserving rendering");
}
if (!/entry\.scrollTop = libraryResults\.scrollTop/.test(loadMoreLibraryFunction)
    || !/if \(!force\) entry\.scrollTop = playlistResults\.scrollTop/.test(loadPlaylistFunction)) {
  throw new Error("load-more paths do not capture the current scroll position before awaiting data");
}

console.log("Load-more scroll position preservation: OK");
