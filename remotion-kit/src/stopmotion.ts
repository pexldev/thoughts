/**
 * Stop motion, in one idea: QUANTISE TIME.
 *
 * Everything a computer animates moves on every frame — 30 smooth samples a
 * second. Everything a human animates moves in HOLDS: a drawing is photographed
 * two, three, four times before the next one exists. That gap is the whole
 * difference, and the eye reads it instantly as "made by hand" long before it
 * can say why.
 *
 * So none of this needs new artwork. Any value that would have been smooth gets
 * pushed through `held()` first and the same motion comes out looking shot on a
 * table under a lamp.
 *
 *   hold 2 -> 15 fps   busy, still quite smooth
 *   hold 3 -> 10 fps   the default. Reads as animation, not as a stutter.
 *   hold 4 ->  7.5 fps chunky, obviously hand-made, tires the eye over minutes
 *
 * The second half of the illusion is BOIL: real drawings never land in exactly
 * the same place twice, so the line wobbles from photograph to photograph. That
 * is what `boil()` fakes — a new random nudge on every hold, none between.
 */

import { random } from "remotion";

/** The frame this hold began on. Feed it to interpolate/spring instead of `frame`. */
export const held = (frame: number, hold = 3) => Math.floor(frame / hold) * hold;

/** Which photograph we are on — use it to index into a set of drawings. */
export const holdIndex = (frame: number, hold = 3) => Math.floor(frame / hold);

/**
 * Registration wobble. Returns a fresh nudge per hold and NOTHING in between,
 * which is the point — a boil that interpolates is just a slow drift again.
 *
 * ⚠️ BOIL A CUT-OUT. NEVER BOIL THE FRAME.
 *
 * This is not a matter of degree, and it cost two attempts to learn. On a
 * cut-out character — a small element on its own layer over a still background
 * — a couple of pixels of drift is exactly right and reads as hand-drawn. On a
 * FULL-BLEED PLATE the same two pixels move the entire world three times a
 * second, the baked chapter title with it, and leave the eye no still edge to
 * hold on to. It was tried at 2.2px and again at 1.6px on the long-form plates
 * and his verdict the second time was "very very very very bad". The episode
 * composition now has no boil at all.
 *
 * `amount` is in pixels of translation at 1.0; rotation scales with it. Under
 * ~1.5px it reads as a bad encode rather than as drawing.
 */
export function boil(frame: number, seed: string, amount = 2.4, hold = 3) {
  const i = holdIndex(frame, hold);
  return {
    x: (random(`${seed}-x-${i}`) - 0.5) * 2 * amount,
    y: (random(`${seed}-y-${i}`) - 0.5) * 2 * amount,
    rot: (random(`${seed}-r-${i}`) - 0.5) * 2 * amount * 0.14,
    scale: 1 + (random(`${seed}-s-${i}`) - 0.5) * 0.006 * amount,
  };
}

/** Ready-made CSS transform for a boiling layer. */
export const boilTransform = (frame: number, seed: string, amount = 2.4, hold = 3) => {
  const b = boil(frame, seed, amount, hold);
  return `translate(${b.x}px, ${b.y}px) rotate(${b.rot}deg) scale(${b.scale})`;
};

/**
 * Cycles a set of drawings on the hold — the real thing, once he has more than
 * one picture of a scene. Two drawings alternating is already animation; three
 * stops the alternation reading as a blink.
 *
 * Deliberately NOT random: a fixed ping-pong order (0,1,2,1,0,1,2,1…) is how a
 * two-frame cycle is actually shot, and random selection reads as a glitch.
 */
export function cycle<T>(items: readonly T[], frame: number, hold = 4): T {
  if (items.length < 2) return items[0];
  const period = (items.length - 1) * 2;
  const i = holdIndex(frame, hold) % period;
  return items[i < items.length ? i : period - i];
}
