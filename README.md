# TensoraHub

A login-gated site for serving course chapter HTML files, with per-student
access control, batches, a watermark, and copy/print friction. No
self-signup — every account is created by you, either through `/admin` or
directly in Supabase.

## Real security vs. deterrents

- **Actually enforced**: login, per-user expiry, the `access_enabled`
  switch, batch-based content restriction, and single-session login
  (logging in elsewhere invalidates the old session on its next request).
- **Deterrent only**: the watermark doesn't stop a screenshot, it makes a
  leaked one traceable. Right-click/print/select blocking stops casual
  copying, not anyone who opens dev tools. No website can actually prevent
  a screenshot or screen recording — that's outside what a browser page
  can control.

## What a student gets

- A sidebar with numbered, collapsible sections (each with a divider),
  search across every visible chapter, an overall "X of N chapters read"
  count, a reading-time estimate and scroll-progress bar per chapter, and
  a checkmark that appears once they've actually scrolled through a
  chapter, not merely opened it.
- Cross-chapter references ("Recall from Chapter 2...") are clickable —
  they jump to and briefly highlight the exact section referenced.
- Every existing worked example doubles as a quiz: the answer is hidden
  behind a "Show answer" button, so reading becomes attempt-then-check.
- A light/dark mode toggle (the sidebar itself switches palette too, not
  just the content), a bell that lights up when new chapters appear since
  their last visit, keyboard navigation (arrow keys / J·K between
  chapters), a jump-to-top button, font-size controls, and "continue where
  you left off" on return.
- Fully responsive: the sidebar becomes a slide-out drawer with a
  hamburger button below 760px width, closing automatically once a
  chapter is selected.
- None of this ever shows their expiry date — that check is server-only.

## Project layout

```
app.js                   -- the Express app (routes wired up, no .listen())
server.js                -- runs app.js locally or on Railway
api/index.js, vercel.json -- runs app.js on Vercel (serverless)
db.js                    -- Supabase access (users + batches)
config.js, config.json   -- app name/logo/version, read fresh each request
manifest.js              -- reads content/chapters.json, visibility/batch logic
middleware/auth.js       -- session check + single-session enforcement
routes/                  -- auth.js, chapters.js, admin.js
utils/
  injectRestrictions.js  -- watermark, quizzes, dark mode, progress bar,
                             mobile sizing, all injected per-request
  readingTime.js          -- word-count based reading estimate
  asyncHandler.js          -- forwards async route errors to Express
views/                   -- login.html, app-shell.html, admin.html
public/                  -- shell.css, shell.js (sidebar, search, toggles,
                             keyboard nav, notification bell)
content/
  chapters.json          -- sections, chapters, visibility, batches
  chapters/*.html         -- your actual chapter files, untouched
  images/                 -- figures/photos referenced from chapters
docs/
  ADDING_CHAPTERS.md      -- this app's specific workflow: register a
                             chapter, wire up cross-references, add images
  CHAPTER_AUTHORING_SKILL.md -- portable writing/style guide, usable in a
                             fresh chat with no history of this project
supabase/
  01_create_tables.sql   -- run once: creates all tables + pgcrypto
  02_initial_data.sql    -- run once after: admin + a batch + 20 students
  03_admin_queries.sql   -- reference: update/delete/reset templates
  04_migration_initial_password.sql -- run ONCE on an existing install to
                             add the initial_password column (fresh installs
                             from 01_create_tables.sql already include it)
  student_passwords.txt  -- plaintext passwords from 02_initial_data.sql
scripts/                 -- seed.js, create-user.js, hash-password.js
.env.example             -- copy to .env, fill in your Supabase values
```

## Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste and run `supabase/01_create_tables.sql`
   (creates `users` and `batches`, and enables `pgcrypto`).
3. Optionally also run `supabase/02_initial_data.sql` — creates your admin
   account, a starting batch, and 20 ready-to-hand-out students (passwords
   in `supabase/student_passwords.txt`; edit the file first if you want
   different defaults).
4. **Settings → API** → copy the **Project URL** and the **service_role**
   key (not `anon` — service_role is what lets the server bypass RLS,
   which the schema leaves fully locked down otherwise).
5. Copy `.env.example` to `.env` and fill in those two values.

Never expose the service role key to a browser or commit it to git.

## Running locally

```bash
npm install
npm run seed     # only if you skipped step 3 above — creates the admin account
npm start        # → http://localhost:3000
```

Log in, go to `/admin`, change the admin password, add students.

## Configuring appearance

