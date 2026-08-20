// Maps a `videos.playlist` slug (see supabase/migrations/0007_...) to how
// it's presented on the site. Add an entry here whenever a new playlist
// slug is introduced on the automation side.
//
// type: "rolling" playlists (like top-news) are the recency-driven daily
//   feed and aren't listed on courses.html. "course" playlists are browsable
//   there and get their own course.html page.
// ordered: true means the playlist has a meaningful idx (episode order),
//   so course.html shows an episode number badge on each card instead of
//   a view count.
window.ANCHOR_PLAYLISTS = {
  "top-news": {
    displayName: "Top News",
    description: "Hourly picks from trusted news channels, judged for substance over sensationalism.",
    type: "rolling",
  },
  "world-history": {
    displayName: "World History",
    description: "The complete Crash Course World History series, in order.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
  },
  "how-things-work": {
    displayName: "How Things Work",
    description: "Curated 3D-animated engineering explainers from Branch Education.",
    type: "course",
    ordered: false,
    source: "Branch Education",
  },
};
