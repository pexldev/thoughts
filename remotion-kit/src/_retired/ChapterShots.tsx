import React from "react";
import { Sequence } from "remotion";
import type { Chapter } from "../Episode";
import { assignKinds, cutPlan, TimedWord } from "../cutplan";
import { Pose } from "./Mascot";
import { Shot } from "./ChapterFrame";

/** Poses cycled through for mascot cutaways, so reactions don't repeat back to back. */
const REACTION_POSES: Pose[] = ["chin", "lookaway", "bust", "standing", "mug"];

/**
 * Explodes one chapter into its shots.
 *
 * This is the piece that turns a slideshow into a cut: cutPlan() finds the
 * pauses in the speech, assignKinds() alternates between looking at the world
 * and looking at him, and each resulting shot becomes its own Sequence.
 */
export const ChapterFrameShots: React.FC<{
  chapter: Chapter;
  from: number;
  to: number;
  words: TimedWord[];
  targetSec: number;
  chapterIndex: number;
}> = ({ chapter, from, to, words, targetSec, chapterIndex }) => {
  const cuts = cutPlan(from, to, words, { targetSec });

  // spread the chapter's punch lines across its shots rather than clustering
  // them at the start
  const lines = chapter.punchLines ?? [];
  const textAt = lines.map((_, i) =>
    Math.max(1, Math.round(((i + 1) * cuts.length) / (lines.length + 1)))
  );
  const kinds = assignKinds(cuts.length, { textAt });

  let lineCursor = 0;

  return (
    <>
      {cuts.map((start, i) => {
        const end = i + 1 < cuts.length ? cuts[i + 1] : to;
        const duration = Math.max(1, end - start);
        const kind = kinds[i];
        const line = kind === "text" ? lines[lineCursor++] : undefined;

        return (
          <Sequence
            key={i}
            from={start}
            durationInFrames={duration}
            name={`${chapterIndex + 1}.${i + 1} ${kind}`}
          >
            <Shot
              kind={kind}
              durationInFrames={duration}
              index={i}
              title={chapter.title}
              scene={chapter.scene ?? "sarkariGreen"}
              anchor={chapter.anchor ?? "frame"}
              img={chapter.img}
              pose={REACTION_POSES[(chapterIndex + i) % REACTION_POSES.length]}
              line={line}
            />
          </Sequence>
        );
      })}
    </>
  );
};
