import type { VideoCandidate } from "./youtube.js";

export interface FilterThresholds {
  minDurationSeconds: number; // excludes Shorts and low-effort clips
  minViewCount?: number; // omit to skip this gate entirely — let Gemini judge popularity/substance instead
  maxAgeHours: number;
}

// v1 quality gate — deliberately simple, tighten once we see real output.
export const DEFAULT_THRESHOLDS: FilterThresholds = {
  minDurationSeconds: 180,
  minViewCount: 1000,
  maxAgeHours: 24,
};

export function passesFilters(video: VideoCandidate, thresholds: FilterThresholds = DEFAULT_THRESHOLDS): boolean {
  const ageHours = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);

  return (
    video.durationSeconds >= thresholds.minDurationSeconds &&
    (thresholds.minViewCount === undefined || video.viewCount >= thresholds.minViewCount) &&
    ageHours <= thresholds.maxAgeHours
  );
}
