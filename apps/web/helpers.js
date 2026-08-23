function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// escapeHtml alone isn't safe inside a quoted attribute — the
// textContent/innerHTML round-trip encodes <, >, and & but not double
// quotes, so a `"` in the source string could still break out of the
// attribute. Used for anything placed inside a quoted HTML attribute
// (href, src, aria-label, data-*), never for plain text content.
function escapeAttr(str) {
  return escapeHtml(str ?? "").replaceAll('"', "&quot;");
}

// Shared, reference-counted body-scroll lock. The sidebar drawer
// (initSidebarDrawer, below) and the video modal (player.js) each need to
// lock scroll independently, and they can be open at the same time — a
// minimized video floats above everything (z-index 200) and stays
// clickable even while the drawer (z-index 30) is open behind it. Two
// separate unconditional `overflow = "hidden"` / `overflow = ""` writers
// would let whichever one closes last clobber the other's still-active
// lock (e.g. closing the video while the drawer is still open would
// silently unlock page scroll). Exposed on window since player.js loads
// after this file and has no other way to share this state with it.
let scrollLockCount = 0;
window.AnchorScrollLock = {
  lock() {
    scrollLockCount++;
    document.body.style.overflow = "hidden";
  },
  unlock() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = "";
  },
};

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatViews(count) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(count);
}

// Minute granularity — rounding straight to hours would show "0h ago"
// for anything under 30 minutes old, which is most of what shows up here
// given how often these sections refresh.
function formatMinutesAgo(timestampMs) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestampMs) / (1000 * 60)));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function renderVideoSkeletons(count) {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="video">
        <div class="thumb skeleton"></div>
        <div class="video-body">
          <div class="skeleton line" style="width: 92%"></div>
          <div class="skeleton line" style="width: 55%; margin-top: 0.6rem;"></div>
        </div>
      </div>
    `
    )
    .join("");
}

function renderCourseSkeletons(count) {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="course-card">
        <div class="skeleton line" style="width: 65%; height: 1.05rem;"></div>
        <div class="skeleton line" style="width: 100%; margin-top: 0.65rem;"></div>
        <div class="skeleton line" style="width: 80%; margin-top: 0.4rem; margin-bottom: 0.75rem;"></div>
        <div class="skeleton line" style="width: 40%;"></div>
      </div>
    `
    )
    .join("");
}

// Handles a click on a .viewed-badge (unmark) or the grid card's "more
// options" menu, before falling through to AnchorPlayer.openFromThumb
// (player.js). .viewed-badge sits next to .thumb rather than inside it —
// .thumb is itself a <button>, and buttons can't nest — so this dispatcher
// is what makes it clickable without needing a second, separately-bound
// listener juggling stopPropagation against the thumb's own click.
function onThumbGridClick(event) {
  const menuBtn = event.target.closest(".card-menu-btn");
  if (menuBtn) {
    event.stopPropagation();
    return toggleCardMenu(menuBtn);
  }
  const menuItem = event.target.closest(".card-menu .menu-item");
  if (menuItem) {
    event.stopPropagation();
    return handleCardMenuAction(menuItem);
  }
  const viewedBadge = event.target.closest(".viewed-badge");
  if (viewedBadge) return unmarkViewed(viewedBadge);
  window.AnchorPlayer?.openFromThumb(event, event.currentTarget);
}

function renderViewedBadge(videoId) {
  return `<button class="viewed-badge" type="button" data-video-id="${escapeAttr(videoId)}" aria-label="Mark as not viewed">
    <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
  </button>`;
}

// The grid card's "more options" button + dropdown (mirrors the video
// modal's quick actions, but as a menu since a card has less room). Starts
// hidden — revealCardMenus un-hides it once sign-in is confirmed, same
// sign-in-optional principle as the badges above.
function renderCardMenu(videoId) {
  return `
    <div class="card-menu-wrap">
      <button class="card-menu-btn" type="button" data-video-id="${escapeAttr(videoId)}" aria-label="More options" aria-haspopup="true" aria-expanded="false">
        <span class="material-symbols-outlined">more_vert</span>
      </button>
      <div class="card-menu menu-panel">
        <button class="menu-item" type="button" data-action="watched" data-video-id="${escapeAttr(videoId)}">
          <span class="material-symbols-outlined">check_circle</span>
          <span>Mark watched</span>
        </button>
        <button class="menu-item" type="button" data-action="bookmark" data-video-id="${escapeAttr(videoId)}">
          <span class="material-symbols-outlined">bookmark_border</span>
          <span>Bookmark</span>
        </button>
      </div>
    </div>`;
}

