-- Clean up orphan/fake data - users and accounts that don't have active sessions
-- Run in order to respect foreign key constraints

-- 1. Delete profiles for users without active sessions
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM "user");

-- 2. Delete accounts for users without active sessions
DELETE FROM account WHERE user_id NOT IN (SELECT id FROM "user");

-- 3. Delete sessions for users that no longer exist
DELETE FROM session WHERE user_id NOT IN (SELECT id FROM "user");
