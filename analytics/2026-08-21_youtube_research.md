# What's Working on YouTube — Research + Decision Doc
**Date:** 21 Aug 2026
**Method:** internal audit of 5 analytics reports (19 Jul → 21 Aug) + live web research
**Rule used:** where outside research and our own numbers disagree, our numbers win.

---

## 0. The headline, before anything else

**The problem is not topic selection. It is not the format. It is not the algorithm.**

It's that **no video is crossing the retention bar that buys the next distribution batch**, and the single biggest cause is **length**.

65 videos. 3,823 lifetime views. 10 subscribers. Zero shares in three consecutive 28-day windows. That is not a channel being ignored — it's a channel being *tested and failed* at the hook, over and over.

---

## 1. Our own numbers — what they actually say

### 1a. The 40-second cliff is real and it is brutal

Every short in the last 28 days, sorted by length:

| Short | Length | Avg watch | Retention |
|---|---|---|---|
| Why I Play Podcasts When I'm Home Alone | 0:26 | 0:13 | **50%** |
| karm karo fal ki chinta nhi | 0:31 | 0:15 | **48%** |
| Nobody Should Hear This at 6 AM | 0:34 | 0:19 | **56%** |
| Why I dont say bye | 0:37 | 0:16 | **43%** |
| mere paas do shastra (shakti) | 0:37 | 0:11 | 30% |
| — — — **the cliff** — — — | | | |
| He Wrote His Best Work With One Week Left | 0:42 | 0:04 | **9.5%** |
| My Best Friend, My Crush… | 0:48 | 0:04 | **8%** |
| I Recorded the Entire Episode on Mute | 0:52 | 0:05 | **9.6%** |

Everything at or under 37 seconds holds **43–56%**.
Everything at or over 42 seconds holds **8–10%**.

There is no middle. It's a cliff, not a slope.

*Caveat, honestly:* the three long ones have 22, 5 and 3 views, so the averages are thin. But the direction is identical across all three, and it matches what [reels_that_work.md](../ops/reels_that_work.md) already found in July ("under 40s holds far better"). **We wrote that rule down and then shipped three 42–52s shorts anyway.** The rule isn't wrong; it isn't being enforced.

### 1b. Retention got worse as the sprint started

| Report | 28-day views | Avg view duration | Shares | Subs gained |
|---|---|---|---|---|
| 19 Jul | 393 | 0:30 | **0** | 0 |
| 31 Jul | 88 | 0:35 | **0** | 0 |
| 21 Aug | 366 | **0:22** | **0** | +1 |

Average view duration fell from 35s to 22s. The August uploads are the longest and the worst-retained on the channel.

### 1c. The view numbers are a lottery, not a trend

- **21 Aug:** 366 views — but 245 of them (67%) are one short. Everything else = 121 views across ~13 uploads.
- **19 Jul:** 393 views — but 276 of them (70%) are two shorts.
- **31 Jul:** 88 views — the month with no lottery ticket.

The channel's real baseline is roughly **100–120 views per 28 days**, plus an occasional single video that catches a batch. Those spikes are not compounding into anything: the 245-view short produced **+1 subscriber and 0 shares**.

### 1d. Zero shares. Three months running.

7 likes in 28 days — and 6 of those 7 are on one video. Zero shares in July, zero in August, zero the month before.

[reels_that_work.md](../ops/reels_that_work.md) already named this as "the single number this whole document exists to move." It has not moved. Watch metrics are the gatekeeper, shares are the multiplier — we're failing the gatekeeper *and* the multiplier.

### 1e. The one vein that works: the Hindi saying

| Short | Views | Likes |
|---|---|---|
| karm karo fal ki chinta nhi | **245** | **6** |
| mere paas do shastra (shakti) | 39 | 1 |
| everything else, 28 days | ≤22 each | 0 |

The two best performers of the last month are both Hindi sayings everybody already knows. That's 86% of all channel likes on one video. This is exactly the thesis in the format memo — *sayings every Indian repeats, taken apart* — and it's the only thing the data actually rewards.

**But note the difference between the two:** karm karo did 6x shakti. Per the [Shakti postmortem](2026-08-08_shakti_reel_postmortem.md), shakti opened on a **text card of transliterated Hindi you had to read**, and 77.1% swiped away. The saying works when it's *heard*. It dies when it's *read*.

### 1f. Long-form: the one bright spot has no audience

- **The One Thing Nobody Watched During the Protest** — 9:35, avg watch **3:14 = 34% retention.** Best retention on the channel by a distance.
- **Joke Lab #4** — 5:29, avg watch 0:28 = **8.5% retention.**

Six views on the protest episode, so it proves almost nothing statistically. But it's the only evidence we have that a long-form episode can *hold* someone. Joke Lab, our weekly flagship, cannot.

### 1g. Search has collapsed, and that's the compounding surface

| Report | Search views (28d) |
|---|---|
| 19 Jul | 42 |
| 31 Jul | 11 |
| 21 Aug | 14 |

