---
name: aiml-course-chapter-authoring
description: Write a new lesson-notes chapter for an AI/ML probability & statistics course, in the exact visual and writing style of the existing chapters (paper/navy/brass design, Spectral+IBM Plex fonts, worked-example blocks, verified math, simple English). Use this whenever asked to write, draft, or add a new course chapter for this specific course.
---

# Course chapter authoring — style and structure

This document is self-contained: paste it into a fresh conversation (no
prior history of this project needed) along with the actual course
transcript/notes content for the new chapter, and it should produce a
chapter matching the existing ones almost exactly.

## What this course is

An AI/ML course (EPGPMLAI-style), currently covering: probability recap,
Bayes' theorem, random variables, probability distributions, expected
value, the binomial and cumulative distributions, and continuous
distributions (PDFs, uniform, normal, standard normal), split across
three "sections" (Foundations of Probability; Discrete Probability
Distributions; Continuous Probability Distributions), plus a
"Resources" section for external tools. Each chapter is one standalone
HTML file, served through a login-gated portal.

## Non-negotiable writing rules

1. **Simple, plain English.** Short sentences. Explain any technical term
   the first time it's used. Write for someone learning the concept for
   the first time, not someone confirming what they already know.
2. **No em dashes, anywhere.** Use a comma, a period, or a colon instead.
3. **Every number must show where it came from.** Never state a
   computed value without showing the arithmetic that produced it, even
   if it seems obvious. A reader should never wonder "wait, where did
   that number come from?"
4. **Verify all math independently before writing it down** (mentally
   redo the arithmetic, or actually run it in a calculator/script if
   available). Wrong arithmetic in a course's lesson notes is a serious
   error, not a typo.
5. **Cross-reference by name, not vaguely.** "Recall from Chapter 4,
   Random Variables, in the 'The bag of balls game' section" — not "as we
   saw earlier."
6. Every worked example follows: **scenario stated -> reasoning shown ->
   arithmetic shown -> result highlighted -> plain-language interpretation
   of what the result means.**

## The complete file template

Every chapter is a full standalone HTML document. Copy this as the
starting point; keep every class name and CSS variable exactly as shown
-- an automated system on the other end depends on these exact names to
apply a watermark, dark mode, quizzes, and more automatically (details
at the end of this document; you don't need to build any of that, just
don't rename these classes).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chapter Title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#FAF7F2;
    --paper-dim:#F1ECE2;
    --ink:#1E1B16;
    --ink-soft:#5B5548;
    --navy:#1F2A44;
    --navy-soft:#2C3A5C;
    --brass:#A9793D;
    --rule:#D9D2C3;
    --serif:'Spectral', Georgia, serif;
    --sans:'IBM Plex Sans', -apple-system, sans-serif;
    --mono:'IBM Plex Mono', monospace;
  }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--paper); color:var(--ink); font-family:var(--sans); line-height:1.6; }
  main{ max-width:680px; margin:0 auto; padding:3.6rem 1.6rem 5rem; }
  .eyebrow{ font-family:var(--mono); font-size:.7rem; color:var(--brass); letter-spacing:.03em; margin:0 0 .6rem; }
  h1{ font-family:var(--serif); font-weight:500; font-size:2.1rem; margin:0 0 .3rem; }
  .sub{ color:var(--ink-soft); font-size:.95rem; margin:0 0 2.2rem; padding-bottom:1.6rem; border-bottom:1px solid var(--rule); }
  h2{ font-family:var(--sans); font-weight:600; font-size:.95rem; color:var(--navy-soft); margin:2.1rem 0 .6rem; }
  h2:first-of-type{ margin-top:0; }
  p{ margin:.5rem 0; }
  ul{ margin:.5rem 0; padding-left:1.2rem; }
  li{ margin:.3rem 0; }
  b{ color:var(--ink); }
  a{ color:var(--navy-soft); }

  .ex{ background:var(--paper-dim); border:1px solid var(--rule); border-radius:2px; padding:.8rem 1rem; margin:.7rem 0; }
  .ex .q{ font-weight:600; font-size:.9rem; }
  .ex .a{ font-size:.88rem; color:var(--ink-soft); margin-top:.2rem; }

  .formula{ background:var(--paper-dim); border:1px solid var(--rule); border-radius:2px; padding:.9rem 1.1rem; margin:.9rem 0; font-family:var(--mono); font-size:.95rem; text-align:center; }

  .calc{ display:flex; align-items:center; flex-wrap:wrap; gap:.55rem; font-family:var(--mono); font-size:.92rem; color:var(--ink); background:var(--paper); border:1px solid var(--rule); border-radius:2px; padding:.6rem .8rem; margin:.55rem 0 .1rem; }
  .calc .eq{ color:var(--ink-soft); }
  .calc .result{ color:var(--brass); font-weight:600; }

  table.prob-table{ border-collapse:collapse; width:100%; margin:.9rem 0 1.3rem; font-family:var(--mono); font-size:.85rem; }
  table.prob-table th, table.prob-table td{ border:1px solid var(--rule); padding:.55rem .8rem; text-align:center; }
  table.prob-table thead th{ background:var(--paper-dim); color:var(--navy-soft); font-weight:600; }
  table.prob-table th[scope="row"]{ background:var(--paper-dim); color:var(--navy-soft); font-weight:600; text-align:center; }
  table.prob-table .tot{ color:var(--brass); font-weight:600; }

  .chart-wrap{ margin:1.1rem 0 .3rem; }
  .chart-svg{ width:100%; height:auto; display:block; }
  .chart-axis-label{ text-align:center; font-size:.8rem; color:var(--ink-soft); margin-top:.5rem; }
  .fig-label{ font-family:var(--mono); color:var(--brass); }

  .fig-img{ width:100%; height:auto; display:block; border-radius:2px; border:1px solid var(--rule); }

  .note-box{ background:var(--paper-dim); border:1px solid var(--rule); border-radius:2px; padding:.9rem 1.1rem; margin:.9rem 0; font-size:.88rem; color:var(--ink-soft); }
  .note-box b{ color:var(--ink); }

  footer{ max-width:680px; margin:0 auto; padding:0 1.6rem 3rem; font-size:.76rem; color:var(--ink-soft); }
