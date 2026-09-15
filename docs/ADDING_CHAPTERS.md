# Adding a new chapter

This covers the TensoraHub-specific mechanics: where the file goes, how it
gets registered, and how the features already built (watermark, dark mode,
quizzes, search, etc.) apply automatically. For the actual writing
conventions (tone, math verification, HTML template), see
`docs/CHAPTER_AUTHORING_SKILL.md` — that one's portable to a fresh chat
with no history of this project and should produce a consistent result.

## The steps

1. **Write the chapter HTML file.** Follow the template and conventions in
   `docs/CHAPTER_AUTHORING_SKILL.md`. Save it into `content/chapters/`.

2. **Register it in `content/chapters.json`**, inside the right section's
   `chapters` array, with `"visible": false`:
   ```json
   { "id": "11", "file": "11-uniform-distribution.html", "title": "Uniform Distribution", "visible": false, "batches": [] }
   ```
   It now exists on the server but is completely invisible — not in the
   sidebar, and the URL 404s if guessed directly (checked server-side).

3. **Review it** — you can open it directly by temporarily flipping
   `visible` to `true` for your own testing, or just read the raw file.

4. **Flip `"visible": true`** when it's ready. Live immediately, no
   restart, no redeploy — `chapters.json` is read fresh on every request.

## Things you get for free — don't build these yourself

Every one of these applies automatically to any chapter file, the moment
it's registered in `chapters.json`. None of it needs to be added to the
chapter's own HTML:

- Watermark (student name + timestamp, faint diagonal pattern)
- Right-click / text-select / print blocking
- Dark mode (the chapter's own CSS variables get overridden automatically
  when the student has dark mode on — as long as you use `var(--paper)`,
  `var(--ink)`, etc. throughout, never a hardcoded hex color, this just
  works)
- Reading-time estimate, inserted right after your `<p class="sub">`
- Scroll-progress bar, jump-to-top button, font-size controls
- Mobile-responsive padding/heading sizes (below 600px width)
- The "mark as read" checkmark (fires once the student scrolls ~90%
  through, or immediately if the chapter is short enough to need no
  scrolling)
- Every existing worked example (`.ex` block with `.q`/`.a`/`.calc`
  children) automatically becomes a "show answer" quiz — no markup change
  needed, this is detected generically

## Cross-references (linking to another chapter's section)

To make a phrase like "Recall from Chapter 2, Probability Recap, in the
'Addition rule' section" actually clickable and land on that section with
a brief highlight:

**1. The target chapter needs an `id` on the heading being referenced:**
```html
<h2 id="addition-rule">Addition rule (for "OR")</h2>
```

**2. The referencing chapter wraps the phrase in a link:**
```html
<a class="chapter-ref-link" onclick="parent.navigateToReference('s1','02','addition-rule')" href="javascript:void(0)">"Addition rule" section</a>
```
The three arguments are `sectionId`, `chapterId`, `anchorId` — matching
`chapters.json`'s ids exactly (check that file if unsure which section a
chapter lives in). If the target chapter is hidden or the student's batch
can't see it, the link silently does nothing rather than erroring.

Don't do this for a reference that covers two different sections in one
sentence with no clean single target — leave those as plain text rather
than picking one arbitrarily.

## Adding images

1. Drop the image file into `content/images/` (`.png`, `.jpg`/`.jpeg`,
   `.gif`, `.webp`, or `.svg`).
2. Reference it in the chapter with:
   ```html
   <img class="fig-img" src="/content-assets/your-file.png" alt="Describe what the image shows">
   ```
   `/content-assets/` is a real, tested route — it requires login (same as
   everything else) but does not need any change per-image; it will
   reject anything that isn't a plain filename (no folders, no `..`) and
   any extension not in the list above.
3. Add this class once to the chapter's own `<style>` block (matches the
   existing `.chart-svg` convention for SVG figures):
   ```css
   .fig-img{ width:100%; height:auto; display:block; border-radius:2px; border:1px solid var(--rule); }
   ```
4. Same as SVG figures: a `<p class="fig-label">Figure N.</p>`-style
   caption before it, referenced in the prose ("...shown in Figure 2:")
   before it appears.

## Before you consider a chapter done

- [ ] Every number and formula independently verified (Python, not by eye)
- [ ] No number appears without showing where it came from
- [ ] Simple, plain English throughout; no em dashes
- [ ] Cross-references use real `id`s that actually exist in the target file
- [ ] Registered in `chapters.json`, `visible: false` until reviewed
