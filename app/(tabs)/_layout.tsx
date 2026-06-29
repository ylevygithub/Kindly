import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import FloatingTabBar from "@/components/FloatingTabBar";
import ContactImportModal from "@/components/ContactImportModal";
import { COLORS } from "@/constants/Colors";
import { useBadge } from "@/contexts/BadgeContext";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();
  const { homeBadgeCount, refreshBadge, markHomeSeen } = useBadge();
  const pathname = usePathname();

  // Refresh badge on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log("[TabLayout] Refreshing home badge on mount");
      refreshBadge();
    }
  }, [user, refreshBadge]);

  // When user navigates to home tab, mark as seen
  useEffect(() => {
    const isOnHome = pathname === "/" || pathname.includes("/(home)") || pathname === "/(tabs)/(home)";
    if (isOnHome && user) {
      console.log("[TabLayout] User navigated to home tab, marking as seen");
      markHomeSeen();
    }
  }, [pathname, user, markHomeSeen]);

  const TABS = [
    {
      name: "(home)",
      route: "/(tabs)/(home)" as const,
      icon: "favorite" as const,
      label: "Accueil",
      badge: homeBadgeCount,
    },
    {
      name: "send",
      route: "/(tabs)/send" as const,
      icon: "send" as const,
      label: "Envoyer",
    },
    {
      name: "profile",
      route: "/(tabs)/profile" as const,
      icon: "person" as const,
      label: "Profil",
    },
  ];

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="send" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar tabs={TABS} containerWidth={280} />
      <ContactImportModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
