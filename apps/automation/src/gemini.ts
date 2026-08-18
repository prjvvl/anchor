import { GoogleGenAI } from "@google/genai";
import type { Headline } from "./news/rss.js";
import type { VideoCandidate } from "./youtube.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.6-flash";

const HEADLINE_FILTER_SCHEMA = {
  type: "object",
  properties: {
    keep_indices: {
      type: "array",
      items: { type: "integer" },
      description: "0-based indices of headlines worth including",
    },
  },
  required: ["keep_indices"],
};

export async function filterHeadlines(headlines: Headline[]): Promise<Headline[]> {
  if (headlines.length === 0) return [];

  const list = headlines.map((h, i) => `${i}. ${h.title}`).join("\n");
  const prompt = `You are curating headlines for a daily news briefing that values substance over sensationalism.
From the list below, pick only headlines that are genuinely important for understanding what's happening in the world today.
Exclude: celebrity gossip, trivial local stories, clickbait, sports scores, and pure outrage-bait framing.

Headlines:
${list}

Return the 0-based indices of the headlines worth including.`;

  const response = await ai.interactions.create({
    model: MODEL,
    input: prompt,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: HEADLINE_FILTER_SCHEMA,
    },
  });

  if (!response.output_text) throw new Error("Gemini returned no output for headline filtering");

  const parsed = JSON.parse(response.output_text) as { keep_indices: number[] };
  return parsed.keep_indices.map((i) => headlines[i]).filter((h): h is Headline => Boolean(h));
}

export interface JudgeCandidate extends VideoCandidate {
  headline: string;
}

export interface JudgedVideo extends JudgeCandidate {
  reasoning: string;
}

const VIDEO_JUDGE_SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          reasoning: { type: "string" },
        },
        required: ["index", "reasoning"],
      },
    },
  },
  required: ["picks"],
};

export async function judgeVideos(candidates: JudgeCandidate[]): Promise<JudgedVideo[]> {
  if (candidates.length === 0) return [];

  const list = candidates
    .map(
      (c, i) =>
        `${i}. "${c.title}" by ${c.channelTitle} (${c.viewCount} views, ${c.durationSeconds}s) — covering: ${c.headline}`
    )
    .join("\n");

  const prompt = `You are curating YouTube videos for a daily news briefing that values substance over sensationalism.
Pick videos that substantively cover their topic with context, from credible/credentialed sources.
Reject: reaction/outrage content, clickbait titles, low-effort commentary with no real reporting.

Candidates:
${list}

For each video worth including, return its index and a one-sentence reason it was picked.`;

  const response = await ai.interactions.create({
    model: MODEL,
    input: prompt,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: VIDEO_JUDGE_SCHEMA,
    },
  });

  if (!response.output_text) throw new Error("Gemini returned no output for video judging");

  const parsed = JSON.parse(response.output_text) as { picks: Array<{ index: number; reasoning: string }> };

  return parsed.picks
    .map(({ index, reasoning }) => {
      const candidate = candidates[index];
      return candidate ? { ...candidate, reasoning } : null;
    })
    .filter((c): c is JudgedVideo => Boolean(c));
}
