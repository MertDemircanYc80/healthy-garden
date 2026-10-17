import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { localDay } from "@/lib/health/days";
import { availability, connect as hkConnect, watchChanges, type Availability } from "@/lib/health/healthkit";
import { healthStore, logScreenTime as saveScreenTime, retryUploads, syncHealth, waitForHealthSync } from "@/lib/health/sync";
import type { HealthSnapshot } from "@/lib/health/store";
import { ensureUser, supabase } from "@/lib/supabase";
import type { HealthDayRow } from "@/lib/health/types";

export const CONNECTED_KEY = "healthgarden:healthConnected";
interface HealthState {
  availability: Availability; connected: boolean; busy: boolean; ready: boolean;
  lastSync: string | null; lastUpload: string | null; pending: number; syncEnabled: boolean;
  error: string | null; days: HealthDayRow[]; today: HealthDayRow | null;
  disconnect: () => Promise<void>; enableCloud: () => Promise<void>; deleteData: () => Promise<void>;
  connect: () => Promise<void>; syncNow: () => Promise<void>; logScreenTime: (minutes: number) => Promise<void>;
}
const Ctx = createContext<HealthState | null>(null);
export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [avail] = useState<Availability>(() => availability());
  const [connected, setConnected] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const [todayKey, setTodayKey] = useState(() => localDay(new Date()));
  const run = useCallback(async (operation: () => Promise<unknown>, rethrow = false) => {
    setBusyCount(n => n + 1); setError(null);
    try { await operation(); }
    catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Couldn’t save or sync health data. Please try again.");
      if (rethrow) throw e;
    } finally { if (mounted.current) setBusyCount(n => n - 1); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const unsub = healthStore.subscribe(s => { if (mounted.current) setSnapshot(s); });
    void run(async () => {
      const s = await healthStore.load();
      const was = await AsyncStorage.getItem(CONNECTED_KEY);
      if (!mounted.current) return;
      setSnapshot(s); setReady(true); setConnected(was === "1" && s.syncEnabled && avail === "ok");
      await retryUploads();
    });
    return () => { mounted.current = false; unsub(); };
  }, [avail, run]);
  const syncNow = useCallback(() => run(async () => {
    const s = await healthStore.load();
    setSnapshot(s); setReady(true);
    await (connected ? syncHealth() : retryUploads());
  }), [connected, run]);
  useEffect(() => {
    let active = true;
    let stop: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (connected) {
      queueMicrotask(() => { if (active) void syncNow(); });
      void watchChanges(() => { clearTimeout(timer); timer = setTimeout(() => { if (active) void syncNow(); }, 4000); })
        .then(unsub => { if (active) stop = unsub; else unsub(); })
        .catch(() => { if (active) setError("Automatic updates could not start. Use Sync now to retry."); });
    }
    return () => { active = false; clearTimeout(timer); stop?.(); };
  }, [connected, syncNow]);
  useEffect(() => {
    const tick = () => setTodayKey(localDay(new Date()));
    const timer = setInterval(tick, 30000);
    const sub = RNAppState.addEventListener("change", s => { if (s === "active") { tick(); void syncNow(); } });
    return () => { clearInterval(timer); sub.remove(); };
  }, [syncNow]);
  const resumeCloud = useCallback(async () => {
    if (supabase) {
      await ensureUser();
      const { error } = await supabase.rpc("resume_my_health_sync");
      if (error) throw new Error("Cloud syncing could not be enabled. The health privacy migration must be deployed to Supabase.");
    }
    await healthStore.setSyncEnabled(true);
  }, []);
  const disconnect = useCallback(() => run(async () => {
    setConnected(false);
    await healthStore.setSyncEnabled(false);
    await AsyncStorage.setItem(CONNECTED_KEY, "0");
    await waitForHealthSync();
  }, true), [run]);
  const enableCloud = useCallback(() => run(async () => {
    await resumeCloud();
    const { days } = await healthStore.load();
    for (const row of days) await healthStore.save([row], Object.keys(row).filter(k => k !== "date" && k !== "source") as (keyof HealthDayRow)[]);
    await retryUploads();
  }, true), [resumeCloud, run]);
  const deleteData = useCallback(() => run(async () => {
    setConnected(false);
    await healthStore.setSyncEnabled(false);
    await AsyncStorage.setItem(CONNECTED_KEY, "0");
    await waitForHealthSync();
    if (supabase) {
      // Use only the existing anonymous session; never create an unrelated account for deletion.
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error("Couldn’t check your cloud session. Deletion has not completed.");
      if (data.session) {
        const { error } = await supabase.rpc("delete_my_health_data");
        if (error) throw new Error("Cloud deletion has not completed. Check your connection and deploy the health privacy migration, then retry. Syncing is off.");
      }
    }
    await healthStore.clear();
  }, true), [run]);
  const connect = useCallback(() => run(async () => {
    await hkConnect();
    await resumeCloud();
    await AsyncStorage.setItem(CONNECTED_KEY, "1");
    setConnected(true);
  }), [run, resumeCloud]);
  const logScreenTime = useCallback(async (feedMinutes: number) => {
    await run(() => saveScreenTime({ feedMinutes }), true);
    void run(retryUploads);
  }, [run]);
  const value = useMemo<HealthState>(() => ({ availability: avail, connected, busy: busyCount > 0, ready,
    lastSync: snapshot?.lastRead ?? null, lastUpload: snapshot?.lastUpload ?? null,
    pending: snapshot?.pending.length ?? 0, syncEnabled: snapshot?.syncEnabled ?? true, error,
    days: snapshot?.days ?? [], today: snapshot?.days.find(d => d.date === todayKey) ?? null,
    connect, syncNow, logScreenTime, disconnect, enableCloud, deleteData,
  }), [avail, connected, busyCount, ready, snapshot, error, todayKey, connect, syncNow, logScreenTime, disconnect, enableCloud, deleteData]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useHealth() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useHealth must be used inside <HealthProvider>");
  return value;
}
