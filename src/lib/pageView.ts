// pageView — fire a page_view to user_events via the track-geo edge function.
// Country/region are derived from request headers server-side (cf-ipcountry
// / cf-region-code). RAW IPs are never persisted.
//
// Fire-and-forget: analytics must never break UX.
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "eup_session_id";
const LAST_PATH_KEY = "eup_last_page_view";

function sessionId(): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch { return null; }
}

export async function firePageView(path: string): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    // Dedupe consecutive identical paths within the same session tick.
    const last = window.sessionStorage.getItem(LAST_PATH_KEY);
    if (last === path) return;
    window.sessionStorage.setItem(LAST_PATH_KEY, path);
    await supabase.functions.invoke("track-geo", {
      body: {
        event_type: "page_view",
        page_path: path,
        session_id: sessionId(),
      },
    });
  } catch { /* swallow */ }
}
