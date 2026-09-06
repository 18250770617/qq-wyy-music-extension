const { spawn } = require("child_process");
const path = require("path");

const executable = path.join(__dirname, "..", "native-host", "CloudMusicBridge.exe");
const child = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
const requests = [
  { id: "ping", action: "system.ping", payload: {} },
  { id: "state", action: "netease.control", payload: { name: "state" } },
  { id: "deny", action: "system.runAnything", payload: {} }
];
for (const request of requests) {
  const body = Buffer.from(JSON.stringify(request));
  const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
  child.stdin.write(Buffer.concat([header, body]));
}
child.stdin.end();

const chunks = [];
child.stdout.on("data", (chunk) => chunks.push(chunk));
child.on("close", (code) => {
  if (code !== 0) throw new Error(`Host exited with ${code}`);
  const data = Buffer.concat(chunks), responses = []; let offset = 0;
  while (offset < data.length) { const size=data.readUInt32LE(offset); offset+=4; responses.push(JSON.parse(data.subarray(offset,offset+size))); offset+=size; }
  const playerState = responses[1]?.data?.payload?.state;
  if (responses.length !== 3 || !responses[0].ok || !responses[1].ok || responses[2].ok) throw new Error("Unexpected native responses");
  if (!playerState || !("position" in playerState) || !("duration" in playerState)) throw new Error("Managed player state is missing timeline fields");
  console.log("Native Messaging framing and action allowlist: OK");
});
