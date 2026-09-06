const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "extension", "service-worker.js"), "utf8");
const ports = [];
let requestId = 0;

function eventHook() {
  const listeners = [];
  return { listeners, addListener(listener) { listeners.push(listener); } };
}

function fakePort(index) {
  const onMessage = eventHook();
  const onDisconnect = eventHook();
  let serialWork = Promise.resolve();
  return {
    index,
    actions: [],
    onMessage,
    onDisconnect,
    postMessage(message) {
      this.actions.push(message.action);
      const delay = message.action === "netease.playlistTracks" ? 120 : message.action === "netease.play" ? 70 : 5;
      serialWork = serialWork
        .then(() => new Promise((resolve) => setTimeout(resolve, delay)))
        .then(() => onMessage.listeners.forEach((listener) => listener({ id: message.id, ok: true, data: {} })));
    }
  };
}

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  setImmediate,
  crypto: { randomUUID: () => `request-${++requestId}` },
  chrome: {
    runtime: {
      connectNative() {
        const port = fakePort(ports.length);
        ports.push(port);
        return port;
      },
      onInstalled: eventHook(),
      onStartup: eventHook(),
      onMessage: eventHook(),
      lastError: null
    }
  }
});

vm.runInContext(`${source}\nglobalThis.__sendNativeForTest = sendNative;`, context);

(async () => {
  const started = Date.now();
  const timings = {};
  await Promise.all([
    context.__sendNativeForTest("netease.playlistTracks", { playlistId: "a".repeat(32), limit: 40, offset: 0 }).then(() => { timings.data = Date.now() - started; }),
    context.__sendNativeForTest("netease.visualizer", { mode: "read", clientId: "11111111-1111-4111-8111-111111111111" }).then(() => { timings.visualizer = Date.now() - started; }),
    context.__sendNativeForTest("netease.control", { name: "state" }).then(() => { timings.control = Date.now() - started; })
  ]);
  const dataPort = ports.find((port) => port.actions.includes("netease.playlistTracks"));
  const visualizerPort = ports.find((port) => port.actions.includes("netease.visualizer"));
  const controlPort = ports.find((port) => port.actions.includes("netease.control"));
  if (!dataPort || !visualizerPort || !controlPort || new Set([dataPort, visualizerPort, controlPort]).size !== 3) {
    throw new Error("data, playback control, and frequency reads still share a serial native channel");
  }
  if (timings.data < 100 || timings.visualizer > 70 || timings.control > 70) {
    throw new Error(`slow data still blocks realtime work: ${JSON.stringify(timings)}`);
  }
  const portCount = ports.length;
  await Promise.all([
    context.__sendNativeForTest("netease.search", { keyword: "a", type: "song" }),
    context.__sendNativeForTest("netease.library", { kind: "created" })
  ]);
  if (ports.length !== portCount || !dataPort.actions.includes("netease.search") || !dataPort.actions.includes("netease.library")) {
    throw new Error("same-class data requests do not reuse their native port");
  }
  const firstPlay = context.__sendNativeForTest("netease.play", { encryptedId: "b".repeat(32), originalId: "1" });
  const secondPlay = context.__sendNativeForTest("netease.play", { encryptedId: "c".repeat(32), originalId: "2" });
  const duplicate = await Promise.allSettled([firstPlay, secondPlay]);
  if (duplicate[0].status !== "fulfilled" || duplicate[1].status !== "rejected" || controlPort.actions.filter((action) => action === "netease.play").length !== 1) {
    throw new Error("global playback transaction guard did not reject the duplicate request");
  }
  const disconnectedData = context.__sendNativeForTest("netease.playlistTracks", { playlistId: "d".repeat(32), limit: 40, offset: 0 });
  const unaffectedVisualizer = context.__sendNativeForTest("netease.visualizer", { mode: "read", clientId: "11111111-1111-4111-8111-111111111111" });
  dataPort.onDisconnect.listeners.forEach((listener) => listener());
  const disconnected = await Promise.allSettled([disconnectedData, unaffectedVisualizer]);
  if (disconnected[0].status !== "rejected" || disconnected[1].status !== "fulfilled") {
    throw new Error("disconnecting the data channel also damaged the realtime channel");
  }
  console.log("Native data/control/visualizer channel isolation: OK");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