</style>
</head>
<body>
<main>

  <p class="eyebrow">CHAPTER N &middot; LESSON NOTES</p>
  <h1>Chapter Title</h1>
  <p class="sub">One-sentence summary of what this chapter covers.</p>

  <h2>First section heading</h2>
  <p>Plain-English explanation...</p>

  <div class="ex">
    <p class="q">The question/scenario, stated plainly.</p>
    <p class="a">The reasoning and answer, in plain language.</p>
  </div>

  <div class="calc">
    <span>0.6 &times; 0.4</span><span class="eq">=</span><span class="result">0.24</span>
  </div>

</main>
<footer>Notes by @Ankit Surana</footer>
</body>
</html>
```

## Worked-example pattern (`.ex` blocks)

Every `.ex` block starts with exactly one `<p class="q">` (the question),
followed by whatever mix of `<p class="a">` and `.calc`/`.formula` blocks
is needed for the reasoning and answer. This exact structure matters: an
automated feature on the far end turns every `.ex` block into an
interactive quiz by hiding everything after the `.q` behind a "Show
answer" button, it works generically off this structure, so don't
restructure it (e.g., don't put the question inside a `.calc`, don't skip
the `.q` class).

## Cross-references to other chapters

When referencing another chapter's specific section by name (which you
should do, per the writing rules above), make it a real link:

1. The **target** section's heading needs an `id`:
   ```html
   <h2 id="addition-rule">Addition rule (for "OR")</h2>
   ```
2. The **referencing** sentence wraps the named section in a link:
   ```html
   <a class="chapter-ref-link" onclick="parent.navigateToReference('s1','02','addition-rule')" href="javascript:void(0)">"Addition rule" section</a>
   ```
   The three arguments are the target's section id, chapter id, and
   anchor id, ask whoever is integrating this chapter for the exact ids
   used in their `chapters.json`, since those are specific to how the
   site is organized, not something inferable from this document alone.
   If you don't know the target ids, leave the reference as plain text
   rather than guessing, a wrong id silently fails to navigate rather
   than erroring, which is worse than no link at all.

## Figures: SVG diagrams and images

**Inline SVG** (for charts, diagrams you're constructing): wrap in
`<div class="chart-wrap">`, give the `<svg>` the class `chart-svg`
(this is what makes it scale responsively), and follow it with a
`<p class="chart-axis-label"><span class="fig-label">Figure N.</span>
caption text</p>`. Reference the figure in the prose right before it
("...shown in Figure 2 below:").

**Photos or externally-supplied images**: use
`<img class="fig-img" src="/content-assets/filename.png" alt="...">`
with the same figure-label caption pattern. The exact serving mechanism
for `/content-assets/` is specific to the site this gets deployed into,
if you're handed this document standalone, just use that path convention
and let the integrator confirm the file actually exists at that path.

## What NOT to worry about

The site this chapter gets dropped into already handles all of the
following automatically, applied to any chapter file with no extra work
from you: a watermark, dark-mode color swapping (as long as you use the
CSS variables above and never a hardcoded hex color for anything
text/background-related), a reading-time estimate, a scroll-progress bar,
right-click/print blocking, and the quiz behavior described above. Don't
add any code for these, just write the chapter content itself.

## Self-check before calling a chapter done

- [ ] Every number/formula independently verified, not just eyeballed
- [ ] Every number's origin is shown, nothing appears out of nowhere
- [ ] No em dashes anywhere
- [ ] Every technical term explained on first use
- [ ] Every `.ex` block has exactly one `.q` as its first meaningful child
- [ ] Cross-references use the real target ids, or are left as plain text
      if the ids aren't known
