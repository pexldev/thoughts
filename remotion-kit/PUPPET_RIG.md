# The puppet rig

> **PARKED 22 Aug 2026.** The first reel cut with this was rejected on sight. The
> rig works — it does hold one character across five rooms — but it lost to the
> purpose-drawn scenes anyway, and the reason is in **Standing limits**: it is
> front-facing only, so it cannot turn him away to look at the thing he is
> describing. A three-quarter body sheet is the obvious next move and needs no
> code change.
>
> **This is not part of `/reel-cut`** and never has been. Operator notes:
> `.claude/commands/puppet-rig.md`.

Making the mascot stand in a generated room and talk, from a recorded VO. Built
22 Aug 2026. Everything here runs locally and free — Remotion, ffmpeg, whisper.

---

## The idea in one line

**A room is a plate. The mascot is a layer on top of it. They are never generated together.**

Two things fall out of that, and the second matters more than the first:

1. He can talk anywhere, because the rig lives on the cutout, not the scene.
2. **He stops being a different man in every shot.** Generated inside each scene his
   beard, glasses and face drift image to image — cut five together and the viewer reads
   five brothers. One fixed set of drawings over changing rooms is how a character holds.

And the same rule had to be applied one level down, to the head set itself — see
**The window pass** below. It is the fix that made the talking head usable.

---

## Run it

```bash
# 1. VO -> mouth-open per frame
node scripts/mouth-track.mjs public/audio/corp2.wav corp2

# 2. generated sheets -> registered rig assets
python3 scripts/prep-heads.py          # heads_4.png  -> h0..h3 (+ hb0..hb3 if a blink sheet exists)
python3 scripts/prep-heads.py --debug  # + out/rig-debug/ : window boxes, diff maps, mouth-share %
node    scripts/prep-puppet.js         # bodies.png   -> b0..b4.png

# 3. render
npx remotion render src/index.ts RigTest     out/rig.mp4      # talking close-up
npx remotion render src/index.ts PuppetScene out/scene.mp4    # pose cuts + talking
npm run studio                                                # scrub frames, live-edit
```

---

## The assets

### What he generated — `assets/incoming/`

| File | What it is | Status |
|---|---|---|
| `heads_4.png` | 4 complete heads, identical but for the mouth | **live** |
| `bodies.png` | 5 full-length poses | **live** |
| `head_v2.png` | one head with a closed mouth | superseded |
| `mouths_v3.png` | 4 lens mouths, no face | superseded |
| `head_nomouth.png`, `mouths.png`, `mouths_v2.png` | v1/v2 attempts | dead |

### What the scripts produce — `public/mascot/rig/`

| File | Source | Notes |
|---|---|---|
| `h0`–`h3.png` | `prep-heads.py` | shut / ajar / half / wide. All four are head 0's face with only the mouth grafted in. 464×732. |
| `hb0`–`hb3.png` | `prep-heads.py` | the same four with his eyes shut. Only written if a blink sheet exists. |
| `hm_<mood>_0..3.png` | `prep-heads.py` | the four apertures re-curved per mood. `hmb_<mood>_*` for the blink versions. |
| `src/rig.heads.json`, `src/rig.bodies.json` | both prep scripts | sizes, aspects and paths. **The components read these — never type an aspect by hand.** |
| `b0`–`b4.png` | `prep-puppet.js` | hands at sides · arm out explaining · arms folded · hands in pockets · pointing. All within 1% of each other in height (784–791px), so **one scale number places any of them**. |

Bodies are trimmed individually, heads share a crop box. Different reasons: a mouth change
is a *substitution* and must register in place; a pose change is a *cut* and doesn't.

---

## The window pass — the fix that made it work

The first cut of this rig swapped the four generated heads whole, and it shimmered.
Measuring said why:

| | share of the change between heads that was the MOUTH |
|---|---|
| h1 | 7.5% |
| h2 | 9.8% |
| h3 | 10.8% |

