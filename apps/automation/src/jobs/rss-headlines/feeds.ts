export interface FeedConfig {
  name: string;
  url: string;
  category: string; // grouping shown on the website
  region: string[]; // ISO 3166-1 alpha-2 lowercase, or "global" — see the
  // note on channels.ts's ChannelSource for why this is an array
  language: string; // ISO 639-1 lowercase
}

// Add more feeds here as needed — each needs a name (shown as the source),
// a feed URL, a category (groups it in the website's sidebar), and a
// region/language pair (see ChannelSource in top-news/channels.ts for the
// array-region reasoning — same logic applies here).
export const feeds: FeedConfig[] = [
  // Breaking News — Google News dropped, coverage mostly overlapped with BBC
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "Breaking News", region: ["eu", "global"], language: "en" },

  // Ideas & Thinking
  { name: "Aeon", url: "https://aeon.co/feed.rss", category: "Ideas & Thinking", region: ["global"], language: "en" },
  { name: "The Marginalian", url: "https://www.themarginalian.org/feed/", category: "Ideas & Thinking", region: ["global"], language: "en" },
  { name: "Psyche", url: "https://psyche.co/feed", category: "Ideas & Thinking", region: ["global"], language: "en" },

  // Self-Improvement
  { name: "Farnam Street", url: "https://fs.blog/feed/", category: "Self-Improvement", region: ["global"], language: "en" },
  // James Clear dropped: the feed returns 200 but has served frozen,
  // stale content since Jan 2020 (confirmed via two independent URLs).
  { name: "Ness Labs", url: "https://nesslabs.com/feed", category: "Self-Improvement", region: ["global"], language: "en" },

  // Science
  // Old NASA URL (.../rss/dyn/breaking_news.rss) 301-redirects here now;
  // pointing at the real URL directly instead of depending on the redirect.
  { name: "NASA", url: "https://www.nasa.gov/news-release/feed/", category: "Science", region: ["global"], language: "en" },
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml", category: "Science", region: ["global"], language: "en" },
  { name: "Quanta Magazine", url: "https://www.quantamagazine.org/feed/", category: "Science", region: ["global"], language: "en" },
  { name: "Scientific American", url: "https://www.scientificamerican.com/platform/syndication/rss/", category: "Science", region: ["global"], language: "en" },

  // Media Literacy
  { name: "FactCheck.org", url: "https://www.factcheck.org/feed/", category: "Media Literacy", region: ["us"], language: "en" },
  { name: "Poynter", url: "https://www.poynter.org/feed/", category: "Media Literacy", region: ["us", "global"], language: "en" },
  { name: "Columbia Journalism Review", url: "https://www.cjr.org/feed", category: "Media Literacy", region: ["us", "global"], language: "en" },
  { name: "NiemanLab", url: "https://www.niemanlab.org/feed/", category: "Media Literacy", region: ["us", "global"], language: "en" },

  // Tech & AI
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tech & AI", region: ["global"], language: "en" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech & AI", region: ["us", "global"], language: "en" },

  // Economics
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "Economics", region: ["us", "global"], language: "en" },
  { name: "Marginal Revolution", url: "https://marginalrevolution.com/feed", category: "Economics", region: ["global"], language: "en" },

  // India
  { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", category: "India", region: ["in"], language: "en" },

  // World Affairs
  { name: "Guardian World", url: "https://www.theguardian.com/world/rss", category: "World Affairs", region: ["global"], language: "en" },

  // Health
  { name: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml", category: "Health", region: ["us", "global"], language: "en" },
  { name: "STAT News", url: "https://www.statnews.com/feed/", category: "Health", region: ["us", "global"], language: "en" },

  // Environment & Climate
  { name: "Inside Climate News", url: "https://insideclimatenews.org/feed/", category: "Environment & Climate", region: ["us", "global"], language: "en" },
  { name: "Grist", url: "https://grist.org/feed/", category: "Environment & Climate", region: ["us", "global"], language: "en" },

  // Long-form & Culture
  { name: "Longreads", url: "https://longreads.com/feed/", category: "Long-form & Culture", region: ["global"], language: "en" },
  { name: "The Atlantic", url: "https://www.theatlantic.com/feed/all/", category: "Long-form & Culture", region: ["us", "global"], language: "en" },
];
