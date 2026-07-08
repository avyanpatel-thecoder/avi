---
name: Real sports/live-event data sourcing
description: How to get real, structured results for sports tournaments (e.g. FIFA World Cup) without scraping or an API key.
---

When a feature needs real match/game results (scores, teams, rounds) instead of
randomly generated fake data, try a direct `fetch()` to ESPN's public
scoreboard API before reaching for Firecrawl/scraping:

```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD-YYYYMMDD
```

**Why:** No auth/API key required, returns clean JSON (event date, competitor
names, ESPN 3-letter abbreviations, scores, `status.type.completed`, and
`season.slug` for round/stage). Scraping Wikipedia/news sites for tournament
results was unreliable (JS-rendered SPAs, no parsable tables) and wasted a full
round of attempts before this was discovered.

**How to apply:** For soccer/FIFA data, swap the sport/league segment in the
path (e.g. `soccer/fifa.world`) for other ESPN-covered sports. Map ESPN's
3-letter team abbreviations to whatever team-code scheme the app already uses
(e.g. ISO country codes for flags) since they don't line up 1:1 (e.g. RSA vs
za, KSA vs sa, GB nations use ENG/SCO not GBR).
