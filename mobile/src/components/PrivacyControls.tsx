import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card, styles as u } from "@/components/ui";
import { isBackendConfigured } from "@/lib/supabase";
import { useHealth } from "@/state/Health";
import { useApp } from "@/state/AppState";
import { C } from "@/theme";

export function PrivacyControls() {
  const h = useHealth();
  const { clearPersonalGoals } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(operation: () => Promise<void>, success: string) {
    setBusy(true); setMessage("");
    try { await operation(); setMessage(success); setConfirm(false); }
    catch (e) { setMessage(e instanceof Error ? e.message : "The change could not be saved. Please retry."); }
    finally { setBusy(false); }
  }
  return <Card>
    <Text style={u.h}>Your data and privacy</Text>
    <Text style={[u.muted,{marginTop:8}]}>Health totals, pending uploads, goals, garden progress and inventory are stored on this device (localStorage on web, AsyncStorage on iPhone). The latest 35 days of health totals and any pending uploads are kept locally. We do not read browsing URLs or raw browsing history.</Text>
    <Text style={[u.muted,{marginTop:8}]}>{isBackendConfigured() ? "When syncing is enabled, daily health totals are also sent to your Supabase project under this install’s anonymous account. The coach service can process those totals, using its configured AI provider. This is not an account backup or recovery system." : "Cloud syncing is not configured in this build. Health totals stay on this device."}</Text>
    <Text style={[u.muted,{marginTop:8}]}>Disconnect stops this app’s automatic reads and uploads. It keeps existing data. To revoke Apple Health permissions too, use iPhone Settings → Health → Data Access & Devices → Healthy Garden.</Text>
    <Pressable accessibilityRole="button" disabled={busy || h.busy} onPress={() => { void act(h.disconnect,"Syncing disconnected. Existing health data is still saved."); }} style={{paddingVertical:14,opacity:busy || h.busy ? 0.5 : 1}}><Text style={{color:C.moss,fontWeight:"700"}}>Disconnect syncing</Text></Pressable>
    {!h.syncEnabled && isBackendConfigured() && <Pressable accessibilityRole="button" disabled={busy || h.busy} onPress={() => { void act(h.enableCloud,"Cloud syncing enabled for your saved totals."); }} style={{paddingVertical:14}}><Text style={{color:C.moss}}>Enable cloud syncing</Text></Pressable>}
    <Pressable accessibilityRole="button" disabled={busy || h.busy} onPress={() => setConfirm(true)} style={{paddingVertical:14}}><Text style={{color:C.berry,fontWeight:"700"}}>Delete my health data</Text></Pressable>
    {confirm && <View style={{gap:12}}>
      <Text style={u.body}>Delete saved health totals, pending uploads and health-derived goals, reports and coach results from this device and the connected Supabase account? This cannot be undone. Your garden, gold and inventory stay. Apple Health originals are not deleted; reconnecting can import them again.</Text>
      <Pressable accessibilityRole="button" disabled={busy || h.busy} onPress={() => { void act(async () => { await h.deleteData(); await clearPersonalGoals(); },isBackendConfigured() ? "Health data deleted from this device and the connected account. Syncing is off." : "Health data deleted from this device. No cloud account is configured in this build."); }} style={{paddingVertical:14}}><Text style={{color:C.berry,fontWeight:"700"}}>{busy ? "Deleting…" : "Confirm health data deletion"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirm(false)} style={{paddingVertical:12}}><Text style={{color:C.mist}}>Cancel</Text></Pressable>
    </View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={u.body}>{message}</Text>}
  </Card>;
}