**~90% of it was not the mouth.** The prompt asked for four heads identical but for the
mouth; the generator redrew the character four times — hair, glasses, ears, nose, beard
edge, collar, shoulders. Swapping that at 30fps does not animate a mouth, it redraws the
man four times a second. Worse, the biggest single disagreement was the **eyes and
glasses** — which is what the old script used as its registration anchor. It was measuring
a moving target.

So the swap is no longer whole-head. **Every frame is head 0's face, frozen, with only a
soft-edged window over the mouth taken from its sibling.** Same measurement after:
**94.8 / 95.1 / 95.6%**.

This is not a return to the six failed pasted-mouth attempts. Those pasted a *separate*
mouth sheet onto a *blank patch*, with nothing around it to agree with. This lifts a mouth
out of a sibling drawing **with its own lips, teeth, tongue, moustache and chin shadow**,
made by the same hand in the same pass. Nothing is invented and nothing is bare.

**Alignment now optimises the seam, not a feature.** What has to line up is the ring of
beard and skin where the graft meets the frozen face, so that annulus *is* the objective —
a search over translation and scale that minimises difference there. Align the seam and
the seam disappears; nothing outside it has to agree, because nothing outside it is used.

**If a fit lands on the edge of the search range the script says `PINNED AT SEARCH
LIMIT`.** That means the real optimum is outside the range and you are looking at a clamp,
not a fit. It still produces a plausible-looking PNG — which is exactly why it has to be
shouted rather than left for the eye to catch at 30fps.

The quiet dividend: **the generator no longer has to redraw the character consistently.**
It only has to put a usable mouth — or a usable pair of shut eyes — somewhere in frame.
That is an ask it can actually meet.

---

## Expression — the generated mouth is a frown

Spotted 22 Aug, and it is the kind of thing that hides in plain sight because it never
changes: **the upper lip is drawn as a straight flat line and the lower lip bulges
downward**, so the mouth corners sit at or below the centre in all four apertures. The
aperture moves as he speaks; the emotional read never does. He sulks through the entire
runtime regardless of what the line says.

Be precise about what is wrong, because it is *not* that he fails to smile — the house
rule is that the mascot plays deadpan, and that rule stands. **But deadpan means NEUTRAL,
and a downturned rest face is not neutral, it is sad.** It editorialises every line it sits
under, which is the opposite of what deadpan is for.

**Fixed by warping, not redrawing.** The displacement is purely vertical and parabolic
across the mouth — zero at the centre, maximum at the corners — which is what a smile
geometrically *is*. Gaussian falloff vertically and past the corners means the moustache
travels with the lip (as it must, it is attached) while the beard edge, chin and nose never
move. Measured on h0: the closed lip line is at y=356, spanning x=182–263.

| mood | lift | what it is for |
|---|---|---|
| `grim` | −8 | the line is the joke and he is not enjoying it |
| `asbuilt` | 0 | what the generator drew — kept so the old look is recoverable |
| **`deadpan`** | **+10** | **a genuinely flat mouth. The house default.** |
| `smirk` | +18 | he knows something you do not. The guru voice. |
| `smile` | +26 | rare on purpose — it stops meaning anything if he wears it |

Every mood is **the same four apertures**, so the choice costs nothing at render time and
cannot desync the lip track. A mood is a mask over a whole shot, not a per-frame decision.
Pick one in a scene by reading it out of the manifest:

```tsx
heads={rig.moods.smirk.srcs}      // instead of rig.srcs
blink={rig.moods.smirk.blinkSrcs}
```

`DEFAULT_MOOD` is *also* written to the bare `h0`–`h3` / `hb0`–`hb3` names, so anything
that just wants "the head set" keeps working and silently gets the house look.

The warp runs after the window pass and only touches a bounded region, so it cannot
disturb the registration the graft just established.

---

## Two matte bugs that only showed up off the yellow plate

