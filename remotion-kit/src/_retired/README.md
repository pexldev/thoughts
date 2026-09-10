# Retired, not deleted

`ChapterFrame.tsx` / `ChapterShots.tsx` — the reframe-cutting shot system, retired
23 Aug 2026. They sliced a chapter into 8–20 shots, each a different crop of the
same plate.

**Why they went:** a crop of a picture is not a cut. The eye recognises the same
image and reads the change as camera wobble rather than editing. See the header
of `src/Episode.tsx` for the full account — it is worth reading before anyone
rebuilds this, because the idea is a tempting one.

They also carry the procedural fallback scene and the mascot cutaway, both of
which violate the current rule that the composition renders only what he
supplies. Nothing imports them.

---

`PunchType.tsx` / `CardGround.tsx` — the full-frame emphasis card and the wipe
that opened it out of the caption bar. Retired 23 Aug 2026 when the format moved
to alternating ART and TEXT pages: a short verdict sentence is now just a bigger
`PhraseStack`, so a separate card device has nothing left to do.

Worth keeping for the rules they encode, all of which survive in `PhraseStack`:
no fade, the live word inverts rather than tints, an unsaid word is hidden not
greyed, exactly one word live at a time, and NO SHAKE.
