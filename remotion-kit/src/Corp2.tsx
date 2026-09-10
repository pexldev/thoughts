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
import { BLACK, SCENE_COLOURS, YELLOW } from "./brand";
import { useSlam } from "./components/Impact";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import beats from "./timing/corp2.beats.json";
import words from "./timing/corp2.words.json";

const { fontFamily } = loadFont();

/**
 * CORPORATE sermon — reel 2, the certification block.
 *
 * Same SERMONS furniture as Corp1: SERMON stamp top-right, CTA ticker running
 * the whole reel, subtitles on (these frames carry no baked text of any kind).
 *
 * WHAT IS DIFFERENT, AND WHY IT MATTERS
 *
 * This is the first reel cut under the colour system (prep/color_system.md).
 * Every frame is anchor "hero" on sarkariGreen: a dark green room with one
 * object blazing yellow. Every earlier reel in this kit was yellow-dominant,
 * and two mechanisms in here were built on that assumption. Both had to go:
 *
 * 1. THE BRAND FLIP IS DISABLED. prep-images.js writes a _flip copy by
 *    swapping yellow and black. On a yellow-dominant frame that is a slam. On
 *    these it is a mess — the green ground snaps to flat yellow, the mascot
 *    loses his fill and reads as a floating head, forearms and feet, and the
 *    shadows come back BLUE, which is nowhere in this brand. The _flip files
 *    exist on disk; nothing references them. FLASH_BEATS is empty.
 *
 * 2. objectFit IS "cover", NOT "contain". Corp1 could scale below 1.0 and let
 *    the page show through, because the page and the art were the same yellow.
 *    Here the art is green and the page is not, so any margin would render as
 *    a yellow border on a green frame. Cover fills the frame at every scale.
 *    The images are 941x1672 (0.5628) against a 0.5625 target, so cover crops
 *    about 0.05% — invisible, and there is no baked text to lose.
 *
 * With cover, the "never scale above 1.0" rule no longer applies: it exists to
 * stop edge-to-edge headlines being cropped, and there are no headlines here.
 * The push still runs small-to-large so it grows into the frame.
 *
 * Structurally this is a LINEAR SCENE like Corp1, and it is 1:1 — seven beats,
 * seven images, no reuse and no stale stretches.
 */

/** Sarkari green: the one scene colour, held for the whole reel. */
const SCENE = SCENE_COLOURS.sarkariGreen;

type Shot = {
  /** file in public/images/corp2 */
  img: string;
  /** scale at the start of the shot */
  from: number;
  /** scale at the end of the shot */
  to: number;
};

/**
 * One entry per beat. The yellow object is the thing he is being told to
 * chase, and it changes every frame — certificate, interview door, the
 * machine's screen, the manager's hand, the promotion list, his phone, the
 * ring light. That arc is why there is no image reuse in this reel.
 *
 * d_manager gets the softest push of the set: the mascot is small and far
 * left in that frame, so a hard zoom only makes him smaller relative to the
 * dead wall above him.
 */
const FLASH_BEATS: number[] = [];

const SHOTS: Shot[] = [
  { img: "a_cert", from: 1.0, to: 1.05 },      // 1  don't do it
  { img: "b_door", from: 1.0, to: 1.05 },      // 2  no new interview
  { img: "c_ai", from: 1.0, to: 1.06 },        // 3  AI will score better
  { img: "d_manager", from: 1.02, to: 1.05 },  // 4  your manager asked you to
  { img: "e_list", from: 1.0, to: 1.06 },      // 5  he already knows
  { img: "f_phone", from: 1.0, to: 1.05 },     // 6  Instagram knows it
  { img: "g_ringlight", from: 1.0, to: 1.06 }, // 7  go make reels
];

/** SERMON rubber stamp — the shared fixed asset, reused from corp1's folder.
 *
 * Top-right, same corner every sermon, because the CTA ticker owns the lower
 * band. It is an alpha cut-out rather than a multiply: the asset's yellow sits
 * a hair off #F2FF00, and multiplying it left a visible tint box.
 *
 * IT NEEDS ITS OWN YELLOW GROUND HERE. The asset is black letters keyed to
 * transparent, and fixed_assets.md specifies "solid black on the yellow
 * ground" — on corp1 the frame itself supplied that ground. These frames are
 * dark sarkari green, so the first render put black letters on a dark wall and
 * the stamp effectively vanished. The patch restores the intended look rather
 * than inventing one, and it is the only yellow that holds a fixed position
 * for the whole reel.
 */
const Stamp: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 30,
      top: 34,
      padding: "10px 18px 14px",
      backgroundColor: YELLOW,
      transform: "rotate(-3deg)",
      display: "flex",
    }}
  >
    <Img src={staticFile("images/corp1/stamp.png")} style={{ width: 250, opacity: 0.92 }} />
  </div>
);

/**
 * CTA ticker — a news-channel crawl, running the WHOLE reel. Identical to
 * Corp1 so the format furniture stays constant week to week.
 *
 * Black band with yellow type and yellow keylines. On these frames it earns a
 * second job it did not have on corp1: measured brand yellow in this batch
 * runs 0.3%-5.3% of frame, well under the 20% the colour system asks for, and
 * the ticker's two keylines are the only yellow that is on screen for all
 * 35 seconds.
 *
 * Seamless because the copy is laid out in fixed-width UNITS: scroll exactly
 * one unit width per cycle and the wrap is invisible.
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

  // Beat 1 springs up — the reel has to arrive, not fade up.
  const slam = useSlam(11);
  const scale = beatIndex === 0 ? base * slam : base;

  const flashing = FLASH_BEATS.includes(beatIndex) && frame < 3;

  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.beat === beatIndex)
    .map((w) => ({ ...w, startFrame: w.startFrame - offset, endFrame: w.endFrame - offset }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SCENE,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={staticFile(`images/corp2/${shot.img}${flashing ? "_flip" : ""}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />

      <Stamp />

      <SyncedCaption words={mine} size={54} chunk={4} top="63%" plate />

      <CtaTicker />
    </AbsoluteFill>
  );
};

export const Corp2: React.FC = () => {
  const last = beats[beats.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: SCENE }}>
      <Audio src={staticFile("audio/corp2.wav")} />

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
        18 frames of the OPENING image so the last frame matches the first and
        the auto-replay seam is invisible. A loop device, not an outro breath —
        the cut lands ON "Instagram", which is where the beat data ends.

        The image brief wanted the closing frame (g_ringlight) to BE the loop
        pair for a_cert: same desk, same angle, only the glowing object
        changed. The generated g_ringlight came back as a different desk at a
        wider angle, so that pairing does not hold and this falls back to
        Corp1's device — replay the opener.
      */}
      <Sequence from={last.endFrame} durationInFrames={18} name="loop">
        <AbsoluteFill
          style={{ backgroundColor: SCENE, justifyContent: "center", alignItems: "center" }}
        >
          <Img
            src={staticFile("images/corp2/a_cert.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1)" }}
          />
          <Stamp />
          <CtaTicker />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export const CORP2_DURATION = beats[beats.length - 1].endFrame + 18;
