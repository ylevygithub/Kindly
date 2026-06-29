import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Contacts from "expo-contacts";
import * as SMS from "expo-sms";
import { COLORS } from "@/constants/Colors";
import { authenticatedGet, authenticatedPatch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

interface ContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  selected: boolean;
}

interface Profile {
  contacts_import_answered: boolean;
  username?: string;
}

type ModalStep = "prompt" | "contacts";

export default function ContactImportModal() {
  const { user, loading: authLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<ModalStep>("prompt");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string>("");
  const [profileChecked, setProfileChecked] = useState(false);

  const checkProfile = useCallback(async () => {
    if (!user) return;
    try {
      console.log("[ContactImport] Checking profile contacts_import_answered");
      const profile = await authenticatedGet<Profile>("/api/profiles/me");
      console.log("[ContactImport] contacts_import_answered:", profile.contacts_import_answered);
      setProfileUsername(profile.username ?? user.name ?? "");
      if (profile.contacts_import_answered === false) {
        setVisible(true);
      }
    } catch (err) {
      console.error("[ContactImport] Failed to fetch profile:", err);
    } finally {
      setProfileChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && !profileChecked) {
      checkProfile();
    }
  }, [authLoading, user, profileChecked, checkProfile]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setProfileChecked(false);
      setVisible(false);
      setStep("prompt");
      setContacts([]);
    }
  }, [user]);

  const markAnswered = async () => {
    try {
      console.log("[ContactImport] PATCH /api/profiles/me/contacts-import — marking answered");
      await authenticatedPatch("/api/profiles/me/contacts-import", {});
    } catch (err) {
      console.error("[ContactImport] Failed to mark contacts-import answered:", err);
    }
  };

  const handleDecline = async () => {
    console.log("[ContactImport] User tapped 'Non merci'");
    await markAnswered();
    setVisible(false);
  };

  const handleImport = async () => {
    console.log("[ContactImport] User tapped 'Importer mes contacts'");
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      console.log("[ContactImport] Contacts permission status:", status);
      if (status !== "granted") {
        Alert.alert("Permission refusée", "L'accès aux contacts a été refusé.");
        await markAnswered();
        setVisible(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      console.log("[ContactImport] Loaded", data.length, "contacts");

      const filtered: ContactItem[] = data
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => ({
          id: c.id ?? String(Math.random()),
          name: c.name ?? "Sans nom",
          phoneNumber: c.phoneNumbers![0].number ?? "",
          selected: true,
        }))
        .filter((c) => c.phoneNumber.length > 0);

      console.log("[ContactImport] Filtered contacts with phone numbers:", filtered.length);
      setContacts(filtered);
      setStep("contacts");
    } catch (err) {
      console.error("[ContactImport] Error loading contacts:", err);
      Alert.alert("Erreur", "Impossible de charger les contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleContact = (id: string) => {
    console.log("[ContactImport] Toggle contact:", id);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const allSelected = contacts.length > 0 && contacts.every((c) => c.selected);

  const toggleAll = () => {
    const nextValue = !allSelected;
    console.log("[ContactImport] Toggle all contacts:", nextValue);
    setContacts((prev) => prev.map((c) => ({ ...c, selected: nextValue })));
  };

  const selectedContacts = contacts.filter((c) => c.selected);
  const selectedCount = selectedContacts.length;

  const handleSendInvitations = async () => {
    console.log("[ContactImport] User tapped 'Envoyer les invitations', count:", selectedCount);
    if (selectedCount === 0) return;

    await markAnswered();

    const username = profileUsername || user?.name || "Quelqu'un";
    const message = `Salut ! ${username} t'invite à rejoindre Kindly, l'app des compliments anonymes 💌 Télécharge-la ici : https://kindly.app (bientôt disponible)`;
    const phoneNumbers = selectedContacts.map((c) => c.phoneNumber);

    console.log("[ContactImport] Sending SMS to", phoneNumbers.length, "recipients");

    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("SMS non disponible", "L'envoi de SMS n'est pas disponible sur cet appareil.");
        setVisible(false);
        return;
      }
      await SMS.sendSMSAsync(phoneNumbers, message);
      console.log("[ContactImport] SMS app opened successfully");
    } catch (err) {
      console.error("[ContactImport] SMS send error:", err);
    } finally {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {step === "prompt" ? (
            <PromptStep
              onImport={handleImport}
              onDecline={handleDecline}
              loading={loadingContacts}
            />
          ) : (
            <ContactsStep
              contacts={contacts}
              allSelected={allSelected}
              selectedCount={selectedCount}
              onToggleAll={toggleAll}
              onToggleContact={toggleContact}
              onSend={handleSendInvitations}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function PromptStep({
  onImport,
  onDecline,
  loading,
}: {
  onImport: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  return (
    <>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Inviter tes amis</Text>
      <Text style={styles.body}>
        Importe tes contacts pour inviter tes amis à rejoindre Kindly !
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onImport}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Importer mes contacts</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onDecline}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Non merci</Text>
      </TouchableOpacity>
    </>
  );
}

function ContactsStep({
  contacts,
  allSelected,
  selectedCount,
  onToggleAll,
  onToggleContact,
  onSend,
}: {
  contacts: ContactItem[];
  allSelected: boolean;
  selectedCount: number;
  onToggleAll: () => void;
  onToggleContact: (id: string) => void;
  onSend: () => void;
}) {
  const sendLabel = `Envoyer les invitations (${selectedCount})`;

  return (
    <>
      <Text style={styles.title}>Tes contacts 📱</Text>

      <TouchableOpacity style={styles.toggleAllRow} onPress={onToggleAll} activeOpacity={0.7}>
        <Text style={styles.toggleAllText}>Tout sélectionner</Text>
        <Checkbox checked={allSelected} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
        {contacts.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.contactRow}
            onPress={() => onToggleContact(contact.id)}
            activeOpacity={0.7}
          >
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
            </View>
            <Checkbox checked={contact.selected} />
          </TouchableOpacity>
        ))}
        {contacts.length === 0 && (
          <Text style={styles.emptyText}>Aucun contact avec numéro trouvé.</Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, selectedCount === 0 && styles.primaryButtonDisabled]}
        onPress={onSend}
        disabled={selectedCount === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>{sendLabel}</Text>
      </TouchableOpacity>
    </>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  toggleAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 2,
  },
  toggleAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  contactList: {
    maxHeight: 320,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  contactInfo: {
    flex: 1,
    marginRight: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  contactPhone: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: Platform.OS === "ios" ? 16 : 14,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 14,
    paddingVertical: 20,
  },
});
