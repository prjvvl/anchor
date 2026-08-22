// Modal/theater video player: replaces the old inline-card iframe swap
// (cramped YouTube chrome at card width) with a real-size overlay, adds
// queue/autoplay ("Play All" + auto-advance) via the YouTube IFrame Player
// API, and tracks actual watch progress (furthest timestamp reached, not
// raw current time — scrubbing to the end shouldn't fake completion)
// instead of marking a video watched the instant it's clicked.
//
// Depends on globals from helpers.js: escapeHtml, escapeAttr, formatDuration,
// markViewed, renderViewedBadge. Load this script after helpers.js.

(function () {
  const WATCHED_THRESHOLD = 0.9;
  const POLL_INTERVAL_MS = 5000;
  const MOBILE_QUERY = window.matchMedia("(max-width: 860px)");

  let apiPromise = null;
  function ensureYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (!apiPromise) {
      apiPromise = new Promise((resolve) => {
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevReady?.();
          resolve();
        };
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      });
    }
    return apiPromise;
  }

  let backdropEl,
    modalEl,
    playerAreaEl,
    playerMountEl,
    errorEl,
    titleEl,
    breadcrumbEl,
    metaEl,
    watchLinkEl,
    watchedToggleEl,
    watchedIconEl,
    watchedLabelEl,
    upnextEl,
    upNextListEl,
    autoplayCheckboxEl;
  let ytPlayer = null;
  let pollTimer = null;
  let queue = [];
  let currentIndex = -1;
  let furthestReached = 0;
  let isOpen = false;
  let isMinimized = false;
  let contextLabel = "";
  const markedIds = new Set();

  function ensureModal() {
    if (backdropEl) return;

    backdropEl = document.createElement("div");
    backdropEl.className = "video-modal-backdrop";
    backdropEl.innerHTML = `
      <div class="video-modal" role="dialog" aria-modal="true" aria-label="Video player">
        <div class="video-modal-header">
          <div class="video-modal-titles">
            <span class="video-modal-breadcrumb" id="vm-breadcrumb"></span>
            <h3 id="vm-title"></h3>
            <div class="video-modal-meta" id="vm-meta"></div>
          </div>
          <div class="video-modal-actions">
            <button class="video-modal-watched-toggle" type="button" id="vm-watched-toggle" hidden>
              <span class="material-symbols-outlined" id="vm-watched-icon">check_circle</span>
              <span id="vm-watched-label">Mark watched</span>
            </button>
            <a class="video-modal-watch-link" id="vm-watch-link" href="#" target="_blank" rel="noopener">
              <span class="material-symbols-outlined">open_in_new</span> Watch on YouTube
            </a>
            <button class="video-modal-minimize" type="button" id="vm-minimize" aria-label="Minimize player">
              <span class="material-symbols-outlined">picture_in_picture_alt</span>
            </button>
            <button class="video-modal-close" type="button" id="vm-close" aria-label="Close player">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="video-modal-body">
          <div class="video-modal-player-area">
            <div class="video-modal-player-mount" id="vm-player-mount"></div>
            <div class="video-modal-error" id="vm-error" hidden></div>
            <div class="video-modal-mini-controls">
              <button type="button" id="vm-mini-expand" aria-label="Expand player">
                <span class="material-symbols-outlined">open_in_full</span>
              </button>
              <button type="button" id="vm-mini-close" aria-label="Close player">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          <div class="video-modal-upnext">
            <div class="video-modal-upnext-header">
              <span>Up Next</span>
              <label class="video-modal-autoplay">
                <input type="checkbox" id="vm-autoplay" checked /> Autoplay
              </label>
            </div>
            <div class="video-modal-upnext-list" id="vm-upnext-list"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdropEl);

    modalEl = backdropEl.querySelector(".video-modal");
    playerAreaEl = backdropEl.querySelector(".video-modal-player-area");
    playerMountEl = backdropEl.querySelector("#vm-player-mount");
    errorEl = backdropEl.querySelector("#vm-error");
    titleEl = backdropEl.querySelector("#vm-title");
    breadcrumbEl = backdropEl.querySelector("#vm-breadcrumb");
    metaEl = backdropEl.querySelector("#vm-meta");
    watchLinkEl = backdropEl.querySelector("#vm-watch-link");
    watchedToggleEl = backdropEl.querySelector("#vm-watched-toggle");
    watchedIconEl = backdropEl.querySelector("#vm-watched-icon");
    watchedLabelEl = backdropEl.querySelector("#vm-watched-label");
    upnextEl = backdropEl.querySelector(".video-modal-upnext");
    upNextListEl = backdropEl.querySelector("#vm-upnext-list");
    autoplayCheckboxEl = backdropEl.querySelector("#vm-autoplay");

    // Same stopPropagation-inside/close-on-outside-click convention as
    // initAuthControl/initSidebarDrawer in helpers.js.
    modalEl.addEventListener("click", (event) => event.stopPropagation());
    backdropEl.addEventListener("click", close);
    backdropEl.querySelector("#vm-close").addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) close();
    });
    upNextListEl.addEventListener("click", (event) => {
      const item = event.target.closest("[data-queue-index]");
      if (item) playAt(Number(item.dataset.queueIndex));
    });
    watchedToggleEl.addEventListener("click", toggleWatched);
    backdropEl.querySelector("#vm-minimize").addEventListener("click", minimize);
    backdropEl.querySelector("#vm-mini-expand").addEventListener("click", restore);
    backdropEl.querySelector("#vm-mini-close").addEventListener("click", close);

    // The Up Next column's list can be far taller than a 16:9 player, and
    // CSS grid's default stretch would otherwise force the player to match
    // that height (see the CSS comment on .video-modal-player-area) — so
    // instead the player is left to size itself from its own width, and its
    // *rendered* height is measured here and imposed on the Up Next column,
    // keeping the two matched with no leftover gap. Desktop (2-column) only;
    // on mobile the whole body just stacks and scrolls as one (see the
    // max-width: 860px rules), so the inline height is cleared there instead.
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[entries.length - 1]?.contentRect.height;
      if (height > 0) syncUpNextHeight(height);
    });
    resizeObserver.observe(playerAreaEl);
    window.addEventListener("resize", () => syncUpNextHeight(playerAreaEl.getBoundingClientRect().height));
  }

  function syncUpNextHeight(playerHeight) {
    upnextEl.style.height = MOBILE_QUERY.matches || !playerHeight ? "" : `${playerHeight}px`;
  }

  // Reads the current .thumb cards inside containerEl, in DOM order. No
  // client-side re-sort happens after these cards render (verified against
  // index.html/course.html), so DOM order always matches the intended play
  // order (recency for rolling sections, idx for ordered courses).
  function buildQueue(containerEl) {
    return [...containerEl.querySelectorAll(".thumb")].map((thumb) => ({
      videoId: thumb.dataset.videoId,
      title: thumb.dataset.title || "",
      channel: thumb.dataset.channel || "",
      duration: thumb.dataset.duration ? Number(thumb.dataset.duration) : null,
      containerEl,
    }));
  }

  function openFromThumb(event, containerEl) {
    const thumb = event.target.closest(".thumb");
    if (!thumb) return;
    const list = buildQueue(containerEl);
    const startIndex = list.findIndex((item) => item.videoId === thumb.dataset.videoId);
    open(list, startIndex < 0 ? 0 : startIndex, containerEl.dataset.contextLabel);
  }

  function playAll(containerEl) {
    const list = buildQueue(containerEl);
    if (list.length === 0) return;
    open(list, 0, containerEl.dataset.contextLabel);
  }

  function open(list, startIndex, label) {
    queue = list;
    contextLabel = label || "";
    isOpen = true;
    ensureModal();
    // A prior session may have left the modal minimized — a freshly opened
    // video should always start in the full view.
    isMinimized = false;
    modalEl.classList.remove("minimized");
    backdropEl.classList.remove("minimized");
    backdropEl.classList.add("open");
    document.body.style.overflow = "hidden";
    renderUpNext();
    ensureYouTubeApi().then(() => {
      if (isOpen) playAt(startIndex);
    });
  }

  // Shrinks the player to a small corner box that keeps playing while the
  // backdrop stops dimming/blocking the rest of the page (pointer-events:
  // none in CSS), so the user can keep scrolling/browsing elsewhere.
  function minimize() {
    isMinimized = true;
    modalEl.classList.add("minimized");
    backdropEl.classList.add("minimized");
    document.body.style.overflow = "";
  }

  function restore() {
    isMinimized = false;
    modalEl.classList.remove("minimized");
    backdropEl.classList.remove("minimized");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!isOpen) return;
    finalizeWatchCheck();
    stopPolling();
    if (ytPlayer) {
      ytPlayer.destroy();
      ytPlayer = null;
    }
    isOpen = false;
    isMinimized = false;
    currentIndex = -1;
    furthestReached = 0;
    backdropEl.classList.remove("open", "minimized");
    modalEl.classList.remove("minimized");
    document.body.style.overflow = "";
    playerMountEl.innerHTML = "";
    playerMountEl.hidden = false;
    errorEl.hidden = true;
  }

  function playAt(index) {
    if (index < 0 || index >= queue.length) return;
    finalizeWatchCheck();
    stopPolling();

    currentIndex = index;
    furthestReached = 0;
    errorEl.hidden = true;
    playerMountEl.hidden = false;

    const item = queue[index];
    breadcrumbEl.textContent = contextLabel ? `${contextLabel} · ${index + 1} of ${queue.length}` : "";
    titleEl.textContent = item.title;
    metaEl.textContent = [item.channel, item.duration ? formatDuration(item.duration) : null].filter(Boolean).join(" · ");
    watchLinkEl.href = `https://www.youtube.com/watch?v=${item.videoId}`;
    renderUpNext();
    updateWatchedToggle();

    if (ytPlayer) {
      ytPlayer.loadVideoById(item.videoId);
    } else {
      playerMountEl.innerHTML = "";
      const mount = document.createElement("div");
      playerMountEl.appendChild(mount);
      ytPlayer = new YT.Player(mount, {
        videoId: item.videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: { onStateChange, onError },
      });
    }
  }

  function onStateChange(event) {
    const state = event.data;
    if (state === YT.PlayerState.PLAYING) {
      startPolling();
    } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.BUFFERING) {
      stopPolling();
    } else if (state === YT.PlayerState.ENDED) {
      stopPolling();
      markWatchedIfNeeded(true);
      if (autoplayCheckboxEl.checked && currentIndex + 1 < queue.length) {
        playAt(currentIndex + 1);
      }
    }
  }

  function onError() {
    stopPolling();
    playerMountEl.hidden = true;
    errorEl.hidden = false;
    const hasNext = currentIndex + 1 < queue.length;
    errorEl.innerHTML = `
      <p>This video can't be played here.</p>
      <a class="video-modal-watch-link" href="${escapeAttr(watchLinkEl.href)}" target="_blank" rel="noopener">
        <span class="material-symbols-outlined">open_in_new</span> Watch on YouTube
      </a>
      ${hasNext ? `<button class="btn-secondary" type="button" id="vm-skip">Skip to next</button>` : ""}
    `;
    if (hasNext) {
      errorEl.querySelector("#vm-skip").addEventListener("click", () => playAt(currentIndex + 1));
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
      const current = ytPlayer.getCurrentTime();
      if (current > furthestReached) furthestReached = current;
      markWatchedIfNeeded(false);
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // forced=true on a natural ENDED event (always counts as watched even if
  // duration lookup is momentarily off); otherwise only counts once the
  // furthest point reached crosses WATCHED_THRESHOLD of the real duration.
  async function markWatchedIfNeeded(forced) {
    if (currentIndex < 0) return;
    const item = queue[currentIndex];
    if (!item || markedIds.has(item.videoId)) return;

    const duration = ytPlayer && typeof ytPlayer.getDuration === "function" ? ytPlayer.getDuration() : 0;
    const ratio = duration > 0 ? furthestReached / duration : 0;
    if (!forced && ratio < WATCHED_THRESHOLD) return;

    // Only cache this video as "handled" once there's actually a session to
    // write it against — otherwise a signed-out watch would permanently
    // block a later sign-in (same page, no reload) from ever recording it,
    // since markedIds would already (wrongly) claim it's done.
    if (!window.ANCHOR_AUTH) return;
    const { session } = await window.ANCHOR_AUTH.getSession();
    if (!session) return;

    markedIds.add(item.videoId);
    markViewed(item.videoId);
    const thumb = findThumbFor(item);
    if (thumb && !thumb.parentElement.querySelector(".viewed-badge")) {
      thumb.insertAdjacentHTML("afterend", renderViewedBadge(item.videoId));
    }
    // Re-checked rather than assumed: the await above is a real yield point
    // now, so currentIndex may have moved on to a different video by the
    // time this resolves.
    if (item === queue[currentIndex]) renderWatchedToggle(true);
  }

  function findThumbFor(item) {
    return item.containerEl?.querySelector(`.thumb[data-video-id="${CSS.escape(item.videoId)}"]`) ?? null;
  }

  function renderWatchedToggle(watched) {
    watchedToggleEl.classList.toggle("is-watched", watched);
    watchedLabelEl.textContent = watched ? "Watched" : "Mark watched";
  }

  // Reflects true server-side state, not just this-session's markedIds —
  // checked via the source card's badge (populated at page load by
  // markViewedBadges in helpers.js) so a video watched in an earlier
  // session shows correctly the first time it's reopened here.
  async function updateWatchedToggle() {
    if (!window.ANCHOR_AUTH) {
      watchedToggleEl.hidden = true;
      return;
    }
    const { session } = await window.ANCHOR_AUTH.getSession();
    const item = queue[currentIndex];
    if (!session || !item) {
      watchedToggleEl.hidden = true;
      return;
    }
    watchedToggleEl.hidden = false;
    const thumb = findThumbFor(item);
    renderWatchedToggle(markedIds.has(item.videoId) || Boolean(thumb?.parentElement.querySelector(".viewed-badge")));
  }

  // Manual override alongside the automatic 90%-threshold tracking. Note:
  // unmarking a still-playing, already-past-threshold video only sticks
  // until the next 5s poll tick, which will re-mark it — acceptable given
  // this is a convenience toggle, not the primary tracking mechanism.
  async function toggleWatched() {
    const item = queue[currentIndex];
    if (!item || !window.ANCHOR_AUTH) return;

    const nowWatched = !watchedToggleEl.classList.contains("is-watched");
    renderWatchedToggle(nowWatched);
    const thumb = findThumbFor(item);

    if (nowWatched) {
      markedIds.add(item.videoId);
      await markViewed(item.videoId);
      if (thumb && !thumb.parentElement.querySelector(".viewed-badge")) {
        thumb.insertAdjacentHTML("afterend", renderViewedBadge(item.videoId));
      }
    } else {
      markedIds.delete(item.videoId);
      const { session } = await window.ANCHOR_AUTH.getSession();
      if (session) {
        const { error } = await window.ANCHOR_AUTH.client.from("user_progress").delete().eq("youtube_video_id", item.videoId);
        if (error) console.error(error);
      }
      thumb?.parentElement.querySelector(".viewed-badge")?.remove();
    }
  }

  // Catches a close (or queue-advance) that happens shortly after crossing
  // the threshold but before the next 5s poll tick would have caught it.
  function finalizeWatchCheck() {
    if (!ytPlayer || currentIndex < 0) return;
    if (typeof ytPlayer.getCurrentTime === "function") {
      const current = ytPlayer.getCurrentTime();
      if (current > furthestReached) furthestReached = current;
    }
    markWatchedIfNeeded(false);
  }

  function renderUpNext() {
    upNextListEl.innerHTML = queue
      .map(
        (item, i) => `
      <button class="video-modal-upnext-item${i === currentIndex ? " active" : ""}" type="button" data-queue-index="${i}">
        <img src="https://img.youtube.com/vi/${escapeAttr(item.videoId)}/hqdefault.jpg" alt="" loading="lazy" />
        <span class="video-modal-upnext-info">
          <span class="video-modal-upnext-title">${escapeHtml(item.title)}</span>
          ${item.duration ? `<span class="video-modal-upnext-duration">${formatDuration(item.duration)}</span>` : ""}
        </span>
      </button>`
      )
      .join("");
  }

  window.AnchorPlayer = { openFromThumb, playAll };
})();
