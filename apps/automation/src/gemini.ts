import { GoogleGenAI } from "@google/genai";
import type { VideoCandidate } from "./youtube.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.6-flash";

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

export interface JudgedChannelVideo extends VideoCandidate {
  reasoning: string;
}

// Curates channel-driven candidates for a category — single batched call
// covering every candidate for the run, not one call per video.
export async function judgeChannelVideos(
  candidates: VideoCandidate[],
  categoryLabel: string
): Promise<JudgedChannelVideo[]> {
  if (candidates.length === 0) return [];

  const list = candidates
    .map(
      (c, i) => `${i}. "${c.title}" by ${c.channelTitle} (${c.viewCount} views, ${c.durationSeconds}s)`
    )
    .join("\n");

  const prompt = `You are curating YouTube videos for the "${categoryLabel}" category of a daily briefing that values substance over sensationalism.
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

  if (!response.output_text) throw new Error("Gemini returned no output for channel video judging");

  const parsed = JSON.parse(response.output_text) as { picks: Array<{ index: number; reasoning: string }> };

  return parsed.picks
    .map(({ index, reasoning }) => {
      const candidate = candidates[index];
      return candidate ? { ...candidate, reasoning } : null;
    })
    .filter((c): c is JudgedChannelVideo => Boolean(c));
}
