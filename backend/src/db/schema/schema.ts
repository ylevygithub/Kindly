import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

// Enums
export const complimentCategoryEnum = pgEnum('compliment_category', ['Personnalité', 'Look', 'Talent', 'Humour', 'Autre']);
export const creditReasonEnum = pgEnum('credit_reason', ['welcome_bonus', 'reveal_purchase', 'pack_purchase', 'subscription_bonus', 'daily_bonus']);

// Profiles table
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  avatar_emoji: text('avatar_emoji').notNull().default('😊'),
  phone_hash: text('phone_hash'),
  credits: integer('credits').notNull().default(10),
  streak_days: integer('streak_days').notNull().default(0),
  last_active_date: text('last_active_date'),
  is_premium: boolean('is_premium').notNull().default(false),
  daily_sends_count: integer('daily_sends_count').notNull().default(0),
  daily_sends_reset_date: text('daily_sends_reset_date'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Compliments table
export const compliments = pgTable('compliments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sender_id: text('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  recipient_id: text('recipient_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  category: complimentCategoryEnum('category').notNull(),
  is_revealed: boolean('is_revealed').notNull().default(false),
  reveal_guess_id: text('reveal_guess_id').references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Credit transactions table
export const credit_transactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: creditReasonEnum('reason').notNull(),
  reference_id: text('reference_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Reports table
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporter_id: text('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  reported_compliment_id: uuid('reported_compliment_id').notNull().references(() => compliments.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Blocks table
export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blocker_id: text('blocker_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  blocked_id: text('blocked_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Invite links table
export const invite_links = pgTable('invite_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  creator_id: text('creator_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  compliment_id: uuid('compliment_id').references(() => compliments.id, { onDelete: 'set null' }),
  click_count: integer('click_count').notNull().default(0),
  install_count: integer('install_count').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
