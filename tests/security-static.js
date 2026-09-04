const fs = require("fs");
const path = require("path");

const extension = path.join(__dirname, "..", "extension");
const popup = fs.readFileSync(path.join(extension, "popup.js"), "utf8");
const floating = fs.readFileSync(path.join(extension, "floating.js"), "utf8");
const worker = fs.readFileSync(path.join(extension, "service-worker.js"), "utf8");

for (const [name, source] of [["popup", popup], ["floating", floating]]) {
  if (!source.includes('url.protocol === "https:"') && !source.includes('url.protocol==="https:"')) throw new Error(`${name} does not enforce HTTPS`);
  if (!source.includes('"y.qq.com"') || !source.includes('"i2.y.qq.com"')) throw new Error(`${name} does not allowlist QQ domains`);
  if (source.includes("window.open(item.url")) throw new Error(`${name} opens an unvalidated response URL`);
}
if (!worker.includes("chrome.permissions.contains") || !worker.includes("optional")) {
  // The optional declaration lives in manifest; the worker must at least check the granted origin.
  if (!worker.includes("chrome.permissions.contains")) throw new Error("worker does not verify site permission");
}
console.log("Frontend URL and per-site permission boundaries: OK");

