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
  Image,
  ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost, authenticatedDelete } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { t, tf, tfl } from "@/utils/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import * as ImagePicker from "expo-image-picker";

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Profile {
  username: string;
  avatar_emoji: string;
  avatar_url?: string;
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

function getStreakStage(streak: number): {
  emoji: string;
  labelKey: 'streak_stage_1' | 'streak_stage_7' | 'streak_stage_30' | 'streak_stage_90' | 'streak_stage_180' | 'streak_stage_365';
  nextThreshold: number | null;
  color: string;
} {
  if (streak >= 365) return { emoji: '🌳', labelKey: 'streak_stage_365', nextThreshold: null, color: '#4A7C59' };
  if (streak >= 180) return { emoji: '🌲', labelKey: 'streak_stage_180', nextThreshold: 365, color: '#2D6A4F' };
  if (streak >= 90)  return { emoji: '🌿', labelKey: 'streak_stage_90',  nextThreshold: 180, color: '#52B788' };
  if (streak >= 30)  return { emoji: '🪴', labelKey: 'streak_stage_30',  nextThreshold: 90,  color: '#74C69D' };
  if (streak >= 7)   return { emoji: '🌱', labelKey: 'streak_stage_7',   nextThreshold: 30,  color: '#95D5B2' };
  return               { emoji: '🌱', labelKey: 'streak_stage_1',   nextThreshold: 7,   color: '#B7E4C7' };
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const { isSubscribed } = useSubscription();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [plantModalVisible, setPlantModalVisible] = useState(false);

  const tl = (key: Parameters<typeof tfl>[0]) => tfl(key, lang);

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
      if (data.avatar_url) setAvatarUri(data.avatar_url);
      console.log("[Profile] Profile loaded:", data.username);
    } catch (err) {
      console.log("[Profile] Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = async () => {
    console.log("[Profile] Avatar pressed — opening image picker");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (base64) {
        console.log("[Profile] Avatar image selected, uploading...");
        try {
          const response = await authenticatedPost<{ avatar_url: string }>('/api/profile/avatar', { avatar_base64: base64 });
          if (response?.avatar_url) {
            console.log("[Profile] Avatar uploaded successfully:", response.avatar_url);
            setAvatarUri(response.avatar_url);
          }
        } catch (e) {
          console.log("[Profile] Avatar upload failed, using local URI:", e);
          setAvatarUri(asset.uri);
        }
      }
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
      setSupportError(lang === 'fr' ? "Merci de remplir tous les champs." : "Please fill in all fields.");
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
      setSupportError(lang === 'fr' ? "Erreur lors de l'envoi, réessaie." : "Error sending message, please try again.");
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
  // isPremium: true if backend says so OR if RevenueCat subscription is active
  const isPremium = (profile?.is_premium ?? false) || isSubscribed;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, styles.headerRow]}>
        <Text style={styles.headerTitle}>{tl('profile_title')} 👤</Text>
        <TouchableOpacity
          onPress={() => {
            const next = lang === 'fr' ? 'en' : 'fr';
            console.log("[Profile] Language toggled to:", next);
            setLang(next);
          }}
          style={styles.langToggle}
        >
          <Text style={styles.langToggleText}>{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</Text>
        </TouchableOpacity>

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
            <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarCircle}>
              {avatarUri ? (
                <Image source={resolveImageSource(avatarUri)} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{profile?.avatar_emoji || "😊"}</Text>
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditBadgeText}>✏️</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <View style={styles.usernameRow}>
                <Text style={styles.username}>{profile?.username || user?.name || "Utilisateur"}</Text>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{tl('profile_premium')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {/* Credits & streak pills */}
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>💛 {credits} {tl('profile_credits')}</Text>
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
            <Text style={styles.shareButtonText}>{lang === 'fr' ? "Partager mon profil 🔗" : "Share my profile 🔗"}</Text>
          </AnimatedPressable>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalReceived}</Text>
              <Text style={styles.statLabel}>{lang === 'fr' ? "Reçus" : "Received"}</Text>
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
              <Text style={styles.statLabel}>{lang === 'fr' ? "Crédits 💛" : "Credits 💛"}</Text>
            </View>
          </View>

          {/* Plant widget */}
          {(() => {
            const stage = getStreakStage(streak);
            const label = t(stage.labelKey);
            const startText = lang === 'fr' ? "Commence aujourd'hui !" : 'Start today!';
            const subtextValue = streak > 0 ? tf('streak_plant_days', streak) : startText;
            return (
              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Plant widget pressed, streak:", streak);
                  setPlantModalVisible(true);
                }}
                style={styles.plantWidget}
              >
                <View style={[styles.plantEmojiContainer, { backgroundColor: stage.color + '22' }]}>
                  <Text style={styles.plantEmoji}>{stage.emoji}</Text>
                </View>
                <View style={styles.plantInfo}>
                  <Text style={styles.plantLabel}>{label}</Text>
                  <Text style={styles.plantSubtext}>{subtextValue}</Text>
                </View>
                <Text style={styles.plantChevron}>›</Text>
              </AnimatedPressable>
            );
          })()}

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
                    {lang === 'fr' ? "Envois illimités, reveals gratuits et plus encore" : "Unlimited sends, free reveals and more"}
                  </Text>
                  <View style={styles.plusCardButton}>
                    <Text style={styles.plusCardButtonText}>{lang === 'fr' ? "Essayer Kindly Plus →" : "Try Kindly Plus →"}</Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          )}

          {/* Credits section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{lang === 'fr' ? "Crédits 💛" : "Credits 💛"}</Text>
            <View style={styles.creditsCard}>
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsValue}>{credits} {tl('profile_credits')}</Text>
                <Text style={styles.creditsSubtext}>{lang === 'fr' ? "Utilisés pour révéler l'expéditeur" : "Used to reveal the sender"}</Text>
              </View>
              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Buy credits button pressed");
                  router.push("/shop");
                }}
                style={styles.buyCreditsButton}
              >
                <Text style={styles.buyCreditsText}>{tl('shop_buy')}</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Settings section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{lang === 'fr' ? "Réglages" : "Settings"}</Text>
            <View style={styles.settingsCard}>
              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Boutique settings item pressed");
                  router.push("/shop");
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>💛</Text>
                <Text style={styles.settingsItemText}>{lang === 'fr' ? "Boutique" : "Shop"}</Text>
                <Text style={styles.settingsItemChevron}>›</Text>
              </AnimatedPressable>

              <View style={styles.settingsDivider} />

              <AnimatedPressable
                onPress={() => {
                  console.log("[Profile] Notifications settings item pressed");
                  router.push("/notification-preferences");
                }}
                style={styles.settingsItem}
              >
                <Text style={styles.settingsItemIcon}>{hasPermission ? "🔔" : "🔕"}</Text>
                <Text style={styles.settingsItemText}>{tl('profile_notifications')}</Text>
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
                <Text style={styles.settingsItemText}>{lang === 'fr' ? "Bloquer un utilisateur" : "Block a user"}</Text>
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
                <Text style={styles.settingsItemText}>{lang === 'fr' ? "CGU et confidentialité" : "Terms & Privacy"}</Text>
                <Text style={styles.settingsItemChevron}>›</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Support button */}
          <AnimatedPressable
            onPress={handleOpenSupportModal}
            style={styles.supportButton}
          >
            <Text style={styles.supportButtonText}>{lang === 'fr' ? "Signaler un problème ✉️" : "Report an issue ✉️"}</Text>
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
              <Text style={styles.signOutText}>{tl('profile_logout')}</Text>
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
              <Text style={styles.deleteAccountText}>{lang === 'fr' ? "Supprimer mon compte" : "Delete my account"}</Text>
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
              <Text style={styles.modalTitle}>{lang === 'fr' ? "Bloquer un utilisateur" : "Block a user"}</Text>
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
              <Text style={styles.modalEmpty}>{lang === 'fr' ? "Aucun utilisateur récent" : "No recent users"}</Text>
            ) : (
              recentUsers.map((u) => (
                <AnimatedPressable
                  key={u.id}
                  onPress={() => handleBlockUser(u.id, u.username)}
                  style={styles.blockUserItem}
                >
                  <Text style={styles.blockUserAvatar}>{u.avatar_emoji}</Text>
                  <Text style={styles.blockUserName}>{u.username}</Text>
                  <Text style={styles.blockUserAction}>{lang === 'fr' ? "Bloquer" : "Block"}</Text>
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
              <Text style={styles.modalTitle}>{lang === 'fr' ? "Contacter le support" : "Contact Support"}</Text>
              <TouchableOpacity onPress={handleCloseSupportModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {supportSuccess ? (
              <View style={styles.supportSuccessContainer}>
                <Text style={styles.supportSuccessEmoji}>💛</Text>
                <Text style={styles.supportSuccessText}>
                  {lang === 'fr' ? "Message envoyé ! On te répond sous 24h 💛" : "Message sent! We'll reply within 24h 💛"}
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.supportInput}
                  placeholder={lang === 'fr' ? "Sujet" : "Subject"}
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
                  placeholder={lang === 'fr' ? "Décris ton problème..." : "Describe your issue..."}
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
                    <Text style={styles.supportSendButtonText}>{lang === 'fr' ? "Envoyer" : "Send"}</Text>
                  )}
                </AnimatedPressable>

                <TouchableOpacity
                  onPress={handleCloseSupportModal}
                  style={styles.supportCancelButton}
                  disabled={supportSending}
                >
                  <Text style={styles.supportCancelText}>{lang === 'fr' ? "Annuler" : "Cancel"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Plant info modal */}
      <Modal
        visible={plantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          console.log("[Profile] Plant modal closed");
          setPlantModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {(() => {
              const stage = getStreakStage(streak);
              const label = tl(stage.labelKey);
              const stages: { threshold: number; labelKey: Parameters<typeof tl>[0]; emoji: string }[] = [
                { threshold: 1,   labelKey: 'streak_stage_1',   emoji: '🌱' },
                { threshold: 7,   labelKey: 'streak_stage_7',   emoji: '🌱' },
                { threshold: 30,  labelKey: 'streak_stage_30',  emoji: '🪴' },
                { threshold: 90,  labelKey: 'streak_stage_90',  emoji: '🌿' },
                { threshold: 180, labelKey: 'streak_stage_180', emoji: '🌲' },
                { threshold: 365, labelKey: 'streak_stage_365', emoji: '🌳' },
              ];
              const day0Text = lang === 'fr' ? 'Jour 0' : 'Day 0';
              const heroDaysText = streak > 0 ? tf('streak_plant_days', streak) : day0Text;
              const nextText = stage.nextThreshold !== null
                ? tf('streak_plant_next_in', stage.nextThreshold - streak)
                : tl('streak_plant_max');
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{tl('streak_plant_title')}</Text>
                    <TouchableOpacity onPress={() => {
                      console.log("[Profile] Plant modal close button pressed");
                      setPlantModalVisible(false);
                    }}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Current stage hero */}
                  <View style={styles.plantModalHero}>
                    <Text style={styles.plantModalEmoji}>{stage.emoji}</Text>
                    <Text style={styles.plantModalStageName}>{label}</Text>
                    <Text style={styles.plantModalDays}>{heroDaysText}</Text>
                  </View>

                  {/* Subtitle */}
                  <Text style={styles.plantModalSubtitle}>{tl('streak_plant_subtitle')}</Text>

                  {/* All stages list */}
                  <View style={styles.plantStagesList}>
                    {stages.map((s) => {
                      const isReached = streak >= s.threshold;
                      const isCurrent = stage.labelKey === s.labelKey;
                      const stageLabel = tl(s.labelKey);
                      const thresholdText = s.threshold === 1
                        ? (lang === 'fr' ? 'Jour 1' : 'Day 1')
                        : (lang === 'fr' ? `${s.threshold} jours` : `${s.threshold} days`);
                      return (
                        <View key={s.threshold} style={[styles.plantStageRow, isCurrent && styles.plantStageRowCurrent]}>
                          <Text style={[styles.plantStageEmoji, !isReached && styles.plantStageDimmed]}>{s.emoji}</Text>
                          <View style={styles.plantStageInfo}>
                            <Text style={[styles.plantStageName, !isReached && styles.plantStageDimmed]}>{stageLabel}</Text>
                            <Text style={styles.plantStageThreshold}>{thresholdText}</Text>
                          </View>
                          {isReached && <Text style={styles.plantStageCheck}>✓</Text>}
                        </View>
                      );
                    })}
                  </View>

                  {/* Next stage info */}
                  <Text style={styles.plantNextText}>{nextText}</Text>

                  {/* Warning */}
                  <Text style={styles.plantMissText}>{tl('streak_plant_miss')}</Text>

                  {/* Close button */}
                  <AnimatedPressable
                    onPress={() => {
                      console.log("[Profile] Plant modal close button (bottom) pressed");
                      setPlantModalVisible(false);
                    }}
                    style={styles.plantCloseButton}
                  >
                    <Text style={styles.plantCloseButtonText}>{tl('streak_plant_close')}</Text>
                  </AnimatedPressable>
                </>
              );
            })()}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  langToggle: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
  },
  langToggleText: {
    fontSize: 20,
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarEditBadgeText: {
    fontSize: 10,
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
  // Plant widget
  plantWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  plantEmojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantEmoji: {
    fontSize: 28,
  },
  plantInfo: {
    flex: 1,
    gap: 2,
  },
  plantLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  plantSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  plantChevron: {
    fontSize: 20,
    color: COLORS.textTertiary,
  },
  // Plant modal
  plantModalHero: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  plantModalEmoji: {
    fontSize: 56,
  },
  plantModalStageName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  plantModalDays: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  plantModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  plantStagesList: {
    gap: 8,
    marginTop: 4,
  },
  plantStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSecondary,
  },
  plantStageRowCurrent: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  plantStageEmoji: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  plantStageDimmed: {
    opacity: 0.35,
  },
  plantStageInfo: {
    flex: 1,
  },
  plantStageName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  plantStageThreshold: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  plantStageCheck: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800',
  },
  plantNextText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  plantMissText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  plantCloseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  plantCloseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
});
