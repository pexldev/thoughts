# Ops Session Summary — Side Effects of Thinking
**Date:** May 21-23, 2026

---

## What Was Built This Session

### Brand System (Complete)
- **Logo:** Ornate mirror frame with cracked glass — minimal, ownable, ties to show's relatability premise
- **Mascot:** Bearded Indian guy, round glasses with one cracked lens, mid-thought expression, grey t-shirt, chappals — loosely based on host
- **Color:** Acid yellow (#D4FF00) as primary brand color
- **Typography:** Bold condensed, slightly grungy — Bebas Neue / Anton style
- **Poster:** Done — acid yellow, cracked mirror logo, bold text ✓
- **YouTube Banner:** Done — acid yellow, mascot at desk with mic and cracked mug ✓
- **Instagram DP:** Mascot bust version ✓

### Files Created
| File | Location |
|---|---|
| Brand brief | `brand_artefacts/brand_brief.md` |
| Mascot brief | `brand_artefacts/mascot_brief.md` |
| Thumbnail brief | `brand_artefacts/thumbnail_brief.md` |
| Reels image brief | `brand_artefacts/reels_image_brief.md` |
| Image generation instructions | `brand_artefacts/image_generation_instructions.md` |
| Analytics snapshot | `analytics/2026-05-20_channel_snapshot.md` |
| Analytics report generator | `analytics/report_generator.py` |
| Setup guide | `analytics/SETUP.md` |

### Instagram Profile
- Bio: "I talk to myself. Somehow that is a podcast. New Episode whenever I feel like it. At least once a week."
- YouTube link added to Links field (now clickable)
- Mascot as DP

### Episodes Status
| Episode | Script | Recorded | Thumbnail | Uploaded |
|---|---|---|---|---|
| I Opened A Cage | ✓ | ✓ | Old brand | ✓ |
| Why Are We Upgrading Our Lives | ✓ | ✓ | Old brand | ✓ |
| YouTube Doesn't Feel Like Addiction | ✓ | ✓ | Old brand | ✓ |
| Bhagwan Aur Corporate | ✓ | ✓ | Old brand | ✓ |
| I Didn't Want To Record Today | ✓ | ✓ | Old brand | ✓ |
| Never Be Humble. Be Coffee. | ✓ | ✓ | Old brand | ✓ |
| My Phone Knows Too Much | ✓ | ✓ | Old brand | ✓ |
| I Can't Make A Perfect Omelette | ✓ | ✓ | New brand ✓ | ✓ |

---

## Key Decisions Made

- **No fake followers, no paid promotion yet** — organic only
- **No personal network sharing** — growth via algorithm only
- **Language:** Bombay Hindi — intentional, not a problem
- **Format:** Audio podcast with static image on YouTube + Spotify
- **Posting cadence:** Whenever — at least once a week
- **Short-form strategy:** One Short/Reel per episode — this is the only proven growth lever right now ("Be Coffee not Water" did 815 views)

---

## Analytics Snapshot (May 20, 2026)
- 57 views in last 28 days (long-form)
- 815 views from one Short in 48 hours
- CTR: 0.5% — needs improvement
- Avg view duration: 41 seconds — needs better hooks
- Traffic: 86.3% suggested videos
- Zero comments across all videos
- Zero subscribers showing

---

## Immediate Next Actions
- [ ] Set up Google Cloud + run `analytics/report_generator.py`
- [ ] Cut omelette episode Short (clip: "Every morning I watch the same YouTube video...")
- [ ] Post omelette Short to YouTube + Instagram Reel
- [ ] Generate images for omelette Reel using `reels_image_brief.md`

---

## Standing Rules (Do Not Change)
- Never suggest sharing with personal contacts
- Growth = organic only via Shorts, Reels, algorithm
- Every episode gets one Short
- Acid yellow is the brand color
- The cracked lens is always on the mascot
- "Listen" not "Watch" — it's an audio podcast

---

## Analytics Dashboard
Built a Python script that pulls YouTube data and saves a markdown report to `/analytics/`.

**To run:**
```bash
cd "/Users/prateekmuralidharan/My Projects/thoughts/analytics"
.venv/bin/python report_generator.py
```

**To analyse:** Open Claude Code and say "analyse my latest analytics report"

Setup instructions in `analytics/SETUP.md`
