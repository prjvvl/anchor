import type { ChannelSource } from "../top-news/channels.js";

// Long-form conversations/interviews. Lex Fridman (already seeded as a
// static Misc course) and Joe Rogan/GaryVee (rejected for tone during that
// same research — see flo/2608-anchor/docs/260823-entertainment-misc-
// playlist-candidates.md) are deliberately excluded here to keep this
// rolling feed distinct from what's already covered elsewhere on the site.
export const channels: ChannelSource[] = [
  { id: "UC2D2CMWXMOVWx7giW1n3LIg", region: ["global"], language: "en" }, // Andrew Huberman (Huberman Lab)
  { id: "UCGq-a57w-aPwyi3pW7XLiHw", region: ["global"], language: "en" }, // The Diary Of A CEO
  { id: "UC_AnpBvnhXTcipgGEHLWoOg", region: ["global"], language: "en" }, // Conversations with Tyler
  { id: "UCpjlh0e319ksmoOD7bQFSiw", region: ["us", "global"], language: "en" }, // Rich Roll
  { id: "UCnC8SAZzQiBGYVSKZ_S3y4Q", region: ["in", "global"], language: "en" }, // Nikhil Kamath's "WTF is", India-based founder/investor conversations
  { id: "UCzwCEE_PchiBULMnAJqhGVg", region: ["in"], language: "hi" }, // Raj Shamani (Figuring Out) — Hindi-forward business/success interviews, Hinglish in practice
  { id: "UCPxMZIFE856tbTfdkdjzTSQ", region: ["in"], language: "hi" }, // BeerBiceps (The Ranveer Show) — long-form interviews, Hinglish in practice
];
