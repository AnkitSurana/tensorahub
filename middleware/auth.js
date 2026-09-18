// middleware/auth.js

const { getUserById } = require('../db');
const { userHasPortalAccess } = require('../manifest');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'portal_session';

// Cookie value is "userId.sessionToken". We check the token against what's
// stored in the DB for that user -- if it doesn't match (because they logged
// in elsewhere and overwrote it), this session is dead. That's the whole
// "only one machine at a time" mechanism: newest login wins, everyone else
// gets logged out on their next request.
//
// Wrapped in asyncHandler below since this now makes a network call
// (Supabase) to look up the user -- any failure there gets forwarded to
// Express's error handling instead of hanging the request.
async function requireAuthRaw(req, res, next) {
  const raw = req.cookies[COOKIE_NAME];
  if (!raw) return res.redirect('/login');

  const [idStr, token] = raw.split('.');
  const user = await getUserById(Number(idStr));

  if (!user || !token || user.session_token !== token) {
    res.clearCookie(COOKIE_NAME);
    return res.redirect('/login?reason=session-ended');
  }

  const gate = await userHasPortalAccess(user);
  if (!gate.ok) {
    res.clearCookie(COOKIE_NAME);
    // Deliberately vague to the student -- see routes/auth.js for the
    // exact wording shown, which never reveals an expiry date.
    return res.redirect('/login?reason=' + gate.reason);
  }

  req.user = user;
  next();
}

const requireAuth = asyncHandler(requireAuthRaw);

function setSessionCookie(res, userId, token) {
  res.cookie(COOKIE_NAME, `${userId}.${token}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days; the single-session check
                                       // still invalidates it the moment
                                       // someone else logs in.
  });
}

module.exports = { requireAuth, setSessionCookie, COOKIE_NAME };
