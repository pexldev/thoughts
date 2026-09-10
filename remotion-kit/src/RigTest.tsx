import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { SCENE_COLOURS, YELLOW } from "./brand";
import { Skyline } from "./components/Mascot";
import { Puppet, MouthFrame } from "./components/Puppet";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import mouth from "./timing/corp2.mouth.json";
import words from "./timing/corp2.words.json";
import heads from "./rig.heads.json";

/**
 * THE REAL RIG — generated mouthless head, generated mouths, same VO.
 *
 * Deliberately shot the same way as LipSyncTest so the two can be watched back
 * to back: identical framing, identical audio, identical 12 seconds. The only
 * thing that changed is the art. If the sync reads differently between them,
 * something is wrong, because the driver never moved.
 */

/**
 * Four heads — shut, ajar, half, wide — built by prep-heads.py.
 *
 * All four are the SAME face: head 0's drawing, frozen, with only a registered
 * window over the mouth taken from its sibling. The sheet's four generations
 * disagreed everywhere (hair, glasses, ears, collar), and swapping whole heads
 * at 30fps redrew the man rather than moving his mouth.
 *
 * Paths and aspect come from the prep script. Never type the aspect here — a
 * stale one does not throw, it stretches his face.
 */
const HEADS = heads.srcs;

const SCENE = SCENE_COLOURS.sarkariGreen;

export const RIG_DURATION = 360;

export const RigTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: SCENE, overflow: "hidden" }}>
    <Audio src={staticFile("audio/corp2.wav")} />

    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 34%, ${YELLOW} 0%, ${YELLOW} 16%, transparent 42%)`,
      }}
    />

    <Skyline height={560} drift={0.4} />

    <Puppet
      src={HEADS[0]}
      aspect={heads.aspect}
      heads={HEADS}
      blink={heads.blinkSrcs}
      track={mouth as MouthFrame[]}
      height={1680}
      bottom={-90}
      boil={0.7}
      stepFps={0}
      perform={1}
    />

    <SyncedCaption words={words as TimedWord[]} size={50} chunk={4} top="81%" plate />
  </AbsoluteFill>
);
