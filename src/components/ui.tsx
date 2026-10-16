"use client";

// Small shared UI pieces. Keep styling consistent by reusing these.
import Link from "next/link";
import { useGame } from "./GameProvider";
import { todayView } from "@/lib/game/engine";

export function formatDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function CoinBadge({ amount }: { amount: number }) {
  return (
    <span key={amount} className="hg-pop inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm font-semibold shadow-sm">
      {amount.toLocaleString("en-US")} <span aria-label="coins">🪙</span>
    </span>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { state } = useGame();
  const { balance } = todayView(state);
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        <p className="text-sm text-muted">{subtitle ?? formatDay(state.day)}</p>
      </div>
      <Link href="/shop" aria-label="Coin balance — open shop">
        <CoinBadge amount={balance} />
      </Link>
    </header>
  );
}

export function Bar({ value, tone = "leaf" }: { value: number; tone?: "leaf" | "sun" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-leaf-soft">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone === "sun" ? "bg-sun" : "bg-leaf"}`}
        style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "soft" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-leaf text-white",
    soft: "bg-leaf-soft text-foreground",
    ghost: "bg-transparent text-muted underline-offset-2 hover:underline",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35" onClick={onClose} role="dialog" aria-modal aria-label={title}>
      <div
        className="hg-sheet w-full max-w-[480px] rounded-t-3xl bg-background p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-2 text-xl text-muted" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`hg-toast rounded-full px-4 py-2 text-sm font-medium shadow-lg ${t.tone === "good" ? "bg-leaf text-white" : "bg-card text-foreground"}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
