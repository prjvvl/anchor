import "dotenv/config";
import { runChannelJob } from "../runChannelJob.js";
import { channels } from "./channels.js";
import { runJob } from "../../runJob.js";

runJob("explainers", () =>
  runChannelJob({
    name: "explainers",
    category: "Explainers & Deep Dives",
    playlist: "explainers",
    channels,
    // Runs once daily, not hourly like top-news — these channels publish a
    // few times a month at most, so an hourly check would burn API quota
    // finding nothing new almost every run. 30h (not 24h) gives a small
    // buffer against a delayed/skipped GitHub Actions run; filterAlreadySeen
    // dedupes so overlap is harmless.
    thresholds: { minDurationSeconds: 180, minViewCount: 1000, maxAgeHours: 30 },
  })
);
