/**
 * Chooses which of HIS lines go on screen as type, and when.
 *
 *   node scripts/punch-lines.mjs <timing-name> <script.md> [--max-words 5] [--card-words 3]
 *
 * ── Why this exists ──
 *
 * Type used to be hand-listed in Root.tsx, one line per chapter, and matched at
 * RENDER time by searching the transcript. Three things were wrong with that:
 *
 *   A line that didn't match was skipped in silence, so a typo just meant the
 *   card never appeared and nothing said so. 1 of 8 was doing this.
 *
 *   The search took the FIRST match in a chapter, which is wrong for a script
 *   built on repetition — "Nobody cares" lands four times in this episode and
 *   the fourth one is the one that matters.
 *
 *   And listing them by hand caps the count at whatever anyone bothered to
 *   type, which is how the device he actually likes ended up being 6% of the
 *   runtime.
 *
 * So selection is mechanical and happens here, at build time, in script order,
 * against a cursor that only moves forward. Every line that fails to resolve is
 * PRINTED. Nothing fails quietly.
 *
 * ── What gets picked ──
 *
 * The short sentences. That is not a shortcut, it is how he writes: the setup
 * runs long and conversational and the punch is two or three words hard
 * against it — "Skip it." "Nobody cares." "Shut the laptop." "I could be
 * wrong." Putting the short sentences on screen and leaving the long ones on
 * the plate is simply reading his own rhythm back.
 *
 * WHISPER IS THE CLOCK, THE SCRIPT IS THE WORDS. Whisper says where; every
 * character that reaches the screen comes from the script file.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

const argv = process.argv.slice(2);
const [timingName, scriptFile] = argv.filter((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(argv[i + 1]);
};

if (!timingName || !scriptFile) {
  console.error("usage: node scripts/punch-lines.mjs <timing-name> <script.md> [--max-words 5]");
  process.exit(1);
}

/** longest line that may go on screen at all */
const MAX_WORDS = flag("max-words", 5);
/** at or under this, it's a full-frame card; above it, it burns over the plate */
const CARD_WORDS = flag("card-words", 3);
/** no two pieces of type may start within this many frames of each other */
const MIN_GAP = flag("min-gap", 50);
/** the establisher gets this long, untouched, so the chapter title can be read */
const CHAPTER_LEAD_IN = flag("lead-in", 75);
/**
 * Longest the plate may sit alone, in frames. THE TAIL IS THE PROBLEM, NOT THE
 * MEAN — measured on the corporate episode, the median stretch of bare plate
 * was a perfectly healthy 6.4s, but eight stretches ran over ten seconds and
 * one ran twenty. A frozen frame for twenty seconds is a dead screen, and
 * raising the overall word limit to fix it would only make the ALREADY-busy
 * passages busier while leaving the hole exactly where it was. So the second
 * pass below targets the holes directly.
 */
const MAX_HOLD = flag("max-hold", 240);
/** gap-fillers may run longer than MAX_WORDS — they exist to break a silence */
const FILL_MAX_WORDS = flag("fill-max-words", 10);

