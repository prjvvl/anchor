import { supabase } from "../../supabaseClient.js";

export interface FeedbackRow {
  id: string;
  email: string;
  message: string;
  created_at: string;
}

// Capped — feedback submissions are low-volume by design (a signed-in-only
// form on one page), so 500 is already a generous ceiling that shouldn't
// realistically be hit. Without a cap, an extended outage (bad secret,
// Resend down) letting the unnotified backlog grow unbounded could push
// markNotified's `ids` list past PostgREST/URL length limits — same
// reasoning as the `in.()` cap on apps/web/index.html's loadContinueLearning.
// Oldest-first ordering means a backlog beyond the cap just carries over
// cleanly to the next day's run rather than losing anything.
export async function fetchUnnotifiedFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, email, message, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw error;
  return data;
}

// Updates by explicit id list (captured from the fetch above), not a
// blanket `is("notified_at", null)` update — a row inserted after the
// fetch ran but before this update would otherwise get silently marked
// notified without ever being included in an email.
export async function markNotified(ids: string[]): Promise<void> {
  const { error } = await supabase.from("feedback").update({ notified_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
}
