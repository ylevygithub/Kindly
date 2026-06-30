import { getLocales } from 'expo-localization';

type Locale = 'fr' | 'en';

function getLocale(): Locale {
  const locales = getLocales();
  const lang = locales[0]?.languageCode ?? 'fr';
  return lang === 'en' ? 'en' : 'fr'; // default to French
}

export const locale: Locale = getLocale();
export const isFrench = locale === 'fr';

const translations = {
  fr: {
    // App-wide
    appName: 'Kindly 💛',

    // Home screen
    home_noCompliments: "Aucun compliment pour l'instant",
    home_noComplimentsSubtitle: "Partage ton profil pour en recevoir ! Tes amis peuvent t'envoyer des compliments anonymement.",
    home_guess: 'Deviner qui 🔍',
    home_reveal: 'Révéler (5 💛)',
    home_revealed: 'Révélé ✓',
    home_justNow: "à l'instant",
    home_minutesAgo: (n: number) => `il y a ${n}min`,
    home_hoursAgo: (n: number) => `il y a ${n}h`,
    home_yesterday: 'hier',
    home_daysAgo: (n: number) => `il y a ${n}j`,

    // Categories
    cat_personality: 'Personnalité',
    cat_look: 'Look',
    cat_talent: 'Talent',
    cat_humor: 'Humour',
    cat_other: 'Autre',

    // Auth screen
    auth_title: 'Kindly',
    auth_subtitle: 'Reçois des compliments anonymes de tes amis',
    auth_continueApple: 'Continuer avec Apple',
    auth_continueGoogle: 'Continuer avec Google',
    auth_continueEmail: 'Continuer avec email',
    auth_terms: 'En continuant, tu acceptes nos',
    auth_termsLink: 'CGU',
    auth_and: 'et notre',
    auth_privacyLink: 'Politique de confidentialité',

    // Onboarding
    onboarding_title: 'Crée ton profil Kindly',
    onboarding_usernamePlaceholder: 'Ton pseudo',
    onboarding_usernameLabel: 'Pseudo',
    onboarding_emojiLabel: 'Ton emoji',
    onboarding_submit: 'Créer mon profil',
    onboarding_loading: 'Création...',
    onboarding_terms: "J'accepte les",
    onboarding_termsLink: 'CGU',

    // Paywall
    paywall_title: 'Upgrade to Premium',
    paywall_subtitle: "Révèle qui t'a envoyé des compliments",
    paywall_selectPlan: 'Sélectionner un plan',
    paywall_restore: 'Restaurer les achats',
    paywall_skip: 'Continuer sans Premium',
    paywall_loading: 'Chargement...',
    paywall_purchasing: 'Achat en cours...',
    paywall_restoring: 'Restauration...',
    paywall_success: 'Bienvenue Premium ! 🎉',
    paywall_successMsg: 'Tu as maintenant accès à toutes les fonctionnalités premium.',
    paywall_noPlans: 'Aucun plan disponible',
    paywall_devSimulate: 'Dev: Simuler un achat',

    // Shop
    shop_title: 'Boutique',
    shop_premium: 'Premium',
    shop_credits: 'Crédits',
    shop_buy: 'Acheter',
    shop_subscribe: "S'abonner",
    shop_restore: 'Restaurer',
    shop_loading: 'Chargement...',

    // Profile
    profile_title: 'Profil',
    profile_premium: '✨ Premium',
    profile_shop: 'Boutique 💛',
    profile_notifications: 'Notifications',
    profile_logout: 'Se déconnecter',
    profile_credits: 'crédits',

    // Compliment detail
    compliment_guessTitle: "Qui t'a envoyé ce compliment ?",
    compliment_revealTitle: "Révéler l'expéditeur",
    compliment_revealCost: 'Coûte 5 💛',
    compliment_confirm: 'Confirmer',
    compliment_cancel: 'Annuler',
    compliment_revealed: 'Expéditeur révélé !',

    // Errors
    error_generic: 'Une erreur est survenue',
    error_network: 'Erreur réseau. Vérifie ta connexion.',
    error_retry: 'Réessayer',

    // Notification preferences
    notif_title: 'Notifications',
    notif_newCompliment: 'Nouveau compliment',
    notif_save: 'Enregistrer',
  },
  en: {
    // App-wide
    appName: 'Kindly 💛',

    // Home screen
    home_noCompliments: 'No compliments yet',
    home_noComplimentsSubtitle: 'Share your profile to receive some! Your friends can send you anonymous compliments.',
    home_guess: 'Guess who 🔍',
    home_reveal: 'Reveal (5 💛)',
    home_revealed: 'Revealed ✓',
    home_justNow: 'just now',
    home_minutesAgo: (n: number) => `${n}min ago`,
    home_hoursAgo: (n: number) => `${n}h ago`,
    home_yesterday: 'yesterday',
    home_daysAgo: (n: number) => `${n}d ago`,

    // Categories
    cat_personality: 'Personality',
    cat_look: 'Look',
    cat_talent: 'Talent',
    cat_humor: 'Humor',
    cat_other: 'Other',

    // Auth screen
    auth_title: 'Kindly',
    auth_subtitle: 'Receive anonymous compliments from your friends',
    auth_continueApple: 'Continue with Apple',
    auth_continueGoogle: 'Continue with Google',
    auth_continueEmail: 'Continue with email',
    auth_terms: 'By continuing, you agree to our',
    auth_termsLink: 'Terms',
    auth_and: 'and our',
    auth_privacyLink: 'Privacy Policy',

    // Onboarding
    onboarding_title: 'Create your Kindly profile',
    onboarding_usernamePlaceholder: 'Your username',
    onboarding_usernameLabel: 'Username',
    onboarding_emojiLabel: 'Your emoji',
    onboarding_submit: 'Create my profile',
    onboarding_loading: 'Creating...',
    onboarding_terms: 'I accept the',
    onboarding_termsLink: 'Terms',

    // Paywall
    paywall_title: 'Upgrade to Premium',
    paywall_subtitle: 'Reveal who sent you compliments',
    paywall_selectPlan: 'Select a Plan',
    paywall_restore: 'Restore Purchases',
    paywall_skip: 'Continue without Premium',
    paywall_loading: 'Loading...',
    paywall_purchasing: 'Purchasing...',
    paywall_restoring: 'Restoring...',
    paywall_success: 'Welcome Premium! 🎉',
    paywall_successMsg: 'You now have access to all premium features.',
    paywall_noPlans: 'No plans available',
    paywall_devSimulate: 'Dev: Simulate Purchase',

    // Shop
    shop_title: 'Shop',
    shop_premium: 'Premium',
    shop_credits: 'Credits',
    shop_buy: 'Buy',
    shop_subscribe: 'Subscribe',
    shop_restore: 'Restore',
    shop_loading: 'Loading...',

    // Profile
    profile_title: 'Profile',
    profile_premium: '✨ Premium',
    profile_shop: 'Shop 💛',
    profile_notifications: 'Notifications',
    profile_logout: 'Sign out',
    profile_credits: 'credits',

    // Compliment detail
    compliment_guessTitle: 'Who sent you this compliment?',
    compliment_revealTitle: 'Reveal the sender',
    compliment_revealCost: 'Costs 5 💛',
    compliment_confirm: 'Confirm',
    compliment_cancel: 'Cancel',
    compliment_revealed: 'Sender revealed!',

    // Errors
    error_generic: 'An error occurred',
    error_network: 'Network error. Check your connection.',
    error_retry: 'Retry',

    // Notification preferences
    notif_title: 'Notifications',
    notif_newCompliment: 'New compliment',
    notif_save: 'Save',
  },
} as const;

type TranslationKey = keyof typeof translations.fr;
type TranslationValue = string | ((n: number) => string);

export function t(key: TranslationKey): string {
  const val = translations[locale][key] as TranslationValue;
  if (typeof val === 'function') return val(0);
  return val;
}

// For function-based translations (plurals, counts)
export function tf(key: TranslationKey, n: number): string {
  const val = translations[locale][key] as TranslationValue;
  if (typeof val === 'function') return val(n);
  return val;
}

// Category display map — handles both FR and EN backend values
export const CATEGORY_DISPLAY: Record<string, string> = {
  'Personnalité': '🧠',
  'Personality': '🧠',
  'Look': '✨',
  'Talent': '🎯',
  'Humour': '😂',
  'Humor': '😂',
  'Autre': '💛',
  'Other': '💛',
};
