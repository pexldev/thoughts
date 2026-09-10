import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Seven poses cut from brand_artefacts/mascot_character_sheet.png by
 * scripts/extract-mascot.js. Re-run that script if the sheet is ever redrawn.
 *
 * Not included: the three small alternate poses (walking / sitting on floor /
 * sitting on chair). They live on the sheet at ~100px wide, so anything past a
 * background-scale placement turns to mush — the exact failure the thumbnail
 * legibility rule warns about. Regenerate those at full size before using them.
 */
export type Pose =
  | "standing"
  | "bust"
  | "chin"
  | "mug"
  | "lookaway"
  | "bust_yellow"
  | "bust_thumb";

/**
 * Source aspect (w/h) per pose. `bust` is a wide head-and-shoulders crop, so
 * sizing it by height alone throws it well past the 1080 frame — these let the
 * component clamp before that happens.
 */
// Printed by scripts/extract-mascot.js — paste the map it emits after any
// re-extract, since trimming changes these.
const ASPECT: Record<Pose, number> = {
  standing: 212 / 804,
  bust: 225 / 257,
  chin: 144 / 184,
  mug: 146 / 189,
  lookaway: 135 / 186,
  bust_yellow: 132 / 217,
  bust_thumb: 158 / 224,
};

export const Mascot: React.FC<{
  pose?: Pose;
  /** height in px; width follows the source aspect, clamped to the frame */
  height: number;
  x?: number | string;
  y?: number | string;
  flip?: boolean;
  /**
   * The "character boil" — a slow drift so he reads as drawn rather than
   * pasted. This is most of the difference between an okay animation and a
   * good one. Set 0 for a locked-off hero frame.
   */
  boil?: number;
  /** widest the pose may get, as a fraction of frame width */
  maxWidthRatio?: number;
}> = ({
  pose = "standing",
  height,
  x = "50%",
  y,
  flip = false,
  boil = 1,
  maxWidthRatio = 0.98,
}) => {
  const frame = useCurrentFrame();
  const { width: frameWidth } = useVideoConfig();

  const bx = Math.sin(frame / 34) * 2.4 * boil;
  const by = Math.cos(frame / 27) * 3.0 * boil;
  const brot = Math.sin(frame / 41) * 0.35 * boil;

  // clamp by width so a wide crop can't silently run off both edges
  const maxW = frameWidth * maxWidthRatio;
  const naturalW = height * ASPECT[pose];
  const drawH = naturalW > maxW ? maxW / ASPECT[pose] : height;

  return (
    <Img
      src={staticFile(`mascot/${pose}.png`)}
      style={{
        position: "absolute",
        height: drawH,
        left: x,
        ...(y === undefined ? { bottom: 0 } : { top: y }),
        transform: `translateX(-50%) translate(${bx}px, ${by}px) rotate(${brot}deg) scaleX(${
          flip ? -1 : 1
        })`,
        transformOrigin: "50% 100%",
        imageRendering: "auto",
      }}
    />
  );
};

/**
 * Flat black ground + skyline. The environment in this world is silhouettes
 * only — the mascot is the single rendered element.
 */
export const Skyline: React.FC<{ height?: number; drift?: number }> = ({
  height = 620,
  drift = 1,
}) => {
  const frame = useCurrentFrame();
  const dx = interpolate(frame, [0, 300], [0, -26 * drift]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: -40,
        width: "calc(100% + 80px)",
        height,
        backgroundColor: "#000",
        transform: `translateX(${dx}px)`,
        clipPath:
          "polygon(0% 46%, 9% 46%, 9% 22%, 22% 22%, 22% 52%, 34% 52%, 34% 12%, 47% 12%, 47% 40%, 60% 40%, 60% 26%, 72% 26%, 72% 56%, 85% 56%, 85% 30%, 100% 30%, 100% 100%, 0% 100%)",
      }}
    />
  );
};
