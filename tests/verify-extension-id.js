const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "extension", "manifest.json"), "utf8"));
const digest = crypto.createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest().subarray(0, 16);
const id = [...digest].map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join("");
if (id !== "obokfjbjcodhoohmlpokcmcdjlijjbmk") throw new Error(`Unexpected extension id: ${id}`);
console.log(`Stable extension id: ${id}`);

