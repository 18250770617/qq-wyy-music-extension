const { spawn, spawnSync } = require("child_process");
const path = require("path");

const executable = path.join(__dirname, "..", "native-host", "CloudMusicBridge.exe");
const child = spawn(executable, [], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = Buffer.alloc(0);
let sequence = 0;
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const size = buffer.readUInt32LE(0);
    if (buffer.length < size + 4) return;
    const message = JSON.parse(buffer.subarray(4, size + 4).toString("utf8"));
    buffer = buffer.subarray(size + 4);
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    message.ok ? waiter.resolve(message.data) : waiter.reject(new Error(message.error));
  }
});

function send(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = `identity-${Date.now()}-${++sequence}`;
    pending.set(id, { resolve, reject });
    const body = Buffer.from(JSON.stringify({ id, action, payload }));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    child.stdin.write(Buffer.concat([header, body]));
  });
}

(async () => {
  try {
    const bridge = await send("netease.control", { name: "state" });
    const bridgeState = bridge.payload?.state || {};
    let rejected = false;
    try {
      await send("netease.play", { encryptedId: "00000000000000000000000000000000", originalId: "1", title: "不可播测试", canPlay: false, reasonText: "当前端无版权" });
    } catch (error) {
      rejected = /无版权|不可播放/.test(error.message);
    }
    if (!rejected) throw new Error("bridge did not reject an explicitly unavailable track");
    const cli = path.join(process.env.APPDATA, "npm", "node_modules", "@music163", "ncm-cli", "dist", "index.js");
    const officialProcess = spawnSync(process.execPath, [cli, "state", "--output", "json"], { encoding: "utf8" });
    if (officialProcess.status !== 0) throw new Error(officialProcess.stderr || "ncm-cli state failed");
    const officialState = JSON.parse(officialProcess.stdout).state || {};
    for (const field of ["status", "currentIndex", "queueLength"]) {
      if (String(bridgeState[field] ?? "") !== String(officialState[field] ?? "")) {
        throw new Error(`${field} mismatch: bridge=${bridgeState[field]} official=${officialState[field]}`);
      }
    }
    if ((bridgeState.title || "") !== (officialState.title || "")) {
      throw new Error(`title mismatch: bridge=${bridgeState.title} official=${officialState.title}`);
    }
    console.log(JSON.stringify({ ok: true, state: bridgeState }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    child.stdin.end();
    child.stdout.destroy();
    child.kill();
  }
})();
