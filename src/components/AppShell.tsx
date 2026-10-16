"use client";

import { useEffect, useRef } from "react";
import { fetchSynced } from "@/lib/data/client";
import { addDays, importSummaries } from "@/lib/game/engine";
import { BottomNav } from "./BottomNav";
import { DemoPanel } from "./DemoPanel";
import { GameProvider, useGame } from "./GameProvider";
import { Onboarding } from "./Onboarding";
import { Toasts } from "./ui";

/** When iPhone Shortcuts is the source, pull the latest synced data once per app open. */
function AutoSync() {
  const { state, run } = useGame();
  const done = useRef(false);
  const token = state.sync?.token;
  const active = state.profile.dataSource === "shortcut";
  const day = state.day;
  useEffect(() => {
    if (done.current || !active || !token) return;
    done.current = true;
    fetchSynced(token, addDays(day, -7), day)
      .then((summaries) => summaries.length && run((s) => importSummaries(s, summaries, "shortcut", new Date().toISOString())))
      .catch(() => {
        /* offline or storage not configured: keep last synced data */
      });
  }, [active, token, day, run]);
  return null;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { state } = useGame();
  if (!state.onboarded) return <Onboarding />;
  return (
    <>
      {children}
      <AutoSync />
      <DemoPanel />
      <BottomNav />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      <Gate>{children}</Gate>
      <Toasts />
    </GameProvider>
  );
}
