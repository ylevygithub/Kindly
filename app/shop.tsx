import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/Colors";
import { apiGet, apiPost } from "@/utils/api";
import { AnimatedPressable } from "@/components/AnimatedPressable";

interface CreditsBalance {
  credits: number;
  is_premium: boolean;
}

const CREDIT_PACKS = [
  { id: "pack_10", credits: 10, price: "0,99€", label: null },
  { id: "pack_50", credits: 50, price: "3,99€", label: "Populaire" },
  { id: "pack_150", credits: 150, price: "9,99€", label: "Meilleure valeur" },
];

const PLUS_FEATURES = [
  { icon: "✉️", text: "Envois illimités" },
  { icon: "👁️", text: "5 reveals gratuits/mois" },
  { icon: "🎨", text: "Thèmes exclusifs" },
  { icon: "⭐", text: "Badge profil premium" },
];

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<CreditsBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [purchasingPlus, setPurchasingPlus] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    console.log("[Shop] Loading credits balance");
    try {
      const data = await apiGet<CreditsBalance>("/api/credits/balance");
      setBalance(data);
      console.log("[Shop] Balance loaded:", data.credits, "credits, premium:", data.is_premium);
    } catch (err) {
      console.log("[Shop] Error loading balance:", err);
      setBalance({ credits: 0, is_premium: false });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePack = async (packId: string, credits: number, price: string) => {
    console.log("[Shop] Purchase pack pressed:", packId, credits, "credits at", price);
    setPurchasingPack(packId);
    try {
      await apiPost("/api/credits/purchase", { pack: packId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBalance((prev) => prev ? { ...prev, credits: prev.credits + credits } : null);
      Alert.alert("🎉 Achat réussi !", `${credits} crédits 💛 ont été ajoutés à ton compte.`);
      console.log("[Shop] Pack purchased successfully:", packId);
    } catch (err: any) {
      console.log("[Shop] Purchase error:", err?.message);
      Alert.alert("Erreur", "L'achat a échoué. Réessaie.");
    } finally {
      setPurchasingPack(null);
    }
  };

  const handlePurchasePlus = async () => {
    console.log("[Shop] Kindly Plus purchase pressed");
    setPurchasingPlus(true);
    try {
      await apiPost("/api/credits/purchase", { pack: "pack_50" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBalance((prev) => prev ? { ...prev, is_premium: true } : null);
      Alert.alert("🎉 Kindly Plus activé !", "Profite de tous tes avantages premium !");
      console.log("[Shop] Kindly Plus activated successfully");
    } catch (err: any) {
      console.log("[Shop] Plus purchase error:", err?.message);
      Alert.alert("Erreur", "L'activation a échoué. Réessaie.");
    } finally {
      setPurchasingPlus(false);
    }
  };

  const currentCredits = balance?.credits ?? 0;
  const isPremium = balance?.is_premium ?? false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.headerTitle}>Boutique Kindly 💛</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance display */}
        <View style={styles.balanceCard}>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.balanceValue}>{currentCredits} 💛</Text>
              <Text style={styles.balanceLabel}>Ton solde actuel</Text>
              {isPremium && (
                <View style={styles.premiumActiveBadge}>
                  <Text style={styles.premiumActiveBadgeText}>✨ Kindly Plus actif</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Kindly Plus section */}
        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kindly Plus ✨</Text>
            <View style={styles.plusCard}>
              <View style={styles.plusCardHeader}>
                <Text style={styles.plusCardTitle}>Passe à Kindly Plus</Text>
                <Text style={styles.plusCardPrice}>4,99€/mois</Text>
              </View>
              <View style={styles.plusFeaturesList}>
                {PLUS_FEATURES.map((feature, i) => (
                  <View key={i} style={styles.plusFeatureItem}>
                    <Text style={styles.plusFeatureIcon}>{feature.icon}</Text>
                    <Text style={styles.plusFeatureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
              <AnimatedPressable
                onPress={handlePurchasePlus}
                disabled={purchasingPlus}
                style={[styles.plusButton, purchasingPlus && styles.plusButtonLoading]}
              >
                {purchasingPlus ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.plusButtonText}>Essayer Kindly Plus 🚀</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Credit packs section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Packs de crédits 💛</Text>
          <Text style={styles.sectionSubtitle}>
            Utilise tes crédits pour révéler qui t'a envoyé un compliment (5 💛 par révélation)
          </Text>
          <View style={styles.packsRow}>
            {CREDIT_PACKS.map((pack) => {
              const isLoading = purchasingPack === pack.id;
              const isPopular = pack.label === "Populaire";
              const isBest = pack.label === "Meilleure valeur";
              return (
                <AnimatedPressable
                  key={pack.id}
                  onPress={() => handlePurchasePack(pack.id, pack.credits, pack.price)}
                  disabled={!!purchasingPack}
                  style={[
                    styles.packCard,
                    isPopular && styles.packCardPopular,
                    isBest && styles.packCardBest,
                  ]}
                >
                  {pack.label && (
                    <View style={[
                      styles.packLabel,
                      isPopular && styles.packLabelPopular,
                      isBest && styles.packLabelBest,
                    ]}>
                      <Text style={styles.packLabelText}>{pack.label}</Text>
                    </View>
                  )}
                  {isLoading ? (
                    <ActivityIndicator color={isPopular ? COLORS.text : COLORS.primary} size="small" />
                  ) : (
                    <>
                      <Text style={styles.packCredits}>{pack.credits}</Text>
                      <Text style={styles.packCreditsLabel}>💛</Text>
                      <Text style={[styles.packPrice, isPopular && styles.packPricePopular]}>
                        {pack.price}
                      </Text>
                    </>
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            💛 Les crédits ne sont jamais perdus. Ils restent sur ton compte jusqu'à utilisation.
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
    gap: 24,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 4,
    boxShadow: "0 4px 16px rgba(255,184,48,0.3)",
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.text,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    fontWeight: "600",
  },
  premiumActiveBadge: {
    backgroundColor: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  premiumActiveBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  section: {
    gap: 12,
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
    marginTop: -4,
  },
  plusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    boxShadow: "0 4px 16px rgba(255,184,48,0.15)",
  },
  plusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plusCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  plusCardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  plusFeaturesList: {
    gap: 10,
  },
  plusFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  plusFeatureIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  plusFeatureText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  plusButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(255,184,48,0.3)",
  },
  plusButtonLoading: {
    opacity: 0.7,
  },
  plusButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  packsRow: {
    flexDirection: "row",
    gap: 10,
  },
  packCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 110,
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(26,18,7,0.04)",
    position: "relative",
    overflow: "hidden",
  },
  packCardPopular: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    boxShadow: "0 4px 12px rgba(255,184,48,0.3)",
  },
  packCardBest: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  packLabel: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.surfaceSecondary,
  },
  packLabelPopular: {
    backgroundColor: "rgba(26,18,7,0.15)",
  },
  packLabelBest: {
    backgroundColor: COLORS.accent,
  },
  packLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.text,
  },
  packCredits: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  packCreditsLabel: {
    fontSize: 18,
    marginTop: -4,
  },
  packPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  packPricePopular: {
    color: COLORS.text,
  },
  infoNote: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.2)",
  },
  infoNoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    textAlign: "center",
  },
});
