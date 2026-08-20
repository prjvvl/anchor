import { getUploadsPlaylistId, getRecentUploads, getVideoDetails, type VideoCandidate } from "../youtube.js";
import { passesFilters, DEFAULT_THRESHOLDS, type FilterThresholds } from "../filters.js";
import { filterAlreadySeen, insertChannelVideos } from "../db.js";
import { judgeChannelVideos } from "../gemini.js";

export interface ChannelJobConfig {
  name: string; // used for logging
  category: string; // must match the `videos.category` taxonomy
  playlist: string; // which `videos.playlist` this job writes to
  channelIds: string[];
  thresholds?: FilterThresholds;
}

// Shared runner for channel-driven discovery jobs: pull recent uploads from
// a trusted channel list, filter, judge with Gemini, write to Supabase.
// (The GitHub archive is handled separately, once a day, by jobs/archive/.)
// Add a new job by adding a jobs/<name>/ folder that calls this with its own
// category/channels/thresholds — no plumbing to repeat.
export async function runChannelJob(config: ChannelJobConfig): Promise<void> {
  const { name, category, playlist, channelIds, thresholds = DEFAULT_THRESHOLDS } = config;

  if (!process.env.GCP_API_KEY) {
    throw new Error("Missing GCP_API_KEY in .env");
  }

  if (channelIds.length === 0) {
    console.log(`[${name}] No channels configured yet — add channel IDs to jobs/${name}/channels.ts`);
    return;
  }

  const allCandidates: VideoCandidate[] = [];
  for (const channelId of channelIds) {
    const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
    if (!uploadsPlaylistId) {
      console.warn(`[${name}] Could not resolve uploads playlist for channel ${channelId}`);
      continue;
    }

    const videoIds = await getRecentUploads(uploadsPlaylistId);
    const videos = await getVideoDetails(videoIds);
    allCandidates.push(...videos.filter((v) => passesFilters(v, thresholds)));
  }

  console.log(`[${name}] ${allCandidates.length} candidate(s) after filtering`);
  if (allCandidates.length === 0) return;

  const newVideoIds = new Set(await filterAlreadySeen(allCandidates.map((v) => v.videoId), playlist));
  const newCandidates = allCandidates.filter((v) => newVideoIds.has(v.videoId));
  console.log(`[${name}] ${newCandidates.length} new (not already in DB)`);
  if (newCandidates.length === 0) return;

  const picks = await judgeChannelVideos(newCandidates, category);
  console.log(`[${name}] Gemini picked ${picks.length} video(s)`);
  if (picks.length === 0) return;

  await insertChannelVideos(picks, category, playlist);

  console.log(`[${name}] Inserted into DB:`);
  for (const p of picks) {
    console.log(`  - ${p.title} — ${p.reasoning}`);
  }
}
