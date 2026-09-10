/**
 * Splits an episode into alternating TEXT and ART beats — at a tempo the
 * EPISODE declares, not one this script decides.
 *
 *   node scripts/page-plan.mjs <timing-name> <script.md>
 *
 * ══════════════════════════════════════════════════════════════════════
 *  TWO STATES, AND NEITHER CARRIES THE OTHER'S CONTENT
 * ══════════════════════════════════════════════════════════════════════
 *
 *   TEXT — a flat page in the chapter's scene colour. His phrases accumulate,
 *          the page clears at the end of the sentence. Text owns the frame.
 *   ART  — the plate, full-bleed, with NOTHING on it. Art owns the frame.
 *
 * A bar across the picture is text INTERRUPTING art, not talking. This format
 * exists so each gets to talk in its own idiom.
 *
 * It also buys real CUTTING, which nothing else did: a crop of a picture is not
 * a cut, and with nine plates and no second subject there was nothing to cut
 * to. The text page is that second subject.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  WHAT DECIDES TEXT vs ART: the line's job, never the clock
 * ══════════════════════════════════════════════════════════════════════
 *
 * The first version of this file assigned by timer — 14s of text, 6s of art,
 * repeat. He caught it: "the texts are communicating what the images can and
 * the images are communicating what the text can."
 *
 *   VERDICT — a command or judgement aimed at the listener, no scene in it.
 *             "Skip it." "Fuck it." "Nobody cares." "Shut the laptop."
 *             The words ARE the joke.                          -> TEXT
 *
 *   SCENE   — a person doing something somewhere.
 *             "You'll be on mute the entire meeting."
 *             "Good morning to the client sitting in Europe."
 *             Setting that in giant type wastes it.            -> ART
 *
 * ══════════════════════════════════════════════════════════════════════
 *  TEMPO — why this is a config and not a constant
 * ══════════════════════════════════════════════════════════════════════
 *
 * His call, 23 Aug: every episode is different, some want rapid cutting and
 * some want to sit still, and the system has to fit any of them rather than be
 * robotic. So the numbers live with the EPISODE, in <name>.plan.json:
 *
 *   { "tempo": "measured", "lean": "scenes", "overrides": { "It's a Thursday": "text" } }
 *
 * tempo sets the pace and, through it, how many pictures the episode needs: a
 * beat that outruns the tempo's limit is SPLIT, and every split beat wants its
 * own image. Rapid episodes are image-hungry by construction; slow ones are not.
 *
 * lean biases the classifier — a rant leans "verdicts", a story leans "scenes".
 * It is a bias, not a percentage target. He was explicit that the ratio is an
 * OUTCOME, not an input.
 *
 * overrides are the last word. No classifier is right every time and he is the
 * editor; a quoted opening fragment flips any sentence, and it survives re-runs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

/**
 * The tempo presets. `maxArt`/`maxText` are seconds a single beat may hold
 * before it is split — which is also what generates the shot list, since each
 * split art beat wants a picture of its own.
 */
const TEMPO = {
  rapid:    { phraseWords: 3, maxArt: 5,  maxText: 6,  opener: 2.5 },
  brisk:    { phraseWords: 3, maxArt: 8,  maxText: 10, opener: 3.5 },
  measured: { phraseWords: 4, maxArt: 12, maxText: 14, opener: 4 },
  slow:     { phraseWords: 5, maxArt: 18, maxText: 20, opener: 6 },
};

/** Bias added to the verdict/scene score. Positive pushes a line toward TEXT. */
const LEAN = { verdicts: 2, balanced: 0, scenes: -2 };

const [timingName, scriptFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!timingName || !scriptFile) {
  console.error("usage: node scripts/page-plan.mjs <timing-name> <script.md>");
  process.exit(1);
}

const T = (n) => path.join(ROOT, "src", "timing", `${timingName}.${n}`);
const captions = JSON.parse(fs.readFileSync(T("captions.json"), "utf8"));
const chapters = JSON.parse(fs.readFileSync(T("chapters.json"), "utf8"));

const planFile = T("plan.json");
const plan = fs.existsSync(planFile)
  ? JSON.parse(fs.readFileSync(planFile, "utf8"))
  : { tempo: "measured", lean: "balanced", overrides: {} };
const tempo = TEMPO[plan.tempo] ?? TEMPO.measured;
const lean = LEAN[plan.lean] ?? 0;
const overrides = plan.overrides ?? {};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, "");

