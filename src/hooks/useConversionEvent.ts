// PP-1 — conversion analytics hook.
//
// Fire-and-forget wrapper around the same edge pathway pageView.ts uses:
// supabase.functions.invoke("track-geo"). track-geo already accepts an
// arbitrary event_type + event_data blob and persists it to
// public.user_events, so this hook is 100% frontend — no edge/schema
// changes required.
//
// Callers get a stable `fire(eventName, props)` function. page_path is
// auto-attached from react-router; props flow into event_data.
//
// Analytics MUST NEVER break UX: every path is wrapped in try/catch and
// swallows errors silently.
import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "eup_session_id";

function sessionId(): string | null {
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

export type ConversionEventProps = Record<string, string>;

export function useConversionEvent() {
  const location = useLocation();
  return useCallback(
    (eventName: string, props: ConversionEventProps = {}) => {
      // Fire-and-forget. Never await from the caller.
      (async () => {
        try {
          if (typeof window === "undefined") return;
          await supabase.functions.invoke("track-geo", {
            body: {
              event_type: eventName,
              page_path: location.pathname,
              session_id: sessionId(),
              event_data: props,
            },
          });
        } catch {
          /* swallow — analytics must never break UX */
        }
      })();
    },
    [location.pathname],
  );
}
