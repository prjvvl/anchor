import "dotenv/config";
import { trustedChannels } from "./config/channels.js";
import { getUploadsPlaylistId, getRecentUploads, getVideoDetails } from "./youtube.js";
import { passesFilters } from "./filters.js";

async function main() {
  if (!process.env.GCP_API_KEY) {
    throw new Error("Missing GCP_API_KEY in .env");
  }

  const totalChannels = Object.values(trustedChannels).flat().length;
  if (totalChannels === 0) {
    console.log("No trusted channels configured yet — add channel IDs to src/config/channels.ts");
    return;
  }

  for (const [category, channelIds] of Object.entries(trustedChannels)) {
    for (const channelId of channelIds) {
      const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
      if (!uploadsPlaylistId) {
        console.warn(`Could not resolve uploads playlist for channel ${channelId}`);
        continue;
      }

      const videoIds = await getRecentUploads(uploadsPlaylistId);
      const videos = await getVideoDetails(videoIds);
      const candidates = videos.filter(passesFilters);

      console.log(`\n[${category}] ${channelId} — ${candidates.length} candidate(s)`);
      for (const video of candidates) {
        console.log(`  - ${video.title} (${video.viewCount} views) https://youtu.be/${video.videoId}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
