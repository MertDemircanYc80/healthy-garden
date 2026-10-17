// "Your data" card (top of the Report section): Apple Health connection + today's screen time.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Card, Chip, styles as u } from "@/components/ui";
import { isBackendConfigured } from "@/lib/supabase";
import { useApp } from "@/state/AppState";
import { useHealth } from "@/state/Health";
import { C, F, R, T } from "@/theme";

function ago(iso: string | null) {
  if (!iso) return "never";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString();
}

export function DataSources() {
  const h = useHealth();
  const { demo, isDemo } = useApp();
  const sample = isDemo;
  // Until Apple Health is connected, show the demo persona's day so every number has a source.
  const t = sample ? demo.day ?? null : h.today;

  let status: string;
  let action: { label: string; onPress: () => void } | null = null;
  if (h.availability === "expo_go") status = "Apple Health needs the Healthy Garden test build — Expo Go can't read it.";
  else if (h.availability === "not_ios") status = "Apple Health is only on iPhone.";
  else if (h.availability === "no_healthkit") status = "Apple Health isn't available on this device.";
  else if (!h.connected) {
    status = "Steps, sleep, workouts, daylight and meals update by themselves once connected.";
    action = { label: "Connect Apple Health", onPress: h.connect };
  } else {
    status = h.busy ? "Syncing…" : `Read from Apple Health ${ago(h.lastSync)}.`;
    action = { label: h.busy ? "Syncing…" : "Sync now", onPress: h.syncNow };
  }

  const stats: [string, string][] = [];
  if (t?.steps != null) stats.push(["Steps", t.steps.toLocaleString("en-US")]);
  if (t?.sleep_minutes != null) stats.push(["Sleep", `${Math.floor(t.sleep_minutes / 60)}h ${t.sleep_minutes % 60}m`]);
  if (t?.active_minutes != null) stats.push(["Active", `${t.active_minutes} min`]);
  if (t?.daylight_minutes != null) stats.push(["Daylight", `${t.daylight_minutes} min`]);
  if (t?.running_minutes) stats.push(["Running", `${t.running_minutes} min`]);
  if (t?.nutrition?.energyKcal != null) stats.push(["Food", `${t.nutrition.energyKcal} kcal`]);

  return (
    <Card>
      <Text style={u.h}>{sample ? `Sample day, ${demo.dateLabel}` : "Your health data"}</Text>
      <Text style={[u.muted, { marginTop: 4 }]}>{status}</Text>
      {stats.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 }}>
          {stats.map(([label, value]) => (
            <View key={label} style={{ backgroundColor: C.pine, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 92 }}>
              <Text style={u.muted}>{label}</Text>
              <Text style={{ color: C.mist, fontFamily: F.display, fontSize: 17 }}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      {action && (
        <View style={{ marginTop: 12 }}>
          <Chip label={action.label} tone="solid" onPress={h.busy ? undefined : action.onPress} />
        </View>
      )}
      <Text style={[u.muted, { marginTop: 10 }]}>{h.busy ? "Saving / syncing…" : !h.syncEnabled || !isBackendConfigured() ? "Saved on this device. Cloud syncing is off." : h.pending ? `Saved on this device · ${h.pending} day(s) pending upload.` : h.lastUpload ? `Synced to Supabase ${ago(h.lastUpload)}.` : "No health data uploaded yet."}</Text>
      {h.pending > 0 && isBackendConfigured() && !h.busy && <Chip label="Retry upload" onPress={h.syncNow} />}
      {h.error && <Text style={[u.muted, { color: C.berry, marginTop: 8 }]}>{h.error}</Text>}

      <View style={{ height: 1, backgroundColor: C.pineLine, marginVertical: 14 }} />
      {!sample && <ScreenTimeInput current={t?.feed_minutes ?? null} onSave={h.logScreenTime} />}
    </Card>
  );
}

function ScreenTimeInput({ current, onSave }: { current: number | null; onSave: (m: number) => Promise<void> }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const minutes = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440;

  return (
    <View>
      <Text style={u.h}>Feed apps today</Text>
      <Text style={[u.muted, { marginTop: 4 }]}>
        iPhones don&apos;t share screen time with apps. Check Settings → Screen Time and add up Instagram, TikTok, YouTube and similar.
        {current != null ? ` Saved: ${current} min.` : ""}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
        <TextInput
          value={text}
          onChangeText={(v) => setText(v.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder="Minutes"
          placeholderTextColor={C.fern}
          maxLength={4}
          style={{ flexGrow: 1, flexShrink: 1, width: 0, minWidth: 0, backgroundColor: C.pine, color: C.mist, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 10, fontSize: T.body }}
          accessibilityLabel="Minutes in feed apps today"
        />
        <Pressable
          disabled={!valid || saving}
          onPress={async () => {
            setSaving(true);
            try { await onSave(minutes); setText(""); }
            catch { /* Keep input for retry; the provider displays the save error. */ }
            finally { setSaving(false); }
          }}
          style={({ pressed }) => ({ backgroundColor: valid ? C.moss : C.pineLine, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 11, opacity: pressed ? 0.75 : 1 })}
        >
          <Text style={{ color: valid ? C.pine : C.fern, fontWeight: "700" }}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
