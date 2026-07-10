// Real implementation (CTA-4): fire-and-forget analytics into public.user_events.
// Errors are always swallowed — analytics must never break UX.
// Callers do not await this; ProductCtaChip and future consumers fire it
// directly with no error handling.
//
// Courier-A extension (2026-07-10): UTM persistence + geography derivation.
// On first load carrying utm_* params, we snapshot them into sessionStorage
// (alongside the existing session id) and attach them to every subsequent
// trackEvent payload as utm/geography fields. Geography is derived from the
// utm_campaign prefix — campaigns are named us-* / eu-* by convention.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "eup_session_id";
const UTM_KEY = "eup_utm_v1";
const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmSnapshot = Partial<Record<(typeof UTM_FIELDS)[number], string>> & {
  geography?: "us" | "eu" | null;
};

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

function deriveGeography(campaign?: string): "us" | "eu" | null {
  if (!campaign) return null;
  const c = campaign.toLowerCase();
  if (c.startsWith("us-") || c === "us") return "us";
  if (c.startsWith("eu-") || c === "eu") return "eu";
  return null;
}

/**
 * Capture UTM parameters from the current URL into sessionStorage on first
 * load. Idempotent — if a snapshot already exists for the session, we keep
 * the earliest one so first-touch attribution wins. Safe to call from app
 * bootstrap (main.tsx) on every navigation.
 */
export function captureUtmFromLocation(): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    if (window.sessionStorage.getItem(UTM_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const snapshot: UtmSnapshot = {};
    let any = false;
    for (const field of UTM_FIELDS) {
      const v = params.get(field);
      if (v) {
        snapshot[field] = v;
        any = true;
      }
    }
    if (!any) return;
    snapshot.geography = deriveGeography(snapshot.utm_campaign);
    window.sessionStorage.setItem(UTM_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function getUtmSnapshot(): UtmSnapshot {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return {};
    const raw = window.sessionStorage.getItem(UTM_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmSnapshot;
  } catch {
    return {};
  }
}

export async function trackEvent(
  event_type: string,
  event_data: Record<string, unknown> = {},
): Promise<void> {
  try {
    // Opportunistic capture — if the caller fires an event before bootstrap
    // ran (or on a direct-link entry), still get first-touch attribution.
    captureUtmFromLocation();

    const session_id = getOrCreateSessionId();
    const { data: authData } = await supabase.auth.getSession();
    const user_id = authData?.session?.user?.id ?? null;
    const page_path =
      typeof window !== "undefined" ? window.location.pathname : null;

    const utm = getUtmSnapshot();
    const enriched: Record<string, unknown> = {
      ...event_data,
      ...utm,
    };

    await (supabase as any).from("user_events").insert({
      user_id,
      session_id,
      event_type,
      event_data: enriched,
      page_path,
    });
  } catch {
    // swallow — analytics must never break UX
  }
}
