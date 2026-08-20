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

const DIGEST_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    intro: { type: "string" },
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["video", "headline"] },
          index: { type: "integer" },
          blurb: { type: "string" },
        },
        required: ["type", "index", "blurb"],
      },
    },
  },
  required: ["subject", "intro", "picks"],
};

export interface DigestVideoCandidate {
  title: string;
  channelName: string | null;
  category: string;
}

export interface DigestHeadlineCandidate {
  title: string;
  source: string | null;
  category: string;
}

export interface DigestPick {
  type: "video" | "headline";
  index: number;
  blurb: string;
}

export interface CuratedDigest {
  subject: string;
  intro: string;
  picks: DigestPick[];
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

// Curates today's newsletter: given the pool of fresh videos and headlines,
// picks the best handful and writes the subject/intro/blurb copy in one
// call — content selection AND editorial voice are both the model's call,
// not a hardcoded "top N by recency" rule.
export async function curateDigest(
  videos: DigestVideoCandidate[],
  headlines: DigestHeadlineCandidate[]
): Promise<CuratedDigest> {
  const videoLines = videos
    .map((v, i) => `V${i}. "${v.title}" — ${v.channelName ?? "unknown channel"} (${v.category})`)
    .join("\n");
  const headlineLines = headlines
    .map((h, i) => `H${i}. "${h.title}" — ${h.source ?? "unknown source"} (${h.category})`)
    .join("\n");

  const prompt = `You are writing today's "Daily Anchor" email newsletter — a short, editorially curated digest for people who want to stay informed without doomscrolling. Substance over sensationalism; diversity of topic over raw quantity. It's fine to pick fewer items than are available if that's all that's genuinely worth including today.

Candidate videos:
${videoLines || "(none)"}

Candidate headlines:
${headlineLines || "(none)"}

Pick the best handful worth including today (skip anything redundant, low-substance, or clickbait). Write a short subject line for the email, a 1-2 sentence friendly intro, and for each pick a one-sentence blurb explaining why it's worth the reader's time.

Reference picks by their exact label from the lists above: use type "video" with the number after "V" as index, or type "headline" with the number after "H" as index.`;

  const response = await ai.interactions.create({
    model: MODEL,
    input: prompt,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: DIGEST_SCHEMA,
    },
  });

  if (!response.output_text) throw new Error("Gemini returned no output for digest curation");

  return JSON.parse(response.output_text) as CuratedDigest;
}
