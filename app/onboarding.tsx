import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/Colors";
import { apiPost } from "@/utils/api";
import { setOnboardingComplete } from "@/utils/onboardingStorage";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { t, isFrench } from "@/utils/i18n";

const AVATAR_EMOJIS = [
  "😊", "🌟", "🦋", "🌸", "✨", "🎉", "🌈", "💫", "🦄", "🍀",
  "🎨", "🎵", "🌺", "🦊", "🐬", "🌙", "⭐", "🎭", "🌻", "💎",
];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_EMOJIS[0]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const isUsernameValid = USERNAME_REGEX.test(username);
  const canSubmit = isUsernameValid && accepted && !loading;

  const validateUsername = (value: string) => {
    if (value.length === 0) {
      setUsernameError("");
    } else if (value.length < 3) {
      setUsernameError(isFrench ? "Au moins 3 caractères" : "At least 3 characters");
    } else if (value.length > 20) {
      setUsernameError(isFrench ? "Maximum 20 caractères" : "Maximum 20 characters");
    } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError(isFrench ? "Lettres, chiffres et _ uniquement" : "Letters, numbers and _ only");
    } else {
      setUsernameError("");
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    validateUsername(value);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    console.log("[Onboarding] Submit pressed — username:", username, "avatar:", selectedAvatar);
    setLoading(true);
    try {
      await apiPost("/api/profiles/setup", {
        username,
        avatar_emoji: selectedAvatar,
      });
      console.log("[Onboarding] Profile setup successful, marking onboarding complete");
      await setOnboardingComplete();
      console.log("[Onboarding] Onboarding marked complete, redirecting to home");
      router.replace("/(tabs)/(home)");
    } catch (err: any) {
      console.log("[Onboarding] Profile setup error:", err?.message);
      if (String(err?.message).includes("409") || String(err?.message).includes("username")) {
        setUsernameError(isFrench ? "Ce pseudo est déjà pris, essaie-en un autre" : "This username is already taken, try another one");
      } else {
        Alert.alert(t('error_generic'), isFrench ? "Impossible de créer ton profil. Réessaie." : "Unable to create your profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding_title')} 🌟</Text>
          <Text style={styles.subtitle}>
            {isFrench ? "Choisis un pseudo et un avatar pour commencer à envoyer des compliments !" : "Choose a username and avatar to start sending compliments!"}
          </Text>
        </View>

        {/* Avatar selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('onboarding_emojiLabel')}</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_EMOJIS.map((emoji) => {
              const isSelected = selectedAvatar === emoji;
              return (
                <AnimatedPressable
                  key={emoji}
                  onPress={() => {
                    console.log("[Onboarding] Avatar selected:", emoji);
                    setSelectedAvatar(emoji);
                  }}
                  style={[
                    styles.avatarItem,
                    isSelected && styles.avatarItemSelected,
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Username input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('onboarding_usernameLabel')}</Text>
          <TextInput
            style={[
              styles.input,
              usernameError ? styles.inputError : null,
              isUsernameValid && username.length > 0 ? styles.inputValid : null,
            ]}
            placeholder={t('onboarding_usernamePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
          />
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : isUsernameValid && username.length > 0 ? (
            <Text style={styles.successText}>{isFrench ? "✓ Pseudo disponible !" : "✓ Username available!"}</Text>
          ) : (
            <Text style={styles.hintText}>{isFrench ? "3-20 caractères, lettres, chiffres et _" : "3-20 characters, letters, numbers and _"}</Text>
          )}
        </View>

        {/* Preview */}
        {username.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewAvatar}>{selectedAvatar}</Text>
            <View>
              <Text style={styles.previewUsername}>{username || "ton_pseudo"}</Text>
              <Text style={styles.previewLabel}>{isFrench ? "Aperçu de ton profil" : "Profile preview"}</Text>
            </View>
          </View>
        )}

        {/* Terms checkbox */}
        <AnimatedPressable
          onPress={() => {
            console.log("[Onboarding] Terms checkbox toggled:", !accepted);
            setAccepted(!accepted);
          }}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            <Text style={{ color: COLORS.textSecondary }}>{t('onboarding_terms') + ' '}</Text>
            <Text
              style={styles.cguLink}
              onPress={() => {
                console.log("[Onboarding] CGU link tapped");
                Linking.openURL("https://kindly.app/cgu");
              }}
            >
              {t('onboarding_termsLink')}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>{isFrench ? " et je m'engage à rester bienveillant(e). Aucun contenu insultant ou harcelant n'est toléré." : " and I commit to staying kind. No insulting or harassing content is tolerated."}</Text>
          </Text>
        </AnimatedPressable>

        {/* Submit button */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>{t('onboarding_submit')} 💛</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  avatarItem: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarItemSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputValid: {
    borderColor: COLORS.success,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    marginTop: -4,
  },
  successText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: "600",
    marginTop: -4,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: -4,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: "0 2px 8px rgba(26,18,7,0.06)",
  },
  previewAvatar: {
    fontSize: 40,
  },
  previewUsername: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  previewLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cguLink: {
    color: COLORS.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(255,184,48,0.35)",
  },
  submitButtonDisabled: {
    opacity: 0.5,
    boxShadow: "none",
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
});
