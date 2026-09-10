import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

/**
 * The pass that separates "a picture with text on it" from "a frame".
 * Scanlines + grain + vignette + a one-pixel gate weave so the image is
 * never perfectly still. Sits on top of everything else in a scene.
 */
export const FilmTreatment: React.FC<{
  /** 0 = off, 1 = the full look. Dial down for text-only cards. */
  intensity?: number;
}> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();

  // gate weave — sub-pixel drift, invisible on a still, alive in motion
  const wx = (random(`gw-x-${frame}`) - 0.5) * 2.2 * intensity;
  const wy = (random(`gw-y-${frame}`) - 0.5) * 2.2 * intensity;

  return (
    <AbsoluteFill style={{ transform: `translate(${wx}px, ${wy}px)`, pointerEvents: "none" }}>
      {/* scanlines: 1.6px black line at 16%, per the reference look */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1.6px, transparent 1.6px, transparent 4px)",
          mixBlendMode: "multiply",
          // Kept very low on purpose. The brand colour IS the identity here,
          // and #F2FF00 shows every point of multiply as a slide toward olive.
          // Measured, not guessed: at 0.18 the field rendered #CDD900.
          opacity: 0.06 * intensity,
        }}
      />

      {/* grain, reseeded every frame so it boils instead of sitting there */}
      <AbsoluteFill
        style={{
          opacity: 0.05 * intensity,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${
              frame % 12
            }"/></filter><rect width="220" height="220" filter="url(%23n)"/></svg>`
          )}")`,
          backgroundSize: "220px 220px",
        }}
      />

      {/*
        Vignette. This was the main thing dirtying the yellow — at 0.16 the
        corners measured #C0CB04 against a #F2FF00 target. It stays this faint
        on yellow scenes; the CTA card can afford far more because black hides
        it completely.
      */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 68%, rgba(0,0,0,0.05) 100%)",
          opacity: intensity,
        }}
      />
    </AbsoluteFill>
  );
};
