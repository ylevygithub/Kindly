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
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost, authenticatedDelete } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useNotifications } from "@/contexts/NotificationContext";

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
  const { hasPermission } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Support modal state
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState("");

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

  const handleShareProfile = async () => {
    const username = profile?.username || user?.name || "moi";
    console.log("[Profile] Share profile button pressed, username:", username);
    try {
      const result = await Share.share(
        {
          message: `Envoie-moi un compliment anonyme sur Kindly ! 💛\nhttps://kindly.app/u/${username}`,
          title: "Mon profil Kindly",
        }
      );
      console.log("[Profile] Share result:", result.action);
    } catch (err) {
      console.log("[Profile] Share error:", err);
    }
  };

  const handleOpenSupportModal = () => {
    console.log("[Profile] Support modal opened");
    setSupportSubject("");
    setSupportMessage("");
    setSupportSending(false);
    setSupportSuccess(false);
    setSupportError("");
    setSupportModalVisible(true);
  };

  const handleCloseSupportModal = () => {
    console.log("[Profile] Support modal closed");
    setSupportModalVisible(false);
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportError("Merci de remplir tous les champs.");
      return;
    }
    console.log("[Profile] Sending support message, subject:", supportSubject);
    setSupportSending(true);
    setSupportError("");
    try {
      await authenticatedPost("/api/support/contact", {
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
      });
      console.log("[Profile] Support message sent successfully");
      setSupportSuccess(true);
      setTimeout(() => {
        setSupportModalVisible(false);
        setSupportSuccess(false);
      }, 2500);
    } catch (err) {
      console.log("[Profile] Support send error:", err);
      setSupportError("Erreur lors de l'envoi, réessaie.");
    } finally {
      setSupportSending(false);
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

  const handleDeleteAccount = () => {
    console.log("[Profile] Delete account button pressed");
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Tous tes compliments, crédits et données seront définitivement supprimés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          style: "destructive",
          onPress: () => {
            console.log("[Profile] Delete account first confirmation passed");
            Alert.alert(
              "Dernière confirmation",
              "Es-tu vraiment sûr(e) ? Ton compte sera supprimé immédiatement et ne pourra pas être récupéré.",
              [
                { text: "Non, garder mon compte", style: "cancel" },
                {
                  text: "Oui, supprimer définitivement",
                  style: "destructive",
                  onPress: async () => {
                    console.log("[Profile] Delete account final confirmation — calling DELETE /api/profiles/me");
                    setDeletingAccount(true);
                    try {
                      await authenticatedDelete("/api/profiles/me");
                      console.log("[Profile] Account deleted successfully, signing out");
                      await signOut();
                      router.replace("/auth");
                    } catch (err) {
                      console.log("[Profile] Delete account error:", err);
                      Alert.alert("Erreur", "Impossible de supprimer le compte. Réessaie ou contacte le support.");
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
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
              {/* Credits & streak pills */}
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>💛 {credits} crédits</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {streak > 0 ? `🔥 ${streak} jours` : "🌱 Nouveau"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Share profile button */}
          <AnimatedPressable
            onPress={handleShareProfile}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonText}>Partager mon profil 🔗</Text>
          </AnimatedPressable>

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
                  console.log("[Profile] Notifications settings item pressed");
                  router.push("/notification-preferences");
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>{hasPermission ? "🔔" : "🔕"}</Text>
                <Text style={styles.settingsItemText}>Notifications</Text>
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

          {/* Support button */}
          <AnimatedPressable
            onPress={handleOpenSupportModal}
            style={styles.supportButton}
          >
            <Text style={styles.supportButtonText}>Signaler un problème ✉️</Text>
          </AnimatedPressable>

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

          {/* Delete account */}
          <AnimatedPressable
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            style={styles.deleteAccountButton}
          >
            {deletingAccount ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
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

      {/* Support modal */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSupportModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contacter le support</Text>
              <TouchableOpacity onPress={handleCloseSupportModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {supportSuccess ? (
              <View style={styles.supportSuccessContainer}>
                <Text style={styles.supportSuccessEmoji}>💛</Text>
                <Text style={styles.supportSuccessText}>
                  Message envoyé ! On te répond sous 24h 💛
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.supportInput}
                  placeholder="Sujet"
                  placeholderTextColor={COLORS.textTertiary}
                  value={supportSubject}
                  onChangeText={(text) => {
                    console.log("[Profile] Support subject changed");
                    setSupportSubject(text);
                    setSupportError("");
                  }}
                  returnKeyType="next"
                  editable={!supportSending}
                />

                <TextInput
                  style={[styles.supportInput, styles.supportMessageInput]}
                  placeholder="Décris ton problème..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={supportMessage}
                  onChangeText={(text) => {
                    console.log("[Profile] Support message changed");
                    setSupportMessage(text);
                    setSupportError("");
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!supportSending}
                />

                {supportError.length > 0 && (
                  <Text style={styles.supportErrorText}>{supportError}</Text>
                )}

                <AnimatedPressable
                  onPress={() => {
                    console.log("[Profile] Support send button pressed");
                    handleSendSupport();
                  }}
                  disabled={supportSending}
                  style={[styles.supportSendButton, supportSending && styles.supportSendButtonDisabled]}
                >
                  {supportSending ? (
                    <ActivityIndicator color={COLORS.surface} size="small" />
                  ) : (
                    <Text style={styles.supportSendButtonText}>Envoyer</Text>
                  )}
                </AnimatedPressable>

                <TouchableOpacity
                  onPress={handleCloseSupportModal}
                  style={styles.supportCancelButton}
                  disabled={supportSending}
                >
                  <Text style={styles.supportCancelText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.25)",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  shareButton: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
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
  supportButton: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
  deleteAccountButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteAccountText: {
    fontSize: 14,
    color: COLORS.danger,
    opacity: 0.7,
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
  // Support modal styles
  supportInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportMessageInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  supportErrorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "500",
    paddingHorizontal: 4,
  },
  supportSendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  supportSendButtonDisabled: {
    opacity: 0.6,
  },
  supportSendButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  supportCancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  supportCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  supportSuccessContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  supportSuccessEmoji: {
    fontSize: 48,
  },
  supportSuccessText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 24,
  },
});
