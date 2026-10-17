# Jury replay: 30 days, with provenance

This is a **hybrid demonstration**, not a measured Healthy Garden intervention.
The app starts empty. The first 7 days load only when the presenter chooses **Load first 7 days**.
The next 23 days become visible one at a time. No future observations are passed to a coach analysis.

## Public wearable record

- Dataset: [PMData, Simula Research Laboratory](https://datasets.simula.no/pmdata/).
- Authors: Vajira Thambawita and colleagues (2020), *PMData: A Sports Logging Dataset*, ACM MMSys. [Publication](https://doi.org/10.1145/3339825.3394926).
- Original archive: <https://datasets.simula.no/downloads/pmdata.zip>.
- License: [Creative Commons Attribution–NonCommercial 4.0](https://creativecommons.org/licenses/by-nc/4.0/). This attribution applies to the derived PMData subset. Retain it when sharing the educational hackathon demo; commercial reuse needs separate review of the source terms.
- Anonymized participant: `p01`, **2019-11-02 through 2019-12-01**, 30 consecutive source dates.
- `pmdata-p01-month.json` is the small derived wearable table. The original participant dates and observed values are retained.
- Steps: sum minute-level `steps.json` by source date.
- Sleep: `minutesAsleep` from the longest session for each `dateOfSleep`, assigned to the morning it ended. Naps are not added.
- Active minutes: moderately + very active minutes. Light movement is not included.
- Sedentary minutes: the Fitbit classification, **not measured sitting time**; unworn-device time can affect it.
- Missing observations remain null. No missing wearable readings are filled with invented values.
- `rawFileSha256` records six downloaded source files. Run `python3 scripts/import-pmdata.py` from the repository root to verify the transformation and hashes using HTTP Range requests. No full archive, food images, heart-rate traces or participant profile are copied into this repo.

## Fictional companion scenario

`mobile/src/data/month-health.json` combines those records with explicitly fictional daylight minutes, phone screen minutes, feed-app minutes, per-app totals and dietary calories.

These additions do **not** belong to the PMData participant. They tell a demo story with successes and missed goals; they are not ground truth or evidence that this app improves health. `jury-month.csv` exposes the same 30 days for inspection. Its wearable columns have the PMData license above; the companion scenario is authored for this demo.

The `14:00` snapshot is an illustrative 55% of cumulative daily totals. Sleep is already complete and is not scaled. This is a replay, **not live intraday measurement**. The source dates remain 2019; the UI displays a demo day number rather than pretending this is today’s real person.

Dietary energy means **calories eaten**. It is not Fitbit calories burned. Nutrition is fictional here. For real-device integration, the existing HealthKit reader reads dietary energy written to Apple Health by a compatible nutrition app with the user’s permission. No direct MyFitnessPal API, automatic iOS per-app Screen Time integration or HealthKit access inside Expo Go is claimed.

## Coach outputs

`mobile/src/data/month-coach.json` contains AI-authored, prepared analysis packets for completed-day indices 6, 13, 20, 27 and 29. They were prepared by Codex while implementing this fixed replay and use only data through each cutoff. They are **cached outputs**, not an in-app model inference. The UI labels them “Prepared AI · offline replay.”

At weekly checkpoints, suggestions and the next week’s targets change. Gold for a completed day uses the plan effective at the start of that day. Refreshing a plan does not retroactively pay old days. On day 30, a retrospective packet is shown; the day’s results still use the previous active goals.

An optional authenticated local gateway can call Claude at runtime. It uses only the bundled demo fixture through the requested cutoff. Its API key remains on the computer. See `docs/JURY_DEMO.md`. A live provider call was not made during implementation because no API key was configured; the gateway is tested with a mock provider.
