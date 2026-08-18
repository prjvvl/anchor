import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";
import type { JudgedVideo } from "./gemini.js";

// Polyfill for Node < 22, where global WebSocket isn't available natively —
// @supabase/supabase-js requires it even though we never use realtime features.
if (!globalThis.WebSocket) {
  // @ts-expect-error - ws's WebSocket is not a 1:1 type match for the DOM WebSocket
  globalThis.WebSocket = WebSocket;
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

// Returns the subset of videoIds NOT already present in the DB —
// i.e. the ones actually worth sending to Gemini for judgment.
export async function filterAlreadySeen(videoIds: string[]): Promise<string[]> {
  if (videoIds.length === 0) return [];

  const { data, error } = await supabase.from("videos").select("youtube_video_id").in("youtube_video_id", videoIds);

  if (error) throw error;

  const seen = new Set((data ?? []).map((row) => row.youtube_video_id));
  return videoIds.filter((id) => !seen.has(id));
}

export async function insertVideos(videos: JudgedVideo[]): Promise<void> {
  if (videos.length === 0) return;

  const rows = videos.map((v) => ({
    youtube_video_id: v.videoId,
    channel_name: v.channelTitle,
    title: v.title,
    category: "other",
    duration: v.durationSeconds,
    active: true,
    metadata: {
      headline: v.headline,
      view_count: v.viewCount,
      published_at: v.publishedAt,
      ai_reasoning: v.reasoning,
    },
  }));

  const { error } = await supabase.from("videos").insert(rows);
  if (error) throw error;
}
