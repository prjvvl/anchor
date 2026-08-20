import type { JudgedChannelVideo } from "./gemini.js";
import type { FeedItem } from "./rss.js";
import { supabase } from "./supabaseClient.js";

// Returns the subset of videoIds NOT already present in the given playlist,
// i.e. the ones actually worth sending to Gemini for judgment. Scoped per
// playlist since the same video can legitimately belong to more than one.
export async function filterAlreadySeen(videoIds: string[], playlist: string): Promise<string[]> {
  if (videoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("videos")
    .select("youtube_video_id")
    .eq("playlist", playlist)
    .in("youtube_video_id", videoIds);

  if (error) throw error;

  const seen = new Set((data ?? []).map((row) => row.youtube_video_id));
  return videoIds.filter((id) => !seen.has(id));
}

export async function insertChannelVideos(videos: JudgedChannelVideo[], category: string, playlist: string): Promise<void> {
  if (videos.length === 0) return;

  const rows = videos.map((v) => ({
    youtube_video_id: v.videoId,
    channel_name: v.channelTitle,
    title: v.title,
    category,
    playlist,
    duration: v.durationSeconds,
    published_at: v.publishedAt,
    views: v.viewCount,
    active: true,
    metadata: {
      ai_reasoning: v.reasoning,
    },
  }));

  const { error } = await supabase.from("videos").upsert(rows, { onConflict: "youtube_video_id,playlist", ignoreDuplicates: true });
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
