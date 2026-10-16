"use client";

// Tasks screen (plan §13.3): today's data in one place + task progress + collect coins.
import { useGame } from "@/components/GameProvider";
import { Bar, Button, PageHeader } from "@/components/ui";
import { DAILY_COIN_CAP } from "@/lib/economy";
import { boost, claimAll, claimTask, todayView } from "@/lib/game/engine";

const ICON: Record<string, string> = {
  first_steps: "👟",
  active_day: "🚶",
  strong_day: "🏃",
  good_sleep: "😴",
  sleep_consistency: "🌙",
  doomscroll_down: "📱",
  offline_hour: "📵",
};

export default function TasksPage() {
  const { state, run } = useGame();
  const v = todayView(state);
  const { summary } = v;

  return (
    <div className="space-y-5">
      <PageHeader title="Today" />

      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Steps" value={summary.steps.toLocaleString("en-US")} icon="👟" />
        <Stat label="Sleep" value={`${Math.floor(summary.sleepMinutes / 60)}h ${summary.sleepMinutes % 60}m`} icon="😴" />
        <Stat label="Scrolling" value={`${summary.scrollMinutes} min`} icon="📱" />
      </section>
      <p className="-mt-3 text-center text-xs text-muted">Source: demo data · daily totals only</p>

      <section className="flex items-center justify-between rounded-2xl bg-leaf-soft p-3">
        <div>
          <p className="text-sm font-medium">☀️ Sunlight {Math.round(v.sunlight * 100)}%</p>
          <p className="text-xs text-muted">
            Earned today {v.earnedToday} / {DAILY_COIN_CAP} 🪙
          </p>
        </div>
        <Button onClick={() => run(claimAll)} disabled={v.claimableTotal === 0}>
          Collect {v.claimableTotal > 0 ? `+${v.claimableTotal}` : ""}
        </Button>
      </section>

      <ul className="space-y-3">
        {v.tasks.map((t) => {
          const claimed = t.completed && t.claimable === 0;
          return (
            <li key={t.key} className={`rounded-2xl bg-card p-4 shadow-sm ${claimed ? "opacity-75" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>
                    {ICON[t.key]}
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{t.title}</p>
                    <p className="text-xs text-muted">{t.description}</p>
                  </div>
                </div>
                {t.claimable > 0 ? (
                  <Button className="shrink-0 px-3 py-1.5" onClick={() => run((s) => claimTask(s, t.key))}>
                    +{t.claimable} 🪙
                  </Button>
                ) : (
                  <span className="shrink-0 text-sm font-semibold text-soil">{claimed ? "✅" : `+${t.reward || 15} 🪙`}</span>
                )}
              </div>
              <div className="mt-3">
                <Bar value={t.progress} />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted">{t.label}</p>
                {t.key === "offline_hour" && (
                  <button type="button" onClick={() => run((s) => boost(s, "offline"))} className="text-xs font-semibold text-leaf">
                    + Log an offline hour
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-muted">Healthy Garden is not medical advice.</p>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <div className="text-lg" aria-hidden>
        {icon}
      </div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
