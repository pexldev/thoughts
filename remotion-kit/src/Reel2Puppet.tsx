import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { YELLOW } from "./brand";
import { CTACard } from "./components/CTACard";
import { useSlam } from "./components/Impact";
import { Rain, Ripples } from "./components/Rain";
import { Puppet, MouthFrame } from "./components/Puppet";
import { SyncedCaption, TimedWord } from "./components/SyncedCaption";
import mouth from "./timing/reel2.mouth.json";
import words from "./timing/reel2.words.json";
import heads from "./rig.heads.json";
import bodies from "./rig.bodies.json";

/**
 * "Shooting in the dark" — the Tony reel, PUPPETED.
 *
 * Reel2Layers already cuts this story using the character that was generated
 * INSIDE each scene image. This is the same story, same VO, same plates, same
 * beats — with the puppet standing on the plates instead.
 *
 * That comparison is the whole point of the rig, and this reel is the clearest
 * place to see it: the baked `_char` layers are five different men. The beard
 * changes, the glasses change, the face changes, because each was drawn in its
 * own generation. Cut them together and the viewer does not read "him in five
 * places", they read five brothers. One fixed set of drawings over changing
 * rooms is how a character holds.
 *
 * WHAT THE PLATES ALREADY DO, SO THIS DOES NOT REDO IT
 * Each `_bg` carries its own baked headline and the JOKE LAB stamp, and the
 * mascot has been cut out of it. So the plate is the room and the title; the
 * puppet is the performance. Nothing scales past 1.0 — the headline runs edge
 * to edge and any zoom past a perfect fit eats the words.
 *
 * THE GRAMMAR
 * Wides carry no mouth. At full-body size a mouth is a handful of pixels, so
 * lip sync there buys nothing — it is a close-up device. Wides get a POSE and a
 * cut instead, which is also what makes the cutting feel deliberate: a pose
 * change is an edit, not an animation.
 *
 * MOOD DOES NARRATIVE WORK HERE, WHICH IS THE POINT OF HAVING IT
 * He plays deadpan through the setup, goes `grim` at "Tony knew everything"
 * where the story turns on him, and then — the joke — wears `smile` for
 * "congratulations guys, I'm so happy for you". The forced smile IS the
 * punchline. Nothing about the lip track changes; a mood is a mask over a
 * whole shot.
 */

type Scene = "street" | "basement" | "dicky" | "sayyes" | "congrats";

const MOODS = heads.moods as Record<string, { srcs: string[]; blinkSrcs: string[] }>;
const POSES = bodies.poses;

/** Where he stands in each room, tuned against the plates. */
const GROUND: Record<Scene, { x: number; ground: number; height: number }> = {
  street: { x: 0.24, ground: 40, height: 1140 },
  basement: { x: 0.74, ground: 130, height: 1080 },
  dicky: { x: 0.2, ground: 100, height: 1110 },
  sayyes: { x: 0.2, ground: 80, height: 1140 },
  congrats: { x: 0.22, ground: 100, height: 1110 },
};

type Shot = {
  from: number;
  to: number;
  scene: Scene;
  kind: "wide" | "close";
  /** pose index for wides — a cut, not an animation */
  body?: number;
  mood: string;
  flip?: boolean;
  rain?: boolean;
  ripples?: boolean;
};

/**
 * Beats are subdivided rather than used one-to-one. Beat 2 alone runs 8.2s,
 * and a vertical frame that holds that long is a slideshow however nicely it
 * drifts. These land at ~3.3s average.
 */
const SHOTS: Shot[] = [
  { from: 0, to: 105, scene: "street", kind: "wide", body: 0, mood: "deadpan", rain: true, ripples: true },
  { from: 105, to: 230, scene: "street", kind: "wide", body: 1, mood: "deadpan", rain: true, ripples: true },
  { from: 230, to: 350, scene: "street", kind: "close", mood: "deadpan", rain: true, ripples: true },
  { from: 350, to: 418, scene: "street", kind: "wide", body: 4, mood: "deadpan", rain: true, ripples: true },

  { from: 418, to: 505, scene: "basement", kind: "wide", body: 3, mood: "deadpan", ripples: true },
  { from: 505, to: 591, scene: "basement", kind: "close", mood: "deadpan", ripples: true },

  { from: 591, to: 710, scene: "dicky", kind: "wide", body: 0, mood: "deadpan", ripples: true },
  { from: 710, to: 831, scene: "dicky", kind: "wide", body: 2, mood: "deadpan", ripples: true },
  // the turn — the story stops being about the garland and starts being about him
  { from: 831, to: 930, scene: "dicky", kind: "close", mood: "grim", ripples: true },
  { from: 930, to: 1030, scene: "dicky", kind: "wide", body: 2, mood: "grim", ripples: true },

  { from: 1030, to: 1126, scene: "sayyes", kind: "wide", body: 4, mood: "deadpan" },
  { from: 1126, to: 1220, scene: "sayyes", kind: "close", mood: "grim" },

  // the punchline is worn, not said
  { from: 1220, to: 1300, scene: "congrats", kind: "close", mood: "smile" },
  { from: 1300, to: 1374, scene: "congrats", kind: "wide", body: 1, mood: "smile" },
];

