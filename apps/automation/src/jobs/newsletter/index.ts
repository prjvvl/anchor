import "dotenv/config";
import { curateDigest } from "../../gemini.js";
import { fetchDigestPool, fetchSubscribers, hasSentToday, logSend } from "./newsletterDb.js";
import { resolvePicks, renderDigestEmail } from "./template.js";
import { sendBatch } from "./resend.js";
import { runJob } from "../../runJob.js";

const JOB_NAME = "newsletter";

async function run() {
  const sentDate = istDateString();

  if (await hasSentToday(sentDate)) {
    console.log(`[${JOB_NAME}] Already sent for ${sentDate} — skipping (retriggered run)`);
    return;
  }

  const subscribers = await fetchSubscribers();
  if (subscribers.length === 0) {
    console.log(`[${JOB_NAME}] No subscribers yet — skipping`);
    return;
  }

  const { videos, headlines } = await fetchDigestPool();
  if (videos.length === 0 && headlines.length === 0) {
    console.log(`[${JOB_NAME}] No fresh content in the lookback window — skipping`);
    return;
  }

  const digest = await curateDigest(
    videos.map((v) => ({ title: v.title, channelName: v.channel_name, category: v.category })),
    headlines.map((h) => ({ title: h.title, source: h.source, category: h.category }))
  );

  const picks = resolvePicks(digest, videos, headlines);
  if (picks.length === 0) {
    console.log(`[${JOB_NAME}] Gemini selected nothing worth sending today — skipping`);
    return;
  }

  const unsubscribeBase = process.env.UNSUBSCRIBE_BASE_URL;
  if (!unsubscribeBase) throw new Error("Missing UNSUBSCRIBE_BASE_URL");

  const dateLabel = istDateLabel();
  const messages = subscribers.map((s) => ({
    to: s.email,
    subject: digest.subject,
    html: renderDigestEmail(digest, picks, `${unsubscribeBase}?token=${s.unsubscribe_token}`, dateLabel),
  }));

  await sendBatch(messages);
  await logSend(sentDate, subscribers.length);

  console.log(`[${JOB_NAME}] Sent "${digest.subject}" (${picks.length} picks) to ${subscribers.length} subscriber(s)`);
}

// Send date is the IST calendar day, matching the archive job's convention
// — the "one send per day" guard should track the day a human reader would
// perceive, not whatever UTC date the runner happens to execute in.
function istDateString(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  return nowIst.toISOString().slice(0, 10);
}

function istDateLabel(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  return nowIst.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

runJob("newsletter", run);
