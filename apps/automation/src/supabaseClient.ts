import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

// Polyfill for Node < 22, where global WebSocket isn't available natively —
// @supabase/supabase-js requires it even though we never use realtime features.
if (!globalThis.WebSocket) {
  // @ts-expect-error - ws's WebSocket is not a 1:1 type match for the DOM WebSocket
  globalThis.WebSocket = WebSocket;
}

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
