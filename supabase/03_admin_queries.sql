-- supabase/03_admin_queries.sql
--
-- Reference templates for everything you'd do AFTER the initial setup
-- (01_create_tables.sql + 02_initial_data.sql): changing details, resetting passwords,
-- extending or ending access, deleting records, and a few useful lookups.
-- Copy the block you need into the SQL Editor, edit the values, run it.


-- ============================================================
-- LOOKUPS (read-only, safe to run anytime)
-- ============================================================

-- See everyone at a glance.
select username, display_name, batch, expires_at, access_enabled, is_admin,
       (session_token is not null) as currently_logged_in
from users
order by username;

-- See every batch and its expiry.
select * from batches order by name;

-- See just the students in one batch.
select username, display_name, expires_at, access_enabled
from users
where batch = 'batch-2026-a'
order by username;

-- See who is currently logged in somewhere (has an active session).
select username, display_name
from users
where session_token is not null;


-- ============================================================
-- UPDATING A STUDENT
-- ============================================================

-- Set/change their display name (e.g. once you know who student001 is).
update users set display_name = 'Ananya Sharma' where username = 'student001';

-- Move them to a different batch.
update users set batch = 'batch-2026-b' where username = 'student001';

-- Give them an individual expiry override (rare -- normally just let them
-- follow their batch's expiry instead). Set it back to null to remove
-- the override and go back to following the batch.
update users set expires_at = '2027-06-30' where username = 'student001';
update users set expires_at = null where username = 'student001';

-- Turn their access off or back on (the master switch -- overrides batch
-- and expiry entirely while set to false).
update users set access_enabled = false where username = 'student001';
update users set access_enabled = true where username = 'student001';

-- Reset their password. Same crypt(...) approach as the initial insert.
update users
set password_hash = crypt('theirNewPassword', gen_salt('bf', 10))
where username = 'student001';

-- Force-logout a student right now, without changing their password
-- (their current session becomes invalid on their very next request,
-- they'll just need to log in again).
update users set session_token = null where username = 'student001';

-- Force-logout EVERYONE at once (e.g. you suspect a shared account, or
-- you just want a clean slate).
update users set session_token = null;


-- ============================================================
-- UPDATING AN ADMIN
-- ============================================================

-- Change an admin's password (same pattern as any user).
update users
set password_hash = crypt('yourNewPassword', gen_salt('bf', 10))
where username = 'admin';

-- Promote an existing student to admin, or demote an admin back to a
-- regular student.
update users set is_admin = true where username = 'student001';
update users set is_admin = false where username = 'student001';


-- ============================================================
-- BATCHES
-- ============================================================

-- Change a batch's expiry -- this is the one edit that affects every
-- student in that batch at once, on their very next request.
update batches set expires_at = '2027-01-31' where name = 'batch-2026-a';

-- Remove a batch's expiry entirely (never expires).
update batches set expires_at = null where name = 'batch-2026-a';

-- Rename a batch. NOTE: this only renames the row in the batches table --
-- it does NOT move students over automatically, since users.batch is
-- just a plain text field, not a foreign key. Update the students
-- separately (see the second statement below).
update batches set name = 'batch-2026-a-renamed' where name = 'batch-2026-a';
update users set batch = 'batch-2026-a-renamed' where batch = 'batch-2026-a';

-- Delete a batch. Students still holding that batch name keep it, they
-- simply have no batch-level expiry until you re-add a batch with that
-- same name (any individual expiry override they have still applies).
delete from batches where name = 'batch-2026-a';


-- ============================================================
-- DELETING
-- ============================================================

-- Delete a single student permanently.
delete from users where username = 'student001';

-- Delete every student in a batch at once (be careful with this one --
-- double check the batch name first with the lookup query above).
delete from users where batch = 'batch-2026-a' and is_admin = false;

-- Delete a batch (students keep their batch value as plain text, they
-- just lose the batch-level expiry, same as the single delete above).
delete from batches where name = 'batch-2026-a';
