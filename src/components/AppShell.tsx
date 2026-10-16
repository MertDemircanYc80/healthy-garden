"use client";

import { BottomNav } from "./BottomNav";
import { DemoPanel } from "./DemoPanel";
import { GameProvider, useGame } from "./GameProvider";
import { Onboarding } from "./Onboarding";
import { Toasts } from "./ui";

function Gate({ children }: { children: React.ReactNode }) {
  const { state } = useGame();
  if (!state.onboarded) return <Onboarding />;
  return (
    <>
      {children}
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
