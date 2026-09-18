// scripts/create-user.js
// Usage:
//   node scripts/create-user.js "student047" "Ananya Sharma" "batch-2026-a" "2026-12-31"
// batch is required -- every student must belong to one, or they can't
// log in at all (see manifest.js/userHasPortalAccess). The expiry date
// argument is still optional -- omit it, and the student just follows
// their batch's expiry (the normal case). See db.js/getEffectiveExpiry.

const bcrypt = require('bcryptjs');
const { createUser, getUserByUsername } = require('../db');

const [, , username, displayName, batch, expiresAt] = process.argv;

function randomPassword() {
  const words = ['orbit', 'delta', 'coral', 'amber', 'flint', 'ember', 'ridge', 'quartz', 'basil', 'cedar'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}

(async () => {
  if (!username || !displayName || !batch || !batch.trim()) {
    console.log('Usage: node scripts/create-user.js <username> "<display name>" <batch> [expires_at YYYY-MM-DD]');
    console.log('batch is required -- every student must belong to a batch to log in at all.');
    process.exit(1);
  }

  if (await getUserByUsername(username)) {
    console.log(`Username "${username}" already exists.`);
    process.exit(1);
  }

  const password = randomPassword();
  const password_hash = bcrypt.hashSync(password, 10);

  await createUser({
    username,
    password_hash,
    display_name: displayName,
    batch: batch.trim(),
    expires_at: expiresAt || null,
  });

  console.log('Student created:');
  console.log(`  username: ${username}`);
  console.log(`  password: ${password}`);
  console.log(`  batch:    ${batch.trim()}`);
  console.log(`  expires:  ${expiresAt || '(follows batch expiry, if any)'}`);
  process.exit(0);
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
