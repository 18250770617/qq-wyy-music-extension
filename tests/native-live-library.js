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
    const response = JSON.parse(buffer.subarray(4, size + 4).toString("utf8"));
    buffer = buffer.subarray(size + 4);
    const waiter = pending.get(response.id);
    if (!waiter) continue;
    pending.delete(response.id);
    response.ok ? waiter.resolve(response.data) : waiter.reject(new Error(response.error));
  }
});

function send(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = `library-${++sequence}`;
    pending.set(id, { resolve, reject });
    const body = Buffer.from(JSON.stringify({ id, action, payload }));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    child.stdin.write(Buffer.concat([header, body]));
  });
}

(async () => {
  try {
    const created = await send("netease.library", { kind: "created", limit: 2, offset: 0 });
    const collected = await send("netease.library", { kind: "collected", limit: 2, offset: 0 });
    const favorite = await send("netease.library", { kind: "favorite" });
    const playlists = created.payload?.data?.records || [];
    const collectedPlaylists = collected.payload?.data?.records || [];
    const favoritePlaylist = favorite.payload?.data;
    if (!playlists.length || !collectedPlaylists.length || !favoritePlaylist?.id) throw new Error("个人歌单结构不完整");
    const tracks = await send("netease.playlistTracks", { playlistId: favoritePlaylist.id, limit: 2, offset: 0 });
    const songs = Array.isArray(tracks.payload?.data) ? tracks.payload.data : [];
    if (!songs.length || !songs[0]?.id) throw new Error("喜欢歌曲结构不完整");
    console.log(JSON.stringify({ ok: true, createdCount: playlists.length, collectedCount: collectedPlaylists.length, favoriteTracksRead: songs.length }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    child.stdin.end();
    child.kill();
  }
})();
