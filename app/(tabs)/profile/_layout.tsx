import { Stack } from "expo-router";
import { COLORS } from "@/constants/Colors";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
