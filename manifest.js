// manifest.js
// Reads content/chapters.json fresh on every call (no caching), so editing
// that file takes effect immediately, no restart needed.
//
// Note: this file is async now, because it needs to look up a user's
// batch expiry from the database (see getEffectiveExpiry in db.js), which
// is a network call now that the backend is Supabase instead of local
// SQLite. Every function here that used to be synchronous now returns a
// Promise -- callers use await.

const fs = require('fs');
const path = require('path');
const { getEffectiveExpiry } = require('./db');

const MANIFEST_PATH = path.join(__dirname, 'content', 'chapters.json');

function loadManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw);
}

// A user's batch is allowed for an entry if the entry has no `batches` list
// (or an empty one -> means "everyone"), if their batch is explicitly
// listed, or if they're an admin -- an instructor account should
// reasonably see every chapter regardless of which batch it's scoped to,
// not just whichever batch their own account happens to be tagged with.
function batchAllowed(entry, user) {
  if (user.is_admin) return true;
  if (!entry.batches || entry.batches.length === 0) return true;
  return entry.batches.includes(user.batch);
}

// Same reasoning as batchAllowed above: admins see everything, so the
// `visible: false` review-gate hides a chapter/section from students only.
// This lets an instructor preview a work-in-progress chapter (set to
// visible:false while drafting) without having to flip it live first.
function isVisibleTo(entry, user) {
  if (user.is_admin) return true;
  return !!entry.visible;
}

// Uses the EFFECTIVE expiry: the user's own individual override if they
// have one, otherwise their batch's expiry. This is what makes "extend the
// whole batch by changing one date" actually work -- see db.js.
async function isExpired(user) {
  const effective = await getEffectiveExpiry(user);
  if (!effective) return false; // no expiry set anywhere = never expires
  return new Date() > new Date(effective);
}

// The master gate. Returns { ok: true } or { ok: false, reason: '...' }
async function userHasPortalAccess(user) {
  if (!user) return { ok: false, reason: 'not-logged-in' };
  if (!user.access_enabled) return { ok: false, reason: 'access-disabled' };
  // Every student must belong to a batch -- access with no batch at all
  // is refused outright, not just treated as "unrestricted". Admin
  // accounts are exempt, same as they're exempt from batch-restricted
  // content checks (see batchAllowed below).
  if (!user.is_admin && !user.batch) return { ok: false, reason: 'no-batch' };
  if (await isExpired(user)) return { ok: false, reason: 'expired' };
  return { ok: true };
}

// Returns the manifest filtered down to only what this user is allowed to see.
// Used to build the sidebar. Hidden/disallowed sections and chapters are
// removed entirely, not just flagged, so nothing about them leaks to the client.
async function getVisibleManifestForUser(user) {
  const manifest = loadManifest();
  const gate = await userHasPortalAccess(user);
  if (!gate.ok) return [];

  return manifest
    .filter((section) => isVisibleTo(section, user) && batchAllowed(section, user))
    .map((section) => ({
      id: section.id,
      title: section.title,
      chapters: section.chapters
        .filter((ch) => isVisibleTo(ch, user) && batchAllowed(ch, user))
        .map((ch) => ({ id: ch.id, title: ch.title })),
    }))
    .filter((section) => section.chapters.length > 0);
}

// Full server-side check used before actually serving a chapter's HTML file.
// This is the one that actually matters for security -- the sidebar filtering
// above is just for a clean UI, this is what stops someone hitting the URL directly.
async function canServeChapter(user, sectionId, chapterId) {
  const gate = await userHasPortalAccess(user);
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const manifest = loadManifest();
  const section = manifest.find((s) => s.id === sectionId);
  if (!section || !isVisibleTo(section, user) || !batchAllowed(section, user)) {
    return { ok: false, reason: 'not-found' };
  }
  const chapter = section.chapters.find((c) => c.id === chapterId);
  if (!chapter || !isVisibleTo(chapter, user) || !batchAllowed(chapter, user)) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, chapter, section };
}

// Server-side only -- includes the file path, which getVisibleManifestForUser
// deliberately omits since that one's response goes straight to the
// browser (the sidebar). This version is for building the search index,
// which needs to actually read each visible chapter's file on disk.
async function getVisibleChaptersForUser(user) {
  const manifest = loadManifest();
  const gate = await userHasPortalAccess(user);
  if (!gate.ok) return [];

  const result = [];
  for (const section of manifest) {
    if (!isVisibleTo(section, user) || !batchAllowed(section, user)) continue;
    for (const ch of section.chapters) {
      if (!isVisibleTo(ch, user) || !batchAllowed(ch, user)) continue;
      result.push({ sectionId: section.id, chapterId: ch.id, title: ch.title, file: ch.file });
    }
  }
  return result;
}

module.exports = {
  loadManifest,
  userHasPortalAccess,
  getVisibleManifestForUser,
  getVisibleChaptersForUser,
  canServeChapter,
  isExpired,
};
