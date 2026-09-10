/**
 * VO -> mouth-open track.
 *
 *   node scripts/mouth-track.mjs public/audio/corp2.wav corp2
 *
 * Writes src/timing/<name>.mouth.json — one entry per video frame:
 *   { open: 0..1, shape: 0|1|2 }
 *
 * WHY THIS IS PRECOMPUTED AND NOT READ AT RENDER TIME
 * Remotion can read the waveform live via useAudioData, but then every render
 * re-decodes the whole file and the numbers are invisible until you watch the
 * mp4. As a file you can open it, see the curve, and hand-fix a frame that
 * misreads. Same reason whisper writes words.json instead of running inline.
 *
 * WHY AMPLITUDE AND NOT PHONEMES
 * The reference channels swap between roughly three mouth shapes. At feed size
 * nobody resolves an F from a TH — they resolve OPEN vs SHUT, on time. Phoneme
 * accuracy (Rhubarb) is a later upgrade and needs nine drawn mouths; this needs
 * one shape that scales.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [, , audioPath, name] = process.argv;
if (!audioPath || !name) {
  console.error("usage: node scripts/mouth-track.mjs <audio> <name>");
  process.exit(1);
}

const FPS = 30;
const RATE = 16000;

/** Silence gate. Below this fraction of the loud level the mouth is shut. */
const GATE = 0.12;
/** Mouth reaches full open here rather than at the single loudest peak. */
const LOUD_PERCENTILE = 0.92;
/** Per-frame smoothing. Lips snap open and fall shut slower — real mouths do. */
const ATTACK = 0.65;
const RELEASE = 0.28;

const pcm = execFileSync(
  "ffmpeg",
  ["-v", "error", "-i", resolve(audioPath), "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-"],
  { maxBuffer: 1 << 30 }
);

const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
const perFrame = RATE / FPS;
const frameCount = Math.floor(samples.length / perFrame);

// RMS per frame
const rms = new Float64Array(frameCount);
for (let f = 0; f < frameCount; f++) {
  const start = Math.floor(f * perFrame);
  const end = Math.floor((f + 1) * perFrame);
  let sum = 0;
  for (let i = start; i < end; i++) {
    const v = samples[i] / 32768;
    sum += v * v;
  }
  rms[f] = Math.sqrt(sum / (end - start));
}

// Normalise against a high percentile, not the max — one clipped breath
// otherwise flattens the entire rest of the track to a mumble.
const sorted = Float64Array.from(rms).sort();
const loud = sorted[Math.floor(sorted.length * LOUD_PERCENTILE)] || 1;

let prev = 0;
const track = [];
for (let f = 0; f < frameCount; f++) {
  let level = Math.min(1, rms[f] / loud);
  level = level < GATE ? 0 : (level - GATE) / (1 - GATE);
  // Perceptual: loudness rises much faster than mouth aperture does.
  level = Math.pow(level, 0.6);

  const k = level > prev ? ATTACK : RELEASE;
  const open = prev + (level - prev) * k;
  prev = open;

  track.push({
    open: Math.round(open * 1000) / 1000,
    shape: open < 0.18 ? 0 : open < 0.55 ? 1 : 2,
  });
}

const out = resolve(`src/timing/${name}.mouth.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(track));

const shut = track.filter((t) => t.shape === 0).length;
console.log(`${name}.mouth.json — ${frameCount} frames @${FPS}fps (${(frameCount / FPS).toFixed(1)}s)`);
console.log(`  shut ${((shut / frameCount) * 100).toFixed(0)}%  mid ${((track.filter(t=>t.shape===1).length/frameCount)*100).toFixed(0)}%  open ${((track.filter(t=>t.shape===2).length/frameCount)*100).toFixed(0)}%`);
