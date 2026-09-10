# How to generate animation assets

ChatGPT prompts for the assets that let a reel actually move. Written 18 Aug 2026.

---

## The one rule that decides everything

**There are two completely separate jobs here, and they use different attachments.**

| Job | What you attach | What you get back |
|---|---|---|
| **JOB A — split a scene** | the **scene image** (one of the 5 reel images) | that scene without him + him without the scene |
| **JOB B — new character assets** | the **character sheet** (`brand_artefacts/mascot_character_sheet.png`) | poses, walk cycle, head turns, mouths, body parts |

Job A is about **one specific picture** — so you attach that picture.
Job B is about **who he is** — so you attach the sheet.

Never mix them. Attaching the character sheet to a Job A prompt gets you a generic character on a blank background. Attaching a scene to a Job B prompt gets you five copies of one parking garage.

---

## Rules that apply to EVERY prompt below

- **No text of any kind** unless the prompt explicitly asks for it — no labels, no arrows, no frame numbers, no borders, no panel lines. The old character sheet had annotation arrows and a dead wordmark, and they had to be stripped programmatically.
- **Max 4–6 figures per sheet.** The old sheet crammed in 9+, so each came out ~100–200px wide and turns to mush past 2× upscale.
- **Always ask for "as large as possible".**
- Background is always flat acid yellow `#F2FF00`, nothing else.

---

# JOB A — splitting the 5 reel scenes

**Attach: the scene image itself.** Both prompts in a pair get the SAME scene attached.

The five scenes live in `~/Downloads/joke_lab/Shooting_in_dark/images/2/`:

| scene | file | what it shows |
|---|---|---|
| street | `c5283995-4046-4638-80f2-4daa44a0df93.png` | MY BEST FRIEND AND MY CRUSH IN ONE CAR |
| basement | `1a18e699-601d-427a-84c3-da025b0136bc.png` | HE DRIVES US TO THE BASEMENT |
| dicky | `944b8b65-5d8c-4b5f-9eb1-57dc8f573211.png` | HE OPENS THE DICKY |
| say yes | `b0268647-46a3-494d-b7cd-7ad773c69c2d.png` | ARE YOU GOING TO SAY YES? |
| congrats | `14e8e439-4c22-498e-81e2-9289b781f9e7.png` | CONGRATULATIONS GUYS |

### A1 · The background plate

**Attach: the scene image.** Run this once per scene.

**Ask for it WITHOUT the headline.** The text gets baked back in by code at
render time — Anton is already loaded in `remotion-kit`. A plate with no words
on it is a *location*, reusable in every future episode set in a parking
garage or a rainy street. A plate with `HE OPENS THE DICKY` burned into it is
scenery for one reel and then it's landfill.

```
Using the attached image as style reference, redraw this exact scene with the
character COMPLETELY REMOVED and ALL TEXT REMOVED. Everything else stays
identical — same composition, same camera angle, same linework, same background
elements. Do NOT include the headline text at the top, and do NOT include the
JOKE LAB stamp. Where the character was standing, continue the floor, the wall
and the background naturally, as if he had never been there. Leave the upper
third of the frame as clean empty yellow. Flat acid yellow #F2FF00 background,
black linework only. Vertical 9:16.
```

Keep these in a growing `locations/` folder, named for the place rather than
the joke: `parking_basement.png`, `rainy_street.png`, `office_floor.png`.

### A2 · The character alone

**Attach: the SAME scene image you just used for A1.**

```
Using the attached image as reference, draw ONLY the character from this scene
— exactly the same pose, the same proportions and the same viewing angle,
isolated on a plain flat acid yellow #F2FF00 background with nothing else in
the frame. No shadow, no ground line, no props, no background, no text.
Vertical 9:16, character centred and as large as possible.
```

**Name them so the pair is obvious:** `street_bg.png` + `street_char.png`, and so on.

That pair is what unlocks parallax, a character who can move inside the frame, and a camera that pushes the background and the figure at different speeds.

---

# JOB B — new character assets

**Attach: `brand_artefacts/mascot_character_sheet.png`.** Same attachment for all five prompts below.

### B1 · Gesture poses

```
Using the attached character sheet as reference, draw the SAME character in 4
full-body poses, arranged in a single row, evenly spaced, all at identical
scale and all standing on the same invisible ground line. Poses left to right:
(1) pointing forward with one arm extended, (2) both palms up in a shrug,
(3) arms crossed, (4) one hand covering his face. Flat acid yellow #F2FF00
background. NO text, NO labels, NO arrows, NO borders, NO panel lines anywhere
in the image. Same linework and colouring as the reference. Landscape, as large
as possible.
```

Swap the four poses for whatever an episode needs.

### B2 · Walk cycle

```
Using the attached character sheet as reference, draw a 4-frame walking cycle
of the SAME character, side profile, facing right, arranged in a single row.
The four frames are: contact, passing, contact on the opposite leg, passing on
the opposite leg. Identical character scale in all four, and his head must sit
at exactly the same height in every frame. Flat acid yellow #F2FF00 background.
NO text, NO labels, NO frame numbers, NO borders. Landscape, as large as
possible.
```

### B3 · Head turns

```
Using the attached character sheet as reference, draw the SAME character's head
and shoulders at 5 angles, in a single row, identical size and identical eye
level across all five: full left profile, three-quarter left, straight to
camera, three-quarter right, full right profile. Deadpan expression throughout.
Flat acid yellow #F2FF00 background. NO text, NO labels, NO borders. Landscape,
as large as possible.
```

### B4 · Mouth shapes

```
Using the attached character sheet as reference, draw the SAME character's head
only, front-facing, in 6 versions arranged in a single row — identical head
size, identical position, identical everything EXCEPT the mouth. The six
mouths: closed, slightly open, wide open, small round "oo" shape, wide flat
"ee" shape, and one corner slightly raised. The eyes and eyebrows must be
identical in all six — deadpan, unchanged. Flat acid yellow #F2FF00 background.
NO text, NO labels, NO borders. Landscape, as large as possible.
```

The "identical except the mouth" instruction is the whole game. If the head drifts between versions it flickers instead of talking.

### B5 · Body parts, for a real rig

```
Using the attached character sheet as reference, draw the SAME character
disassembled into separate body parts, laid out spread apart with clear gaps
between them, on a flat acid yellow #F2FF00 background: head with neck, torso,
upper left arm, lower left arm with hand, upper right arm, lower right arm with
hand, left thigh, left calf with foot, right thigh, right calf with foot. Draw
each piece slightly longer at the joint end so the parts overlap when
reassembled. No piece touching another. NO text, NO labels, NO arrows, NO
outlines around the pieces. As large as possible.
```

This one is the most powerful and the most likely to come back wrong first try.

---

## Order to do them in

1. **A1 + A2 on the street scene** — one pair, ~2 minutes. Send it over and get told whether it extracts cleanly before generating the rest.
2. A1 + A2 on the remaining four scenes.
3. B1 (poses) — cheapest big win after the plates.
4. B2 / B3 / B4 as needed.
5. B5 last.