const words = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.words.json`), "utf8")
);
const chapters = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "timing", `${timingName}.chapters.json`), "utf8")
);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();

// --- split the script the same way align-chapters does, so the two agree
const src = fs.readFileSync(scriptFile, "utf8");
const parts = src.split(/^##\s+/m).slice(1);
const scriptChapters = parts.map((block) => {
  const nl = block.indexOf("\n");
  return {
    title: block.slice(0, nl === -1 ? undefined : nl).trim(),
    body: (nl === -1 ? "" : block.slice(nl)).trim(),
  };
});

if (scriptChapters.length !== chapters.length) {
  console.error(
    `script has ${scriptChapters.length} chapters, timing has ${chapters.length}. Re-run align-chapters first.`
  );
  process.exit(1);
}

/**
 * Sentences, keeping his em-dashes as breaks.
 *
 * He punctuates the punch as its own sentence, which is exactly the unit we
 * want; an em-dash is doing the same job with different furniture, so it counts
 * as a break too. Line breaks in the file are reflow, not structure — the
 * script is wrapped prose — so they are NOT breaks.
 */
function sentences(body) {
  return body
    .replace(/\s*\n\s*/g, " ")
    .split(/(?<=[.!?])\s+|\s+—\s+/)
    .map((s) => s.trim().replace(/^[—–-]\s*/, "").replace(/[.,;:]+$/, ""))
    .filter(Boolean);
}

/**
 * Walks the whole recording once, matching sentences in script order.
 *
 * The cursor never goes backwards, which is what makes a repeated line land on
 * the RIGHT repeat. A sentence that whisper mangled is reported and skipped,
 * and the cursor stays put so the next sentence can still find itself.
 */
let cursor = 0;
const resolved = [];
const missed = [];

for (let ci = 0; ci < scriptChapters.length; ci++) {
  const chEnd = chapters[ci + 1] ? chapters[ci + 1].startFrame : chapters[ci].endFrame;

  for (const sentence of sentences(scriptChapters[ci].body)) {
    const target = norm(sentence).split(" ").filter(Boolean);
    if (!target.length) continue;

    let found = -1;
    // A generous forward window: whisper drops and merges words, so the cursor
    // drifts behind the script over a long episode and has to be able to catch up.
    for (let i = cursor; i < Math.min(words.length, cursor + 400); i++) {
      let ok = true;
      for (let j = 0; j < target.length; j++) {
        if (norm(words[i + j]?.text ?? "") !== target[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        found = i;
        break;
      }
    }

    if (found === -1) {
      missed.push({ chapter: ci, sentence, words: target.length });
      continue;
    }

    const startFrame = words[found].startFrame;
    const endFrame = words[found + target.length - 1].endFrame;
    cursor = found + target.length;

    resolved.push({
      line: sentence,
      chapter: ci,
      words: target.length,
      startFrame,
      endFrame,
      chapterStart: ci === 0 ? 0 : chapters[ci].startFrame,
      chEnd,
    });
  }
}

// --- select
const picked = [];
const MAX_HOLD_EXEMPT = new Set();
for (const r of resolved) {
  if (r.words > MAX_WORDS) continue;
  // leave the establisher alone long enough for the baked title to be read
  if (r.startFrame - r.chapterStart < CHAPTER_LEAD_IN) continue;
  // never strobe two pieces of type together
  if (picked.length && r.startFrame - picked[picked.length - 1].startFrame < MIN_GAP) continue;
  // A chapter's LAST sentence is very often its best — "I could be wrong",
  // "Bye" — so this only drops type that would start on the chapter boundary
  // itself. Type that merely runs past the boundary is fine: the renderer
  // clamps it to the chapter, since a card outliving its own sequence is what
  // would actually break.
  // 40 frames, not a token margin: the renderer clamps a card to its chapter,
  // so a line starting 19 frames before the boundary renders for 0.6s and
  // flickers. This is the minimum a card can be on screen and be read.
  if (r.startFrame >= r.chEnd - 40) continue;

  picked.push({
    line: r.line,
    chapter: r.chapter,
    startFrame: r.startFrame,
    endFrame: r.endFrame,
    variant: r.words <= CARD_WORDS ? "card" : "over",
  });
}

/**
 * Second pass: break up any stretch where the plate sits alone too long.
 *
 * Fillers are forced to `over`, and that is the whole idea. "over" keeps the
 * picture on screen and lays the line across the top of it, so breaking a
 * twenty-second silence costs nothing from the artwork — the answer to "more
 * type or more mascot" turns out to be that you do not have to choose.
 *
 * They are allowed to be longer than a punch (FILL_MAX_WORDS) because their job
 * is different: a punch is chosen for being short and hard, a filler is chosen
 * for being THERE, in a specific hole, and it is usually a setup line.
 */
const TAIL_F = 22;
const endOf = (p) => p.startFrame + Math.max(p.endFrame - p.startFrame + TAIL_F, 40);

/** Holes with nothing available to put in them. Skipped, not retried forever. */
const unfillable = new Set();

/** Every stretch where the plate is currently on its own, longest first. */
function holds() {
  const out = [];
  for (let ci = 0; ci < chapters.length; ci++) {
    const from = ci === 0 ? 0 : chapters[ci].startFrame;
    const chEnd = chapters[ci + 1] ? chapters[ci + 1].startFrame : chapters[ci].endFrame;
    let cursor = from;
    for (const p of picked.filter((x) => x.chapter === ci).sort((a, b) => a.startFrame - b.startFrame)) {
      if (p.startFrame > cursor) out.push({ size: p.startFrame - cursor, from: cursor, to: p.startFrame, ci });
      cursor = Math.max(cursor, endOf(p));
    }
    if (chEnd > cursor) out.push({ size: chEnd - cursor, from: cursor, to: chEnd, ci });
  }
  return out.sort((a, b) => b.size - a.size);
}

let filled = 0;
for (let guard = 0; guard < 500; guard++) {
  const hole = holds().find((h) => h.size > MAX_HOLD && !unfillable.has(`${h.ci}:${h.from}:${h.to}`));
  if (!hole) break;

  // the line nearest the MIDDLE of the hole — splitting it beats nudging an edge
  const mid = (hole.from + hole.to) / 2;
  const candidate = resolved
    .filter(
      (r) =>
        r.chapter === hole.ci &&
        r.words <= FILL_MAX_WORDS &&
        r.startFrame > hole.from + MIN_GAP &&
        r.startFrame < hole.to - MIN_GAP &&
        r.startFrame < r.chEnd - 40 &&
        !picked.some((p) => p.startFrame === r.startFrame)
    )
    .sort((a, b) => Math.abs(a.startFrame - mid) - Math.abs(b.startFrame - mid))[0];

  if (!candidate) {
    unfillable.add(`${hole.ci}:${hole.from}:${hole.to}`);
    continue;
  }

  picked.push({
    line: candidate.line,
    chapter: candidate.chapter,
    startFrame: candidate.startFrame,
    endFrame: candidate.endFrame,
    variant: "over",
  });
  filled++;
}

picked.sort((a, b) => a.startFrame - b.startFrame);

const out = picked.map(({ line, chapter, startFrame, endFrame, variant }) => ({
  line,
  chapter,
  startFrame,
  endFrame,
  variant,
}));

fs.writeFileSync(
  path.join(ROOT, "src", "timing", `${timingName}.punch.json`),
  JSON.stringify(out, null, 2)
);

// --- report
const total = chapters[chapters.length - 1].endFrame;
const TAIL = 22;
const onScreen = out.reduce((a, p) => a + Math.max(p.endFrame - p.startFrame + TAIL, 40), 0);
const ts = (f) => `${String(Math.floor(f / FPS / 60)).padStart(2, "0")}:${String(Math.floor((f / FPS) % 60)).padStart(2, "0")}`;

console.log(`\n${resolved.length} sentences resolved, ${missed.length} not found`);
console.log(`${out.length} pieces of type (${filled} added to break long holds) -> src/timing/${timingName}.punch.json`);
console.log(
  `on screen ${(onScreen / FPS).toFixed(0)}s of ${(total / FPS).toFixed(0)}s = ${((100 * onScreen) / total).toFixed(1)}%\n`
);

let ch = -1;
for (const p of out) {
  if (p.chapter !== ch) {
    ch = p.chapter;
    console.log(`  ── ${ch + 1} ${chapters[ch].title}`);
  }
  console.log(`     ${ts(p.startFrame)}  ${p.variant.padEnd(4)}  ${p.line}`);
}

if (missed.length) {
  console.log(`\n  not found in the transcript (whisper mangled them, or he changed them live):`);
  for (const m of missed.slice(0, 30)) {
    console.log(`     ch${m.chapter + 1}  ${m.words}w  ${m.sentence.slice(0, 70)}`);
  }
  if (missed.length > 30) console.log(`     ... and ${missed.length - 30} more`);
}
