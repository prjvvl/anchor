import type { VideoCandidate } from "./youtube.js";

// v1 quality gate — deliberately simple, tighten once we see real output.
const MIN_DURATION_SECONDS = 180; // excludes Shorts and low-effort clips
const MIN_VIEW_COUNT = 1000;
const MAX_AGE_DAYS = 14;

export function passesFilters(video: VideoCandidate): boolean {
  const ageDays = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24);

  return (
    video.durationSeconds >= MIN_DURATION_SECONDS &&
    video.viewCount >= MIN_VIEW_COUNT &&
    ageDays <= MAX_AGE_DAYS
  );
}
