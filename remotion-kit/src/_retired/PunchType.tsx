import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import { BLACK, YELLOW, censor } from "../brand";
import type { TimedWord } from "../cutplan";
import { held } from "../stopmotion";

const { fontFamily } = loadFont();

/** Characters per `over` chunk. Keeps one bar on one line at a readable size. */
const OVER_MAX_CHARS = 22;

/**
 * A line of HIS writing, typed on by the voice. One word, one word, one word.
 *
 * This is not a subtitle. A subtitle exists to be readable and gets out of the
 * way; this exists to HIT, so it breaks every rule a subtitle follows — it is
 * enormous and it holds one line at a time.
 *
 * It is also THE EDIT. A card is a genuinely different picture, so cutting to
 * one is a real cut in a way that cropping the chapter plate never was. Which
 * lines get it is decided at build time by scripts/punch-lines.mjs, never by
 * hand: it picks his SHORT sentences, because that is how he writes — the setup
 * runs long and conversational and the punch lands two or three words hard
 * against it.
 *
 * ══════════════════════════════════════════════════════════════════
 *  What actually makes it land — four things, in order of importance
 * ══════════════════════════════════════════════════════════════════
 *
 * 1 · NO FADE. A word is absent on frame N and complete on frame N+1. Every
 *     fade, however fast, spreads the event over time and an event spread over
 *     time is not an event. This is the whole trick; the rest is decoration.
 *
 * 2 · OVERSHOOT. The word arrives at ~1.3x and springs back past 1.0 before it
 *     settles, in about five frames. That bounce is what your eye reads as
 *     force — it is the difference between a word appearing and a word landing.
 *
 * 3 · ONE WORD AT A TIME. Only the live word is at full strength; a word
 *     already said drops to 30%, so it holds the line together without
 *     competing with the word being said. A word NOT yet said stays hidden
 *     entirely rather than greyed — greying the whole line from the start would
 *     remove every arrival and leave a karaoke card.
 *
 * 4 · INVERSION ON THE LIVE WORD. Yellow type on black, and the word currently
 *     in his mouth flips to black type on a yellow slab. The highlight has to
 *     INVERT, never tint — a brightness change is invisible at feed size and
 *     invisible on a phone across the room.
 *
 * And one thing that has to NOT happen: THE LINE MUST NOT MOVE SIDEWAYS AS IT
 * FILLS. Letting the flex box re-centre on each arrival makes a two-word line
 * jump left and a six-word line shuffle continuously, which turns the effect
 * from a hit into a wobble. The two variants solve it differently, and they
 * have to:
 *
 *   card — CENTRED, so an unspoken word is hidden but still holds its slot and
 *          every word lands in its final position. The reserved gaps are
 *          invisible because the ground is plain black either way.
 *
 *   over — CHUNKED. See below; it never lays out a whole line at once, so it
 *          never reflows either.
 *
 * ── The `over` rewrite, 23 Aug ──
 *
 * `over` was trying to be two incompatible things: a punch (big, hard, short)
 * and a subtitle (long, small, readable). Handed a thirteen-word filler it
 * could only be the second, and it was a bad one — the line wrapped to a
 * two-word orphan, every word carried its own black box so it read as a picket
 * fence instead of one object, it collided with the SERMON stamp in the corner,
 * it cut across the mascot's head, and it had been shrunk to 62px to fit at
 * all. His words: hardly visible, not punchy, something is wrong.
 *
 * The answer is not to make a long line fit. It is to STOP SHOWING A LONG LINE
 * AT ONCE. Words are chunked into threes and fours and the chunks play in
 * sequence, so every chunk is short — which means every chunk can be big, can
 * sit on ONE continuous bar, and can never wrap. A thirteen-word line becomes
 * four big beats instead of one small paragraph.
 *
 * The bar sits LOW, just above the baked title band, and that is the one place
 * on his plates that is safe: the top belongs to the SERMON stamp and to the
 * mascot's head, and the bottom belongs to the chapter title. The strip between
 * his knees and that title is furniture and floor, and covering furniture costs
 * nothing.
 *
 * Timing comes from the recording, so it cannot drift: whisper supplies the
 * clock, the script supplies every word that reaches the screen (whisper's
 * spelling never does — it mangles exactly the words that matter). The two are
 * matched in findPhraseWords() in Episode.tsx.
 */

export type PunchTypeProps = {
  /** the words of the line, with the frames HE says them, rebased to local 0 */
  words: readonly TimedWord[];
  /** the script's own spelling, in order — what actually gets drawn */
  display: readonly string[];
  size?: number;
  /**
   * "card"  — full frame, black, the line alone. The hardest available beat.
   * "over"  — burned over the picture, lower third, for a line you want to
   *           punch without cutting away from what he's describing.
   */
  variant?: "card" | "over";
  /** stop-motion hold, in frames. 1 = smooth. See src/stopmotion.ts. */
  hold?: number;
};

