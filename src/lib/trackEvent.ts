// Real implementation (CTA-4): fire-and-forget analytics into public.user_events.
// Errors are always swallowed — analytics must never break UX.
// Callers do not await this; ProductCtaChip and future consumers fire it
// directly with no error handling.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "eup_session_id";

function getOrCreateSessionId(): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export async function trackEvent(
  event_type: string,
  event_data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const session_id = getOrCreateSessionId();
    const { data: authData } = await supabase.auth.getSession();
    const user_id = authData?.session?.user?.id ?? null;
    const page_path =
      typeof window !== "undefined" ? window.location.pathname : null;

    await (supabase as any).from("user_events").insert({
      user_id,
      session_id,
      event_type,
      event_data,
      page_path,
    });
  } catch {
    // swallow — analytics must never break UX
  }
}
