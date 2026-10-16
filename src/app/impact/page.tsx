"use client";

// Real Impact screen (plan §13.7, §14): milestones unlock a real tree (payment mocked).
import { useGame } from "@/components/GameProvider";
import { Bar, Button, PageHeader, formatDay } from "@/components/ui";
import { IMPACT_MILESTONE_COINS } from "@/lib/economy";
import { impactProgress, redeemImpact } from "@/lib/game/engine";

export default function ImpactPage() {
  const { state, run } = useGame();
  const p = impactProgress(state);
  const toNext = IMPACT_MILESTONE_COINS - (p.earned % IMPACT_MILESTONE_COINS);

  return (
    <div className="space-y-5">
      <PageHeader title="Real impact" subtitle="Your habits plant real trees" />

      <section className="rounded-3xl bg-card p-5 text-center shadow-sm">
        <div className="text-5xl" aria-hidden>
          {p.canRedeem ? "🎉" : "🌳"}
        </div>
        {p.canRedeem ? (
          <>
            <p className="mt-2 font-semibold">You unlocked a real tree!</p>
            <p className="text-sm text-muted">Every {IMPACT_MILESTONE_COINS} coins you earn plants one.</p>
            <Button className="mt-4 w-full" onClick={() => run(redeemImpact)}>
              Plant my tree
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 font-semibold">{toNext} coins to your next real tree</p>
            <p className="mb-3 text-sm text-muted">Every {IMPACT_MILESTONE_COINS} coins earned from healthy habits plants one.</p>
            <Bar value={p.towardNext} />
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-leaf-soft p-3">
          <p className="text-2xl font-semibold">{state.impact.length}</p>
          <p className="text-xs text-muted">real trees</p>
        </div>
        <div className="rounded-2xl bg-leaf-soft p-3">
          <p className="text-2xl font-semibold">{p.earned.toLocaleString("en-US")}</p>
          <p className="text-xs text-muted">coins earned all-time</p>
        </div>
      </section>

      {state.impact.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Your certificates</h2>
          {[...state.impact].reverse().map((t) => (
            <article key={t.id} className="hg-pop rounded-3xl border-2 border-leaf bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-leaf">Certificate of planting</p>
              <p className="mt-2 text-lg font-semibold">
                🌳 {t.species} for {state.profile.name}
              </p>
              <p className="text-sm text-muted">{t.location}</p>
              <div className="mt-3 flex justify-between text-xs text-muted">
                <span>{formatDay(t.day)}</span>
                <span>{t.partner}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <p className="text-center text-xs text-muted">
        Prototype: no payment happens yet. In production each milestone funds a planting through a verified partner
        (e.g. Ecologi, Tree-Nation, One Tree Planted).
      </p>
    </div>
  );
}
