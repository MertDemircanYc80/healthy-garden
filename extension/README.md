# Healthy Garden doomscroll tracker (Chrome extension, Manifest V3)

**Owner:** integration lead · **Status:** not started (stretch, plan §8.2 Option A)

Goal: track time spent on a user-selected list of feed sites (x.com, instagram.com,
tiktok.com, reddit.com, youtube.com) and POST `app_open` / `app_close` events to
`/api/ingest` with the user's sync token (`Authorization: Bearer hg_…`). The server turns
them into `scrollMinutes`, `longSessions` and `appUsage`. Format: `docs/DATA_SOURCES.md`.

Privacy (plan §19): send daily totals only — never URLs or browsing history.

Fallback if this runs late: manual scroll-time input in the app + mock data.
