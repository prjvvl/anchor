import "dotenv/config";
import { runChannelJob } from "../runChannelJob.js";
import { channelIds } from "./channels.js";

runChannelJob({
  name: "top-news",
  category: "current-events",
  channelIds,
  // Job runs hourly — only look at uploads from the last hour so each run
  // covers fresh ground instead of re-scanning older uploads every time.
  thresholds: { minDurationSeconds: 180, minViewCount: 1000, maxAgeHours: 1 },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
