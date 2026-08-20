import { supabase } from "../../supabaseClient.js";

export interface VideoRow {
  id: string;
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  category: string;
}

export interface HeadlineRow {
  id: string;
  title: string;
  link: string;
  source: string | null;
  category: string;
}

export interface Subscriber {
  email: string;
  unsubscribe_token: string;
}

// >24h buffer against a delayed cron trigger, same reasoning as the RSS
// job's lookback window — better to occasionally re-consider an item than
// silently skip one because the job ran a bit late.
const LOOKBACK_HOURS = 26;
const HEADLINE_POOL_LIMIT = 80;

export async function fetchDigestPool(): Promise<{ videos: VideoRow[]; headlines: HeadlineRow[] }> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const [videosRes, headlinesRes] = await Promise.all([
    supabase
      .from("videos")
      .select("id, youtube_video_id, title, channel_name, category")
      .eq("active", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("headlines")
      .select("id, title, link, source, category")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(HEADLINE_POOL_LIMIT),
  ]);

  if (videosRes.error) throw videosRes.error;
  if (headlinesRes.error) throw headlinesRes.error;

  return { videos: videosRes.data ?? [], headlines: headlinesRes.data ?? [] };
}

export async function fetchSubscribers(): Promise<Subscriber[]> {
  const { data, error } = await supabase.from("subscribers").select("email, unsubscribe_token");
  if (error) throw error;
  return data ?? [];
}

export async function hasSentToday(sentDate: string): Promise<boolean> {
  const { data, error } = await supabase.from("newsletter_log").select("sent_date").eq("sent_date", sentDate).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function logSend(sentDate: string, recipientCount: number): Promise<void> {
  const { error } = await supabase.from("newsletter_log").insert({ sent_date: sentDate, recipient_count: recipientCount });
  if (error) throw error;
}
