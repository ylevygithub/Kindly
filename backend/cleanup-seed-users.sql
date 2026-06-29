-- One-time cleanup: Remove orphan profiles and related data
-- Execute on deployment to clean up any profiles without matching auth users
-- Run in order to respect foreign key constraints

-- Delete profiles whose user_id has no matching row in the user table
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM "user");

-- Delete accounts for non-existent users
DELETE FROM account
WHERE user_id NOT IN (SELECT id FROM "user");

-- Delete sessions for non-existent users
DELETE FROM session
WHERE user_id NOT IN (SELECT id FROM "user");
