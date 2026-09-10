import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, SCENE_COLOURS, SceneColour, YELLOW, YellowAnchor, censor } from "../brand";
import { Mascot, Pose } from "./Mascot";
import type { ShotKind } from "../cutplan";

const { fontFamily } = loadFont();

/**
 * Yellow has to enter a frame one of three legal ways (prep/color_system.md).
 * "frame" — a hard strip top and bottom over a coloured world — is the shape
 * of the best-performing reel, so it is the default here.
 */
const YellowStrips: React.FC<{ thickness?: number }> = ({ thickness = 46 }) => (
  <>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: thickness, backgroundColor: YELLOW }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: thickness, backgroundColor: YELLOW }} />
  </>
);

/**
 * One SHOT inside a chapter — not one chapter.
 *
 * A chapter runs one to three minutes and gets cut into 8–20 of these, so the
 * picture changes every 5–15 seconds the way an edited video does. The cut
 * points come from cutPlan(), snapped to pauses in the speech.
 */
export const Shot: React.FC<{
  kind: ShotKind;
  durationInFrames: number;
  /** index of this shot within its chapter — drives framing variety */
  index: number;
  title: string;
  scene: SceneColour;
  anchor: YellowAnchor;
  img?: string;
  pose?: Pose;
  /** the line to punch, for a "text" shot */
  line?: string;
}> = ({ kind, durationInFrames, index, title, scene, anchor, img, pose = "standing", line }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const colour = SCENE_COLOURS[scene];

  if (kind === "text" && line) return <TextCard line={line} t={t} colour={colour} />;
  if (kind === "beat") return <YellowBeat title={title} t={t} />;
  if (kind === "mascot") return <MascotCut pose={pose} t={t} colour={colour} anchor={anchor} index={index} />;

  return (
    <ImageShot img={img} title={title} t={t} colour={colour} anchor={anchor} index={index} />
  );
};

/**
 * The chapter image, reframed.
 *
 * One generated image yields six or eight distinct shots by punching into
 * different regions of it — wide, then his face, then the object. This is what
 * makes event density affordable without generating a hundred pictures.
 */
