export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_LIMIT = 100; // Resend's hard cap per /emails/batch call

// Chunked even though the free-tier daily cap (100 emails/day) already
// bounds a single run in practice — this stops the job from hard-failing
// the day a paid plan lifts that cap and the subscriber list grows past it.
export async function sendBatch(messages: EmailMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing NEWSLETTER_FROM_EMAIL");

  for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
    const chunk = messages.slice(i, i + BATCH_LIMIT);
    const payload = chunk.map((m) => ({ from, to: m.to, subject: m.subject, html: m.html }));

    const res = await fetch(RESEND_BATCH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Resend batch send failed: ${res.status} ${await res.text()}`);
    }
  }
}
