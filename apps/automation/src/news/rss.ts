import Parser from "rss-parser";

export interface Headline {
  title: string;
  link: string;
  publishedAt: string;
}

const FEED_URL = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";

export async function fetchHeadlines(limit = 20): Promise<Headline[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(FEED_URL);

  return (feed.items ?? [])
    .slice(0, limit)
    .map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      publishedAt: item.pubDate ?? "",
    }))
    .filter((h) => h.title.length > 0);
}