Everything — tab title, sidebar wordmark, login heading, admin title, even
the server's startup log — comes from `config.json`:

```json
{
  "appName": "TensoraHub",
  "logoUrl": null,
  "showNameWithLogo": true
}
```

`logoUrl: null` means name-only (default). Set it to a path under `public/`
or any image URL to add a logo; `showNameWithLogo` controls whether the
name still shows alongside it. No restart needed — read fresh on every
request. The admin page always stays name-only by design.

## If content looks stale for a student

Every response (manifest, chapter content, "who am I") is sent with
`Cache-Control: no-store`, so a browser or a carrier's caching proxy can't
serve a stale copy. Flipping a chapter's `visible` flag takes effect on the
student's very next click. The only thing that *can* get browser-cached is
`shell.js`/`shell.css` themselves — bump `config.json`'s `version` field
after editing either, and the change is force-picked-up everywhere.

## Adding a new chapter

Short version: drop the HTML file into `content/chapters/`, register it in
`content/chapters.json` with `"visible": false`, review it, then flip that
to `true` — live immediately, no restart.

For the full workflow (cross-references, images, what's already handled
for you automatically) see **`docs/ADDING_CHAPTERS.md`**. For the actual
writing/visual conventions — the complete HTML template, tone rules, math
verification requirement — see **`docs/CHAPTER_AUTHORING_SKILL.md`**, which
is written to be portable: paste it into a brand new chat with no history
of this project, alongside the raw notes for a new chapter, and it should
produce something consistent with the existing 10.

A new **section** works the same way — add an object to `chapters.json`'s
top-level array with its own `chapters` list. The existing "Resources"
section (with the TensorBox page) is a working example — external links,
tools, anything that isn't a graded chapter gets the exact same treatment
(watermark, access control, quizzes) with no special-casing.

## Adding images to a chapter

1. Put the file in `content/images/` (`.png`, `.jpg`, `.gif`, `.webp`, or
   `.svg`).
2. Reference it as `<img class="fig-img" src="/content-assets/filename.png" alt="...">`.

`/content-assets/:filename` requires login (same as everything else) but
needs no per-image setup — it rejects anything that isn't a plain filename
(no folders, no `..`) and any extension not in the list above. Full detail
in `docs/ADDING_CHAPTERS.md`.

## Batches, expiry, and students

- `"batches": []` on a section/chapter means everyone can see it. List
  specific batch names to restrict it.
- Expiry lives on the **batch**, not the student, by default — change one
  date in `/admin`'s Batches panel and every student in that batch is
  affected on their next request. A student's individual expiry override
  (rare — one-off exceptions only) takes priority over their batch's when
  set; leave it blank otherwise.
- Add students via `/admin` (shows the generated password once), the CLI:
  ```bash
  node scripts/create-user.js "student047" "Ananya Sharma" "batch-2026-a" "2026-12-31"
  ```
  (expiry argument optional), or directly in SQL — see
  `supabase/03_admin_queries.sql` for templates, using Postgres's
  `crypt('password', gen_salt('bf', 10))` to hash a password inline with no
  separate script needed. `node scripts/hash-password.js "pw"` does the
  same thing if you'd rather generate a hash yourself first.

## Mobile

Below 760px width, the sidebar becomes an off-screen drawer opened via a
hamburger button (top-left), with a tap-outside-to-close backdrop and
Escape-to-close; selecting a chapter closes it automatically. Chapter
typography, the watermark's density, and the top-right controls all scale
down for narrow screens too — this is all injected centrally
(`utils/injectRestrictions.js` for chapter content, `public/shell.css` for
the shell), so a new chapter gets it for free with no extra work.

## Deployment: Vercel or Railway

The database is Supabase either way, so there's no persistent-disk
requirement and no code changes needed for either platform.

**Vercel**: push to GitHub → import the repo (it auto-detects `vercel.json`)
→ add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production` as
environment variables → deploy.

**Railway**: push to GitHub → New Project → Deploy from GitHub repo → add
the same three variables → no volume needed (that was only ever relevant
for the old SQLite version).

Either way: if you haven't already created an admin account via SQL, run
`npm run seed` locally against the same Supabase project — it writes
directly to Supabase, so the deployed app picks it up immediately. Your
data lives in Supabase, not on the host, so switching platforms later is
just redeploying with the same two variables.

## Security notes

- Set `NODE_ENV=production` on your real deployment (makes session cookies
  HTTPS-only).
- Change the default admin password immediately after first login.
- Generated student passwords are simple (word+4digits) — a reasonable
  trade-off for a small class, not a public-facing system.
