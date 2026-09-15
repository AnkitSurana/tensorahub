-- supabase/04_migration_initial_password.sql
--
-- Migration for an EXISTING install: adds the `initial_password` column so
-- the admin panel's Password column (with the eye toggle) has somewhere to
-- read the plaintext from. If you're setting this project up fresh from
-- 01_create_tables.sql, that file already includes this column and you can
-- skip this migration entirely.
--
-- Run this ONCE in your Supabase SQL Editor. Safe to re-run: the ALTER is
-- guarded by IF NOT EXISTS, and the UPDATEs only touch rows whose
-- initial_password is still NULL, so they don't overwrite anything the
-- admin panel has already stored.


-- 1. Add the column. Nullable on purpose -- pre-existing rows keep NULL
--    until you reset them (or backfill below), and the admin UI just
--    shows "not stored" for those.
alter table users
  add column if not exists initial_password text;


-- 2. OPTIONAL: backfill the 20 default seed students from
--    supabase/02_initial_data.sql. Skip this block if:
--      * you've already reset any of these passwords (a reset in the admin
--        panel now fills initial_password correctly on its own), or
--      * you deleted/renamed the seed students, or
--      * you never used the default seed data in the first place.
--    The `where initial_password is null` guard makes each UPDATE a no-op
--    when the row already has a stored password.

update users set initial_password = 'ridge5756'  where username = 'student001' and initial_password is null;
update users set initial_password = 'fern3803'   where username = 'student002' and initial_password is null;
update users set initial_password = 'cedar4731'  where username = 'student003' and initial_password is null;
update users set initial_password = 'orbit9362'  where username = 'student004' and initial_password is null;
update users set initial_password = 'delta2747'  where username = 'student005' and initial_password is null;
update users set initial_password = 'maple9030'  where username = 'student006' and initial_password is null;
update users set initial_password = 'delta9066'  where username = 'student007' and initial_password is null;
update users set initial_password = 'ridge2421'  where username = 'student008' and initial_password is null;
update users set initial_password = 'birch3113'  where username = 'student009' and initial_password is null;
update users set initial_password = 'quartz6727' where username = 'student010' and initial_password is null;
update users set initial_password = 'delta9713'  where username = 'student011' and initial_password is null;
update users set initial_password = 'maple7654'  where username = 'student012' and initial_password is null;
update users set initial_password = 'cedar2394'  where username = 'student013' and initial_password is null;
update users set initial_password = 'delta5376'  where username = 'student014' and initial_password is null;
update users set initial_password = 'coral3877'  where username = 'student015' and initial_password is null;
update users set initial_password = 'flint5346'  where username = 'student016' and initial_password is null;
update users set initial_password = 'sable6870'  where username = 'student017' and initial_password is null;
update users set initial_password = 'quartz1365' where username = 'student018' and initial_password is null;
update users set initial_password = 'sable6861'  where username = 'student019' and initial_password is null;
update users set initial_password = 'rune8091'   where username = 'student020' and initial_password is null;
