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

const isNearListEnd = Function(`${readFunction("isNearListEnd")}; return isNearListEnd;`)();
if (!isNearListEnd({ scrollTop: 650, clientHeight: 300, scrollHeight: 990 })) {
  throw new Error("list should preload when it is within 48px of the bottom");
}
if (isNearListEnd({ scrollTop: 500, clientHeight: 300, scrollHeight: 990 })) {
  throw new Error("list should not preload while it is far from the bottom");
}

if (source.includes("library-load-more") || source.includes("playlist-load-more")) {
  throw new Error("manual load-more controls are still present");
}
if (!/libraryResults\.addEventListener\("scroll", maybeAutoLoadLibrary, \{ passive: true \}\)/.test(source)
    || !/playlistResults\.addEventListener\("scroll", maybeAutoLoadPlaylist, \{ passive: true \}\)/.test(source)) {
  throw new Error("library and playlist lists are not wired to passive infinite scrolling");
}
if (!/function maybeAutoLoadLibrary\([\s\S]{0,400}isNearListEnd\(libraryResults\)[\s\S]{0,160}loadMoreLibrary\(\)/.test(source)
    || !/function maybeAutoLoadPlaylist\([\s\S]{0,400}isNearListEnd\(playlistResults\)[\s\S]{0,160}loadPlaylist\(false\)/.test(source)) {
  throw new Error("bottom detection is not routed to both pagination paths");
}
if (!/entry\.loadingMore/.test(source)
    || !/renderItems\(libraryResults, appended, "library", \{ append: true, startIndex \}\)/.test(source)
    || !/renderItems\(playlistResults, appended, entry\.local \? "localPlaylist" : "playlist", \{ append: true, startIndex \}\)/.test(source)) {
  throw new Error("infinite scroll lacks request deduplication or bottom-only DOM append");
}
if (!/loadMoreLibrary\(\)[\s\S]{0,300}libraryInFlight\.has\(requestedType\)/.test(source)
    || !/entry\.loadingMore = inFlight[\s\S]{0,160}libraryInFlight\.set\(requestedType, inFlight\)/.test(source)
    || !/force && libraryCache\.get\(requestedType\)\?\.loadingMore === pending[\s\S]{0,120}await pending[\s\S]{0,120}loadLibrary\(true\)/.test(source)) {
  throw new Error("library refresh and infinite pagination do not share a single-flight boundary");
}

console.log("Infinite list scrolling and append-only pagination: OK");
