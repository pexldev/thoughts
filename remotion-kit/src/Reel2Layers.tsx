import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { YELLOW } from "./brand";
import { CTACard } from "./components/CTACard";
import { useSlam } from "./components/Impact";
import { Rain, Ripples } from "./components/Rain";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import beats from "./timing/reel2.beats.json";
import words from "./timing/reel2.words.json";

/**
 * "Shooting in the dark" — reel 2, LAYERED.
 *
 * The flat version (Reel2Images) pushes one welded picture. This one splits
 * every scene into a background plate and an isolated character, so they can
 * move at different speeds. That difference is parallax, and it is most of
 * what separates a slideshow from something that feels shot.
 *
 * Timing is identical to the flat cut — same beats, same holds, same VO.
 */

type Scene = "street" | "basement" | "dicky" | "sayyes" | "congrats";

type Shot = {
  scene: Scene;
  /** background scale, start -> end. Slower than the character's. */
  bgFrom: number;
  bgTo: number;
  /** character scale, start -> end. Faster, so he separates from the plate. */
  chFrom: number;
  chTo: number;
  /** character height in px at scale 1 */
  height: number;
  /** horizontal centre of the character, as a fraction of frame width */
  x: number;
  /** px above the bottom of the frame where his feet sit */
  ground: number;
  /** px he drifts horizontally across the shot */
  driftX?: number;
  rain?: boolean;
  ripples?: boolean;
};

/**
 * Nothing scales above 1.0 — the plates carry the baked headline edge to edge,
 * so any zoom past a perfect fit crops the words. Both planes start small and
 * grow in; the character just grows FASTER, which is what reads as depth.
 */
const SHOTS: Shot[] = [
  // 1 · best friend Tony
  { scene: "street", bgFrom: 0.9, bgTo: 0.93, chFrom: 0.86, chTo: 0.95, height: 1180, x: 0.22, ground: 40, driftX: 8, rain: true, ripples: true },
  // 2 · pouring rain, the SUV
  { scene: "street", bgFrom: 0.93, bgTo: 0.96, chFrom: 0.95, chTo: 1.06, height: 1180, x: 0.22, ground: 40, driftX: 14, rain: true, ripples: true },
  // 3 · she calls me to hop in
  { scene: "street", bgFrom: 0.96, bgTo: 0.97, chFrom: 1.06, chTo: 1.12, height: 1180, x: 0.24, ground: 40, rain: true, ripples: true },
  // 4 · drives us to the basement
  { scene: "basement", bgFrom: 0.89, bgTo: 0.96, chFrom: 0.86, chTo: 1.0, height: 1120, x: 0.76, ground: 120, driftX: -10, ripples: true },
  // 5 · the decoration, the garland
  { scene: "dicky", bgFrom: 0.89, bgTo: 0.94, chFrom: 0.86, chTo: 0.98, height: 1150, x: 0.2, ground: 90, rain: true, ripples: true },
  // 6 · Tony knew everything   <- the stale-headline beat
  { scene: "dicky", bgFrom: 0.94, bgTo: 0.97, chFrom: 0.98, chTo: 1.08, height: 1150, x: 0.2, ground: 90, driftX: 10, rain: true, ripples: true },
  // 7 · are you going to say yes
  { scene: "sayyes", bgFrom: 0.9, bgTo: 0.94, chFrom: 0.88, chTo: 1.0, height: 1180, x: 0.2, ground: 70, ripples: true },
  // 8 · she said yes — the hold
  { scene: "sayyes", bgFrom: 0.94, bgTo: 0.96, chFrom: 1.0, chTo: 1.1, height: 1180, x: 0.2, ground: 70, ripples: true },
  // 9 · congratulations guys
  { scene: "congrats", bgFrom: 0.89, bgTo: 0.96, chFrom: 0.86, chTo: 1.02, height: 1150, x: 0.78, ground: 90 },
];

const FLASH_BEATS = [0, 7, 8];

const Beat: React.FC<{
  shot: Shot;
  durationInFrames: number;
  beatIndex: number;
  offset: number;
}> = ({ shot, durationInFrames, beatIndex, offset }) => {
  const frame = useCurrentFrame();
  const t = (a: number, b: number) =>
    interpolate(frame, [0, durationInFrames], [a, b], { extrapolateRight: "clamp" });

  const slam = useSlam(11);
  const isFirst = beatIndex === 0;

  const bgScale = (isFirst ? slam : 1) * t(shot.bgFrom, shot.bgTo);
  const chScale = (isFirst ? slam : 1) * t(shot.chFrom, shot.chTo);
  const dx = t(0, shot.driftX ?? 0);

  const flashing = FLASH_BEATS.includes(beatIndex) && frame < 3;
  const suffix = flashing ? "_flip" : "";

  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.beat === beatIndex)
    .map((w) => ({ ...w, startFrame: w.startFrame - offset, endFrame: w.endFrame - offset }));

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW, overflow: "hidden" }}>
      {/* plane 1 — the world */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={staticFile(`layers/reel2/${shot.scene}_bg${suffix}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${bgScale})`,
          }}
        />
      </AbsoluteFill>

      {/* weather falls between the world and the man */}
      {shot.ripples ? <Ripples /> : null}

      {/* plane 2 — the man */}
      <Img
        src={staticFile(`layers/reel2/${shot.scene}_char${suffix}.png`)}
        style={{
          position: "absolute",
          height: shot.height,
          left: `${shot.x * 100}%`,
          bottom: shot.ground,
          transform: `translateX(-50%) translateX(${dx}px) scale(${chScale})`,
          transformOrigin: "50% 100%",
        }}
      />

      {/* rain falls in front of everything except the words */}
      {shot.rain ? <Rain /> : null}

      <SyncedCaption words={mine} size={58} chunk={4} top="66%" plate />
    </AbsoluteFill>
  );
};

export const Reel2Layers: React.FC = () => {
  const last = beats[beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW }}>
      <Audio src={staticFile("audio/reel2.wav")} />

      {beats.map((b, i) => {
        const next = beats[i + 1];
        const end = next ? next.startFrame : last.endFrame;
        return (
          <Sequence key={i} from={b.startFrame} durationInFrames={end - b.startFrame} name={`${i + 1} ${SHOTS[i].scene}`}>
            <Beat shot={SHOTS[i]} durationInFrames={end - b.startFrame} beatIndex={i} offset={b.startFrame} />
          </Sequence>
        );
      })}

      <Sequence from={last.endFrame} durationInFrames={54} name="CTA">
        <CTACard />
      </Sequence>
    </AbsoluteFill>
  );
};

export const REEL2_LAYERS_DURATION = beats[beats.length - 1].endFrame + 54;
