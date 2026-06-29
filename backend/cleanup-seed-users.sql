-- Clean up seeded/fake users that have never had a real session
-- Run in order to respect foreign key constraints

-- 1. Delete profiles for users without active sessions
DELETE FROM profiles WHERE id NOT IN (SELECT DISTINCT user_id FROM session);

-- 2. Delete accounts for users without active sessions
DELETE FROM account WHERE user_id NOT IN (SELECT DISTINCT user_id FROM session);

-- 3. Delete users without active sessions
DELETE FROM "user" WHERE id NOT IN (SELECT DISTINCT user_id FROM session);
