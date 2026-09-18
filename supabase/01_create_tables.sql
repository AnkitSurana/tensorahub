-- supabase/01_create_tables.sql
--
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL
-- Editor -> New query -> paste this -> Run). Creates both tables the app
-- needs, plus the pgcrypto extension (see below). Safe to re-run: every
-- statement uses IF NOT EXISTS.
--
-- This app connects using the SERVICE ROLE key (server-side only, never
-- exposed to a browser), which bypasses Row Level Security entirely. RLS is
-- enabled below anyway as a safety net, with no policies defined, which
-- means the anon/public key (if you ever handed one out) could not read or
-- write anything, only the service role key used by the server can.

-- pgcrypto lets you generate a bcrypt password hash directly in SQL, using
-- crypt('somepassword', gen_salt('bf', 10)) -- see supabase/02_initial_data.sql and supabase/03_admin_queries.sql
-- for ready-to-use examples (creating an admin, creating a student, all
-- without needing to run anything on your own machine).
create extension if not exists pgcrypto;

create table if not exists users (
  id                bigint generated always as identity primary key,
  username          text unique not null,
  password_hash     text not null,
  display_name      text not null,
  batch             text not null default '',
  expires_at        timestamptz,              -- NULL = no individual override (falls back to batch expiry)
  access_enabled    boolean not null default true,
  is_admin          boolean not null default false,
  session_token     text,                     -- current active session; login overwrites it
  -- Plaintext of the last password the admin panel generated for this
  -- student (from Create or Reset). Used ONLY to re-reveal it later in
  -- the admin UI via the eye toggle -- password_hash above is still what
  -- actually authenticates. NULL is normal for accounts you seed directly
  -- with SQL below and haven't reset since; the admin UI shows "not
  -- stored" for those rows.
  initial_password  text,
  created_at        timestamptz not null default now()
);

create table if not exists batches (
  name        text primary key,             -- matches users.batch
  expires_at  timestamptz,                  -- NULL = never expires
  created_at  timestamptz not null default now()
);

alter table users enable row level security;
alter table batches enable row level security;

-- No policies are created on purpose. With RLS on and zero policies, only
-- the service role key (used exclusively by this app's server) can read or
-- write these tables at all.
