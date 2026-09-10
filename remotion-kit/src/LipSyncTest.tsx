import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SCENE_COLOURS, YELLOW } from "./brand";
import { Skyline } from "./components/Mascot";
import { TalkingMascot, MouthFrame } from "./components/TalkingMascot";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import mouth from "./timing/corp2.mouth.json";
import words from "./timing/corp2.words.json";

/**
 * LIP-SYNC TEST — not a reel, and not a corporate reel that will ever ship.
 *
 * It runs on corp2's VO only because that WAV and its word timings already
 * exist, so nothing here had to be recorded to find out whether the mouth
 * lands on the beat. The first piece to actually ship in this format is a
 * different script.
 *
 * WHAT TO JUDGE, IN ORDER
 *
 * 1. Does the mouth move on the syllable or a beat late? That is the only
 *    question this test exists to answer. Watch it once at full speed, then
 *    once muted — if it looks like chewing with no audio, the drive is wrong.
 * 2. Does it flap during pauses? Room tone reading as speech means the gate in
 *    mouth-track.mjs is too low.
 * 3. Does it strobe on fast words? That is the smoothing, not the sync.
 *
 * WHAT NOT TO JUDGE: the mouth shape, the eyelids, the empty background. All
 * placeholder. See the header of TalkingMascot.tsx.
 *
 * Subtitles are on deliberately as a cross-check: the word hits the screen and
 * the mouth should already be moving, since whisper marks a word's start at the
 * vowel and the lips open just before it.
 */

const SCENE = SCENE_COLOURS.sarkariGreen;
const BUST_ASPECT = 225 / 257;

export const LIPSYNC_DURATION = 360; // 12s — long enough to read, fast to render

export const LipSyncTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: SCENE, overflow: "hidden" }}>
    <Audio src={staticFile("audio/corp2.wav")} />

    {/* One yellow anchor so the frame is not off-system while we look at it. */}
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 34%, ${YELLOW} 0%, ${YELLOW} 16%, transparent 42%)`,
      }}
    />

    <Skyline height={560} drift={0.4} />

    <TalkingMascot
      pose="bust"
      track={mouth as MouthFrame[]}
      height={1150}
      aspect={BUST_ASPECT}
      boil={1}
    />

    <Sequence from={0}>
      <SyncedCaption words={words as TimedWord[]} size={50} chunk={4} top="81%" plate />
    </Sequence>
  </AbsoluteFill>
);
