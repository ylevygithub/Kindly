/**
 * Notification Preferences Screen
 *
 * Allows users to manage push notification permissions and preferences.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNotifications } from "@/contexts/NotificationContext";
import { COLORS } from "@/constants/Colors";
import { useLanguage } from "@/contexts/LanguageContext";

const NOTIFICATION_CATEGORIES = [
  {
    key: "new_compliments",
    label: "Nouveaux compliments",
    description: "Quand tu reçois un nouveau compliment",
    defaultEnabled: true,
  },
  {
    key: "updates",
    label: "Mises à jour",
    description: "Nouvelles fonctionnalités et améliorations",
    defaultEnabled: true,
  },
  {
    key: "reminders",
    label: "Rappels",
    description: "Rappels d'activité et conseils",
    defaultEnabled: false,
  },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();
  const { hasPermission, permissionDenied, isWeb, requestPermission, sendTag, deleteTag } =
    useNotifications();

  const [categories, setCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((cat) => [cat.key, cat.defaultEnabled])
    )
  );

  const handleEnableNotifications = async () => {
    console.log("[NotificationPreferences] Enable notifications pressed");
    if (permissionDenied) {
      Alert.alert(
        "Notifications désactivées",
        "Pour recevoir des notifications, active-les dans les réglages de ton appareil.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Ouvrir les réglages",
            onPress: () => {
              console.log("[NotificationPreferences] Opening device settings");
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }
    const granted = await requestPermission();
    console.log("[NotificationPreferences] Permission request result:", granted);
  };

  const handleCategoryToggle = (key: string, value: boolean) => {
    console.log("[NotificationPreferences] Category toggled:", key, "->", value);
    setCategories((prev) => ({ ...prev, [key]: value }));
    if (value) {
      sendTag(`notify_${key}`, "true");
    } else {
      deleteTag(`notify_${key}`);
    }
  };

  if (isWeb) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.webMessage}>
            Les notifications push sont disponibles dans l'application mobile.
          </Text>
        </View>
      </View>
    );
  }

  const permissionStatusText = hasPermission ? "Activées" : "Désactivées";
  const permissionStatusIcon = hasPermission ? "🔔" : "🔕";
  const permissionDescText = hasPermission
    ? "Tu recevras des notifications push"
    : "Active les notifications pour rester informé(e)";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log("[NotificationPreferences] Back button pressed");
            router.back();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission status card */}
        <View style={styles.section}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <Text style={styles.permissionIcon}>{permissionStatusIcon}</Text>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionTitle}>
                  {permissionStatusText}
                </Text>
                <Text style={styles.permissionDescription}>
                  {permissionDescText}
                </Text>
              </View>
            </View>
            {!hasPermission && (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableNotifications}
              >
                <Text style={styles.enableButtonText}>Activer les notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification categories */}
        {hasPermission && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Types de notifications</Text>
            <View style={styles.categoriesCard}>
              {NOTIFICATION_CATEGORIES.map((category, index) => {
                const isLast = index === NOTIFICATION_CATEGORIES.length - 1;
                return (
                  <View key={category.key}>
                    <View style={styles.categoryRow}>
                      <View style={styles.categoryText}>
                        <Text style={styles.categoryLabel}>{category.label}</Text>
                        <Text style={styles.categoryDescription}>
                          {category.description}
                        </Text>
                      </View>
                      <Switch
                        value={categories[category.key]}
                        onValueChange={(value) =>
                          handleCategoryToggle(category.key, value)
                        }
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            💛 Tu peux modifier ces préférences à tout moment depuis les réglages de ton appareil.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  scrollContent: {
    paddingBottom: 60,
    gap: 8,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  webMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  permissionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionIcon: {
    fontSize: 32,
  },
  permissionTextContainer: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  permissionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  enableButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  enableButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  categoriesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryText: {
    flex: 1,
    gap: 2,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 16,
  },
  infoNote: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.2)",
  },
  infoNoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
