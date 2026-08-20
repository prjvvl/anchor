import { createClient } from "jsr:@supabase/supabase-js@2";

// One-click unsubscribe target linked from every newsletter email. Deletes
// the subscriber row matching the token embedded in that email's link —
// no login, no confirmation step, per standard unsubscribe UX expectations.
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // Supabase Edge Functions rewrite any text/html response to text/plain
  // on standard plans (no custom domain), so there's no point trying to
  // serve a styled confirmation page here — plain text it is.
  const page = (message: string) => new Response(`Daily Anchor\n\n${message}`, { headers: { "content-type": "text/plain; charset=utf-8" } });

  if (!token) return page("Missing unsubscribe token.");

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
  // Edge Function by Supabase — no manual secret configuration needed.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error, count } = await supabase.from("subscribers").delete({ count: "exact" }).eq("unsubscribe_token", token);

  if (error) return page("Something went wrong — please try again later.");
  if (!count) return page("This link has already been used or is invalid.");

  return page("You've been unsubscribed. Sorry to see you go.");
});
