"use client";

// Holds the game state for the whole app and saves it in this browser.
// STORAGE: localStorage for now. When Supabase is ready, swap load()/save() for API
// calls — screens only use useGame() and won't need to change.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isoDate } from "@/adapters/mock";
import * as G from "@/lib/game/engine";

const STORAGE_KEY = "healthy-garden:v1";
let toastSeq = 0;

function load(): G.GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as G.GameState;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function save(state: G.GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage full: the game still works for this session */
  }
}

export interface Toast {
  id: number;
  text: string;
  tone: "good" | "info";
}

interface GameContextValue {
  state: G.GameState;
  /** Run an engine action; shows its message (or friendly error) as a toast. */
  run: (fn: (s: G.GameState) => G.ActionResult) => boolean;
  replace: (s: G.GameState, message?: string) => void;
  toasts: Toast[];
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<G.GameState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    // Load once on the client (localStorage doesn't exist on the server).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
    setState(load() ?? G.createInitialState(isoDate(new Date())));
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const commit = useCallback((next: G.GameState) => {
    setState(next);
    save(next);
  }, []);

  const run = useCallback(
    (fn: (s: G.GameState) => G.ActionResult) => {
      if (!state) return false;
      const result = fn(state);
      if (result.ok) {
        commit(result.state);
        toast(result.message, "good");
      } else {
        toast(result.error, "info");
      }
      return result.ok;
    },
    [state, commit, toast],
  );

  const replace = useCallback(
    (s: G.GameState, message?: string) => {
      commit(s);
      if (message) toast(message, "good");
    },
    [commit, toast],
  );

  const value = useMemo(() => (state ? { state, run, replace, toasts } : null), [state, run, replace, toasts]);

  if (!value) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-4xl" aria-label="Loading">
        <span className="animate-pulse">🌱</span>
      </div>
    );
  }
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
