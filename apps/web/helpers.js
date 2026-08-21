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

function playInline(event) {
  const thumb = event.target.closest(".thumb");
  if (!thumb) return;

  const videoId = thumb.dataset.videoId;
  const badge = thumb.parentElement?.querySelector(".viewed-badge");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
  iframe.title = thumb.getAttribute("aria-label") ?? "";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  thumb.replaceWith(iframe);
  badge?.remove();
  markViewed(videoId);
}

// Handles a click on a .viewed-badge (unmark) before falling through to
// playInline. The badge sits next to .thumb rather than inside it — .thumb
// is itself a <button>, and buttons can't nest — so this dispatcher is what
// makes the badge clickable without needing a second, separately-bound
// listener juggling stopPropagation against playInline's own.
function onThumbGridClick(event) {
  const badge = event.target.closest(".viewed-badge");
  if (badge) return unmarkViewed(badge);
  playInline(event);
}

function renderViewedBadge(videoId) {
  return `<button class="viewed-badge" type="button" data-video-id="${escapeAttr(videoId)}" aria-label="Mark as not viewed">
    <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
  </button>`;
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
  const thumb = badge.parentElement?.querySelector(".thumb");
  badge.remove();
  const { error } = await window.ANCHOR_AUTH.client.from("user_progress").delete().eq("youtube_video_id", videoId);
  if (error) {
    console.error(error);
    thumb?.insertAdjacentHTML("afterend", renderViewedBadge(videoId));
  }
}

// Patches .viewed-badge onto already-rendered video cards for whichever of
// the given ids the signed-in user has already watched. Runs after the
// grid is on screen (fire-and-forget from the caller) so this never adds
// auth-dependent latency to the primary video/headline load. No-op if
// signed out.
async function markViewedBadges(containerEl, youtubeVideoIds) {
  if (!containerEl || !window.ANCHOR_AUTH || youtubeVideoIds.length === 0) return;
  const { session } = await window.ANCHOR_AUTH.getSession();
  if (!session) return;

  const { data, error } = await window.ANCHOR_AUTH.client.from("user_progress").select("youtube_video_id").in("youtube_video_id", youtubeVideoIds);
  if (error) return console.error(error);

  const viewed = new Set((data ?? []).map((row) => row.youtube_video_id));
  containerEl.querySelectorAll(".thumb").forEach((thumb) => {
    if (viewed.has(thumb.dataset.videoId)) {
      thumb.insertAdjacentHTML("afterend", renderViewedBadge(thumb.dataset.videoId));
    }
  });
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

function formatDate(iso) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

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
      <div class="auth-control" id="auth-control"></div>
      <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Toggle dark mode">
        <span class="material-symbols-outlined" id="theme-icon"></span>
      </button>
    </header>
  `;
}

function mountHeader() {
  const placeholder = document.getElementById("app-header");
  if (!placeholder) return;
  placeholder.outerHTML = renderHeader();
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

  const open = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
  };
  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  };

  hamburger.addEventListener("click", () => {
    sidebar.classList.contains("open") ? close() : open();
  });
  backdrop.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) close();
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
  let panelOpen = false;
  let step = "email"; // "email" | "code" — irrelevant once session is set
  let pendingEmail = "";
  let cooldownEndsAt = 0;
  let cooldownInterval;

  function truncateEmail(email) {
    return email.length > 22 ? `${email.slice(0, 19)}…` : email;
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
    const label = session ? truncateEmail(session.user.email) : "Sign in";
    container.innerHTML = `
      <button class="auth-btn" type="button" id="auth-toggle" aria-label="Account menu">${escapeHtml(label)}</button>
      <div class="auth-panel${panelOpen ? " open" : ""}" id="auth-panel">${panelBody()}</div>
    `;

    document.getElementById("auth-toggle").addEventListener("click", () => {
      panelOpen = !panelOpen;
      render();
    });

    // Footer newsletter CTA is optional — only present on pages that have
    // it — but when present, it stays in lockstep with this same session
    // value rather than running its own separate auth-state subscription.
    const footerSlot = document.getElementById("footer-cta");
    if (footerSlot) {
      footerSlot.innerHTML = session
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
          showToast("Couldn't resend — please try again.", "error");
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
          showToast("Couldn't send code — please try again.", "error");
          return;
        }
        pendingEmail = email;
        step = "code";
        startCooldown();
        render();
      });
    }
  }

  window.ANCHOR_AUTH.onAuthStateChange((event, newSession) => {
    session = newSession;
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
