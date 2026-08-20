import { supabase } from "../../supabaseClient.js";

export interface OpsSnapshot {
  videosAdded: number;
  headlinesAdded: number;
  subscriberCount: number;
  newsletterSends: number;
  newsletterRecipients: number;
}

export async function fetchOpsSnapshot(sinceIso: string): Promise<OpsSnapshot> {
  const [videos, headlines, subscribers, sends] = await Promise.all([
    supabase.from("videos").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("headlines").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase.from("newsletter_log").select("recipient_count").gte("sent_at", sinceIso),
  ]);

  if (videos.error) throw videos.error;
  if (headlines.error) throw headlines.error;
  if (subscribers.error) throw subscribers.error;
  if (sends.error) throw sends.error;

  return {
    videosAdded: videos.count ?? 0,
    headlinesAdded: headlines.count ?? 0,
    subscriberCount: subscribers.count ?? 0,
    newsletterSends: sends.data?.length ?? 0,
    newsletterRecipients: (sends.data ?? []).reduce((sum, row) => sum + row.recipient_count, 0),
  };
}
