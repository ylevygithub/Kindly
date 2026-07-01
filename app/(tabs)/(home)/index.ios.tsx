import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import ConfettiAnimation, { ConfettiRef } from "@/components/ConfettiAnimation";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { NotificationBell } from "@/components/NotificationBell";
import { tfl, CATEGORY_DISPLAY } from "@/utils/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

interface Compliment {
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

function getRelativeTime(dateStr: string, lang: 'fr' | 'en'): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return tfl('home_justNow', lang);
  if (diffMins < 60) return tfl('home_minutesAgo', lang, diffMins);
  if (diffHours < 24) return tfl('home_hoursAgo', lang, diffHours);
  if (diffDays === 1) return tfl('home_yesterday', lang);
  return tfl('home_daysAgo', lang, diffDays);
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonCircle} />
        <View style={styles.skeletonLine} />
      </View>
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: "70%" }]} />
    </Animated.View>
  );
}

function ComplimentCard({ item, index, onReveal }: { item: Compliment; index: number; onReveal: (id: string) => void }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const tl = (key: Parameters<typeof tfl>[0]) => tfl(key, lang);
  const categoryIcon = CATEGORY_DISPLAY[item.category] || "💛";
  const relativeTime = getRelativeTime(item.created_at, lang);

  const handleGuess = () => {
    console.log("[Home] Deviner qui pressed for compliment:", item.id);
    router.push(`/compliment/${item.id}`);
  };

  const handleReveal = () => {
    onReveal(item.id);
  };

  return (
    <AnimatedListItem index={index}>
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            <Text style={styles.categoryText}>{item.category || "Autre"}</Text>
          </View>
          <Text style={styles.timeText}>{relativeTime}</Text>
        </View>

        {/* Compliment text */}
        <Text style={styles.complimentText}>{item.text}</Text>

        {/* Revealed sender */}
        {item.is_revealed ? (
          item.sender ? (
            <View style={styles.revealedRow}>
              <Text style={styles.senderAvatar}>{item.sender.avatar_emoji}</Text>
              <Text style={styles.senderUsername}>{item.sender.username}</Text>
              <View style={styles.revealedBadge}>
                <Text style={styles.revealedBadgeText}>{tl('home_revealed')}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.revealedBadge}>
              <Text style={styles.revealedBadgeText}>{tl('home_revealed')}</Text>
            </View>
          )
        ) : (
          <View style={styles.cardActions}>
            <AnimatedPressable onPress={handleGuess} style={styles.guessButton}>
              <Text style={styles.guessButtonText}>{tl('home_guess')}</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleReveal} style={styles.revealButton}>
              <Text style={styles.revealButtonText}>{tl('home_reveal')}</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </AnimatedListItem>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useLanguage();
  const tl = (key: Parameters<typeof tfl>[0]) => tfl(key, lang);
  const [renderKey, setRenderKey] = useState(0);
  const [compliments, setCompliments] = useState<Compliment[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);
  const prevCountRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setRenderKey(k => k + 1);
    }, [])
  );

  const handleReveal = useCallback(async (id: string) => {
    console.log("[Home] Révéler pressed for compliment:", id);
    try {
      const result = await authenticatedPost<any>(`/api/compliments/${id}/reveal`, {});
      console.log("[Home] Reveal success for compliment:", id, "sender:", result.sender?.username);
      setCompliments(prev => prev.map(c =>
        c.id === id ? { ...c, is_revealed: true, sender: result.sender } : c
      ));
      if (result.credits_remaining !== undefined) {
        setCredits(result.credits_remaining);
        console.log("[Home] Credits remaining after reveal:", result.credits_remaining);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const body = err?.body ?? err?.data ?? err;
      if (status === 402 || body?.error === 'insufficient_credits') {
        console.log("[Home] Insufficient credits, redirecting to paywall");
        router.push("/paywall");
      } else {
        console.log("[Home] Reveal error:", err);
      }
    }
  }, [router]);

  const fetchCompliments = useCallback(async (isRefresh = false) => {
    console.log("[Home] Fetching compliments, isRefresh:", isRefresh);
    try {
      const [data, profile] = await Promise.all([
        authenticatedGet<any>("/api/compliments"),
        authenticatedGet<any>("/api/profile"),
      ]);
      const arr: Compliment[] = Array.isArray(data) ? data : ((data as any)?.compliments || []);
      const newCount = arr.length;
      if (isRefresh && newCount > prevCountRef.current && prevCountRef.current > 0) {
        console.log("[Home] New compliments received! Triggering confetti");
        confettiRef.current?.trigger();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      prevCountRef.current = newCount;
      setCompliments(arr);
      if (profile?.credits !== undefined) {
        setCredits(profile.credits);
        console.log("[Home] Credits loaded:", profile.credits);
      }
    } catch (err) {
      console.log("[Home] Error fetching compliments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompliments();
  }, [fetchCompliments]);

  const handleRefresh = () => {
    console.log("[Home] Pull-to-refresh triggered");
    setRefreshing(true);
    fetchCompliments(true);
  };

  const totalCount = compliments.length;
  const appNameText = tl('appName');
  const noComplimentsText = tl('home_noCompliments');
  const noComplimentsSubtitleText = tl('home_noComplimentsSubtitle');
  const langToggleFlag = lang === 'fr' ? '🇫🇷' : '🇬🇧';

  return (
    <View key={renderKey} style={[styles.container, { paddingTop: insets.top }]}>
      <ConfettiAnimation ref={confettiRef} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{appNameText}</Text>
          <NotificationBell />
        </View>
        <View style={styles.headerRight}>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalCount}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              const next = lang === 'fr' ? 'en' : 'fr';
              console.log("[Home] Language toggled to:", next);
              setLang(next);
            }}
            style={styles.langToggle}
          >
            <Text style={styles.langToggleText}>{langToggleFlag}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : compliments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🌱</Text>
          </View>
          <Text style={styles.emptyTitle}>{noComplimentsText}</Text>
          <Text style={styles.emptySubtitle}>{noComplimentsSubtitleText}</Text>
        </View>
      ) : (
        <FlatList
          data={compliments}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ComplimentCard item={item} index={index} onReveal={handleReveal} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langToggle: {
    padding: 4,
  },
  langToggleText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.15)",

    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  complimentText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    fontWeight: "500",
  },
  revealedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 12,
    padding: 10,
  },
  senderAvatar: {
    fontSize: 22,
  },
  senderUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  revealedBadge: {
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
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  guessButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guessButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  revealButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  revealButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSecondary,
  },
  skeletonLine: {
    height: 14,
    width: 80,
    borderRadius: 7,
    backgroundColor: COLORS.surfaceSecondary,
  },
  skeletonText: {
    height: 14,
    width: "100%",
    borderRadius: 7,
    backgroundColor: COLORS.surfaceSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
