import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, SAFE, YELLOW, censor } from "../brand";

const { fontFamily } = loadFont();

export type TimedWord = {
  text: string;
  beat: number;
  startFrame: number;
  endFrame: number;
};

/**
 * Captions keyed to the spoken word, not to a guess.
 *
 * Words are grouped into short chunks — a full sentence on a vertical frame is
 * a wall, and the muted viewer bails on walls. Each chunk holds while its own
 * words are being said, and the word currently in his mouth is highlighted, so
 * the frame stays alive between cuts.
 */
export const SyncedCaption: React.FC<{
  words: TimedWord[];
  /** words per on-screen chunk */
  chunk?: number;
  size?: number;
  top?: number | string;
  highlight?: string;
  /**
   * Paints a solid yellow plate behind the words. Needed whenever the caption
   * sits over artwork — the line work in the scene images runs straight
   * through black type otherwise.
   */
  plate?: boolean;
}> = ({ words, chunk = 3, size = 104, top, highlight = YELLOW, plate = false }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  if (words.length === 0) return null;

  const chunks: TimedWord[][] = [];
  for (let i = 0; i < words.length; i += chunk) chunks.push(words.slice(i, i + chunk));

  const active =
    chunks.find((c) => frame >= c[0].startFrame && frame <= c[c.length - 1].endFrame) ??
    (frame < chunks[0][0].startFrame ? chunks[0] : chunks[chunks.length - 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: top ?? height * SAFE.top,
        left: `${SAFE.side * 100}%`,
        width: `${(1 - SAFE.side * 2) * 100}%`,
        textAlign: "center",
        fontFamily,
        fontSize: size,
        lineHeight: 1.04,
        color: BLACK,
        textTransform: "uppercase",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 0.28em",
        ...(plate
          ? {
              backgroundColor: YELLOW,
              padding: "0.16em 0.3em",
              width: "auto",
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: `${(1 - SAFE.side * 2) * 100}%`,
              borderRadius: 8,
            }
          : {}),
      }}
    >
      {active.map((w, i) => {
        const spoken = frame >= w.startFrame;
        const current = frame >= w.startFrame && frame <= w.endFrame;
        return (
          <span
            key={`${w.text}-${w.startFrame}-${i}`}
            style={{
              // The live word gets a black slab behind it and goes yellow —
              // the highlight has to invert, not tint. Yellow type on a yellow
              // field just reads as hollow.
              opacity: spoken ? 1 : 0.22,
              color: current ? highlight : BLACK,
              backgroundColor: current ? BLACK : "transparent",
              padding: current ? "0 0.1em" : "0 0.1em",
              transform: current ? "scale(1.04)" : "scale(1)",
              display: "inline-block",
            }}
          >
            {censor(w.text)}
          </span>
        );
      })}
    </div>
  );
};
