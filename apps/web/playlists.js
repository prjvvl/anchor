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
// tier/department/subject: the Anchor Academy taxonomy (see
//   flo/2608-anchor/docs/260822-course-taxonomy-playlist-candidates.md).
//   Config-layer only, no DB schema involved — `category` on the videos
//   table already doubles as "Subject" and `playlist` as "Course", so this
//   is purely a display-grouping hint for courses.html/course.html.
//   Omitted for "rolling" playlists, which sit outside the tier ladder.

// Tier ladder, in display order. Extracurricular sits parallel to the
// academic ladder rather than being a "level" of it.
window.ANCHOR_TIERS = [
  { key: "fundamental", displayName: "Fundamental", icon: "spa" },
  { key: "standard", displayName: "Standard", icon: "menu_book" },
  { key: "advanced", displayName: "Advanced", icon: "engineering" },
  { key: "expert", displayName: "Expert", icon: "workspace_premium" },
  { key: "extracurricular", displayName: "Extracurricular", icon: "sports_esports" },
];

// Departments, keyed for lookup from a course entry's `department` field.
window.ANCHOR_DEPARTMENTS = {
  humanities: { displayName: "Humanities", icon: "account_balance" },
  sciences: { displayName: "Sciences", icon: "science" },
  stem: { displayName: "STEM / Engineering & Tech", icon: "precision_manufacturing" },
  "society-civics": { displayName: "Society & Civics", icon: "gavel" },
  "arts-culture": { displayName: "Arts & Culture", icon: "palette" },
  "media-literacy": { displayName: "Media & Information Literacy", icon: "fact_check" },
  // Extracurricular-only departments — informal groupings, not academic.
  "games-strategy": { displayName: "Games & Strategy", icon: "extension" },
  "tech-curiosities": { displayName: "Tech Curiosities", icon: "memory" },
  "places-culture": { displayName: "Places & Culture", icon: "public" },
  "food-culture": { displayName: "Food & Culture", icon: "restaurant" },
  "life-skills-making": { displayName: "Life Skills & Making", icon: "construction" },
};

