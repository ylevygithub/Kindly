-- Clean up orphan/fake data - remove rows that reference non-existent users
-- Run in order to respect foreign key constraints

-- 1. Delete profiles for users that don't exist in the user table
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM "user");

-- 2. Delete accounts for users that don't exist in the user table
DELETE FROM account WHERE user_id NOT IN (SELECT id FROM "user");

-- 3. Delete sessions for users that don't exist in the user table
DELETE FROM session WHERE user_id NOT IN (SELECT id FROM "user");
