# SERMONS — fixed assets

Made once, reused on every sermon and every sermon reel. **Never regenerate these per episode.**
All on-screen text is baked into the image prompt (standing rule since 5 Aug 2026) — never briefed as "add text in Canva".

---

## 1 · The corner stamp

One word: **SERMON**. Replaces the JOKE LAB stamp.

**Look:** rubber-stamp badge, distressed ink texture, angled 10–15°, solid black on the yellow ground.

**Placement:**
- **Reels / Shorts** — bottom-**right**, same corner every episode. Consistent placement is what makes it read as format furniture rather than decoration.
- **Thumbnails** — bottom-**left**. The duration pill covers bottom-right on YouTube.

**Prompt-append language:**

> In the bottom-right corner, a rubber-stamp-style badge reading "SERMON" in bold all-caps black letters, angled about 12 degrees. Light distressed ink texture — subtle, only a few small broken edges, letters remain solid and clearly readable.

**Standalone generation prompt (v2 — lighter distress so it survives at corner size):**

> Solid acid yellow (#F2FF00) background filling entire frame. Centred, a rubber-stamp-style badge reading "SERMON" in bold all-caps black letters, heavy geometric sans-serif, angled about 12 degrees. Light distressed ink texture — subtle, only a few small broken edges and gaps, letters remain solid and clearly readable, NOT heavily eroded, NOT crumbling, NOT falling apart. Nothing else in the image — no border, no box, no additional text, no decoration. Square image.

Swap to bottom-left for thumbnails.

---

## 2 · The CTA strip

**Not a slide.** Joke Lab used a standalone black card; that is a terminal frame and a terminal frame kills a loop. Sermon reels are built to loop, so the CTA is a **strip overlaid on the final frame**, not a card that replaces it.

**Spec** — bottom ~20% of frame, solid acid yellow (#F2FF00) strip, stacked inside it:
1. **FULL SERMON ON YOUTUBE** — all caps, black, heavy geometric sans-serif (Anton / Bebas Neue weight)
2. **I COULD BE WRONG** — all caps, black, ~50–60% the size of line 1

**Prompt-append language:**

> Two lines of centred black text stacked in the lower portion of the frame, positioned so the text block sits between 75% and 88% of the frame height, with at least the bottom 12% of the frame left completely empty. Top line: bold all-caps "FULL SERMON ON YOUTUBE" in heavy geometric sans-serif. Directly below it: all-caps "I COULD BE WRONG" at 55% the size of the top line, same typeface, same weight.

**Standalone generation prompt (v2 — raised out of the Instagram UI zone):**

> Solid acid yellow (#F2FF00) background filling entire frame. Two lines of centred black text stacked in the lower portion of the frame, positioned so the text block sits between 75% and 88% of the frame height — with clear empty yellow space below the text, at least the bottom 12% of the frame left completely empty. Top line: bold all-caps "FULL SERMON ON YOUTUBE" in heavy geometric sans-serif. Directly below it: all-caps "I COULD BE WRONG" at 55% the size of the top line, same typeface, same weight. Nothing else in the image — no border, no logo, no decoration, no icons. Resolution 1080x1920.

**Two hard constraints learned 20 Aug 2026:**
- **Instagram covers the bottom ~15–20% of the frame** with caption, username and action buttons. Any CTA sitting lower than that is invisible on the platform that carries most of the traffic.
- **The text is black and the props are solid black.** Keep the bottom of the closing frame clear of black silhouette elements, or the CTA disappears into the desk.

**Build note — generate the loop frame twice.** The opening image and the closing image are the same picture (that's what makes the loop invisible). Generate it once clean for the open, and once with the CTA strip appended for the close. Same prompt, one clause added.

**Placement rule:** nothing sits above the strip. The mascot and the punch stamp both stay clear of the bottom 20%.

---

## 2b · The LONGFORM end card

**Different asset from the reel CTA above. Do not swap them.**

The reel CTA says "FULL SERMON ON YOUTUBE" — on the YouTube episode itself that sends a viewer where they already are. And the *reason* the reel CTA is a strip rather than a card (a terminal frame kills a loop) does not apply to longform: the episode doesn't loop, and YouTube end screens need a held frame with clear space for the subscribe circle and next-video thumbnails.

**Spec** — standalone terminal card, held ~20 seconds under the outro:
- Black-dominant, acid yellow as ONE large shape (matches thumbnail grammar — black is the doors)
- "I COULD BE WRONG" is the only text
- Mascot small, deadpan, LEFT third
- **Right half stays a flat empty field** — that's where YouTube's end-screen elements land

**Standalone generation prompt:**

> Using the attached character sheet as reference, draw the SAME character. Black background filling the frame. In the lower left, one large acid yellow (#F2FF00) shape — a wide angular block rising from the bottom-left corner, occupying roughly the left third of the frame. The mascot stands small on top of this yellow shape in the lower left, completely deadpan, arms at his sides, facing the viewer — fully rendered, colours unchanged, and the ONLY element with interior detail or line work. Above him, in the upper left, all-caps "I COULD BE WRONG" in heavy geometric sans-serif, acid yellow (#F2FF00) letters on the black. The entire right half of the frame is flat empty black with nothing in it — no props, no text, no decoration. In the bottom-left corner, a small rubber-stamp badge reading "SERMON" in bold all-caps black on a small yellow patch, angled about 12 degrees. Bold black outlines, semi-flat 2D illustration, high contrast, NOT photorealistic, NOT 3D render. Resolution 1920x1080.

**GENERATED — this asset exists.**
- Master: `~/Downloads/im-right/fixed assets/cta.png`
- In the renderer: `remotion-kit/public/images/fixed/sermon_end_card.png` (1672x941)
- Wired as the default `closingImg` on `<Episode>`, so `/episode-cut` renders it automatically.

**Editing note:** hold it for the full outro plus ~5 seconds of silence. End-screen elements can only be placed in the last 20 seconds, so the card has to survive that long or the elements have nowhere to sit.

---

## 3 · What differs from Joke Lab

| | Joke Lab | Sermons |
|---|---|---|
| Corner stamp | JOKE LAB | **SERMON** |
| CTA | standalone black slide | **yellow strip on the loop frame** |
| Linework | rough / sketchy — "this is the lab" | **clean bold outlines**, same as main episodes |
| Joke counter | "2/4" when 4+ jokes | **none** — sermons aren't joke runs |
| Reel structure | 3–5 discrete jokes, Wide→Close each | **linear scene, one image per action** |
| Longform end | — | **standalone black end card (§2b)** — not the reel CTA strip |

---

## 4 · Style spec (unchanged from the main show)

- Solid acid yellow `#F2FF00` fills the entire frame, 70–80% coverage minimum
- All environment and props: **SOLID BLACK SHAPES — completely filled in, no interior lines, no outlines, no detail.** Say it that forcefully; "silhouette" alone gets ignored by the model
- **The mascot is the ONLY element with interior detail or line work.** State this as an explicit exclusion in every prompt or the model renders everything in the same style
- Attach `brand_artefacts/mascot_character_sheet.png` and open with *"Using the attached character sheet as reference, draw the SAME character"* — without it you get a different man in every frame
- Write **"The mascot"** — never spell out a physical description
- Face is **always deadpan**. All chaos lives in the frame, never in his face
- Any wall in frame carries the broken mirror logo
- Upper third stays empty yellow — that's where punch stamps land
- Compose so a Close crop on the punch element still works; keep it off the frame edge
- Profanity in any on-screen text is censored (F**k). VO stays uncensored
- Resolution 1080x1920
