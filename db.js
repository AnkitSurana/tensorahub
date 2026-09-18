// db.js
//
// Talks to Supabase (hosted Postgres, via its REST API), not a local file.
// This is what makes deployment platform-agnostic: no local disk to lose on
// redeploy, so this same code runs unmodified on Vercel, Railway, or
// anywhere else. See supabase/01_create_tables.sql for the tables this expects, and
// .env.example for the two environment variables required.
//
// Every function here is async now (network calls, not local file reads),
// which is why every caller throughout the app uses await -- see
// manifest.js, middleware/auth.js, and routes/*.js.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env ' +
    'and fill in your project\'s values (Supabase dashboard -> Settings -> API).'
  );
}

// The SERVICE ROLE key is required (not the anon/public key) -- it's the
// only one allowed to read/write these tables, since RLS is on with no
// policies (see 01_create_tables.sql). Never send this key to a browser.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function throwIfError(error) {
  if (error) throw new Error(error.message || String(error));
}

async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  throwIfError(error);
  return data;
}

async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  return data;
}

async function getAllUsers() {
  // Secondary sort by id is required, not cosmetic: the seed script inserts
  // all 20 students in a single INSERT, so they share the exact same
  // created_at (Postgres now() is constant within a transaction). With no
  // tiebreaker, tied rows come back in Postgres's physical-row order, which
  // shifts as soon as any row in that group is updated -- so toggling one
  // student's Access checkbox would visibly reorder the whole table.
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  throwIfError(error);
  return data;
}

async function createUser({ username, password_hash, display_name, batch, expires_at, is_admin, initial_password }) {
  // initial_password stores the plaintext the admin panel generated, so an
  // admin can re-reveal it later from the UI (see the eye-toggle in
  // views/admin.html). password_hash is still what actually authenticates.
  // A NULL initial_password just means "not visible in the UI" (e.g. rows
  // seeded before the column was added); resetting the password fills it in.
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash,
      display_name,
      batch: batch || '',
      expires_at: expires_at || null,
      is_admin: !!is_admin,
      initial_password: initial_password || null,
    })
    .select()
    .single();
  throwIfError(error);
  return data;
}

async function setSessionToken(userId, token) {
  const { error } = await supabase.from('users').update({ session_token: token }).eq('id', userId);
  throwIfError(error);
}

async function clearSessionToken(userId) {
  const { error } = await supabase.from('users').update({ session_token: null }).eq('id', userId);
  throwIfError(error);
}

async function updateUser(id, fields) {
  const allowed = ['display_name', 'batch', 'expires_at', 'access_enabled', 'password_hash', 'initial_password'];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      patch[key] = fields[key];
    }
  }
  if (Object.keys(patch).length === 0) return getUserById(id);

  const { data, error } = await supabase.from('users').update(patch).eq('id', id).select().single();
  throwIfError(error);
  return data;
}

// --- Batches ---
// A batch's expires_at is what most students' access actually depends on.
// Change it once here and it takes effect for everyone in that batch on
// their very next request -- no per-student edits needed.

async function getBatch(name) {
  if (!name) return null;
  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('name', name)
    .maybeSingle();
  throwIfError(error);
  return data;
}

async function getAllBatches() {
  const { data, error } = await supabase.from('batches').select('*').order('name');
  throwIfError(error);
  return data;
}

// Creates the batch if it doesn't exist yet, or updates its expiry if it does.
async function upsertBatch(name, expires_at) {
  const { data, error } = await supabase
    .from('batches')
    .upsert({ name, expires_at: expires_at || null }, { onConflict: 'name' })
    .select()
    .single();
  throwIfError(error);
  return data;
}

async function deleteBatch(name) {
  const { error } = await supabase.from('batches').delete().eq('name', name);
  throwIfError(error);
}

// A student's real, effective expiry: their own individual override if one
// is set, otherwise whatever their batch's expiry is, otherwise no expiry
// at all. This is the one function everything else should call -- never
// read user.expires_at directly anywhere else in the app.
async function getEffectiveExpiry(user) {
  if (user.expires_at) return user.expires_at; // individual override wins
  const batch = await getBatch(user.batch);
  return batch ? batch.expires_at : null;
}

module.exports = {
  supabase,
  getUserByUsername,
  getUserById,
  getAllUsers,
  createUser,
  setSessionToken,
  clearSessionToken,
  updateUser,
  getBatch,
  getAllBatches,
  upsertBatch,
  deleteBatch,
  getEffectiveExpiry,
};
