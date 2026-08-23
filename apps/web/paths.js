// Learning Paths: curated, ordered sequences through *existing* courses
// (see window.ANCHOR_PLAYLISTS in playlists.js) that give a newcomer a
// suggested on-ramp instead of the flat tier/department browse on
// courses.html. Purely a display-layer config, same spirit as
// ANCHOR_TIERS/ANCHOR_DEPARTMENTS there, no DB schema, no new tables.
// Progress is derived by reusing each listed course's own lesson/watched
// counts (fetchLessonIds/fetchViewedSet in helpers.js), not tracked
// separately per path.
//
// `courses` is an ordered array of playlist slugs (keys into
// window.ANCHOR_PLAYLISTS): the suggested order to work through them in.
window.ANCHOR_PATHS = {
  "understand-the-news": {
    displayName: "Understand the News",
    description: "Politics, economics, and geopolitics: why the news looks the way it does.",
    icon: "public",
    courses: ["cgp-grey", "government-politics", "economics", "economics-explained", "wendover-geography", "moral-foundations-politics"],
  },
  "media-literacy": {
    displayName: "Media Literacy Track",
    description: "Go from spotting a bad headline to understanding how real investigative journalism works.",
    icon: "fact_check",
    courses: ["above-the-noise", "navigating-digital-information", "media-literacy", "investigative-journalism", "retro-report-in-pursuit"],
  },
  "philosophy-101": {
    displayName: "Philosophy 101",
    description: "Everyday philosophy, a formal survey, then two landmark university courses.",
    icon: "psychology",
    courses: ["philosophy-fundamental", "philosophy", "yale-death", "justice-sandel"],
  },
  "science-foundations": {
    displayName: "Science Foundations",
    description: "A broad on-ramp into physics, biology, chemistry, and astronomy.",
    icon: "science",
    courses: ["physics-fundamental", "biology", "physics", "biology-crashcourse", "chemistry", "astronomy", "organic-chemistry", "spacetime-explainers", "classical-mechanics-mit"],
  },
  "math-and-cs": {
    displayName: "Math & CS Track",
    description: "From number curiosities to a real intro programming course.",
    icon: "calculate",
    courses: ["number-curiosities", "statistics", "computer-science", "linear-algebra", "intro-cs-mit"],
  },
  "history-through-time": {
    displayName: "History Through Time",
    description: "World history plus the threads that shape it: mythology, religion, and the parts often left out.",
    icon: "account_balance",
    courses: ["world-history", "world-history-2", "black-american-history", "world-mythology", "religions"],
  },
  "money-basics": {
    displayName: "Money Basics",
    description: "Practical personal finance and investing, no jargon.",
    icon: "savings",
    courses: ["personal-finance", "ben-felix-investing", "yc-startup-talks"],
  },
  "just-for-fun": {
    displayName: "Just for Fun",
    description: "No rigor progression here, just a sampler for when you want a break.",
    icon: "celebration",
    courses: ["chess-openings", "game-theory", "everyday-tech", "nilered", "colin-furze"],
  },
};
