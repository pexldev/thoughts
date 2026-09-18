import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SCENE_COLOURS } from "./brand";
import { CTACard } from "./components/CTACard";
import { useSlam } from "./components/Impact";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import beats from "./timing/mirror.beats.json";
import words from "./timing/mirror.words.json";

/**
 * Joke Lab, "She Practised In A Mirror" — the cabin-crew EMOTIONAL reel.
 * joke-lab/ep01_reel_mirror_images.md.
 *
 * Different colour anchor from Reel2Images: this one is HERO, not
 * world/frame — the plates are dark plum rooms with a single yellow object,
 * not a yellow field. So the push-in margin has to be filled with the scene
 * colour (plum), not YELLOW, or the letterbox around a sub-1.0 scale would
 * show as a yellow ring nowhere in the artwork.
 *
 * NO baked text of any kind in these plates (the brief is explicit: "no text
 * stamps on this one — a joke counter would break it"), so subtitles are the
 * only text layer, same 66% band as every other reel.
 */

type Shot = {
  /** file in public/images/mirror */
  img: string;
  from: number;
  to: number;
};

/** Beats that open on a brand flip: the arrival, and the hard turn into the baby. */
const FLASH_BEATS = [0, 9];

/**
 * One entry per beat. Same rule as every other reel in this pipeline: scale
 * never exceeds 1 (full-bleed art, headroom included), shots start slightly
 * small and grow into a perfect fit, and a repeated image carries its scale
 * across the repeat instead of resetting.
 */
const SHOTS: Shot[] = [
  { img: "r1_seatbelt", from: 0.89, to: 0.94 }, // 0  the open — establishing, into the seatbelt click
  { img: "r2_oxygenmask", from: 0.89, to: 0.93 }, // 1  oxygen mask
  { img: "r3_lifevest", from: 0.89, to: 0.93 }, // 2  life vest
  { img: "r4_exits", from: 0.89, to: 0.94 }, // 3  emergency exits
  { img: "r5_escaperoom", from: 0.89, to: 0.95 }, // 4  the escape room — the one laugh
  { img: "r6_mirror", from: 0.89, to: 0.92 }, // 5  she practised the shit out of it
  { img: "r6_mirror", from: 0.92, to: 0.95 }, // 6  alone in her room, in front of the mirror — the hinge
  { img: "r6_mirror", from: 0.95, to: 0.97 }, // 7  excited to perform, might've fantasised
  { img: "r7_ovation", from: 0.89, to: 0.94 }, // 8  the standing ovation she imagined
  { img: "r8_baby14b", from: 0.89, to: 0.92 }, // 9  the turn — hard cut on the pause, into the baby
  { img: "r8_baby14b", from: 0.92, to: 0.96 }, // 10 hooked to the baby, she's bombing — hold
  { img: "r9_babyscreens", from: 0.89, to: 0.93 }, // 11 I come here every week and bomb too
  { img: "r9_babyscreens", from: 0.93, to: 0.97 }, // 12 every baby on the internet — hold to the end
];

const Shot: React.FC<{
  shot: Shot;
  durationInFrames: number;
  beatIndex: number;
  offset: number;
}> = ({ shot, durationInFrames, beatIndex, offset }) => {
  const frame = useCurrentFrame();

  const base = interpolate(frame, [0, durationInFrames], [shot.from, shot.to], {
    extrapolateRight: "clamp",
  });

  const slam = useSlam(11);
  const scale = beatIndex === 0 ? base * slam : base;

  const flashing = FLASH_BEATS.includes(beatIndex) && frame < 3;

  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.beat === beatIndex)
    .map((w) => ({ ...w, startFrame: w.startFrame - offset, endFrame: w.endFrame - offset }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE_COLOURS.plum,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={staticFile(`images/mirror/${shot.img}${flashing ? "_flip" : ""}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />

      <SyncedCaption words={mine} size={58} chunk={4} top="66%" plate />
    </AbsoluteFill>
  );
};

export const MirrorReel: React.FC = () => {
  const last = beats[beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE_COLOURS.plum }}>
      <Audio src={staticFile("audio/mirror.wav")} />

      {beats.map((b, i) => {
        const next = beats[i + 1];
        const end = next ? next.startFrame : last.endFrame;
        return (
          <Sequence
            key={i}
            from={b.startFrame}
            durationInFrames={end - b.startFrame}
            name={`${i + 1} ${SHOTS[i].img}`}
          >
            <Shot shot={SHOTS[i]} durationInFrames={end - b.startFrame} beatIndex={i} offset={b.startFrame} />
          </Sequence>
        );
      })}

      {/* Cut ON the punchline — no outro breath. */}
      <Sequence from={last.endFrame} durationInFrames={54} name="CTA">
        <CTACard />
      </Sequence>
    </AbsoluteFill>
  );
};

export const MIRROR_DURATION = beats[beats.length - 1].endFrame + 54;
