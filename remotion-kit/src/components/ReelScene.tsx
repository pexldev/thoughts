import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { YELLOW } from "../brand";
import { Caption } from "./Caption";
import { FilmTreatment } from "./FilmTreatment";
import { Mascot, Pose, Skyline } from "./Mascot";

/**
 * One beat of a reel: full-bleed yellow, silhouette environment, the mascot,
 * one baked line of text, slow push-in.
 *
 * Build reels a scene at a time and concatenate. Fixing scene 1 inside one
 * giant composition is how scene 6 quietly breaks.
 */
export const ReelScene: React.FC<{
  line: string;
  pose?: Pose;
  mascotHeight?: number;
  captionSize?: number;
  /** how hard the camera pushes in over the scene */
  push?: number;
  skyline?: boolean;
  /**
   * Film grain / scanlines / vignette, 0–1. Defaults OFF.
   *
   * Any of it multiplies the background down: at 1.0 the field measured
   * #CDD900 against a #F2FF00 target, and the brand colour is the identity.
   * Turn it up only on scenes where the texture is worth the shift, and check
   * the corners when you do.
   */
  treatment?: number;
}> = ({
  line,
  pose = "standing",
  mascotHeight = 980,
  captionSize = 118,
  push = 0.1,
  skyline = true,
  treatment = 0,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [1, 1 + push], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW, overflow: "hidden" }}>
      {/* everything in the world pushes together; the caption stays locked */}
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {skyline ? <Skyline /> : null}
        <Mascot pose={pose} height={mascotHeight} />
      </AbsoluteFill>

      <Caption text={line} size={captionSize} />

      {treatment > 0 ? <FilmTreatment intensity={treatment} /> : null}
    </AbsoluteFill>
  );
};
