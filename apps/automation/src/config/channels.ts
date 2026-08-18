// Trusted channels to pull new uploads from, grouped by category.
// Channel ID, not handle/URL — find it via a channel's page source or
// https://www.youtube.com/account_advanced when logged into that channel.
export type Category =
  | "money-literacy"
  | "scam-awareness"
  | "media-literacy"
  | "current-events"
  | "skill-building"
  | "health-literacy"
  | "safety-civic";

export const trustedChannels: Record<Category, string[]> = {
  "money-literacy": [],
  "scam-awareness": [],
  "media-literacy": [],
  "current-events": [],
  "skill-building": [],
  "health-literacy": [],
  "safety-civic": [],
};
