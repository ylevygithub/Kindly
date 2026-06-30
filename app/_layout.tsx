import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
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
import { AuthProvider } from "@/contexts/AuthContext";
import { BadgeProvider } from "@/contexts/BadgeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

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
        </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
