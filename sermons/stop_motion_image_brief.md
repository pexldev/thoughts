# The reaction sheet — one image, reusable forever

**23 Aug 2026.** You picked routes 1 and 3. Route 1 (the type carries the edit) is done and needs
nothing from you. **This is the one thing that needs you, and it is a single generation.**

Pipeline is built and tested: drop the file in `remotion-kit/assets/incoming/` and tell me.
Slicer: `remotion-kit/scripts/slice-sheet.mjs` · holds and cycling: `remotion-kit/src/stopmotion.ts`

---

## THE PROMPT

Attach `brand_artefacts/mascot_character_sheet.png` — without it you get a different man in every cell.

> Using the attached character sheet as reference, draw the SAME character **six times in one image, in a 3 across by 2 down grid**. Each cell is the character cut out on a **flat pure white background** — no scene, no furniture, no floor, no shadow, no panel borders, no gutters, no labels, no numbers, no text anywhere.
>
> Same drawing size and same position within every cell, head and torso, facing camera.
>
> Six reactions, and **all six are deadpan** — the joke is that nothing lands on his face:
>
> 1. straight to camera, blank
> 2. eyes shut, mid slow-blink
> 3. head tilted very slightly to one side
> 4. looking off to the left, not at camera
> 5. one eyebrow raised a millimetre
> 6. beginning to turn away, three-quarter profile
>
> Flat cartoon line art, heavy black outlines, same palette as the character sheet.

---

## The three things that break it

**Do not generate six separate images.** You will get six different men. One image means the model
drew them together, so the character, the palette and the line weight are locked. This is the whole
reason it's a sheet.

**Pure white ground, and nothing else white behind him.** The slicer floods in from the border and
removes only white that is connected to the edge — so the whites *inside* the drawing (his eyes,
first and most visibly) survive. A grey or cream ground defeats it; so does a drop shadow.

**Same size and position in every cell.** If he moves around inside the grid, the cut-outs jitter
when they cycle and it reads as a bad crop rather than as a performance.

---

## What it buys

Six drawings, one generation, and **it is not per-episode** — it's a permanent asset. That gives
every future episode a cutaway that is a genuinely different picture (which is the thing a crop of
the chapter plate could never be), costs nothing to use again, and animates on the hold: two cells
alternating is already animation, three stops it reading as a blink.

**If you only make one image off this document, make this one.**

---

## Parked — not chosen

The other route was **one extra generation per chapter: a drawn CLOSE-UP** (not a variant of the
scene — a second camera position, so the face is drawn at 1672px instead of being a 300px crop
blown up). That is the real fix for shot variety and it stays on the table. You didn't take it on
23 Aug, and nothing below is needed unless you do.

<details>
<summary>Also parked: 3-panel stop-motion sheets per chapter</summary>

Same sheet principle, three panels instead of six, for animating a chapter plate:

> Draw this scene **three times, side by side, in one wide image** — three equal panels. All three are the identical scene: same camera, same composition, same colours, same character in the same position. The ONLY difference is **[ONE SMALL THING]** — the hand rises, or one background figure leans back, or the eyes shut on one panel. The chapter title band appears identically in all three panels. No borders, no gutters, no labels.

One change only; two changes read as a cut rather than a cycle. Face deadpan in all three — the
world twitches and he doesn't react to it. Worth doing for chapter 1, the emotional floor, and the
last chapter, not for all nine.

</details>
