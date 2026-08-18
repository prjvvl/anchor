import "dotenv/config";
import { fetchHeadlines } from "./rss.js";
import { searchForHeadline } from "./youtubeSearch.js";
import { filterHeadlines, judgeVideos, type JudgeCandidate } from "../gemini.js";
import { filterAlreadySeen, insertVideos } from "../db.js";
import { getVideoDetails } from "../youtube.js";

async function run() {
  console.log("Fetching headlines...");
  const headlines = await fetchHeadlines();
  console.log(`  ${headlines.length} headlines fetched`);

  const approvedHeadlines = await filterHeadlines(headlines);
  console.log(`  ${approvedHeadlines.length} headlines approved by Gemini`);

  if (approvedHeadlines.length === 0) {
    console.log("No headlines worth searching. Done.");
    return;
  }

  const searchResults = (await Promise.all(approvedHeadlines.map((h) => searchForHeadline(h)))).flat();
  console.log(`  ${searchResults.length} candidate videos found`);

  const videoIds = [...new Set(searchResults.map((r) => r.videoId))];
  const newVideoIds = await filterAlreadySeen(videoIds);
  console.log(`  ${newVideoIds.length} new (not already in DB)`);

  if (newVideoIds.length === 0) {
    console.log("Nothing new to judge. Done.");
    return;
  }

  const details = await getVideoDetails(newVideoIds);
  const headlineByVideoId = new Map(searchResults.map((r) => [r.videoId, r.headline]));

  const candidates: JudgeCandidate[] = details.map((d) => ({
    ...d,
    headline: headlineByVideoId.get(d.videoId) ?? "",
  }));

  const picks = await judgeVideos(candidates);
  console.log(`  Gemini picked ${picks.length} video(s)`);

  await insertVideos(picks);

  console.log("Inserted into DB:");
  for (const p of picks) {
    console.log(`  - ${p.title} — ${p.reasoning}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
