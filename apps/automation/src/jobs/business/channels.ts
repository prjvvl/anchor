import type { ChannelSource } from "../top-news/channels.js";

// Founder/business channels — talks, deep dives, and case studies, not
// tactical growth-hacking content. Excludes channels already flagged as a
// tone mismatch for this site during Anchor Academy's Misc research
// (Startup Grind, GaryVee, Tim Ferriss — see
// flo/2608-anchor/docs/260823-entertainment-misc-playlist-candidates.md).
export const channels: ChannelSource[] = [
  { id: "UCQ-rrUCsJLNjFdPtKq0YOfA", region: ["global"], language: "en" }, // Founders (David Senra) — book-based founder/company histories
  { id: "UCKZozRVHRYsYHGEyNKuhhdA", region: ["in", "global"], language: "en" }, // Think School — Indian business case-study deep dives
  { id: "UCyFqFYfTW2VoIQKylJ04Rtw", region: ["us", "global"], language: "en" }, // Acquired — company/M&A history
];