Both were invisible for as long as the rig was previewed against acid yellow, which is why
they survived. Composite him onto a room and they are the first thing you see.

**Sealed yellow.** A border-seeded flood fill only reaches yellow with an unbroken path to
the edge of the sheet. The gap between his legs has none — it is walled off by the two
trouser outlines and the ground-shadow line under his feet. That left **~7,000px per pose**
of glowing #F2FF00 standing between his shins, plus specks in every gap between his hair
spikes. Fixed by seeding a second fill from any strongly-yellow pixel that survived the
first. Safe because the character contains no yellow at all — skin orange, hair and
trousers black, shirt grey — but the *seed* test is deliberately much tighter than the
*spread* test, because his skin is close enough in hue that seeding off a cheek would eat
his face.

**Yellow-cast edges.** The linework was anti-aliased *against* the yellow plate, so its
edge pixels are a real blend of black stroke and #F2FF00. They survive the key correctly —
they are partly ink — still carrying the yellow, which is why the shadow at his feet read
as olive-green scribble. ~3.5% of every body. Recolouring them to grey would be a hack:
they are **partial coverage** pixels, so the honest fix recovers the coverage. For a dark
stroke over yellow, green runs 255 at no coverage to ~0 at full, so `a = 1 - g/255`. Undo
the blend for the colour, put the rest into alpha. The stroke comes back as what it was —
ink at partial opacity — and then composites correctly over **any** plate instead of only
the one it was drawn on.

---

## The prompts that worked

Attach `brand_artefacts/mascot_character_sheet.png` to all of them.

### Heads — the one that matters

```
Using the attached character sheet as reference, draw the SAME character's head and
shoulders, front-facing, straight to camera, deadpan, in 4 versions arranged in a single
row. Identical head size, identical position, identical eye level, identical hair, beard,
glasses and expression in all four — the ONLY difference is the mouth. Version 1: mouth
closed, a narrow line. Version 2: mouth slightly open. Version 3: mouth half open, dark
inside. Version 4: mouth wide open, dark inside with a small tongue. Draw the lips
properly in every version. Flat acid yellow #F2FF00 background. NO text, NO labels, NO
borders. As large as possible.
```

### Bodies

```
Using the attached character sheet as reference, draw the SAME character at FULL LENGTH
in 5 poses, in a single row, all the same height and all standing on the same ground
line: standing straight with hands at his sides, one arm raised gesturing as if
explaining, arms folded, hands in pockets leaning slightly, one hand pointing off to the
side. Deadpan throughout. Head straight to camera in every pose. Flat acid yellow
#F2FF00 background. NO text, NO labels, NO borders. As large as possible.
```

### Blink — STILL THE BIGGEST REMAINING WIN, and the code is already in

Everything downstream of this file is built and tested. One generation turns it on.

```
Using the attached character sheet as reference, draw the SAME character's head and
shoulders, front-facing, deadpan, EXACTLY as in the previous image but with both EYES
CLOSED — a simple curved line for each closed eyelid behind the glasses. Everything else
identical: same head size, same position, same hair, beard, glasses, mouth closed. Flat
acid yellow #F2FF00 background. NO text, NO labels, NO borders. As large as possible.
```

Save as `assets/incoming/head_blink.png` and re-run `prep-heads.py`. It writes
`hb0`–`hb3.png`, flips `blinkSrcs` in the manifest, and the scenes pick it up with no code
change — they already pass `blink={heads.blinkSrcs}`, which does nothing while the array
is empty.

**The window pass makes this a much smaller ask than it looks.** Only the EYE REGION is
used; hair, beard, collar and shoulders are discarded because they come from head 0 like
everything else. The generator does not have to reproduce the character — it has to put a
believable pair of shut eyes roughly where head 0's are.

