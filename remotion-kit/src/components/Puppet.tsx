import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * THE PUPPET — the mascot, talking, standing in any picture.
 *
 * Takes ANY cutout on transparency and drops it into ANY plate, which is the
 * whole point: a generated room is a background, the mascot is a layer on top
 * of it, and the two never have to be generated together again.
 *
 * WHY THAT SEPARATION IS THE REAL WIN, BEYOND LIP SYNC
 * When the mascot is generated INSIDE each scene he is a slightly different man
 * every time — the beard changes, the glasses change, the face changes. Cut
 * five of those together and the viewer reads five brothers. A fixed cutout
 * over changing rooms is how every channel in this style holds a character.
 *
 * ------------------------------------------------------------------
 * THE MOUTH IS NOT COMPOSITED. IT IS DRAWN.
 *
 * This component used to carry a second path that pasted a mouth PNG onto a
 * fixed face at a measured anchor. It is gone. Six versions of it were
 * rejected and the root cause never changed: a pasted shape does not belong to
 * the drawing under it. Round mouths read as a muzzle, rectangular ones as a
 * letterbox, lens ones as a hole punched in his face, and a blank mouth patch
 * was a muzzle at rest for a third of the runtime. Three auto-detectors for the
 * anchor were binned too — one found his forehead, one drowned in fill speckle,
 * one found his NECK.
 *
 * What ships instead: `heads`, a set of complete drawings swapped by aperture,
 * built by scripts/prep-heads.py. The mouth is made by the same hand as the
 * face, so there is nothing to paste and no anchor to measure.
 * ------------------------------------------------------------------
 */

export type MouthFrame = { open: number; shape: 0 | 1 | 2 };

/**
 * Amplitude picks an APERTURE, and only an aperture. Loudness cannot tell an
 * "oo" from an "ee" — both can be loud or quiet — so real phoneme shapes would
 * fire at random and read as a twitch. Rhubarb Lip Sync is the upgrade path if
 * that ever matters; it wants nine drawn mouths.
 *
 * Thresholds are deliberately NOT evenly spaced. An even split put the widest
 * mouth on 24% of frames, and a face that gapes a quarter of the time is
 * gurning, not talking — real speech lives in the middle of its range and only
 * flies open on a stressed vowel. These land it at ~11%.
 */
function aperture(open: number): number {
  if (open < 0.12) return 0;
  if (open < 0.45) return 1;
  if (open < 0.85) return 2;
  return 3;
}

/**
 * THE BLINK SCHEDULE.
 *
 * A face that never blinks is a corpse with a hinge — it is the single biggest
 * liveliness gain in the rig, and it costs one drawing.
 *
 * Deliberately NOT random per render: a seeded LCG, so the same composition
 * blinks on the same frames every time. A blink that moves between renders
 * makes two versions of a cut impossible to compare, and re-rendering a reel to
 * fix a caption should not resettle his face.
 *
 * Numbers are from life, not taste: a blink lasts ~100-150ms (3-4 frames at 30)
 * and people blink every 2-6 seconds, more often while speaking. Evenly spaced
 * blinks read as a metronome, so the gap is jittered across that whole range.
 */
function blinkSchedule(total: number, seed = 7): boolean[] {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out = new Array<boolean>(total).fill(false);
  let t = Math.floor(rnd() * 45);
  while (t < total) {
    const dur = 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < dur && t + k < total; k++) out[t + k] = true;
    t += dur + 60 + Math.floor(rnd() * 120);
  }
  return out;
}