Shorts are 86% of traffic. Search is 3.8%. Feed distribution is one-shot; search compounds for months — and we have 65 videos with, currently:

- **3 uploads with completely blank titles**
- duplicate uploads of the same video (Marriage Is Just Two People Hiding Boxes ×3)
- live typos: "Don't t be a creep", "Why I dont say bye", "omlette"
- `| I Could Be Wrong` appended to every title, eating mobile characters for zero gain

### 1h. The open test from 8 Aug never actually ran

The postmortem set up "R1 (Tyson) is the control — if swipe-away comes in under 77%, the frame-one theory is confirmed." **What happens when you slap Mike Tyson?** (8 Aug) doesn't appear in the 28-day top 10, meaning it did fewer than 3 views. It never got a test batch, so the theory is **untested, not disproven.** Same for the ep5 basement counter-test.

---

## 2. What the outside research says

I'll be straight with you: **most of it was low value.** "What's working on YouTube 2026" is an SEO slop category — AI-written blogs quoting each other. I filtered hard. Four things survived.

### 2a. The view count changes in 3 days — this one is real and it matters ⚠️

YouTube confirmed on 17 Aug that **starting 24 August 2026**, a view is counted **the moment a video starts playing**, across long-form, live, and podcasts. The old metric survives in Studio as **"Engaged Views."** Shorts already worked this way since 2025.

