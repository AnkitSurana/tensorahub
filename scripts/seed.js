// scripts/seed.js
// Run once: `npm run seed`
// Creates the first admin account so you can log in to /admin and take it
// from there. Safe to re-run -- it checks if the admin already exists.

const bcrypt = require('bcryptjs');
const { getUserByUsername, createUser } = require('../db');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

(async () => {
  const existing = await getUserByUsername(ADMIN_USERNAME);
  if (existing) {
    console.log(`Admin user "${ADMIN_USERNAME}" already exists. Nothing to do.`);
    process.exit(0);
  }

  const password_hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await createUser({
    username: ADMIN_USERNAME,
    password_hash,
    display_name: 'Admin',
    batch: '',
    expires_at: null,
    is_admin: true,
  });

  console.log('Admin user created:');
  console.log(`  username: ${ADMIN_USERNAME}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('Log in at /login, then go to /admin. Change this password via the');
  console.log('admin panel or by re-running with ADMIN_PASSWORD=newpass npm run seed');
  console.log('after deleting the row (this script only creates, it will not overwrite).');
  process.exit(0);
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
