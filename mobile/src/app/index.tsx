import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GardenScene, phaseFor } from "@/components/garden/GardenScene";
import { PlantingSheet } from "@/components/PlantingSheet";
import type { GardenPlot } from "@/lib/gardenPlots";
import { DemoSheet } from "@/components/DemoSheet";
import { CoinIcon, DropIcon } from "@/components/Icons";
import { Island, type TabKey } from "@/components/island/Island";
import { AlertsSection } from "@/components/sections/AlertsSection";
import { CoachSection } from "@/components/sections/CoachSection";
import { GardenSection } from "@/components/sections/GardenSection";
import { GoalsSection } from "@/components/sections/GoalsSection";
import { ReportSection } from "@/components/sections/ReportSection";
import { useApp } from "@/state/AppState";
import { C, F, R } from "@/theme";
import type { Plant } from "@/types";
const TABS: TabKey[] = ["garden", "goals", "coach", "report", "alerts"];
export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    hour?: string;
    tab?: string;
    open?: string;
  }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { today, plants, alerts, demo, inventory, waterPlant, journey } =
    useApp();
  const [demoOpen, setDemoOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>(
    TABS.includes(params.tab as TabKey) ? (params.tab as TabKey) : "garden",
  );
  const [expanded, setExpanded] = useState(params.open === "1");
  const [plot, setPlot] = useState<GardenPlot | null>(null);
  const [selected, setSelected] = useState<Plant | null>(null);
  const [waterMode, setWaterMode] = useState(false);
  const [wateredId, setWateredId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [reportPage, setReportPage] = useState(0);
  const watering = useRef(false);
  useEffect(() => {
    if (!wateredId && !message) return;
    const t = setTimeout(() => {
      setWateredId(null);
      setMessage("");
    }, 2200);
    return () => clearTimeout(t);
  }, [wateredId, message]);
  const hour =
    params.hour !== undefined && Number.isFinite(Number(params.hour))
      ? Number(params.hour)
      : new Date().getHours();
  const night = phaseFor(hour) === "night";
  const fullscreen = tab === "report" && expanded;
  const bottom = Math.max(insets.bottom, 10) + (Platform.OS === "web" ? 6 : 0);
  const collapsedHeight = selected ? 292 : 174;
  const headerH = insets.top + 108;
  const expandedHeight = fullscreen
    ? height - insets.top
    : Math.max(330, Math.min(height - headerH - bottom - 8, height * 0.64));
  const onTab = (t: TabKey) => {
    setSelected(null);
    setWaterMode(false);
    setMessage("");
    if (t === "garden") {
      setTab(t);
      setExpanded(false);
      return;
    }
    setExpanded(t === tab ? !expanded : true);
    setTab(t);
  };
  const onPlantPress = async (p: Plant) => {
    if (waterMode) {
      if (watering.current) return;
      watering.current = true;
      try {
        const r = await waterPlant(p.id);
        setMessage(r.message);
        if (r.ok) setWateredId(p.id);
      } finally {
        watering.current = false;
      }
      return;
    }
    setSelected(p);
    setTab("garden");
    setExpanded(false);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.pine }}>
      <StatusBar style={night || fullscreen ? "light" : "dark"} />
      <View style={{ position: "absolute", left: 0, top: 0, width, height }}>
        <GardenScene
          plants={plants}
          width={width}
          height={height}
          topCover={headerH}
          bottomCover={collapsedHeight + bottom + 44}
          health={today.health}
          hour={hour}
          selectedId={selected?.id}
          wateredId={wateredId}
          onPlantPress={(p) => {
            void onPlantPress(p);
          }}
          selectedPlot={plot}
          onEmptyPlotPress={(p) => {
            if (waterMode) {
              setMessage("Choose Plant mode to use this plot.");
              return;
            }
            setSelected(null);
            setTab("garden");
            setExpanded(false);
            setPlot(p);
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          top: insets.top + 18,
          left: 22,
          right: 100,
        }}
      >
        <Text
          style={{
            fontFamily: F.display,
            fontSize: 28,
            color: night ? C.mist : C.pine,
            letterSpacing: -0.5,
          }}
        >
          Your little garden
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open 30-day demo controls"
          onPress={() => setDemoOpen(true)}
          style={{ alignSelf: "flex-start", paddingVertical: 10 }}
        >
          <Text
            style={{
              fontSize: 12,
              color: night ? C.mist : C.pine,
              opacity: 0.75,
            }}
          >
            {journey.phase === "empty"
              ? "30-day demo  ↗"
              : `${demo.dateLabel}  ↗`}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${today.coins} coins. Open Market`}
        onPress={() => router.navigate("/market")}
        style={{
          position: "absolute",
          top: insets.top + 20,
          right: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: night ? C.pineRaised : "rgba(255,255,255,0.8)",
          borderRadius: R.pill,
          paddingHorizontal: 12,
          paddingVertical: 9,
        }}
      >
        <CoinIcon size={16} />
        <Text
          style={{
            fontFamily: F.display,
            fontSize: 16,
            color: night ? C.sun : C.pine,
          }}
        >
          {today.coins}
        </Text>
      </Pressable>
      {expanded && !fullscreen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show the garden"
          onPress={() => setExpanded(false)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: headerH,
            height: Math.max(0, height - headerH - expandedHeight - bottom),
          }}
        />
      )}
      {!expanded && (
        <View
          style={{
            position: "absolute",
            bottom: collapsedHeight + bottom + 12,
            left: 20,
            right: 20,
            alignItems: "center",
            gap: 8,
          }}
        >
          {!!message && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: C.mist,
                backgroundColor: C.pine,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 16,
                fontSize: 12,
              }}
            >
              {message}
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: C.pine,
              borderRadius: R.pill,
              padding: 4,
              gap: 4,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !waterMode }}
              onPress={() => {
                setWaterMode(false);
                setSelected(null);
              }}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: R.pill,
                backgroundColor: !waterMode ? C.moss : "transparent",
              }}
            >
              <Text
                style={{
                  color: !waterMode ? C.pine : C.fern,
                  fontWeight: "600",
                }}
              >
                Plant
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Water mode, ${inventory.watering_can} refills`}
              accessibilityState={{ selected: waterMode }}
              onPress={() => {
                setWaterMode(true);
                setSelected(null);
                setMessage("Tap a plant to water it.");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: R.pill,
                backgroundColor: waterMode ? C.sky : "transparent",
              }}
            >
              <DropIcon size={16} color={waterMode ? C.pine : C.fern} />
              <Text
                style={{
                  color: waterMode ? C.pine : C.fern,
                  fontWeight: "600",
                }}
              >
                Water · {inventory.watering_can}
              </Text>
            </Pressable>
            {waterMode && inventory.watering_can === 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate("/market")}
                style={{ padding: 10 }}
              >
                <Text style={{ color: C.sun }}>Refill ↗</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
      <Island
        tab={tab}
        expanded={expanded}
        collapsedHeight={collapsedHeight}
        expandedHeight={expandedHeight}
        bottom={bottom}
        fullscreen={fullscreen}
        safeBottom={insets.bottom}
        contentKey={reportPage}
        badges={{ alerts: alerts.filter((a) => !a.read).length }}
        onTab={onTab}
        onToggle={() => setExpanded((e) => !e)}
      >
        {tab === "garden" && (
          <GardenSection
            selected={selected}
            onClearSelection={() => setSelected(null)}
            onSelect={(p) => {
              void onPlantPress(p);
            }}
            onChooseSpot={() => setExpanded(false)}
          />
        )}
        {tab === "goals" && <GoalsSection />}
        {tab === "coach" && <CoachSection />}
        {tab === "report" && <ReportSection onNavigate={() => setReportPage(p => p + 1)} />}
        {tab === "alerts" && <AlertsSection />}
      </Island>
      {plot && (
        <PlantingSheet
          key={`${plot.col}-${plot.row}`}
          plot={plot}
          onClose={() => setPlot(null)}
        />
      )}
      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </View>
  );
}
