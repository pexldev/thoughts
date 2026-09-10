import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import { Puppet, MouthFrame } from "./components/Puppet";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import mouth from "./timing/corp2.mouth.json";
import words from "./timing/corp2.words.json";
import heads from "./rig.heads.json";
import bodies from "./rig.bodies.json";

/**
 * PUPPET SCENE — the mascot standing inside a generated picture, talking.
 *
 * Answers the actual question: can he be dropped into any room I generate and
 * lip-sync there. He is a layer over a plate; the plate never knew he existed.
 *
 * THE PLATE IS A STAND-IN and a deliberately awkward one — a retired Joke Lab
 * background, cropped hard to cut its baked headline off the top. Nothing here
 * is meant to ship. It is a real generated room with no character in it, which
 * is the only property the test needs.
 *
 * WHAT MAKES IT READ AS STOP MOTION RATHER THAN A SLIDING CUTOUT
 * 1. The plate is LOCKED. No push-in, no drift. Stop motion has no dolly.
 * 2. Body motion is quantised to 10 steps a second (`stepFps`) while the mouth
 *    stays at 30. The eye reads discrete re-placement as a physical object.
 * 3. Shots HARD CUT and hold. No transitions of any kind.
 *
 * WIDE SHOTS CARRY NO MOUTH ON PURPOSE. At the size he is in shot 1 a mouth is
 * four pixels — animating it buys nothing and costs a measured anchor. Lip sync
 * is a close-up device. That is also true of the reference channels.
 */

/**
 * The close-up head. Talks.
 *
 * This used to be head.png plus a composited mouth overlay — the approach that
 * was rejected six times for the same reason every time: a pasted shape does
 * not belong to the drawing under it. It now runs the same registered head set
 * RigTest does, where the mouth is drawn by the same hand as the face.
 *
 * Geometry comes from the prep script, never typed here. A hand-written aspect
 * goes stale on the next recut and does not throw — it just stretches his face.
 */

/**
 * The five generated bodies. They came back within 1% of each other in height
 * (784-791px), which is the property that matters: one scale number places any
 * of them, so a pose change costs nothing but a cut.
 *
 * Their heads carry a drawn mouth and that is fine — bodies are for wide shots,
 * where a mouth is a handful of pixels. Talking stays on the close-up head.
 */
const BODIES = bodies.poses;

const PLATE = "layers/reel2/basement_bg.png";

/**
 * Plate is pushed up and scaled so the baked headline sits off-frame and the
 * garage fills it. A crop, not a camera move — it never changes.
 */
const Plate: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
    <Img
      src={staticFile(PLATE)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "50% 100%",
        transform: "scale(1.5)",
        transformOrigin: "50% 100%",
      }}
    />
  </AbsoluteFill>
);

type Shot =
  | { from: number; duration: number; kind: "close" }
  | { from: number; duration: number; kind: "wide"; body: number; x: string; flip?: boolean };

/**
 * Cuts land in his PAUSES, read off corp2.mouth.json rather than guessed —
 * quiet runs sit at 54-78, 119-134, 148-163, 261-285. Cutting mid-syllable is
 * the single fastest way to make a puppet look like a slideshow.
 */
const SHOTS: Shot[] = [
  { from: 0, duration: 66, kind: "wide", body: 0, x: "38%" },
  { from: 66, duration: 60, kind: "close" },
  { from: 126, duration: 30, kind: "wide", body: 1, x: "42%" },
  { from: 156, duration: 116, kind: "close" },
  { from: 272, duration: 46, kind: "wide", body: 4, x: "34%" },
  { from: 318, duration: 42, kind: "wide", body: 2, x: "44%" },
];

export const PUPPET_DURATION = 360;

export const PuppetScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Audio src={staticFile("audio/corp2.wav")} />

    {SHOTS.map((shot, i) => (
      <Sequence key={i} from={shot.from} durationInFrames={shot.duration} name={`${i + 1} ${shot.kind}`}>
        <AbsoluteFill>
          <Plate />
          {shot.kind === "wide" ? (
            <Puppet
              src={BODIES[shot.body].src}
              aspect={BODIES[shot.body].aspect}
              height={1010}
              x={shot.x}
              bottom={200}
              flip={shot.flip}
              boil={1}
              stepFps={10}
            />
          ) : (
            <Puppet
              src={heads.srcs[0]}
              aspect={heads.aspect}
              heads={heads.srcs}
              blink={heads.blinkSrcs}
              track={mouth as MouthFrame[]}
              trackOffset={shot.from}
              height={1420}
              x="50%"
              bottom={-90}
              boil={0.8}
              stepFps={10}
            />
          )}
        </AbsoluteFill>
      </Sequence>
    ))}

    <SyncedCaption words={words as TimedWord[]} size={50} chunk={4} top="81%" plate />
  </AbsoluteFill>
);
