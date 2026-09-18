(function () {
  // Renders into any element: logo only, name only, or logo + name,
  // depending on what's set in config.json. Shared by the sidebar here
  // and reused the same way on the login and admin pages.
  function renderBrand(el, cfg) {
    el.innerHTML = '';
    if (cfg.logoUrl) {
      const img = document.createElement('img');
      img.src = cfg.logoUrl;
      img.alt = cfg.appName;
      img.className = 'brand-logo';
      el.appendChild(img);
    }
    if (!cfg.logoUrl || cfg.showNameWithLogo) {
      const span = document.createElement('span');
      span.textContent = cfg.appName;
      el.appendChild(span);
    }
  }

  const listEl = document.getElementById('sidebar-list');
  const frame = document.getElementById('content-frame');
  const emptyState = document.getElementById('empty-state');
  const userNameEl = document.getElementById('user-name');
  const brandEl = document.getElementById('brand');
  const clockEl = document.getElementById('live-clock');
  const themeToggleEl = document.getElementById('theme-toggle');
  const searchInputEl = document.getElementById('search-input');
  const searchResultsEl = document.getElementById('search-results');
  const readProgressEl = document.getElementById('read-progress');
  const notifBellEl = document.getElementById('notif-bell');
  const notifDropdownEl = document.getElementById('notif-dropdown');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // ---- Mobile sidebar (hamburger drawer) ----
  // The open/closed visual effect only exists inside the mobile media
  // query in shell.css, so toggling this class is a no-op on desktop --
  // no need to branch on screen width here.
  function closeMobileSidebar() { document.body.classList.remove('sidebar-open'); }
  function openMobileSidebar() { document.body.classList.add('sidebar-open'); }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  // ---- Dark mode ----
  // Persisted in localStorage under the same key the chapter pages
  // themselves read (see utils/injectRestrictions.js's earlyThemeScript),
  // so toggling here and reloading a chapter both agree on the state.
  const THEME_KEY = 'portal_theme';

  const SUN_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  const MOON_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    if (themeToggleEl) themeToggleEl.innerHTML = isDark ? MOON_ICON : SUN_ICON;
    // Also update the currently loaded chapter immediately, same-origin
    // access, no reload needed -- otherwise the toggle would only visibly
    // affect the sidebar/badge until the next chapter navigation.
    try {
      if (frame.contentDocument && frame.contentDocument.documentElement) {
        frame.contentDocument.documentElement.classList.toggle('dark', isDark);
      }
    } catch (e) {
      // Cross-origin or not-yet-loaded -- harmless, the chapter will pick
      // up the saved preference itself on its own next load regardless.
    }
  }

  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark'; }
    catch (e) { return false; }
  }

  applyTheme(getSavedTheme());

  if (themeToggleEl) {
    themeToggleEl.addEventListener('click', () => {
      const nowDark = !document.documentElement.classList.contains('dark');
      try { localStorage.setItem(THEME_KEY, nowDark ? 'dark' : 'light'); } catch (e) {}
      applyTheme(nowDark);
    });
  }

  // App name/logo come from /api/config -- see config.json to change either.
  // Supports three combinations: name only (default), logo + name, or logo only.
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      document.title = cfg.appName;
      renderBrand(brandEl, cfg);
    })
    .catch(() => {
      brandEl.textContent = '';
    });

  // Display name only -- deliberately never fetches or shows expiry info.
  // is_admin is the one flag we do read: it toggles the "Manage students"
  // link in the top-right badge (server still gates /admin regardless).
  const adminLinkEl = document.getElementById('admin-link');
  fetch('/api/me')
    .then((r) => r.json())
    .then((me) => {
      userNameEl.textContent = 'Welcome, ' + me.display_name;
      if (adminLinkEl && me.is_admin) adminLinkEl.hidden = false;
    })
    .catch(() => {
      userNameEl.textContent = '';
    });

  // ---- Live clock ----
  // A per-second text-node update costs a browser essentially nothing
  // (microseconds, thousands of times a day, no layout thrashing since
  // it's a single text node) -- there's no real performance reason to
  // throttle this, so it updates every second like an actual clock.
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;

    const day = now.getDate();
    const month = MONTH_NAMES[now.getMonth()];
    const year = now.getFullYear();

    clockEl.textContent = day + ' ' + month + ', ' + year + '  ' + h + ':' + m + ' ' + ampm;
  }
  if (clockEl) {
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ---- Chapter progress (visited + last-viewed), stored per-browser ----
  // Deliberately client-side only (localStorage, not the server/database):
  // this is a personal "have I read this" convenience, not part of access
  // control or anything that needs to sync across devices, so it adds zero
  // server load and zero extra requests.
  const PROGRESS_KEY = 'portal_visited_chapters';
  const LAST_VIEWED_KEY = 'portal_last_viewed';

  function getVisited() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function markVisited(sectionId, chapterId) {
    const visited = getVisited();
    visited[sectionId + '/' + chapterId] = true;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(visited)); } catch (e) {}
  }
  function saveLastViewed(sectionId, chapterId) {
    try { localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({ sectionId, chapterId })); } catch (e) {}
  }
  function getLastViewed() {
    try { return JSON.parse(localStorage.getItem(LAST_VIEWED_KEY) || 'null'); }
    catch (e) { return null; }
  }

  // Only one section is expanded at a time (an accordion), and it's always
  // whichever section contains the chapter currently being viewed. This is
  // what "auto-expands based on the chapter in view" means in practice.
  //
  // Note: the actual open/close motion is CSS-only (see shell.css's
  // .sb-section-chapters-wrap), driven purely by toggling this one class.
  // The content stays in the DOM at all times (never `hidden`), which is
  // what lets the grid-template-rows transition animate smoothly instead
  // of snapping instantly.
  function setExpandedSection(sectionEl) {
    document.querySelectorAll('.sb-section').forEach((el) => {
      const isTarget = el === sectionEl;
      el.classList.toggle('expanded', isTarget);
      const header = el.querySelector('.sb-section-header');
      header.setAttribute('aria-expanded', String(isTarget));
    });
  }

  // Maps "sectionId/chapterId" -> { link, sectionEl }, filled in while
  // building the sidebar below. This is what lets a cross-reference link
  // clicked INSIDE a chapter's own content (in the iframe) correctly
  // update the sidebar's active/expanded state from the parent page --
  // see window.navigateToReference further down.
  const chapterIndex = {};

  function loadChapter(sectionId, chapterId, linkEl, sectionEl, anchor) {
    document.querySelectorAll('.sb-chapter').forEach((el) => el.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    if (sectionEl) setExpandedSection(sectionEl);
    closeMobileSidebar(); // no-op on desktop; on mobile, picking a chapter should close the drawer

    const base = '/content/' + encodeURIComponent(sectionId) + '/' + encodeURIComponent(chapterId);
    const target = base + (anchor ? '#' + encodeURIComponent(anchor) : '');

    // Always a full (re)load, deliberately kept simple rather than trying
    // to optimize the "same chapter, different anchor" case with an
    // in-place hash update -- that path depends on cross-document iframe
    // behavior that's inconsistent enough across browsers to not be worth
    // the risk. Chapter files are small, so a full reload here is not a
    // noticeable cost, and this way the exact same code path (and the
    // exact same tests) covers every case, same chapter or not.
    frame.src = target;

    frame.style.display = 'block';
    emptyState.style.display = 'none';

    // Note: this does NOT mark the chapter as visited/read. That now only
    // happens once the student has actually scrolled through most of the
    // chapter (see markChapterRead below, called from the progress-bar
    // script inside the iframe once it crosses ~90%). Opening a chapter
    // isn't the same as reading it.
    saveLastViewed(sectionId, chapterId);
    updateVisitedMarks();
  }

  // Puts a small checkmark next to any chapter link already visited this
  // browser, so returning students can see progress at a glance.
  function updateVisitedMarks() {
    const visited = getVisited();
    const allChapterLinks = document.querySelectorAll('.sb-chapter');
    let readCount = 0;
    allChapterLinks.forEach((el) => {
      const key = el.dataset.sectionId + '/' + el.dataset.chapterId;
      const isVisited = !!visited[key];
      el.classList.toggle('visited', isVisited);
      if (isVisited) readCount++;
    });
    if (readProgressEl && allChapterLinks.length) {
      readProgressEl.textContent = readCount + ' of ' + allChapterLinks.length + ' chapters read';
    }
  }

  // Exposed globally so a same-origin iframe (a chapter's own content) can
  // call it directly, e.g.:
  //   parent.navigateToReference('s1', '02', 'addition-rule')
  // No postMessage plumbing needed since everything here is same-origin.
  window.navigateToReference = function (sectionId, chapterId, anchorId) {
    const entry = chapterIndex[sectionId + '/' + chapterId];
    if (!entry) return; // chapter not visible to this user (hidden/batch-restricted) -- silently do nothing
    loadChapter(sectionId, chapterId, entry.link, entry.sectionEl, anchorId);
  };

  // Called by the progress-bar script inside a chapter's iframe once the
  // student has actually scrolled through most of it (see
  // utils/injectRestrictions.js) -- this is what the checkmark actually
  // reflects, not merely having opened the chapter.
  window.markChapterRead = function (sectionId, chapterId) {
    markVisited(sectionId, chapterId);
    updateVisitedMarks();
  };

  // ---- Search across chapters ----
  // The whole index (title + plain text of every chapter this user can
  // see) is fetched ONCE, up front. Every keystroke after that searches
  // the already-downloaded array in memory -- no per-keystroke network
  // requests, so typing feels instant and adds no server load beyond
  // that one initial fetch.
  let searchIndex = [];
  fetch('/api/search-index')
    .then((r) => r.json())
    .then((data) => { searchIndex = data; })
    .catch(() => { searchIndex = []; });

  function escapeHtmlText(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Builds a short "...text around the match..." snippet with the
  // matched term wrapped in <mark>, so results show WHY they matched,
  // not just that they did.
  function buildSnippet(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 45);
    const end = Math.min(text.length, idx + query.length + 65);
    const before = escapeHtmlText(text.slice(start, idx));
    const matched = escapeHtmlText(text.slice(idx, idx + query.length));
    const after = escapeHtmlText(text.slice(idx + query.length, end));
    return (start > 0 ? '\u2026' : '') + before + '<mark>' + matched + '</mark>' + after + (end < text.length ? '\u2026' : '');
  }

  function runSearch(query) {
    const q = query.trim();
    if (!q) {
      searchResultsEl.hidden = true;
      searchResultsEl.innerHTML = '';
      listEl.style.display = '';
      return;
    }

    listEl.style.display = 'none';
    searchResultsEl.hidden = false;

    const ql = q.toLowerCase();
    const matches = searchIndex.filter((c) =>
      c.title.toLowerCase().includes(ql) || c.text.toLowerCase().includes(ql)
    );

    if (!matches.length) {
      searchResultsEl.innerHTML = '<div class="sr-empty">No chapters match "' + escapeHtmlText(q) + '".</div>';
      return;
    }

    searchResultsEl.innerHTML = '';
    matches.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'sr-result';

      const titleEl = document.createElement('span');
      titleEl.className = 'sr-result-title';
      titleEl.textContent = m.title;
      div.appendChild(titleEl);

      const snippetHtml = m.title.toLowerCase().includes(ql) ? '' : buildSnippet(m.text, q);
      if (snippetHtml) {
        const snippetEl = document.createElement('span');
        snippetEl.className = 'sr-result-snippet';
        snippetEl.innerHTML = snippetHtml;
        div.appendChild(snippetEl);
      }

      div.addEventListener('click', () => {
        const entry = chapterIndex[m.sectionId + '/' + m.chapterId];
        if (entry) loadChapter(m.sectionId, m.chapterId, entry.link, entry.sectionEl);
        searchInputEl.value = '';
        runSearch('');
      });

      searchResultsEl.appendChild(div);
    });
  }

  if (searchInputEl) {
    searchInputEl.addEventListener('input', () => runSearch(searchInputEl.value));
  }

  fetch('/api/manifest')
    .then((r) => r.json())
    .then((sections) => {
      if (!sections.length) {
        listEl.innerHTML = '<div class="empty">No chapters available yet.</div>';
        return;
      }

      listEl.innerHTML = '';
      let firstLink = null;
      let firstIds = null;
      let firstSectionEl = null;
      const flatChapters = []; // in on-screen order, for keyboard next/previous

      sections.forEach((section, index) => {
        const secWrap = document.createElement('div');
        secWrap.className = 'sb-section';

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'sb-section-header';
        header.setAttribute('aria-expanded', 'false');

        const num = document.createElement('span');
        num.className = 'sb-section-num';
        num.textContent = String(index + 1).padStart(2, '0');

        const titleText = document.createElement('span');
        titleText.className = 'sb-section-title-text';
        titleText.textContent = section.title;

        const chevron = document.createElement('span');
        chevron.className = 'sb-chevron';
        chevron.textContent = '\u203A'; // single right-pointing angle quote, rotates via CSS when expanded

        header.appendChild(num);
        header.appendChild(titleText);
        header.appendChild(chevron);

        const wrap = document.createElement('div');
        wrap.className = 'sb-section-chapters-wrap';

        const body = document.createElement('div');
        body.className = 'sb-section-chapters';

        header.addEventListener('click', () => setExpandedSection(secWrap));

        section.chapters.forEach((ch) => {
          const link = document.createElement('a');
          link.className = 'sb-chapter';
          link.dataset.sectionId = section.id;
          link.dataset.chapterId = ch.id;

          const titleSpan = document.createElement('span');
          titleSpan.className = 'sb-chapter-title';
          titleSpan.textContent = ch.title;

          const check = document.createElement('span');
          check.className = 'sb-chapter-check';
          check.textContent = '\u2713';
          check.setAttribute('aria-hidden', 'true');

          link.appendChild(titleSpan);
          link.appendChild(check);
          link.href = 'javascript:void(0)';
          link.addEventListener('click', () => loadChapter(section.id, ch.id, link, secWrap));
          body.appendChild(link);

          chapterIndex[section.id + '/' + ch.id] = { link, sectionEl: secWrap };
          flatChapters.push({ sectionId: section.id, chapterId: ch.id, link, sectionEl: secWrap });

          if (!firstLink) {
            firstLink = link;
            firstIds = [section.id, ch.id];
            firstSectionEl = secWrap;
          }
        });

        wrap.appendChild(body);
        secWrap.appendChild(header);
        secWrap.appendChild(wrap);
        listEl.appendChild(secWrap);
      });

      updateVisitedMarks();

      // Continue where you left off: if this browser has a remembered
      // chapter AND it's still visible to this user (not hidden/removed
      // since their last visit), open that one instead of always the
      // first chapter. Falls back to the first chapter otherwise.
      const lastViewed = getLastViewed();
      const lastEntry = lastViewed && chapterIndex[lastViewed.sectionId + '/' + lastViewed.chapterId];

      if (lastEntry) {
        loadChapter(lastViewed.sectionId, lastViewed.chapterId, lastEntry.link, lastEntry.sectionEl);
      } else if (firstLink && firstIds) {
        loadChapter(firstIds[0], firstIds[1], firstLink, firstSectionEl);
      }

      setupKeyboardNav(flatChapters);
      setupNotificationBell(sections, flatChapters);
    })
    .catch(() => {
      listEl.innerHTML = '<div class="empty">Could not load chapters. Try refreshing.</div>';
    });

  // ---- Keyboard navigation ----
  // Right/Down/J moves to the next chapter, Left/Up/K to the previous one,
  // in the same on-screen order as the sidebar. Ignored while typing in
  // the search box (or any input) so it doesn't hijack normal typing.
  function setupKeyboardNav(flatChapters) {
    document.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const activeLink = document.querySelector('.sb-chapter.active');
      const currentIndex = flatChapters.findIndex((c) => c.link === activeLink);
      if (currentIndex === -1) return;

      let nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        nextIndex = Math.min(flatChapters.length - 1, currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        nextIndex = Math.max(0, currentIndex - 1);
      } else {
        return;
      }
      if (nextIndex === currentIndex) return;

      e.preventDefault();
      const target = flatChapters[nextIndex];
      loadChapter(target.sectionId, target.chapterId, target.link, target.sectionEl);
    });
  }

  // ---- "What's new" bell ----
  // Entirely client-side: diffs the chapter list this user can currently
  // see (from /api/manifest, already being fetched anyway) against the
  // list saved in localStorage from their last visit. No server changes,
  // no new endpoint -- the manifest already has everything needed.
  const KNOWN_CHAPTERS_KEY = 'portal_known_chapters';

  function setupNotificationBell(sections, flatChapters) {
    if (!notifBellEl || !notifDropdownEl) return;

    const currentKeys = flatChapters.map((c) => c.sectionId + '/' + c.chapterId);
    const titleByKey = {};
    flatChapters.forEach((c) => { titleByKey[c.sectionId + '/' + c.chapterId] = c.link.querySelector('.sb-chapter-title').textContent; });

    let known;
    try { known = JSON.parse(localStorage.getItem(KNOWN_CHAPTERS_KEY) || 'null'); } catch (e) { known = null; }

    if (known === null) {
      // First-ever visit to this browser -- nothing to compare against,
      // so just record the baseline silently rather than "discovering"
      // every existing chapter as if it were new.
      try { localStorage.setItem(KNOWN_CHAPTERS_KEY, JSON.stringify(currentKeys)); } catch (e) {}
      known = currentKeys;
    }

    const newKeys = currentKeys.filter((k) => !known.includes(k));
    if (newKeys.length > 0) notifBellEl.classList.add('__has-news');

    // Renders the dropdown's contents fresh each time it's opened -- either
    // the list of what's new, or an explicit "nothing new" message. The
    // bell is always clickable and always shows SOMETHING, whether or not
    // there happens to be news right now.
    function renderDropdown() {
      notifDropdownEl.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'nd-title';
      title.textContent = newKeys.length > 0 ? 'New since your last visit' : "What's new";
      notifDropdownEl.appendChild(title);

      if (newKeys.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'nd-empty';
        empty.textContent = 'No new updates for now.';
        notifDropdownEl.appendChild(empty);
        return;
      }

      newKeys.forEach((key) => {
        const [sectionId, chapterId] = key.split('/');
        const item = document.createElement('a');
        item.className = 'nd-item';
        item.href = 'javascript:void(0)';
        item.textContent = titleByKey[key] || key;
        item.addEventListener('click', () => {
          const entry = chapterIndex[key];
          if (entry) loadChapter(sectionId, chapterId, entry.link, entry.sectionEl);
          notifDropdownEl.hidden = true;
        });
        notifDropdownEl.appendChild(item);
      });
    }

    notifBellEl.addEventListener('click', () => {
      notifBellEl.classList.remove('__has-news');
      try { localStorage.setItem(KNOWN_CHAPTERS_KEY, JSON.stringify(currentKeys)); } catch (e) {}
      renderDropdown();
      notifDropdownEl.hidden = !notifDropdownEl.hidden;
    });

    // Clicking anywhere else closes the dropdown.
    document.addEventListener('click', (e) => {
      if (!notifDropdownEl.hidden && !e.target.closest('#notif-bell-wrap')) {
        notifDropdownEl.hidden = true;
      }
    });
  }
})();
