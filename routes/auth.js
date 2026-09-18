// routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { getUserByUsername, setSessionToken, clearSessionToken } = require('../db');
const { setSessionCookie, COOKIE_NAME } = require('../middleware/auth');
const { userHasPortalAccess } = require('../manifest');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Messages shown to students are deliberately generic -- never mention an
// expiry date, never distinguish "wrong password" from "unknown username"
// (standard practice, avoids confirming which usernames exist).
const REASON_MESSAGES = {
  'session-ended': 'You were logged out because your account was accessed from another device.',
  'expired': 'Your access is no longer active. Please contact your instructor.',
  'access-disabled': 'Your access is no longer active. Please contact your instructor.',
  'no-batch': 'Your access is no longer active. Please contact your instructor.',
  'bad-credentials': 'Incorrect username or password.',
};

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
  // Note: the actual ?reason= message is read and shown client-side, in
  // views/login.html's own inline script, using the same REASON_MESSAGES
  // wording as above.
});

router.post('/login', express.urlencoded({ extended: false }), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await getUserByUsername((username || '').trim());

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.redirect('/login?reason=bad-credentials');
  }

  // Check access BEFORE issuing a session -- a disabled/expired account
  // should never get a valid session token, even momentarily.
  const gate = await userHasPortalAccess(user);
  if (!gate.ok) {
    return res.redirect('/login?reason=' + gate.reason);
  }

  // Fresh token on every login -- this is what kicks out any other
  // currently-open session for this account.
  const token = uuidv4();
  await setSessionToken(user.id, token);
  setSessionCookie(res, user.id, token);

  res.redirect('/app');
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const raw = req.cookies[COOKIE_NAME];
  if (raw) {
    const [idStr] = raw.split('.');
    await clearSessionToken(Number(idStr));
  }
  res.clearCookie(COOKIE_NAME);
  res.redirect('/login');
}));

module.exports = router;
