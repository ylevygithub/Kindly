import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Animated,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPressable } from "@/components/AnimatedPressable";

interface Profile {
  username: string;
  avatar_emoji: string;
  is_premium: boolean;
  credits: number;
  streak: number;
  total_received: number;
}

interface RecentUser {
  id: string;
  username: string;
  avatar_emoji: string;
}

function FlameIcon({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [active]);

  return (
    <Animated.Text style={[styles.flameEmoji, { transform: [{ scale }] }]}>
      🔥
    </Animated.Text>
  );
}

function SkeletonProfile() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity, gap: 16, padding: 20 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceSecondary, alignSelf: "center" }} />
      <View style={{ width: 120, height: 20, borderRadius: 10, backgroundColor: COLORS.surfaceSecondary, alignSelf: "center" }} />
      <View style={{ height: 80, borderRadius: 16, backgroundColor: COLORS.surfaceSecondary }} />
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    console.log("[Profile] Loading profile data");
    try {
      const data = await authenticatedGet<Profile>("/api/profiles/me");
      setProfile(data);
      console.log("[Profile] Profile loaded:", data.username);
    } catch (err) {
      console.log("[Profile] Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentUsers = async () => {
    console.log("[Profile] Loading recent users for block modal");
    try {
      const data = await authenticatedGet<RecentUser[]>("/api/users/recent");
      setRecentUsers(data);
    } catch {
      setRecentUsers([]);
    }
  };

  const handleSignOut = () => {
    console.log("[Profile] Sign out button pressed");
    Alert.alert(
      "Se déconnecter",
      "Tu vas être déconnecté(e) de Kindly.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            console.log("[Profile] Sign out confirmed");
            setSigningOut(true);
            try {
              await signOut();
              router.replace("/auth");
            } catch (err) {
              console.log("[Profile] Sign out error:", err);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async (userId: string, username: string) => {
    console.log("[Profile] Block user pressed:", username);
    Alert.alert(
      `Bloquer ${username} ?`,
      "Cet utilisateur ne pourra plus t'envoyer de compliments.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: async () => {
            console.log("[Profile] Blocking user:", userId);
            try {
              await authenticatedPost("/api/users/block", { user_id: userId });
              setRecentUsers((prev) => prev.filter((u) => u.id !== userId));
              Alert.alert("✓", `${username} a été bloqué(e).`);
            } catch {
              Alert.alert("Erreur", "Impossible de bloquer cet utilisateur.");
            }
          },
        },
      ]
    );
  };

  const totalReceived = profile?.total_received ?? 0;
  const streak = profile?.streak ?? 0;
  const credits = profile?.credits ?? 0;
  const isPremium = profile?.is_premium ?? false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil 👤</Text>
      </View>

      {loading ? (
        <SkeletonProfile />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + username */}
          <View style={styles.profileHero}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{profile?.avatar_emoji || "😊"}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.usernameRow}>
                <Text style={styles.username}>{profile?.username || user?.name || "Utilisateur"}</Text>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>✨ Plus</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalReceived}</Text>
              <Text style={styles.statLabel}>Reçus</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <View style={styles.streakRow}>
                <FlameIcon active={streak > 0} />
                <Text style={styles.statValue}>{streak}</Text>
              </View>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{credits}</Text>
              <Text style={styles.statLabel}>Crédits 💛</Text>
            </View>
          </View>

          {/* Kindly Plus section */}
          {!isPremium && (
            <AnimatedPressable
              onPress={() => {
                console.log("[Profile] Kindly Plus card pressed");
                router.push("/shop");
              }}
              style={styles.plusCard}
            >
              <View style={styles.plusCardGradient}>
                <View style={styles.plusCardContent}>
                  <Text style={styles.plusCardTitle}>✨ Kindly Plus</Text>
                  <Text style={styles.plusCardSubtitle}>
                    Envois illimités, reveals gratuits et plus encore
                  </Text>
                  <View style={styles.plusCardButton}>
                    <Text style={styles.plusCardButtonText}>Essayer Kindly Plus →</Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          )}

          {/* Credits section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crédits 💛</Text>
            <View style={styles.creditsCard}>
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsValue}>{credits} crédits</Text>
                <Text style={styles.creditsSubtext}>Utilisés pour révéler l'expéditeur</Text>
              </View>
              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Buy credits button pressed");
                  router.push("/shop");
                }}
                style={styles.buyCreditsButton}
              >
                <Text style={styles.buyCreditsText}>Acheter</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Settings section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Réglages</Text>
            <View style={styles.settingsCard}>
              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Report problem pressed");
                  Linking.openURL("mailto:support@kindly.app?subject=Signalement%20d%27un%20problème");
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>🚨</Text>
                <Text style={styles.settingsItemText}>Signaler un problème</Text>
                <Text style={styles.settingsItemChevron}>›</Text>
              </AnimatedPressable>

              <View style={styles.settingsDivider} />

              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Block user button pressed");
                  loadRecentUsers();
                  setBlockModalVisible(true);
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>🚫</Text>
                <Text style={styles.settingsItemText}>Bloquer un utilisateur</Text>
                <Text style={styles.settingsItemChevron}>›</Text>
              </AnimatedPressable>

              <View style={styles.settingsDivider} />

              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] CGU link pressed");
                  Linking.openURL("https://kindly.app/cgu");
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>📄</Text>
                <Text style={styles.settingsItemText}>CGU et confidentialité</Text>
                <Text style={styles.settingsItemChevron}>›</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Sign out */}
          <AnimatedPressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={styles.signOutButton}
          >
            {signingOut ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <Text style={styles.signOutText}>Se déconnecter</Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      )}

      {/* Block user modal */}
      <Modal
        visible={blockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquer un utilisateur</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log("[Profile] Block modal closed");
                  setBlockModalVisible(false);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {recentUsers.length === 0 ? (
              <Text style={styles.modalEmpty}>Aucun utilisateur récent</Text>
            ) : (
              recentUsers.map((u) => (
                <AnimatedPressable
                  key={u.id}
                  onPress={() => handleBlockUser(u.id, u.username)}
                  style={styles.blockUserItem}
                >
                  <Text style={styles.blockUserAvatar}>{u.avatar_emoji}</Text>
                  <Text style={styles.blockUserName}>{u.username}</Text>
                  <Text style={styles.blockUserAction}>Bloquer</Text>
                </AnimatedPressable>
              ))
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 20,
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  username: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  premiumBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardMiddle: {
    borderColor: "rgba(255,184,48,0.2)",
    backgroundColor: COLORS.primaryMuted,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  flameEmoji: {
    fontSize: 20,
  },
  plusCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  plusCardGradient: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 2,
  },
  plusCardContent: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  plusCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  plusCardSubtitle: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
    lineHeight: 20,
  },
  plusCardButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  plusCardButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 4,
  },
  creditsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  creditsInfo: {
    flex: 1,
    gap: 2,
  },
  creditsValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  creditsSubtext: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  buyCreditsButton: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buyCreditsText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsItemIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  settingsItemChevron: {
    fontSize: 20,
    color: COLORS.textTertiary,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 52,
  },
  signOutButton: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textTertiary,
    padding: 4,
  },
  modalEmpty: {
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: "center",
    paddingVertical: 20,
  },
  blockUserItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
  },
  blockUserAvatar: {
    fontSize: 24,
  },
  blockUserName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  blockUserAction: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
  },
});
