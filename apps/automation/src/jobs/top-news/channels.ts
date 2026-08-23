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
// one. Channels whose content isn't regional at all (AP) just get
// {"global"}. Al Jazeera English is tagged "middle-east" in addition to
// "global" since it's fundamentally a Middle East outlet in vantage point —
// deliberately reused instead of adding a new, lower-credibility
// Middle-East-specific channel (TRT World/Al Arabiya/Middle East Eye were
// all researched and rejected on MBFC credibility grounds).
//
// All channels here were credibility-checked against Media Bias/Fact Check
// (or equivalent) before adding, not just verified as real/active — see
// flo/2608-anchor session notes for the full audit. teleSUR English was
// researched and rejected as a Latin America candidate on these grounds
// (MBFC: "Questionable", Venezuela state-funded); CNN en Español passed.
//
// Adding a channel here also grows the live per-channel retention pool
// (archive/tables.ts keeps 12 rows per channel for this playlist) that
// apps/web/index.html pools into ONE query before splitting by region —
// that fetch's limit is sized off this array's length and must be bumped
// in lockstep (see the comment at its call site) or the newest rows from
// whichever region is least-recently-updated get silently truncated before
// they're even grouped — this happened once already, see the tables.ts
// comment on this same retention rule.
export const channels: ChannelSource[] = [
  { id: "UC52X5wxOL_s5yw0dQk7NtgA", region: ["global"], language: "en" }, // Associated Press — global wire service
  { id: "UCNye-wNBqNL5ZzHSJj3l8Bg", region: ["global", "middle-east"], language: "en" }, // Al Jazeera English — alt-perspective international, also covers Middle East
  { id: "UCZFMm1mMw0F81Z37aaEzTUA", region: ["in"], language: "en" }, // NDTV — Indian news (English)
  { id: "UC_gUM8rL-Lrg6O3adPW9K1g", region: ["in", "global"], language: "en" }, // WION — Indian news, global-affairs lens
  { id: "UCvJJ_dzjViJCoLf5uKUTwoA", region: ["us", "global"], language: "en" }, // CNBC — US network, global markets coverage
  { id: "UCknLrEdhRCp1aegoMqRaCZg", region: ["eu", "global"], language: "en" }, // DW News, German public broadcaster, sober European coverage
  { id: "UC1_E8NeF5QHY2dtdLRBCCLA", region: ["africa", "global"], language: "en" }, // Africanews, pan-African, multilingual outlet's English arm
  { id: "UCN7B-QD0Qgn2boVH5Q0pOWg", region: ["in", "global"], language: "hi" }, // BBC News Hindi — BBC's official Hindi-language channel
  { id: "UC83jt4dlz1Gjl58fzQrrKZg", region: ["asia", "global"], language: "en" }, // CNA (Channel News Asia), Singapore — high-credibility Asia coverage
  { id: "UCSPEjw8F2nQDtmUKPFNF7_A", region: ["asia", "global"], language: "en" }, // NHK World Japan — Japan's public broadcaster, high-credibility
  { id: "UCVgO39Bk5sMo66-6o6Spn6Q", region: ["au", "global"], language: "en" }, // ABC News (Australia) — Australia's public broadcaster, high-credibility
  { id: "UChqUTb7kYRX8-EiaN3XFrSQ", region: ["global"], language: "en" }, // Reuters — second global wire service alongside AP, same top-tier credibility class
  { id: "UCQfwfsi5VrQ8yKZ-UWmAEFg", region: ["eu", "global"], language: "en" }, // FRANCE 24 English — French public broadcaster, international remit, same tier as DW
  { id: "UC_lEiu6917IJz03TnntWUaQ", region: ["latin-america", "global"], language: "es" }, // CNN en Español — Latin America coverage, no prior candidate had passed a credibility check
];
