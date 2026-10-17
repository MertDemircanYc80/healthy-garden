// Island → Alerts: timely nudges, heads-ups and wins.
import { Pressable, Text, View } from "react-native";
import { Card, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, T } from "@/theme";
import type { AlertLevel } from "@/types";

const LEVEL: Record<AlertLevel, string> = { nudge: C.berry, heads_up: C.sky, celebrate: C.sun };

export function AlertsSection() {
  const { alerts, markAlertsRead } = useApp();
  const unread = alerts.filter((a) => !a.read).length;
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <SectionTitle title="Alerts" hint={unread ? `${unread} new` : "You're up to date"} />
        {unread > 0 && (
          <Pressable onPress={markAlertsRead} hitSlop={10}>
            <Text style={{ color: C.moss, fontWeight: "600", fontSize: T.small, marginTop: 6 }}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {alerts.map((a) => (
        <Card key={a.id} style={{ flexDirection: "row", gap: 12, opacity: a.read ? 0.7 : 1 }}>
          <View style={{ width: 4, borderRadius: 2, backgroundColor: LEVEL[a.level] }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={[u.h, { flex: 1, fontSize: T.body }]}>{a.title}</Text>
              <Text style={u.muted}>{a.time}</Text>
            </View>
            <Text style={[u.muted, { marginTop: 4, color: C.mist, opacity: 0.85 }]}>{a.body}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}
