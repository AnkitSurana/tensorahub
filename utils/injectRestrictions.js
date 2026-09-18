// utils/injectRestrictions.js
//
// Takes a chapter's raw HTML and a user, and returns the HTML with:
//   1. A repeating, semi-transparent watermark (name + timestamp) across the page
//   2. Right-click, text-selection, and print blocked
//
// IMPORTANT HONESTY NOTE (leave this comment in for future-you):
// None of this actually prevents screenshots, screen recording, or a
// determined person opening devtools and reading the raw HTML. It raises
// friction for casual copying and makes any leak traceable via the
// watermark. That is the realistic ceiling for a website (see the chat
// history this was designed from). Don't oversell it to yourself later.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectRestrictions(html, { displayName, username }) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const label = escapeHtml(`${displayName} (${username}) \u2022 ${stamp}`);

  // Runs as early as possible (right after <head> opens, before the
  // chapter's own CSS even loads) so a returning student's saved dark-mode
  // and font-size choices apply before first paint -- no flash of the
  // wrong theme or size. Same localStorage keys as the parent shell
  // (public/shell.js), readable here because everything is same-origin.
  const earlyThemeScript = `<script>(function(){try{if(localStorage.getItem('portal_theme')==='dark'){document.documentElement.classList.add('dark');}var fs=localStorage.getItem('portal_font_scale');if(fs){document.documentElement.style.fontSize=fs+'%';}}catch(e){}})();</script>`;

  const styleBlock = `
<style id="__portal_injected_style">
  html, body { -webkit-user-select: none; user-select: none; }
  /* Mobile browsers show their own translucent tap-highlight overlay on
     any tappable element by default -- separate from :focus-visible, and
     this document (the chapter itself) is a completely separate iframe
     from the parent shell, so nothing in shell.css reaches it. The quiz
     reveal button, jump-to-top, font controls, and reference links all
     already have their own tap/hover feedback, so the native overlay is
     redundant on top of it. */
  * { -webkit-tap-highlight-color: transparent; }

  /*
    Dark mode overrides -- same variable names the chapter's own <style>
    already defines on :root, so every existing rule that reads
    var(--paper)/var(--ink)/etc. repaints automatically once this class is
    present. html.dark has higher specificity than :root (same element,
    :root plus a class), so this wins regardless of source order.
  */
  html.dark{
    --paper:#17191C;
    --paper-dim:#202226;
    --ink:#EDEAE3;
    --ink-soft:#A6A29A;
    --rule:#33353A;
    --navy-soft:#89A0D6;
    --brass:#C99A5B;
  }
  body { transition: background-color 220ms ease-out, color 220ms ease-out; }

  /*
    Diagonal tiled watermarks need the WHOLE block of text rotated as one
    rigid unit, not each line rotated independently -- rotating each row
    on its own causes rows to drift apart unevenly and look patchy/broken
    instead of a clean, evenly-spaced diagonal tile. The fix: one oversized
    container (bigger than the viewport so corners stay covered after the
    rotation), rotated once, with the rows stacked inside it.
  */
  #__portal_watermark {
    position: fixed;
    top: -60%; left: -60%;
    width: 220%; height: 220%;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 0.045;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #__portal_watermark .rows{
    transform: rotate(-28deg);
    display: flex;
    flex-direction: column;
    gap: 90px;
  }
  #__portal_watermark .row {
    white-space: nowrap;
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 12px;
    color: #1F2A44;
    text-align: center;
  }
  /*
    The watermark's dark-navy color was only ever tuned against the light
    --paper background. Against dark mode's near-black background, that
    same color at 4.5% opacity is nearly indistinguishable from the
    background (computed: ~2-point difference, effectively invisible) --
    swapping to a light color here restores the same visible contrast the
    light-mode version has, at the same opacity.
  */
  html.dark #__portal_watermark .row {
    color: #EDEAE3;
  }

  @media print {
    body * { display: none !important; }
    body::after {
      content: "Printing is disabled for this content.";
      display: block !important;
      padding: 4rem;
      font-family: sans-serif;
      font-size: 1.2rem;
    }
  }

  /*
    Every chapter's own <style> fixes the reading column at max-width:680px.
    On anything wider than a laptop, that leaves a lot of empty margin on
    both sides for no real readability benefit -- widened it a bit.
    Applies at all screen sizes (not just the mobile query below); on an
    actual phone the viewport itself is already narrower than this, so it
    has no visible effect there regardless.
  */
  main, footer { max-width: 760px !important; }

  /*
    Chapter content itself had zero responsive adjustment -- every chapter's
    own <style> uses fixed rem sizing tuned for a desktop-width reading
    column, with no @media query anywhere. This is injected centrally
    (rather than edited into all 10+ chapter files) so it applies
    uniformly and automatically to any chapter added later too. Only
    overrides the specific properties that need to shrink -- everything
    else (colors, max-width, margins) keeps whatever the chapter's own
    <head> styles already set, since CSS only overrides per-property, not
    per-selector-block.
  */
  @media (max-width: 600px) {
    main { padding: 2rem 1.1rem 3rem !important; }
    h1 { font-size: 1.55rem !important; }
    .sub { font-size: .88rem !important; padding-bottom: 1.2rem !important; margin-bottom: 1.5rem !important; }
    h2 { font-size: .88rem !important; margin: 1.6rem 0 .5rem !important; }
    .ex { padding: .65rem .8rem !important; }
    .formula, .calc { padding: .5rem .65rem !important; font-size: .82rem !important; }

    /* Watermark row spacing was tuned for a desktop-sized viewport --
       on a phone-sized one the same fixed pixel gap reads far denser
       relative to the smaller screen. Scale both down proportionally. */
    #__portal_watermark .rows { gap: 55px; }
    #__portal_watermark .row { font-size: 9px; }
  }

  /*
    Cross-reference highlight: when a link from another chapter sends you
    here at a specific section (via a URL like #some-section), this class
    gets added briefly so it's obvious which part was being referred to.
    A soft background fade, not a jarring flash -- see the shell's
    --ease-out curve for the same "spring, not a snap" philosophy.
  */
  .__ref_highlight{
    animation: __ref_fade 2.4s ease-out;
    border-radius: 8px;
  }
  @keyframes __ref_fade{
    0%   { background-color: rgba(169,121,61,0.22); }
    100% { background-color: rgba(169,121,61,0); }
  }

  /* Small, light reading-time line beneath the chapter heading. */
  .__reading_time{
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    font-size: .78rem;
    color: #8A8478;
    margin: -.4rem 0 1.4rem;
  }

  /* Thin scroll-progress bar, fixed to the top of the chapter viewport. */
  #__portal_progress_track{
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: rgba(0,0,0,.06);
    z-index: 2147483646;
  }
  #__portal_progress_fill{
    height: 100%;
    width: 0%;
    background: #A9793D;
    transition: width 80ms linear;
  }

  /* Font-size control: two small buttons, fixed bottom-left, out of the
     way of the actual reading content. */
  #__portal_font_controls{
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 2147483645;
    display: flex;
    gap: .3rem;
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(0,0,0,.08);
    border-radius: 10px;
    padding: .3rem;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
  }
  html.dark #__portal_font_controls{
    background: rgba(32,34,38,.92);
    border-color: rgba(255,255,255,.1);
  }
  .__font_btn{
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: rgba(0,0,0,.05);
    color: inherit;
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 150ms ease-out, transform 150ms ease-out;
  }
  html.dark .__font_btn{ background: rgba(255,255,255,.08); }
  .__font_btn:hover{ background: rgba(0,0,0,.09); }
  html.dark .__font_btn:hover{ background: rgba(255,255,255,.14); }
  .__font_btn:active{ transform: scale(0.9); }
  .__font_btn:first-child{ font-size: 12px; }
  .__font_btn:last-child{ font-size: 16px; }

  /* Jump-to-top button: hidden until scrolled down, fades in. */
  #__portal_jump_top{
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 2147483645;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: #A9793D;
    color: #fff;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
    box-shadow: 0 4px 12px rgba(0,0,0,.18);
    transition: opacity 200ms ease-out, transform 200ms ease-out;
  }
  #__portal_jump_top.__visible{
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
  #__portal_jump_top:active{ transform: scale(0.9); }

  /*
    Active-recall quizzes: every existing worked example (.ex, already
    throughout every chapter as .q question + .a/.calc answer content)
    gets its answer hidden behind a "Show answer" button by default, so
    reading a chapter becomes attempt-then-check instead of just reading
    the answer immediately. No chapter file needed editing for this --
    the script below finds every .ex block generically.
  */

  .__quiz_reveal_btn{
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    margin: .3rem 0 .6rem;
    padding: .4rem .8rem;
    border: 1px solid rgba(169,121,61,.35);
    border-radius: 8px;
    background: rgba(169,121,61,.08);
    color: #A9793D;
    font-size: .82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 180ms ease-out, transform 150ms ease-out;
  }
  .__quiz_reveal_btn:hover{ background: rgba(169,121,61,.15); }
  .__quiz_reveal_btn:active{ transform: scale(0.97); }
  .__quiz_answer{
    overflow: hidden;
    max-height: 0;
    margin-top: 0;
    opacity: 0;
    transition: max-height 320ms ease-out, opacity 220ms ease-out, margin-top 320ms ease-out;
  }
  .__quiz_answer.__quiz_revealed{
    max-height: 2000px;
    margin-top: .3rem;
    opacity: 1;
  }

  /*
    Cross-reference links: "Recall from Chapter X... in the 'Y' section"
    style phrases become clickable, jumping straight to that section in
    the target chapter and highlighting it there (see .__ref_highlight
    above and the script below). Styled as an underlined, brass-colored
    inline link, not a button, since it sits inside a sentence.
  */
  .chapter-ref-link{
    color: #A9793D;
    text-decoration: underline;
    text-decoration-color: rgba(169,121,61,.45);
    text-underline-offset: 2px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    transition: color 180ms ease-out, text-decoration-color 180ms ease-out;
  }
  .chapter-ref-link:hover{
    color: #8A5F2C;
    text-decoration-color: rgba(138,95,44,.75);
  }
</style>`;

  // Build enough repeated rows/columns to tile the watermark across the
  // oversized rotated container without generating an excessive DOM. Kept
  // sparse and low-contrast on purpose -- this only needs to be legible
  // enough to trace a leaked screenshot back to an account, not visible
  // enough to interfere with actually reading the page.
  const rows = Array.from({ length: 14 })
    .map(() => `<div class="row">${(label + '          ').repeat(5)}</div>`)
    .join('');

  const watermarkBlock = `<div id="__portal_watermark" aria-hidden="true"><div class="rows">${rows}</div></div>`;
  const progressBarBlock = `<div id="__portal_progress_track" aria-hidden="true"><div id="__portal_progress_fill"></div></div>`;
  const jumpTopBlock = `<button type="button" id="__portal_jump_top" title="Back to top" aria-label="Back to top">&#8593;</button>`;
  const fontControlsBlock = `<div id="__portal_font_controls"><button type="button" class="__font_btn" id="__portal_font_dec" title="Decrease text size" aria-label="Decrease text size">A</button><button type="button" class="__font_btn" id="__portal_font_inc" title="Increase text size" aria-label="Increase text size">A</button></div>`;

  const scriptBlock = `
<script id="__portal_injected_script">
  (function () {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
      var k = e.key ? e.key.toLowerCase() : '';
      // Block common "save / print / view-source / devtools" shortcuts.
      // (A determined person can still get around this -- see note in
      // injectRestrictions.js -- this is a speed bump, not a wall.)
      if (e.key === 'F12') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && ['p','s','u'].includes(k)) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','j','c'].includes(k)) e.preventDefault();
    });
    window.addEventListener('beforeprint', function (e) {
      // CSS above already blanks the page for print; this is a belt-and-braces
      // spot to add analytics/logging later if you want to know it was tried.
    });

    // Cross-reference highlight: if this page was opened at a specific
    // section (e.g. /content/s1/02#addition-rule), scroll to it and give
    // it a brief highlight so it's clear what the link was pointing at.
    function highlightReferencedSection() {
      var hash = window.location.hash ? window.location.hash.slice(1) : '';
      if (!hash) return;
      var target = document.getElementById(hash);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.remove('__ref_highlight');
      // Force a reflow so re-triggering the animation on the same target
      // (e.g. clicking the same reference link twice) actually replays it.
      void target.offsetWidth;
      target.classList.add('__ref_highlight');
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      highlightReferencedSection();
    } else {
      document.addEventListener('DOMContentLoaded', highlightReferencedSection);
    }
    // Also handle the case where the SAME chapter is already loaded and a
    // reference link changes only the hash (no full navigation happens).
    window.addEventListener('hashchange', highlightReferencedSection);

    // Scroll progress bar: a plain scroll listener updating one element's
    // width is cheap (no layout thrashing -- reading scrollTop/scrollHeight
    // and writing a width are both fast), so this runs on every scroll
    // event without needing to throttle it.
    //
    // This also drives the sidebar checkmark: once scroll crosses ~90%
    // (or the chapter is short enough to fit on screen with nothing to
    // scroll at all), it tells the parent shell this chapter has actually
    // been read, not merely opened. sectionId/chapterId come straight from
    // this page's own URL (/content/:sectionId/:chapterId), no need to
    // pass them in separately.
    var __progressFill = document.getElementById('__portal_progress_fill');
    var __markedRead = false;
    var __pathParts = window.location.pathname.split('/').filter(Boolean); // ['content', sectionId, chapterId]

    function __maybeMarkRead(pct) {
      if (__markedRead) return;
      if (pct < 90) return;
      if (__pathParts.length < 3 || __pathParts[0] !== 'content') return;
      try {
        if (parent && typeof parent.markChapterRead === 'function') {
          parent.markChapterRead(__pathParts[1], __pathParts[2]);
          __markedRead = true; // only latch once the call actually went through --
                                // if parent isn't ready yet, a later scroll event gets another try
        }
      } catch (e) {} // cross-origin or parent not ready -- harmless, just no checkmark this time
    }

    function updateProgressBar() {
      if (!__progressFill) return;
      var scrollableHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = scrollableHeight > 0
        ? Math.min(100, Math.max(0, (document.documentElement.scrollTop / scrollableHeight) * 100))
        : 100; // nothing to scroll -- the whole chapter is already on screen, count it as fully seen
      __progressFill.style.width = pct + '%';
      __maybeMarkRead(pct);
      if (__jumpTopBtn) {
        __jumpTopBtn.classList.toggle('__visible', document.documentElement.scrollTop > 400);
      }
    }
    window.addEventListener('scroll', updateProgressBar, { passive: true });
    updateProgressBar();

    // Jump to top.
    var __jumpTopBtn = document.getElementById('__portal_jump_top');
    if (__jumpTopBtn) {
      __jumpTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Font-size control: a shared localStorage key so the choice carries
    // across every chapter, not just this one. Since every chapter's own
    // CSS is written in rem units throughout, scaling the ROOT font-size
    // scales the whole page proportionally -- no per-element overrides
    // needed anywhere.
    var FONT_SCALE_KEY = 'portal_font_scale';
    var FONT_MIN = 85, FONT_MAX = 130, FONT_STEP = 10;
    function getFontScale() {
      try {
        var saved = parseInt(localStorage.getItem(FONT_SCALE_KEY), 10);
        return isNaN(saved) ? 100 : Math.min(FONT_MAX, Math.max(FONT_MIN, saved));
      } catch (e) { return 100; }
    }
    function applyFontScale(scale) {
      document.documentElement.style.fontSize = scale + '%';
    }
    applyFontScale(getFontScale());

    var __fontDec = document.getElementById('__portal_font_dec');
    var __fontInc = document.getElementById('__portal_font_inc');
    function adjustFontScale(delta) {
      var next = Math.min(FONT_MAX, Math.max(FONT_MIN, getFontScale() + delta));
      applyFontScale(next);
      try { localStorage.setItem(FONT_SCALE_KEY, String(next)); } catch (e) {}
    }
    if (__fontDec) __fontDec.addEventListener('click', function () { adjustFontScale(-FONT_STEP); });
    if (__fontInc) __fontInc.addEventListener('click', function () { adjustFontScale(FONT_STEP); });

    // Active-recall quizzes: turn every existing worked example into
    // "attempt first, then check" by hiding everything in a .ex block
    // that comes after its question (.q) behind a reveal button. Runs
    // generically over whatever .ex blocks exist on the page -- no
    // chapter file needs to know this feature exists.
    //
    // IMPORTANT: the hidden content gets moved into ONE wrapper div, not
    // just given a class individually. This matters because max-height:0
    // collapses an element's own box, but never its MARGIN -- margin
    // lives outside the box and isn't affected by height constraints on
    // the element itself. With several separately-hidden elements (some
    // worked examples have many .calc/.a blocks), their margins would
    // still stack up and leave a visible empty gap even while "hidden".
    // A single wrapper with overflow:hidden establishes a block
    // formatting context, which per the CSS spec prevents child margins
    // from collapsing through it -- so the wrapper's own collapsed
    // height genuinely goes to zero, children's margins and all.
    function setupQuizReveals() {
      var examples = document.querySelectorAll('.ex');
      examples.forEach(function (ex) {
        var children = Array.prototype.slice.call(ex.children);
        var qIndex = children.findIndex(function (el) { return el.classList.contains('q'); });
        if (qIndex === -1) return; // no question found -- leave this block alone entirely

        var answerEls = children.slice(qIndex + 1);
        if (answerEls.length === 0) return; // nothing after the question to hide

        var wrap = document.createElement('div');
        wrap.className = '__quiz_answer';
        answerEls.forEach(function (el) { wrap.appendChild(el); }); // moves each node into wrap, in order

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = '__quiz_reveal_btn';
        btn.textContent = 'Show answer';

        var revealed = false;
        btn.addEventListener('click', function () {
          revealed = !revealed;
          wrap.classList.toggle('__quiz_revealed', revealed);
          btn.textContent = revealed ? 'Hide answer' : 'Show answer';
        });

        children[qIndex].insertAdjacentElement('afterend', btn);
        btn.insertAdjacentElement('afterend', wrap);
      });
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setupQuizReveals();
    } else {
      document.addEventListener('DOMContentLoaded', setupQuizReveals);
    }
  })();
</script>`;

  // Inject style+watermark right after <body ...>, and the script right
  // before </body>. Falls back to appending at the end if tags are missing
  // (some of your chapter files may not have a literal lowercase match).
  let out = html;

  // Insert the early theme-detection script right after <head> opens --
  // this has to happen before the <body> injections below, and before
  // any of the chapter's own CSS, to actually prevent a flash of the
  // wrong theme (see earlyThemeScript's own comment above).
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}\n${earlyThemeScript}`);
  }

  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body[^>]*>/i, (match) => `${match}\n${watermarkBlock}\n${progressBarBlock}\n${fontControlsBlock}\n${jumpTopBlock}\n${styleBlock}`);
  } else {
    out = watermarkBlock + progressBarBlock + fontControlsBlock + jumpTopBlock + styleBlock + out;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
  } else {
    out = out + scriptBlock;
  }

  return out;
}

module.exports = { injectRestrictions };
