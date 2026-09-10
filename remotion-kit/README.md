# remotion-kit

Renders the repeatable brand pieces of a Joke Lab reel from code, so they come out
identical every week and cost seconds instead of a Canva session.

**This does not write, cut, or edit anything.** It builds graphics. The writing stays
yours, the edit stays in VN. What it removes is the third hour — the one spent
rebuilding the same end card and the same text stamps by hand.

---

**Run this through `/reel-cut`** — that skill drives the whole pipeline and carries the
gotchas. What follows is the manual version.

## Use it

```bash
npm install          # once
npm run studio       # visual editor, scrub frames, live-edit props
npm run render:cta   # the end card -> out/cta_end_card.mp4
npm run render:demo  # look test -> out/demo_reel.mp4
```

## Cutting a reel to a VO

```bash
node scripts/transcribe.mjs <audio> reel2       # word timings, local whisper, free
node scripts/align.mjs reel2 <script.txt>       # script -> beats
node scripts/prep-images.js <image-dir> reel2   # snap yellow, upscale, flip copies
cp <audio> public/audio/reel2.wav
npx remotion render src/index.ts Reel2Images out/reel2.mp4
```

Whisper is only the **clock**. Every word that reaches the screen comes from the
script file — whisper mangles the words that matter most.

Renders on this machine: **CTA card ≈ 6s**, a 30s reel ≈ 4–5 min.

In the studio the frame number is on the timeline. That number is the unit of
direction — "put a motion blur from frame 56 to 67" lands exactly, where "right
after he turns" takes four tries.

## Making him talk

```bash
node scripts/mouth-track.mjs public/audio/corp2.wav corp2   # VO -> mouth-open per frame
npx remotion render src/index.ts LipSyncTest out/lipsync_test.mp4
```

The mouth is driven off the **recorded waveform**, not keyframed by hand — same
principle as whisper being the clock for captions. `mouth-track.mjs` writes
`src/timing/<name>.mouth.json`, one `{open, shape}` per video frame, so the
numbers are a file you can open and fix rather than a black box inside a render.

**Amplitude, not phonemes.** The reference channels swap between roughly three
mouth shapes. At feed size nobody resolves an F from a TH — they resolve OPEN vs
SHUT, on time. Phoneme accuracy (Rhubarb Lip Sync, free) is a later upgrade and
needs nine drawn mouths.

Three knobs in that script, in the order you will actually reach for them:
`GATE` (mouth flapping during pauses = room tone reading as speech, raise it),
`ATTACK`/`RELEASE` (strobing on fast words), `LOUD_PERCENTILE` (whole track
mumbling because one clipped breath set the ceiling).

**The mouth art is a stand-in.** It is drawn in code as an ellipse, and it works
at all only because this character's mouth already sits inside a black beard —
a dark shape opening there reads correctly with nothing painted out. The real
asset is a generated sheet: a face with the mouth region **blank**, plus three
mouth PNGs. That swaps in at `MOUTH` in `TalkingMascot.tsx` without touching the
driver, and it changes the look while changing not one frame of the timing.

Only `bust` is measured. An unmeasured pose renders silent rather than wrong.

## What's here

| Piece | What it is |
|---|---|
| `CTACard` | The locked end slide from `../joke-lab/fixed_assets.md`. Black, acid yellow type, JOKE LAB stamp top-right. Copy is fixed in `src/brand.ts` — no episode number, that's what makes it reusable. |
| `ReelScene` | One beat: full-bleed yellow, black silhouette environment, mascot, one baked line, slow push-in. |
| `Caption` | Baked on-screen text in Anton. Censors profanity automatically, so a script line pastes in raw. |
| `FilmTreatment` | Scanlines, grain, vignette, gate weave. |
| `Mascot` | Seven poses off the character sheet, with a slow drift so he reads as drawn rather than pasted. |
| `TalkingMascot` | The puppet. Same poses, plus a mouth driven by `<name>.mouth.json` and a head-lift on loud syllables. Blink is off by default — a flat skin cap over glasses reads as damage. |

Build a reel **scene by scene**, then concatenate. One giant composition is how a
fix in scene 1 quietly breaks scene 6.

## The mascot assets

`npm run extract` re-cuts `../brand_artefacts/mascot_character_sheet.png` into
`assets/mascot/` (mirrored to `public/mascot/` for rendering). Re-run it only if the
sheet is redrawn.

Three things that script has to work around, all of them properties of the sheet:

1. **The sheet's yellow is `#E9F916`, not brand `#F2FF00`.** Close enough to look
   identical alone, different enough to show as a patch if a raw crop is dropped on
   a brand-yellow background.
2. **A colour key eats his face.** His skin sits near enough to the yellow in hue
   that `colorkey` punches holes through it. So the script flood-fills inward from
   the crop border instead — background connected to the edge goes, skin never can.
   Pockets walled off by his legs or an arm need an extra seed point; those are
   listed per pose in the script.
3. **The sheet is annotated.** Arrows, the dead *SIDE EFFECTS OF THINKING* wordmark,
   section rules. After the fill those are isolated islands floating in transparent
   space, so the script drops any opaque component under 2% of the largest.

**Not included: the walking / sitting-on-floor / sitting-on-chair poses.** They exist
on the sheet at roughly 100px wide. Anything beyond a small background placement
turns to mush at feed size. Regenerate them full-size before using them.

## Known limits

- **Placeholder mouth positions are measured per pose, in the PNG's own
  normalised box.** `y` is the TOP of the lip band, not its centre. Using the
  centre opens the mouth on his chin.
- **The mascot can't be re-posed.** These are flat cutouts — they can move, scale,
  drift and be masked, not bend. A new pose is a new generated image.
- **Only `bust` is comfortably above 1080-wide.** The rest are upscaled somewhat at
  hero size. Fine so far; watch the beard and glasses, they're the first to mush.
- **Treatment is tuned for yellow, not black.** Yellow shows every point of multiply
  as a slide toward olive. `FilmTreatment` defaults are deliberately gentle; the
  CTA card runs at `intensity={0.45}` because black hides far more.
