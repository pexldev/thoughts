import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, SAFE, censor } from "../brand";

const { fontFamily } = loadFont();

/**
 * Baked-in on-screen text. Nothing goes into Canva.
 * Profanity is masked automatically, so a script line pastes in raw.
 */
export const Caption: React.FC<{
  text: string;
  /** frame this line starts popping in */
  from?: number;
  size?: number;
  color?: string;
  top?: number | string;
  /** pop each word in turn instead of the whole line at once */
  perWord?: boolean;
  align?: "top" | "center" | "bottom";
}> = ({
  text,
  from = 0,
  size = 118,
  color = BLACK,
  top,
  perWord = true,
  align = "top",
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const units = perWord ? censor(text).split(/\s+/) : [censor(text)];

  const resolvedTop =
    top ??
    (align === "top"
      ? height * SAFE.top
      : align === "center"
      ? height * 0.34
      : height * (1 - SAFE.bottom) - size * units.length * 1.02);

  return (
    <div
      style={{
        position: "absolute",
        top: resolvedTop,
        left: `${SAFE.side * 100}%`,
        width: `${(1 - SAFE.side * 2) * 100}%`,
        textAlign: "center",
        fontFamily,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -1,
        color,
        textTransform: "uppercase",
      }}
    >
      {units.map((word, i) => {
        const s = spring({
          frame: frame - from - i * 5,
          fps,
          config: { damping: 13, mass: 0.5 },
        });
        return (
          <div
            key={`${word}-${i}`}
            style={{ transform: `scale(${0.86 + s * 0.14})`, opacity: s }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
};
