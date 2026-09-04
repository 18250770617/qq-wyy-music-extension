const fs = require("fs");
const path = require("path");

const extension = path.join(__dirname, "..", "extension");
const popup = fs.readFileSync(path.join(extension, "popup.js"), "utf8");
const floating = fs.readFileSync(path.join(extension, "floating.js"), "utf8");

const popupNormalizer = popup.slice(popup.indexOf("function normalizeNetease"), popup.indexOf("function normalizeQQ"));
if (!popupNormalizer.includes("item.id") || !popupNormalizer.includes("item.artists")) {
  throw new Error("popup does not support the official ncm-cli id/artists response contract");
}
if (popupNormalizer.includes("freeTrailFlag")) {
  throw new Error("popup incorrectly treats freeTrailFlag as an unplayable result");
}

const floatingNormalizer = floating.slice(floating.indexOf("function normalize(data)"), floating.indexOf("function officialQqUrl"));
if (!floatingNormalizer.includes("x.id") || !floatingNormalizer.includes("x.artists")) {
  throw new Error("floating UI does not support the official ncm-cli id/artists response contract");
}
if (floatingNormalizer.includes("freeTrailFlag")) {
  throw new Error("floating UI incorrectly treats freeTrailFlag as an unplayable result");
}

console.log("Official ncm-cli response contract: OK");
