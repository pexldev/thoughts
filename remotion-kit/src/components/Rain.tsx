import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Rain that actually falls.
 *
 * The generated frames have rain PAINTED ON — permanent diagonal hatching that
 * never moves. This layer sits on top and adds real motion in the same
 * language: black strokes on yellow, matched to the drawn angle so the two
 * read as one weather system rather than a filter over a drawing.
 *
 * Everything is seeded from the streak index, so a given frame always renders
 * identically — required for Remotion's frame-independent rendering.
 */
export const Rain: React.FC<{
  /** number of streaks; 90–140 reads as heavy without turning to soup */
  count?: number;
  /** degrees off vertical, matched to the drawn hatching */
  angle?: number;
  /** frames for a streak to cross the frame — lower is harder rain */
  fallFrames?: number;
  opacity?: number;
}> = ({ count = 110, angle = 14, fallFrames = 26, opacity = 0.55 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // travel further than the frame so streaks enter and leave off-screen
  const travel = height + 400;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <g transform={`rotate(${angle} ${width / 2} ${height / 2})`}>
          {new Array(count).fill(0).map((_, i) => {
            const speed = 0.7 + random(`sp-${i}`) * 0.8;
            const len = 40 + random(`len-${i}`) * 90;
            const thickness = 1.4 + random(`th-${i}`) * 2.2;
            const alpha = (0.35 + random(`al-${i}`) * 0.65) * opacity;

            // spread across a band wider than the frame, since we rotated it
            const x = -220 + random(`x-${i}`) * (width + 440);

            // each streak starts at its own offset in the cycle
            const phase = random(`ph-${i}`);
            const progress = (phase + (frame * speed) / fallFrames) % 1;
            const y = -300 + progress * travel;

            return (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={x}
                y2={y + len}
                stroke="#000"
                strokeWidth={thickness}
                strokeLinecap="round"
                opacity={alpha}
              />
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Expanding rings on standing water.
 *
 * Kept to the lower part of the frame, where the puddles are drawn. Rings grow
 * and fade out; each spot restarts on its own cycle so they never pulse in
 * unison.
 */
export const Ripples: React.FC<{
  count?: number;
  /** fraction of frame height above which no ripple appears */
  topLimit?: number;
  cycleFrames?: number;
  opacity?: number;
}> = ({ count = 14, topLimit = 0.72, cycleFrames = 48, opacity = 0.5 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {new Array(count).fill(0).map((_, i) => {
          const cx = random(`rx-${i}`) * width;
          const cy = (topLimit + random(`ry-${i}`) * (1 - topLimit)) * height;

          const phase = random(`rp-${i}`);
          const progress = (phase + frame / cycleFrames) % 1;

          const maxR = 26 + random(`rr-${i}`) * 46;
          const r = progress * maxR;
          const alpha = (1 - progress) * opacity;

          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={r}
              // squashed, because we are looking across a wet floor, not down at it
              ry={r * 0.32}
              fill="none"
              stroke="#000"
              strokeWidth={1.8}
              opacity={alpha}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
