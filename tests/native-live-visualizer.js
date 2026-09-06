const { spawn } = require("child_process");
const path = require("path");

const executable = path.join(__dirname, "..", "native-host", "CloudMusicBridge.exe");
const child = spawn(executable, [], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = Buffer.alloc(0);
let sequence = 0;
const clientId = "72e3066b-5e1c-49a6-8d36-1ce888b71ce2";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const size = buffer.readUInt32LE(0);
    if (buffer.length < size + 4) return;
    const response = JSON.parse(buffer.subarray(4, size + 4).toString("utf8"));
    buffer = buffer.subarray(size + 4);
    const waiter = pending.get(response.id);
    if (!waiter) continue;
    pending.delete(response.id);
    response.ok ? waiter.resolve(response.data) : waiter.reject(new Error(response.error));
  }
});

function send(mode) {
  return new Promise((resolve, reject) => {
    const id = `visualizer-${++sequence}`;
    pending.set(id, { resolve, reject });
    const body = Buffer.from(JSON.stringify({ id, action: "netease.visualizer", payload: { mode, clientId } }));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    child.stdin.write(Buffer.concat([header, body]));
  });
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

(async () => {
  try {
    await send("start");
    await wait(180);
    const sample = await send("read");
    if (!sample.available || !Array.isArray(sample.bands) || sample.bands.length !== 10 || sample.bands.some((value) => !Number.isFinite(value) || value < -90 || value > 0)) {
      throw new Error("实时频段未返回 10 个有效 RMS 数值；请先播放一首网易云歌曲再重试");
    }
    console.log(JSON.stringify({ ok: true, frequencies: sample.frequencies, bands: sample.bands }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    try { await send("stop"); } catch {}
    child.stdin.end();
    child.kill();
  }
})();
