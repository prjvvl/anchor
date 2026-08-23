import "dotenv/config";
import { fetchUnnotifiedFeedback, markNotified } from "./feedbackDigestDb.js";
import { notifyAdmin, notifyFailure } from "../../alert.js";

const JOB_NAME = "feedback-digest";

async function run() {
  const rows = await fetchUnnotifiedFeedback();

  // No email at all on a day with nothing new — same anti-noise reasoning
  // as ops-report existing only weekly, just applied to "silence" instead
  // of "cadence".
  if (rows.length === 0) {
    console.log(`[${JOB_NAME}] No new feedback — skipping email`);
    return;
  }

  const body = rows
    .map((row) => `From: ${row.email}\nAt: ${row.created_at}\n\n${row.message}`)
    .join("\n\n---\n\n");

  const sent = await notifyAdmin(`[Daily Anchor] ${rows.length} new feedback submission${rows.length > 1 ? "s" : ""}`, body);
  // Only mark rows notified once the email actually sent — notifyAdmin
  // never throws (it swallows its own errors), so without this check a
  // misconfigured secret or a Resend outage would still mark every row
  // notified, permanently losing that feedback from view since the next
  // run's `is("notified_at", null)` filter would never surface it again.
  // Left for the next scheduled run to retry rather than throwing here —
  // throwing would trigger notifyFailure, itself another admin email send
  // that's just as likely to fail for the same reason.
  if (!sent) {
    console.error(`[${JOB_NAME}] Admin email failed to send — leaving ${rows.length} row(s) unmarked for the next run`);
    return;
  }
  await markNotified(rows.map((row) => row.id));
  console.log(`[${JOB_NAME}] Sent digest for ${rows.length} submission(s)`);
}

run().catch(async (err) => {
  console.error(err);
  await notifyFailure(JOB_NAME, err);
  process.exit(1);
});
