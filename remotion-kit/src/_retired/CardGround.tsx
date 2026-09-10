import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BLACK } from "../brand";
import { BAR_BOTTOM } from "./CaptionBar";

/**
 * The black ground behind an emphasis card — and the transition into it.
 *
 * ── The problem ──
 *
 * The caption bar and the full-frame card were two unrelated objects that
 * happened to share a colour. The plate would be up with a bar across the
 * furniture, then on one frame the entire screen was black. Nothing connected
 * them, so it read as a glitch rather than as an edit.
 *
 * ── The transition ──
 *
 * They share a colour because THEY ARE THE SAME OBJECT. The card is the caption
 * bar, opened out until it fills the frame. So the ground is a BAND: full width
 * from the first frame, starting at exactly the bar's height, growing up and
 * down to the edges over seven frames and closing back over five.
 *
 * Full width is the part that matters. The first version animated all four
 * sides in from the bar's actual box, which is more literally correct and looks
 * worse — a black rectangle floating in the middle of the plate with four hard
 * corners, reading as a box appearing rather than as a band opening. Growing
 * only vertically keeps it a band the whole way, and a band is what the bar is.
 *
 * That is why the run starts EARLY (see groupRuns): the six frames of opening
 * happen BEFORE the first word, so the word still lands on the exact frame he
 * says it. Delaying the word to make room for the animation would desync the
 * one thing in this composition that must not drift.
 *
 * It is a wipe, not a move — nothing shakes, nothing slides. That distinction
 * matters here: three separate motion ideas have already been rejected on this
 * composition for being too busy.
 */

export const EXPAND = 7;
export const COLLAPSE = 5;

export const CardGround: React.FC<{
  durationInFrames: number;
  /** defaults to CaptionBar's own floor — they must agree or the card opens from the wrong place */
  barBottom?: number;
  barHeight?: number;
}> = ({ durationInFrames, barBottom = BAR_BOTTOM, barHeight = 150 }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  // 0 = exactly the bar, 1 = the whole frame
  const open = interpolate(frame, [0, EXPAND], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    // Nearly linear, on purpose. An ease-out spends most of a seven-frame wipe
    // already open — 95% covered by frame three — so the growth is over before
    // the eye registers it and it reads as a hard cut with a stutter. A wipe
    // wants even speed.
    easing: Easing.inOut(Easing.quad),
  });
  const shut = interpolate(
    frame,
    [durationInFrames - COLLAPSE, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
  );
  const t = Math.min(open, shut);

  const barTop = height * (1 - barBottom) - barHeight;
  const barBottomPx = height * barBottom;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          backgroundColor: BLACK,
          top: interpolate(t, [0, 1], [barTop, 0]),
          bottom: interpolate(t, [0, 1], [barBottomPx, 0]),
          left: 0,
          right: 0,
        }}
      />
    </AbsoluteFill>
  );
};
