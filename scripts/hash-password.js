// scripts/hash-password.js
// Usage: node scripts/hash-password.js "the-password-you-want-to-set"
// Prints a bcrypt hash you can paste into the password_hash column of the
// INSERT template in supabase/02_initial_data.sql or supabase/03_admin_queries.sql. This is the only way to get
// a valid hash for a direct SQL insert -- the users table stores hashes,
// never plain passwords, so a plain password pasted straight into SQL
// would never let that account log in.

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hash-password.js "the-password-you-want-to-set"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
