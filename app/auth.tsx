import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/utils/api";
import { COLORS } from "@/constants/Colors";
import { t } from "@/utils/i18n";

function AppleLogo({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <Path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <Path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <Path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </Svg>
  );
}

export default function AuthScreen() {
  const { user, signInWithApple, signInWithGoogle } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const checkProfile = useCallback(async () => {
    try {
      await apiGet("/api/profiles/me");
      console.log("[Auth] Profile found, redirecting to home");
      router.replace("/onboarding");
    } catch (err: any) {
      if (err?.message?.includes("404") || String(err).includes("404")) {
        console.log("[Auth] No profile found, redirecting to onboarding");
        router.replace("/onboarding");
      } else {
        console.log("[Auth] Profile check error, redirecting to home:", err);
        router.replace("/onboarding");
      }
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      console.log("[Auth] User signed in, checking profile...");
      checkProfile();
    }
  }, [user, checkProfile]);

  const handleAppleSignIn = async () => {
    console.log("[Auth] Apple sign-in button pressed");
    setLoadingApple(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      console.log("[Auth] Apple sign-in error:", err?.message);
      if (!String(err?.message).includes("cancel")) {
        Alert.alert(t('error_generic'), "La connexion avec Apple a échoué. Réessaie.");
      }
    } finally {
      setLoadingApple(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("[Auth] Google sign-in button pressed");
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.log("[Auth] Google sign-in error:", err?.message);
      Alert.alert(t('error_generic'), "La connexion avec Google a échoué. Réessaie.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Gradient background via layered views */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>💛</Text>
          </View>
          <Text style={styles.appName}>Kindly</Text>
          <Text style={styles.tagline}>{t('auth_subtitle')}</Text>
        </View>

        {/* Decorative cards */}
        <View style={styles.decorativeRow}>
          <View style={[styles.decorativeCard, { transform: [{ rotate: "-4deg" }] }]}>
            <Text style={styles.decorativeEmoji}>✨</Text>
            <Text style={styles.decorativeText}>Tu es incroyable !</Text>
          </View>
          <View style={[styles.decorativeCard, { transform: [{ rotate: "3deg" }], backgroundColor: COLORS.accentMuted }]}>
            <Text style={styles.decorativeEmoji}>🌟</Text>
            <Text style={styles.decorativeText}>Tu illumines ma journée</Text>
          </View>
        </View>

        {/* Auth buttons */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={[styles.appleButton, loadingApple && styles.buttonLoading]}
            onPress={handleAppleSignIn}
            disabled={loadingApple || loadingGoogle}
            activeOpacity={0.85}
          >
            {loadingApple ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <AppleLogo size={20} color="#FFFFFF" />
                <Text style={styles.appleButtonText}>{t('auth_continueApple')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton, loadingGoogle && styles.buttonLoading]}
            onPress={handleGoogleSignIn}
            disabled={loadingApple || loadingGoogle}
            activeOpacity={0.85}
          >
            {loadingGoogle ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <GoogleLogo size={20} />
                <Text style={styles.googleButtonText}>{t('auth_continueGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={styles.legalText}>
          {t('auth_terms')}
          {' '}
          {t('auth_termsLink')}
          {' '}
          {t('auth_and')}
          {' '}
          {t('auth_privacyLink')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#FFF3C4',
    opacity: 0.7,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#FFE4EE',
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 8px 24px rgba(255,184,48,0.35)',
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  decorativeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  decorativeCard: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    maxWidth: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  decorativeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  decorativeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 24,
  },
  appleButton: {
    backgroundColor: '#1A1207',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 4px 12px rgba(26,18,7,0.2)',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    boxShadow: '0 2px 8px rgba(26,18,7,0.06)',
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonLoading: {
    opacity: 0.7,
  },
  legalText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