const ImageShot: React.FC<{
  img?: string;
  title: string;
  t: number;
  colour: string;
  anchor: YellowAnchor;
  index: number;
}> = ({ img, title, t, colour, anchor, index }) => {
  // deterministic framing variety: wide establisher first, then tighter
  // punches into different thirds of the frame
  const wide = index === 0;
  const scale = wide ? 1.02 + t * 0.03 : 1.22 + t * 0.05;
  const ox = wide ? 0 : (random(`ox-${index}`) - 0.5) * 26;

  // Vertical offset is biased UPWARD on every shot after the establisher, and
  // never negative.
  //
  // The chapter title is baked into the bottom band of the generated image, so
  // a punch that drifts downward slices it mid-letter — "UR MANAGER IS THE
  // JUDG" — which reads as a broken render rather than a deliberate crop. A
  // positive translate pushes that band out of frame entirely, so the
  // establisher states the title once and every later shot explores the
  // picture above it. That is the same rule the procedural path already
  // follows; it just has to be enforced geometrically when the words live
  // inside the artwork.
  // The safe band is narrow: the image is the same 16:9 as the frame, so at
  // scale 1.22 there is only ~11% of overflow to translate into. Below ~9% the
  // baked title still clips; above ~11% the frame runs off the artwork and
  // exposes the scene colour. So this is fixed rather than random — vertical
  // variety would cost legibility, and the variety comes from ox and scale.
  const oy = wide ? 0 : 10;

  // The chapter title belongs on the chapter's OPENING shot only. Repeating it
  // on every cut is what makes a sequence read as a slideshow of captioned
  // cards rather than a chapter that was established and then explored.
  if (!img) return <ProceduralScene title={index === 0 ? title : ""} t={t} colour={colour} anchor={anchor} index={index} />;

  return (
    <AbsoluteFill style={{ backgroundColor: colour, overflow: "hidden" }}>
      <Img
        src={staticFile(img)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${ox}%, ${oy}%)`,
        }}
      />
      {anchor === "frame" ? <YellowStrips /> : null}
    </AbsoluteFill>
  );
};

/**
 * Cutaway to the mascot reacting. Costs nothing to generate — it draws on the
 * pose library — and it is what stops a chapter being one continuous stare at
 * the same picture.
 */
const MascotCut: React.FC<{
  pose: Pose;
  t: number;
  colour: string;
  anchor: YellowAnchor;
  index: number;
}> = ({ pose, t, colour, anchor, index }) => {
  const flip = index % 2 === 1;
  return (
    <AbsoluteFill style={{ backgroundColor: anchor === "world" ? YELLOW : colour, overflow: "hidden" }}>
      {/* far layer — flat black silhouettes, where the old spec survives */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: -40,
          width: "calc(100% + 80px)",
          height: 240,
          backgroundColor: BLACK,
          clipPath:
            "polygon(0% 62%, 11% 62%, 11% 34%, 24% 34%, 24% 70%, 38% 70%, 38% 22%, 52% 22%, 52% 54%, 66% 54%, 66% 38%, 80% 38%, 80% 68%, 100% 68%, 100% 100%, 0% 100%)",
        }}
      />
      <AbsoluteFill style={{ transform: `scale(${1.04 + t * 0.05})` }}>
        <Mascot pose={pose} height={780} x={flip ? "32%" : "68%"} boil={1} />
      </AbsoluteFill>
      {anchor === "frame" ? <YellowStrips /> : null}
    </AbsoluteFill>
  );
};

/**
 * A line of his own writing, full frame, hard cut. Two seconds of "NOBODY
 * CARES" does more than any amount of drift — and it costs nothing.
 * Profanity is masked automatically; the VO stays uncensored.
 */
const TextCard: React.FC<{ line: string; t: number; colour: string }> = ({ line, t, colour }) => (
  <AbsoluteFill
    style={{
      backgroundColor: BLACK,
      justifyContent: "center",
      alignItems: "center",
      padding: "0 8%",
    }}
  >
    <div
      style={{
        fontFamily,
        fontSize: 150,
        lineHeight: 0.95,
        color: YELLOW,
        textAlign: "center",
        textTransform: "uppercase",
        transform: `scale(${1 + t * 0.03})`,
      }}
    >
      {censor(line)}
    </div>
  </AbsoluteFill>
);

/** The yellow beat between sections — the palate cleanser. */
const YellowBeat: React.FC<{ title: string; t: number }> = ({ title, t }) => (
  <AbsoluteFill
    style={{ backgroundColor: YELLOW, justifyContent: "center", alignItems: "center", padding: "0 8%" }}
  >
    <div
      style={{
        fontFamily,
        fontSize: 132,
        lineHeight: 0.96,
        color: BLACK,
        textAlign: "center",
        textTransform: "uppercase",
        transform: `scale(${1 + t * 0.02})`,
      }}
    >
      {title}
    </div>
  </AbsoluteFill>
);

/**
 * Fallback when a chapter has no generated image. Built to the colour system —
 * three depth layers, one scene colour, yellow entering by the chosen anchor —
 * so a missing image degrades to something on-brand instead of a hole.
 */
const ProceduralScene: React.FC<{
  title: string;
  t: number;
  colour: string;
  anchor: YellowAnchor;
  index: number;
}> = ({ title, t, colour, anchor, index }) => (
  <AbsoluteFill style={{ backgroundColor: anchor === "world" ? YELLOW : colour, overflow: "hidden" }}>
    {/* far — black silhouette */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: -60,
        width: "calc(100% + 120px)",
        height: 300,
        backgroundColor: BLACK,
        clipPath:
          "polygon(0% 58%, 8% 58%, 8% 30%, 19% 30%, 19% 64%, 31% 64%, 31% 18%, 43% 18%, 43% 50%, 56% 50%, 56% 34%, 68% 34%, 68% 66%, 80% 66%, 80% 40%, 100% 40%, 100% 100%, 0% 100%)",
      }}
    />
    {/* mid — the scene colour as flat shapes with black outline */}
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: "8%",
        width: 420,
        height: 210,
        backgroundColor: anchor === "world" ? colour : YELLOW,
        border: `7px solid ${BLACK}`,
      }}
    />
    {/* near — the mascot, fully rendered, never recoloured.
        Framing varies per shot so consecutive cuts are different pictures
        rather than the same drawing nudged sideways. */}
    <AbsoluteFill
      style={{
        transform: `scale(${(index === 0 ? 1.0 : 1.16 + (index % 3) * 0.09) + t * 0.04})`,
      }}
    >
      <Mascot
        pose="standing"
        height={index === 0 ? 620 : 700 + (index % 3) * 60}
        x={index % 2 === 0 ? "76%" : "26%"}
        boil={1}
      />
    </AbsoluteFill>

    {title ? (
      <div
        style={{
          position: "absolute",
          top: "14%",
          left: "6%",
          width: "60%",
          fontFamily,
          fontSize: 122,
          lineHeight: 0.98,
          color: anchor === "world" ? BLACK : YELLOW,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
    ) : null}
    {anchor === "frame" ? <YellowStrips /> : null}
  </AbsoluteFill>
);

/** Cold-open frame, per FIXED-1 in joke-lab/fixed_assets.md. */
export const ColdOpen: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Mascot pose="bust" height={620} x="76%" boil={1} />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: "14%", left: "6%", fontFamily, fontSize: 210, lineHeight: 0.9, color: BLACK }}>
        JOKE
        <br />
        LAB
      </div>
      <div style={{ position: "absolute", top: "62%", left: "6.5%", fontFamily, fontSize: 58, color: BLACK }}>
        I COULD BE WRONG
      </div>
    </AbsoluteFill>
  );
};

/**
 * Closing card — inverted, matching the CTA family.
 *
 * The generated card is the real one: `images/fixed/sermon_end_card.png`, which
 * keeps its right half empty on purpose so YouTube's end-screen elements have
 * somewhere to sit. The procedural version below is the fallback, so an episode
 * still ships if the asset is missing.
 */
export const ClosingCard: React.FC<{ img?: string }> = ({ img }) => {
  if (img) {
    return (
      <AbsoluteFill style={{ backgroundColor: BLACK }}>
        <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: BLACK, justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily, fontSize: 190, lineHeight: 0.94, color: YELLOW, textAlign: "center" }}>
        I COULD BE WRONG
      </div>
    </AbsoluteFill>
  );
};
