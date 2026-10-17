// Home: the garden fills the screen and never moves; the island at the bottom holds everything else.
// Dev-only URL params for screenshots on web: ?hour=10&tab=goals&open=1
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GardenScene, phaseFor } from "@/components/garden/GardenScene";
import { CoinIcon } from "@/components/Icons";
import { Island, type TabKey } from "@/components/island/Island";
import { AlertsSection } from "@/components/sections/AlertsSection";
import { CoachSection } from "@/components/sections/CoachSection";
import { greeting } from "@/lib/format";
import { GardenSection } from "@/components/sections/GardenSection";
import { GoalsSection } from "@/components/sections/GoalsSection";
import { ReportSection } from "@/components/sections/ReportSection";
import { useApp } from "@/state/AppState";
import { C, F, R, T } from "@/theme";
import type { Plant } from "@/types";

const TABS: TabKey[] = ["garden", "goals", "coach", "report", "alerts"];

export default function Home() {
  const params = useLocalSearchParams<{ hour?: string; tab?: string; open?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { today, plants, alerts } = useApp();

  const [tab, setTab] = useState<TabKey>(TABS.includes(params.tab as TabKey) ? (params.tab as TabKey) : "garden");
  const [expanded, setExpanded] = useState(params.open === "1");
  const [selected, setSelected] = useState<Plant | null>(null);

  const hour = params.hour !== undefined && !Number.isNaN(Number(params.hour)) ? Number(params.hour) : new Date().getHours();
  const night = phaseFor(hour) === "night";

  const bottom = Math.max(insets.bottom, 10) + (Platform.OS === "web" ? 6 : 0);
  const collapsedHeight = 282;
  const headerH = insets.top + 74;
  // Expanded, the island still leaves the sky and the back of the garden in view.
  const expandedHeight = Math.max(collapsedHeight + 80, Math.min(height - headerH - bottom - 8, height * 0.6));
  const unread = alerts.filter((a) => !a.read).length;

  const onTab = (t: TabKey) => {
    if (t === "garden") {
      setTab("garden");
      setExpanded(false);
      return;
    }
    if (t === tab && expanded) {
      setExpanded(false);
      return;
    }
    setSelected(null);
    setTab(t);
    setExpanded(true);
  };

  const onPlantPress = (p: Plant) => {
    setSelected(p);
    setTab("garden");
    setExpanded(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pine }}>
      <StatusBar style={night ? "light" : "dark"} />

      <View style={{ position: "absolute", left: 0, top: 0, width, height }}>
        <GardenScene
          plants={plants}
          width={width}
          height={height}
          topCover={headerH}
          bottomCover={collapsedHeight + bottom - 14}
          health={today.health}
          hour={hour}
          selectedId={selected?.id}
          onPlantPress={onPlantPress}
        />
      </View>

      {/* header on the sky */}
      <View style={{ position: "absolute", top: insets.top + 12, left: 22, right: 18, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontFamily: F.display, fontSize: T.hero, color: night ? C.mist : C.pine, letterSpacing: -0.4 }}>{greeting(hour)}</Text>
          <Text style={{ fontFamily: F.displayItalic, fontSize: T.body, color: night ? "rgba(231,240,226,0.8)" : "rgba(22,48,31,0.7)", marginTop: 2 }}>
            your garden is {today.health >= 0.75 ? "thriving" : today.health >= 0.5 ? "growing" : "resting"}
          </Text>
        </View>
        <Pressable
          onPress={() => onTab("garden")}
          accessibilityLabel={`${today.coins} coins`}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: night ? "rgba(22,48,31,0.75)" : "rgba(255,255,255,0.82)", borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 }}
        >
          <CoinIcon size={16} />
          <Text style={{ fontFamily: F.display, fontSize: 16, color: night ? C.sun : C.pine }}>{today.coins}</Text>
        </Pressable>
      </View>

      {/* tap the meadow above the island to lower it */}
      {expanded && (
        <Pressable
          style={{ position: "absolute", left: 0, right: 0, top: headerH, height: Math.max(0, height - headerH - expandedHeight - bottom) }}
          onPress={() => setExpanded(false)}
          accessibilityLabel="Show the whole garden"
        />
      )}

      <Island
        tab={tab}
        expanded={expanded}
        collapsedHeight={collapsedHeight}
        expandedHeight={expandedHeight}
        bottom={bottom}
        badges={{ alerts: unread }}
        onTab={onTab}
        onToggle={() => {
          if (!expanded && tab === "garden") setTab("goals");
          setExpanded((e) => !e);
        }}
      >
        {tab === "garden" && <GardenSection selected={selected} onClearSelection={() => setSelected(null)} />}
        {tab === "goals" && <GoalsSection />}
        {tab === "coach" && <CoachSection />}
        {tab === "report" && <ReportSection />}
        {tab === "alerts" && <AlertsSection />}
      </Island>
    </View>
  );
}