window.ANCHOR_PLAYLISTS = {
  "top-news": {
    displayName: "Top News",
    description: "Hourly picks from trusted news channels, judged for substance over sensationalism.",
    type: "rolling",
  },

  // --- Humanities ---
  "world-history": {
    displayName: "World History",
    description: "The complete Crash Course World History series, in order.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "humanities",
    subject: "History",
  },
  philosophy: {
    displayName: "Philosophy",
    description: "Crash Course Philosophy: metaphysics, epistemology, value theory, and logic.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "humanities",
    subject: "Philosophy",
  },
  literature: {
    displayName: "Literature",
    description: "Crash Course Literature, Season 1: close reading and literary analysis.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "humanities",
    subject: "Literature",
  },
  religions: {
    displayName: "Religions",
    description: "Crash Course Religions: a survey of world religious traditions, made with Pew.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "humanities",
    subject: "Religion & Mythology",
  },

  // --- Sciences ---
  physics: {
    displayName: "Physics",
    description: "Crash Course Physics: mechanics, energy, and the rules that govern matter.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "sciences",
    subject: "Physics",
  },
  biology: {
    displayName: "Biology",
    description: "The Amoeba Sisters' Biology Learning Playlist: short, accessible animated lessons.",
    type: "course",
    ordered: true,
    source: "Amoeba Sisters",
    tier: "fundamental",
    department: "sciences",
    subject: "Biology",
  },
  chemistry: {
    displayName: "Chemistry",
    description: "Crash Course Chemistry: atoms, reactions, and the logic of the periodic table.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "sciences",
    subject: "Chemistry",
  },
  astronomy: {
    displayName: "Astronomy",
    description: "Crash Course Astronomy: the solar system, stars, and the scale of the universe.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "sciences",
    subject: "Earth & Space",
  },

  // --- STEM / Engineering & Tech ---
  "how-things-work": {
    displayName: "How Things Work",
    description: "Curated 3D-animated engineering explainers from Branch Education.",
    type: "course",
    ordered: false,
    source: "Branch Education",
    tier: "advanced",
    department: "stem",
    subject: "Engineering",
  },
  "computer-science": {
    displayName: "Computer Science",
    description: "Crash Course Computer Science: from logic gates to the modern internet.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "stem",
    subject: "Computer Science",
  },
  "linear-algebra": {
    displayName: "Essence of Linear Algebra",
    description: "3Blue1Brown's visual, intuition-first tour of linear algebra.",
    type: "course",
    ordered: true,
    source: "3Blue1Brown",
    tier: "advanced",
    department: "stem",
    subject: "Mathematics",
  },

  // --- Society & Civics ---
  economics: {
    displayName: "Economics",
    description: "Crash Course Economics: markets, incentives, and how economies actually work.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "society-civics",
    subject: "Economics",
  },
  "government-politics": {
    displayName: "U.S. Government and Politics",
    description: "Crash Course Government and Politics: how the American system actually functions.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "society-civics",
    subject: "Government & Law",
  },
  geography: {
    displayName: "Geography",
    description: "Crash Course Geography: physical and human geography, from maps to migration.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "society-civics",
    subject: "Geography",
  },
  "human-behavioral-biology": {
    displayName: "Human Behavioral Biology",
    description: "Robert Sapolsky's legendary Stanford lecture course on the biology behind behavior.",
    type: "course",
    ordered: true,
    source: "Stanford",
    tier: "expert",
    department: "society-civics",
    subject: "Psychology",
  },

  // --- Arts & Culture ---
  "art-history": {
    displayName: "Art History",
    description: "Crash Course Art History: how to actually look at, and think about, art.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "arts-culture",
    subject: "Art History",
  },
  "film-history": {
    displayName: "Film History",
    description: "Crash Course Film History: the evolution of cinema as an art form.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "arts-culture",
    subject: "Film",
  },
  "music-theory": {
    displayName: "Music Theory Deep Dives",
    description: "12tone's animated breakdowns of music theory and song analysis.",
    type: "course",
    ordered: false,
    source: "12tone",
    tier: "advanced",
    department: "arts-culture",
    subject: "Music",
  },

  // --- Media & Information Literacy ---
  "navigating-digital-information": {
    displayName: "Navigating Digital Information",
    description: "Crash Course's guide to evaluating sources and thinking critically online, made with Poynter and Stanford.",
    type: "course",
    ordered: true,
    source: "CrashCourse",
    tier: "standard",
    department: "media-literacy",
    subject: "Critical Thinking",
  },

  // --- Extracurricular ---
  "chess-openings": {
    displayName: "Chess Openings",
    description: "GothamChess's rundown of the openings every player should know.",
    type: "course",
    ordered: false,
    source: "GothamChess",
    tier: "extracurricular",
    department: "games-strategy",
    subject: "Chess",
  },
  "everyday-tech": {
    displayName: "Everyday Tech, Explained",
    description: "Technology Connections' deep dives into the mundane technology you use every day.",
    type: "course",
    ordered: false,
    source: "Technology Connections",
    tier: "extracurricular",
    department: "tech-curiosities",
    subject: "Everyday Tech",
  },
  "countries-az": {
    displayName: "Countries A-Z",
    description: "Geography Now's complete country-by-country tour of the world.",
    type: "course",
    ordered: true,
    source: "Geography Now",
    tier: "extracurricular",
    department: "places-culture",
    subject: "World Geography",
  },
  "home-cooking": {
    displayName: "But Cheaper",
    description: "Joshua Weissman recreates famous foods for less, using real technique, not just recipes.",
    type: "course",
    ordered: false,
    source: "Joshua Weissman",
    tier: "extracurricular",
    department: "food-culture",
    subject: "Home Cooking",
  },
  blacksmithing: {
    displayName: "Blacksmithing Projects",
    description: "Alec Steele's hands-on bladesmithing and blacksmithing project videos.",
    type: "course",
    ordered: false,
    source: "Alec Steele",
    tier: "extracurricular",
    department: "life-skills-making",
    subject: "Craft & Metalworking",
  },
};
