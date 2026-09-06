const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "native-host", "BridgeHost.cs"), "utf8");

function readMethod(name) {
  const start = source.indexOf(name);
  if (start < 0) throw new Error(`missing method ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated method ${name}`);
}

for (const marker of [
  "SyncCurrentTrackFromNcmState",
  "WaitForMpvTrackChange",
  'GetMpvProperty("path")',
  'GetMpvProperty("playlist-pos")',
  'RunNcm(new[] { "state" }'
]) {
  if (!source.includes(marker)) throw new Error(`native player identity sync is missing: ${marker}`);
}
if (!/case "state":[\s\S]{0,900}SyncCurrentTrackFromNcmState\(state\)/.test(source)) {
  throw new Error("state polling does not reconcile the displayed title with the official CLI session");
}
if (!/case "next":[\s\S]{0,120}MoveManagedTrack/.test(source) || !/MoveManagedTrack[\s\S]{0,900}WaitForMpvTrackChange/.test(source)) {
  throw new Error("next/prev does not wait for the official session identity");
}
const waitMethod = readMethod("private static MpvSnapshot WaitForMpvTrackChange");
if (waitMethod.includes("positionChanged") || waitMethod.includes("readyChecks")) {
  throw new Error("track switching may still accept an early playlist position or a live old pipe");
}
if (!/if \(pathChanged\) return current/.test(waitMethod)) {
  throw new Error("next/previous and playlist playback must wait for the actual media path to change");
}
if (!/sameMediaChecked[\s\S]*SyncCurrentTrackFromNcmState\(probe\)[\s\S]*previousTitle[\s\S]*Value\(probe, "title"\)/.test(waitMethod)) {
  throw new Error("same-path reloads must be accepted only after official title verification");
}
const syncMethod = readMethod("private static MpvSnapshot SyncCurrentTrackFromNcmState");
if (!/before = ReadMpvSnapshot\(\)[\s\S]*RunNcm\(new\[\] \{ "state" \}[\s\S]*after = ReadMpvSnapshot\(\)[\s\S]*SameMpvIdentity\(before, after\)/.test(syncMethod)) {
  throw new Error("official identity sync is not protected by stable mpv snapshots");
}
if (/new\[\] \{ "position", "duration"/.test(syncMethod)) {
  throw new Error("official CLI timing must not overwrite fresher mpv playback timing");
}
if (!/queueLength[\s\S]{0,300}Int32\.TryParse\(Value\(state, "queueLength"/.test(source)) {
  throw new Error("managed state ignores the official queue length");
}

console.log("Native player identity contract: OK");
