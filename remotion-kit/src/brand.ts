/**
 * Locked brand tokens. Change here, never inline in a component.
 * Sources: memory (episode visual style, end card spec, profanity rule)
 * and joke-lab/fixed_assets.md.
 */

export const YELLOW = "#F2FF00";
export const BLACK = "#000000";

export const REEL = { width: 1080, height: 1920, fps: 30 } as const;

/**
 * Instagram's caption block, audio ticker and action buttons cover roughly
 * the bottom 15% and the right edge of a reel. Nothing that has to be READ
 * goes outside this box.
 */
export const SAFE = { top: 0.1, bottom: 0.18, side: 0.08 } as const;

/** Locked copy for the CTA end card. Do not edit without editing fixed_assets.md. */
export const CTA_COPY = {
  instruction: ["FULL JOKE LAB", "EPISODE ON YOUTUBE"],
  channel: ["I", "COULD BE", "WRONG"],
} as const;

/**
 * All on-screen text censors profanity — VO and script stay uncensored.
 * Applied automatically by <Caption/>, so a script line can be pasted as-is.
 */
export function censor(text: string): string {
  // Stem -> masked stem. Any suffix on the word is kept, so "fucking" reads
  // "F**king" and "fucked" reads "F**ked" without needing its own rule.
  const stems: Array<[string, string]> = [
    ["fuck", "F**k"],
    ["shit", "S**t"],
    ["bitch", "B**ch"],
    ["asshole", "A**hole"],
    ["bastard", "B**tard"],
    ["dick", "D**k"],
    ["cunt", "C**t"],
  ];

  return stems.reduce(
    (acc, [stem, masked]) =>
      acc.replace(new RegExp(`\\b${stem}(\\w*)`, "gi"), (_m, suffix) => masked + suffix),
    text
  );
}

/* ------------------------------------------------------------------ *
 * THE COLOUR SYSTEM — canonical card: prep/color_system.md (21 Aug 2026)
 *
 * Acid yellow is the SIGNATURE, not the wallpaper. It must be in every
 * frame and must be the brightest thing in every frame — but a frame that
 * is only yellow-and-black reads as one shape at feed size, and one shape
 * gives the eye nothing to do while the audio works.
 *
 * Five slots, hard cap of six colours on screen:
 *   1 acid yellow (mandatory, ~20% minimum, always brightest)
 *   2 black (outlines + heaviest shapes)
 *   3 ONE scene colour, from SCENE_COLOURS below. Never two.
 *   4 skin + up to 2 clothing colours
 *   5 optional off-white, to stop the frame going muddy
 * ------------------------------------------------------------------ */

export const OFF_WHITE = "#F7F3E8";

/** Picked by MOOD, not realism. Each sits deeper than the yellow on purpose. */
export const SCENE_COLOURS = {
  nightTeal: "#17494D", // night, bedroom, alone, 6 AM, insomnia
  deepIndigo: "#23305E", // dreams, spirals, the inside of his head
  rust: "#C0451F", // heat, anger, an argument, a street at 2 PM
  plum: "#5B2A4E", // embarrassment, shame, romance, the cringe memory
  sarkariGreen: "#3F6B4F", // offices, waiting rooms, queues, institutions
  chaiBrown: "#7A4B2A", // tea stalls, old furniture, the parents' house
} as const;

export type SceneColour = keyof typeof SCENE_COLOURS;

/**
 * How yellow enters the frame. One per reel; long-form may switch at a
 * chapter break, never mid-scene.
 *
 *   world — yellow fills the background, scene colour is the furniture
 *   frame — coloured environment, yellow as hard strips top and bottom
 *   hero  — dark world, one object blazing yellow
 *
 * "frame" is the best performer. If a scene feels flat it is usually
 * "world" when it should have been "frame".
 */
export type YellowAnchor = "world" | "frame" | "hero";
