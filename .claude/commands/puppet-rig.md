You are the puppet rig operator for the podcast **I Could Be Wrong** — hosted by Prateek Muralidharan. The rig makes the mascot stand in a generated room and lip-sync to a recorded VO, from one fixed set of drawings.

**STATUS: PARKED. Do not offer this unless he asks for it by name.**

Built 22 Aug 2026. The technical problems were solved; the one reel cut with it was **rejected by him the same day as "very bad."** That verdict stands until he says otherwise. This file exists so the work is recoverable when he wants it, not so it can be pitched back to him.

---

## This is NOT part of /reel-cut

`/reel-cut` takes a VO and a folder of generated scene images and cuts the pictures to the audio. That is the shipping pipeline. **It has never contained any of this and must not.**

Do not import the puppet, lip sync, mouth tracks, pose cuts or mood sets into `/reel-cut`, `/episode-cut`, `/joke-lab-reels` or `/wed-reel-editor`. If a reel job seems like it would benefit from a talking mascot, say so in one line and cut the reel the normal way anyway.

The same rule already exists in `/visuals`, which says plainly: *no lip sync, no talking — camera movements and physical reactions only.*

---

## What it actually is

**A room is a plate. The mascot is a layer on top of it. They are never generated together.**

The payoff is not lip sync, it is character consistency. Generated inside each scene, his beard, glasses and face drift image to image — cut five together and the viewer reads five brothers, not one man in five places. One fixed set of drawings over changing rooms is how a character holds.

Everything runs locally and free: Remotion, ffmpeg, whisper.

---

## Run it

From `remotion-kit/`:

```bash
node scripts/mouth-track.mjs public/audio/<name>.wav <name>   # VO -> mouth-open per frame
python3 scripts/prep-heads.py                                  # heads_4.png -> h0..h3 + mood sets
python3 scripts/prep-heads.py --debug                          # + window boxes, diff maps, mouth-share %
node    scripts/prep-puppet.js                                 # bodies.png -> b0..b4

npx remotion render src/index.ts RigTest     out/rig.mp4       # talking close-up
npx remotion render src/index.ts PuppetScene out/scene.mp4     # pose cuts + talking
npx remotion render src/index.ts Reel2Puppet out/reel2_puppet.mp4   # the rejected demo reel
```

**Never hand-type an aspect ratio.** Both prep scripts emit `src/rig.heads.json` and `src/rig.bodies.json`; the components read them. A stale fraction does not throw, it silently stretches his face.

---

## The honest limits — read these before proposing it for anything

- **Front-facing only.** Every pose looks straight at camera. This is the biggest reason the demo reel lost to the baked-in characters: a purpose-drawn scene can have him turned away looking at the thing he is describing, and the rig cannot. A three-quarter / turned-away body sheet would close most of that gap and needs no code change.
- **Cutouts cannot be re-posed.** A new pose is a new generated image.
- **Wide shots need no mouth.** At full-body size it is a handful of pixels. Lip sync is a close-up device.
- **Amplitude picks an APERTURE, not a phoneme.** Loudness cannot tell an "oo" from an "ee". Rhubarb Lip Sync is the upgrade path; it wants nine drawn mouths.
- **Do not hold one face for 12 seconds.** In a real cut the face shares runtime with wides and scene images.
- **No blink yet.** One generation away — the prompt and the whole downstream path are ready. It is the single biggest liveliness gain available.

---

## Expression

The generated mouth was drawn as a **frown** — flat upper lip, lower lip bulging down, corners at or below centre in all four apertures. He sulked through every runtime regardless of the line. Fixed by a parametric corner-lift warp, baked as five mood sets:

| mood | lift | for |
|---|---|---|
| `grim` | −8 | the line is the joke and he is not enjoying it |
| `asbuilt` | 0 | what the generator drew — recoverable, not recommended |
| **`deadpan`** | **+10** | **a genuinely flat mouth. His pick, 22 Aug. The house default.** |
| `smirk` | +18 | he knows something you do not |
| `smile` | +26 | rare on purpose |

Deadpan means NEUTRAL. That is why `+10` is the default and why it does not violate the standing deadpan rule — a downturned rest face editorialises every line under it, which is the opposite of what deadpan buys.

Every mood is the same four apertures, so a mood is a mask over a whole shot and can never desync the lip track. Past `+26` the moustache reads as pulled rather than lifted.

---

## Where the detail lives

`remotion-kit/PUPPET_RIG.md` is the full record: the window pass, why eye-registration was wrong, the two matte bugs that were invisible on the yellow plate, the six failed mouth-compositing attempts and the three binned auto-detectors. **Read it before changing the approach** — most of the obvious ideas are already in there as failures.
