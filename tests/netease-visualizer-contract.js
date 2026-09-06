const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "native-host", "BridgeHost.cs"), "utf8");
const executable = process.argv[2] || path.join(projectRoot, "native-host", "CloudMusicBridge.exe");

for (const [pattern, message] of [
  [/case\s+"netease\.visualizer"\s*:\s*return\s+NeteaseVisualizer\(payload\)/, "visualizer action is not allowlisted"],
  [/private const string VisualizerLabelPrefix = "cloudmusic-bands-"/, "visualizer must use a namespaced mpv filter label"],
  [/VisualizerLabel = VisualizerLabelPrefix \+ Process\.GetCurrentProcess\(\)\.Id/, "concurrent native hosts must not share a filter label"],
  [/CleanupStaleVisualizerFilters[\s\S]*IsVisualizerHostAlive[\s\S]*TryRemoveMpvAudioFilter/, "orphaned process-labelled filters must be recoverable after a forced host exit"],
  [/bandpass=f=31[\s\S]*bandpass=f=16000/, "visualizer must define the fixed 31Hz-16kHz bands"],
  [/lavfi\.astats\." \+ \(i \+ 3\) \+ "\.RMS_level/, "visualizer must read per-band RMS metadata"],
  [/Math\.Max\(-90, Math\.Min\(0, value\)\)/, "visualizer values must be clamped"],
  [/case "stop":[\s\S]*TryRemoveVisualizerFilter\(3\)[\s\S]*"af", "remove", "@" \+ label/, "visualizer filter must be removable"],
  [/string mode = GetString\(payload, "mode", 12, true\)/, "visualizer mode must be validated"],
  [/RequireVisualizerClient\(payload\)/, "visualizer clients must be validated and reference-counted"],
  [/VisualizerClients\.Count == 0/, "one tab must not stop another tab's visualizer"],
  [/ExtendVisualizerLeases\(DateTime\.UtcNow - requestStartedUtc\)[\s\S]*ReapVisualizerClients[\s\S]*HostRequestInFlight[\s\S]*DateTime\.UtcNow\.AddSeconds\(-VisualizerLeaseSeconds\)/, "abandoned visualizer clients need a lease clock that pauses during synchronous host work"],
  [/VisualizerClients\[clientId\]\.Add\(blockedDuration\)/, "slow host work must extend leases by elapsed time instead of reviving every client to now"],
  [/Interlocked\.Exchange\(ref VisualizerReaperRunning, 1\)[\s\S]*finally \{ Interlocked\.Exchange\(ref VisualizerReaperRunning, 0\); \}/, "visualizer watchdog callbacks must not overlap"],
  [/enum MpvFilterState[\s\S]*Unknown[\s\S]*Missing[\s\S]*GetMpvAudioFilterState/, "mpv filter checks must distinguish query failure from absence"],
  [/timed-out IPC reply is ambiguous[\s\S]*ObserveMpvAudioFilterState[\s\S]*TryRemoveVisualizerFilter\(4\)/, "ambiguous filter creation must be verified and rolled back"],
  [/TryParseVisualizerBands[\s\S]*metadata\.TryGetValue[\s\S]*return false/, "all ten RMS values must be present and parseable"],
  [/IsVisualizerFormatSupported[\s\S]*sampleRate < 36000/, "low sample-rate audio needs a safe fallback"],
  [/TryRemoveVisualizerFilter\(3\)/, "failed filter removal must be retried"]
]) {
  if (!pattern.test(source)) throw new Error(message);
}
if (/GetString\(payload, "(?:graph|filter)"/.test(source)) throw new Error("visualizer must never accept an arbitrary filter graph");
if (!fs.existsSync(executable)) throw new Error("Native bridge is not built");

const child = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
for (const request of [
  { id: "visualizer-mode", action: "netease.visualizer", payload: { mode: "custom", graph: "anull" } },
  { id: "visualizer-client", action: "netease.visualizer", payload: { mode: "start", clientId: "not-a-guid" } }
]) {
  const body = Buffer.from(JSON.stringify(request));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  child.stdin.write(Buffer.concat([header, body]));
}
child.stdin.end();

const stdout = [];
const stderr = [];
const timer = setTimeout(() => child.kill(), 8000);
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
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
  if (byId.get("visualizer-mode")?.ok || !String(byId.get("visualizer-mode")?.error).includes("不支持的频谱操作")) throw new Error("arbitrary visualizer modes were not rejected locally");
  if (byId.get("visualizer-client")?.ok || !String(byId.get("visualizer-client")?.error).includes("频谱客户端标识无效")) throw new Error("invalid visualizer clients were not rejected locally");
  console.log("Fixed mpv ten-band visualizer allowlist and validation: OK");
});
