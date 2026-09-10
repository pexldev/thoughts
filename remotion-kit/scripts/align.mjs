/**
 * Aligns the written script to whisper's timeline.
 *
 *   node scripts/align.mjs <timing-name> <script-file>
 *
 * Whisper is used ONLY as a clock. Every word that ends up on screen comes
 * from the script file, because whisper mangles exactly the words that matter:
 * it split "dickey" into "d"+"ickey", "garland" into "gar"+"land", and it will
 * do worse to any Hindi punchline artifact.
 *
 * Beats are separated by blank lines in the script file. Output is one entry
 * per beat with a start and end frame.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

const [timingName, scriptFile] = process.argv.slice(2);
if (!timingName || !scriptFile) {
  console.error("usage: node scripts/align.mjs <timing-name> <script-file>");
  process.exit(1);
}

const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.json`), "utf8")
);

// 1. Drop whisper's [BLANK_AUDIO] tail, which arrives as loose tokens and
//    carries a bogus end time well past the file duration.
const blankAt = raw.findIndex((c, i) =>
  raw
    .slice(i, i + 6)
    .map((t) => t.text.trim())
    .join("")
    .toUpperCase()
    .startsWith("BLANK_AUDIO")
);
const usable = blankAt === -1 ? raw : raw.slice(0, blankAt);

// 2. Rebuild whole words. Whisper marks a new word with a leading space, so
//    continuation tokens ("ickey") fold back into the one before them.
const words = [];
for (const tok of usable) {
  const isNew = tok.text.startsWith(" ") || words.length === 0;
  if (isNew) {
    words.push({ text: tok.text.trim(), startMs: tok.startMs, endMs: tok.endMs });
  } else {
    const last = words[words.length - 1];
    last.text += tok.text.trim();
    last.endMs = tok.endMs;
  }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// 3. Beats = blank-line-separated blocks of the script.
const beats = fs
  .readFileSync(scriptFile, "utf8")
  .split(/\n\s*\n/)
  .map((b) => b.trim())
  .filter(Boolean);

// Anchor each beat by its OPENING words only, then let it run until the next
// beat starts. Trying to consume word-for-word is brittle: whisper hears
// filler the script doesn't have ("and then over there he opens his dickey"
// against "And he opens up his dicky"), so the counts never line up.
const starts = [];
let cursor = 0;

for (const beat of beats) {
  const beatWords = beat.split(/\s+/).map(norm).filter(Boolean);
  const [w0, w1] = beatWords;

  let found = -1;
  for (let i = cursor; i < words.length; i++) {
    if (norm(words[i].text) !== w0) continue;
    // a two-word anchor is enough to beat a coincidental single-word hit
    if (w1 && i + 1 < words.length && norm(words[i + 1].text) !== w1) continue;
    found = i;
    break;
  }

  // fall back to a single-word anchor, then to "wherever we are"
  if (found === -1) {
    for (let i = cursor; i < words.length; i++) {
      if (norm(words[i].text) === w0) {
        found = i;
        break;
      }
    }
  }
  if (found === -1) found = Math.min(cursor, words.length - 1);

  starts.push(found);
  cursor = found + 1;
}

const out = beats.map((beat, i) => {
  const start = starts[i];
  const endIdx = i + 1 < starts.length ? Math.max(start, starts[i + 1] - 1) : words.length - 1;
  return {
    text: beat.replace(/\s+/g, " "),
    startMs: words[start].startMs,
    endMs: words[endIdx].endMs,
    startFrame: Math.round((words[start].startMs / 1000) * FPS),
    endFrame: Math.round((words[endIdx].endMs / 1000) * FPS),
  };
});

// 4. A beat runs until the next one starts — that hands every trailing pause
//    to the beat that earned it, instead of cutting on the last syllable.
for (let i = 0; i < out.length - 1; i++) {
  out[i].holdToFrame = out[i + 1].startFrame;
}
out[out.length - 1].holdToFrame = out[out.length - 1].endFrame;

// Re-letter whisper's words with the script's spelling where a beat covers
// them, so what appears on screen is spelled the way it was written.
const respelled = words.map((w, i) => {
  const beatIdx = starts.findIndex(
    (s, k) => i >= s && (k + 1 === starts.length || i < starts[k + 1])
  );
  return { ...w, beat: beatIdx === -1 ? 0 : beatIdx };
});

fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.beats.json`),
  JSON.stringify(out, null, 2)
);
fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.words.json`),
  JSON.stringify(
    respelled.map((w) => ({
      text: w.text,
      beat: w.beat,
      startFrame: Math.round((w.startMs / 1000) * FPS),
      endFrame: Math.round((w.endMs / 1000) * FPS),
    })),
    null,
    2
  )
);

console.log(`${out.length} beats -> src/timing/${timingName}.beats.json\n`);
for (const b of out) {
  const hold = ((b.holdToFrame - b.endFrame) / FPS).toFixed(2);
  console.log(
    `${String(b.startFrame).padStart(4)}-${String(b.holdToFrame).padEnd(4)} ` +
      `(${(b.startMs / 1000).toFixed(1)}s, hold ${hold}s)  ${b.text.slice(0, 62)}`
  );
}
