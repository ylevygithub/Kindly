import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ne, sql, inArray, desc } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.js';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

const TOXIC_WORDS = [
  'connard', 'connasse', 'salope', 'pute', 'putain', 'merde', 'enculé', 'enculer',
  'fdp', 'fils de pute', 'nique', 'niquer', 'baise', 'baiser', 'bite', 'couille',
  'couilles', 'chier', 'chieur', 'con', 'conne', 'abruti', 'abrutie', 'idiot',
  'idiote', 'imbécile', 'crétin', 'crétine', 'débile', 'taré', 'tarée',
  'grosse vache', 'pd', 'pédé', 'tapette'
];

const COMPLIMENT_SUGGESTIONS = {
  'Personnalité': [
    'Tu as une énergie incroyable qui illumine les pièces où tu entres.',
    'Ta gentillesse est vraiment rare et précieuse.',
    'Tu as une sagesse et une sérénité qui font du bien autour de toi.',
    'Tu es quelqu\'un sur qui on peut vraiment compter.',
    'Ta bienveillance envers les autres est touchante.',
    'Tu as une façon unique de mettre les gens à l\'aise.',
    'Ton authenticité est vraiment rafraîchissante.',
    'Tu inspires les gens autour de toi sans même t\'en rendre compte.',
    'Ta générosité est sans limite, c\'est admirable.',
    'Tu as une présence apaisante qui fait du bien.',
    'Ton empathie est un don rare et précieux.',
    'Tu as une force intérieure qui force le respect.'
  ],
  'Look': [
    'Tu as un style vraiment unique et inspirant.',
    'Tu es rayonnant(e) en ce moment, ça se voit vraiment.',
    'Tu as une façon de t\'habiller qui te ressemble parfaitement.',
    'Ton sourire est absolument contagieux.',
    'Tu as une allure naturelle qui impressionne.',
    'Tu portes les couleurs avec une élégance rare.',
    'Ton regard est expressif et magnétique.',
    'Tu as une présence physique qui attire l\'attention positivement.',
    'Tu es toujours impeccable, c\'est impressionnant.',
    'Tu as une beauté naturelle qui n\'a pas besoin d\'artifices.',
    'Ton style évolue et s\'améliore constamment.',
    'Tu as une façon de te tenir qui dégage confiance et élégance.'
  ],
  'Talent': [
    'Tu es tellement doué(e), ça m\'impressionne vraiment à chaque fois.',
    'Ton talent est impressionnant, continue comme ça !',
    'Tu as des compétences que peu de gens possèdent.',
    'Ce que tu crées est vraiment exceptionnel.',
    'Tu maîtrises ton domaine avec une facilité déconcertante.',
    'Ton travail parle pour toi, c\'est du grand art.',
    'Tu as un don naturel qui se voit dans tout ce que tu fais.',
    'Tes créations me laissent sans voix à chaque fois.',
    'Tu progresses à une vitesse incroyable, c\'est inspirant.',
    'Ton dévouement à ton art est vraiment admirable.',
    'Tu as une créativité débordante qui force l\'admiration.',
    'Ce que tu accomplies est vraiment remarquable.'
  ],
  'Humour': [
    'Tu me fais rire comme personne d\'autre.',
    'Ton humour est parfait, tu sais toujours quoi dire pour détendre l\'atmosphère.',
    'Tu as le don de transformer n\'importe quelle situation en moment de joie.',
    'Tes blagues sont toujours au bon moment et bien dosées.',
    'Tu as un sens de l\'humour intelligent et bienveillant.',
    'Avec toi, même les moments difficiles deviennent plus légers.',
    'Tu as une façon de voir les choses qui fait toujours sourire.',
    'Ton rire est contagieux et fait du bien à tout le monde.',
    'Tu es la personne qui met de la bonne humeur partout où tu passes.',
    'Tes réparties sont toujours brillantes et hilarantes.',
    'Tu as un timing comique parfait, c\'est un vrai talent.',
    'Être avec toi c\'est garantir une bonne dose de rires.'
  ],
  'Autre': [
    'Tu es quelqu\'un de vraiment spécial et unique.',
    'Le monde est meilleur avec toi dedans.',
    'Tu mérites tout le bonheur du monde.',
    'Tu es une source d\'inspiration pour ceux qui te connaissent.',
    'Ton impact positif sur les autres est immense.',
    'Tu es exactement la personne qu\'il faut dans les moments importants.',
    'Tu as quelque chose de magique qui est difficile à décrire.',
    'Être dans ta vie est une chance pour ceux qui t\'entourent.',
    'Tu apportes quelque chose d\'unique et d\'irremplaçable.',
    'Tu es quelqu\'un dont on se souvient pour les bonnes raisons.',
    'Ta présence dans la vie des autres fait une vraie différence.',
    'Tu es une personne remarquable à tous les niveaux.'
  ]
};

