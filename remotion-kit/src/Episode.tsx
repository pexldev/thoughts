import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import { BLACK, OFF_WHITE, SCENE_COLOURS, type SceneColour } from "./brand";
import { CaptionBar, type CaptionWord } from "./components/CaptionBar";
import { PhraseStack, type Sentence } from "./components/PhraseStack";
import type { TimedWord } from "./cutplan";

/**
 * Long-form episode, 1920x1080.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  THE RULE: this composition renders ONLY what he supplies.
 * ══════════════════════════════════════════════════════════════════════
 *
 * Exactly two kinds of picture reach the screen:
 *
 *   1. his generated chapter plates, whole and unmoved
 *   2. his own lines, quoted from the recording, typed on by his voice
 *
 * No cold-open card, no mascot cutaways, no yellow beats, no procedural
 * fallback, no stored default assets. A chapter with no image is an ERROR TO
 * REPORT, not a hole for the renderer to fill with something it invented.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  CAPTIONS THROUGHOUT, CARDS ON TOP   (23 Aug 2026 — the settled shape)
 * ══════════════════════════════════════════════════════════════════════
 *
 * This composition has been wrong about motion three times and about type
 * twice, and every mistake was a way of avoiding the same obvious answer.
 *
 *   1. IT DRIFTED. A 1.03 → 1.00 zoom across a 40s chapter is 0.075% of
 *      movement a second — a still frame with a rounding error.
 *
 *   2. SO IT CUT — and the cuts were CROPS OF THE SAME PLATE. A crop of a
 *      picture is not a cut: the eye recognises the same image and reads it as
 *      camera wobble. A real cut changes the SUBJECT.
 *
 *   3. SO THE PLATE BOILED, to feel hand-drawn. On a cut-out that is right; on
 *      a full-bleed plate it twitches the whole world, baked title included,
 *      and leaves the eye no still edge. "Very very very very bad."
 *
 *   4. SO TYPE BECAME THE EDIT — his lines, typed on by his voice, cut against
 *      a still plate. Right idea, still rationed: a few lines a chapter, which
 *      left the plate alone for up to twenty seconds at a stretch.
 *
 *   5. SO LONG LINES WERE DROPPED IN TO FILL THE GAPS, shrunk to fit. They
 *      wrapped to orphans, fought the SERMON stamp, crossed the mascot's head.
 *      "Hardly visible, not punchy."
 *
 * Every one of those was an attempt to keep the screen alive while showing as
 * little text as possible. HE CALLED IT: subtitles the whole time, with the
 * black cards on top as emphasis. Two devices instead of six:
 *
 *   THE CAPTION BAR runs continuously — every word of the script, timed to the
 *   recording, chunked three or four at a time on one solid bar low in the
 *   frame. src/components/CaptionBar.tsx. It replaces the old `over` variant
 *   entirely, and it means the plate is never alone, so the gap-filling that
 *   produced those long shrunken lines is gone too.
 *
 *   EMPHASIS is not a separate device any more: a short verdict sentence simply
 *   comes up larger on its own page. The old full-frame punch card and its
 *   opening wipe are retired in src/_retired/.
 *
 * The plate does not move. Not a zoom, not a pan, not a crop, not a boil. The
 * only motion in a rendered episode is a word arriving and a card opening.
 *
 * boil() stays in src/stopmotion.ts for mascot cut-outs, where it belongs. The
 * rule it left behind: BOIL A CUT-OUT, NEVER BOIL THE FRAME.
 */

export type Chapter = {
  title: string;
  startFrame: number;
  endFrame: number;
  /** REQUIRED. Path under public/, e.g. "images/corpep/ch1_burndown.png". */
  img: string;
  /**
   * The chapter's scene colour, read off its generated plate — not chosen here.
   * One per chapter, never two, per prep/color_system.md. Used to tint the
   * caption bar, so the colour change lands on the section break.
   */
  scene?: SceneColour;
};

/**
 * One piece of type. Comes from src/timing/<name>.punch.json — resolved against
 * the recording at build time, in script order, so a repeated line lands on the
 * right repeat and a line that cannot be found is REPORTED rather than skipped
 * in silence. Never hand-authored here.
 */

/** One beat of the episode: either the plate alone, or his words alone. */
export type PageBeat = {
  kind: "art" | "text";
  chapter: number;
  startFrame: number;
  endFrame: number;
  sentences?: Sentence[];
  /** art beats only: index into `shots` */
  shot?: number;
};

