// The island: one floating pine panel at the bottom that holds every section.
// Collapsed it shows a peek; tapping a section (or the handle) lifts it up over the meadow.
// The garden behind it never moves.
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { BellIcon, ChartIcon, ChevronIcon, LeafIcon, SparkIcon, TargetIcon } from "@/components/Icons";
import { C, R } from "@/theme";

export type TabKey = "garden" | "goals" | "coach" | "report" | "alerts";

const TABS: { key: TabKey; label: string; Icon: typeof LeafIcon }[] = [
  { key: "garden", label: "Garden", Icon: LeafIcon },
  { key: "goals", label: "Goals", Icon: TargetIcon },
  { key: "coach", label: "Coach", Icon: SparkIcon },
  { key: "report", label: "Report", Icon: ChartIcon },
  { key: "alerts", label: "Alerts", Icon: BellIcon },
];

export const TAB_BAR_H = 64;

interface Props {
  tab: TabKey;
  expanded: boolean;
  collapsedHeight: number;
  expandedHeight: number;
  bottom: number;
  badges?: Partial<Record<TabKey, number>>;
  onTab: (t: TabKey) => void;
  onToggle: () => void;
  children: React.ReactNode;
}

function tap() {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
}

export function Island({ tab, expanded, collapsedHeight, expandedHeight, bottom, badges, onTab, onToggle, children }: Props) {
  const h = useRef(new Animated.Value(expanded ? expandedHeight : collapsedHeight)).current;
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    Animated.spring(h, { toValue: expanded ? expandedHeight : collapsedHeight, useNativeDriver: false, damping: 22, stiffness: 220, mass: 0.9 }).start();
  }, [expanded, collapsedHeight, expandedHeight, h]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  return (
    <Animated.View style={[styles.island, { height: h, bottom }]}>
      <Pressable
        onPress={() => {
          tap();
          onToggle();
        }}
        style={styles.handleArea}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Lower the panel" : "Raise the panel"}
      >
        <View style={styles.handle} />
        <View style={{ position: "absolute", right: 14, top: 6 }}>
          <ChevronIcon color={C.fern} up={!expanded} size={16} />
        </View>
      </Pressable>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 18 }} showsVerticalScrollIndicator={false} scrollEnabled={expanded || tab === "garden"}>
        {children}
      </ScrollView>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map(({ key, label, Icon }) => {
          const active = key === tab;
          const badge = badges?.[key] ?? 0;
          return (
            <Pressable
              key={key}
              onPress={() => {
                tap();
                onTab(key);
              }}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={badge ? `${label}, ${badge} new` : label}
            >
              <View style={[styles.tabIcon, active && { backgroundColor: C.moss }]}>
                <Icon color={active ? C.pine : C.fern} size={21} />
                {badge > 0 && <View style={styles.badge} />}
              </View>
              <Text style={[styles.tabLabel, active && { color: C.mist }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  island: {
    position: "absolute",
    left: 10,
    right: 10,
    backgroundColor: C.pine,
    borderRadius: R.island,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#0B1A10",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  handleArea: { height: 22, alignItems: "center", justifyContent: "center" },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.pineLine },
  tabBar: {
    height: TAB_BAR_H,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.pineLine,
  },
  tab: { alignItems: "center", flex: 1, gap: 3 },
  tabIcon: { width: 44, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tabLabel: { color: C.fern, fontSize: 11, fontWeight: "600" },
  badge: { position: "absolute", top: 3, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.berry, borderWidth: 1.5, borderColor: C.pine },
});
