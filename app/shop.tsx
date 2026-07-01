import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/Colors";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { t, isFrench } from "@/utils/i18n";

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonBlock({ width, height, style }: { width?: number | string; height: number; style?: object }) {
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
    <Animated.View
      style={[
        { height, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary },
        width ? { width } : { flex: 1 },
        { opacity },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ gap: 20, paddingHorizontal: 16, paddingTop: 20 }}>
      <SkeletonBlock height={80} />
      <View style={{ gap: 12 }}>
        <SkeletonBlock height={20} width={160} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SkeletonBlock height={180} />
          <SkeletonBlock height={180} />
        </View>
        <SkeletonBlock height={52} />
      </View>
      <View style={{ gap: 12 }}>
        <SkeletonBlock height={20} width={140} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonBlock height={130} />
          <SkeletonBlock height={130} />
          <SkeletonBlock height={130} />
        </View>
      </View>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { packages, loading, isSubscribed, purchasePackage, restorePurchases, isWeb } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Identify packages by their RevenueCat identifier
  const monthlyPkg = packages.find(
    (p) =>
      p.identifier?.toLowerCase().includes("monthly") ||
      p.identifier === "$rc_monthly"
  ) ?? null;

  const annualPkg = packages.find(
    (p) =>
      p.identifier?.toLowerCase().includes("annual") ||
      p.identifier?.toLowerCase().includes("yearly") ||
      p.identifier === "$rc_annual"
  ) ?? null;

  const creditsPacks = packages.filter(
    (p) =>
      p.identifier?.toLowerCase().includes("credits") ||
      p.identifier?.toLowerCase().includes("pack")
  );

  // Fallback: if no credits packs found, show static placeholders
  const staticCreditPacks = [
    { id: "kindly_credits_small", credits: 10, label: null, discount: null },
    { id: "kindly_credits_medium", credits: 50, label: isFrench ? "Populaire" : "Popular", discount: "-20%" },
    { id: "kindly_credits_large", credits: 100, label: null, discount: "-40%" },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleSubscribe = async () => {
    const pkg = selectedPlan === "monthly" ? monthlyPkg : annualPkg;
    if (!pkg) {
      console.log("[Shop] Subscribe pressed but no package found for plan:", selectedPlan);
      setErrorMessage(isFrench ? "Abonnement non disponible pour le moment." : "Subscription not available at the moment.");
      return;
    }
    console.log("[Shop] Subscribe button pressed, plan:", selectedPlan, "package:", pkg.identifier);
    setErrorMessage("");
    setPurchasingId(selectedPlan);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        console.log("[Shop] Subscription purchase successful:", selectedPlan);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(isFrench ? "Achat réussi ! 💛" : "Purchase successful! 💛");
      } else {
        console.log("[Shop] Subscription purchase cancelled or failed:", selectedPlan);
      }
    } catch (err: any) {
      console.log("[Shop] Subscription purchase error:", err?.message);
      setErrorMessage(isFrench ? "L'achat a échoué. Réessaie." : "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleBuyCredits = async (pkg: PurchasesPackage | null, staticId: string, credits: number) => {
    console.log("[Shop] Buy credits pressed, pack:", staticId, "credits:", credits);
    if (!pkg) {
      console.log("[Shop] No RevenueCat package found for credits pack:", staticId);
      setErrorMessage(isFrench ? "Pack non disponible pour le moment." : "Pack not available at the moment.");
      return;
    }
    setErrorMessage("");
    setPurchasingId(staticId);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        console.log("[Shop] Credits purchase successful:", staticId, credits, "credits");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(isFrench ? `${credits} crédits ajoutés ! 💛` : `${credits} credits added! 💛`);
      } else {
        console.log("[Shop] Credits purchase cancelled:", staticId);
      }
    } catch (err: any) {
      console.log("[Shop] Credits purchase error:", err?.message);
      setErrorMessage(isFrench ? "L'achat a échoué. Réessaie." : "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    console.log("[Shop] Restore purchases pressed");
    setRestoringPurchases(true);
    setErrorMessage("");
    try {
      const found = await restorePurchases();
      if (found) {
        console.log("[Shop] Purchases restored successfully");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(isFrench ? "Achats restaurés ! 💛" : "Purchases restored! 💛");
      } else {
        console.log("[Shop] No purchases found to restore");
        showToast(isFrench ? "Aucun achat trouvé." : "No purchases found.");
      }
    } catch (err: any) {
      console.log("[Shop] Restore error:", err?.message);
      setErrorMessage(isFrench ? "Erreur lors de la restauration." : "Error restoring purchases.");
    } finally {
      setRestoringPurchases(false);
    }
  };

  const monthlyPrice = monthlyPkg?.product?.priceString ?? "";
  const annualPrice = annualPkg?.product?.priceString ?? "";

  const isSubscribingMonthly = purchasingId === "monthly";
  const isSubscribingAnnual = purchasingId === "annual";
  const isSubscribingAny = isSubscribingMonthly || isSubscribingAnnual;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} />

      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => {
            console.log("[Shop] Back button pressed");
            router.back();
          }}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>{t('profile_shop')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium active banner */}
          {isSubscribed && (
            <View style={styles.premiumActiveBanner}>
              <Text style={styles.premiumActiveBannerText}>{isFrench ? "✓ Premium actif" : "✓ Premium active"}</Text>
            </View>
          )}

          {/* Error message */}
          {errorMessage.length > 0 && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Section 1: Kindly Premium ── */}
          {isSubscribed ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kindly Premium ✨</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log("[Shop] Manage subscription pressed");
                  if (Platform.OS === "ios") {
                    Purchases.showManageSubscriptions().catch(() => {});
                  }
                }}
                style={styles.manageSubButton}
              >
                <Text style={styles.manageSubButtonText}>{isFrench ? "Gérer mon abonnement →" : "Manage my subscription →"}</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kindly Premium ✨</Text>
              <Text style={styles.sectionSubtitle}>{isFrench ? "Choisissez votre formule" : "Choose your plan"}</Text>

              {/* Plan cards */}
              <View style={styles.planRow}>
                {/* Monthly card */}
                <AnimatedPressable
                  onPress={() => {
                    console.log("[Shop] Monthly plan selected");
                    setSelectedPlan("monthly");
                  }}
                  style={[
                    styles.planCard,
                    styles.planCardMonthly,
                    selectedPlan === "monthly" && styles.planCardSelected,
                  ]}
                >
                  <Text style={styles.planCardTitle}>{isFrench ? "Mensuel" : "Monthly"}</Text>
                  {monthlyPrice ? <Text style={styles.planCardPrice}>{monthlyPrice}</Text> : <ActivityIndicator size="small" color={COLORS.textSecondary} />}
                  <Text style={styles.planCardPeriod}>{isFrench ? "par mois" : "per month"}</Text>
                </AnimatedPressable>

                {/* Annual card */}
                <AnimatedPressable
                  onPress={() => {
                    console.log("[Shop] Annual plan selected");
                    setSelectedPlan("annual");
                  }}
                  style={[
                    styles.planCard,
                    selectedPlan === "annual" && styles.planCardSelected,
                  ]}
                >
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>{isFrench ? "Meilleure offre" : "Best value"}</Text>
                  </View>
                  <Text style={styles.planCardTitle}>{isFrench ? "Annuel" : "Annual"}</Text>
                  {annualPrice ? <Text style={styles.planCardPrice}>{annualPrice}</Text> : <ActivityIndicator size="small" color={COLORS.textSecondary} />}
                  <Text style={styles.planCardPeriod}>{isFrench ? "par an" : "per year"}</Text>
                </AnimatedPressable>
              </View>

              {/* Benefits */}
              <View style={styles.benefitsList}>
                <BenefitRow icon="💛" text={isFrench ? "Crédits illimités" : "Unlimited credits"} />
                <BenefitRow icon="✨" text={isFrench ? "Badge Premium sur ton profil" : "Premium badge on your profile"} />
                <BenefitRow icon="⚡" text={isFrench ? "Support prioritaire" : "Priority support"} />
              </View>

              {/* Subscribe CTA */}
              <AnimatedPressable
                onPress={handleSubscribe}
                disabled={isSubscribingAny}
                style={[styles.subscribeButton, isSubscribingAny && styles.buttonLoading]}
              >
                {isSubscribingAny ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.subscribeButtonText}>{t('shop_subscribe')}</Text>
                )}
              </AnimatedPressable>
            </View>
          )}

          {/* ── Section 2: Credit packs ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isFrench ? "Packs de crédits 💛" : "Credit packs 💛"}</Text>
            <Text style={styles.sectionSubtitle}>
              {isFrench ? "Utilise tes crédits pour révéler qui t'a envoyé un compliment" : "Use your credits to reveal who sent you a compliment"}
            </Text>
            <View style={styles.packsRow}>
              {staticCreditPacks.map((pack, index) => {
                const rcPkg = creditsPacks[index] ?? null;
                const priceStr = rcPkg?.product?.priceString ?? null;
                const isPopular = pack.label === (isFrench ? "Populaire" : "Popular");
                const isPurchasing = purchasingId === pack.id;
                return (
                  <View key={pack.id} style={[styles.packCard, isPopular && styles.packCardPopular]}>
                    {pack.discount && !pack.label && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{pack.discount}</Text>
                      </View>
                    )}
                    {pack.label && (
                      <View style={[styles.packBadge, isPopular && styles.packBadgePopular]}>
                        <Text style={styles.packBadgeText}>{pack.label}</Text>
                      </View>
                    )}
                    <Text style={[styles.packCredits, isPopular && styles.packCreditsPopular]}>
                      {pack.credits}
                    </Text>
                    <Text style={styles.packCreditsEmoji}>💛</Text>
                    {priceStr ? (
                      <Text style={[styles.packPrice, isPopular && styles.packPricePopular]}>
                        {priceStr}
                      </Text>
                    ) : (
                      <Text style={[styles.packPrice, isPopular && styles.packPricePopular]}>—</Text>
                    )}
                    <AnimatedPressable
                      onPress={() => handleBuyCredits(rcPkg, pack.id, pack.credits)}
                      disabled={!!purchasingId}
                      style={[styles.packBuyButton, isPopular && styles.packBuyButtonPopular]}
                    >
                      {isPurchasing ? (
                        <ActivityIndicator color={isPopular ? COLORS.text : COLORS.primary} size="small" />
                      ) : (
                        <Text style={[styles.packBuyButtonText, isPopular && styles.packBuyButtonTextPopular]}>
                          {t('shop_buy')}
                        </Text>
                      )}
                    </AnimatedPressable>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoringPurchases}
              style={styles.restoreButton}
            >
              {restoringPurchases ? (
                <ActivityIndicator color={COLORS.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreButtonText}>{isFrench ? "Restaurer mes achats" : "Restore my purchases"}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.legalText}>
              {isFrench
                ? "Les abonnements se renouvellent automatiquement. Vous pouvez annuler à tout moment depuis les réglages de votre compte App Store. Les achats de crédits sont définitifs et non remboursables."
                : "Subscriptions renew automatically. You can cancel at any time from your App Store account settings. Credit purchases are final and non-refundable."}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function BenefitRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <Text style={styles.benefitText}>{text}</Text>
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
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 28,
  },
  // Toast
  toast: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: COLORS.text,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  // Banners
  premiumActiveBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  premiumActiveBannerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065F46",
  },
  errorBanner: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.25)",
  },
  errorBannerText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: "600",
    textAlign: "center",
  },
  // Sections
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: -6,
  },
  // Plan cards
  planRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
  },
  planCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    minHeight: 140,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  planCardMonthly: {
    paddingTop: 14,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  planCardPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
    minHeight: 28,
  },
  planCardPeriod: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  bestBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },
  // Benefits
  benefitsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  benefitText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
    flex: 1,
  },
  // Subscribe button
  subscribeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  // Manage subscription
  manageSubButton: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  manageSubButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  // Credit packs
  packsRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
  },
  packCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  packCardPopular: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  packBadge: {
    position: "absolute",
    top: -10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  packBadgePopular: {
    backgroundColor: COLORS.text,
  },
  packBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.text,
  },
  packCredits: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
  },
  packCreditsPopular: {
    color: COLORS.text,
  },
  packCreditsEmoji: {
    fontSize: 16,
    marginTop: -4,
  },
  packPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  packPricePopular: {
    color: COLORS.text,
  },
  packBuyButton: {
    marginTop: 8,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.primary,
    minWidth: 60,
    alignItems: "center",
  },
  packBuyButtonPopular: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  packBuyButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  packBuyButtonTextPopular: {
    color: COLORS.primary,
  },
  // Discount badge
  discountBadge: {
    position: "absolute",
    top: -12,
    right: 8,
    backgroundColor: "#D1FAE5",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46",
  },
  // Footer
  footer: {
    gap: 16,
    alignItems: "center",
    paddingTop: 8,
  },
  restoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
