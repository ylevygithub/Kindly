import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost } from "@/utils/api";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import ConfettiAnimation, { ConfettiRef } from "@/components/ConfettiAnimation";

interface ComplimentDetail {
  id: string;
  text: string;
  category: string;
  created_at: string;
  is_revealed: boolean;
  sender?: {
    username: string;
    avatar_emoji: string;
  };
}

interface GuessSuggestion {
  id: string;
  username: string;
  avatar_emoji: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Personnalité: "🧠",
  Look: "✨",
  Talent: "🎯",
  Humour: "😂",
  Autre: "💛",
};

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return "hier";
  return `il y a ${diffDays}j`;
}

export default function ComplimentDetailScreen() {
  const { id, reveal } = useLocalSearchParams<{ id: string; reveal?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const confettiRef = useRef<ConfettiRef>(null);

  const [compliment, setCompliment] = useState<ComplimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [guessSuggestions, setGuessSuggestions] = useState<GuessSuggestion[]>([]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [guessResult, setGuessResult] = useState<"correct" | "incorrect" | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCompliment();
  }, [id]);

  useEffect(() => {
    if (reveal === "true" && compliment && !compliment.is_revealed) {
      handleReveal();
    }
  }, [reveal, compliment]);

  const loadCompliment = async () => {
    console.log("[ComplimentDetail] Loading compliment:", id);
    try {
      const [detail, suggestionsRaw] = await Promise.all([
        authenticatedGet<ComplimentDetail>(`/api/compliments/${id}`),
        authenticatedGet<any>(`/api/compliments/${id}/guess-suggestions`),
      ]);
      const suggestionsArr: GuessSuggestion[] = Array.isArray(suggestionsRaw)
        ? suggestionsRaw
        : ((suggestionsRaw as any)?.suggestions || []);
      setCompliment(detail);
      setGuessSuggestions(suggestionsArr);
      console.log("[ComplimentDetail] Loaded, is_revealed:", detail.is_revealed);
    } catch (err) {
      console.log("[ComplimentDetail] Error loading:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (userId: string) => {
    console.log("[ComplimentDetail] Guess pressed for user:", userId);
    setSelectedGuess(userId);
    try {
      const result = await authenticatedPost<{ correct: boolean }>(`/api/compliments/${id}/guess`, {
        guessed_user_id: userId,
      });
      setGuessResult(result.correct ? "correct" : "incorrect");
      console.log("[ComplimentDetail] Guess result:", result.correct ? "correct" : "incorrect");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.log("[ComplimentDetail] Guess error:", err);
    }
  };

  const handleReveal = async () => {
    console.log("[ComplimentDetail] Reveal button pressed for compliment:", id);
    setRevealing(true);
    try {
      const result = await authenticatedPost<ComplimentDetail>(`/api/compliments/${id}/reveal`, {});
      // Flip animation
      Animated.sequence([
        Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(flipAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      setCompliment(result);
      confettiRef.current?.trigger();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log("[ComplimentDetail] Reveal successful, sender:", result.sender?.username);
    } catch (err: any) {
      console.log("[ComplimentDetail] Reveal error:", err?.message);
      const msg = String(err?.message || "");
      if (msg.includes("credits") || msg.includes("insufficient")) {
        Alert.alert(
          "Crédits insuffisants",
          "Tu n'as pas assez de crédits 💛 pour révéler cet expéditeur.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Acheter des crédits", onPress: () => router.push("/shop") },
          ]
        );
      } else {
        Alert.alert("Erreur", "Impossible de révéler l'expéditeur.");
      }
    } finally {
      setRevealing(false);
    }
  };

  const handleShare = async () => {
    console.log("[ComplimentDetail] Share button pressed for compliment:", id);
    setSharing(true);
    try {
      await authenticatedPost(`/api/compliments/${id}/share`, {});
      await Share.share({
        message: `J'ai reçu un compliment sur Kindly 💛 : "${compliment?.text}" — Rejoins-moi sur Kindly !`,
        url: `https://kindly.app/c/${id}`,
      });
    } catch (err) {
      console.log("[ComplimentDetail] Share error:", err);
    } finally {
      setSharing(false);
    }
  };

  const categoryIcon = CATEGORY_ICONS[compliment?.category || ""] || "💛";
  const relativeTime = compliment ? getRelativeTime(compliment.created_at) : "";

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "0deg"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ConfettiAnimation ref={confettiRef} />

      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => {
          console.log("[ComplimentDetail] Back button pressed");
          router.back();
        }} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Compliment reçu 💛</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !compliment ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Compliment introuvable</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main compliment card */}
          <Animated.View
            style={[
              styles.mainCard,
              { transform: [{ rotateY: flipInterpolate }] },
            ]}
          >
            <View style={styles.mainCardHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                <Text style={styles.categoryText}>{compliment.category || "Autre"}</Text>
              </View>
              <Text style={styles.timeText}>{relativeTime}</Text>
            </View>
            <Text style={styles.complimentText}>{compliment.text}</Text>

            {compliment.is_revealed && (
              compliment.sender ? (
                <View style={styles.revealedSender}>
                  <Text style={styles.revealedSenderAvatar}>{compliment.sender.avatar_emoji}</Text>
                  <View>
                    <Text style={styles.revealedSenderName}>{compliment.sender.username}</Text>
                    <View style={styles.revealedBadge}>
                      <Text style={styles.revealedBadgeText}>Révélé ✓</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.revealedBadge}>
                  <Text style={styles.revealedBadgeText}>Révélé ✓</Text>
                </View>
              )
            )}
          </Animated.View>

          {/* Guess section (only if not revealed) */}
          {!compliment.is_revealed && guessSuggestions.length > 0 && (
            <View style={styles.guessSection}>
              <Text style={styles.guessSectionTitle}>Deviner qui t'a envoyé ça 🔍</Text>
              <View style={styles.guessGrid}>
                {guessSuggestions.map((suggestion) => {
                  const isSelected = selectedGuess === suggestion.id;
                  const isCorrect = isSelected && guessResult === "correct";
                  const isWrong = isSelected && guessResult === "incorrect";
                  return (
                    <AnimatedPressable
                      key={suggestion.id}
                      onPress={() => handleGuess(suggestion.id)}
                      disabled={!!selectedGuess}
                      style={[
                        styles.guessCard,
                        isSelected && styles.guessCardSelected,
                        isCorrect && styles.guessCardCorrect,
                        isWrong && styles.guessCardWrong,
                      ]}
                    >
                      <Text style={styles.guessAvatar}>{suggestion.avatar_emoji}</Text>
                      <Text style={styles.guessUsername}>{suggestion.username}</Text>
                      {isSelected && (
                        <Text style={styles.guessResultIcon}>
                          {guessResult === "correct" ? "✓" : "?"}
                        </Text>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </View>
              {guessResult && (
                <View style={[
                  styles.guessResultBanner,
                  guessResult === "correct" ? styles.guessResultBannerCorrect : styles.guessResultBannerIncorrect,
                ]}>
                  <Text style={styles.guessResultText}>
                    {guessResult === "correct"
                      ? "Peut-être ! Révèle pour en être sûr(e) 😉"
                      : "Hmm, peut-être pas... Révèle pour savoir ! 🤔"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Reveal button (only if not revealed) */}
          {!compliment.is_revealed && (
            <AnimatedPressable
              onPress={handleReveal}
              disabled={revealing}
              style={[styles.revealButton, revealing && styles.revealButtonLoading]}
            >
              {revealing ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <Text style={styles.revealButtonText}>Révéler avec 5 💛 crédits</Text>
                  <Text style={styles.revealButtonSubtext}>Découvre qui t'a envoyé ce compliment</Text>
                </>
              )}
            </AnimatedPressable>
          )}

          {/* Share button */}
          <AnimatedPressable
            onPress={handleShare}
            disabled={sharing}
            style={styles.shareButton}
          >
            {sharing ? (
              <ActivityIndicator color={COLORS.textSecondary} size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Partager en story 📸</Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 20,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.2)",

  },
  mainCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  complimentText: {
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 30,
    fontWeight: "600",
  },
  revealedSender: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  revealedSenderAvatar: {
    fontSize: 36,
  },
  revealedSenderName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  revealedBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.success,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  revealedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  guessSection: {
    gap: 14,
  },
  guessSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  guessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  guessCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,

  },
  guessCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  guessCardCorrect: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  guessCardWrong: {
    borderColor: COLORS.textTertiary,
    backgroundColor: COLORS.surfaceSecondary,
    opacity: 0.7,
  },
  guessAvatar: {
    fontSize: 32,
  },
  guessUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  guessResultIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  guessResultBanner: {
    borderRadius: 12,
    padding: 12,
  },
  guessResultBannerCorrect: {
    backgroundColor: "rgba(74,222,128,0.15)",
  },
  guessResultBannerIncorrect: {
    backgroundColor: COLORS.primaryMuted,
  },
  guessResultText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
  revealButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 4,

  },
  revealButtonLoading: {
    opacity: 0.7,
  },
  revealButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  revealButtonSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  shareButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
});
