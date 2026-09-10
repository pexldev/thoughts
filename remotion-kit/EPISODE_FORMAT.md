# The long-form episode format

**Built 22–23 August 2026.** This is the record of how `/episode-cut` got to its
current shape, including the things that were tried and rejected — because most
of them are tempting enough to be rebuilt by accident.

Companion docs: the skill at `.claude/commands/episode-cut.md` (how to run it),
`prep/color_system.md` (the colour rules it obeys), `sermons/corporate_shot_list.md`
(what the corporate episode still wants drawn).

---

## 1 · What the format is

Two states, and **neither carries the other's content**.

| | |
|---|---|
| **ART** | The chapter plate, full-bleed, with **nothing on it**. |
| **TEXT** | A flat page in the chapter's scene colour. His phrases accumulate; the page clears at the end of the sentence. |

The reason for the hard separation, in his words on 23 Aug: *"I want the artwork
and the texts in its own style do the talking."* A bar across the picture is
text **interrupting** art, not talking.

### The side effect that fixed everything else

This is the part worth remembering. Three rebuilds failed because **a crop of a
picture is not a cut** — the eye recognises the same image and reads the change
as camera wobble. With nine plates and no second subject, there was nothing to
cut *to*.

**The text page is that second subject.** Cutting page → plate is a real cut, and
it costs no new artwork.

---

## 2 · What decides TEXT vs ART

Not the clock. The first version assigned by timer — 14s text, 6s art, repeat —
and he caught it immediately:

> *"the texts are communicating what the images can and the images are
> communicating what the text can"*

The rule that replaced it:

- **VERDICT** — a command or judgement aimed at the listener, no scene in it.
  *Skip it. Fuck it. Nobody cares. Shut the laptop. I could be wrong.*
  The words **are** the joke. → **TEXT**
- **SCENE** — a person doing something somewhere.
  *"You'll be on mute the entire meeting." "Good morning to the client sitting in
  Europe."* Setting that in giant type wastes it. → **ART**

Implemented as a scored classifier in `scripts/page-plan.mjs` (length, imperative
openers, presence of depictable nouns). It is roughly right, not always right —
which is what the override file is for.

---

## 3 · Tempo lives with the EPISODE, not with the code

His call, 23 Aug: *"every episode could be different… some would need rapid
cutting but some would just require slow cutting… we have to build a system that
fits anything and not just a robotic one."*

Four constants used to be hardcoded here. They now live in
`src/timing/<name>.plan.json`:

```json
{
  "tempo": "measured",
  "lean": "scenes",
  "overrides": { "It's a Thursday": "text" }
}
```

**`tempo`** — `rapid` · `brisk` · `measured` · `slow`. Sets words-per-phrase, the
longest an art beat may hold, the longest a text beat may hold, and the opener.
A beat that outruns its cap is **split at a sentence boundary**.

| tempo | phrase | max art | max text | opener |
|---|---|---|---|---|
| rapid | 3 | 5s | 6s | 2.5s |
| brisk | 3 | 8s | 10s | 3.5s |
| measured | 4 | 12s | 14s | 4s |
| slow | 5 | 18s | 20s | 6s |

**Tempo is therefore also the image budget.** Rapid episodes are image-hungry by
construction; slow ones are not. That is not a separate decision.

**`lean`** — `verdicts` · `balanced` · `scenes`. Biases the classifier. A rant
leans verdicts, a story leans scenes. **It is a bias, not a percentage target** —
he was explicit that the ratio is an outcome, not an input.

**`overrides`** — quote the opening of any sentence, force it either way. No
classifier is right every time and he is the editor. Survives re-runs.

---

## 4 · The pipeline

From `remotion-kit/`:

```bash
node scripts/transcribe.mjs <audio> <name>            # word timings, local whisper
node scripts/align-chapters.mjs <name> <script.md>    # chapters from ## headings
node scripts/align-script.mjs <name> <script.md>      # EVERY word timed
node scripts/punch-lines.mjs <name> <script.md>       # which lines are verdicts
node scripts/page-plan.mjs <name> <script.md>         # the ART/TEXT beats
cp <audio> public/audio/<name>.wav
npx remotion render src/index.ts <Composition> out/<name>.mp4 --crf 20
```

**Read the page-plan table before rendering.** It prints every beat, every
sentence, the picture count, and any chapter whose title gets less than its
opener. That table *is* the edit.

Measured on this machine: **~26 fps render.** A 5m26 episode takes ~6 minutes.

### WHISPER IS THE CLOCK. THE SCRIPT IS THE WORDS.

`align-script.mjs` does a Needleman-Wunsch alignment of the whole script against
the whole transcript. On the corporate episode: **852 script words, 98.5%
matched**, worst unmatched run two words (interpolated).

Using whisper's own words would be one line of code and would print `d ickey` and
`1.30 p.m..` on screen for fifteen minutes. Never do it.

---

## 5 · Rules that were each learned the hard way

### Motion

**THE PLATE DOES NOT MOVE.** No zoom, no pan, no crop, no boil. Three separate
motion ideas were rejected:

1. **Drift** — 1.03 → 1.00 across a 40s chapter is 0.075% of movement a second.
   A still frame with a rounding error.
2. **Crop-cutting** — a crop of a picture is not a cut. (§1.)
3. **Boil** — a 2px re-registration to feel hand-drawn. On a full-bleed plate it
   twitches the whole world, baked title included, and leaves the eye no still
   edge. His verdict: *"very very very very bad."*

The rule the boil left behind is about **what** boils, not how much:

> **Boil a cut-out. NEVER boil the frame.**

