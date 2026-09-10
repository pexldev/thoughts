/**
 * Turns a chapter's frame range into a list of shot boundaries.
 *
 * The gap between a slideshow and a cut video is event density: a professional
 * long-form cut changes what you're looking at every 5–15 seconds. One image
 * held for two minutes reads as a podcast with a cover image, however nicely it
 * drifts.
 *
 * Cuts are placed on a target interval but SNAPPED to the nearest pause in the
 * speech, so an edit lands where he breathes rather than mid-word. That is most
 * of what makes a cut feel deliberate instead of mechanical.
 */

export type TimedWord = { text: string; startFrame: number; endFrame: number };

export function cutPlan(
  startFrame: number,
  endFrame: number,
  words: TimedWord[],
  opts?: { targetSec?: number; minSec?: number; fps?: number }
): number[] {
  const { targetSec = 8, minSec = 3.5, fps = 30 } = opts ?? {};
  const target = targetSec * fps;
  const min = minSec * fps;

  const inRange = words
    .filter((w) => w.startFrame >= startFrame && w.endFrame <= endFrame)
    .sort((a, b) => a.startFrame - b.startFrame);

  // No words (music, a pause, a gap in the transcript): fall back to an even
  // split so the shot still changes rather than sitting frozen.
  if (inRange.length < 2) {
    const cuts: number[] = [startFrame];
    for (let f = startFrame + target; f < endFrame - min; f += target) cuts.push(f);
    return cuts;
  }

  // Candidate pause points, weighted by how much silence we can infer.
  //
  // Whisper does NOT leave gaps between words: it sets each word's end to the
  // next word's start, so a real breath is absorbed into the PRECEDING word's
  // span rather than sitting between two words. Measuring only
  // start[i] - end[i-1] found 10 usable pauses in 867 words on the corporate
  // episode and ONE in 113 on reel2 — which starved the loop below and
  // collapsed every chapter to a single held frame. That was silently true of
  // every cut this pipeline made before 21 Aug 2026.
  //
  // Three signals, strongest first:
  //   - a genuine gap, on the rare occasions whisper leaves one
  //   - a word that ran far longer than its letters need, i.e. he held it
  //   - the previous word ending a sentence
  const FRAMES_PER_CHAR = 1.6; // ~19 chars/sec, ordinary speaking pace
  const gaps: Array<{ frame: number; size: number }> = [];

  for (let i = 1; i < inRange.length; i++) {
    const prev = inRange[i - 1];
    const realGap = inRange[i].startFrame - prev.endFrame;

    const letters = prev.text.replace(/[^A-Za-z0-9']/g, "").length;
    const spoken = Math.max(3, letters * FRAMES_PER_CHAR);
    const held = prev.endFrame - prev.startFrame - spoken;

    const sentenceEnd = /[.!?]["']?$/.test(prev.text) ? 8 : /,["']?$/.test(prev.text) ? 3 : 0;

    const size = Math.max(realGap, 0) + Math.max(held, 0) + sentenceEnd;
    if (size > 0) gaps.push({ frame: inRange[i].startFrame, size });
  }

  const cuts = [startFrame];
  let next = startFrame + target;

  while (next < endFrame - min) {
    // the best pause near where a cut is due — biggest gap wins, and closeness
    // to the target breaks ties, so pacing stays even without cutting on a word
    const window = target * 0.45;
    const candidates = gaps.filter(
      (g) => Math.abs(g.frame - next) <= window && g.frame - cuts[cuts.length - 1] >= min
    );

    if (candidates.length) {
      candidates.sort(
        (a, b) => b.size - a.size || Math.abs(a.frame - next) - Math.abs(b.frame - next)
      );
      cuts.push(candidates[0].frame);
      next = candidates[0].frame + target;
    } else {
      // no pause to land on — hold and try again a little later rather than
      // forcing a cut through the middle of a sentence
      next += Math.round(target * 0.35);
    }
  }

  return cuts;
}

/**
 * Assigns a shot TYPE to each cut, so a chapter alternates between looking at
 * the world and looking at him instead of grinding through one device.
 *
 * The rhythm is deliberate: the chapter image carries most of it, the mascot
 * cuts in to react, and a text card lands only where the writing earns it.
 */
export type ShotKind = "image" | "mascot" | "text" | "beat";

export function assignKinds(count: number, opts?: { textAt?: number[] }): ShotKind[] {
  const textAt = new Set(opts?.textAt ?? []);
  const out: ShotKind[] = [];

  for (let i = 0; i < count; i++) {
    if (textAt.has(i)) {
      out.push("text");
      continue;
    }
    // open on the world, then alternate with a mascot reaction every third shot
    out.push(i === 0 ? "image" : i % 3 === 2 ? "mascot" : "image");
  }
  return out;
}