Practical effect for you: **your public view counts are about to inflate, and it means nothing.** If you read the sprint off "views" after Monday you will think something worked when nothing changed. This is a measurement change, not a performance change. ([TechCrunch](https://techcrunch.com/2026/08/17/youtube-will-now-count-a-view-as-soon-as-a-video-starts-playing/), [NewscastStudio](https://www.newscaststudio.com/2026/08/18/youtube-view-count-metric-change/), [vidIQ](https://vidiq.com/blog/post/youtube-view-count-update/))

### 2b. The retention bar we're being graded against

Consensus across the (unofficial, treat as directional) benchmark sources:

- **Swipe-away in the first 3s: under 25% is healthy. Over 35–40% is a broken hook.**
- Sub-30s Shorts are held to the lower end.
- 50–60% of all drop-off happens in the first three seconds.
- Wider distribution is triggered around **70%+ average retention**; loop rate over 100% is a strong secondary signal.

**We are at 30–56% retention on our best videos and 8–10% on our worst.** Even our winners sit below the bar that unlocks the next batch. That is a single coherent explanation for 65 videos and 3,823 views.

*Source-quality warning:* these exact numbers come from content-marketing blogs, not YouTube. Trust the direction, not the decimal. ([Shortimize](https://www.shortimize.com/blog/youtube-shorts-retention-rate), [Retensis](https://retensis.com/blog/audience-retention-benchmarks-2026), [humbleandbrag](https://humbleandbrag.com/blog/youtube-shorts-benchmarks))

### 2c. Shorts now show up in search — and we're not using it

January 2026 brought a **dedicated Shorts filter in YouTube search**, plus Shorts surfacing in regular search results, in a Shorts shelf inside search, on watch pages, and in Google mobile results. Titles and descriptions now matter for Shorts in a way they didn't in 2024.

Two discovery paths now exist: **feed** (burst for 24–48h, then dead) and **search** (steady for months). We have 65 shorts and are harvesting essentially nothing from the second one. ([Social-Searcher](https://www.social-searcher.com/2026/03/13/youtube-shorts-search-discovery/), [Lawrence Hitches](https://www.lawrencehitches.com/youtube-shorts-seo/), [Sprout Social](https://sproutsocial.com/insights/youtube-algorithm/))

### 2d. Shorts barely convert to subscribers — confirmed by our own data

Reported figure: Shorts convert to subs at **under 10% the rate long-form viewers do.** Our number: 3,823 lifetime views → 10 subs = **0.26%**. 245 views on our best short → **+1 sub**.

This isn't a reason to stop making Shorts — they're 86% of our traffic and the only door. It's a reason to **stop reading sub count as a grade on the reels.** ([Gillian Perkins](https://www.gillianperkins.com/blog/whats-actually-working-on-youtube-in-2026-algorithm-shifts))

### What I looked at and threw away

- **Faceless/animated channel research** — returned AI-narration content-farm advice (Lofi Girl, AI story channels). Nothing transferable to a written-comedy channel with a mascot. Dead end.
- **Regional language growth** — genuinely true that Kannada/Marathi/Odia creator discovery is outgrowing Hindi and English in 2026. Also genuinely irrelevant: you're not going to start writing in Marathi. Noting it so it doesn't get re-researched.
- **Indian standup listicles** — "Abhishek Upmanyu does observational humour." No mechanism, no numbers, nothing usable.

---

## 3. Decisions — 5 changes, in priority order

### ① Hard cap every short at 34 seconds. Not 45.
**Cost:** zero. It's a constraint, not work.
**Our data:** ≤37s → 43–56%. ≥42s → 8–10%.
**Research agrees:** sub-30s shorts held to the strictest retention bar, and easiest to clear.
**Action:** change criterion 4 in the VQ scorecard in [reels_that_work.md](../ops/reels_that_work.md) from "under 45 seconds" to **"under 34 seconds."** If a bit can't fit in 34, it's an episode beat, not a reel.
**Note:** the SERMONS ep1 recruiter block was already flagged "get under 40s." Our own data says 40 is the cliff edge, not the target — **make it 34.**

### ② Log swipe-away rate on every single short. It's the only grade that matters.
**Cost:** ~2 min per upload in Studio.
**Why:** views are about to become meaningless (24 Aug). Swipe-away is the number that predicts whether the next batch exists. We measured it once — 77.1% on shakti — and never again.
**Action:** add a swipe-away column to the ledger. Bar: **under 40% is passing, under 25% is a hit.** Anything over 50% gets the first 3 seconds rebuilt and reposted as a new cut.

### ③ Mine the Hindi-saying vein — but the saying must be HEARD in second one, never read.
**Cost:** zero — it's already the format thesis, and ~11 are banked in [ideas.md](../ideas.md).
**Our data:** the two best videos of the month, 86% of all likes. karm karo (spoken) beat shakti (text card) 6:1.
**Action:** next 5 reels all come from the sayings bank (it's also the natural target list for the SERMONS shape — karma is already prepped). Frame one = motion or a face, saying spoken aloud over it. Zero reading required in the first 2 seconds. This also happens to be the most searchable content we make — people type "karm karo fal ki chinta mat karo" into YouTube.

### ④ Retrofit the back catalogue's titles. 2 hours, no recording, 65 assets.
**Cost:** one evening. No writing, no recording, no editing.
**Why:** Shorts now rank in search (new in 2026), search is our only compounding surface, and it's collapsed to 14 views/28d. Meanwhile 3 videos are live with **no title at all.**
**Action, in order:**
1. Fix the 3 blank titles.
2. Delete or unlist the duplicate uploads.
3. Fix live typos ("Don't t be a creep", "dont say bye", "omlette").
4. Drop `| I Could Be Wrong` from Shorts titles — it costs mobile characters and buys nothing.
5. Put the searchable phrase **first** in the title, especially on the Hindi ones.

### ⑤ Switch your scoreboard to Engaged Views before Monday.
**Cost:** one settings habit.
**Why:** from 24 Aug your public view counts inflate for reasons that have nothing to do with you. Four days into a reels sprint, that's a booby trap.
**Action:** in Studio, read **Engaged Views** only. Add a line to the top of the next report noting the metric change so future-you doesn't compare across the break.

---

## 4. Explicitly do NOT do these

- **Don't let long-form eat the reel quota.** Joke Lab #4: 13 views, 8.5% retention — that's the historical evidence, and the format has since been replaced by SERMONS. The corporate sermon is already recorded (19 Aug), so ship it — but **ship it as a source of reels, not as the week's deliverable**, and don't grade it on its own numbers. At 10 subs, long-form has no audience to serve yet. The episode is the room; the reel is the door. The reels-sprint call (17 Aug) was right — hold it.
- **Don't judge the sprint on views after 24 Aug.** See ⑤.
- **Don't treat the "70% retention" benchmark as gospel.** It's blog consensus, not YouTube. Use it as a direction.
- **Don't pivot language or format off this doc.** Nothing here says the writing is bad. Both postmortems say the opposite: when people get in, they behave normally. The entry is what's broken.
- **Don't add a sixth thing.** Five changes, four of which cost no creative time.

---

## 5. What would change my mind

- If a short under 34s with a spoken-saying hook still swipes away above 60%, then length and hook aren't the constraint and it's distribution — and we go looking at posting cadence and account signals instead.
- The 8 Aug Tyson test never ran (under 3 views). **Re-run it.** Frame-one theory is still unproven, and it's load-bearing for ③.

---

## 6. Honest summary in four lines

1. You already knew most of this — [reels_that_work.md](../ops/reels_that_work.md) called the length cliff and the zero-shares problem in July. The gap is **enforcement, not knowledge.**
2. The only genuinely new outside fact is the **24 Aug view-count change**, and it's a trap you'd otherwise have walked into.
3. The one thing the data unambiguously rewards is the **Hindi saying, spoken not read.**
4. The cheapest win available is **two hours of title cleanup** on 65 videos you've already made.

---

*Sources are linked inline. Internal audit drawn from [2026-07-19](2026-07-19_youtube_report.md), [2026-07-31](2026-07-31_youtube_report.md), [2026-08-08 postmortem](2026-08-08_shakti_reel_postmortem.md), [2026-08-21](2026-08-21_youtube_report.md), and [ops/reels_that_work.md](../ops/reels_that_work.md).*
