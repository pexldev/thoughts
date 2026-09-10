import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import hits from "../timing/reel2.hits.json";

type Hit = { frame: number; strength: number };

/**
 * Extra scale from the score's own accents.
 *
 * The hits come from scripts/transients.js, which reads the scored track, so a
 * punch lands on something the music is actually playing. Each hit spikes and
 * decays over a few frames; strength scales how hard.
 *
 * Returns a SMALL number — the shot scales in Reel2Images top out below 1 so
 * this has headroom to add without cropping the baked headline.
 */
export function usePunch(opts?: { minStrength?: number; amount?: number; decay?: number }) {
  const frame = useCurrentFrame();
  const { minStrength = 0.45, amount = 0.03, decay = 5 } = opts ?? {};

  let total = 0;
  for (const h of hits as Hit[]) {
    if (h.strength < minStrength) continue;
    const age = frame - h.frame;
    if (age < 0 || age > decay) continue;
    total += amount * h.strength * (1 - age / decay);
  }
  return total;
}

/**
 * Flips the frame to its negative for a few frames.
 *
 * This is the brand's own bang: the world is acid yellow and the end card is
 * black, so the inverse of any frame is already in the palette. Used sparingly
 * — the open and the punchline — it reads as a signature rather than an effect.
 */
export const InvertFlash: React.FC<{
  /** frames (composition-local) at which a flash fires */
  at: number[];
  /** how many frames each flash lasts */
  length?: number;
}> = ({ at, length = 3 }) => {
  const frame = useCurrentFrame();
  const active = at.some((f) => frame >= f && frame < f + length);
  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        backdropFilter: "invert(1)",
        WebkitBackdropFilter: "invert(1)",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * The opening pop.
 *
 * Deliberately arrives SMALL and springs up, rather than the usual slam that
 * arrives oversized and snaps down. An oversized first frame would crop the
 * headline exactly when the viewer is trying to read it — and on this channel
 * frame one has to be legible before it can be exciting.
 */
export function useSlam(durationInFrames = 10) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame,
    fps,
    config: { damping: 9, mass: 0.6, stiffness: 190 },
    durationInFrames,
  });
  return interpolate(s, [0, 1], [0.74, 1]);
}
