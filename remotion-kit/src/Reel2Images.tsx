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
 * "Shooting in the dark" — reel 2, cut over the generated scene images.
 *
 * NO CAPTION LAYER. Every image already carries its line baked in, plus the
 * JOKE LAB stamp. Anything drawn on top would be the second copy of the same
 * words.
 *
 * Timing is untouched from the VO pass — same beats, same holds.
 */

type Shot = {
  /** file in public/images/reel2 */
  img: string;
  /** scale at the start of the shot */
  from: number;
  /** scale at the end of the shot */
  to: number;
  /** falling rain — only where the scene is actually out in it */
  rain?: boolean;
  /** ripples on standing water — anywhere the floor is drawn wet */
  ripples?: boolean;
};

/**
 * One entry per beat.
 *
 * THE SCALES NEVER EXCEED 1. These images are composed full-bleed — the baked
 * headline runs nearly edge to edge — so anything above 1.0 crops the words.
 * The first cut of this pushed to 1.32 and sliced the top off every line.
 *
 * So the move is inverted: the shot starts slightly SMALL and grows into a
 * perfect fit. The margin around a shrunken frame is invisible because the
 * page behind it is the same #F2FF00 the images were just snapped to. Motion,
 * no crop.
 *
 * Images repeat across beats where the VO is still inside the same moment; the
 * scale carries on from where the previous beat left it so a repeat reads as
 * one continuous move rather than a reset.
 *
 * Beat 6 ("Tony knew everything…") has no image of its own and holds on the
 * dicky frame, so its baked line is stale for 6.6s. That is the one gap.
 */
/** Beats that open on a brand flip. Keep this list short. */
const FLASH_BEATS = [0, 7, 8];

const SHOTS: Shot[] = [
  { img: "a_car", from: 0.9, to: 0.93, rain: true, ripples: true }, // 1  best friend Tony
  { img: "a_car", from: 0.93, to: 0.96, rain: true, ripples: true }, // 2  pouring rain
  { img: "a_car", from: 0.96, to: 0.97, rain: true, ripples: true }, // 3  she calls me to hop in
  { img: "b_basement", from: 0.89, to: 0.96, ripples: true }, // 4  drives us to the basement
  { img: "c_dicky", from: 0.89, to: 0.94, rain: true, ripples: true }, // 5  the garland
  { img: "c_dicky", from: 0.94, to: 0.97, rain: true, ripples: true }, // 6  Tony knew  <- gap
  { img: "d_sayyes", from: 0.9, to: 0.94, ripples: true }, // 7  are you going to say yes
  { img: "d_sayyes", from: 0.94, to: 0.96, ripples: true }, // 8  she said yes — the hold
  { img: "e_congrats", from: 0.89, to: 0.96 }, // 9  congratulations guys
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

  // Beat 1 springs up from small instead of easing — the reel has to arrive,
  // not fade up. Every later beat just carries the push.
  //
  // No per-hit punch. Transient-driven pulses were tried and cut: across 47
  // seconds they read as busy rather than tight, and they fought the push
  // instead of accenting it. scripts/transients.js still exists if a future
  // reel wants them.
  const slam = useSlam(11);
  const scale = beatIndex === 0 ? base * slam : base;

  // Three flashes, no more: the open, "she said yes", and the turn into
  // "congratulations" — the two places the story actually breaks. The flip is
  // a separate pre-rendered image, not a filter (see scripts/prep-images.js).
  const flashing = FLASH_BEATS.includes(beatIndex) && frame < 3;

  // this beat's spoken words, rebased to the sequence's local frames
  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.beat === beatIndex)
    .map((w) => ({ ...w, startFrame: w.startFrame - offset, endFrame: w.endFrame - offset }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: YELLOW,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={staticFile(`images/reel2/${shot.img}${flashing ? "_flip" : ""}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />

      {/*
        Weather sits between the picture and the subtitles: it falls in front
        of the scene but must never wash over the words. It also rides OUTSIDE
        the scaling wrapper, so a push-in doesn't stretch the drops.
      */}
      {shot.ripples ? <Ripples /> : null}
      {shot.rain ? <Rain /> : null}

      {/*
        Spoken-word subtitles, low in the frame.
        The baked headline owns the top third and IG's UI covers the bottom
        ~15%, so these live in the band between — on a yellow plate, because
        the line work in the art runs straight through bare black type.
      */}
      <SyncedCaption words={mine} size={58} chunk={4} top="66%" plate />
    </AbsoluteFill>
  );
};

export const Reel2Images: React.FC = () => {
  const last = beats[beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW }}>
      <Audio src={staticFile("audio/reel2.wav")} />

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

export const REEL2_IMAGES_DURATION = beats[beats.length - 1].endFrame + 54;
