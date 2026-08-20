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

function playInline(event) {
  const thumb = event.target.closest(".thumb");
  if (!thumb) return;

  const videoId = thumb.dataset.videoId;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
  iframe.title = thumb.getAttribute("aria-label") ?? "";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  thumb.replaceWith(iframe);
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
  if (!hamburger || !sidebar || !backdrop) return;

  hamburger.addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
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

function initSubscribeForm() {
  const form = document.getElementById("subscribe-form");
  if (!form) return;
  const button = form.querySelector("button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { supabaseUrl, supabasePublishableKey } = window.ANCHOR_CONFIG;
    const email = document.getElementById("subscribe-email").value.trim();

    button.disabled = true;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
        method: "POST",
        headers: {
          apikey: supabasePublishableKey,
          Authorization: `Bearer ${supabasePublishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email }),
      });

      if (res.status === 409) {
        showToast("You're already subscribed.", "error");
      } else if (!res.ok) {
        throw new Error(`Subscribe failed: ${res.status}`);
      } else {
        showToast("Subscribed! Check your inbox tomorrow morning.", "success");
        form.reset();
      }
    } catch (err) {
      showToast("Something went wrong — please try again.", "error");
      console.error(err);
    } finally {
      button.disabled = false;
    }
  });
}
