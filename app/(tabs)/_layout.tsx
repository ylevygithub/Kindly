import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import FloatingTabBar from "@/components/FloatingTabBar";
import { COLORS } from "@/constants/Colors";

const TABS = [
  {
    name: "(home)",
    route: "/(tabs)/(home)" as const,
    icon: "favorite" as const,
    label: "Accueil",
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

export default function TabLayout() {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
