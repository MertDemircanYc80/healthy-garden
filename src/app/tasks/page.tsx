// Tasks screen (plan §13.3). STATUS: working on mock data — reference pattern for other screens.
// Pattern (Next 16 + cacheComponents): request-time data lives in an async child inside <Suspense>.
import { Suspense } from "react";
import { DEMO_USER_ID } from "@/lib/api";
import { getToday } from "@/lib/today";

export default function TasksPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Today&apos;s tasks</h1>
      <Suspense fallback={<p className="text-sm text-muted">Loading today…</p>}>
        <TaskList />
      </Suspense>
    </section>
  );
}

async function TaskList() {
  const { date, tasks, sunlight } = await getToday(DEMO_USER_ID);

  return (
    <>
      <p className="text-sm text-muted">
        {date} · Sunlight {Math.round(sunlight * 100)}% ☀️
      </p>
      <ul className="space-y-3">
        {tasks.map((t) => (
          <li key={t.key} className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {t.completed ? "✅ " : ""}
                {t.title}
              </span>
              <span className="text-sm font-semibold text-soil">+{t.reward} 🪙</span>
            </div>
            <p className="mt-1 text-xs text-muted">{t.label}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-leaf-soft">
              <div className="h-full rounded-full bg-leaf" style={{ width: `${t.progress * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
