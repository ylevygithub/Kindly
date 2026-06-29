import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPost } from "@/utils/api";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import ConfettiAnimation, { ConfettiRef } from "@/components/ConfettiAnimation";

interface Contact {
  id: string;
  username: string;
  avatar_emoji: string;
}

interface SuggestedCompliment {
  id: string;
  text: string;
}

const CATEGORIES = [
  { id: "Personnalité", label: "Personnalité", icon: "🧠" },
  { id: "Look", label: "Look", icon: "✨" },
  { id: "Talent", label: "Talent", icon: "🎯" },
  { id: "Humour", label: "Humour", icon: "😂" },
  { id: "Autre", label: "Autre", icon: "💛" },
];

type Step = 1 | 2 | 3;

export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const confettiRef = useRef<ConfettiRef>(null);

  const [step, setStep] = useState<Step>(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [suggestions, setSuggestions] = useState<SuggestedCompliment[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [sending, setSending] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit] = useState(3);

  useEffect(() => {
    loadContacts();
    loadDailyCount();
  }, []);

  const loadContacts = async () => {
    console.log("[Send] Loading contacts from API");
    setContactsLoading(true);
    try {
      const data = await authenticatedGet<any>("/api/contacts/list");
      const arr = Array.isArray(data) ? data : (data?.contacts || []);
      setContacts(arr);
      console.log("[Send] Contacts loaded:", arr.length);
    } catch (err) {
      console.log("[Send] Error loading contacts:", err);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const loadDailyCount = async () => {
    try {
      const data = await authenticatedGet<any>("/api/compliments/daily-count");
      setDailyCount(typeof data?.count === 'number' ? data.count : 0);
    } catch {
      setDailyCount(0);
    }
  };

  const loadSuggestions = async (category: string) => {
    console.log("[Send] Loading suggestions for category:", category);
    setSuggestionsLoading(true);
    try {
      const data = await authenticatedGet<any>(
        `/api/suggested-compliments?category=${encodeURIComponent(category)}`
      );
      const raw = Array.isArray(data) ? data : (data?.suggestions || data?.compliments || []);
      // Normalize suggestion objects to always have { id, text }
      const arr: SuggestedCompliment[] = raw.map((item: any, idx: number) => ({
        id: String(item?.id ?? item?.compliment_id ?? idx),
        text: String(item?.text ?? item?.content ?? item?.compliment_text ?? item?.suggestion ?? ""),
      }));
      console.log("[Send] First suggestion shape:", raw[0] ? JSON.stringify(raw[0]) : "empty");
      setSuggestions(arr);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    console.log("[Send] Contact selected:", contact.username);
    setSelectedContact(contact);
    setStep(2);
  };

  const handleSelectCategory = (categoryId: string) => {
    console.log("[Send] Category selected:", categoryId);
    setSelectedCategory(categoryId);
    setStep(3);
    loadSuggestions(categoryId);
  };

  const handleSelectSuggestion = (text: string) => {
    console.log("[Send] Suggestion selected:", text.substring(0, 30));
    setSelectedSuggestion(text);
    setIsCustom(false);
    setCustomText("");
  };

  const handleSend = async () => {
    const text = isCustom ? customText : selectedSuggestion;
    if (!selectedContact || !text.trim()) return;

    console.log("[Send] Sending compliment to:", selectedContact.username, "category:", selectedCategory);
    setSending(true);
    try {
      await authenticatedPost("/api/compliments", {
        recipient_id: selectedContact.id,
        text: text.trim(),
        category: selectedCategory,
      });
      console.log("[Send] Compliment sent successfully!");
      confettiRef.current?.trigger();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDailyCount((c) => c + 1);
      // Reset form
      setStep(1);
      setSelectedContact(null);
      setSelectedCategory("");
      setSelectedSuggestion("");
      setCustomText("");
      setIsCustom(false);
      Alert.alert("🎉 Compliment envoyé !", "Ton compliment a été envoyé anonymement.");
    } catch (err: any) {
      console.log("[Send] Error sending compliment:", err?.message);
      const msg = String(err?.message || "");
      if (msg.includes("moderation") || msg.includes("inappropriate")) {
        Alert.alert("💛 Oups !", "Ce message ne respecte pas nos règles de bienveillance.");
      } else if (msg.includes("daily_limit") || msg.includes("limit")) {
        Alert.alert(
          "Limite atteinte",
          "Tu as atteint ta limite d'envois gratuits pour aujourd'hui. Passe à Kindly Plus pour des envois illimités !",
          [{ text: "Annuler", style: "cancel" }]
        );
      } else {
        Alert.alert("Erreur", "Impossible d'envoyer le compliment. Réessaie.");
      }
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const complimentText = isCustom ? customText : selectedSuggestion;
  const canSend = !!selectedContact && !!complimentText.trim() && !sending;
  const remainingCount = Math.max(0, dailyLimit - dailyCount);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ConfettiAnimation ref={confettiRef} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Envoyer un compliment 💌</Text>
        <View style={styles.dailyCounter}>
          <Text style={styles.dailyCounterText}>
            {dailyCount}/{dailyLimit} envois aujourd'hui
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicators */}
        <View style={styles.stepIndicators}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                step >= s && styles.stepDotActive,
                step === s && styles.stepDotCurrent,
              ]}
            >
              <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                {s}
              </Text>
            </View>
          ))}
          <View style={styles.stepLine} />
        </View>

        {/* Step 1: Choose recipient */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepTitle}>Choisir le destinataire</Text>
          </View>

          {selectedContact ? (
            <AnimatedPressable
              onPress={() => {
                console.log("[Send] Deselecting contact");
                setSelectedContact(null);
                setStep(1);
              }}
              style={styles.selectedContactCard}
            >
              <Text style={styles.selectedContactAvatar}>{selectedContact.avatar_emoji}</Text>
              <Text style={styles.selectedContactName}>{selectedContact.username}</Text>
              <Text style={styles.changeText}>Changer</Text>
            </AnimatedPressable>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un ami..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={(v) => {
                  console.log("[Send] Contact search query:", v);
                  setSearchQuery(v);
                }}
              />
              {contactsLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
              ) : filteredContacts.length === 0 ? (
                <View style={styles.noContactsState}>
                  <Text style={styles.noContactsEmoji}>👥</Text>
                  <Text style={styles.noContactsTitle}>Invite tes amis !</Text>
                  <Text style={styles.noContactsSubtitle}>
                    Aucun ami sur Kindly pour l'instant. Invite-les pour leur envoyer des compliments !
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log("[Send] Invite friends button pressed");
                      Linking.openURL("sms:?body=Rejoins-moi sur Kindly, l'app pour envoyer des compliments anonymes ! 💛");
                    }}
                    style={styles.inviteButton}
                  >
                    <Text style={styles.inviteButtonText}>Inviter des amis 💌</Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <View style={styles.contactsList}>
                  {filteredContacts.map((contact) => (
                    <AnimatedPressable
                      key={contact.id}
                      onPress={() => handleSelectContact(contact)}
                      style={styles.contactItem}
                    >
                      <Text style={styles.contactAvatar}>{contact.avatar_emoji}</Text>
                      <Text style={styles.contactName}>{contact.username}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Step 2: Choose category */}
        {step >= 2 && (
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepTitle}>Choisir la catégorie</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <View style={styles.categoriesRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <AnimatedPressable
                      key={cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                    >
                      <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                        {cat.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Step 3: Choose or write compliment */}
        {step >= 3 && (
          <View style={styles.stepSection}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepTitle}>Choisir le compliment</Text>
            </View>

            {suggestionsLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.suggestionsGrid}>
                {suggestions.map((s) => {
                  const isSelected = selectedSuggestion === s.text && !isCustom;
                  return (
                    <AnimatedPressable
                      key={s.id}
                      onPress={() => handleSelectSuggestion(s.text)}
                      style={[styles.suggestionCard, isSelected && styles.suggestionCardSelected]}
                    >
                      <Text style={[styles.suggestionText, isSelected && styles.suggestionTextSelected]}>
                        {s.text}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}

            {/* Custom text toggle */}
            <AnimatedPressable
              onPress={() => {
                console.log("[Send] Custom text toggle pressed");
                setIsCustom(!isCustom);
                setSelectedSuggestion("");
              }}
              style={[styles.customToggle, isCustom && styles.customToggleActive]}
            >
              <Text style={[styles.customToggleText, isCustom && styles.customToggleTextActive]}>
                {isCustom ? "✓ Écrire le mien" : "+ Écrire le mien"}
              </Text>
            </AnimatedPressable>

            {isCustom && (
              <View style={styles.customInputContainer}>
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>
                    💛 Reste bienveillant(e) — les messages irrespectueux sont filtrés automatiquement
                  </Text>
                </View>
                <TextInput
                  style={styles.customInput}
                  placeholder="Écris ton compliment ici..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={customText}
                  onChangeText={(v) => {
                    console.log("[Send] Custom text changed, length:", v.length);
                    setCustomText(v);
                  }}
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{customText.length}/300</Text>
              </View>
            )}
          </View>
        )}

        {/* Send button */}
        {step >= 3 && (
          <AnimatedPressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Envoyer anonymement 💛</Text>
            )}
          </AnimatedPressable>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  dailyCounter: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dailyCounterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 20,
  },
  stepIndicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    zIndex: 1,
  },
  stepDotActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  stepDotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textTertiary,
  },
  stepDotTextActive: {
    color: COLORS.text,
  },
  stepLine: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  stepSection: {
    gap: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    overflow: "hidden",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  selectedContactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  selectedContactAvatar: {
    fontSize: 28,
  },
  selectedContactName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  changeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noContactsState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  noContactsEmoji: {
    fontSize: 40,
  },
  noContactsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  noContactsSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  contactsList: {
    gap: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactAvatar: {
    fontSize: 28,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoriesScroll: {
    marginHorizontal: -16,
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  categoryPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillIcon: {
    fontSize: 16,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  categoryPillTextSelected: {
    color: COLORS.text,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    width: "48%",
  },
  suggestionCardSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  suggestionTextSelected: {
    color: COLORS.text,
    fontWeight: "600",
  },
  customToggle: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customToggleActive: {
    backgroundColor: COLORS.accentMuted,
    borderColor: COLORS.accent,
  },
  customToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  customToggleTextActive: {
    color: COLORS.accent,
  },
  customInputContainer: {
    gap: 8,
  },
  warningBanner: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,184,48,0.2)",
  },
  warningText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  customInput: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "right",
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",

  },
  sendButtonDisabled: {
    opacity: 0.5,

  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
});
