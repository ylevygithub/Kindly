import { createApplication } from "@specific-dev/framework";
import * as appSchema from './src/db/schema/schema.js';
import * as authSchema from './src/db/schema/auth-schema.js';

const schema = { ...appSchema, ...authSchema };
const app = await createApplication(schema);

const now = new Date().toISOString();

// Insert demo profiles
const demoProfiles = [
  {
    id: 'demo_001',
    username: 'lucie_soleil',
    avatar_emoji: '🌸',
    credits: 25,
    streak_days: 5,
    is_premium: false,
    created_at: now,
  },
  {
    id: 'demo_002',
    username: 'thomas_bvr',
    avatar_emoji: '🎸',
    credits: 40,
    streak_days: 12,
    is_premium: true,
    created_at: now,
  },
  {
    id: 'demo_003',
    username: 'camille_reve',
    avatar_emoji: '✨',
    credits: 15,
    streak_days: 3,
    is_premium: false,
    created_at: now,
  },
  {
    id: 'demo_004',
    username: 'maxime_zen',
    avatar_emoji: '🌊',
    credits: 60,
    streak_days: 7,
    is_premium: false,
    created_at: now,
  },
  {
    id: 'demo_005',
    username: 'sofia_luna',
    avatar_emoji: '🌙',
    credits: 30,
    streak_days: 20,
    is_premium: true,
    created_at: now,
  },
];

for (const profile of demoProfiles) {
  try {
    await app.db.insert(appSchema.profiles).values(profile);
    console.log(`✓ Created profile: ${profile.username}`);
  } catch (error) {
    console.error(`✗ Failed to create profile ${profile.username}:`, error);
  }
}

// Insert demo compliments
const demoCompliments = [
  {
    id: 'comp_001',
    sender_id: 'demo_002',
    recipient_id: 'demo_001',
    text: 'Tu as une énergie incroyable qui illumine toutes les pièces où tu entres !',
    category: 'Personnalité' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_002',
    sender_id: 'demo_003',
    recipient_id: 'demo_001',
    text: 'Tu as un style vraiment unique et inspirant, j\'adore !',
    category: 'Look' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_003',
    sender_id: 'demo_004',
    recipient_id: 'demo_001',
    text: 'Tu me fais rire comme personne d\'autre, tu es trop drôle !',
    category: 'Humour' as const,
    is_revealed: true,
    created_at: now,
  },
  {
    id: 'comp_004',
    sender_id: 'demo_001',
    recipient_id: 'demo_002',
    text: 'Tu es tellement doué(e), ça m\'impressionne vraiment à chaque fois.',
    category: 'Talent' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_005',
    sender_id: 'demo_005',
    recipient_id: 'demo_002',
    text: 'Ta gentillesse est vraiment rare et précieuse.',
    category: 'Personnalité' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_006',
    sender_id: 'demo_001',
    recipient_id: 'demo_003',
    text: 'Tu es rayonnant(e) en ce moment, ça se voit vraiment !',
    category: 'Look' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_007',
    sender_id: 'demo_002',
    recipient_id: 'demo_003',
    text: 'Ton talent est impressionnant, continue comme ça !',
    category: 'Talent' as const,
    is_revealed: true,
    created_at: now,
  },
  {
    id: 'comp_008',
    sender_id: 'demo_003',
    recipient_id: 'demo_004',
    text: 'Tu as une sagesse et une sérénité qui font du bien autour de toi.',
    category: 'Personnalité' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_009',
    sender_id: 'demo_004',
    recipient_id: 'demo_005',
    text: 'Tu as une présence magnétique, les gens t\'adorent naturellement.',
    category: 'Personnalité' as const,
    is_revealed: false,
    created_at: now,
  },
  {
    id: 'comp_010',
    sender_id: 'demo_005',
    recipient_id: 'demo_004',
    text: 'Ton humour est parfait, tu sais toujours quoi dire pour détendre l\'atmosphère.',
    category: 'Humour' as const,
    is_revealed: false,
    created_at: now,
  },
];

for (const compliment of demoCompliments) {
  try {
    await app.db.insert(appSchema.compliments).values(compliment);
    console.log(`✓ Created compliment: ${compliment.id}`);
  } catch (error) {
    console.error(`✗ Failed to create compliment ${compliment.id}:`, error);
  }
}

console.log('\n✓ Seed data completed');
process.exit(0);
