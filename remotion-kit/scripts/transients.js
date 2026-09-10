/**
 * Finds the musical hits in a scored VO track.
 *
 *   node scripts/transients.js <wav> <out-name>
 *
 * Every visual punch in the reel lands on one of these, so the edit hits
 * accents the score is already playing instead of ones the editor invented.
 *
 * Method: short-time RMS, then positive spectral-flux-style differencing, then
 * peak-picking with a minimum spacing so a single hit doesn't register four
 * times. Deliberately simple — this is a 16kHz mono file and we only need
 * frame-accurate onsets, not a beat grid.
 */

const fs = require("fs");
const path = require("path");

const FPS = 30;
const HOP = 256; // samples between analysis frames
const MIN_GAP_FRAMES = 5; // no two hits closer than ~0.17s

const [input, outName = "reel2"] = process.argv.slice(2);
if (!input) {
  console.error("usage: node scripts/transients.js <wav-16k-mono> [out-name]");
  process.exit(1);
}

const buf = fs.readFileSync(input);

// --- minimal wav parse: walk the chunk list rather than assuming a 44-byte header
let pos = 12;
let dataOffset = -1;
let dataLength = 0;
let sampleRate = 16000;
let channels = 1;
let bits = 16;

while (pos < buf.length - 8) {
  const id = buf.toString("ascii", pos, pos + 4);
  const size = buf.readUInt32LE(pos + 4);
  if (id === "fmt ") {
    channels = buf.readUInt16LE(pos + 10);
    sampleRate = buf.readUInt32LE(pos + 12);
    bits = buf.readUInt16LE(pos + 22);
  } else if (id === "data") {
    dataOffset = pos + 8;
    dataLength = size;
    break;
  }
  pos += 8 + size + (size % 2);
}

if (dataOffset === -1) throw new Error("no data chunk found in wav");
if (bits !== 16) throw new Error(`expected 16-bit pcm, got ${bits}`);

const sampleCount = Math.floor(dataLength / 2 / channels);
const samples = new Float32Array(sampleCount);
for (let i = 0; i < sampleCount; i++) {
  samples[i] = buf.readInt16LE(dataOffset + i * 2 * channels) / 32768;
}

// --- short-time energy
const energies = [];
for (let start = 0; start + HOP <= sampleCount; start += HOP) {
  let sum = 0;
  for (let i = start; i < start + HOP; i++) sum += samples[i] * samples[i];
  energies.push(Math.sqrt(sum / HOP));
}

// --- positive difference: rises only, since an onset is energy appearing
const flux = energies.map((e, i) => Math.max(0, e - (energies[i - 1] ?? 0)));

// --- adaptive threshold: local mean over ~1s, so quiet passages still register
const WINDOW = Math.round(sampleRate / HOP);
const peaks = [];
for (let i = 1; i < flux.length - 1; i++) {
  const lo = Math.max(0, i - WINDOW);
  const hi = Math.min(flux.length, i + WINDOW);
  let mean = 0;
  for (let j = lo; j < hi; j++) mean += flux[j];
  mean /= hi - lo;

  const isLocalMax = flux[i] > flux[i - 1] && flux[i] >= flux[i + 1];
  if (!isLocalMax) continue;
  if (flux[i] < mean * 2.2) continue;

  const frame = Math.round(((i * HOP) / sampleRate) * FPS);
  const last = peaks[peaks.length - 1];
  if (last && frame - last.frame < MIN_GAP_FRAMES) {
    // keep the stronger of two hits that are too close together
    if (flux[i] > last.strength) peaks[peaks.length - 1] = { frame, strength: flux[i] };
    continue;
  }
  peaks.push({ frame, strength: flux[i] });
}

// normalise strength 0..1 so the composition can scale a punch by how hard the hit is
const maxStrength = Math.max(...peaks.map((p) => p.strength));
const out = peaks.map((p) => ({
  frame: p.frame,
  strength: Number((p.strength / maxStrength).toFixed(3)),
}));

const dir = path.join(__dirname, "..", "src", "timing");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${outName}.hits.json`), JSON.stringify(out, null, 2));

console.log(`${out.length} hits -> src/timing/${outName}.hits.json`);
console.log(
  out
    .slice(0, 40)
    .map((p) => `${p.frame}(${p.strength})`)
    .join("  ")
);
