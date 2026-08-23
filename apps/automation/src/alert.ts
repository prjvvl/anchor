// Sends operational email to the maintainer (job failures, periodic ops
// reports) — separate from the reader-facing newsletter, but reuses the
// same Resend account/verified sender since there's no reason to stand up
// a second one for internal mail.
//
// Returns whether the email actually sent, rather than throwing — existing
// callers (notifyFailure below, ops-report) don't need to know and just
// ignore it, but a caller with state that depends on the email having gone
// out (feedback-digest marking rows notified) needs to be able to check
// before acting on that assumption.
export async function notifyAdmin(subject: string, body: string): Promise<boolean> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NEWSLETTER_FROM_EMAIL;
    const to = process.env.ADMIN_EMAIL;

    if (!apiKey || !from || !to) {
      console.warn("[alert] Missing RESEND_API_KEY / NEWSLETTER_FROM_EMAIL / ADMIN_EMAIL — skipping admin email");
      return false;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: body }),
    });

    if (!res.ok) {
      console.error(`[alert] Failed to send admin email: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    // Never let a broken alert path take down the job's own error handling.
    console.error("[alert] Failed to send admin email:", err);
    return false;
  }
}

export async function notifyFailure(jobName: string, err: unknown): Promise<void> {
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
  await notifyAdmin(`[Daily Anchor] ${jobName} failed`, detail);
}
