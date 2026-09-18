import React from "react";
import { AbsoluteFill, Composition, Sequence, Series } from "remotion";
import { REEL } from "./brand";
import { Episode, episodeDuration } from "./Episode";
import { CTACard } from "./components/CTACard";
import { ReelScene } from "./components/ReelScene";
import { Reel2, REEL2_DURATION } from "./Reel2";
import { Reel2Images, REEL2_IMAGES_DURATION } from "./Reel2Images";
import { Reel2Layers, REEL2_LAYERS_DURATION } from "./Reel2Layers";
import { Reel2Puppet, REEL2_PUPPET_DURATION } from "./Reel2Puppet";
import { MirrorReel, MIRROR_DURATION } from "./MirrorReel";
import { Corp1, CORP1_DURATION } from "./Corp1";
import { Corp2, CORP2_DURATION } from "./Corp2";
import { LipSyncTest, LIPSYNC_DURATION } from "./LipSyncTest";
import { PuppetScene, PUPPET_DURATION } from "./PuppetScene";
import { RigTest, RIG_DURATION } from "./RigTest";
import corpepChapters from "./timing/corpep.chapters.json";
import corpepWords from "./timing/corpep.words.json";
import corpepPunch from "./timing/corpep.punch.json";
import corpepCaptions from "./timing/corpep.captions.json";
import corpepPages from "./timing/corpep.pages.json";
import cabincrewChapters from "./timing/cabincrew.chapters.json";
import cabincrewCaptions from "./timing/cabincrew.captions.json";
import cabincrewPages from "./timing/cabincrew.pages.json";


/** Look test for long-form. Real chapters come from align-chapters.mjs. */
const SAMPLE_CHAPTERS = [
  { title: "Nobody Cares About Your Deck", startFrame: 0, endFrame: 1800, img: "images/corpep/ch1_burndown.png" },
  { title: "You Are A Number With A Lanyard", startFrame: 1800, endFrame: 3600, img: "images/corpep/ch7_number.png" },
  { title: "Your Lead Is The Lawyer", startFrame: 3600, endFrame: 5400, img: "images/corpep/ch5_judge.png" },
];


/**
 * CORPORATE — the first SERMONS episode. 5m22s, nine chapters.
 *
 * Titles are NOT written here: every one is baked into its generated plate and
 * read back off it, so the words on screen and the words in the picture cannot
 * drift apart.
 *
 * Nor are the type lines. They used to be hand-listed as `punchLines` right
 * here — which capped them at whatever anyone bothered to type, took the FIRST
 * match in a chapter (wrong for a script built on repeating "Nobody cares"),
 * and skipped a mismatch in silence. They now come from
 * scripts/punch-lines.mjs via corpep.punch.json.
 *
 * So this array is just the nine plates, in order.
 */
/**
 * Plate + the scene colour that plate was DRAWN in — read off the artwork, not
 * chosen here. Source: sermons/corporate_image_brief.md, where no two adjacent
 * chapters share a colour on purpose: the colour change is the section break.
 */
const CORPORATE_PLATES = [
  { img: "images/corpep/ch1_burndown.png", scene: "sarkariGreen" },
  { img: "images/corpep/ch2_91.png", scene: "deepIndigo" },
  { img: "images/corpep/ch3_laptop.png", scene: "rust" },
  { img: "images/corpep/ch4_recruiter.png", scene: "plum" },
  { img: "images/corpep/ch5_judge.png", scene: "chaiBrown" },
  { img: "images/corpep/ch6_ai.png", scene: "sarkariGreen" },
  { img: "images/corpep/ch7_number.png", scene: "nightTeal" },
  { img: "images/corpep/ch8_rice.png", scene: "chaiBrown" },
  { img: "images/corpep/ch9_dontquit.png", scene: "deepIndigo" },
] as const;

const CORPORATE = corpepChapters.map((c, i) => ({ ...c, ...CORPORATE_PLATES[i] }));

/**
 * CABIN CREW — Joke Lab observation, one image per chapter, no baked chapter
 * titles (unlike CORPORATE): these plates were generated as scene art only, so
 * chapter.title here is metadata for the aligner and the report tables, never
 * anything read back off the artwork.
 */
const CABINCREW_PLATES = [
  { img: "images/cabincrew/ch1_hook.png", scene: "sarkariGreen" },
  { img: "images/cabincrew/ch2_whistle.png", scene: "nightTeal" },
  { img: "images/cabincrew/ch3_styles.png", scene: "rust" },
  { img: "images/cabincrew/ch4_ai.png", scene: "rust" },
  { img: "images/cabincrew/ch5_viva.png", scene: "rust" },
  { img: "images/cabincrew/ch6_mirror.png", scene: "plum" },
  { img: "images/cabincrew/ch7_bombing.png", scene: "plum" },
] as const;

const CABINCREW = cabincrewChapters.map((c, i) => ({ ...c, ...CABINCREW_PLATES[i] }));

const vertical = { width: REEL.width, height: REEL.height, fps: REEL.fps } as const;

/**
 * The demo reel is a LOOK test, not a script. The lines are placeholders —
 * writing never happens in here.
 */
