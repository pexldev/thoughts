import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, OFF_WHITE, YELLOW, censor } from "../brand";

const { fontFamily } = loadFont();

export type CaptionWord = { text: string; startFrame: number; endFrame: number };

/**
 * The caption bar — on screen for the whole episode.
 *
 * ── Why continuous, after so long spent NOT doing this ──
 *
 * Type was rationed at first: a handful of lines a chapter, on the sentences
 * that carried the chapter, on the reasoning that a subtitle running for
 * fifteen minutes is noise for someone listening with the screen off. Rationing
 * it meant the plate sat alone for up to twenty seconds at a time, and every
 * attempt to fix THAT — drifting the plate, cropping it into fake shots,
 * boiling it, dropping long lines in as ad-hoc "over" cards — was a way of
 * avoiding the obvious answer. He got there first: subtitles the whole time,
 * and the black cards on top of them as emphasis.
 *
 * That also collapses two devices into one. The old `over` variant existed to
 * put a line over the picture without cutting away; this does that permanently
 * and better, so `over` is gone.
 *
 * ── ONE WORD AT A TIME ──
 *
 * Only the live word is at full strength. Everything else on the bar drops to
 * 30% — present enough to hold the sentence together, faint enough to stop
 * competing for attention with the word actually being said.
 *
 * A word that has NOT been said yet is still hidden entirely, not greyed. That
 * distinction is the whole reason this reads as punchy: the hard arrival — a
 * word absent on frame N and complete on frame N+1 — is the event. Showing the
 * full chunk greyed from the start and only moving the highlight would remove
 * every arrival in the episode and leave a karaoke line. So a word ARRIVES hard
 * at full strength, and then recedes to 30% as the next one takes over.
 *
 * ── The rules that survived from the punch cards ──
 *
 * NO FADE — a word is absent on frame N and complete on N+1. THE LIVE WORD
 * INVERTS rather than tints. ONE CONTINUOUS BAR, never a box per word, which
 * fragmented the line into a picket fence. And it never wraps, because it never
 * holds more than four words at a time.
 *
 * ── Colour ──
 *
 * The bar started black with acid yellow type and the live word inverted to a
 * black-on-yellow slab. Legal, but it spends the yellow on the whole line, and
 * the colour system was reversed in August precisely against that: ACID YELLOW
 * IS THE SIGNATURE, NOT THE WALLPAPER. A line that is entirely yellow has no
 * yellow left to travel with.
 *
 * So the line is off-white `#F7F3E8` — slot 5 of the system, there exactly to
 * stop a frame going muddy — and the yellow is spent on ONE word, the one in
 * his mouth. It reads harder than the old version rather than softer, because
 * the highlight is now the only bright thing in the bar.
 *
 * `barColor` fills the bar with the CHAPTER'S OWN scene colour, black-outlined,
 * the way the mid layer works everywhere else in the system. One scene colour
 * per chapter, never two, so the bar is compliant by construction and the
 * colour change lands on the section break — which is the job the scene colours
 * were given in the first place.
 *
 * Yellow stays the brightest thing in every frame, which is non-negotiable.
 *
 * ── Transparency ──
 *
 * The bar fill is ~75% opaque, not solid. At full opacity it is a hard block
 * sitting on the artwork and it hides whatever the plate was doing behind it —
 * which on the busier rooms is a real amount of drawing. Letting the plate read
 * through keeps it feeling like a layer ON the picture rather than a hole cut
 * out of it.
 *
 * Only the FILL is transparent. The words stay fully opaque and the black
 * outline stays solid — the outline is what separates the bar from a plate in
 * the same colour family, and softening it would undo that.
 *
 * ── Where it sits ──
 *
 * LOW, just above the baked chapter title. That strip is the only safe ground
 * on his plates: the top belongs to the SERMON stamp and the mascot's head, the
 * bottom to the title band, and what is left between his feet and that title is
 * furniture and floor. Covering furniture costs nothing.
 *
 * Position is computed off HEIGHT explicitly — a percentage padding-bottom in
 * CSS resolves against WIDTH, which on a 16:9 frame silently put an earlier
 * version of this bar across the mascot's chest.
 */

/**
 * Where the bar's floor sits, as a fraction of frame height from the bottom.
 *
 * MEASURED, not chosen. The baked title band is not the same height on every
 * plate — across the nine corporate plates its top edge runs from 93.3% (ch4)
 * all the way up to 73.3% (ch9). A floor of 0.23 (i.e. 77% down the frame) was
 * quietly sitting ON the band for five of the nine.
 *
 * So it clears the TALLEST band, not the average one, with 2% to spare. Re-run
 * the measurement for a new episode's plates before trusting this number.
 */
