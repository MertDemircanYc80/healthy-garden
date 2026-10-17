import { Fraunces_500Medium_Italic, Fraunces_600SemiBold, Fraunces_700Bold, useFonts } from "@expo-google-fonts/fraunces";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppStateProvider } from "@/state/AppState";
import { HealthProvider } from "@/state/Health";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fraunces_500Medium_Italic, Fraunces_600SemiBold, Fraunces_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <HealthProvider>
      <AppStateProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#16301F" } }} />
      </AppStateProvider>
    </HealthProvider>
  );
}
