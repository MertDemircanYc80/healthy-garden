"use client";

// Data screen: choose where numbers come from, import Apple Health, set up iPhone Shortcuts,
// see the extended metrics, and delete data (plan §8, §19).
import { useEffect, useState } from "react";
import { useGame } from "@/components/GameProvider";
import { Bar, Button, PageHeader, formatDay } from "@/components/ui";
import { deleteSynced, fetchSynced, generateSyncToken, importAppleHealth } from "@/lib/data/client";
import { addDays, clearImported, importSummaries, setDataSource, setSyncToken, summaryFor, type ActiveSource } from "@/lib/game/engine";

const SOURCES: { id: ActiveSource; icon: string; title: string; hint: string }[] = [
  { id: "mock", icon: "🧪", title: "Demo data", hint: "Realistic sample numbers" },
  { id: "apple_health", icon: "❤️", title: "Apple Health", hint: "Upload your Health export" },
  { id: "shortcut", icon: "⚡", title: "iPhone Shortcuts", hint: "Automatic daily sync" },
];

export default function DataPage() {
  const { state, run, replace } = useGame();
  const active = state.profile.dataSource;
  const today = summaryFor(state, state.day);

  return (
    <div className="space-y-5">
      <PageHeader title="Your data" subtitle="Where your garden's sunlight comes from" />

      <section className="grid grid-cols-3 gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => run((st) => setDataSource(st, s.id))}
            className={`rounded-2xl p-3 text-left transition active:scale-95 ${active === s.id ? "bg-leaf text-white shadow" : "bg-card shadow-sm"}`}
          >
            <span className="text-xl">{s.icon}</span>
            <p className="mt-1 text-sm font-semibold leading-tight">{s.title}</p>
            <p className={`text-[11px] leading-tight ${active === s.id ? "text-white/80" : "text-muted"}`}>{s.hint}</p>
          </button>
        ))}
      </section>

      <TodayMetrics summary={today} />
      <AppleHealthCard />
      <ShortcutsCard />

      <section className="rounded-2xl border border-leaf-soft p-4 text-sm">
        <p className="font-semibold">🔒 Privacy</p>
        <p className="mt-1 text-muted">
          Apple Health files are read on this device and never uploaded. Synced data is stored as daily totals and
          app open/close times only — never message content or browsing history. Healthy Garden is not medical advice.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => run(clearImported)}>
            Delete data on this device
          </Button>
          {state.sync?.token && (
            <Button
              variant="soft"
              onClick={async () => {
                try {
                  await deleteSynced(state.sync!.token);
                  replace(state, "Synced data deleted from the server");
                } catch (e) {
                  alert((e as Error).message);
                }
              }}
            >
              Delete synced data
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function TodayMetrics({ summary: s }: { summary: ReturnType<typeof summaryFor> }) {
  const rows: [string, string, string | null][] = [
    ["👟", "Steps", s.steps.toLocaleString("en-US")],
    ["📏", "Walk + run", s.walkingRunningKm !== undefined ? `${s.walkingRunningKm} km` : null],
    ["🏃", "Running", s.runningMinutes !== undefined ? `${s.runningMinutes} min` : null],
    ["🔥", "Active energy", s.activeEnergyKcal !== undefined ? `${s.activeEnergyKcal} kcal` : null],
    ["😴", "Sleep", s.sleepMinutes ? `${Math.floor(s.sleepMinutes / 60)}h ${s.sleepMinutes % 60}m${s.bedtime ? ` · bed ${s.bedtime}` : ""}` : null],
    ["☀️", "Outside (daylight)", s.outdoorMinutes !== undefined ? `${s.outdoorMinutes} min` : null],
    ["📱", "Feed apps", s.appUsage ? Object.entries(s.appUsage).map(([a, m]) => `${a} ${m}m`).join(" · ") : s.scrollMinutes ? `${s.scrollMinutes} min` : null],
    ["🚗", "Driving", s.drivingMinutes !== undefined ? `${s.drivingMinutes} min` : null],
    ["🍽️", "Food", s.nutrition?.energyKcal !== undefined ? `${s.nutrition.energyKcal} kcal${s.nutrition.proteinG ? ` · ${s.nutrition.proteinG} g protein` : ""}` : null],
  ];
  return (
    <section className="rounded-3xl bg-card p-4 shadow-sm">
      <p className="mb-2 text-sm font-semibold">Today · {formatDay(s.date)}</p>
      <ul className="divide-y divide-leaf-soft text-sm">
        {rows.map(([icon, label, value]) => (
          <li key={label} className="flex items-center justify-between gap-3 py-2">
            <span>
              {icon} {label}
            </span>
            <span className={`text-right ${value ? "font-medium" : "text-muted"}`}>{value ?? "not connected"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AppleHealthCard() {
  const { state, run } = useGame();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const range = state.sync?.importedRange;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const { summaries } = await importAppleHealth(file, addDays(state.day, -60), setProgress);
      run((s) => importSummaries(s, summaries, "apple_health", new Date().toISOString()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl bg-card p-4 shadow-sm">
      <p className="font-semibold">❤️ Import Apple Health</p>
      <p className="mt-1 text-sm text-muted">Steps, walking & running, workouts, sleep, active energy, time in daylight and food (if you log meals in an app that writes to Health).</p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-leaf">How to export from your iPhone</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Open the Health app → tap your picture (top right).</li>
          <li>Tap “Export All Health Data” → Export. It can take a minute.</li>
          <li>Choose “Save to Files”, then upload the export.zip here (open this page on your phone, or AirDrop it to your laptop).</li>
        </ol>
      </details>
      {range && (
        <p className="mt-2 text-xs text-muted">
          Imported {formatDay(range.from)} – {formatDay(range.to)}
        </p>
      )}
      <label className={`mt-3 block rounded-full px-4 py-2 text-center text-sm font-semibold ${busy ? "bg-leaf-soft" : "bg-leaf text-white"} cursor-pointer`}>
        {busy ? `Reading your data… ${Math.round(progress * 100)}%` : range ? "Import a newer export" : "Choose export.zip"}
        <input type="file" accept=".zip,.xml,application/zip,text/xml" className="hidden" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {busy && (
        <div className="mt-2">
          <Bar value={progress} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </section>
  );
}

function ShortcutsCard() {
  const { state, run, replace } = useGame();
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [shown, setShown] = useState(false);
  const token = state.sync?.token;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is only available after mount
    setOrigin(window.location.origin);
  }, []);

  const ensureToken = () => {
    if (!token) replace(setSyncToken(state, generateSyncToken()), "Sync token created");
  };

  const syncNow = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const summaries = await fetchSynced(token, addDays(state.day, -30), state.day);
      if (!summaries.length) {
        alert("No data from your Shortcuts yet. Run one on your iPhone, then try again.");
      } else {
        run((s) => importSummaries(s, summaries, "shortcut", new Date().toISOString()));
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => replace(state, "Copied"));

  return (
    <section className="rounded-3xl bg-card p-4 shadow-sm">
      <p className="font-semibold">⚡ iPhone Shortcuts (automatic)</p>
      <p className="mt-1 text-sm text-muted">
        Shortcuts on your iPhone send your daily health totals, how long you spend in feed apps, and driving time.
      </p>

      {!token ? (
        <Button className="mt-3 w-full" onClick={ensureToken}>
          Set up sync
        </Button>
      ) : (
        <>
          <div className="mt-3 space-y-2 text-sm">
            <Field label="URL" value={`${origin}/api/ingest`} onCopy={copy} />
            <Field label="Header" value={shown ? `Authorization: Bearer ${token}` : "Authorization: Bearer hg_••••••••"} onCopy={() => copy(`Bearer ${token}`)} />
            <button type="button" className="text-xs text-muted underline" onClick={() => setShown((v) => !v)}>
              {shown ? "Hide token" : "Show token"}
            </button>
            {origin.includes("localhost") && (
              <p className="rounded-xl bg-sun/25 p-2 text-xs">Your phone can’t reach “localhost”. Use the deployed link (Vercel) or your laptop’s Wi-Fi IP.</p>
            )}
          </div>
          <ShortcutSteps />
          <Button className="mt-3 w-full" onClick={syncNow} disabled={busy}>
            {busy ? "Syncing…" : "Sync now"}
          </Button>
          {state.sync?.lastSyncAt && <p className="mt-2 text-center text-xs text-muted">Last sync {new Date(state.sync.lastSyncAt).toLocaleString()}</p>}
        </>
      )}
    </section>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-background p-2">
      <span className="w-14 shrink-0 text-xs text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
      <button type="button" onClick={() => onCopy(value)} className="text-xs font-semibold text-leaf">
        Copy
      </button>
    </div>
  );
}

function ShortcutSteps() {
  return (
    <div className="mt-3 space-y-2 text-sm">
      <details>
        <summary className="cursor-pointer font-medium text-leaf">1 · Daily health totals (steps, sleep, food…)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Shortcuts app → + → name it “Healthy Garden sync”.</li>
          <li>Add “Find Health Samples” → Type: Steps, Start Date is Today → then “Calculate Statistics” → Sum. Repeat for Walking + Running Distance, Active Energy, Dietary Energy.</li>
          <li>Add “Find Health Samples” → Sleep, Start Date in the last 1 day → “Get Details” Duration → “Calculate Statistics” Sum (hours).</li>
          <li>Add “Dictionary” with keys: date (Format Date “yyyy-MM-dd”), steps, walkingRunningKm (or walkingRunningMi), activeEnergyKcal, dietaryEnergyKcal, sleepHours.</li>
          <li>Add “Get Contents of URL” → the URL above → Method POST → Header Authorization = Bearer + your token → Request Body JSON = the Dictionary.</li>
          <li>Automation tab → Time of Day (e.g. 9 PM, daily) → Run Immediately → this shortcut. Health is only readable while the phone is unlocked.</li>
        </ol>
      </details>
      <details>
        <summary className="cursor-pointer font-medium text-leaf">2 · Feed app time (Instagram, TikTok…)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Automation → App → choose your feed apps → “Is Opened” → Run Immediately.</li>
          <li>Action: “Get Contents of URL”, POST JSON: event = app_open, app = Shortcut Input’s name (or type the app name), at = Current Date formatted ISO 8601.</li>
          <li>Make a second automation for “Is Closed” with event = app_close.</li>
        </ol>
      </details>
      <details>
        <summary className="cursor-pointer font-medium text-leaf">3 · Driving time</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Automation → Driving Focus (or CarPlay / your car’s Bluetooth) → “When turning on” → POST event = driving_start with at = Current Date (ISO 8601).</li>
          <li>Same for “When turning off” with event = driving_end.</li>
        </ol>
      </details>
    </div>
  );
}
