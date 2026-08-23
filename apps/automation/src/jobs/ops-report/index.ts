import "dotenv/config";
import { fetchOpsSnapshot } from "./opsReportDb.js";
import { notifyAdmin } from "../../alert.js";
import { runJob } from "../../runJob.js";

const JOB_NAME = "ops-report";
// Weekly, not daily — a stream of daily internal-metrics email would be the
// same kind of noise this whole project exists to avoid.
const PERIOD_DAYS = 7;

async function run() {
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const snapshot = await fetchOpsSnapshot(since.toISOString());

  const body = `Daily Anchor — ops report (last ${PERIOD_DAYS} days)

Videos added: ${snapshot.videosAdded}
Headlines added: ${snapshot.headlinesAdded}
Newsletter sends: ${snapshot.newsletterSends} (${snapshot.newsletterRecipients} total recipient-sends)
Current subscribers: ${snapshot.subscriberCount}`;

  await notifyAdmin("[Daily Anchor] Weekly ops report", body);
  console.log(`[${JOB_NAME}] Sent weekly report`);
}

runJob(JOB_NAME, run);
