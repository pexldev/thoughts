# I Could Be Wrong — repo notes

## Auto-routing: field-log dumps

He logs reels and videos by **dumping them raw, with no slash command.** When a message looks like a field observation rather than a request, load the `stops` skill and file it — do not answer it conversationally.

**What a dump looks like:** a timestamp or view count with a fragment of description, usually pipe- or comma-separated, often several per message.

```
2s | guy holding an electricity bill up to camera screaming | 2.1M
uncle dancing badly at a wedding, 900k, sent it to my sister
that title "I Quit My Job And Nothing Happened" — 400k on a 12k channel
```

Route to the right log (all under `market/`):
- stopped his thumb → `stop_log.md`
- he **forwarded it to a person** → `send_log.md` (scarce and worth 10x — never let one slide into the stop log by mistake)
- deliberately sampled 1M+ reel → `teardown_log.md`
- a YouTube **click** → `youtube_log.md`
- his own reel skip rate → `skip_rate.md` · his own long-form CTR → `my_packaging.md`

**Reply with the count and running total. Two lines. No analysis.**

Thresholds before any pattern may be offered: **50 stops · 15 sends · 40 teardowns · 40 YouTube.** Below them the answer to "why did this work" is *"n=1, I don't know"* — see the skill for why that rule exists.
