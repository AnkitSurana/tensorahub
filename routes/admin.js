// routes/admin.js
//
// Deliberately minimal -- a working admin surface, not a polished product.
// Protected by requireAuth + an is_admin check. There is no self-service
// signup anywhere in this app; every user row is created here or via the
// scripts/create-user.js CLI script.

const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');

const { requireAuth } = require('../middleware/auth');
const {
  getAllUsers,
  createUser,
  updateUser,
  getUserById,
  getAllBatches,
  upsertBatch,
  deleteBatch,
  getEffectiveExpiry,
} = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).send('Forbidden.');
  next();
}

function randomPassword() {
  // Simple, readable, generated password -- swap for something stronger if
  // you want, this is fine for handing out to students directly.
  const words = ['orbit', 'delta', 'coral', 'amber', 'flint', 'ember', 'ridge', 'quartz', 'basil', 'cedar'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}

router.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

router.get('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const users = await getAllUsers();
  const withEffectiveExpiry = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      batch: u.batch,
      expires_at: u.expires_at,                        // individual override only, may be blank
      effective_expires_at: await getEffectiveExpiry(u), // what actually applies (own override, or batch's)
      access_enabled: !!u.access_enabled,
      is_admin: !!u.is_admin,
      has_active_session: !!u.session_token,
      // Plaintext of the last password set by an admin (create or reset).
      // NEVER return password_hash. Blank for accounts seeded before the
      // initial_password column existed -- resetting fills it in.
      initial_password: u.initial_password || null,
    }))
  );
  res.json(withEffectiveExpiry);
}));

router.post('/api/admin/users', requireAuth, requireAdmin, express.json(), asyncHandler(async (req, res) => {
  const { username, display_name, batch, expires_at } = req.body;
  if (!username || !display_name) {
    return res.status(400).json({ error: 'username and display_name are required' });
  }
  if (!batch || !batch.trim()) {
    return res.status(400).json({ error: 'batch is required -- every student must belong to a batch' });
  }
  const password = randomPassword();
  const password_hash = bcrypt.hashSync(password, 10);
  const user = await createUser({
    username,
    password_hash,
    display_name,
    batch: batch.trim(),
    expires_at,
    initial_password: password, // stored plaintext for later re-reveal in the admin UI
  });
  // Return the plaintext password here (also now visible in the students
  // table's "Password" column with an eye toggle, so an admin can re-share
  // it later without regenerating).
  res.json({ id: user.id, username: user.username, password });
}));

router.patch('/api/admin/users/:id', requireAuth, requireAdmin, express.json(), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { display_name, batch, expires_at, access_enabled } = req.body;
  const fields = {};
  if (display_name !== undefined) fields.display_name = display_name;
  if (batch !== undefined) {
    if (!batch || !batch.trim()) {
      return res.status(400).json({ error: 'batch cannot be blank -- every student must belong to a batch' });
    }
    fields.batch = batch.trim();
  }
  if (expires_at !== undefined) fields.expires_at = expires_at || null;
  if (access_enabled !== undefined) fields.access_enabled = !!access_enabled;
  const user = await updateUser(id, fields);
  res.json({ ok: true, user });
}));

router.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = await getUserById(id);
  if (!user) return res.status(404).json({ error: 'not found' });
  const password = randomPassword();
  await updateUser(id, {
    password_hash: bcrypt.hashSync(password, 10),
    initial_password: password, // keep the reveal in the admin UI in sync with the current password
  });
  res.json({ id, username: user.username, password });
}));

// --- Batches ---
// A batch's expiry is what most students actually rely on -- change it
// once here and it applies to everyone with that batch value on their very
// next request. A user's own `expires_at` (set on the user row) overrides
// this for that one person only, used rarely, for exceptions.

router.get('/api/admin/batches', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getAllBatches());
}));

router.post('/api/admin/batches', requireAuth, requireAdmin, express.json(), asyncHandler(async (req, res) => {
  const { name, expires_at } = req.body;
  if (!name) return res.status(400).json({ error: 'batch name is required' });
  const batch = await upsertBatch(name.trim(), expires_at || null);
  res.json({ ok: true, batch });
}));

router.delete('/api/admin/batches/:name', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await deleteBatch(req.params.name);
  res.json({ ok: true });
}));

module.exports = router;
