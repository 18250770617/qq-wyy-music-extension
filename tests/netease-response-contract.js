const fs = require("fs");
const path = require("path");

const extension = path.join(__dirname, "..", "extension");
const popup = fs.readFileSync(path.join(extension, "popup.js"), "utf8");
const floating = fs.readFileSync(path.join(extension, "floating.js"), "utf8");

function readFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let depth = 0;
  let opened = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; opened = true; }
    if (source[index] === "}") depth -= 1;
    if (opened && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadAvailability(source) {
  return Function(`${readFunction(source, "neteaseAvailability")}; return neteaseAvailability;`)();
}

const popupNormalizer = popup.slice(popup.indexOf("function normalizeNetease"), popup.indexOf("function normalizeQQ"));
if (!popupNormalizer.includes("item.id") || !popup.includes("item.artists")) {
  throw new Error("popup does not support the official ncm-cli id/artists response contract");
}

const floatingNormalizer = floating.slice(floating.indexOf("function normalize(data)"), floating.indexOf("function officialQqUrl"));
if (!floatingNormalizer.includes("x.id") || !floating.includes("item.artists")) {
  throw new Error("floating UI does not support the official ncm-cli id/artists response contract");
}
if (/filter\s*\([^)]*visible/.test(floatingNormalizer)) throw new Error("floating UI still removes unavailable tracks");

const fixtures = [
  [{ playFlag: true }, "playable", true],
  [{ playFlag: true, visible: false }, "blocked", false],
  [{ playFlag: "false", visible: true, songFee: 1 }, "blocked", false],
  [{ playFlag: "true", visible: true }, "unknown", false],
  [{ playFlag: false, visible: false }, "blocked", false],
  [{ playFlag: false, visible: true, resConsumable: true, userConsumable: true }, "trial", true],
  [{ playFlag: false, visible: true, freeTrailFlag: true }, "trial", true],
  [{ playFlag: false, visible: true, songFee: 1 }, "blocked", false],
  [{ playFlag: false, visible: true, songFee: 4 }, "blocked", false],
  [{}, "unknown", false]
];
for (const source of [popup, floating]) {
  const availability = loadAvailability(source);
  fixtures.forEach(([input, expected, canPlay]) => {
    const actual = availability(input);
    if (actual.availability !== expected || actual.canPlay !== canPlay || !actual.reasonText) {
      throw new Error(`availability contract mismatch for ${JSON.stringify(input)}: ${JSON.stringify(actual)}`);
    }
  });
  const artists = Function(`${readFunction(source, "artistText")}; return artistText;`)();
  if (artists({ artists: "歌手甲 / 歌手乙" }) !== "歌手甲 / 歌手乙") throw new Error("joined artist text is not supported");
  if (artists({ artists: [{ name: "歌手甲" }, { name: "歌手乙" }] }) !== "歌手甲 / 歌手乙") throw new Error("artist arrays are not supported");
}

console.log("Official ncm-cli response contract: OK");