const DemoReel: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence durationInFrames={90}>
        <ReelScene line="Everyone is winning" pose="standing" />
      </Series.Sequence>
      <Series.Sequence durationInFrames={90}>
        <ReelScene line="Except me" pose="chin" mascotHeight={1040} captionSize={132} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={60}>
        <CTACard />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    {/* The reusable asset — renders once, drops into every reel. */}
    <Composition id="CTACard" component={CTACard} durationInFrames={60} {...vertical} />

    {/* One beat, for iterating on a single scene in isolation. */}
    <Composition
      id="Scene"
      component={ReelScene}
      durationInFrames={90}
      {...vertical}
      defaultProps={{ line: "Everyone is winning", pose: "standing" as const }}
    />

    {/* Shooting in the dark, reel 2 — cut to the recorded VO. */}
    <Composition id="Reel2" component={Reel2} durationInFrames={REEL2_DURATION} {...vertical} />

    {/* Same cut, over the generated scene images. Text is baked into them. */}
    <Composition id="Reel2Images" component={Reel2Images} durationInFrames={REEL2_IMAGES_DURATION} {...vertical} />

    {/* Layered: plate and character on separate planes, real parallax. */}
    <Composition id="Reel2Layers" component={Reel2Layers} durationInFrames={REEL2_LAYERS_DURATION} {...vertical} />

    {/* Joke Lab, "She Practised In A Mirror" — the cabin-crew emotional reel.
        HERO yellow anchor (dark plum world, one yellow object), no baked text
        of any kind. joke-lab/ep01_reel_mirror_images.md. */}
    <Composition id="MirrorReel" component={MirrorReel} durationInFrames={MIRROR_DURATION} {...vertical} />

    {/* PARKED 22 Aug 2026 — rejected on sight. The puppet standing on the
        plates instead of the character baked into each scene image.

        It solved what it set out to solve (one man across five rooms rather
        than five brothers) and still lost, because a purpose-drawn scene can
        turn him away to look at the thing he is describing and the rig, being
        front-facing only, cannot.

        Kept as the reference cut for /puppet-rig. NOT part of the reel
        pipeline — /reel-cut has never contained any of this. Do not wire it
        in. See .claude/commands/puppet-rig.md. */}
    <Composition id="Reel2Puppet" component={Reel2Puppet} durationInFrames={REEL2_PUPPET_DURATION} {...vertical} />

    {/* Corporate sermon, reel 1 — the recruiter block. SERMONS format. */}
    <Composition id="Corp1" component={Corp1} durationInFrames={CORP1_DURATION} {...vertical} />

    {/* Corporate sermon, reel 2 — the certification block. First reel cut
        under the colour system: anchor "hero" on sarkari green. */}
    <Composition id="Corp2" component={Corp2} durationInFrames={CORP2_DURATION} {...vertical} />

    {/* Lip-sync proof. Mouth driven off the recorded waveform, not keyframed.
        Runs on corp2's VO because that audio already exists — the first piece
        that ships in this format is a different script. */}
    <Composition id="LipSyncTest" component={LipSyncTest} durationInFrames={LIPSYNC_DURATION} {...vertical} />

    {/* The mascot standing in a generated room, talking. Plate and puppet are
        separate layers — the room never knew he was coming. */}
    <Composition id="PuppetScene" component={PuppetScene} durationInFrames={PUPPET_DURATION} {...vertical} />

    {/* Same shot as LipSyncTest with the generated head and drawn mouths, so
        the placeholder and the real rig can be watched back to back. */}
    <Composition id="RigTest" component={RigTest} durationInFrames={RIG_DURATION} {...vertical} />

    {/* CORPORATE — first SERMONS episode, 16:9. */}
    <Composition
      id="CorporateEpisode"
      component={Episode}
      durationInFrames={episodeDuration(CORPORATE as any)}
      width={1920}
      height={1080}
      fps={30}
      defaultProps={{
        audio: "audio/corpep.wav",
        chapters: CORPORATE as any,
        words: corpepWords as any,
        punches: corpepPunch as any,
        captions: corpepCaptions as any,
        pages: (corpepPages as any).beats,
        phraseWords: (corpepPages as any).phraseWords,
        closingImg: "images/corpep/cta.png",
      }}
    />

    {/* Long-form episode, 16:9. */}
    <Composition
      id="Episode"
      component={Episode}
      durationInFrames={episodeDuration(SAMPLE_CHAPTERS)}
      width={1920}
      height={1080}
      fps={30}
      defaultProps={{ audio: "", chapters: SAMPLE_CHAPTERS as any, closingImg: "images/corpep/cta.png" }}
    />

    {/* CABIN CREW — Joke Lab episode, ART/TEXT pages, no baked chapter titles. */}
    <Composition
      id="CabinCrewEpisode"
      component={Episode}
      durationInFrames={episodeDuration(CABINCREW as any)}
      width={1920}
      height={1080}
      fps={30}
      defaultProps={{
        audio: "audio/cabincrew.wav",
        chapters: CABINCREW as any,
        captions: cabincrewCaptions as any,
        pages: (cabincrewPages as any).beats,
        phraseWords: (cabincrewPages as any).phraseWords,
        closingImg: "images/fixed/sermon_end_card.png",
      }}
    />

    {/* Look test end to end. */}
    <Composition id="DemoReel" component={DemoReel} durationInFrames={240} {...vertical} />
  </>
);
