import "dotenv/config";
import { runChannelJob } from "../runChannelJob.js";
import { channels } from "./channels.js";
import { notifyFailure } from "../../alert.js";

runChannelJob({
  name: "podcasts",
  category: "Long-form Conversations",
  playlist: "podcasts",
  channels,
  // Daily cadence, same reasoning as jobs/explainers — see that file's
  // comment. 30h window for cron-delay buffer, dedup handles overlap.
  thresholds: { minDurationSeconds: 180, minViewCount: 1000, maxAgeHours: 30 },
}).catch(async (err) => {
  console.error(err);
  await notifyFailure("podcasts", err);
  process.exit(1);
});
