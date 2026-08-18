import { google } from "googleapis";
import type { Headline } from "./rss.js";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.GCP_API_KEY,
});

export interface SearchResult {
  videoId: string;
  headline: string;
}

// 100 quota units per call — restricted to the last 24h so results are
// actually current coverage of the headline, not old unrelated uploads.
export async function searchForHeadline(headline: Headline, maxResults = 3): Promise<SearchResult[]> {
  const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const res = await youtube.search.list({
    part: ["snippet"],
    q: headline.title,
    type: ["video"],
    order: "relevance",
    publishedAfter,
    maxResults,
  });

  return (res.data.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))
    .map((videoId) => ({ videoId, headline: headline.title }));
}
