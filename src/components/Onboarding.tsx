"use client";

// Onboarding (plan §13.1): name, step goal, target bedtime, data source. Two steps max.
import { useState } from "react";
import { isoDate } from "@/adapters/mock";
import { loadShowcase, onboard } from "@/lib/game/engine";
import { useGame } from "./GameProvider";
import { Button } from "./ui";

export function Onboarding() {
  const { run, replace } = useGame();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [stepGoal, setStepGoal] = useState(8000);
  const [bedtime, setBedtime] = useState("23:00");

  const finish = () =>
    run((s) => onboard(s, { name: name.trim() || "Gardener", stepGoal, bedtimeTarget: bedtime, dataSource: "mock" }));

  return (
    <section className="flex min-h-[80dvh] flex-col justify-center gap-8">
      <div className="text-center">
        <div className="hg-sway mb-3 inline-block text-6xl" aria-hidden>
          🌱
        </div>
        <h1 className="text-3xl font-semibold">Healthy Garden</h1>
        <p className="mt-2 text-muted">Walk, sleep, scroll less — and watch your garden grow.</p>
      </div>

      {step === 1 ? (
        <div className="space-y-4 rounded-3xl bg-card p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium">What should we call you?</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-xl border border-leaf-soft bg-background px-3 py-2.5 outline-none focus:border-leaf"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Daily step goal</span>
            <select
              value={stepGoal}
              onChange={(e) => setStepGoal(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-leaf-soft bg-background px-3 py-2.5"
            >
              {[5000, 6000, 8000, 10000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString("en-US")} steps
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Target bedtime</span>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-leaf-soft bg-background px-3 py-2.5"
            />
          </label>
          <Button className="w-full" onClick={() => setStep(2)}>
            Next
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
          <p className="text-sm font-medium">Where should your data come from?</p>
          <div className="rounded-2xl border-2 border-leaf bg-leaf-soft p-3">
            <p className="font-medium">🧪 Demo data</p>
            <p className="text-xs text-muted">Realistic steps, sleep and scroll time — works instantly.</p>
          </div>
          <div className="rounded-2xl border border-leaf-soft p-3 opacity-60">
            <p className="font-medium">📁 Import Apple Health / CSV</p>
            <p className="text-xs text-muted">Coming soon</p>
          </div>
          <div className="rounded-2xl border border-leaf-soft p-3 opacity-60">
            <p className="font-medium">⌚ Connect a wearable</p>
            <p className="text-xs text-muted">Coming soon</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="soft" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" onClick={finish}>
              Start my garden
            </Button>
          </div>
        </div>
      )}

      <Button variant="ghost" onClick={() => replace(loadShowcase(isoDate(new Date())), "Demo garden loaded 🌻")}>
        Skip — load the demo garden
      </Button>
    </section>
  );
}