const END = SHOTS[SHOTS.length - 1].to;

const Beat: React.FC<{ shot: Shot; duration: number; first: boolean }> = ({
  shot,
  duration,
  first,
}) => {
  const frame = useCurrentFrame();
  const slam = useSlam(11);
  const g = GROUND[shot.scene];

  const close = shot.kind === "close";

  /**
   * WIDES KEEP THE HEADLINE. CLOSE-UPS PUSH IT OFF THE TOP.
   *
   * Each plate carries its beat title baked edge to edge, which is right for a
   * wide — the wide IS the title card. On a close-up it fights: his hair rises
   * straight through the words, and shrinking him to clear them makes the
   * close-up not a close-up.
   *
   * A close-up is a different framing of the same room, so the title does not
   * belong in it. Scaled up and pushed up, the headline leaves the top of frame
   * and what remains behind his shoulders is the room, which is all a close-up
   * needs. The caption carries the words there.
   *
   * Wides never scale past 1.0 for the opposite reason — any zoom past a
   * perfect fit eats the headline they exist to show.
   */
  const bg = close
    ? 1.6
    : (first ? slam : 1) * interpolate(frame, [0, duration], [0.92, 0.97], { extrapolateRight: "clamp" });
  const bgShift = close ? -500 : 0;

  const mine: TimedWord[] = (words as TimedWord[])
    .filter((w) => w.startFrame >= shot.from && w.startFrame < shot.to)
    .map((w) => ({ ...w, startFrame: w.startFrame - shot.from, endFrame: w.endFrame - shot.from }));

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW, overflow: "hidden" }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={staticFile(`layers/reel2/${shot.scene}_bg.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `translateY(${bgShift}px) scale(${bg})`,
          }}
        />
      </AbsoluteFill>

      {/* weather falls between the room and the man */}
      {shot.ripples ? <Ripples /> : null}

      {shot.kind === "wide" ? (
        <Puppet
          src={POSES[shot.body ?? 0].src}
          aspect={POSES[shot.body ?? 0].aspect}
          height={g.height}
          x={`${g.x * 100}%`}
          bottom={g.ground}
          flip={shot.flip}
          boil={1}
          stepFps={10}
        />
      ) : (
        <Puppet
          src={MOODS[shot.mood].srcs[0]}
          aspect={heads.aspect}
          heads={MOODS[shot.mood].srcs}
          blink={MOODS[shot.mood].blinkSrcs}
          track={mouth as MouthFrame[]}
          trackOffset={shot.from}
          /* Sized so his chin lands just above the caption and the chest cut
             clears the bottom of frame — a head cutout ends in a straight line
             and a visible one reads as a bust on a shelf. */
          height={1500}
          x="50%"
          bottom={-50}
          boil={0.7}
          stepFps={0}
          perform={1}
        />
      )}

      {shot.rain ? <Rain /> : null}

      {/* Lower on close-ups, so the words sit under his chin instead of over
          his mouth — the one place a caption must never land in a lip-sync shot. */}
      <SyncedCaption words={mine} size={54} chunk={4} top={close ? "73%" : "68%"} plate />
    </AbsoluteFill>
  );
};

export const Reel2Puppet: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: YELLOW }}>
    <Audio src={staticFile("audio/reel2.wav")} />

    {SHOTS.map((s, i) => (
      <Sequence
        key={i}
        from={s.from}
        durationInFrames={s.to - s.from}
        name={`${i + 1} ${s.scene} ${s.kind}${s.mood !== "deadpan" ? ` (${s.mood})` : ""}`}
      >
        <Beat shot={s} duration={s.to - s.from} first={i === 0} />
      </Sequence>
    ))}

    <Sequence from={END} durationInFrames={54} name="CTA">
      <CTACard />
    </Sequence>
  </AbsoluteFill>
);

export const REEL2_PUPPET_DURATION = END + 54;
