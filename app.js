// app.js
//
// The actual Express app, with no app.listen() call. That's intentional --
// this file gets used two different ways depending on where you deploy:
//   - server.js requires this and calls .listen() for local dev or Railway
//   - api/index.js requires this and exports it as-is for Vercel, which
//     handles the listening itself (serverless, one function per request)
// Keeping the app definition separate from "how it's run" is what lets the
// exact same code deploy to either platform with zero changes.

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const chapterRoutes = require('./routes/chapters');
const adminRoutes = require('./routes/admin');
const { loadConfig } = require('./config');

const app = express();

app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- App name/branding config -- public, no auth needed. Every page
// (login, app shell, admin) fetches this on load and sets its own title
// and brand text from it. Change config.json, nothing else needs touching.
app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.set('Cache-Control', 'no-store');
  res.json({
    appName: cfg.appName,
    logoUrl: cfg.logoUrl || null,
    showNameWithLogo: cfg.showNameWithLogo !== false,
    version: cfg.version || '1',
  });
});

// --- Auth (login/logout) ---
app.use('/', authRoutes);

// --- The app shell (sidebar + iframe page) ---
// Reads config.json's `version` field and appends it as a cache-busting
// query string on the CSS/JS includes below. Bump that one number after
// you change shell.css/shell.js and every browser (and any caching proxy
// in between) treats it as a brand new file, no stale copy survives.
app.get('/app', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const version = cfg.version || '1';
  const filePath = path.join(__dirname, 'views', 'app-shell.html');
  let html = fs.readFileSync(filePath, 'utf-8');
  html = html
    .replace('/public/shell.css', `/public/shell.css?v=${encodeURIComponent(version)}`)
    .replace('/public/shell.js', `/public/shell.js?v=${encodeURIComponent(version)}`);
  res.set('Cache-Control', 'no-store');
  res.send(html);
});

// --- "Who am I" -- deliberately minimal. The important restrictions from
// the original design still hold: never expose expiry (would give a student
// a countdown to game around) and never expose batch or other flags. The
// one exception is `is_admin`: knowing it is what the shell needs to
// conditionally render the "Manage students" link, and it reveals nothing
// useful to a non-admin (a student is always false, and the server-side
// check on /admin and every /api/admin/* route is what actually enforces
// access -- the flag here is UI-hint only, not a permission grant).
app.get('/api/me', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    display_name: req.user.display_name,
    is_admin: !!req.user.is_admin,
  });
});

// --- Manifest + chapter content (both auth-gated, see routes/chapters.js) ---
app.use('/', chapterRoutes);

// --- Admin ---
app.use('/', adminRoutes);

// --- Root redirect ---
app.get('/', (req, res) => res.redirect('/app'));

// --- A basic error handler, so a thrown/rejected error (e.g. Supabase
// being briefly unreachable) shows something sane instead of an unstyled
// stack trace, and never leaks details to the browser.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).send('<p style="font-family:sans-serif;padding:2rem;">Something went wrong. Please try again.</p>');
});

module.exports = app;