function getToday(): string {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterday(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function containsToxicWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return TOXIC_WORDS.some(word => lowerText.includes(word));
}

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/profiles/me - Get current user profile with streak logic
  fastify.get('/api/profiles/me', {
    schema: {
      description: 'Get current user profile',
      tags: ['profiles'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            avatar_emoji: { type: 'string' },
            phone_hash: { type: 'string', nullable: true },
            credits: { type: 'number' },
            streak_days: { type: 'number' },
            is_premium: { type: 'boolean' },
            daily_sends_count: { type: 'number' },
            total_received: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Getting profile');

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const today = getToday();
    const yesterday = getYesterday();
    let streakDays = profile.streak_days;
    let lastActiveDate = profile.last_active_date;

    if (!lastActiveDate || lastActiveDate < yesterday) {
      streakDays = 1;
    } else if (lastActiveDate === yesterday) {
      streakDays = profile.streak_days + 1;
    }

    lastActiveDate = today;

    await app.db.update(schema.profiles).set({
      streak_days: streakDays,
      last_active_date: lastActiveDate,
    }).where(eq(schema.profiles.id, session.user.id));

    // Count compliments received by current user
    const receivedCompliments = await app.db.query.compliments.findMany({
      where: eq(schema.compliments.recipient_id, session.user.id),
      columns: { id: true },
    });
    const totalReceived = receivedCompliments.length;

    const updated = { ...profile, streak_days: streakDays, last_active_date: lastActiveDate, total_received: totalReceived };
    app.logger.info({ userId: session.user.id, streakDays, totalReceived }, 'Profile retrieved');

    return updated;
  });

  // PUT /api/profiles/me - Update current user profile
  fastify.put('/api/profiles/me', {
    schema: {
      description: 'Update current user profile',
      tags: ['profiles'],
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          avatar_emoji: { type: 'string' },
          phone_hash: { type: 'string', nullable: true },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            avatar_emoji: { type: 'string' },
            credits: { type: 'number' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { username?: string; avatar_emoji?: string; phone_hash?: string | null } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, body: request.body }, 'Updating profile');

    const { username, avatar_emoji, phone_hash } = request.body;

    if (username && (username.length < 3 || username.length > 20)) {
      return reply.status(400).send({ error: 'Username must be 3-20 characters' });
    }

    if (username) {
      const existing = await app.db.query.profiles.findFirst({
        where: and(eq(schema.profiles.username, username), ne(schema.profiles.id, session.user.id)),
      });
      if (existing) {
        return reply.status(400).send({ error: 'Username already taken' });
      }
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (avatar_emoji !== undefined) updateData.avatar_emoji = avatar_emoji;
    if (phone_hash !== undefined) updateData.phone_hash = phone_hash;

    const [updated] = await app.db.update(schema.profiles)
      .set(updateData)
      .where(eq(schema.profiles.id, session.user.id))
      .returning();

    app.logger.info({ userId: session.user.id }, 'Profile updated');
    return updated;
  });

  // POST /api/profiles/setup - Setup new profile (idempotent)
  fastify.post('/api/profiles/setup', {
    schema: {
      description: 'Setup user profile',
      tags: ['profiles'],
      body: {
        type: 'object',
        required: ['username', 'avatar_emoji'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          avatar_emoji: { type: 'string' },
          phone_hash: { type: 'string', nullable: true },
        },
      },
      response: {
        200: { type: 'object', properties: { id: { type: 'string' } } },
        201: { type: 'object', properties: { id: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { username: string; avatar_emoji: string; phone_hash?: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, username: request.body.username }, 'Profile setup');

    const { username, avatar_emoji, phone_hash } = request.body;

    if (username.length < 3 || username.length > 20) {
      return reply.status(400).send({ error: 'Username must be 3-20 characters' });
    }

    const existing = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
    });

    if (existing) {
      app.logger.info({ userId: session.user.id }, 'Profile already exists');
      return reply.status(200).send(existing);
    }

    const usernameExists = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.username, username),
    });

    if (usernameExists) {
      return reply.status(400).send({ error: 'Username already taken' });
    }

    const [profile] = await app.db.insert(schema.profiles).values({
      id: session.user.id,
      username,
      avatar_emoji,
      phone_hash: phone_hash || null,
      credits: 10,
      streak_days: 0,
      is_premium: false,
    }).returning();

    await app.db.insert(schema.credit_transactions).values({
      user_id: session.user.id,
      amount: 10,
      reason: 'welcome_bonus',
    });

    app.logger.info({ userId: session.user.id, profileId: profile.id }, 'Profile created');
    return reply.status(201).send(profile);
  });

  // GET /api/contacts/list - List all contacts except current user
  fastify.get('/api/contacts/list', {
    schema: {
      description: 'List all available contacts (excluding current user) with INNER JOIN validation',
      tags: ['profiles'],
      response: {
        200: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  avatar_emoji: { type: 'string' },
                  phone_hash: { type: 'string', nullable: true },
                  credits: { type: 'number' },
                  streak_days: { type: 'number' },
                  is_premium: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Listing contacts');

    // INNER JOIN guard: Get all real users (those in the user table) as contacts
    // This ensures only profiles with matching user records are returned
    const allUsers = await app.db.query.user.findMany({
      columns: { id: true },
    });
    const userIds = allUsers.map(u => u.id);

    // Get profiles for real users only (INNER JOIN semantics), excluding current user
    const contacts = await app.db.query.profiles.findMany({
      where: and(
        ne(schema.profiles.id, session.user.id),
        inArray(schema.profiles.id, userIds)
      ),
      columns: {
        id: true,
        username: true,
        avatar_emoji: true,
        phone_hash: true,
        credits: true,
        streak_days: true,
        is_premium: true,
        created_at: true,
      },
    });

    app.logger.info({ userId: session.user.id, contactCount: contacts.length }, 'Contacts listed');
    return { contacts };
  });

  // GET /api/compliments/daily-count - Count compliments sent by current user today
  fastify.get('/api/compliments/daily-count', {
    schema: {
      description: 'Count compliments sent by current user today (UTC)',
      tags: ['compliments'],
      response: {
        200: {
          type: 'object',
          properties: {
            count: { type: 'number' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Counting daily compliments sent');

    // Get today's date string in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split('T')[0];

    // Count compliments sent by current user today
    const complimentsToday = await app.db.query.compliments.findMany({
      where: and(
        eq(schema.compliments.sender_id, session.user.id),
        sql`${schema.compliments.created_at}::date = ${today}`
      ),
      columns: { id: true },
    });

    const count = complimentsToday.length;

    app.logger.info({ userId: session.user.id, count }, 'Daily compliments count calculated');
    return { count };
  });

  // GET /api/compliments - Get received compliments
  fastify.get('/api/compliments', {
    schema: {
      description: 'Get compliments received by current user',
      tags: ['compliments'],
      response: {
        200: {
          type: 'object',
          properties: {
            compliments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  sender_id: { type: 'string' },
                  recipient_id: { type: 'string' },
                  text: { type: 'string' },
                  category: { type: 'string' },
                  is_revealed: { type: 'boolean' },
                  reveal_guess_id: { type: 'string', nullable: true },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
            total_received: { type: 'number' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Fetching compliments');

    const blocked = await app.db.query.blocks.findMany({
      where: eq(schema.blocks.blocker_id, session.user.id),
      columns: { blocked_id: true },
    });
    const blockedIds = new Set(blocked.map(b => b.blocked_id));

    const compliments = await app.db.query.compliments.findMany({
      where: eq(schema.compliments.recipient_id, session.user.id),
      orderBy: desc(schema.compliments.created_at),
    });

    const result = [];

    for (const c of compliments) {
      if (blockedIds.has(c.sender_id)) {
        continue;
      }

      result.push({
        id: c.id,
        sender_id: c.sender_id,
        recipient_id: c.recipient_id,
        text: c.text,
        category: c.category,
        is_revealed: c.is_revealed,
        reveal_guess_id: c.reveal_guess_id,
        created_at: c.created_at,
      });
    }

    app.logger.info({ userId: session.user.id, count: result.length }, 'Compliments fetched');
    return { compliments: result, total_received: result.length };
  });

  // POST /api/compliments - Send a compliment
  fastify.post('/api/compliments', {
    schema: {
      description: 'Send an anonymous compliment',
      tags: ['compliments'],
      body: {
        type: 'object',
        required: ['recipient_id', 'text', 'category'],
        properties: {
          recipient_id: { type: 'string' },
          text: { type: 'string', minLength: 5, maxLength: 300 },
          category: { type: 'string', enum: ['Personnalité', 'Look', 'Talent', 'Humour', 'Autre'] },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sender_id: { type: 'string' },
            recipient_id: { type: 'string' },
            text: { type: 'string' },
            category: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            is_revealed: { type: 'boolean' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' } } },
        402: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { recipient_id: string; text: string; category: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, recipientId: request.body.recipient_id }, 'Sending compliment');

    const { recipient_id, text, category } = request.body;

    if (recipient_id === session.user.id) {
      return reply.status(400).send({
        error: 'Tu ne peux pas t\'envoyer un compliment.',
        code: 'self_send_not_allowed',
      });
    }

    if (text.length < 5 || text.length > 300) {
      return reply.status(400).send({ error: 'Text must be 5-300 characters', code: 'invalid_text_length' });
    }

    if (!['Personnalité', 'Look', 'Talent', 'Humour', 'Autre'].includes(category)) {
      return reply.status(400).send({ error: 'Invalid category', code: 'invalid_category' });
    }

    if (containsToxicWords(text)) {
      return reply.status(400).send({
        error: 'Ce message ne respecte pas nos règles de bienveillance.',
        code: 'moderation_failed',
      });
    }

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
    });

    const today = getToday();
    let dailySendsCount = profile?.daily_sends_count || 0;

    if (profile?.daily_sends_reset_date !== today) {
      dailySendsCount = 0;
    }

    if (!profile?.is_premium && dailySendsCount >= 3) {
      return reply.status(400).send({
        error: 'Limite quotidienne atteinte. Passe à Kindly Plus pour envoyer sans limite.',
        code: 'daily_limit_reached',
      });
    }

    const [compliment] = await app.db.insert(schema.compliments).values({
      sender_id: session.user.id,
      recipient_id,
      text,
      category: category as 'Personnalité' | 'Look' | 'Talent' | 'Humour' | 'Autre',
      is_revealed: false,
      reveal_guess_id: null,
    }).returning();

    await app.db.update(schema.profiles)
      .set({
        daily_sends_count: dailySendsCount + 1,
        daily_sends_reset_date: today,
      })
      .where(eq(schema.profiles.id, session.user.id));

    app.logger.info({ userId: session.user.id, complimentId: compliment.id }, 'Compliment sent');
    return reply.status(201).send({
      id: compliment.id,
      sender_id: compliment.sender_id,
      recipient_id: compliment.recipient_id,
      text: compliment.text,
      category: compliment.category,
      created_at: compliment.created_at,
      is_revealed: compliment.is_revealed,
    });
  });

  // GET /api/compliments/:id - Get single compliment by ID
  fastify.get('/api/compliments/:id', {
    schema: {
      description: 'Get a single compliment by ID',
      tags: ['compliments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            category: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            is_revealed: { type: 'boolean' },
            sender: { type: 'object', nullable: true },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.params.id }, 'Fetching compliment');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.params.id),
    });

    if (!compliment || compliment.recipient_id !== session.user.id) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    const result: any = {
      id: compliment.id,
      text: compliment.text,
      category: compliment.category,
      created_at: compliment.created_at,
      is_revealed: compliment.is_revealed,
      sender: null,
    };

    if (compliment.is_revealed) {
      const sender = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.id, compliment.sender_id),
        columns: { id: true, username: true, avatar_emoji: true },
      });
      result.sender = sender;
    }

    app.logger.info({ userId: session.user.id, complimentId: compliment.id }, 'Compliment retrieved');
    return result;
  });

  // POST /api/compliments/:id/reveal - Reveal compliment sender
  fastify.post('/api/compliments/:id/reveal', {
    schema: {
      description: 'Reveal the sender of a compliment',
      tags: ['compliments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            category: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            is_revealed: { type: 'boolean' },
            sender: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                avatar_emoji: { type: 'string' },
              },
            },
          },
        },
        402: { type: 'object', properties: { error: { type: 'string' }, credits_needed: { type: 'number' }, credits_available: { type: 'number' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.params.id }, 'Revealing compliment');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.params.id),
    });

    if (!compliment || compliment.recipient_id !== session.user.id) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    if (compliment.is_revealed) {
      const sender = await app.db.query.profiles.findFirst({
        where: eq(schema.profiles.id, compliment.sender_id),
        columns: { id: true, username: true, avatar_emoji: true },
      });
      app.logger.info({ userId: session.user.id, complimentId: compliment.id }, 'Compliment already revealed');
      return {
        id: compliment.id,
        text: compliment.text,
        category: compliment.category,
        created_at: compliment.created_at,
        is_revealed: compliment.is_revealed,
        sender,
      };
    }

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
    });

    if (!profile || profile.credits < 5) {
      return reply.status(402).send({
        error: 'Crédits insuffisants pour révéler l\'expéditeur.',
        credits_needed: 5,
        credits_available: profile?.credits || 0,
      });
    }

    await app.db.update(schema.profiles)
      .set({ credits: profile.credits - 5 })
      .where(eq(schema.profiles.id, session.user.id));

    await app.db.insert(schema.credit_transactions).values({
      user_id: session.user.id,
      amount: -5,
      reason: 'reveal_purchase',
      reference_id: compliment.id,
    });

    await app.db.update(schema.compliments)
      .set({ is_revealed: true })
      .where(eq(schema.compliments.id, compliment.id));

    const sender = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, compliment.sender_id),
      columns: { id: true, username: true, avatar_emoji: true },
    });

    app.logger.info({ userId: session.user.id, complimentId: compliment.id }, 'Compliment revealed');
    return {
      id: compliment.id,
      text: compliment.text,
      category: compliment.category,
      created_at: compliment.created_at,
      is_revealed: true,
      sender,
    };
  });

  // POST /api/compliments/:id/guess - Guess compliment sender
  fastify.post('/api/compliments/:id/guess', {
    schema: {
      description: 'Guess the sender of a compliment',
      tags: ['compliments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['guessed_user_id'],
        properties: {
          guessed_user_id: { type: 'string' },
        },
      },
      response: {
        200: { type: 'object', properties: { correct: { type: 'boolean' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { guessed_user_id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.params.id }, 'Guessing compliment');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.params.id),
    });

    if (!compliment || compliment.recipient_id !== session.user.id) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    await app.db.update(schema.compliments)
      .set({ reveal_guess_id: request.body.guessed_user_id })
      .where(eq(schema.compliments.id, compliment.id));

    const correct = compliment.sender_id === request.body.guessed_user_id;
    app.logger.info({ userId: session.user.id, complimentId: compliment.id, correct }, 'Compliment guessed');

    return { correct };
  });

  // GET /api/compliments/:id/guess-suggestions - Get guess suggestions
  fastify.get('/api/compliments/:id/guess-suggestions', {
    schema: {
      description: 'Get suggestions for guessing compliment sender',
      tags: ['compliments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  avatar_emoji: { type: 'string' },
                },
              },
            },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.params.id }, 'Getting guess suggestions');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.params.id),
    });

    if (!compliment || compliment.recipient_id !== session.user.id) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    const blocked = await app.db.query.blocks.findMany({
      where: eq(schema.blocks.blocker_id, session.user.id),
      columns: { blocked_id: true },
    });
    const blockedIds = new Set(blocked.map(b => b.blocked_id));

    // Get all profiles except current user and blocked users
    const allProfiles = await app.db.query.profiles.findMany({
      columns: { id: true, username: true, avatar_emoji: true },
    });

    const candidates = allProfiles.filter(p =>
      p.id !== session.user.id &&
      !blockedIds.has(p.id)
    );

    let suggestions: any[] = [];
    const senderIds = new Set<string>();
    let actualSenderProfile: any = null;

    // Get the actual sender profile
    if (compliment.sender_id !== session.user.id) {
      actualSenderProfile = candidates.find(p => p.id === compliment.sender_id);
      if (actualSenderProfile) {
        suggestions.push(actualSenderProfile);
        senderIds.add(compliment.sender_id);
      }
    }

    // Fill remaining spots with random candidates (up to 4 total)
    const availableCandidates = candidates.filter(p => !senderIds.has(p.id));
    while (suggestions.length < 4 && availableCandidates.length > 0) {
      const idx = Math.floor(Math.random() * availableCandidates.length);
      suggestions.push(availableCandidates[idx]);
      senderIds.add(availableCandidates[idx].id);
      availableCandidates.splice(idx, 1);
    }

    // Shuffle suggestions
    suggestions = suggestions.sort(() => Math.random() - 0.5);

    app.logger.info({ userId: session.user.id, suggestionCount: suggestions.length }, 'Guess suggestions generated');
    return { suggestions };
  });

  // POST /api/compliments/:id/share - Create shareable link
  fastify.post('/api/compliments/:id/share', {
    schema: {
      description: 'Create a shareable link for a compliment',
      tags: ['compliments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            invite_id: { type: 'string' },
            share_url: { type: 'string' },
          },
        },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.params.id }, 'Creating share link');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.params.id),
    });

    if (!compliment || compliment.recipient_id !== session.user.id) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    const [link] = await app.db.insert(schema.invite_links).values({
      creator_id: session.user.id,
      compliment_id: request.params.id,
    }).returning();

    app.logger.info({ userId: session.user.id, inviteId: link.id }, 'Share link created');
    return reply.status(201).send({
      invite_id: link.id,
      share_url: `https://kindly.app/invite/${link.id}`,
    });
  });

  // GET /api/credits - Get credit balance and transactions
  fastify.get('/api/credits', {
    schema: {
      description: 'Get credit balance and transaction history',
      tags: ['credits'],
      response: {
        200: {
          type: 'object',
          properties: {
            balance: { type: 'number' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  reason: { type: 'string' },
                  reference_id: { type: 'string', nullable: true },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id }, 'Getting credits');

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
      columns: { credits: true },
    });

    const transactions = await app.db.query.credit_transactions.findMany({
      where: eq(schema.credit_transactions.user_id, session.user.id),
      orderBy: (t) => t.created_at,
    });

    app.logger.info({ userId: session.user.id, balance: profile?.credits }, 'Credits retrieved');
    return {
      balance: profile?.credits || 0,
      transactions,
    };
  });

  // POST /api/credits/purchase - Purchase credit pack
  fastify.post('/api/credits/purchase', {
    schema: {
      description: 'Purchase a credit pack',
      tags: ['credits'],
      body: {
        type: 'object',
        required: ['pack'],
        properties: {
          pack: { type: 'string', enum: ['pack_10', 'pack_50', 'pack_150'] },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            new_balance: { type: 'number' },
            credits_added: { type: 'number' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { pack: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, pack: request.body.pack }, 'Purchasing credits');

    const packs: Record<string, number> = {
      pack_10: 10,
      pack_50: 50,
      pack_150: 150,
    };

    const creditsToAdd = packs[request.body.pack];
    if (!creditsToAdd) {
      return reply.status(400).send({ error: 'Invalid pack' });
    }

    const profile = await app.db.query.profiles.findFirst({
      where: eq(schema.profiles.id, session.user.id),
    });

    const newBalance = (profile?.credits || 0) + creditsToAdd;

    await app.db.update(schema.profiles)
      .set({ credits: newBalance })
      .where(eq(schema.profiles.id, session.user.id));

    await app.db.insert(schema.credit_transactions).values({
      user_id: session.user.id,
      amount: creditsToAdd,
      reason: 'pack_purchase',
    });

    app.logger.info({ userId: session.user.id, newBalance }, 'Credits purchased');
    return reply.status(201).send({
      new_balance: newBalance,
      credits_added: creditsToAdd,
    });
  });

  // POST /api/reports - Report a compliment
  fastify.post('/api/reports', {
    schema: {
      description: 'Report an inappropriate compliment',
      tags: ['reports'],
      body: {
        type: 'object',
        required: ['compliment_id', 'reason'],
        properties: {
          compliment_id: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
        },
      },
      response: {
        201: { type: 'object', properties: { success: { type: 'boolean' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { compliment_id: string; reason: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, complimentId: request.body.compliment_id }, 'Reporting compliment');

    const compliment = await app.db.query.compliments.findFirst({
      where: eq(schema.compliments.id, request.body.compliment_id),
    });

    if (!compliment) {
      return reply.status(404).send({ error: 'Compliment not found' });
    }

    await app.db.insert(schema.reports).values({
      reporter_id: session.user.id,
      reported_compliment_id: request.body.compliment_id,
      reason: request.body.reason,
    });

    app.logger.info({ userId: session.user.id, complimentId: request.body.compliment_id }, 'Report submitted');
    return reply.status(201).send({ success: true });
  });

  // POST /api/blocks - Block a user
  fastify.post('/api/blocks', {
    schema: {
      description: 'Block a user',
      tags: ['blocks'],
      body: {
        type: 'object',
        required: ['blocked_id'],
        properties: {
          blocked_id: { type: 'string' },
        },
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Body: { blocked_id: string } }>, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    app.logger.info({ userId: session.user.id, blockedId: request.body.blocked_id }, 'Blocking user');

    const existing = await app.db.query.blocks.findFirst({
      where: and(
        eq(schema.blocks.blocker_id, session.user.id),
        eq(schema.blocks.blocked_id, request.body.blocked_id)
      ),
    });

    if (existing) {
      app.logger.info({ userId: session.user.id, blockedId: request.body.blocked_id }, 'Block already exists');
      return { success: true };
    }

    await app.db.insert(schema.blocks).values({
      blocker_id: session.user.id,
      blocked_id: request.body.blocked_id,
    }).returning();

    app.logger.info({ userId: session.user.id, blockedId: request.body.blocked_id }, 'User blocked');
    return { success: true };
  });

  // POST /api/invite/:invite_id/track - Track invite link click
  fastify.post('/api/invite/:invite_id/track', {
    schema: {
      description: 'Track invite link click',
      tags: ['invites'],
      params: {
        type: 'object',
        required: ['invite_id'],
        properties: {
          invite_id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
  }, async (request: FastifyRequest<{ Params: { invite_id: string } }>) => {
    app.logger.info({ inviteId: request.params.invite_id }, 'Tracking invite click');

    const link = await app.db.query.invite_links.findFirst({
      where: eq(schema.invite_links.id, request.params.invite_id),
    });

    if (link) {
      await app.db.update(schema.invite_links)
        .set({ click_count: link.click_count + 1 })
        .where(eq(schema.invite_links.id, request.params.invite_id));

      app.logger.info({ inviteId: request.params.invite_id, newCount: link.click_count + 1 }, 'Invite click tracked');
    }

    return { success: true };
  });

  // GET /api/suggested-compliments - Get hardcoded suggestions
  fastify.get('/api/suggested-compliments', {
    schema: {
      description: 'Get suggested compliments for a category',
      tags: ['compliments'],
      querystring: {
        type: 'object',
        required: ['category'],
        properties: {
          category: { type: 'string', enum: ['Personnalité', 'Look', 'Talent', 'Humour', 'Autre'] },
        },
      },
      response: {
        200: {
          type: 'array',
          items: { type: 'string' },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { category: string } }>, reply: FastifyReply) => {
    app.logger.info({ category: request.query.category }, 'Getting suggestions');

    const category = request.query.category;
    const suggestions = COMPLIMENT_SUGGESTIONS[category as keyof typeof COMPLIMENT_SUGGESTIONS];

    if (!suggestions) {
      return reply.status(400).send({ error: 'Invalid category' });
    }

    app.logger.info({ category, count: suggestions.length }, 'Suggestions retrieved');
    return suggestions;
  });
}
