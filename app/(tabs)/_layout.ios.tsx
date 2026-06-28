import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { IconSymbol } from "@/components/IconSymbol";
import { COLORS } from "@/constants/Colors";

export default function TabLayoutIOS() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={24} color={COLORS.primary} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="send">
        <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={24} color={COLORS.primary} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={COLORS.primary} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