// Best-effort — never blocks playback. No-op if signed out (nothing to
// record for an anonymous visitor).
async function markViewed(videoId) {
  if (!window.ANCHOR_AUTH) return;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return;
  const { error } = await window.ANCHOR_AUTH.client
    .from("user_progress")
    .upsert({ youtube_video_id: videoId }, { onConflict: "user_id,youtube_video_id", ignoreDuplicates: true });
  if (error) console.error(error);
}

async function unmarkViewed(badge) {
  const videoId = badge.dataset.videoId;
  // .thumb is a sibling of the badge, not an ancestor (see the comment on
  // renderViewedBadge's insertion point) — capture it via the shared parent
  // before removing the badge, so a failed delete below can restore it.
  const cardEl = badge.closest(".video");
  const thumb = cardEl?.querySelector(".thumb");
  badge.remove();
  const { error } = await window.ANCHOR_AUTH.client.from("user_progress").delete().eq("youtube_video_id", videoId);
  if (error) {
    console.error(error);
    thumb?.insertAdjacentHTML("afterend", renderViewedBadge(videoId));
    return;
  }
  const menuItem = cardEl?.querySelector('.menu-item[data-action="watched"]');
  if (menuItem) renderCardMenuItemState(menuItem, false);
}

// Patches .viewed-badge onto already-rendered video cards for whichever of
// the given ids the signed-in user has already watched. Runs after the
// grid is on screen (most callers fire-and-forget this) so it never adds
// auth-dependent latency to the primary video/headline load. Returns the
// viewed Set for callers that need it (e.g. a "Resume" button) — null if
// signed out, distinct from an empty Set ("no progress yet").
async function markViewedBadges(containerEl, youtubeVideoIds) {
  if (!containerEl || !window.ANCHOR_AUTH || youtubeVideoIds.length === 0) return null;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return null;

  const { data, error } = await window.ANCHOR_AUTH.client.from("user_progress").select("youtube_video_id").in("youtube_video_id", youtubeVideoIds);
  if (error) {
    console.error(error);
    return null;
  }

  const viewed = new Set((data ?? []).map((row) => row.youtube_video_id));
  containerEl.querySelectorAll(".thumb").forEach((thumb) => {
    if (!viewed.has(thumb.dataset.videoId)) return;
    thumb.insertAdjacentHTML("afterend", renderViewedBadge(thumb.dataset.videoId));
    const menuItem = thumb.closest(".video")?.querySelector('.menu-item[data-action="watched"]');
    if (menuItem) renderCardMenuItemState(menuItem, true);
  });
  return viewed;
}

// Same idea as markViewedBadges, but bookmarks have no grid badge to
// insert — the card menu (renderCardMenu) is the only place bookmark state
// shows on a grid, so this only needs to sync each card's menu item.
async function syncBookmarkMenuItems(containerEl, youtubeVideoIds) {
  if (!containerEl || !window.ANCHOR_AUTH || youtubeVideoIds.length === 0) return null;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return null;

  const { data, error } = await window.ANCHOR_AUTH.client.from("bookmarks").select("youtube_video_id").in("youtube_video_id", youtubeVideoIds);
  if (error) {
    console.error(error);
    return null;
  }

  const bookmarked = new Set((data ?? []).map((row) => row.youtube_video_id));
  containerEl.querySelectorAll(".thumb").forEach((thumb) => {
    if (!bookmarked.has(thumb.dataset.videoId)) return;
    const menuItem = thumb.closest(".video")?.querySelector('.menu-item[data-action="bookmark"]');
    if (menuItem) renderCardMenuItemState(menuItem, true);
  });
  return bookmarked;
}

// Un-hides every .card-menu-btn in containerEl once sign-in is confirmed —
// the menu itself needs no server data (unlike the badges above, which
// need to know which videos are already watched/bookmarked), so this only
// needs a session check, not a query.
async function revealCardMenus(containerEl) {
  if (!containerEl || !window.ANCHOR_AUTH) return;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return;
  containerEl.querySelectorAll(".card-menu-btn").forEach((btn) => btn.classList.add("visible"));
}

function renderCardMenuItemState(menuItem, active) {
  const icon = menuItem.querySelector(".material-symbols-outlined");
  const label = menuItem.querySelector("span:last-child");
  menuItem.classList.toggle("is-active", active);
  if (menuItem.dataset.action === "watched") {
    label.textContent = active ? "Mark unwatched" : "Mark watched";
  } else {
    icon.textContent = active ? "bookmark" : "bookmark_border";
    label.textContent = active ? "Remove bookmark" : "Bookmark";
  }
}

