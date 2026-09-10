/**
 * Aligns a chaptered episode script to a recorded VO.
 *
 *   node scripts/align-chapters.mjs <timing-name> <script.md>
 *
 * Script format — the heading IS the on-screen text, so write headings as
 * punchy lines rather than labels:
 *
 *     ## Nobody Cares About Your Deck
 *     That deck your manager wants now. Urgent.
 *     Do it. Finish it...
 *
 *     ## You Are A Number With A Lanyard
 *     Do you have an ID...
 *
 * Same principle as the reel aligner: whisper supplies the clock, the script
 * supplies every word that reaches the screen.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

const [timingName, scriptFile] = process.argv.slice(2);
if (!timingName || !scriptFile) {
  console.error("usage: node scripts/align-chapters.mjs <timing-name> <script.md>");
  process.exit(1);
}

const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.json`), "utf8")
);

// drop whisper's [BLANK_AUDIO] tail, which carries a bogus end time
const blankAt = raw.findIndex((c, i) =>
  raw.slice(i, i + 6).map((t) => t.text.trim()).join("").toUpperCase().startsWith("BLANK_AUDIO")
);
const usable = blankAt === -1 ? raw : raw.slice(0, blankAt);

// rebuild whole words — whisper marks a new word with a leading space
const words = [];
for (const tok of usable) {
  if (tok.text.startsWith(" ") || words.length === 0) {
    words.push({ text: tok.text.trim(), startMs: tok.startMs, endMs: tok.endMs });
  } else {
    const last = words[words.length - 1];
    last.text += tok.text.trim();
    last.endMs = tok.endMs;
  }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// --- split the script on ## headings
const src = fs.readFileSync(scriptFile, "utf8");
const parts = src.split(/^##\s+/m).slice(1);
if (!parts.length) {
  console.error("No '## ' headings found. Chapters are defined by markdown H2s.");
  process.exit(1);
}

const chapters = parts.map((block) => {
  const nl = block.indexOf("\n");
  return {
    title: block.slice(0, nl === -1 ? undefined : nl).trim(),
    body: (nl === -1 ? "" : block.slice(nl)).trim(),
  };
});

// --- anchor each chapter by its opening words
//
// A long script repeats openers ("And you know what else…") far more often
// than a 9-beat reel does, so the search always starts AFTER the previous
// chapter and prefers a three-word match before falling back.
let cursor = 0;
const starts = [];

for (const ch of chapters) {
  const bw = ch.body.split(/\s+/).map(norm).filter(Boolean);
  let found = -1;

  for (const anchorLen of [3, 2, 1]) {
    for (let i = cursor; i < words.length; i++) {
      let ok = true;
      for (let k = 0; k < anchorLen; k++) {
        if (norm(words[i + k]?.text ?? "") !== bw[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        found = i;
        break;
      }
    }
    if (found !== -1) break;
  }

  if (found === -1) {
    console.warn(`  ! no anchor for "${ch.title}" — placed after the previous chapter`);
    found = Math.min(cursor, words.length - 1);
  }

  starts.push(found);
  cursor = found + 1;
}

const out = chapters.map((ch, i) => {
  const start = starts[i];
  const endIdx = i + 1 < starts.length ? Math.max(start, starts[i + 1] - 1) : words.length - 1;
  return {
    title: ch.title,
    startFrame: Math.round((words[start].startMs / 1000) * FPS),
    endFrame: Math.round((words[endIdx].endMs / 1000) * FPS),
  };
});

fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.chapters.json`),
  JSON.stringify(out, null, 2)
);

/**
 * Word timings, in cutplan's TimedWord shape.
 *
 * Without this file cutPlan() falls back to an even split, and the cuts stop
 * landing on pauses in the speech — which is most of what separates an edited
 * video from a slideshow on a timer. The chapter aligner never used to emit
 * it, so every episode cut before 21 Aug 2026 was silently on even splits.
 *
 * Whisper's spelling is fine here: nothing in this file reaches the screen, it
 * only says WHERE the breaths are.
 */
fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.words.json`),
  JSON.stringify(
    words.map((w) => ({
      text: w.text,
      startFrame: Math.round((w.startMs / 1000) * FPS),
      endFrame: Math.round((w.endMs / 1000) * FPS),
    })),
    null,
    2
  )
);

console.log(`${out.length} chapters -> src/timing/${timingName}.chapters.json`);
console.log(`${words.length} words    -> src/timing/${timingName}.words.json\n`);
for (let i = 0; i < out.length; i++) {
  const end = i + 1 < out.length ? out[i + 1].startFrame : out[i].endFrame;
  const mins = ((end - out[i].startFrame) / FPS / 60).toFixed(1);
  console.log(
    `${String(out[i].startFrame).padStart(6)}  ${mins.padStart(4)} min   ${out[i].title}`
  );
}
