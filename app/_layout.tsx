import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BadgeProvider } from "@/contexts/BadgeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};


function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Re-read onboarding completion on every navigation so it stays fresh
  // (e.g. immediately after completeOnboarding() runs).
  useEffect(() => {
    let cancelled = false;
    isOnboardingComplete()
      .then((done) => { if (!cancelled) setOnboardingDone(done); })
      .catch(() => { if (!cancelled) setOnboardingDone(true); });
    return () => { cancelled = true; };
  }, [pathname]);

  // SINGLE source of truth for the gated chain: auth -> onboarding -> paywall -> home.
  // Each step redirects ONLY when the user is not already on it, which prevents
  // redirect loops. This guard OWNS routing for authenticated users — no other
  // guard should send them straight to home, or onboarding/paywall get skipped.
  useEffect(() => {
    if (loading || authLoading || onboardingDone === null) return;

    const onAuthFlow =
      pathname === "/auth" ||
      pathname.startsWith("/auth-popup") ||
      pathname.startsWith("/auth-callback");
    const onOnboarding = pathname.startsWith("/onboarding");
    const onPaywall = pathname === "/paywall";

    if (!user) {
      if (!onAuthFlow) router.replace("/auth");
      return;
    }
    if (!onboardingDone) {
      if (!onOnboarding) router.replace("/onboarding");
      return;
    }
    if (!isSubscribed) {
      if (!onPaywall) router.replace("/paywall");
      return;
    }
    // Fully unlocked — if stranded on a gate screen, proceed to home.
    if (onAuthFlow || onOnboarding || onPaywall) {
      router.replace("/(tabs)");
    }
  }, [isSubscribed, loading, authLoading, onboardingDone, pathname, user, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    "Nunito-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Nunito-Bold": require("../assets/fonts/SpaceMono-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <AuthProvider>
        <SubscriptionProvider>
          <SubscriptionRedirect />
        <NotificationProvider>
            <BadgeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="compliment/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="shop" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen name="notification-preferences" options={{ headerShown: false }} />
              </Stack>
              <SystemBars style="auto" />
            </GestureHandlerRootView>
            </BadgeProvider>
          </NotificationProvider>
        </SubscriptionProvider>
        </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
