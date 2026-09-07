const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const executable = path.join(__dirname, "..", "native-host", "CloudMusicBridge.exe");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloudmusic-edge-collection-"));
const env = { ...process.env, CLOUDMUSIC_EDGE_TEST_MODE: "1", CLOUDMUSIC_EDGE_TEST_DATA_DIR: dataDir };

function exchange(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"], env });
    const stdout = [], stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Host exited with ${code}: ${Buffer.concat(stderr)}`));
      const data = Buffer.concat(stdout), responses = []; let offset = 0;
      while (offset < data.length) {
        const size = data.readUInt32LE(offset); offset += 4;
        responses.push(JSON.parse(data.subarray(offset, offset + size))); offset += size;
      }
      resolve(responses);
    });
    for (const request of requests) {
      const body = Buffer.from(JSON.stringify(request));
      const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
      child.stdin.write(Buffer.concat([header, body]));
    }
    child.stdin.end();
  });
}

const neteaseSong = {
  provider: "netease", kind: "song", title: "测试歌曲", meta: "测试歌手",
  encryptedId: "0123456789abcdef0123456789abcdef", originalId: "12345",
  availability: "playable", canPlay: true
};
const neteasePlaylist = {
  provider: "netease", kind: "playlist", title: "测试歌单", meta: "2 首",
  encryptedId: "abcdef0123456789abcdef0123456789", originalId: "67890", trackCount: 2
};
const blockedSong = {
  provider: "netease", kind: "song", title: "不可播放测试", meta: "版权受限",
  encryptedId: "11111111111111111111111111111111", originalId: "54321",
  availability: "blocked", reasonCode: "copyright", reasonText: "当前端无版权", canPlay: false
};
const qqSong = {
  provider: "qq", kind: "song", title: "QQ 测试歌曲", meta: "QQ 歌手",
  mid: "003TestMid_9", url: "https://y.qq.com/n/ryqq/songDetail/003TestMid_9", availability: "playable"
};

(async () => {
  try {
    const first = await exchange([
      { id: "empty", action: "collection.list", payload: { limit: 20, offset: 0 } },
      { id: "add", action: "collection.toggle", payload: { item: neteaseSong } },
      { id: "keys", action: "collection.keys", payload: {} },
      { id: "remove", action: "collection.toggle", payload: { item: neteaseSong } },
      { id: "import", action: "collection.import", payload: { items: [neteaseSong, neteasePlaylist, qqSong, blockedSong, neteaseSong] } },
      { id: "songs", action: "collection.list", payload: { kind: "song", limit: 1, offset: 0 } },
      { id: "bad", action: "collection.toggle", payload: { item: { ...qqSong, mid: "", url: "https://evil.example/song" } } }
    ]);
    if (!first[0].ok || first[0].data.recordCount !== 0) throw new Error("Empty collection response is invalid");
    if (!first[1].ok || !first[1].data.added || first[1].data.key !== "netease:song:12345") throw new Error("Toggle add failed");
    if (!first[2].data.keys.includes("netease:song:12345")) throw new Error("Collection key lookup failed");
    if (!first[3].ok || first[3].data.added) throw new Error("Toggle remove failed");
    if (!first[4].ok || first[4].data.addedCount !== 4 || first[4].data.recordCount !== 4) throw new Error("Import dedupe failed");
    if (!first[5].ok || first[5].data.items.length !== 1 || first[5].data.recordCount !== 3 || !first[5].data.hasMore) throw new Error("Filtered pagination failed");
    if (first[6].ok) throw new Error("Untrusted QQ URL was accepted");

    const persisted = await exchange([
      { id: "persisted", action: "collection.list", payload: { limit: 100, offset: 0 } }
    ]);
    if (!persisted[0].ok || persisted[0].data.recordCount !== 4) throw new Error("Collection did not persist across host processes");

    const created = await exchange([
      { id: "focus", action: "collection.createPlaylist", payload: { name: "专注" } },
      { id: "commute", action: "collection.createPlaylist", payload: { name: "通勤" } },
      { id: "duplicate-name", action: "collection.createPlaylist", payload: { name: "专注" } }
    ]);
    if (!created[0].ok || !created[1].ok || created[2].ok) throw new Error("Local playlist creation or unique-name validation failed");
    const focusId = created[0].data.playlist.id;
    const commuteId = created[1].data.playlist.id;
    if (!/^[a-f0-9]{32}$/.test(focusId) || !/^[a-f0-9]{32}$/.test(commuteId)) throw new Error("Local playlist IDs are invalid");

    const managed = await exchange([
      { id: "add-net", action: "collection.addToPlaylist", payload: { playlistId: focusId, item: neteaseSong } },
      { id: "add-qq", action: "collection.addToPlaylist", payload: { playlistId: focusId, item: qqSong } },
      { id: "dedupe-track", action: "collection.addToPlaylist", payload: { playlistId: focusId, item: neteaseSong } },
      { id: "track-page", action: "collection.playlistTracks", payload: { playlistId: focusId, limit: 1, offset: 0 } },
      { id: "duplicate-rename", action: "collection.renamePlaylist", payload: { playlistId: commuteId, name: "专注" } },
      { id: "rename", action: "collection.renamePlaylist", payload: { playlistId: focusId, name: "深夜专注" } },
      { id: "playlists", action: "collection.playlists", payload: {} }
    ]);
    if (!managed[0].ok || !managed[0].data.added || !managed[1].ok || !managed[1].data.added || managed[2].data.added) throw new Error("Local playlist track add/dedupe failed");
    if (!managed[3].ok || managed[3].data.recordCount !== 2 || managed[3].data.items.length !== 1 || !managed[3].data.hasMore) throw new Error("Local playlist track pagination failed");
    if (managed[4].ok || !managed[5].ok || managed[5].data.playlist.name !== "深夜专注") throw new Error("Local playlist rename validation failed");
    if (!managed[6].ok || managed[6].data.recordCount !== 2) throw new Error("Local playlist listing failed");

    const removed = await exchange([
      { id: "remove-track", action: "collection.removeFromPlaylist", payload: { playlistId: focusId, trackKey: "netease:song:12345" } },
      { id: "remaining", action: "collection.playlistTracks", payload: { playlistId: focusId, limit: 100, offset: 0 } },
      { id: "delete", action: "collection.deletePlaylist", payload: { playlistId: commuteId } },
      { id: "after-delete", action: "collection.playlists", payload: {} }
    ]);
    if (!removed[0].ok || !removed[0].data.removed || removed[1].data.recordCount !== 1 || removed[1].data.items[0].provider !== "qq") throw new Error("Local playlist track removal failed");
    if (!removed[2].ok || !removed[2].data.deleted || removed[3].data.recordCount !== 1) throw new Error("Local playlist deletion failed");

    const disk = JSON.parse(fs.readFileSync(path.join(dataDir, "plugin-collection.json"), "utf8"));
    if (disk.version !== 2 || disk.items.length !== 4 || disk.playlists.length !== 1 || disk.playlists[0].tracks.length !== 1 || !disk.items.some((item) => item.availability === "blocked" && item.canPlay === false)) throw new Error("Collection schema is invalid");
    const serialized = JSON.stringify(disk);
    for (const forbidden of ["qq.key", "privateKey", "cookie", "audioUrl", "playUrl"]) {
      if (serialized.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`Collection leaked forbidden field: ${forbidden}`);
    }
    console.log("Native plugin collection and local playlist lifecycle: OK");
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
