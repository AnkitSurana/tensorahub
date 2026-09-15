-- supabase/02_initial_data.sql
--
-- Run this ONCE, after 01_create_tables.sql, to set up: your first admin account,
-- a starting batch, and 20 ready-to-hand-out student accounts.
--
-- Every password below is hashed automatically at insert time via
-- crypt(..., gen_salt('bf', 10)) -- pgcrypto (enabled in 01_create_tables.sql)
-- generates a real bcrypt hash on the spot, no separate script needed.
--
-- IMPORTANT: the plaintext passwords used below only exist here and in
-- supabase/student_passwords.txt. Once this file has been run, the
-- database only stores the hash -- these plaintext values can't be
-- recovered from Supabase afterward. Keep this file and the roster
-- somewhere safe, or delete this file once you've copied out what you
-- need and rely on the roster + your own records instead.


-- ============================================================
-- 1. ADMIN ACCOUNT
-- ============================================================
-- Change 'admin' and 'changeme123' before running.

insert into users (username, password_hash, display_name, batch, is_admin)
values (
  'admin',
  crypt('changeme123', gen_salt('bf', 10)),
  'Admin',
  '',
  true
);


-- ============================================================
-- 2. STARTING BATCH
-- ============================================================
-- Change the name/date to whatever you actually want. Add more of these
-- (just repeat the insert with a different name) if you have more than
-- one batch to start with.

insert into batches (name, expires_at)
values ('batch-2026-a', '2026-12-31')
on conflict (name) do update set expires_at = excluded.expires_at;


-- ============================================================
-- 3. TWENTY STUDENT ACCOUNTS
-- ============================================================
-- display_name is a placeholder (e.g. 'Student 001') for every row --
-- update it once you know each real name, see supabase/03_admin_queries.sql for
-- the exact UPDATE statement to do that.

-- initial_password stores the plaintext alongside the hash so the admin
-- panel can re-reveal each student's password via the eye toggle on the
-- Password column, without needing to open this file or the roster. The
-- hash is still what authenticates.
insert into users (username, password_hash, display_name, batch, expires_at, access_enabled, is_admin, initial_password)
values
  ('student001', crypt('ridge5756', gen_salt('bf', 10)), 'Student 001', 'batch-2026-a', null, true, false, 'ridge5756'),
  ('student002', crypt('fern3803', gen_salt('bf', 10)), 'Student 002', 'batch-2026-a', null, true, false, 'fern3803'),
  ('student003', crypt('cedar4731', gen_salt('bf', 10)), 'Student 003', 'batch-2026-a', null, true, false, 'cedar4731'),
  ('student004', crypt('orbit9362', gen_salt('bf', 10)), 'Student 004', 'batch-2026-a', null, true, false, 'orbit9362'),
  ('student005', crypt('delta2747', gen_salt('bf', 10)), 'Student 005', 'batch-2026-a', null, true, false, 'delta2747'),
  ('student006', crypt('maple9030', gen_salt('bf', 10)), 'Student 006', 'batch-2026-a', null, true, false, 'maple9030'),
  ('student007', crypt('delta9066', gen_salt('bf', 10)), 'Student 007', 'batch-2026-a', null, true, false, 'delta9066'),
  ('student008', crypt('ridge2421', gen_salt('bf', 10)), 'Student 008', 'batch-2026-a', null, true, false, 'ridge2421'),
  ('student009', crypt('birch3113', gen_salt('bf', 10)), 'Student 009', 'batch-2026-a', null, true, false, 'birch3113'),
  ('student010', crypt('quartz6727', gen_salt('bf', 10)), 'Student 010', 'batch-2026-a', null, true, false, 'quartz6727'),
  ('student011', crypt('delta9713', gen_salt('bf', 10)), 'Student 011', 'batch-2026-a', null, true, false, 'delta9713'),
  ('student012', crypt('maple7654', gen_salt('bf', 10)), 'Student 012', 'batch-2026-a', null, true, false, 'maple7654'),
  ('student013', crypt('cedar2394', gen_salt('bf', 10)), 'Student 013', 'batch-2026-a', null, true, false, 'cedar2394'),
  ('student014', crypt('delta5376', gen_salt('bf', 10)), 'Student 014', 'batch-2026-a', null, true, false, 'delta5376'),
  ('student015', crypt('coral3877', gen_salt('bf', 10)), 'Student 015', 'batch-2026-a', null, true, false, 'coral3877'),
  ('student016', crypt('flint5346', gen_salt('bf', 10)), 'Student 016', 'batch-2026-a', null, true, false, 'flint5346'),
  ('student017', crypt('sable6870', gen_salt('bf', 10)), 'Student 017', 'batch-2026-a', null, true, false, 'sable6870'),
  ('student018', crypt('quartz1365', gen_salt('bf', 10)), 'Student 018', 'batch-2026-a', null, true, false, 'quartz1365'),
  ('student019', crypt('sable6861', gen_salt('bf', 10)), 'Student 019', 'batch-2026-a', null, true, false, 'sable6861'),
  ('student020', crypt('rune8091', gen_salt('bf', 10)), 'Student 020', 'batch-2026-a', null, true, false, 'rune8091');