// Only one card menu open at a time — opening a new one (or any click
// outside) closes whichever was open. The opening click itself reaches
// here via onThumbGridClick's own stopPropagation, so it doesn't
// immediately re-close what it just opened (same trick as initAuthControl).
let openCardMenu = null;
function closeCardMenu() {
  if (!openCardMenu) return;
  openCardMenu.menuEl.classList.remove("open");
  openCardMenu.btnEl.setAttribute("aria-expanded", "false");
  openCardMenu = null;
}
function toggleCardMenu(btnEl) {
  const menuEl = btnEl.closest(".card-menu-wrap").querySelector(".card-menu");
  if (openCardMenu?.menuEl === menuEl) {
    closeCardMenu();
    return;
  }
  closeCardMenu();
  menuEl.classList.add("open");
  btnEl.setAttribute("aria-expanded", "true");
  openCardMenu = { btnEl, menuEl };
}
document.addEventListener("click", closeCardMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCardMenu();
});

async function handleCardMenuAction(menuItem) {
  const videoId = menuItem.dataset.videoId;
  const action = menuItem.dataset.action;
  const cardEl = menuItem.closest(".video");
  const thumb = cardEl.querySelector(".thumb");
  closeCardMenu();
  if (!window.ANCHOR_AUTH) return;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return;

  if (action === "watched") {
    const badge = cardEl.querySelector(".viewed-badge");
    if (badge) return unmarkViewed(badge);
    await markViewed(videoId);
    if (!cardEl.querySelector(".viewed-badge")) thumb.insertAdjacentHTML("afterend", renderViewedBadge(videoId));
    renderCardMenuItemState(menuItem, true);
  } else if (action === "bookmark") {
    // No badge to check for existing state (see syncBookmarkMenuItems) —
    // the menu item's own is-active class is the source of truth here.
    const nowBookmarked = !menuItem.classList.contains("is-active");
    renderCardMenuItemState(menuItem, nowBookmarked);
    const { error } = nowBookmarked
      ? await window.ANCHOR_AUTH.client
          .from("bookmarks")
          .upsert({ youtube_video_id: videoId }, { onConflict: "user_id,youtube_video_id", ignoreDuplicates: true })
      : await window.ANCHOR_AUTH.client.from("bookmarks").delete().eq("youtube_video_id", videoId);
    if (error) {
      console.error(error);
      renderCardMenuItemState(menuItem, !nowBookmarked);
    }
  }
}

// Returns the signed-in user's full watch history as a Set of
// youtube_video_ids, or null if signed out (distinct from an empty Set —
// "no history yet" vs. "not signed in, don't show progress at all").
async function fetchViewedSet() {
  if (!window.ANCHOR_AUTH) return null;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return null;

  const { data, error } = await window.ANCHOR_AUTH.client.from("user_progress").select("youtube_video_id");
  if (error) {
    console.error(error);
    return null;
  }
  return new Set((data ?? []).map((row) => row.youtube_video_id));
}