export const Puppet: React.FC<{
  /** any PNG on transparency, under public/ */
  src: string;
  /**
   * The talking set — four complete drawings, one per mouth position, chosen by
   * aperture. `src` is ignored when this is given.
   *
   * Pass `heads` from src/rig.heads.json rather than listing paths by hand, and
   * take `aspect` from the same file: a hand-typed aspect goes stale on the
   * next recut and does not throw, it just quietly stretches his face.
   */
  heads?: string[];
  /**
   * The same four apertures again, with his eyes SHUT — built by prep-heads.py
   * when assets/incoming/head_blink.png exists. Blink is crossed with mouth
   * rather than replacing it, so he can blink mid-word instead of only in the
   * gaps. Omit it (or pass an empty array) and he simply never blinks.
   */
  blink?: string[];
  track?: MouthFrame[];
  /** shifts the track — use when the puppet enters partway through a scene */
  trackOffset?: number;
  /** height in px within the frame; width follows the source aspect */
  height: number;
  aspect: number;
  x?: string;
  /** distance from the BOTTOM of the frame — puppets stand on a floor */
  bottom?: number;
  flip?: boolean;
  boil?: number;
  /**
   * THE STOP-MOTION TELL. Body motion is quantised to this many steps per
   * second while the audio and the mouth stay at 30. Smooth drift reads as a
   * cutout sliding on glass; motion that lands on discrete steps reads as a
   * thing being physically re-placed between exposures. 8-12 is the range.
   * Set 0 for smooth.
   */
  stepFps?: number;
  /**
   * PERFORMANCE — how much the head acts, 0 to ~1.5.
   *
   * A head that only opens its mouth is a corpse with a hinge. Real puppet work
   * moves the WHOLE head on the speech and the mouth is the smallest part of
   * it. This drives four things off the same amplitude track the mouth uses:
   *
   *   nod      — the chin drops INTO a loud syllable and recovers after it,
   *              lagged a few frames so it trails the sound rather than
   *              anticipating it
   *   press    — a touch of scale on emphasis, so he leans into the line
   *   sway     — a long slow drift, several seconds per cycle, that never
   *              repeats in phase with the nod
   *   breathe  — a very slow vertical squash, always running, so he is alive
   *              in the silences too
   *
   * Set 0 for a locked-off hero frame.
   */
  perform?: number;
}> = ({
  src,
  heads,
  blink,
  track,
  trackOffset = 0,
  height,
  aspect,
  x = "50%",
  bottom = 0,
  flip = false,
  boil = 1,
  stepFps = 10,
  perform = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const open = track?.[frame + trackOffset]?.open ?? 0;

  const blinks = React.useMemo(
    () => (blink?.length ? blinkSchedule(durationInFrames) : null),
    [blink?.length, durationInFrames]
  );
  const shut = blinks?.[frame + trackOffset] ?? false;

  // The mouth reads every frame; the body only moves on the step. Quantising
  // both would drag the sync visibly late on fast words.
  const step = stepFps > 0 ? Math.floor(frame / (30 / stepFps)) * (30 / stepFps) : frame;

  const bx = Math.sin(step / 34) * 2.4 * boil;
  const by = Math.cos(step / 27) * 3.0 * boil;
  const brot = Math.sin(step / 41) * 0.35 * boil;

  /**
   * The nod trails the sound. Averaging the few frames BEFORE this one is what
   * makes it read as a reaction — a head that moves exactly on the sample looks
   * like a meter, and one that moves early looks like it knows the script.
   */
  const lagged = (() => {
    if (!track) return 0;
    let sum = 0, n = 0;
    for (let k = 3; k <= 7; k++) {
      const v = track[frame + trackOffset - k];
      if (v) { sum += v.open; n++; }
    }
    return n ? sum / n : 0;
  })();

  const nod = lagged * 9 * perform;
  const press = 1 + lagged * 0.014 * perform;
  const swayX = Math.sin(frame / 71) * 7 * perform;
  const swayRot = Math.sin(frame / 97 + 1.2) * 1.1 * perform;
  const breathe = 1 + Math.sin(frame / 46) * 0.006 * perform;

  return (
    <div
      style={{
        position: "absolute",
        width: height * aspect,
        height,
        left: x,
        bottom,
        transform: `translateX(-50%) translate(${bx + swayX}px, ${by + nod}px) rotate(${
          brot + swayRot
        }deg) scale(${press}, ${press * breathe}) scaleX(${flip ? -1 : 1})`,
        transformOrigin: "50% 100%",
      }}
    >
      <Img
        src={staticFile(
          heads ? (shut && blink ? blink : heads)[aperture(open)] : src
        )}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
    </div>
  );
};
