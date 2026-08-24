export interface ChannelSource {
  id: string; // channel ID, not handle/URL; find it via a channel's page
  // source or https://www.youtube.com/account_advanced when logged into it
  region: string[]; // ISO 3166-1 alpha-2 lowercase, or "global" (see note below)
  language: string; // ISO 639-1 lowercase
}

// Trusted channels for the top-news job, deliberately diverse types (wire
// service, alt-perspective international, regional, business) so the same
// story is unlikely to get pulled from more than one of these at once.
//
// "global" and a specific region are mutually exclusive on this list, not
// layered together: the homepage buckets every video into Global/home
// region/Rest of the World (see regionShelfKey/renderHomeShelves in
// index.html), and that logic treats ANY specific tag as taking priority
// over "global" on the same row. A channel used to get both tags (e.g. WION:
// in+global) to mean "home-region focus, but also covers global affairs";
// but real upload-frequency data showed most of those "also global" channels
// are actually high-volume regional feeds (WION posts ~200/day, Al Jazeera
// ~45/day), and tagging them "global" too just meant a prolific regional
// channel could flood the shared Global shelf. So classification is now
// frequency-driven: a channel is region:["global"] ONLY if it's both
// editorially international in scope AND low-frequency enough (roughly
// single digits/day) not to crowd out the other global-perspective
// channels; otherwise it's tagged with its specific region only, however
// international its vantage point (Al Jazeera is still "middle-east" only,
// same for the others below that lost their "global" tag in this pass;
// see flo/2608-anchor session notes for the full frequency audit and the
// before/after numbers).
//
// All channels here were credibility-checked against Media Bias/Fact Check
// (or equivalent) before adding, not just verified as real/active; see
// flo/2608-anchor session notes for the full audit. teleSUR English was
// researched and rejected as a Latin America candidate on these grounds
// (MBFC: "Questionable", Venezuela state-funded); CNN en Español passed.
// VOA News and an "Axios" candidate were both researched and rejected in
// the same pass this file's global roster was expanded: VOA's official
// @voanews channel is dormant (last upload March 2025); the "Axios"
// channel ID surfaced by search had 0 subscribers, almost certainly the
// wrong/decoy channel rather than the real one.
//
// Adding a channel here also grows the live per-channel retention pool
// (archive/tables.ts keeps 12 rows per channel for this playlist) that
// apps/web/index.html pools into ONE query before splitting by region;
// that fetch's limit is sized off this array's length and must be bumped
// in lockstep (see the comment at its call site) or the newest rows from
// whichever region is least-recently-updated get silently truncated before
// they're even grouped (this happened once already; see the tables.ts
// comment on this same retention rule).
export const channels: ChannelSource[] = [
  // --- Global: editorially international AND low-frequency (roughly
  // single digits/day); see the frequency-driven rule above. ---
  { id: "UC52X5wxOL_s5yw0dQk7NtgA", region: ["global"], language: "en" }, // Associated Press: global wire service, ~18.5/day
  { id: "UChqUTb7kYRX8-EiaN3XFrSQ", region: ["global"], language: "en" }, // Reuters: second global wire service, same top-tier credibility class, ~20/day
  { id: "UCvJJ_dzjViJCoLf5uKUTwoA", region: ["global"], language: "en" }, // CNBC: business/markets, ~1/day. Was tagged us+global; dropped "us" since it's now global-only
  { id: "UCSPEjw8F2nQDtmUKPFNF7_A", region: ["global"], language: "en" }, // NHK World Japan: Japan's public broadcaster, ~4/day. Was tagged asia+global; dropped "asia" since it's now global-only
  { id: "UCUMZ7gohGI9HcU9VNsr2FJQ", region: ["global"], language: "en" }, // Bloomberg Originals (@business): business/economics, ~0.5/day, MBFC Left-Center/High credibility
  { id: "UC0p5jTq6Xx_DosDFxVXnWaQ", region: ["global"], language: "en" }, // The Economist: economics/global affairs, ~1.5/day, MBFC Least Biased/High
  { id: "UCoUxsWakJucWg46KW5RsvPw", region: ["global"], language: "en" }, // Financial Times: economics, ~2/day, MBFC Least Biased/High
  { id: "UCL_A4jkwvKuMyToAPy3FQKQ", region: ["global"], language: "en" }, // Council on Foreign Relations: foreign policy analysis, ~0.9/day, MBFC Least Biased/High
  { id: "UCw-kH-Od73XDAt7qtH9uBYA", region: ["global"], language: "en" }, // World Economic Forum: global economic/policy analysis, ~0.36/day, MBFC Left-Center/High

  // --- Regional: home-country focus, whether or not the editorial vantage
  // point also touches international affairs (see the rule above). ---
  { id: "UCNye-wNBqNL5ZzHSJj3l8Bg", region: ["middle-east"], language: "en" }, // Al Jazeera English: ~45.5/day, too high-volume to also carry "global"
  { id: "UCZFMm1mMw0F81Z37aaEzTUA", region: ["in"], language: "en" }, // NDTV: Indian news (English), ~143.5/day
  { id: "UC_gUM8rL-Lrg6O3adPW9K1g", region: ["in"], language: "en" }, // WION: Indian news, ~201/day, dropped "global" (was flooding the shared Global shelf)
  { id: "UCknLrEdhRCp1aegoMqRaCZg", region: ["eu"], language: "en" }, // DW News, German public broadcaster, ~15/day
  { id: "UC1_E8NeF5QHY2dtdLRBCCLA", region: ["africa"], language: "en" }, // Africanews, pan-African, multilingual outlet's English arm, ~13.5/day
  { id: "UCN7B-QD0Qgn2boVH5Q0pOWg", region: ["in"], language: "hi" }, // BBC News Hindi: BBC's official Hindi-language channel, ~19/day
  { id: "UC83jt4dlz1Gjl58fzQrrKZg", region: ["asia"], language: "en" }, // CNA (Channel News Asia), Singapore, ~41/day
  { id: "UCVgO39Bk5sMo66-6o6Spn6Q", region: ["au"], language: "en" }, // ABC News (Australia), ~26/day
  { id: "UCQfwfsi5VrQ8yKZ-UWmAEFg", region: ["eu"], language: "en" }, // FRANCE 24 English: French public broadcaster, ~17/day
  { id: "UC_lEiu6917IJz03TnntWUaQ", region: ["latin-america"], language: "en" }, // CNN en Español: ~12.5/day. Tagged "en" not "es" deliberately: it's the only Spanish-language source on the site, so tagging it "es" made it invisible to English-filtered viewers by default (same trap as BBC News Hindi originally) with no real upside since there's no other Spanish content to co-exist with; surfacing it to English viewers matters more than an accurate language tag here.
];
