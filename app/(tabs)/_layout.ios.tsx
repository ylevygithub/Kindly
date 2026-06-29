import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { usePathname } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import ContactImportModal from "@/components/ContactImportModal";
import { COLORS } from "@/constants/Colors";
import { useBadge } from "@/contexts/BadgeContext";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayoutIOS() {
  const { user } = useAuth();
  const { homeBadgeCount, refreshBadge, markHomeSeen } = useBadge();
  const pathname = usePathname();

  // Refresh badge on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log("[TabLayoutIOS] Refreshing home badge on mount");
      refreshBadge();
    }
  }, [user, refreshBadge]);

  // When user navigates to home tab, mark as seen
  useEffect(() => {
    const isOnHome = pathname === "/" || pathname.includes("/(home)") || pathname === "/(tabs)/(home)";
    if (isOnHome && user) {
      console.log("[TabLayoutIOS] User navigated to home tab, marking as seen");
      markHomeSeen();
    }
  }, [pathname, user, markHomeSeen]);

  const badgeText = homeBadgeCount > 0 ? String(homeBadgeCount) : undefined;

  return (
    <View style={styles.container}>
      <NativeTabs>
        <NativeTabs.Trigger
          name="(home)"
          options={badgeText ? { badgeValue: badgeText } : undefined}
        >
          <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={24} color={COLORS.primary} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="send">
          <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={24} color={COLORS.primary} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={COLORS.primary} />
        </NativeTabs.Trigger>
      </NativeTabs>
      <ContactImportModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