`boil()` survives in `src/stopmotion.ts` for mascot cut-outs, where it belongs.

### Type

1. **NO FADE.** A word is absent on frame N and complete on frame N+1. Any fade
   spreads the event over time, and an event spread over time is not an event.
   **This does almost all the work.** The rest is garnish and is very easy to
   over-season.
2. **DO NOT ADD SHAKE.** A version kicked the whole line sideways on every word
   onset — the textbook impact trick, and across an episode a judder that never
   stops. *"Violent, not our style."* Gone, nothing replaced it. Overshoot is
   damped (1.18x), not springy.
3. **ONE WORD AT A TIME.** Only the live word is at full strength; a word already
   said recedes. **A word not yet said is HIDDEN, never greyed** — greying the
   whole line and travelling a highlight deletes every arrival, and the arrival
   is the event.
4. **The live word INVERTS** to a yellow slab. Never a tint — a brightness change
   is invisible at feed size.
5. **One continuous bar per phrase, never a box per word.** Per-word boxes
   fragment a line into a picket fence.
6. **Long lines chunk, they do not shrink.** A 13-word line at a size that fits
   is unreadable; as four big beats it is not.
7. **Exactly one word is live, ever.** Whisper sets each word's end to the next
   word's start, so on a boundary frame two adjacent words both qualify, both
   light up, and the highlight stops travelling.
8. **Never two pieces of type on screen at once.** They interleave into word
   salad — `TELL I COULD … TRUE` out of *"Tell me if that's not true"* running
   under *"I could be wrong"*.

### Colour

Obeys `prep/color_system.md`. Acid yellow is the **signature, not the wallpaper**
— so the words are off-white `#F7F3E8` (slot 5) and the yellow is spent on the
one word in his mouth. A fully yellow line has no yellow left to travel with.

The page takes the chapter's own scene colour, so the colour change lands on the
section break.

### Two geometry bugs worth not repeating

- **A percentage `padding-bottom` in CSS resolves against WIDTH.** `22%` put the
  caption bar at 60% of a 16:9 frame — straight across the mascot's chest.
  Position off height explicitly.
- **The baked title band is not a fixed height.** Across the nine corporate
  plates its top edge runs from 93.3% (ch4) up to **73.3%** (ch9). A bar floor at
  77% was overlapping the band on five of the nine.

### Minimum beat

**1.2s.** Splitting on sentence boundaries with a hard tempo cap produces
stragglers — *"Wow."* is 0.8s alone, and a page that exists for 24 frames is a
flicker. Tempo-independent: even `rapid` cannot show a page in under a second.

### The opener is a request, not a guarantee

The chapter title is baked into the plate and wants its opener seconds to be
read. If he goes straight into a verdict, **the writing wins** — forcing it would
mean delaying a text page off his voice, and nothing here may drift off the voice.
The plan warns instead:

> `! ch1 2.1s — The Company Will Not Burn Down`

---

## 6 · File map

**Scripts**
- `transcribe.mjs` · `align-chapters.mjs` — unchanged from before
- `align-script.mjs` — **new.** Times every script word (Needleman-Wunsch)
- `punch-lines.mjs` — picks the short verdict lines
- `page-plan.mjs` — **the edit.** Classifier + tempo + overrides → beats
- `bar-colours.mjs` — vets a scene-coloured bar per episode
- `slice-sheet.mjs` — cuts a grid sheet into transparent PNGs (unit-tested, not
  yet run on real art)

**Components**
- `Episode.tsx` — renders the beats
- `components/PhraseStack.tsx` — **the text page**
- `components/CaptionBar.tsx` — the old continuous bar, **off by default**
  (`captionBar: true` brings it back over art beats)
- `stopmotion.ts` — holds, boil, cycle. For cut-outs only

**Retired** (`src/_retired/`, with a README saying why)
- `ChapterFrame.tsx` / `ChapterShots.tsx` — the crop-cutting shot system
- `PunchType.tsx` / `CardGround.tsx` — the full-frame emphasis card and its wipe

**Per-episode data** (`src/timing/<name>.*`)
- `.json` raw whisper · `.words.json` · `.chapters.json` · `.captions.json`
- `.punch.json` · `.pages.json` · **`.plan.json`** (tempo/lean/overrides)
- `.script.md` — the script the aligners read

---

## 7 · Where it stands

**Done and verified on stills / short renders.** The corporate episode at
`measured` / `scenes` gives **42 beats, art 87% in 30 beats, text 13%**.

**Not done:**

- **A full-length render in this format has not been made.** Everything shipped
  today (v3–v10) was the previous caption-bar format. The newest proofs are
  40–47 second slices.
- **30 pictures wanted, 9 exist.** Missing beats fall back to the chapter plate,
  so it plays today and improves with each image added. Ranked list in
  `sermons/corporate_shot_list.md` — the ten beats over 12s first.
- **Page → plate transitions are hard cuts**, untreated.
- **The mascot reaction sheet** has not been generated; the slicer is built and
  unit-tested but has never seen real artwork.
  Brief: `sermons/stop_motion_image_brief.md`.

**Standing caveat on everything above: none of it has been heard.** Every cut,
every word position and every beat boundary came from timing data. He is the
first person who actually watches it.

---

## 8 · The pattern underneath the whole day

Five separate "fixes" — drift, crop-cutting, boil, rationed type, shrunken
gap-fillers — were all ways of avoiding the same thing: showing enough text, and
admitting the episode needed more pictures than it had. Each one needed another
fix.

He removed the constraint underneath them instead, twice: *"subtitles for the
entire time"*, then *"the texts are communicating what the images can."*

**When a fix needs another fix, question the constraint above it.**
