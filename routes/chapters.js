// routes/chapters.js

const express = require('express');
const fs = require('fs');
const path = require('path');

const { requireAuth } = require('../middleware/auth');
const { getVisibleManifestForUser, getVisibleChaptersForUser, canServeChapter } = require('../manifest');
const { injectRestrictions } = require('../utils/injectRestrictions');
const { injectReadingTime, extractPlainText } = require('../utils/readingTime');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Sidebar data -- only ever contains what this specific user is allowed to
// see. A hidden chapter, a chapter outside their batch, or content behind
// an expired/disabled account never appears in this response at all.
router.get('/api/manifest', requireAuth, asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getVisibleManifestForUser(req.user));
}));

// Search index: plain text for every chapter this user can currently see,
// built fresh on each request (same "always read live" approach as
// chapters.json/config.json elsewhere in this app -- at this scale, a
// handful of small chapter files, re-reading and stripping tags on every
// request costs single-digit milliseconds, not worth adding a cache to
// invalidate correctly). Search itself happens entirely client-side
// against this one response, so typing in the search box makes no further
// requests at all.
router.get('/api/search-index', requireAuth, asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const chapters = await getVisibleChaptersForUser(req.user);

  const index = chapters.map((ch) => {
    const filePath = path.join(__dirname, '..', 'content', 'chapters', ch.file);
    let text = '';
    try {
      text = extractPlainText(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      text = ''; // missing file on disk -- just contributes nothing searchable, not a 500
    }
    return { sectionId: ch.sectionId, chapterId: ch.chapterId, title: ch.title, text };
  });

  res.json(index);
}));

// Images used inside chapter content (content/images/). Gated behind
// login only (not the full per-chapter visibility/batch check chapter
// content itself gets) -- an image on its own carries much less of the
// "this is the actual course material" weight than the chapter text does,
// so requiring login but not re-deriving which chapter it belongs to is
// a reasonable, much simpler bar. Path-traversal protected: only a bare
// filename (no slashes, no "..") is ever accepted.
const IMAGE_EXTENSIONS = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};
router.get('/content-assets/:filename', requireAuth, (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes('..')) {
    return res.status(400).send('Invalid filename.');
  }
  const ext = path.extname(filename).toLowerCase();
  const mimeType = IMAGE_EXTENSIONS[ext];
  if (!mimeType) return res.status(400).send('Unsupported file type.');

  const filePath = path.join(__dirname, '..', 'content', 'images', filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found.');

  res.set('Content-Type', mimeType);
  res.set('Cache-Control', 'no-store'); // same "always fresh" policy as the rest of this app
  res.sendFile(filePath);
});

// The actual protected content. Loaded inside an <iframe> by the shell page.
// Every request re-checks visibility + batch + access_enabled + expiry --
// nothing is cached or trusted from an earlier check, so flipping a flag
// or an expiry takes effect on this student's very next click.
router.get('/content/:sectionId/:chapterId', requireAuth, asyncHandler(async (req, res) => {
  const { sectionId, chapterId } = req.params;
  const result = await canServeChapter(req.user, sectionId, chapterId);

  if (!result.ok) {
    return res.status(404).send('<p style="font-family:sans-serif;padding:2rem;">Not found.</p>');
  }

  const filePath = path.join(__dirname, '..', 'content', 'chapters', result.chapter.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('<p style="font-family:sans-serif;padding:2rem;">Chapter file missing on server.</p>');
  }

  const rawHtml = fs.readFileSync(filePath, 'utf-8');
  const withReadingTime = injectReadingTime(rawHtml);
  const finalHtml = injectRestrictions(withReadingTime, {
    displayName: req.user.display_name,
    username: req.user.username,
  });

  res.set('Content-Type', 'text/html');
  // Never cache -- a chapter's visibility can change between requests.
  res.set('Cache-Control', 'no-store');
  res.send(finalHtml);
}));

module.exports = router;
