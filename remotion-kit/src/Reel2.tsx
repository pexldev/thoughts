import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { YELLOW } from "./brand";
import { CTACard } from "./components/CTACard";
import { Mascot, Pose, Skyline } from "./components/Mascot";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import beats from "./timing/reel2.beats.json";
import words from "./timing/reel2.words.json";

/**
 * "Shooting in the dark" — reel 2.
 *
 * Every cut here comes from the VO. Beat boundaries and word timings were
 * measured off the recording (scripts/transcribe.mjs -> scripts/align.mjs);
 * nothing below is hand-timed, so a re-record just needs those two scripts
 * re-run.
 *
 * Only the staging is a judgement call: which pose is on screen for which
 * beat, and how hard the camera pushes. Those are the knobs to argue with.
 */

const STAGING: Array<{ pose: Pose; height: number; push: number; skyline: boolean }> = [
  { pose: "standing", height: 900, push: 0.08, skyline: true }, // best friend Tony
  { pose: "standing", height: 940, push: 0.14, skyline: true }, // pouring rain, the SUV
  { pose: "lookaway", height: 1080, push: 0.06, skyline: false }, // she calls me to hop in
  { pose: "standing", height: 900, push: 0.12, skyline: true }, // the basement, the dicky
  { pose: "bust", height: 940, push: 0.1, skyline: false }, // the garland
  { pose: "lookaway", height: 1060, push: 0.08, skyline: false }, // Tony knew everything
  { pose: "chin", height: 1140, push: 0.07, skyline: false }, // are you going to say yes
  { pose: "bust", height: 1020, push: 0.16, skyline: false }, // she said yes — the hold
  { pose: "chin", height: 1160, push: 0.09, skyline: false }, // congratulations guys
];

const Beat: React.FC<{
  index: number;
  durationInFrames: number;
  offset: number;
}> = ({ index, durationInFrames, offset }) => {
  const frame = useCurrentFrame();
  const s = STAGING[index];

  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + s.push], {
    extrapolateRight: "clamp",
  });

  // words belonging to this beat, rebased to the sequence's local frames
  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.beat === index)
    .map((w) => ({
      ...w,
      startFrame: w.startFrame - offset,
      endFrame: w.endFrame - offset,
    }));

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {s.skyline ? <Skyline /> : null}
        <Mascot pose={s.pose} height={s.height} />
      </AbsoluteFill>
      <SyncedCaption words={mine} size={index === 7 ? 132 : 100} />
    </AbsoluteFill>
  );
};

export const Reel2: React.FC = () => {
  const last = beats[beats.length - 1];
  const CTA_FRAMES = 54;

  return (
    <AbsoluteFill>
      <Audio src={staticFile("audio/reel2.wav")} />

      {beats.map((b, i) => {
        const next = beats[i + 1];
        const end = next ? next.startFrame : last.endFrame;
        return (
          <Sequence
            key={i}
            from={b.startFrame}
            durationInFrames={end - b.startFrame}
            name={`beat ${i + 1}`}
          >
            <Beat index={i} durationInFrames={end - b.startFrame} offset={b.startFrame} />
          </Sequence>
        );
      })}

      {/* Cut ON the punchline — the card starts the frame the last word ends. */}
      <Sequence from={last.endFrame} durationInFrames={CTA_FRAMES} name="CTA">
        <CTACard />
      </Sequence>
    </AbsoluteFill>
  );
};

export const REEL2_DURATION = beats[beats.length - 1].endFrame + 54;
