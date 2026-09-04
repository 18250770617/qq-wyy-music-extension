const { spawn } = require("child_process");
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
    const id = `live-${++sequence}`;
    pending.set(id, { resolve, reject });
    const body = Buffer.from(JSON.stringify({ id, action, payload }));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    child.stdin.write(Buffer.concat([header, body]));
  });
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function parseState(result) {
  try { return JSON.parse(result.stdout).state || {}; } catch { return {}; }
}

(async () => {
  try {
    const doctor = await send("system.doctor");
    if (!doctor.providers?.netease?.ready) throw new Error(doctor.providers?.netease?.summary || "网易云尚未就绪");
    const search = await send("netease.search", { keyword: "轻音乐", type: "playlist" });
    const records = search.payload?.data?.records || [];
    const playlist = records.find((item) => item.id && item.originalId);
    if (!playlist) throw new Error("真实搜索没有返回可播放歌单");
    await send("netease.playPlaylist", { encryptedId: playlist.id, originalId: String(playlist.originalId) });
    await wait(800);
    await send("netease.control", { name: "volume", value: 20 });
    const playing = parseState(await send("netease.control", { name: "state" }));
    await send("netease.control", { name: "pause" });
    await wait(300);
    const paused = parseState(await send("netease.control", { name: "state" }));
    await send("netease.control", { name: "resume" });
    await wait(300);
    const resumed = parseState(await send("netease.control", { name: "state" }));
    await send("netease.control", { name: "next" });
    await wait(300);
    const advanced = parseState(await send("netease.control", { name: "state" }));
    if ((playing.queueLength || 0) < 2) throw new Error("歌单未形成多曲目播放队列");
    if (playing.status !== "playing") throw new Error(`播放状态异常：${playing.status}`);
    if (paused.status !== "paused") throw new Error(`暂停状态异常：${paused.status}`);
    if (resumed.status !== "playing") throw new Error(`继续状态异常：${resumed.status}`);
    if (advanced.status !== "playing" || advanced.currentIndex === playing.currentIndex) throw new Error("下一首没有推进播放队列");
    console.log(JSON.stringify({
      ok: true,
      testedPlaylist: playlist.name,
      trackCount: playlist.trackCount,
      controls: ["playPlaylist", "volume", "state", "pause", "resume", "next"],
      states: { playing, paused, resumed, advanced }
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    try { await send("netease.control", { name: "stop" }); } catch {}
    child.stdin.end();
    child.stdout.destroy();
    child.kill();
  }
})();
