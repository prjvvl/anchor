export interface ChannelSource {
  id: string; // channel ID, not handle/URL — find it via a channel's page
  // source or https://www.youtube.com/account_advanced when logged into it
  region: string[]; // ISO 3166-1 alpha-2 lowercase, or "global" — see note below
  language: string; // ISO 639-1 lowercase
}

// Trusted channels for the top-news job — deliberately diverse types (wire
// service, alt-perspective international, regional, business) so the same
// story is unlikely to get pulled from more than one of these at once.
//
// region is an array, not a single value: a channel whose own coverage
// mixes home-region news with international affairs (WION) gets both tags,
// since we tag at the channel level (no per-video classification) and a
// single tag would either hide its global-affairs content from a
// global-only viewer or hide its home-region content from a region-scoped
// one. Channels whose content isn't regional at all (AP, Al Jazeera
// English) just get {"global"}.
export const channels: ChannelSource[] = [
  { id: "UC52X5wxOL_s5yw0dQk7NtgA", region: ["global"], language: "en" }, // Associated Press — global wire service
  { id: "UCNye-wNBqNL5ZzHSJj3l8Bg", region: ["global"], language: "en" }, // Al Jazeera English — alt-perspective international
  { id: "UCZFMm1mMw0F81Z37aaEzTUA", region: ["in"], language: "en" }, // NDTV — Indian news (English)
  { id: "UC_gUM8rL-Lrg6O3adPW9K1g", region: ["in", "global"], language: "en" }, // WION — Indian news, global-affairs lens
  { id: "UCvJJ_dzjViJCoLf5uKUTwoA", region: ["us", "global"], language: "en" }, // CNBC — US network, global markets coverage
  { id: "UCknLrEdhRCp1aegoMqRaCZg", region: ["eu", "global"], language: "en" }, // DW News — German public broadcaster, sober European coverage
  { id: "UC1_E8NeF5QHY2dtdLRBCCLA", region: ["africa", "global"], language: "en" }, // Africanews — pan-African, multilingual outlet's English arm
];
