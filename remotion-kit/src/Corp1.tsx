import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, YELLOW } from "./brand";
import { useSlam } from "./components/Impact";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import beats from "./timing/corp1.beats.json";
import words from "./timing/corp1.words.json";

const { fontFamily } = loadFont();

/**
 * CORPORATE sermon — reel 1, the recruiter block.
 *
 * First reel of the SERMONS format (see sermons/fixed_assets.md), so two
 * things differ from the Joke Lab reels:
 *
 *  - the corner stamp reads SERMON, not JOKE LAB
 *  - the CTA is a STRIP running the whole reel, not a terminal card, and it
 *    comes from his generated asset rather than <CTACard/> — CTA_COPY in
 *    brand.ts still holds the Joke Lab wording, and rewriting it there would
 *    change every existing Joke Lab reel
 *
 * SUBTITLES ARE ON. Unlike reel2, these images carry no baked headline — the
 * only text in them is diegetic (an email body, a BRB bubble), so captions
 * are the muted-viewer floor rather than a second copy of the same words.
 *
 * Structurally this is a LINEAR SCENE, not a joke run: one continuous action
 * sequence, one image per action, rather than Wide/Close per joke.
 */

type Shot = {
  /** file in public/images/corp1 */
  img: string;
  /** scale at the start of the shot */
  from: number;
  /** scale at the end of the shot */
  to: number;
};

/**
 * One entry per beat.
 *
 * SCALES NEVER EXCEED 1 — see Reel2Images for why. Shots start slightly small
 * and grow into a perfect fit; the margin is invisible because the page behind
 * is the same #F2FF00 the images were snapped to.
 *
 * a_call carries beats 0-2 because he is on the phone, on mute, for all three
 * — the picture has not gone stale, the VO is still inside that moment. The
 * scale continues across the repeats so it reads as one push, not three.
 *
 * c_budget returns for the closer: it is the only frame with the recruiter in
 * it, and the last line is about her.
 */
const FLASH_BEATS = [0, 7];

const SHOTS: Shot[] = [
  { img: "a_call", from: 0.89, to: 0.93 }, // 1  the call arrives
  { img: "a_call", from: 0.93, to: 0.96 }, // 2  mute and pick up
  { img: "a_call", from: 0.96, to: 0.98 }, // 3  is it a good time to talk
  { img: "b_brb", from: 0.89, to: 0.95 },  // 4  type a BRB in the chat
  { img: "c_budget", from: 0.89, to: 0.96 }, // 5  that is exactly her budget
  { img: "d_back", from: 0.89, to: 0.97 },   // 6  back to the meeting, type BACK
  { img: "e_pto", from: 0.89, to: 0.96 },    // 7  draft the PTO email
  { img: "c_budget", from: 0.90, to: 0.97 }, // 8  she values you 50% more
];

/** SERMON rubber stamp, every scene frame.
 *
 * TOP-right, not bottom: the CTA strip now owns the lower band. The upper
 * third of all five frames is empty yellow, so it sits in clean air.
 *
 * A real alpha cut-out, NOT multiply. The generated asset's yellow is a hair
 * off #F2FF00, so multiplying it over a snapped frame left a visible tint box
 * around the stamp. The yellow is keyed to transparent instead.
 */
const Stamp: React.FC = () => (
  <Img
    src={staticFile("images/corp1/stamp.png")}
    style={{
      position: "absolute",
      right: 44,
      top: 44,
      width: 250,
      opacity: 0.92,
    }}
  />
);

/**
 * CTA ticker — a news-channel crawl, running the WHOLE reel.
 *
 * Replaces the static strip. Same job, same position, but it moves, so it
 * reads as broadcast furniture rather than a caption someone forgot to remove.
 *
 * BLACK band with yellow type, not the other way round: b_brb and d_back both
 * draw a solid black desk exactly where this sits, so a yellow band would
 * float on those two frames and sit flush on the rest. Black plus the two
 * keylines reads as one deliberate object over every frame.
 *
 * Seamless because the copy is laid out in fixed-width UNITS: scroll exactly
 * one unit width per cycle and the wrap is invisible. Measuring text at render
 * time would be more precise and far more fragile.
 */
const TICKER = {
  unitWidth: 1000,
  /** seconds to travel one unit — ~165px/s, slow enough to actually read */
  secondsPerUnit: 6,
  height: 104,
  /** top edge, as a fraction of frame height. Ends at ~81%, clear of IG's UI. */
  top: 0.76,
};

const CtaTicker: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const cycle = TICKER.secondsPerUnit * fps;
  const offset = -((frame % cycle) / cycle) * TICKER.unitWidth;

  // enough units to cover the frame plus one full unit of overscroll
  const count = Math.ceil(width / TICKER.unitWidth) + 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${TICKER.top * 100}%`,
        height: TICKER.height,
        backgroundColor: BLACK,
        borderTop: `6px solid ${YELLOW}`,
        borderBottom: `6px solid ${YELLOW}`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          transform: `translateX(${offset}px)`,
          willChange: "transform",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              width: TICKER.unitWidth,
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              fontFamily,
              color: YELLOW,
              fontSize: 46,
              letterSpacing: 1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            <span>Full sermon on YouTube</span>
            <span style={{ fontSize: 26, opacity: 0.85 }}>◆</span>
            <span>I could be wrong</span>
            <span style={{ fontSize: 26, opacity: 0.85 }}>◆</span>
          </div>
        ))}
      </div>
    </div>
  );
};

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

  // Beat 1 springs up from small — the reel has to arrive, not fade up.
  const slam = useSlam(11);
  const scale = beatIndex === 0 ? base * slam : base;

  // Two flashes only: the open, and the turn into the closer.
  const flashing = FLASH_BEATS.includes(beatIndex) && frame < 3;

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
        src={staticFile(`images/corp1/${shot.img}${flashing ? "_flip" : ""}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />

      <Stamp />

      {/*
        The ticker is far slimmer than the old static strip, so these come
        back down to 63% — at 56% they were landing across his chest.
      */}
      <SyncedCaption words={mine} size={54} chunk={4} top="63%" plate />

      <CtaTicker />
    </AbsoluteFill>
  );
};

export const Corp1: React.FC = () => {
  const last = beats[beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW }}>
      <Audio src={staticFile("audio/corp1.wav")} />

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
            <Shot
              shot={SHOTS[i]}
              durationInFrames={end - b.startFrame}
              beatIndex={i}
              offset={b.startFrame}
            />
          </Sequence>
        );
      })}

      {/*
        No end card — the CTA rides the whole reel as a strip.

        Instead, 18 frames of the OPENING image so the last frame matches the
        first and the auto-replay seam is invisible. Short on purpose: it is a
        loop device, not an outro breath.
      */}
      <Sequence from={last.endFrame} durationInFrames={18} name="loop">
        <AbsoluteFill
          style={{ backgroundColor: YELLOW, justifyContent: "center", alignItems: "center" }}
        >
          <Img
            src={staticFile("images/corp1/a_call.png")}
            style={{ width: "100%", height: "100%", objectFit: "contain", transform: "scale(0.89)" }}
          />
          <Stamp />
          <CtaTicker />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export const CORP1_DURATION = beats[beats.length - 1].endFrame + 18;
