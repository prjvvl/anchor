import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.GCP_API_KEY,
});

export interface VideoCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
}

// Cheap call (1 quota unit) — resolves a channel's "uploads" playlist ID.
export async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const res = await youtube.channels.list({
    part: ["contentDetails"],
    id: [channelId],
  });
  const channel = res.data.items?.[0];
  return channel?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

// Cheap call (1 quota unit) — recent uploads from a channel, newest first.
export async function getRecentUploads(uploadsPlaylistId: string, maxResults = 5) {
  const res = await youtube.playlistItems.list({
    part: ["contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults,
  });
  return (res.data.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));
}

// 1 quota unit regardless of batch size — always batch video IDs together.
export async function getVideoDetails(videoIds: string[]): Promise<VideoCandidate[]> {
  if (videoIds.length === 0) return [];

  const res = await youtube.videos.list({
    part: ["snippet", "contentDetails", "statistics"],
    id: videoIds,
  });

  return (res.data.items ?? []).map((item) => ({
    videoId: item.id!,
    title: item.snippet?.title ?? "",
    channelTitle: item.snippet?.channelTitle ?? "",
    publishedAt: item.snippet?.publishedAt ?? "",
    durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? "PT0S"),
    viewCount: Number(item.statistics?.viewCount ?? 0),
  }));
}

// "PT1H2M10S" -> seconds
function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}
