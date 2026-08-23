import Parser from "rss-parser";

export interface FeedItem {
  guid: string;
  title: string;
  link: string;
  source: string;
  category: string;
  region: string[];
  language: string;
  publishedAt: string;
  imageUrl?: string;
}

interface RawItemExtras {
  enclosure?: { url?: string; type?: string };
  mediaThumbnail?: { $?: { url?: string } };
  mediaContent?: { $?: { url?: string; medium?: string } };
}

const parser = new Parser<Record<string, never>, RawItemExtras>({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
    ],
  },
});

export async function fetchFeed(feedUrl: string, source: string, category: string, region: string[], language: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .map((item) => ({
      guid: item.guid ?? item.link ?? "",
      title: item.title ?? "",
      link: item.link ?? "",
      source,
      category,
      region,
      language,
      publishedAt: item.isoDate ?? item.pubDate ?? "",
      imageUrl: extractImageUrl(item),
    }))
    .filter((item) => item.guid.length > 0 && item.title.length > 0);
}

// Not every feed embeds an image — Google News doesn't, BBC does (as
// media:thumbnail). Check the common places in order and take the first hit.
function extractImageUrl(item: RawItemExtras): string | undefined {
  if (item.enclosure?.url && (item.enclosure.type ?? "").startsWith("image")) {
    return item.enclosure.url;
  }
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }
  if (item.mediaContent?.$?.url && (!item.mediaContent.$.medium || item.mediaContent.$.medium === "image")) {
    return item.mediaContent.$.url;
  }
  return undefined;
}

export function withinLookback(publishedAt: string, lookbackMinutes: number): boolean {
  if (!publishedAt) return false;
  const ageMinutes = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60);
  return ageMinutes <= lookbackMinutes;
}