export const BAR_BOTTOM = 0.29;

/**
 * How far a word recedes once it is no longer the one in his mouth. Low enough
 * to stop competing, high enough that the line still reads as a sentence.
 */
const SPENT_OPACITY = 0.3;

/**
 * Opacity of the bar FILL only. Low enough to let the plate read through, high
 * enough that off-white words at 30% still separate from the artwork behind
 * them. The outline and the type stay fully opaque.
 */
const BAR_ALPHA = 0.75;

/** #RRGGBB -> rgba(), so the fill can be softened without touching the text. */
const withAlpha = (hex: string, a: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Characters per chunk. Keeps one bar on one line at a readable size. */
const MAX_CHARS = 22;
const MAX_WORDS = 4;

export function chunkWords(words: readonly CaptionWord[], maxWords = MAX_WORDS) {
  const chunks: Array<{ from: number; to: number }> = [];
  let cursor = 0;
  while (cursor < words.length) {
    let n = 0;
    let chars = 0;
    while (cursor + n < words.length && n < maxWords) {
      const len = words[cursor + n].text.length + 1;
      if (n > 0 && chars + len > MAX_CHARS) break;
      chars += len;
      n++;
    }
    chunks.push({ from: cursor, to: cursor + n });
    cursor += n;
  }
  return chunks;
}

export const CaptionBar: React.FC<{
  words: readonly CaptionWord[];
  size?: number;
  /** fraction of frame height between the bar's floor and the bottom edge */
  bottom?: number;
  /** bar fill. Black, or the chapter's scene colour (which gets a black outline). */
  barColor?: string;
  /** the resting word colour */
  textColor?: string;
}> = ({ words, size = 100, bottom = BAR_BOTTOM, barColor = BLACK, textColor = OFF_WHITE }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  if (!words.length || frame < words[0].startFrame) return null;

  const chunks = chunkWords(words);

  // The chunk on screen is the LAST one to have started, so the bar holds
  // through the pause after its final word instead of blinking out.
  let active = chunks[0];
  for (const c of chunks) if (frame >= words[c.from].startFrame) active = c;

  const slice = words.slice(active.from, active.to);

  // EXACTLY ONE word is live. Whisper sets each word's end to the next word's
  // start, so on a boundary frame two adjacent words both qualify and both
  // light up — which reads as a fault and stops the highlight travelling.
  const started = slice.filter((w) => w.startFrame <= frame);
  const liveIdx =
    started.length && frame <= slice[started.length - 1].endFrame ? started.length - 1 : -1;

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", bottom: height * bottom, maxWidth: "88%" }}>
        <div
          style={{
            backgroundColor: withAlpha(barColor, BAR_ALPHA),
            // A scene-coloured bar takes the black outline the mid layer takes
            // everywhere else, so it still separates from a plate in the same
            // colour family.
            // A HEAVY black outline, not a hairline. The depth rule already
            // says the mid layer is scene colour, flat fill, black outline —
            // and on the plates where the bar shares its colour with the room,
            // that outline is the only thing separating them. 6px was not
            // enough on ch7/ch9; this is.
            border: barColor === BLACK ? "none" : `${Math.round(size * 0.13)}px solid ${BLACK}`,
            padding: "0.14em 0.26em",
            display: "flex",
            gap: "0 0.28em",
            fontFamily,
            fontSize: size,
            lineHeight: 1.0,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {slice.map((w, i) => {
            const t = frame - w.startFrame;
            const s = spring({
              frame: t,
              fps,
              // Damped, not springy: the word settles onto the bar rather than
              // bouncing on it. Anything livelier reads as shake over a whole
              // episode, which he has rejected once already.
              config: { damping: 14, stiffness: 300, mass: 0.42 },
              durationInFrames: 14,
            });
            const scale = t < 0 ? 1 : 1.14 - s * 0.14;
            const live = i === liveIdx;
            return (
              <span
                key={`${w.startFrame}-${i}`}
                style={{
                  display: "inline-block",
                  // Held but not yet spoken. The bar is its full width from the
                  // first frame of the chunk, so it never grows word by word —
                  // on a solid bar that reads as the bar itself twitching.
                  visibility: t < 0 ? "hidden" : "visible",
                  // Said, but no longer the one being said: recede.
                  opacity: live ? 1 : SPENT_OPACITY,
                  transform: `scale(${scale})`,
                  transformOrigin: "50% 60%",
                  color: live ? BLACK : textColor,
                  backgroundColor: live ? YELLOW : "transparent",
                  padding: "0 0.1em",
                }}
              >
                {censor(w.text)}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
