import "dotenv/config";
import { runChannelJob } from "../runChannelJob.js";
import { channelIds } from "./channels.js";
import { notifyFailure } from "../../alert.js";

runChannelJob({
  name: "top-news",
  category: "current-events",
  channelIds,
  // Job runs hourly — only look at uploads from the last hour so each run
  // covers fresh ground instead of re-scanning older uploads every time.
  // No view-count gate: Gemini sees each candidate's view count in the
  // judging prompt and decides what's worth surfacing, rather than a
  // hardcoded threshold silently dropping fresh-but-not-yet-popular videos.
  thresholds: { minDurationSeconds: 180, maxAgeHours: 1 },
}).catch(async (err) => {
  console.error(err);
  await notifyFailure("top-news", err);
  process.exit(1);
});
