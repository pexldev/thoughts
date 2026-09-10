import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { CTA_COPY, SAFE, YELLOW } from "../brand";
import { FilmTreatment } from "./FilmTreatment";

const { fontFamily } = loadFont();

/**
 * The standing CTA end slide, per joke-lab/fixed_assets.md.
 *
 * Black is doing a job here: every frame before it is full-bleed acid yellow,
 * so a yellow card reads as one more frame and gets scrolled through. Black is
 * a hard full stop.
 *
 * Copy is locked to two strings and there is no episode number — that is what
 * makes it reusable on every reel.
 *
 * Keep it short. On a 30s reel every extra card-second is ~3% of runtime, and
 * the outro breath is what burns loop rate.
 */
export const CTACard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  const settle = interpolate(enter, [0, 1], [1.04, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${settle})`,
          opacity: enter,
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: `${SAFE.side * 100}%`,
          paddingRight: `${SAFE.side * 100}%`,
        }}
      >
        {/* the instruction */}
        <div
          style={{
            fontFamily,
            color: YELLOW,
            fontSize: 62,
            lineHeight: 1.12,
            textAlign: "center",
            textTransform: "uppercase",
            marginBottom: height * 0.035,
          }}
        >
          {CTA_COPY.instruction.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>

        {/* the only thing they have to remember */}
        <div
          style={{
            fontFamily,
            color: YELLOW,
            fontSize: 208,
            lineHeight: 0.94,
            textAlign: "center",
            letterSpacing: -3,
            textTransform: "uppercase",
          }}
        >
          {CTA_COPY.channel.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>

        <PlayButton style={{ marginTop: height * 0.035 }} />
      </AbsoluteFill>

      {/*
        Stamp sits TOP-right on this card only. Everywhere else it lives
        bottom-right — but IG's UI covers the bottom of a reel, and this is the
        one card whose whole job is being read.
      */}
      <Stamp />

      <FilmTreatment intensity={0.45} />
    </AbsoluteFill>
  );
};

const PlayButton: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width={86} height={62} viewBox="0 0 86 62" style={style}>
    <rect x="1.5" y="1.5" width="83" height="59" rx="16" fill="none" stroke={YELLOW} strokeWidth="5" />
    <path d="M34 19 L60 31 L34 43 Z" fill={YELLOW} />
  </svg>
);

const Stamp: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: "7%",
      right: "7%",
      transform: "rotate(12deg)",
      border: `5px solid ${YELLOW}`,
      borderRadius: 6,
      padding: "10px 20px",
      fontFamily,
      color: YELLOW,
      fontSize: 40,
      letterSpacing: 2,
      opacity: 0.92,
    }}
  >
    JOKE LAB
  </div>
);
