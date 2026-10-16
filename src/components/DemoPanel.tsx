"use client";

// Demo controls (plan §16–17): bump data live on stage and simulate time.
// Clearly labelled as demo-only; hide with NEXT_PUBLIC_HIDE_DEMO=1 if needed.
import { useState } from "react";
import { isoDate } from "@/adapters/mock";
import { boost, createInitialState, loadShowcase, skipDay } from "@/lib/game/engine";
import { useGame } from "./GameProvider";
import { Button, Sheet } from "./ui";

export function DemoPanel() {
  const { run, replace } = useGame();
  const [open, setOpen] = useState(false);
  if (process.env.NEXT_PUBLIC_HIDE_DEMO === "1") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 rounded-full bg-sun px-3 py-2 text-sm font-semibold text-black shadow-lg sm:right-[calc(50%-224px)]"
      >
        🧪 Demo
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Demo controls">
        <p className="mb-3 text-xs text-muted">For judging only — simulates wearable data and time passing.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => run((s) => boost(s, "steps"))}>
            👟 +1,000 steps
          </Button>
          <Button variant="soft" onClick={() => run((s) => boost(s, "sleep"))}>
            😴 +1 h sleep
          </Button>
          <Button variant="soft" onClick={() => run((s) => boost(s, "scroll"))}>
            📱 −30 min scroll
          </Button>
          <Button variant="soft" onClick={() => run((s) => boost(s, "offline"))}>
            📵 Offline hour
          </Button>
        </div>
        <Button className="mt-3 w-full" onClick={() => run(skipDay)}>
          ⏭️ Skip to tomorrow
        </Button>
        <div className="mt-4 flex justify-between border-t border-leaf-soft pt-3">
          <Button variant="ghost" onClick={() => replace(loadShowcase(isoDate(new Date())), "Demo garden loaded 🌻")}>
            Load demo garden
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Start over? This clears your garden on this device.")) {
                replace(createInitialState(isoDate(new Date())));
                setOpen(false);
              }
            }}
          >
            Reset
          </Button>
        </div>
      </Sheet>
    </>
  );
}
