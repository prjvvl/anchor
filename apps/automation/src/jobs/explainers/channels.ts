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
];
