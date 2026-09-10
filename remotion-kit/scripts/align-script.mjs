/**
 * Times EVERY word of the script, so captions can run continuously.
 *
 *   node scripts/align-script.mjs <timing-name> <script.md>
 *
 * ── Why this, and not just whisper's own words ──
 *
 * Whisper's words are already timed, and it would be one line of code to put
 * them on screen. It is also the one thing this pipeline must never do: whisper
 * mangles exactly the words that matter. It split "dickey" into "d"+"ickey",
 * writes "1.30 p.m..", invents quote marks, and will do far worse to any Hindi
 * punchline artifact. Captions built from whisper would put its spelling on
 * screen for the whole episode.
 *
 * WHISPER IS THE CLOCK. THE SCRIPT IS THE WORDS. So the two are aligned to each
 * other and the script's spelling is kept with whisper's timings.
 *
 * ── How ──
 *
 * Needleman-Wunsch, the standard global sequence alignment, over normalised
 * tokens. It is the right tool because the two sequences are nearly identical
 * (861 script words against 867 transcribed, on the corporate episode) and the
 * differences are exactly what it handles: a word dropped, a word split in two,
 * a word heard wrong.
 *
 * The sentence-anchoring in punch-lines.mjs cannot do this job — it searches
 * forward for whole phrases and gives up on the ones it cannot find, which is
 * fine when you only want the lines that resolved, and useless when you need
 * every word. Script words that end up matched to nothing get their timing
 * INTERPOLATED from their neighbours, so the caption still moves through them
 * at a sane pace instead of jumping.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const [timingName, scriptFile] = process.argv.slice(2);
if (!timingName || !scriptFile) {
  console.error("usage: node scripts/align-script.mjs <timing-name> <script.md>");
  process.exit(1);
}

const words = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.words.json`), "utf8")
);
const chapters = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.chapters.json`), "utf8")
);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, "");

// --- script tokens, tagged with the chapter they belong to
const parts = fs.readFileSync(scriptFile, "utf8").split(/^##\s+/m).slice(1);
const script = [];
parts.forEach((block, ci) => {
  const nl = block.indexOf("\n");
  const body = (nl === -1 ? "" : block.slice(nl)).trim().replace(/\s*\n\s*/g, " ");
  for (const raw of body.split(/\s+/).filter(Boolean)) {
    if (!norm(raw)) continue; // stray punctuation on its own
    script.push({ text: raw, chapter: ci });
  }
});

const A = script.map((t) => norm(t.text));
const B = words.map((w) => norm(w.text));

/** Partial credit, so "don't"/"dont" and "112345"/"112,345" still pull together. */
function score(a, b) {
  if (a === b) return 3;
  if (!a || !b) return -2;
  if (a.startsWith(b) || b.startsWith(a)) return 1;
  return -2;
}
const GAP = -2;

// --- Needleman-Wunsch. ~860x870 is nothing; a typed array keeps it tidy.
const W = B.length + 1;
const dp = new Int32Array((A.length + 1) * W);
const ptr = new Uint8Array((A.length + 1) * W); // 1 diag, 2 up (skip script), 3 left (skip whisper)

for (let i = 1; i <= A.length; i++) {
  dp[i * W] = i * GAP;
  ptr[i * W] = 2;
}
for (let j = 1; j <= B.length; j++) {
  dp[j] = j * GAP;
  ptr[j] = 3;
}
for (let i = 1; i <= A.length; i++) {
  for (let j = 1; j <= B.length; j++) {
    const d = dp[(i - 1) * W + (j - 1)] + score(A[i - 1], B[j - 1]);
    const u = dp[(i - 1) * W + j] + GAP;
    const l = dp[i * W + (j - 1)] + GAP;
    let best = d, p = 1;
    if (u > best) { best = u; p = 2; }
    if (l > best) { best = l; p = 3; }
    dp[i * W + j] = best;
    ptr[i * W + j] = p;
  }
}

// --- backtrack: script index -> whisper index (or -1)
const map = new Array(A.length).fill(-1);
let i = A.length, j = B.length;
while (i > 0 || j > 0) {
  const p = i === 0 ? 3 : j === 0 ? 2 : ptr[i * W + j];
  if (p === 1) {
    if (score(A[i - 1], B[j - 1]) > 0) map[i - 1] = j - 1;
    i--; j--;
  } else if (p === 2) i--;
  else j--;
}

const matched = map.filter((m) => m !== -1).length;

// --- fill the unmatched by interpolating between their nearest matched neighbours
const out = script.map((t, k) => ({ text: t.text, chapter: t.chapter, startFrame: -1, endFrame: -1 }));
for (let k = 0; k < out.length; k++) {
  if (map[k] !== -1) {
    out[k].startFrame = words[map[k]].startFrame;
    out[k].endFrame = words[map[k]].endFrame;
  }
}
for (let k = 0; k < out.length; k++) {
  if (out[k].startFrame !== -1) continue;
  let a = k - 1;
  while (a >= 0 && out[a].startFrame === -1) a--;
  let b = k + 1;
  while (b < out.length && out[b].startFrame === -1) b++;
  const from = a >= 0 ? out[a].endFrame : 0;
  const to = b < out.length ? out[b].startFrame : chapters[chapters.length - 1].endFrame;
  const n = b - a;
  const span = Math.max(1, (to - from) / n);
  out[k].startFrame = Math.round(from + (k - a - 1) * span);
  out[k].endFrame = Math.round(from + (k - a) * span);
}

// --- monotonic, non-zero-length, so a caption can never run backwards
for (let k = 0; k < out.length; k++) {
  if (k > 0 && out[k].startFrame < out[k - 1].endFrame) out[k].startFrame = out[k - 1].endFrame;
  if (out[k].endFrame <= out[k].startFrame) out[k].endFrame = out[k].startFrame + 2;
}

fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.captions.json`),
  JSON.stringify(out, null, 2)
);

const pct = ((100 * matched) / A.length).toFixed(1);
console.log(`${A.length} script words vs ${B.length} transcribed`);
console.log(`${matched} matched (${pct}%), ${A.length - matched} interpolated`);
console.log(`-> src/timing/${timingName}.captions.json`);

const runs = [];
let cur = null;
for (let k = 0; k < out.length; k++) {
  if (map[k] === -1) {
    if (!cur) cur = { at: k, n: 0 };
    cur.n++;
  } else if (cur) {
    runs.push(cur);
    cur = null;
  }
}
if (cur) runs.push(cur);
const worst = runs.sort((a, b) => b.n - a.n).slice(0, 5);
if (worst.length) {
  console.log(`\nlongest interpolated stretches (timing is a guess through these):`);
  for (const r of worst)
    console.log(`   ${r.n} words @ ch${out[r.at].chapter + 1}: "${out.slice(r.at, r.at + r.n).map((x) => x.text).join(" ").slice(0, 60)}"`);
}