**Watch the console for `PINNED AT SEARCH LIMIT`.** The path was proof-tested by feeding
it the superseded `head_v2.png` as a stand-in: it pinned, and the graft ghosted — doubled
eyebrows, smeared forehead. That is the failure mode to expect if the new sheet is framed
differently from `heads_4.png`. Pinned means re-generate, not re-tune.

Blink is crossed with mouth (4 apertures x eyes-shut = `hb0`–`hb3`), so he can blink
mid-word rather than only in the gaps. Timing is a seeded schedule in `Puppet.tsx` —
3-4 frame closures, 2-6s apart, jittered so it never reads as a metronome, and
deterministic so re-rendering a reel to fix a caption does not resettle his face.

---

## The code

| File | Job |
|---|---|
| `scripts/mouth-track.mjs` | ffmpeg decodes the VO, writes `src/timing/<name>.mouth.json` — one `{open, shape}` per video frame |
| `scripts/prep-heads.py` | splits the 4-up sheet, **grafts the mouth window onto head 0**, optional blink, writes `src/rig.heads.json` |
| `scripts/prep-puppet.js` | keys + cuts the body poses, clears sealed yellow, un-mattes the edges, writes `src/rig.bodies.json` |
| `src/components/Puppet.tsx` | the puppet — head swap, blink schedule, performance, stop-motion stepping |
| `src/RigTest.tsx` | talking close-up, 12s on the corp2 VO |
| `src/PuppetScene.tsx` | the whole grammar — pose cuts wide, talking close |

### The knobs

**`mouth-track.mjs`** — reach for these in this order:

| Knob | Symptom it fixes |
|---|---|
| `GATE` | mouth flapping during pauses — room tone reading as speech, raise it |
| `ATTACK` / `RELEASE` | strobing on fast words |
| `LOUD_PERCENTILE` | whole track mumbling because one clipped breath set the ceiling |

**`Puppet.tsx`**

| Prop | What it does |
|---|---|
| `heads` | four complete drawings, swapped by aperture |
| `perform` | how much the head acts, 0–1.5. See below. |
| `stepFps` | quantises body motion to N steps/sec while audio stays at 30 |
| `boil` | slow drift so he reads as drawn rather than pasted |

**`perform`** drives four things off the same amplitude track the mouth uses:

- **nod** — chin drops *into* a loud syllable, **lagged 3–7 frames**. That lag is the
  whole trick: a head that moves exactly on the sample looks like a VU meter, one that
  moves early looks like it has read the script.
- **press** — a touch of scale on emphasis, so he leans into the line.
- **sway** — a long drift, deliberately out of phase with the nod so it never pulses.
- **breathe** — a very slow vertical squash that never stops, so he is alive in the silences.

**Aperture thresholds are 0.12 / 0.45 / 0.85 and deliberately uneven.** An even split put
the widest mouth on 24% of frames. A face that gapes a quarter of the time is gurning,
not talking — real speech lives mid-range and only flies open on a stressed vowel. These
land it at ~11%.

---

## What failed, and why — read this before changing the approach

**Six attempts at compositing a mouth ONTO a fixed face were all rejected.** The root
cause never changed: *a pasted shape does not belong to the drawing under it.* Tuning
never fixes that. The failures are worth keeping because each one names a real trap:

| Attempt | What went wrong |
|---|---|
| Ellipse drawn in code | placeholder; proved the TIMING, never meant to ship |
| Blank mouth patch on the head | 189×89px of bare skin walled in by beard = a **muzzle** at rest, 34% of the runtime. No overlay can rescue a bare patch. |
| Round mouths (1.3:1) | a round dark hole on a bearded face is a muzzle |
| Rectangular mouths (4.5:1) | a **letterbox**. Asking for "flat, not round" gets you a box. |
| Lens mouths | right shape, but the black outline vanished into the black beard — **a hole punched in his face** |
| Uniform dilated lip ring | a symmetric donut reads as a border drawn around a hole |
| Asymmetric tapered lower lip | closest compositing got. Still pasted-on. |

