// Health data state: Apple Health connection, background sync, manual screen time.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { localDay } from "@/lib/health/days";
import { availability, connect as hkConnect, watchChanges, type Availability } from "@/lib/health/healthkit";
import { cachedDays, lastSync as readLastSync, logScreenTime as saveScreenTime, syncHealth } from "@/lib/health/sync";
import type { HealthDayRow } from "@/lib/health/types";

const CONNECTED_KEY = "healthgarden:healthConnected";

interface HealthState {
  availability: Availability;
  connected: boolean;
  busy: boolean;
  lastSync: string | null;
  error: string | null;
  days: HealthDayRow[];
  today: HealthDayRow | null;
  connect: () => Promise<void>;
  syncNow: () => Promise<void>;
  logScreenTime: (feedMinutes: number) => Promise<void>;
}

const Ctx = createContext<HealthState | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [avail] = useState<Availability>(() => availability());
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<HealthDayRow[]>([]);
  const stopWatching = useRef<null | (() => void)>(null);

  const refreshLocal = useCallback(async () => {
    setDays(await cachedDays());
    setLastSync(await readLastSync());
  }, []);

  const sync = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await syncHealth();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      await refreshLocal();
      setBusy(false);
    }
  }, [refreshLocal]);

  const startWatching = useCallback(async () => {
    if (stopWatching.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // HealthKit can fire several updates in a row — sync once they settle.
    stopWatching.current = await watchChanges(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncHealth({ days: 3 }).then(refreshLocal).catch(() => {}), 4000);
    }).catch(() => null);
  }, [refreshLocal]);

  // On launch: show cached data right away, then resync if the user connected before.
  useEffect(() => {
    let alive = true;
    (async () => {
      await refreshLocal();
      const was = (await AsyncStorage.getItem(CONNECTED_KEY).catch(() => null)) === "1";
      if (!alive || !was || avail !== "ok") return;
      setConnected(true);
      await sync();
      await startWatching();
    })();
    return () => {
      alive = false;
      stopWatching.current?.();
      stopWatching.current = null;
    };
  }, [avail, refreshLocal, sync, startWatching]);

  // Coming back to the app → pick up anything new.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (s) => {
      if (s === "active" && connected) syncHealth({ days: 3 }).then(refreshLocal).catch(() => {});
    });
    return () => sub.remove();
  }, [connected, refreshLocal]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await hkConnect();
      await AsyncStorage.setItem(CONNECTED_KEY, "1").catch(() => {});
      setConnected(true);
      await sync();
      await startWatching();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect to Apple Health");
    }
  }, [sync, startWatching]);

  const logScreenTime = useCallback(
    async (feedMinutes: number) => {
      setError(null);
      try {
        await saveScreenTime({ feedMinutes });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save screen time");
      }
      await refreshLocal();
    },
    [refreshLocal],
  );

  const value = useMemo<HealthState>(() => {
    const todayKey = localDay(new Date());
    return {
      availability: avail,
      connected,
      busy,
      lastSync,
      error,
      days,
      today: days.find((d) => d.date === todayKey) ?? null,
      connect,
      syncNow: sync,
      logScreenTime,
    };
  }, [avail, connected, busy, lastSync, error, days, connect, sync, logScreenTime]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHealth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHealth must be used inside <HealthProvider>");
  return v;
}