export const PunchType: React.FC<PunchTypeProps> = ({
  words,
  display,
  size = 148,
  variant = "card",
  hold = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // EXACTLY ONE word is live, ever.
  //
  // Whisper does not leave gaps: it sets each word's end to the next word's
  // start, so on the boundary frame two adjacent words both satisfy
  // start <= frame <= end and both light up. Two inverted slabs side by side
  // read as a render fault, and the highlight stops travelling. So the live
  // word is the LAST one to have started, and only while its own span holds.
  const started = words.filter((w) => w.startFrame <= frame);
  const liveIdx =
    started.length && frame <= words[started.length - 1].endFrame ? started.length - 1 : -1;

  const reserve = true; // the card reserves its slots so the line never re-centres

  const body = (
    <div
      style={{
        fontFamily,
        fontSize: size,
        lineHeight: 1.06,
        textAlign: reserve ? "center" : "left",
        textTransform: "uppercase",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: reserve ? "center" : "flex-start",
        alignItems: "baseline",
        gap: reserve ? "0 0.3em" : "0.1em 0.24em",
      }}
    >
      {words.map((w, i) => {
        const t = frame - w.startFrame;

        // NOT YET SPOKEN: invisible, but still holding its place in the line.
        // Not dimmed — a ghosted preview of the punchline hands the joke to the
        // viewer before he says it, which is the one thing a punchline cannot
        // survive.
        const pending = t < 0;
        // over: not laid out at all until spoken. card: hidden but holding its slot.
        if (pending && !reserve) return null;

        const s = spring({
          frame: hold > 1 ? held(t, hold) : t,
          fps,
          // Damped, not springy. The word settles onto the line instead of
          // bouncing on it — the difference between "lands" and "vibrates".
          config: { damping: 14, stiffness: 300, mass: 0.42 },
          durationInFrames: 14,
        });
        // 1.18 -> 1.0. Enough to register as arrival, not enough to be motion.
        const scale = 1.18 - s * 0.18;

        const live = i === liveIdx;

        return (
          <span
            key={`${w.startFrame}-${i}`}
            style={{
              display: "inline-block",
              visibility: pending ? "hidden" : "visible",
              opacity: live ? 1 : 0.3,
              transform: `scale(${pending ? 1 : scale})`,
              transformOrigin: "50% 60%",
              color: live ? BLACK : YELLOW,
              // Over the artwork each word carries its OWN black plate — his
              // line work runs straight through unbacked type. On the card the
              // ground is already black, so it only needs the live inversion.
              backgroundColor: live ? YELLOW : reserve ? "transparent" : BLACK,
              padding: "0.02em 0.12em",
              whiteSpace: "pre",
            }}
          >
            {censor(display[i] ?? w.text)}
          </span>
        );
      })}
    </div>
  );

  if (variant === "over") {
    // Chunks of three or four, capped on CHARACTERS as well as words — "I" and
    // "certification" are not the same amount of bar.
    const chunks: Array<{ from: number; to: number }> = [];
    let cursor = 0;
    while (cursor < words.length) {
      let n = 0;
      let chars = 0;
      while (cursor + n < words.length && n < 4) {
        const len = (display[cursor + n] ?? words[cursor + n].text).length + 1;
        if (n > 0 && chars + len > OVER_MAX_CHARS) break;
        chars += len;
        n++;
      }
      chunks.push({ from: cursor, to: cursor + n });
      cursor += n;
    }

    // The chunk on screen is the LAST one to have started — so the bar holds
    // through the gap after its final word instead of blinking out.
    let active = chunks[0];
    for (const c of chunks) if (frame >= words[c.from].startFrame) active = c;

    const slice = words.slice(active.from, active.to);
    const shown = display.slice(active.from, active.to);
    if (frame < words[0].startFrame) return null;

    return (
      // Positioned off HEIGHT, explicitly. A percentage padding-bottom in CSS
      // resolves against the container's WIDTH — so "22%" put the bar at 60% of
      // a 16:9 frame, straight across the mascot's chest, rather than down in
      // the furniture where it was aimed. His baked title band starts at ~78%,
      // so the bar's floor is just above it.
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div style={{ position: "absolute", bottom: height * 0.23, maxWidth: "88%" }}>
        {/* ONE continuous bar. Per-word boxes fragmented the line into a picket
            fence and were most of why it read as unreadable. */}
        <div
          style={{
            backgroundColor: BLACK,
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
              config: { damping: 14, stiffness: 300, mass: 0.42 },
              durationInFrames: 14,
            });
            const scale = t < 0 ? 1 : 1.18 - s * 0.18;
            const live = active.from + i === liveIdx;
            return (
              <span
                key={`${w.startFrame}-${i}`}
                style={{
                  display: "inline-block",
                  // Held in place but not yet spoken: the bar is already its
                  // full width so it does not grow word by word, which on a
                  // solid bar reads as the bar itself twitching.
                  visibility: t < 0 ? "hidden" : "visible",
                  transform: `scale(${scale})`,
                  transformOrigin: "50% 60%",
                  color: live ? BLACK : YELLOW,
                  backgroundColor: live ? YELLOW : "transparent",
                  padding: "0 0.1em",
                }}
              >
                {censor(shown[i] ?? w.text)}
              </span>
            );
          })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // NO BACKGROUND HERE, deliberately. A card's black ground belongs to the RUN
  // that contains it (see groupRuns in Episode.tsx), so that several lines in a
  // row sit on one continuous black instead of each repainting it — which is
  // what made consecutive cards strobe.
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 7%" }}>
      {body}
    </AbsoluteFill>
  );
};
