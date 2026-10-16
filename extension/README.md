# Healthy Garden doomscroll tracker (Chrome extension, Manifest V3)

**Owner:** integration lead · **Status:** not started (stretch, plan §8.2 Option A)

Goal: track time spent on a user-selected list of feed sites (x.com, instagram.com,
tiktok.com, reddit.com, youtube.com), count sessions > 10 minutes, and POST daily
totals to `/api/sync` as a partial `DailySummary` (`scrollMinutes`, `longSessions`,
`source: "extension"`).

Privacy (plan §19): send daily totals only — never URLs or browsing history.

Fallback if this runs late: manual scroll-time input in the app + mock data.