// --- sentences, as index ranges into captions.json
//
// No searching: align-script.mjs built captions.json from this same file with
// this same tokenisation, in order, so token N of the script is entry N of the
// caption track. If that script's tokenising changes, this breaks silently —
// the guard below is the tripwire.
const parts = fs.readFileSync(scriptFile, "utf8").split(/^##\s+/m).slice(1);
const sentences = [];
let idx = 0;
parts.forEach((block, ci) => {
  const nl = block.indexOf("\n");
  const body = (nl === -1 ? "" : block.slice(nl)).trim().replace(/\s*\n\s*/g, " ");
  let cur = { from: idx, chapter: ci };
  for (const raw of body.split(/\s+/).filter(Boolean)) {
    if (!norm(raw)) continue;
    idx++;
    if (/[.!?]["']?$/.test(raw) || raw.endsWith("—")) {
      cur.to = idx;
      if (cur.to > cur.from) sentences.push(cur);
      cur = { from: idx, chapter: ci };
    }
  }
  cur.to = idx;
  if (cur.to > cur.from) sentences.push(cur);
});

if (idx !== captions.length) {
  console.error(
    `token drift: script gives ${idx}, captions.json has ${captions.length}. Re-run align-script.`
  );
  process.exit(1);
}

/** Things you can draw: a person, an object being handled, a place, a time. */
const SCENE =
  /\b(meeting|deck|proposal|laptop|timesheet|spreadsheet|recruiter|manager|lead|client|office|room|desk|chair|rice|dinner|netflix|instagram|reels|lanyard|id|badge|certification|ai|pto|email|chat|interview|judge|court|lawyer|papers|mute|europe|thursday|monday|lunch|weekend|weekends|night|nights|hike|call|phone|screen|minute|photo|neck|number|home|table|bed|hours)\b/i;
/** Openers that mark a line as spoken AT the listener rather than about a scene. */
const VERDICT =
  /^(skip|fuck|do|don't|dont|finish|shut|stop|take|tell|watch|go|put|try|tag|attend|say|see|nobody|even|yet|bye|wow|i could be wrong)\b/i;

for (const s of sentences) {
  s.text = captions.slice(s.from, s.to).map((w) => w.text).join(" ");
  s.words = s.to - s.from;
  s.startFrame = captions[s.from].startFrame;
  s.endFrame = captions[s.to - 1].endFrame;

  let score = lean;
  if (s.words <= 4) score += 3;
  else if (s.words <= 6) score += 1;
  if (s.words >= 9) score -= 3;
  if (VERDICT.test(s.text.trim())) score += 2;
  if (SCENE.test(s.text)) score -= 2;

  s.kind = score > 0 ? "text" : "art";

  // His word is final.
  for (const [frag, forced] of Object.entries(overrides)) {
    if (s.text.toLowerCase().startsWith(frag.toLowerCase())) {
      s.kind = forced;
      s.overridden = true;
    }
  }
}

// --- merge runs, then SPLIT anything that outruns the tempo
const beats = [];
for (let ci = 0; ci < chapters.length; ci++) {
  const from = ci === 0 ? 0 : chapters[ci].startFrame;
  const end = chapters[ci + 1] ? chapters[ci + 1].startFrame : chapters[ci].endFrame;
  const mine = sentences.filter((s) => s.chapter === ci);
  if (!mine.length) continue;

  // Every chapter opens on art: the chapter title is baked into the plate and
  // has to be read once, whole, before anything else happens.
  const runs = [];
  for (const s of mine) {
    const last = runs[runs.length - 1];
    if (last && last.kind === s.kind) last.sentences.push(s);
    else runs.push({ kind: s.kind, sentences: [s] });
  }
  if (runs[0].kind !== "art") runs.unshift({ kind: "art", sentences: [], opener: true });

  let cursor = from;
  for (const run of runs) {
    const runEnd = run.sentences.length
      ? run.sentences[run.sentences.length - 1].endFrame
      : cursor + tempo.opener * FPS;

    // split at sentence boundaries once the beat outruns its tempo
    const cap = (run.kind === "art" ? tempo.maxArt : tempo.maxText) * FPS;
    let chunk = [];
    let chunkStart = cursor;
    const flush = (stop) => {
      if (stop <= chunkStart) return;
      beats.push({
        kind: run.kind,
        chapter: ci,
        startFrame: chunkStart,
        endFrame: Math.min(stop, end),
        ...(run.kind === "text" ? { sentences: chunk.map(pack) } : {}),
      });
      chunkStart = Math.min(stop, end);
      chunk = [];
    };

    if (!run.sentences.length) {
      flush(Math.min(runEnd, end));
      cursor = chunkStart;
      continue;
    }
    for (const s of run.sentences) {
      chunk.push(s);
      if (s.endFrame - chunkStart >= cap) flush(s.endFrame);
    }
    flush(Math.min(runEnd, end));
    cursor = chunkStart;
  }
  if (beats.length) beats[beats.length - 1].endFrame = end;
}

function pack(s) {
  return {
    from: s.from,
    to: s.to,
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    emphasis: s.words <= 4,
  };
}

/**
 * Merge anything too short to be a beat.
 *
 * Splitting on sentence boundaries with a hard tempo cap produces stragglers —
 * "Wow." is 0.8s on its own, and a page that exists for 24 frames is a flicker,
 * not a beat. This is independent of tempo: even "rapid" cannot show a page in
 * under a second and have it read.
 */
const MIN_BEAT = 1.2 * FPS;
for (let i = beats.length - 1; i > 0; i--) {
  if (beats[i].endFrame - beats[i].startFrame >= MIN_BEAT) continue;
  if (beats[i].chapter !== beats[i - 1].chapter) continue;
  const prev = beats[i - 1];
  prev.endFrame = beats[i].endFrame;
  // a swallowed text beat keeps its sentences if the survivor is also text
  if (prev.kind === "text" && beats[i].sentences)
    prev.sentences = [...(prev.sentences ?? []), ...beats[i].sentences];
  beats.splice(i, 1);
}

// art beats each want their own picture; index them so the renderer can look
// one up and fall back to the chapter plate when it does not exist
let shot = 0;
for (const b of beats) if (b.kind === "art") b.shot = shot++;

fs.writeFileSync(
  T("pages.json"),
  JSON.stringify({ tempo: plan.tempo ?? "measured", phraseWords: tempo.phraseWords, beats }, null, 2)
);

// --- report
const secs = (f) => (f / FPS).toFixed(1);
const ts = (f) =>
  `${String(Math.floor(f / FPS / 60)).padStart(2, "0")}:${String(Math.floor((f / FPS) % 60)).padStart(2, "0")}`;
const total = chapters[chapters.length - 1].endFrame;
const artF = beats.filter((b) => b.kind === "art").reduce((a, b) => a + b.endFrame - b.startFrame, 0);
const artBeats = beats.filter((b) => b.kind === "art");

console.log(`tempo "${plan.tempo ?? "measured"}" · lean "${plan.lean ?? "balanced"}" · ${Object.keys(overrides).length} override(s)`);
console.log(`${beats.length} beats -> src/timing/${timingName}.pages.json`);
console.log(
  `art ${secs(artF)}s (${((100 * artF) / total).toFixed(0)}%) in ${artBeats.length} beats · text ${secs(total - artF)}s (${((100 * (total - artF)) / total).toFixed(0)}%)`
);
console.log(`PICTURES WANTED: ${artBeats.length} (have 9 plates; the rest fall back to the chapter plate)`);

/**
 * The opener is a REQUEST, not a guarantee. The chapter title is baked into the
 * plate and wants `tempo.opener` seconds to be read — but if he goes straight
 * into a verdict, the writing wins and the title gets whatever the writing
 * leaves. Reported rather than silently forced, because forcing it would mean
 * delaying a text page off the voice, and nothing here may drift off the voice.
 */
const short = [];
for (let ci = 0; ci < chapters.length; ci++) {
  const first = beats.find((b) => b.chapter === ci);
  if (first && first.kind === "art") {
    const d = (first.endFrame - first.startFrame) / FPS;
    if (d < tempo.opener) short.push([ci, d]);
  } else if (first) short.push([ci, 0]);
}
if (short.length) {
  console.log(
    `\n  ! chapter title gets less than the ${tempo.opener}s opener (the writing goes straight in):`
  );
  for (const [ci, d] of short)
    console.log(`      ch${ci + 1} ${d.toFixed(1)}s — ${chapters[ci].title}`);
}
console.log("");

let ch = -1;
for (const b of beats) {
  if (b.chapter !== ch) {
    ch = b.chapter;
    console.log(`  ── ${ch + 1} ${chapters[ch].title}`);
  }
  const d = secs(b.endFrame - b.startFrame).padStart(5);
  if (b.kind === "art") {
    console.log(`     ${ts(b.startFrame)} ${d}s  ART #${b.shot}`);
  } else {
    console.log(`     ${ts(b.startFrame)} ${d}s  TEXT`);
    for (const s of b.sentences)
      console.log(`                       ${s.emphasis ? "*" : " "} ${captions.slice(s.from, s.to).map((w) => w.text).join(" ").slice(0, 60)}`);
  }
}