export type EpisodeProps = {
  /** path under public/. Empty renders the visuals silently, for look tests. */
  audio: string;
  chapters: readonly Chapter[];
  /** word timings — the clock the type is cut to */
  words?: readonly TimedWord[];
  /** every word of the script, timed. scripts/align-script.mjs */
  captions?: readonly CaptionWord[];
  /** the alternating ART / TEXT beats. scripts/page-plan.mjs */
  pages?: readonly PageBeat[];
  /** words per phrase, from the episode's declared tempo */
  phraseWords?: number;
  /**
   * Pictures for individual art beats, keyed by the beat's `shot` index.
   * Anything missing falls back to the chapter plate — so the episode plays at
   * nine images and improves with every one added, rather than requiring a full
   * set before it works at all.
   */
  shots?: Record<number, string>;
  /**
   * Puts the old caption bar back over the artwork. Off by default: with the
   * text pages carrying every word, a bar on the plate is text interrupting art
   * rather than talking, which is the thing this format exists to stop.
   */
  captionBar?: boolean;
  /**
   * His generated end card, path under public/. Required — no default, because
   * a stored default is exactly how a fixed asset sneaks back into an episode.
   * Its right half is deliberately empty for YouTube's end-screen elements.
   */
  closingImg: string;
  closingFrames?: number;
};

/**
 * The chapter plate: exactly as he drew it, and completely still.
 *
 * There is deliberately no transform of any kind here — no overscan either,
 * which only ever existed to give the boil somewhere to move. At scale 1.0 the
 * frame is the artwork, which is the point.
 */
const Plate: React.FC<{ img: string }> = ({ img }) => (
  <AbsoluteFill style={{ backgroundColor: BLACK, overflow: "hidden" }}>
    <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);

export const Episode: React.FC<EpisodeProps> = ({
  audio,
  chapters,
  words = [],
  captions = [],
  pages = [],
  phraseWords = 4,
  shots = {},
  captionBar = false,
  captionStyle = "scene",
  closingImg,
  closingFrames = 120,
}) => {
  const last = chapters[chapters.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      {audio ? <Audio src={staticFile(audio)} /> : null}

      {/*
        No cold open. The episode starts on chapter 1's plate — the format's own
        rule is straight into it, no preamble.
      */}
      {/*
        The episode is a sequence of BEATS, alternating between the two states.
        Neither carries the other's content: art has nothing on it, text has
        nothing under it. scripts/page-plan.mjs decides the alternation, on
        sentence boundaries.
      */}
      {pages.map((beat, i) => {
        const dur = beat.endFrame - beat.startFrame;
        if (dur <= 0) return null;
        const chapter = chapters[beat.chapter];
        if (!chapter) return null;

        return (
          <Sequence
            key={i}
            from={beat.startFrame}
            durationInFrames={dur}
            name={`${beat.chapter + 1}.${beat.kind}`}
          >
            {beat.kind === "art" ? (
              <Plate img={(beat.shot !== undefined && shots[beat.shot]) || chapter.img} />
            ) : (
              <AbsoluteFill
                style={{
                  backgroundColor: chapter.scene ? SCENE_COLOURS[chapter.scene] : BLACK,
                }}
              >
                <PhraseStack
                  words={captions}
                  sentences={beat.sentences ?? []}
                  offset={beat.startFrame}
                  phraseWords={phraseWords}
                />
              </AbsoluteFill>
            )}
          </Sequence>
        );
      })}

      {/* The old bar, off unless asked for. */}
      {captionBar
        ? chapters.map((c, i) => {
            const next = chapters[i + 1];
            const end = next ? next.startFrame : last.endFrame;
            const from = i === 0 ? 0 : c.startFrame;
            if (end <= from) return null;
            const mine = captions
              .filter((w) => w.startFrame >= from && w.startFrame < end)
              .map((w) => ({ ...w, startFrame: w.startFrame - from, endFrame: w.endFrame - from }));
            return (
              <Sequence key={`cap${i}`} from={from} durationInFrames={end - from} name={`bar ${i + 1}`}>
                <CaptionBar
                  words={mine}
                  barColor={c.scene ? SCENE_COLOURS[c.scene] : BLACK}
                  textColor={OFF_WHITE}
                />
              </Sequence>
            );
          })
        : null}

      <Sequence from={last.endFrame} durationInFrames={closingFrames} name="closing">
        <AbsoluteFill style={{ backgroundColor: BLACK }}>
          <Img
            src={staticFile(closingImg)}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

export const episodeDuration = (chapters: readonly Chapter[], closingFrames = 120) =>
  chapters[chapters.length - 1].endFrame + closingFrames;
