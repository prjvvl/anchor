import { getUploadsPlaylistId, getRecentUploads, getVideoDetails, type VideoCandidate } from "../youtube.js";
import { passesFilters, DEFAULT_THRESHOLDS, type FilterThresholds } from "../filters.js";
import { filterAlreadySeen, insertChannelVideos } from "../db.js";
import { judgeChannelVideos } from "../gemini.js";
import type { ChannelSource } from "./top-news/channels.js";

export interface ChannelJobConfig {
  name: string; // used for logging
  category: string; // must match the `videos.category` taxonomy
  playlist: string; // which `videos.playlist` this job writes to
  channels: ChannelSource[];
  thresholds?: FilterThresholds;
}

// Shared runner for channel-driven discovery jobs: pull recent uploads from
// a trusted channel list, filter, judge with Gemini, write to Supabase.
// (The GitHub archive is handled separately, once a day, by jobs/archive/.)
// Add a new job by adding a jobs/<name>/ folder that calls this with its own
// category/channels/thresholds — no plumbing to repeat.
export async function runChannelJob(config: ChannelJobConfig): Promise<void> {
  const { name, category, playlist, channels, thresholds = DEFAULT_THRESHOLDS } = config;

  if (!process.env.GCP_API_KEY) {
    throw new Error("Missing GCP_API_KEY in .env");
  }

  if (channels.length === 0) {
    console.log(`[${name}] No channels configured yet — add channels to jobs/${name}/channels.ts`);
    return;
  }

  // Concurrent, not sequential: channels are independent, so one slow or
  // failing channel shouldn't delay or take down the rest.
  const channelResults = await Promise.allSettled(
    channels.map(async (channel) => {
      const uploadsPlaylistId = await getUploadsPlaylistId(channel.id);
      if (!uploadsPlaylistId) {
        console.warn(`[${name}] Could not resolve uploads playlist for channel ${channel.id}`);
        return [];
      }

      const videoIds = await getRecentUploads(uploadsPlaylistId);
      const videos = await getVideoDetails(videoIds);
      // Tagged here, per channel, rather than in youtube.ts, that module has
      // no notion of region/language, only this per-channel config does.
      const tagged = videos.map((v) => ({ ...v, region: channel.region, language: channel.language }));
      return tagged.filter((v) => passesFilters(v, thresholds));
    })
  );

  const allCandidates: VideoCandidate[] = [];
  for (const result of channelResults) {
    if (result.status === "fulfilled") {
      allCandidates.push(...result.value);
    } else {
      console.warn(`[${name}] Channel fetch failed: ${result.reason}`);
    }
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
