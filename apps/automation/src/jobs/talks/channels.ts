import type { ChannelSource } from "../top-news/channels.js";

// Idea talks — single-topic talks, not curriculum-structured and not a
// conversation/interview format (that's jobs/podcasts). Daily cadence, same
// reasoning as jobs/explainers: institutional channels like these publish
// several times a week at most, not hourly-breaking-news volume.
export const channels: ChannelSource[] = [
  { id: "UCAuUUnT6oDeKwE6v1NGQxug", region: ["global"], language: "en" }, // TED
  { id: "UCsooa4yRKGN_zEE8iknghZA", region: ["global"], language: "en" }, // TED-Ed
  { id: "UCvQECJukTDE2i6aCoMnS-Vg", region: ["global"], language: "en" }, // Big Think
  { id: "UCvhsiQGy_zcNCiSbeXEjhLg", region: ["gb", "global"], language: "en" }, // The RSA — UK institutional talks, RSA Animate pedigree
];
