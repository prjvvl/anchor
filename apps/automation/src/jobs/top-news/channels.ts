// Trusted channel IDs for the top-news job — deliberately diverse types
// (wire service, alt-perspective international, regional, business) so the
// same story is unlikely to get pulled from more than one of these at once.
// Channel ID, not handle/URL — find it via a channel's page source or
// https://www.youtube.com/account_advanced when logged into that channel.
export const channelIds: string[] = [
  "UC52X5wxOL_s5yw0dQk7NtgA", // Associated Press — global wire service
  "UCNye-wNBqNL5ZzHSJj3l8Bg", // Al Jazeera English — alt-perspective international
  "UCZFMm1mMw0F81Z37aaEzTUA", // NDTV — Indian news (English)
  "UC_gUM8rL-Lrg6O3adPW9K1g", // WION — Indian news, global-affairs lens
  "UCvJJ_dzjViJCoLf5uKUTwoA", // CNBC — markets/business
];
