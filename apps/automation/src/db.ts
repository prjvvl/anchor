import type { JudgedChannelVideo } from "./gemini.js";
import type { FeedItem } from "./rss.js";
import { supabase } from "./supabaseClient.js";

// Returns the subset of videoIds NOT already present in the DB —
// i.e. the ones actually worth sending to Gemini for judgment.
export async function filterAlreadySeen(videoIds: string[]): Promise<string[]> {
  if (videoIds.length === 0) return [];

  const { data, error } = await supabase.from("videos").select("youtube_video_id").in("youtube_video_id", videoIds);

  if (error) throw error;

  const seen = new Set((data ?? []).map((row) => row.youtube_video_id));
  return videoIds.filter((id) => !seen.has(id));
}

export async function insertChannelVideos(videos: JudgedChannelVideo[], category: string): Promise<void> {
  if (videos.length === 0) return;

  const rows = videos.map((v) => ({
    youtube_video_id: v.videoId,
    channel_name: v.channelTitle,
    title: v.title,
    category,
    duration: v.durationSeconds,
    active: true,
    metadata: {
      view_count: v.viewCount,
      published_at: v.publishedAt,
      ai_reasoning: v.reasoning,
    },
  }));

  const { error } = await supabase.from("videos").upsert(rows, { onConflict: "youtube_video_id", ignoreDuplicates: true });
  if (error) throw error;
}

// Upserts on the `guid` unique constraint instead of a pre-check query —
// re-fetching an item already in the DB (e.g. from an overlapping lookback
// window) is a no-op rather than an error.
export async function upsertHeadlines(items: FeedItem[]): Promise<void> {
  if (items.length === 0) return;

  const rows = items.map((h) => ({
    guid: h.guid,
    title: h.title,
    link: h.link,
    source: h.source,
    category: h.category,
    published_at: h.publishedAt || null,
    image_url: h.imageUrl ?? null,
  }));

  const { error } = await supabase.from("headlines").upsert(rows, { onConflict: "guid", ignoreDuplicates: true });
  if (error) throw error;
}