// Active video ids for a course playlist, in playlist order (idx first,
// then recency for anything without one). Used both by courses.html (per-
// course lesson counts) and the homepage Continue Learning shelf.
async function fetchLessonIds(slug) {
  const { supabaseUrl, supabasePublishableKey } = window.ANCHOR_CONFIG;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/videos?select=youtube_video_id&active=eq.true&playlist=eq.${encodeURIComponent(slug)}&order=idx.asc.nullslast,published_at.desc,created_at.desc`,
    {
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => r.youtube_video_id);
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

// auth-control and theme-toggle live in the sidebar footer (renderSidebar),
// not here — see the note there for why. This <header> only renders at
// mobile widths (hidden on desktop via CSS) — .sidebar-brand in
// renderSidebar is its desktop equivalent, sized for the sidebar's ~190px
// column instead of the full page width. Kept as two separate renders
// (rather than one element relocated by JS, like the video modal's quick
// actions) since both are just branding markup, not stateful.
function renderHeader() {
  return `
    <header>
      <button class="hamburger" type="button" id="hamburger" aria-label="Open menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <img src="favicon.svg" alt="Daily Anchor logo" />
      <div>
        <h1>Daily Anchor</h1>
        <p>Curated content worth your attention.</p>
      </div>
    </header>
  `;
}

function mountHeader() {
  const placeholder = document.getElementById("app-header");
  if (!placeholder) return;
  placeholder.outerHTML = renderHeader();
}

// activeKey is "home" or a tier key (see window.ANCHOR_TIERS in playlists.js).
// Sourcing the tier items from ANCHOR_TIERS instead of a separate hardcoded
// list means a new tier only needs adding in one place to show up in nav.
function renderSidebar(activeKey) {
  const tierItems = (window.ANCHOR_TIERS ?? [])
    .map(
      (t) => `
      <a class="nav-item" href="courses.html?tier=${encodeURIComponent(t.key)}"${t.key === activeKey ? ' aria-current="page"' : ""}>
        <span class="material-symbols-outlined">${t.icon}</span> ${escapeHtml(t.displayName)}
      </a>`
    )
    .join("");

  return `
    <div class="sidebar-brand">
      <img src="favicon.svg" alt="Daily Anchor logo" />
      <h1>Daily Anchor</h1>
    </div>
    <button class="sidebar-close" type="button" id="sidebar-close" aria-label="Close menu">
      <span class="material-symbols-outlined">close</span>
    </button>
    <div class="sidebar-scroll">
      <a class="nav-item" href="index.html"${activeKey === "home" ? ' aria-current="page"' : ""}>
        <span class="material-symbols-outlined">today</span> Home
      </a>
      <!-- Mobile-only (see the nav-item-headlines CSS rule) — desktop's
           side column already shows headlines alongside the shelf stack at
           all times, so this would be a redundant destination there. Links
           to a real URL (not a JS click handler) so it behaves like every
           other nav item: back button, reload, and bookmarking all work. -->
      <a class="nav-item nav-item-headlines" href="index.html?view=headlines"${activeKey === "headlines" ? ' aria-current="page"' : ""}>
        <span class="material-symbols-outlined">newspaper</span> Headlines
      </a>
      ${tierItems}
      ${renderSidebarFilters()}
    </div>
    <div class="sidebar-footer">
      <div class="auth-control" id="auth-control"></div>
      <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Toggle dark mode">
        <span class="material-symbols-outlined" id="theme-icon"></span>
      </button>
    </div>
  `;
}

function mountSidebar(activeKey) {
  const el = document.getElementById("sidebar");
  if (!el) return;
  el.innerHTML = renderSidebar(activeKey);
}

// --- Sitewide region/language filter ---
// Anonymous-first (localStorage), reconciled into profiles.preferred_regions
// /preferred_languages on sign-in — see initRegionLangFilter. Lives in the
// sidebar (mounted on every page via mountSidebar) alongside auth-control
// and theme-toggle (also moved here, out of the header — see renderHeader)
// rather than the header: the header was flagged as cramped at mobile
// widths even before this existed, and consolidating everything
// account/preferences-related into one place (the sidebar, always visible
// on desktop, one tap away via the hamburger on mobile) is more coherent
// than splitting it across header and sidebar.
const REGION_LANG_STORAGE_KEY = "anchor-region-lang";
const DEFAULT_REGIONS = ["global"];
const DEFAULT_LANGUAGES = ["en"];

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Drops any stored region/language key that's no longer registered (e.g. a
// region renamed or removed, like "gb" folding into "eu") — without this, a
// returning user with a now-unknown key stuck in localStorage/their profile
// would see every sidebar checkbox unchecked (nothing to render a "gb" box
// for) while the underlying query still silently filtered on it, with no UI
// path to fix it. Falls back to defaults if filtering empties the list.
function sanitizeRegionLangSelection(regions, languages) {
  const validRegions = new Set((window.ANCHOR_REGIONS ?? []).map((r) => r.key));
  const validLanguages = new Set((window.ANCHOR_LANGUAGES ?? []).map((l) => l.key));
  const cleanRegions = regions.filter((r) => validRegions.has(r));
  const cleanLanguages = languages.filter((l) => validLanguages.has(l));
  return {
    regions: cleanRegions.length > 0 ? cleanRegions : DEFAULT_REGIONS,
    languages: cleanLanguages.length > 0 ? cleanLanguages : DEFAULT_LANGUAGES,
  };
}

function getRegionLangFilter() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REGION_LANG_STORAGE_KEY));
    const regions = Array.isArray(parsed?.regions) && parsed.regions.length > 0 ? parsed.regions : DEFAULT_REGIONS;
    const languages = Array.isArray(parsed?.languages) && parsed.languages.length > 0 ? parsed.languages : DEFAULT_LANGUAGES;
    return sanitizeRegionLangSelection(regions, languages);
  } catch {
    return { regions: DEFAULT_REGIONS, languages: DEFAULT_LANGUAGES };
  }
}

// Best-effort on both writes — a page must keep working with an in-memory
// selection even if localStorage is unavailable (private mode, quota) or
// the profile update fails (signed in but offline, RLS hiccup, etc.).
function saveRegionLangFilter(regions, languages) {
  try {
    localStorage.setItem(REGION_LANG_STORAGE_KEY, JSON.stringify({ regions, languages }));
  } catch (err) {
    console.error(err);
  }
  if (!window.ANCHOR_AUTH) return;
  window.ANCHOR_AUTH.getSession().then(({ session }) => {
    if (!session) return;
    window.ANCHOR_AUTH.client
      .from("profiles")
      .update({ preferred_regions: regions, preferred_languages: languages })
      .eq("user_id", session.user.id)
      .then(({ error }) => {
        if (error) console.error(error);
      });
  });
}

// Collapsed by default — plain checkboxes are still the right widget even
// at a half-dozen regions and a couple of languages, but a full always-
// expanded list at that size would compete with the nav items above it for
// space in a ~190px column. Region and language are two independent
// dropdowns (not one combined "Filters" menu) so each can be opened and
// scanned on its own — each toggle reads a fixed word (Region/Language),
// not a live-updating summary of the current selection.
function renderSidebarFilters() {
  const { regions, languages } = getRegionLangFilter();

  const renderGroup = (options, group, selected) =>
    (options ?? [])
      .map(
        (o) => `
      <label class="filter-option">
        <input type="checkbox" data-filter-group="${group}" value="${escapeAttr(o.key)}"${selected.includes(o.key) ? " checked" : ""} />
        ${escapeHtml(o.displayName)}
      </label>`
      )
      .join("");

  const renderDropdown = (group, icon, label, options, selected) => `
    <div class="filter-dropdown">
      <button class="filters-toggle" type="button" data-filter-toggle="${group}" aria-expanded="false" aria-controls="filters-body-${group}">
        <span class="material-symbols-outlined">${icon}</span>
        <span class="filters-summary">${label}</span>
        <span class="material-symbols-outlined filters-chevron">expand_more</span>
      </button>
      <div class="filters-body" id="filters-body-${group}" hidden>
        ${renderGroup(options, group, selected)}
      </div>
    </div>`;

  return `
    <div class="sidebar-filters" id="sidebar-filters">
      ${renderDropdown("region", "public", "Region", window.ANCHOR_REGIONS, regions)}
      ${renderDropdown("language", "translate", "Language", window.ANCHOR_LANGUAGES, languages)}
    </div>
  `;
}

function applyRegionLangCheckboxes(regions, languages) {
  document.querySelectorAll('input[data-filter-group="region"]').forEach((el) => (el.checked = regions.includes(el.value)));
  document.querySelectorAll('input[data-filter-group="language"]').forEach((el) => (el.checked = languages.includes(el.value)));
}

// Builds the region/language portion of a hand-built videos/headlines REST
// query. `ov` (overlap) on the region array column, `in` on the scalar
// language column — OR within each facet (any selected value matches),
// AND across the two params (PostgREST ANDs separate query params
// together), matching how the filter was scoped: a video/headline shows if
// its region overlaps the selection AND its language is in the selection.
function regionLangQueryParams(regions, languages) {
  return `region=ov.{${regions.join(",")}}&language=in.(${languages.join(",")})`;
}

// Same AND/OR semantics as regionLangQueryParams, for client-side
// filtering (courses.html filters its static ANCHOR_PLAYLISTS list rather
// than querying the DB — see that page for why).
function matchesRegionLangFilter(entryRegions, entryLanguage, regions, languages) {
  return (entryRegions ?? []).some((r) => regions.includes(r)) && languages.includes(entryLanguage);
}

// Wires the sidebar checkboxes (present on every page via renderSidebar)
// and, if signed in, reconciles localStorage with the account's stored
// preference. Call once per page, alongside initAuthControl.
function initRegionLangFilter() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  sidebar.querySelectorAll("[data-filter-toggle]").forEach((toggle) => {
    const body = document.getElementById(toggle.getAttribute("aria-controls"));
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
  });

  sidebar.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.filterGroup) return;

    const group = input.dataset.filterGroup;
    const checked = [...sidebar.querySelectorAll(`input[data-filter-group="${group}"]`)].filter((el) => el.checked).map((el) => el.value);

    // Never let a facet go empty — re-check the box that would have been
    // the last one unchecked instead of applying an all-excluding filter.
    if (checked.length === 0) {
      input.checked = true;
      return;
    }

    const current = getRegionLangFilter();
    const regions = group === "region" ? checked : current.regions;
    const languages = group === "language" ? checked : current.languages;
    saveRegionLangFilter(regions, languages);
    window.dispatchEvent(new CustomEvent("anchor-filter-change", { detail: { regions, languages } }));
  });

  if (!window.ANCHOR_AUTH) return;

  // onAuthStateChange also fires on token refreshes, not just real sign-ins
  // — same guard pattern as fetchProfileExtras in initAuthControl, so this
  // reconciliation only runs once per actual sign-in.
  let reconciledUserId = null;
  window.ANCHOR_AUTH.onAuthStateChange(async (event, session) => {
    if (!session || session.user.id === reconciledUserId) return;
    reconciledUserId = session.user.id;

    const { data, error } = await window.ANCHOR_AUTH.client
      .from("profiles")
      .select("preferred_regions, preferred_languages")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error || !data) return;

    // profiles.preferred_regions/languages are NOT NULL with a default of
    // {global}/{en} — there's no way to tell "never touched" apart from
    // "explicitly re-picked the default" at the DB level, so both are
    // treated the same way: not customized. Whichever side (account vs.
    // local) actually differs from the default wins; if neither does,
    // there's nothing to reconcile.
    const rawAccountRegions = data.preferred_regions?.length ? data.preferred_regions : DEFAULT_REGIONS;
    const rawAccountLanguages = data.preferred_languages?.length ? data.preferred_languages : DEFAULT_LANGUAGES;
    const { regions: accountRegions, languages: accountLanguages } = sanitizeRegionLangSelection(rawAccountRegions, rawAccountLanguages);
    const accountCustomized = !arraysEqual(accountRegions, DEFAULT_REGIONS) || !arraysEqual(accountLanguages, DEFAULT_LANGUAGES);

    const local = getRegionLangFilter();
    const localCustomized = !arraysEqual(local.regions, DEFAULT_REGIONS) || !arraysEqual(local.languages, DEFAULT_LANGUAGES);

    if (accountCustomized) {
      localStorage.setItem(REGION_LANG_STORAGE_KEY, JSON.stringify({ regions: accountRegions, languages: accountLanguages }));
      applyRegionLangCheckboxes(accountRegions, accountLanguages);
      window.dispatchEvent(new CustomEvent("anchor-filter-change", { detail: { regions: accountRegions, languages: accountLanguages } }));
    } else if (localCustomized) {
      const { error: updateError } = await window.ANCHOR_AUTH.client
        .from("profiles")
        .update({ preferred_regions: local.regions, preferred_languages: local.languages })
        .eq("user_id", session.user.id);
      if (updateError) console.error(updateError);
    }
  });
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-icon");
  if (!toggle || !icon) return;

  const applyIcon = (theme) => {
    icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
  };

  applyIcon(document.documentElement.getAttribute("data-theme"));

  toggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("anchor-theme", next);
    applyIcon(next);
  });
}

function initSidebarDrawer() {
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("drawer-backdrop");
  const closeBtn = document.getElementById("sidebar-close");
  if (!hamburger || !sidebar || !backdrop) return;

  // Body scroll lock while the drawer is open — without it, a touch/wheel
  // scroll starting anywhere over the fixed-position drawer or backdrop
  // still scrolls the page underneath (position: fixed doesn't stop that on
  // its own), which reads as the drawer's own contents behaving
  // inconsistently on scroll even though the drawer itself never moves.
  // Goes through AnchorScrollLock, not a direct overflow write — the video
  // modal can be open (minimized, z-index 200) at the same time as this
  // drawer, and two independent unconditional writers would let whichever
  // closes last clobber the other's still-active lock.
  const open = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
    window.AnchorScrollLock.lock();
  };
  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
    window.AnchorScrollLock.unlock();
  };

  hamburger.addEventListener("click", () => {
    sidebar.classList.contains("open") ? close() : open();
  });
  backdrop.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) close();
  });
  // .hamburger/.drawer-backdrop are display:none above 860px (see
  // styles.css), so a drawer left open while crossing into that width
  // (window resize, tablet rotation) would otherwise have no visible way to
  // close it — the scroll lock especially shouldn't be left stuck on with
  // no click target to release it.
  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches && sidebar.classList.contains("open")) close();
  });
}

function initAuthControl() {
  const container = document.getElementById("auth-control");
  // window.ANCHOR_AUTH is missing if the Supabase CDN script failed to load
  // (outage, ad-blocker, flaky network) — bail here rather than throw, since
  // an uncaught error would halt every statement after this call in the
  // page's init script, taking down video/headline loading along with it.
  if (!container || !window.ANCHOR_AUTH) return;

  let session = null;
  let displayName = null; // fetched separately — not part of the auth session itself
  let newsletterOptIn = null; // null = not yet fetched, true/false once known — see fetchProfileExtras
  let panelOpen = false;
  let step = "email"; // "email" | "code" — irrelevant once session is set
  let pendingEmail = "";
  let cooldownEndsAt = 0;
  let cooldownInterval;

  function truncateLabel(text) {
    return text.length > 22 ? `${text.slice(0, 19)}…` : text;
  }

  // Fetched once per sign-in (guarded by the newsletterOptIn === null check
  // at the call site below, not displayName — a user with no display name
  // set stays null forever, which would re-fetch on every auth event
  // instead of just once) rather than on every auth event —
  // onAuthStateChange also fires for token refreshes, which don't need a
  // fresh profile fetch.
  async function fetchProfileExtras(userId) {
    const { data, error } = await window.ANCHOR_AUTH.client.from("profiles").select("display_name, newsletter_opt_in").eq("user_id", userId).maybeSingle();
    if (error || !data) return;
    displayName = data.display_name;
    newsletterOptIn = Boolean(data.newsletter_opt_in);
    render();
  }

  function updateCooldownLabel() {
    const btn = document.getElementById("auth-resend");
    if (!btn) {
      clearInterval(cooldownInterval);
      return;
    }
    const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);
    if (remaining > 0) {
      btn.disabled = true;
      btn.textContent = `Resend in ${remaining}s`;
    } else {
      btn.disabled = false;
      btn.textContent = "Resend code";
      clearInterval(cooldownInterval);
    }
  }

  function startCooldown() {
    cooldownEndsAt = Date.now() + 60000;
    clearInterval(cooldownInterval);
    cooldownInterval = setInterval(updateCooldownLabel, 1000);
    updateCooldownLabel();
  }

  function panelBody() {
    if (session) {
      return `
        <p class="auth-email">${escapeHtml(session.user.email)}</p>
        <a class="btn-secondary" href="profile.html">Profile</a>
        <button class="btn-secondary" type="button" id="auth-signout">Sign out</button>
      `;
    }
    if (step === "code") {
      return `
        <form id="auth-code-form">
          <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code" id="auth-code-input" required />
          <button type="submit">Verify</button>
        </form>
        <button class="btn-secondary" type="button" id="auth-resend">Resend code</button>
        <button class="btn-secondary" type="button" id="auth-change-email">Use a different email</button>
      `;
    }
    return `
      <form id="auth-email-form">
        <input type="email" placeholder="you@example.com" id="auth-email-input" required />
        <button type="submit">Send code</button>
      </form>
    `;
  }

  function render() {
    const label = session ? truncateLabel(displayName || session.user.email) : "Sign in";
    container.innerHTML = `
      <button class="auth-btn" type="button" id="auth-toggle" aria-label="Account menu">
        <span class="material-symbols-outlined" aria-hidden="true">account_circle</span>
        <span class="auth-btn-label">${escapeHtml(label)}</span>
      </button>
      <div class="auth-panel${panelOpen ? " open" : ""}" id="auth-panel">${panelBody()}</div>
    `;

    document.getElementById("auth-toggle").addEventListener("click", () => {
      panelOpen = !panelOpen;
      render();
    });

    // Footer newsletter CTA is optional — only present on pages that have
    // it — but when present, it stays in lockstep with this same session
    // value rather than running its own separate auth-state subscription.
    // Copy swaps three ways, not just signed-in-vs-not: a signed-in user
    // who already opted in gets an acknowledgement instead of the same
    // acquisition pitch every other state sees — there's no reason to keep
    // asking someone to get the digest they're already getting.
    const footerSlot = document.getElementById("footer-cta");
    if (footerSlot) {
      const footerCopy = document.getElementById("footer-copy");
      const subscribed = Boolean(session) && newsletterOptIn === true;
      if (footerCopy) {
        footerCopy.innerHTML = subscribed
          ? `<strong>You're subscribed</strong><p>The day's best picks land in your inbox every morning.</p>`
          : `<strong>Get the daily digest</strong><p>The day's best picks, distilled into one email.</p>`;
      }
      footerSlot.innerHTML = subscribed
        ? `<a class="btn-secondary" href="profile.html">Manage preferences</a>`
        : session
        ? `<a class="btn-primary" href="profile.html">Manage newsletter preferences</a>`
        : `<button class="btn-primary" type="button" id="footer-cta-signin">Sign in to subscribe</button>`;
      document.getElementById("footer-cta-signin")?.addEventListener("click", (event) => {
        // This button lives outside #auth-control, so its click isn't
        // covered by that container's stopPropagation guard — without this,
        // the click would bubble to the document listener below right after
        // opening the panel, and immediately close it again (same failure
        // mode the header toggle button hit during Phase 1 testing).
        event.stopPropagation();
        panelOpen = true;
        render();
        document.getElementById("auth-toggle")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    if (session) {
      document.getElementById("auth-signout").addEventListener("click", async (event) => {
        event.target.disabled = true;
        const { error } = await window.ANCHOR_AUTH.signOut();
        if (error) {
          event.target.disabled = false;
          showToast("Something went wrong signing out.", "error");
          return;
        }
        panelOpen = false;
        showToast("Signed out", "success");
      });
      return;
    }

    if (step === "code") {
      document.getElementById("auth-code-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = event.target.querySelector("button");
        const code = document.getElementById("auth-code-input").value.trim();
        submitBtn.disabled = true;
        const { error } = await window.ANCHOR_AUTH.verifyOtp(pendingEmail, code);
        if (error) {
          submitBtn.disabled = false;
          showToast("Invalid or expired code.", "error");
          return;
        }
        showToast("Signed in!", "success");
        panelOpen = false;
        step = "email";
        pendingEmail = "";
      });
      document.getElementById("auth-resend").addEventListener("click", async (event) => {
        event.target.disabled = true;
        const { error } = await window.ANCHOR_AUTH.sendOtp(pendingEmail);
        if (error) {
          event.target.disabled = false;
          showToast("Couldn't resend. Please try again.", "error");
          return;
        }
        startCooldown();
      });
      document.getElementById("auth-change-email").addEventListener("click", () => {
        clearInterval(cooldownInterval);
        step = "email";
        pendingEmail = "";
        render();
      });
      updateCooldownLabel();
    } else {
      document.getElementById("auth-email-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = event.target.querySelector("button");
        const email = document.getElementById("auth-email-input").value.trim();
        submitBtn.disabled = true;
        const { error } = await window.ANCHOR_AUTH.sendOtp(email);
        submitBtn.disabled = false;
        if (error) {
          showToast("Couldn't send code. Please try again.", "error");
          return;
        }
        pendingEmail = email;
        step = "code";
        // render() must run first — it's what puts #auth-resend in the DOM.
        // startCooldown()'s own immediate updateCooldownLabel() call bails
        // out (and kills the interval it just started) if that button
        // doesn't exist yet, which silently broke the whole countdown.
        render();
        startCooldown();
      });
    }
  }

  // Pages have their own sign-in-optional content (Continue Learning,
  // watched badges, the card menu's reveal, resume buttons, ...) computed
  // once from a single getSession() check at load time — completing OTP
  // mid-session doesn't re-run any of that on its own. Broadcasting a real
  // sign-in/out transition here (not every fire — onAuthStateChange also
  // fires on token refreshes) lets each page listen for "anchor-auth-change"
  // and re-run just the parts that need it, same pattern as
  // "anchor-filter-change" for the region/language filter.
  let wasSignedIn = null;
  window.ANCHOR_AUTH.onAuthStateChange((event, newSession) => {
    session = newSession;
    if (!session) {
      displayName = null;
      newsletterOptIn = null;
    } else if (newsletterOptIn === null) {
      fetchProfileExtras(session.user.id);
    }
    render();

    const isSignedIn = Boolean(session);
    if (wasSignedIn !== null && wasSignedIn !== isSignedIn) {
      window.dispatchEvent(new CustomEvent("anchor-auth-change", { detail: { session } }));
    }
    wasSignedIn = isSignedIn;
  });

  // profile.html's newsletter toggle updates the DB directly, not through
  // this module — without this, the footer CTA on that same page keeps
  // showing the pre-toggle copy until the next full page load, since
  // newsletterOptIn here is otherwise only ever fetched once per sign-in.
  window.addEventListener("anchor-newsletter-change", (event) => {
    newsletterOptIn = Boolean(event.detail?.optedIn);
    render();
  });

  // Any click inside the control (including on elements that render()
  // replaces mid-bubble, like the toggle button itself) must never reach
  // the document listener below — by the time it bubbles up, the original
  // event.target may already be detached from the DOM, so container.contains()
  // would wrongly read as "outside" and close the panel that was just opened.
  container.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("click", () => {
    if (!panelOpen) return;
    panelOpen = false;
    render();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panelOpen) {
      panelOpen = false;
      render();
    }
  });
}

let toastTimer;
function showToast(message, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  document.getElementById("toast-icon").textContent = type === "success" ? "check_circle" : "error";
  document.getElementById("toast-message").textContent = message;
  toast.classList.remove("success", "error");
  toast.classList.add(type, "visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
}
