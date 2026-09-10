import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, OFF_WHITE, YELLOW, censor } from "../brand";
import { chunkWords, type CaptionWord } from "./CaptionBar";

const { fontFamily } = loadFont();

/**
 * THE TEXT PAGE — his words, accumulating, owning the whole frame.
 *
 * ── What this replaces, and why ──
 *
 * The caption bar put text ON the artwork. That is text interrupting art, not
 * text talking: it can only ever caption the picture it is sitting on. His note
 * on the reference — "somehow over here even text is doing a lot of talking" —
 * is about text that has the frame to itself and composes in it.
 *
 * So the episode now alternates. Art gets the frame, clean, with nothing on it.
 * Then text gets the frame, with no art under it. Neither carries the other.
 *
 * That also, almost by accident, solves the problem that defeated three
 * rebuilds this morning: A CROP OF A PICTURE IS NOT A CUT, and with nine plates
 * there was no second subject to cut to. The text page IS the second subject.
 * Cutting page → plate is a real cut and costs no new artwork.
 *
 * ── The mechanics ──
 *
 * ONE SENTENCE IS ONE STACK. Phrases of three or four words accumulate down the
 * page as he says them, and the page CLEARS at the end of the sentence. Tying
 * it to sentences rather than a timer means the rhythm comes from his writing.
 * A stack that merely grows for twenty seconds is a wall.
 *
 * Phrases alternate flush-left and flush-right. The reference drifts them
 * diagonally in soft rounded lowercase; this is Anton all-caps on hard black
 * slabs, which is the emphasis card multiplied rather than a borrowed look.
 *
 * The block stays vertically centred as it grows, so earlier phrases ride
 * upward when a new one lands — the whole composition moves, not just the new
 * line.
 *
 * Everything else carries over from the bar, unchanged and non-negotiable:
 * NO FADE (absent on frame N, complete on N+1 — the arrival IS the event), the
 * LIVE WORD INVERTS to yellow rather than tinting, a word not yet said is
 * hidden rather than greyed, and a word already said recedes to 30%.
 */

export type Sentence = {
  from: number;
  to: number;
  emphasis?: boolean;
  startFrame: number;
  endFrame: number;
};

/**
 * Higher than the caption bar's 0.3, and it has to be.
 *
 * On the bar, a receded word sat over artwork and 30% was right — the picture
 * was carrying the frame. Here the page IS the content: off-white at 30% on a
 * BLACK slab goes to dark grey on black and the sentence stops being readable.
 * The live word still dominates completely, because it inverts to a yellow
 * slab rather than merely brightening.
 */
const SPENT_OPACITY = 0.55;

export const PhraseStack: React.FC<{
  /** the whole caption track; sentences index into it */
  words: readonly CaptionWord[];
  sentences: readonly Sentence[];
  size?: number;
  /**
   * The beat's absolute start. Everything in the page plan and the caption
   * track is timed against the whole episode, but this component lives inside a
   * <Sequence>, where useCurrentFrame() restarts at zero — so without this the
   * comparisons are absolute-vs-local and nothing ever appears.
   */
  offset?: number;
  /** words per phrase — comes from the episode's tempo, not a constant here */
  phraseWords?: number;
}> = ({ words, sentences, size = 94, offset = 0, phraseWords = 4 }) => {
  const local = useCurrentFrame();
  const frame = local + offset;
  const { fps } = useVideoConfig();

  // The stack on screen is the LAST sentence to have started, so the page holds
  // through the pause after its final word instead of blanking.
  let active: Sentence | undefined;
  for (const s of sentences) if (frame >= s.startFrame) active = s;
  if (!active) return null;

  const mine = words.slice(active.from, active.to);
  const phrases = chunkWords(mine, phraseWords);
  const type = active.emphasis ? size * 1.42 : size;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "stretch",
        padding: "0 7%",
        gap: `${Math.round(type * 0.12)}px`,
        flexDirection: "column",
      }}
    >
      {phrases.map((p, pi) => {
        const first = mine[p.from];
        if (frame < first.startFrame) return null;

        // Alternating sides, not a diagonal drift. Left, right, left — the
        // composition zig-zags down the page and stays anchored to the margins
        // instead of wandering off one corner of the frame.
        const right = pi % 2 === 1;

        return (
          <div
            key={pi}
            style={{
              display: "flex",
              justifyContent: right ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                backgroundColor: BLACK,
                padding: "0.12em 0.24em",
                display: "flex",
                gap: "0 0.26em",
                fontFamily,
                fontSize: type,
                lineHeight: 1.0,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {mine.slice(p.from, p.to).map((w, i) => {
                const t = frame - w.startFrame;
                const s = spring({
                  frame: t,
                  fps,
                  config: { damping: 14, stiffness: 300, mass: 0.42 },
                  durationInFrames: 14,
                });
                const scale = t < 0 ? 1 : 1.14 - s * 0.14;
                const live = frame >= w.startFrame && frame <= w.endFrame;
                return (
                  <span
                    key={`${w.startFrame}-${i}`}
                    style={{
                      display: "inline-block",
                      visibility: t < 0 ? "hidden" : "visible",
                      opacity: live ? 1 : SPENT_OPACITY,
                      transform: `scale(${scale})`,
                      transformOrigin: "50% 60%",
                      color: live ? BLACK : OFF_WHITE,
                      backgroundColor: live ? YELLOW : "transparent",
                      padding: "0 0.1em",
                    }}
                  >
                    {censor(w.text)}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
