import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import type { Pose } from "./Mascot";

/**
 * THE TALKING PUPPET — the mascot's mouth driven by the VO.
 *
 * The style this imitates is not animation, it is PUPPETRY: a body that never
 * bends, a mouth that swaps, a blink on a timer, and hard cuts on the beat.
 * Everything expensive about animation is the part that style throws away.
 *
 * ------------------------------------------------------------------
 * WHAT IS REAL HERE AND WHAT IS A STAND-IN — read this before judging it
 *
 * REAL: the timing. `open` comes off the recorded waveform frame by frame via
 * scripts/mouth-track.mjs. If the sync feels right in this test it will still
 * feel right with drawn mouths, because the drawn mouths change the LOOK and
 * not one frame of the TIMING.
 *
 * STAND-IN: the mouth itself. It is drawn here in code — an ellipse. The real
 * asset is a generated sheet: a face with the mouth region blank, plus three
 * mouth PNGs. That is a ChatGPT session, not a code change, and it swaps in at
 * MOUTHS below without touching the driver.
 *
 * The stand-in works at all only because of an accident of this character:
 * his mouth already sits inside a black beard, so a dark shape opening in that
 * spot reads correctly with nothing painted out. On a clean-shaven design the
 * baked mouth would have to be covered first.
 * ------------------------------------------------------------------
 */

export type MouthFrame = { open: number; shape: 0 | 1 | 2 };

/**
 * Where the mouth sits, as a fraction of the pose PNG's own box — so it tracks
 * the art at any render size and never needs a pixel offset.
 *
 * Measured off public/mascot/bust.png by scanning for skin pixels enclosed by
 * beard on both sides: the lip band is x 68-104, y 142-155 of a 225x257 crop.
 *
 * `y` is the TOP of that band, not its centre — the first cut used the centre
 * and the mouth opened below the lips, on his chin. `maxH` deliberately runs
 * past the band's bottom edge (0.553 + 0.105 = 0.658) because a wide-open jaw
 * drops INTO the beard; stopping at the lip line caps him at a mumble.
 * Only `bust` is measured. The other poses need the same measurement before
 * they can talk — an unmeasured pose renders silent rather than wrong.
 */
const MOUTH: Partial<Record<Pose, { x: number; y: number; w: number; maxH: number }>> = {
  bust: { x: 0.382, y: 0.553, w: 0.16, maxH: 0.105 },
};

export const TalkingMascot: React.FC<{
  pose?: Pose;
  track: MouthFrame[];
  height: number;
  aspect: number;
  x?: string;
  y?: string;
  /** slow drift so he reads as drawn rather than pasted */
  boil?: number;
  /** draw a magenta box on the mouth anchor to check placement */
  debug?: boolean;
  /** placeholder eyelids. Off until a drawn closed-eye pose exists. */
  blink?: boolean;
}> = ({ pose = "bust", track, height, aspect, x = "50%", y, boil = 1, debug = false, blink = false }) => {
  const frame = useCurrentFrame();
  const m = MOUTH[pose];

  const open = track[frame]?.open ?? 0;

  const width = height * aspect;
  const bx = Math.sin(frame / 34) * 2.4 * boil;
  const by = Math.cos(frame / 27) * 3.0 * boil;
  const brot = Math.sin(frame / 41) * 0.35 * boil;

  /**
   * The head lifts a hair on a loud syllable. Tiny — 5px at full open. Without
   * it the mouth reads as a hole cut in a photograph; with it the whole head
   * commits to the sound, which is most of what sells a puppet.
   */
  const lift = -open * 5;

  /** Blink: a fast double every ~4s. Not amplitude-driven — blinks are not speech. */
  const blinkPhase = frame % 118;
  const blinking = blinkPhase < 3 || (blinkPhase >= 8 && blinkPhase < 11);

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        left: x,
        ...(y === undefined ? { bottom: 0 } : { top: y }),
        transform: `translateX(-50%) translate(${bx}px, ${by + lift}px) rotate(${brot}deg)`,
        transformOrigin: "50% 100%",
      }}
    >
      <Img
        src={staticFile(`mascot/${pose}.png`)}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      {/*
        THE MOUTH. Percentage-positioned divs, not an SVG viewBox — a viewBox
        rescales its own units against whichever axis it decides to fit, and the
        first cut of this rendered a 400px black spike down the middle of his
        face. Percentages resolve against this div's real box and cannot drift.

        Anchored at the TOP of the lip band and grown DOWNWARD, because a jaw
        drops. Grown about its centre it climbs into the moustache and reads as
        a wound rather than a mouth.
      */}
      {m && (
        <>
          <div
            style={{
              position: "absolute",
              left: `${m.x * 100}%`,
              top: `${m.y * 100}%`,
              width: `${m.w * (0.72 + 0.28 * open) * 100}%`,
              height: `${Math.max(0.006, m.maxH * open) * 100}%`,
              transform: "translateX(-50%)",
              backgroundColor: "#150c07",
              borderRadius: "50%",
            }}
          />
          {/* Lower lip catching light, so the opening reads as a mouth, not a hole. */}
          {open > 0.25 && (
            <div
              style={{
                position: "absolute",
                left: `${m.x * 100}%`,
                top: `${(m.y + m.maxH * open) * 100}%`,
                width: `${m.w * 0.55 * open * 100}%`,
                height: "0.9%",
                transform: "translate(-50%, -70%)",
                backgroundColor: "#c98a3c",
                opacity: 0.75,
                borderRadius: "50%",
              }}
            />
          )}
          {debug && (
            <div
              style={{
                position: "absolute",
                left: `${(m.x - m.w / 2) * 100}%`,
                top: `${m.y * 100}%`,
                width: `${m.w * 100}%`,
                height: `${m.maxH * 100}%`,
                outline: "2px solid magenta",
              }}
            />
          )}
        </>
      )}

      {/*
        Blink. OFF by default and that is deliberate: this character wears
        glasses over heavy-lidded eyes, so a flat skin cap reads as damage. A
        drawn closed-eye pose is the real fix. The timer is right even though
        the art is not — a fast double every ~4s, never amplitude-driven,
        because blinks are not speech.
      */}
      {blink && blinking && (
        <>
          <div style={{ position: "absolute", left: "24.5%", top: "36%", width: "18%", height: "8%", transform: "translateX(-50%)", backgroundColor: "#d99a52", borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: "51%", top: "33.5%", width: "19%", height: "8.5%", transform: "translateX(-50%)", backgroundColor: "#d99a52", borderRadius: "50%" }} />
        </>
      )}
    </div>
  );
};
