import type { ChannelSource } from "../top-news/channels.js";

// Science/tech/engineering explainer channels — deep dives and video
// essays, not curriculum-structured (that's Anchor Academy's job). Picked
// for consistent editorial rigor over raw upload volume; most of these
// publish only a few times a month, hence the daily (not hourly) cadence
// on this job — see jobs/explainers/index.ts.
export const channels: ChannelSource[] = [
  { id: "UCHnyfMqiRRG1u-2MsSQLbXA", region: ["global"], language: "en" }, // Veritasium
  { id: "UCsXVk37bltHxD1rDPwtNM8Q", region: ["global"], language: "en" }, // Kurzgesagt – In a Nutshell
  { id: "UC6nSFpj9HTCZ5t-N3Rm3-HA", region: ["global"], language: "en" }, // Vsauce
  { id: "UC7_gcs09iThXybpVgjHZ_7g", region: ["us", "global"], language: "en" }, // PBS Space Time
  { id: "UCR1IuLEqb6UEA_zQ81kwXfg", region: ["global"], language: "en" }, // Real Engineering
  { id: "UC1yNl2E66ZzKApQdRuTQ4tw", region: ["eu", "global"], language: "en" }, // Sabine Hossenfelder, skeptical/contrarian physics commentary, Germany
  { id: "UC-CSyyi47VX1lD9zyeABW3w", region: ["in"], language: "hi" }, // Dhruv Rathee — Hindi explainer/documentary channel, covers science, politics, and social issues
  { id: "UCbfYPyITQ-7l4upoX8nvctg", region: ["global"], language: "en" }, // Two Minute Papers — AI research paper breakdowns
  { id: "UC9-y-6csu5WGm29I7JiwpnA", region: ["global"], language: "en" }, // Computerphile — Brady Haran/Nottingham (same family as Numberphile), broad CS incl. AI
  { id: "UCNJ1Ymd5yFuUPtn21xtRbbw", region: ["global"], language: "en" }, // AI Explained — deep-dive analysis of major AI model releases/news, non-hype framing
  { id: "UCsBjURrPoezykLs9EqgamOA", region: ["global"], language: "en" }, // Fireship — fast-paced tech/AI news and code
];
