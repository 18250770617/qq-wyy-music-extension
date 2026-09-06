const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "extension", "floating.js"), "utf8");

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

const api = Function(`
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  ${readFunction("squareSignedDifference")}
  ${readFunction("mapSpectrumTargets")}
  ${readFunction("smoothSpectrumLevels")}
  ${readFunction("expandSpectrumLevels")}
  return { squareSignedDifference, mapSpectrumTargets, smoothSpectrumLevels, expandSpectrumLevels };
`)();

function assertLevels(values, label) {
  if (!values.every((value) => Number.isFinite(value) && value >= .03 && value <= 1)) {
    throw new Error(`${label} produced an invalid level: ${JSON.stringify(values)}`);
  }
}

const hostile = [-120, Infinity, NaN, -72, -40, -18, 20, -33, -91, -5];
const hostileMapped = api.mapSpectrumTargets(hostile, Array(10).fill(0));
assertLevels(hostileMapped.targets, "hostile input");
assertLevels(api.expandSpectrumLevels(hostileMapped.targets, 42), "hostile expansion");

const half = Math.abs(api.squareSignedDifference(.5, 1));
const full = Math.abs(api.squareSignedDifference(1, 1));
if (Math.abs(full / half - 4) > .001) throw new Error("squared differences no longer have a 1:4 response");

const frame = [-66, -58, -46, -22, -14, -25, -43, -52, -61, -68];
let previousAbsolute = Array(10).fill(0);
let levels = Array(10).fill(.03);
for (let frameIndex = 0; frameIndex < 8; frameIndex += 1) {
  const mapped = api.mapSpectrumTargets(frame, previousAbsolute);
  previousAbsolute = mapped.absolute;
  levels = api.smoothSpectrumLevels(levels, mapped.targets);
}
const expanded = api.expandSpectrumLevels(levels, 42);
assertLevels(expanded, "representative frame");
const spread = Math.max(...expanded) - Math.min(...expanded);
const distinct = new Set(expanded.map((value) => value.toFixed(2))).size;
let longestNearEqualRun = 1;
let currentRun = 1;
for (let index = 1; index < expanded.length; index += 1) {
  if (Math.abs(expanded[index] - expanded[index - 1]) < .005) currentRun += 1;
  else currentRun = 1;
  longestNearEqualRun = Math.max(longestNearEqualRun, currentRun);
}
if (spread < .45) throw new Error(`spectrum contrast is still too small: ${spread.toFixed(3)}`);
if (distinct < 18) throw new Error(`too many bars still share a height: only ${distinct} distinct levels`);
if (longestNearEqualRun > 4) throw new Error(`near-equal bar run is too long: ${longestNearEqualRun}`);

previousAbsolute = Array(10).fill(0);
levels = Array(10).fill(.03);
let lastChange = Infinity;
for (let frameIndex = 0; frameIndex < 40; frameIndex += 1) {
  const mapped = api.mapSpectrumTargets(Array(10).fill(-30), previousAbsolute);
  previousAbsolute = mapped.absolute;
  const next = api.smoothSpectrumLevels(levels, mapped.targets);
  lastChange = Math.max(...next.map((value, index) => Math.abs(value - levels[index])));
  levels = next;
}
const flatExpanded = api.expandSpectrumLevels(levels, 42);
if (lastChange >= .005) throw new Error(`stable input still jitters: ${lastChange.toFixed(4)}`);
if (Math.max(...flatExpanded) - Math.min(...flatExpanded) >= .02) throw new Error("flat input creates a fake frequency pattern");

console.log(`Squared spectrum mapping: OK (spread ${spread.toFixed(3)}, ${distinct} distinct heights)`);
