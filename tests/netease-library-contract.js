const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "native-host", "BridgeHost.cs"), "utf8");
const executable = process.argv[2] || path.join(projectRoot, "native-host", "CloudMusicBridge.exe");

function assertSource(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

assertSource(/case\s+"netease\.library"\s*:\s*return\s+NeteaseLibrary\(payload\)/, "netease.library is not in the native action allowlist");
assertSource(/case\s+"favorite"\s*:\s*return\s+RunNcm\(new\[\]\s*{\s*"user"\s*,\s*"favorite"[\s\S]*?"--userInput"/s, "favorite library must use the official user favorite command with user intent");
assertSource(/case\s+"created"\s*:\s*case\s+"collected"[\s\S]*?RunNcm\(new\[\]\s*{\s*"playlist"\s*,\s*kind\s*,\s*"--limit"\s*,\s*Number\(limit\)\s*,\s*"--offset"\s*,\s*Number\(offset\)[\s\S]*?"--userInput"/, "playlist library must use the official paginated playlist command with user intent");
assertSource(/NeteasePlaylistTracks[\s\S]*?"playlist"\s*,\s*"tracks"[\s\S]*?"--limit"\s*,\s*Number\(limit\)[\s\S]*?"--offset"\s*,\s*Number\(offset\)/, "playlist tracks must forward validated pagination");
assertSource(/NeteaseLibrary[\s\S]*?"--userInput"/, "personal library commands must describe the user-initiated action");

if (!fs.existsSync(executable)) throw new Error("Native bridge is not built");

const requests = [
  { id: "kind", action: "netease.library", payload: { kind: "unknown" } },
  { id: "created-limit", action: "netease.library", payload: { kind: "created", limit: 101, offset: 0 } },
  { id: "collected-limit", action: "netease.library", payload: { kind: "collected", limit: 0, offset: 0 } },
  { id: "created-offset", action: "netease.library", payload: { kind: "created", limit: 50, offset: 10001 } },
  { id: "tracks-limit", action: "netease.playlistTracks", payload: { playlistId: "a".repeat(32), limit: 0, offset: 0 } },
  { id: "tracks-offset", action: "netease.playlistTracks", payload: { playlistId: "a".repeat(32), limit: 50, offset: 10001 } }
];

const child = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
const stdout = [];
const stderr = [];
const timer = setTimeout(() => child.kill(), 10000);

child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
child.on("error", (error) => {
  clearTimeout(timer);
  throw error;
});

for (const request of requests) {
  const body = Buffer.from(JSON.stringify(request));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  child.stdin.write(Buffer.concat([header, body]));
}
child.stdin.end();

child.on("close", (code) => {
  clearTimeout(timer);
  if (code !== 0) throw new Error(`Host exited with ${code}: ${Buffer.concat(stderr).toString("utf8")}`);
  const data = Buffer.concat(stdout);
  const responses = [];
  let offset = 0;
  while (offset < data.length) {
    const size = data.readUInt32LE(offset);
    offset += 4;
    responses.push(JSON.parse(data.subarray(offset, offset + size).toString("utf8")));
    offset += size;
  }

  const byId = new Map(responses.map((response) => [response.id, response]));
  function expectRejected(id, fragment) {
    const response = byId.get(id);
    if (!response || response.ok || !String(response.error).includes(fragment)) {
      throw new Error(`${id} did not fail locally with ${fragment}`);
    }
  }

  expectRejected("kind", "不支持的个人库类型");
  expectRejected("created-limit", "参数范围无效：limit");
  expectRejected("collected-limit", "参数范围无效：limit");
  expectRejected("created-offset", "参数范围无效：offset");
  expectRejected("tracks-limit", "参数范围无效：limit");
  expectRejected("tracks-offset", "参数范围无效：offset");
  console.log("Official ncm-cli personal library contract and pagination validation: OK");
});