**Three mouth-auto-detectors were also binned** — enclosed-skin-blob found his forehead
and both hands, eye-pair drowned in the flood fill's white speckle, and row-scanning for
a band walled in by dark found his **neck**, between beard and collar.

**The lesson:** generate the mouth as part of the face, and spend the effort on
**registration** instead.

That lesson was right and still is — but the first version of it drew the wrong conclusion
about *what* to register on. It anchored the four heads on their **eyes**, on the theory
that eyes are the one feature guaranteed not to move. Measurement killed that: the
eyes-and-glasses band turned out to be the LARGEST disagreement in the set, larger than the
mouth region itself. The anchor was measuring a moving target. See **The window pass** —
what actually gets optimised now is the seam around the graft, because that is the only
place a mismatch can show.

### Two smaller traps, both real

- **Yellow sealed inside an outline is not background.** A border flood fill can never
  reach it, so a half-open mouth rendered as a glowing yellow slot in his beard — and, for
  a year longer than anyone noticed, a yellow slab between his legs in all five body
  poses. Both fixed; see **Two matte bugs** above.
- **Never colour-key the yellow.** His skin sits close enough in hue that a key punches
  holes through his face. Always flood-fill inward from the border.

---

## Standing limits

- **Wide shots need no mouth.** At full-body size it is a handful of pixels. Lip sync is a
  close-up device — the reference channels do the same.
- **Cutouts cannot be re-posed.** A new pose is a new generated image.
- **Front-facing only.** A three-quarter head needs its own set.
- **Amplitude picks an APERTURE, not a phoneme.** Loudness cannot tell an "oo" from an
  "ee" — both can be loud or quiet. Rhubarb Lip Sync (free) is the upgrade path if that
  ever matters; it needs nine drawn mouths.
- **Do not hold one face for 12 seconds.** `RigTest` is the worst case for a talking head
  on purpose — a single locked shot. In a real reel the face shares the runtime with
  wides and scene images.
- **Never type an aspect ratio into a component.** Both prep scripts emit
  `src/rig.heads.json` / `src/rig.bodies.json`; the scenes read them. A hand-typed fraction
  goes stale the moment a sheet is recut, and it does not throw — it silently stretches
  his face.
- **Sit the cutout's bottom edge off-frame.** A head cutout ends in a straight cut across
  the chest. Framed with that cut visible he is a bust floating over a hard horizontal
  line, which reads as a sticker. Both scenes use a negative `bottom` for this, with enough
  margin that the nod and boil cannot expose it.

---

## What is left

1. **The blink head.** One generation. Everything downstream is built and tested — see the
   blink prompt above. This is the only remaining item that needs him rather than code.
2. **The plate.** The demo room is a retired Joke Lab background cropped to hide its baked
   headline, JOKE LAB stamp still in the corner. Rooms with nobody in them is the last
   asset job, and it is worth doing against a real script rather than as a test.

Cleared 22 Aug: the shimmer (window pass), the yellow slab and edge cast (matte fixes),
shoulder wobble (the shoulders are head 0's in every frame now, so there is nothing left to
wobble), the dead mouth-overlay path (deleted from `Puppet.tsx`, and `PuppetScene`'s
close-up moved off it onto the head set), and the hand-typed aspect ratios.

---

## The honest caveat

The style this imitates works because those characters are **flat and simple** — a swapped
element is invisible because there is nothing around it to disagree with. This mascot is
rendered and shaded, so anything pasted competes with the art around it.

The window pass is what finally sidestepped that, and it is worth naming why it works when
six compositing attempts did not: the grafted region is **not a shape, it is a piece of the
same drawing**, and it is joined along a seam that was explicitly optimised to vanish.
Whole-head swapping had the first property but not the second, which is why it shimmered.

If the talking close-up ever stops being worth the trouble, the fallback is: **puppet in
wide shots only** (pose cuts, no mouth) intercut with static generated images for the
close-ups. `PuppetScene` already does the wide half.
