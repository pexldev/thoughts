# Craft card — The Color System
**Written:** 21 Aug 2026
**Replaces:** "solid acid yellow fills the entire frame, everything else is a flat black silhouette"

---

## The change in one line

**Acid yellow is the signature, not the wallpaper.**

It must be in every single frame, it must be the brightest thing in every single frame — but it is no longer the only colour in the frame.

**Why:** the two reels that crossed 1,400 views both have real colour in them. The relatives-crowd frame is a yellow world with fifty *differently coloured* people in it. The 6 AM bedroom frame isn't yellow at all — it's a teal-and-purple night room with yellow only as a hard strip top and bottom. Neither is a monotone. A flat yellow frame with a black silhouette on it reads as *one shape* at feed size, and one shape gives the eye nothing to do while the audio does its work.

---

## The five slots

Every frame is built from these and nothing else.

| Slot | What | Rule |
|---|---|---|
| 1 | **Acid yellow `#F2FF00`** | Mandatory. ~20% of the frame minimum. Always the brightest thing on screen. |
| 2 | **Black `#000000`** | Outlines on everything, plus the heaviest shapes. Never leaves. |
| 3 | **ONE scene colour** | From the locked list below. One per scene. Never two. This is the new part. |
| 4 | **Skin + cloth** | Real skin tones. Up to 2 clothing colours on background characters. |
| 5 | **Off-white `#F7F3E8`** | Optional. Paper, walls, shirts, screens — use it to stop the frame going muddy. |

**Hard cap: 6 colours on screen. Count them in the prompt before you send it.** If you can't count them, it's mush.

---

## The three legal yellow anchors

Yellow has to enter the frame one of these three ways. Pick **one per reel** (long-form may switch at a chapter break, never mid-scene).

**A — Yellow world.** Yellow fills the background, as before. The scene colour enters as the furniture, the props, the crowd. *This is the relatives frame.*

**B — Yellow frame.** The scene has its own coloured environment; yellow lives as a hard strip top and bottom, or a border. *This is the 6 AM bedroom frame — the best performer.*

**C — Yellow hero object.** Dark or scene-coloured world, and one object blazing yellow — the phone, the lamp, the door, the sign. The eye goes straight to it.

If a reel feels flat, it's usually anchor A when it should have been B.

---

## Scene colours — locked shortlist

One per scene. Chosen by **mood, not realism**. Every one of these sits deeper than the yellow on purpose, so the yellow still wins.

| Name | Hex | Use for |
|---|---|---|
| Night teal | `#17494D` | night, bedroom, alone, 6 AM, insomnia |
| Deep indigo | `#23305E` | dreams, spirals, the inside of his head |
| Rust | `#C0451F` | heat, anger, an argument, a street at 2 PM, family fight |
| Plum | `#5B2A4E` | embarrassment, shame, romance, the cringe memory |
| Sarkari green | `#3F6B4F` | offices, waiting rooms, queues, anything institutional |
| Chai brown | `#7A4B2A` | tea stalls, old furniture, the parents' house |

---

## The depth rule — what happened to the silhouettes

Silhouettes aren't dead, they moved to the back.

- **Far layer** — flat black silhouettes, no fill. The old spec survives here.
- **Mid layer** — the scene colour. Flat fill, black outline. Props, furniture, background people.
- **Near layer** — the mascot. Fully rendered. Unchanged.

Never a frame that is *only* far layer. That's the monotone problem.

---

## Never
- **Never recolour the mascot.** He's the constant that lets the world change around him. Write "the mascot" and say nothing about his colours.
- **Never two saturated brights.** Exactly one, and it's the yellow. If a scene colour starts competing at feed size, darken the scene colour — never shrink the yellow.
- **Never a colour outside the list** without deciding it's worth breaking the system for.
- **Thumbnails are not governed by this card.** Thumbnails stay black-dominant with acid yellow as ONE huge shape. A scene colour may appear as a single accent, nothing more.

---

## The squint test

Shrink the frame to phone size and squint. You should see **three things**: a yellow shape, a dark mass, and his face.

Five things = cut a colour. One thing = you're back to monotone.
