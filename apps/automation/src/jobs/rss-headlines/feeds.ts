export interface FeedConfig {
  name: string;
  url: string;
  category: string; // grouping shown on the website
}

// Add more feeds here as needed — each needs a name (shown as the source),
// a feed URL, and a category (groups it in the website's sidebar).
export const feeds: FeedConfig[] = [
  // Breaking News — Google News dropped, coverage mostly overlapped with BBC
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "Breaking News" },

  // Ideas & Thinking
  { name: "Aeon", url: "https://aeon.co/feed.rss", category: "Ideas & Thinking" },
  { name: "The Marginalian", url: "https://www.themarginalian.org/feed/", category: "Ideas & Thinking" },

  // Self-Improvement
  { name: "Farnam Street", url: "https://fs.blog/feed/", category: "Self-Improvement" },
  { name: "James Clear", url: "https://jamesclear.com/feed", category: "Self-Improvement" },

  // Science
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Science" },
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml", category: "Science" },

  // Media Literacy
  { name: "FactCheck.org", url: "https://www.factcheck.org/feed/", category: "Media Literacy" },
  { name: "Poynter", url: "https://www.poynter.org/feed/", category: "Media Literacy" },

  // Tech & AI
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tech & AI" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech & AI" },

  // Economics
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "Economics" },

  // India
  { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", category: "India" },
];
