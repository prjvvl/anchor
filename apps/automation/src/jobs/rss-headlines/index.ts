import "dotenv/config";
import { fetchFeed, withinLookback, type FeedItem } from "../../rss.js";
import { upsertHeadlines } from "../../db.js";
import { feeds } from "./feeds.js";
import { notifyFailure } from "../../alert.js";

const JOB_NAME = "rss-headlines";
// Job runs every 90 minutes — a 100-minute lookback gives a buffer against
// a delayed cron trigger without needing a pre-check dedup query (the DB's
// unique constraint on `guid` + upsert-ignore handles the overlap).
const LOOKBACK_MINUTES = 100;

async function run() {
  const items: FeedItem[] = [];
  for (const feed of feeds) {
    try {
      const feedItems = await fetchFeed(feed.url, feed.name, feed.category, feed.region, feed.language);
      items.push(...feedItems.filter((item) => withinLookback(item.publishedAt, LOOKBACK_MINUTES)));
    } catch (err) {
      // One broken/unreachable feed shouldn't take down the other 13.
      console.warn(`[${JOB_NAME}] Failed to fetch "${feed.name}": ${(err as Error).message}`);
    }
  }

  console.log(`[${JOB_NAME}] ${items.length} item(s) within the last ${LOOKBACK_MINUTES} minutes`);
  if (items.length === 0) return;

  await upsertHeadlines(items);

  console.log(`[${JOB_NAME}] Upserted into Supabase:`);
  for (const item of items) {
    console.log(`  - [${item.source}] ${item.title}`);
  }
}

run().catch(async (err) => {
  console.error(err);
  await notifyFailure("rss-headlines", err);
  process.exit(1);
});
