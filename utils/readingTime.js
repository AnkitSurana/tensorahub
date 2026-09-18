// utils/readingTime.js
//
// Computes a rough "~N min read" estimate from a chapter's actual text
// content, and injects it as a small, light line right after the
// chapter's subtitle (the <p class="sub">...</p> that already exists in
// every chapter). Runs server-side, once per request, on the raw HTML --
// no chapter file needs to be edited by hand, and a newly added chapter
// gets this automatically for free.

const WORDS_PER_MINUTE = 200; // a commonly used average adult reading speed

// Shared by search-index building too (routes/chapters.js) -- one place
// that knows how to turn a chapter's raw HTML into plain readable text.
function extractPlainText(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const scope = mainMatch ? mainMatch[1] : html;

  return scope
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')       // strip remaining tags
    .replace(/&[a-z#0-9]+;/gi, ' ') // strip HTML entities (&minus; etc.) so they don't get counted/matched as words
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadingTime(html) {
  const textOnly = extractPlainText(html);
  const wordCount = textOnly ? textOnly.split(' ').length : 0;
  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  return { wordCount, minutes };
}

function injectReadingTime(html) {
  const { minutes } = estimateReadingTime(html);
  const line = `<p class="__reading_time">${minutes} min read</p>`;

  // Insert right after the subtitle paragraph if present, otherwise right
  // after the <h1>, otherwise leave the page untouched (better to skip
  // this cosmetic addition than to risk mangling an unexpected layout).
  if (/<p class="sub">[\s\S]*?<\/p>/i.test(html)) {
    return html.replace(/(<p class="sub">[\s\S]*?<\/p>)/i, `$1\n  ${line}`);
  }
  if (/<h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
    return html.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/i, `$1\n  ${line}`);
  }
  return html;
}

module.exports = { estimateReadingTime, injectReadingTime, extractPlainText };
