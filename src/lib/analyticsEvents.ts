// Courier-A close-out (2026-07-10): thin wrappers over trackEvent() for the
// five launch-gating events. All wrappers are fire-and-forget and dedupe
// per-session where appropriate so re-renders don't inflate the funnel.
//
// Fire points are wired on the surfaces as they exist today (SampleReport,
// SampleReportView, tool intake pages, PillarPage email capture, checkout
// modals, /subscribe/success). Couriers B/C will keep and extend these
// calls when they rebuild the surfaces — they do not create them.

import { useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { supabase } from "@/integrations/supabase/client";

const FIRED_KEY = "eup_fired_events_v1";

function firedSet(): Set<string> {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return new Set();
    const raw = window.sessionStorage.getItem(FIRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markFired(key: string) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    const s = firedSet();
    s.add(key);
    window.sessionStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

function onceFire(key: string, fn: () => void) {
  const s = firedSet();
  if (s.has(key)) return;
  markFired(key);
  fn();
}

export function fireSampleOpened(tool: string, variant?: string) {
  onceFire(`sample_opened:${tool}:${variant ?? "index"}`, () => {
    void trackEvent("sample_opened", { tool, variant: variant ?? null });
  });
}

export function fireToolStarted(tool: string) {
  onceFire(`tool_started:${tool}`, () => {
    void trackEvent("tool_started", { tool });
  });
}

/**
 * Fires `tool_started` on the FIRST INTAKE INTERACTION (focus/change of a
 * form control, or pointerdown on an interactive element inside <main>,
 * <form>, or [data-intake]). Excludes clicks in nav/header/footer so that
 * ad landings that never touch the intake do not count as a start.
 * Deduped per session per tool via fireToolStarted().
 */
export function useToolStartedOnInteraction(tool: string) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    // If already fired this session for this tool, no need to attach.
    if (firedSet().has(`tool_started:${tool}`)) return;

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };

    const inIntake = (el: Element | null): boolean => {
      if (!el) return false;
      if (el.closest("nav, header, footer, [data-analytics-ignore]")) return false;
      return !!el.closest("main, form, [data-intake]");
    };

    const isFormControl = (el: Element | null): el is HTMLElement => {
      if (!el) return false;
      return !!(el as HTMLElement).matches?.(
        'input:not([type="hidden"]), select, textarea, [contenteditable="true"]',
      );
    };

    const isInteractive = (el: Element | null): boolean => {
      if (!el) return false;
      return !!el.closest(
        'button, [role="button"], [role="radio"], [role="checkbox"], [role="option"], [role="tab"], label, a[data-intake]',
      );
    };

    const fire = () => {
      fireToolStarted(tool);
      // PP-1: mirror the same first-intake-interaction moment as
      // tool_start_click via the track-geo pathway. Session-dedupe handled
      // above (firedSet has already been checked); we don't re-check here
      // because fireToolStarted's onceFire covers it.
      (async () => {
        try {
          const path =
            typeof window !== "undefined" ? window.location.pathname : "";
          const { data } = await supabase.auth.getSession();
          const user_type = data?.session?.user ? "authenticated" : "anonymous";
          const session_id =
            typeof window !== "undefined" && window.sessionStorage
              ? window.sessionStorage.getItem("eup_session_id")
              : null;
          await supabase.functions.invoke("track-geo", {
            body: {
              event_type: "tool_start_click",
              page_path: path,
              session_id,
              event_data: { tool_slug: tool, page_path: path, user_type },
            },
          });
        } catch {
          /* swallow — analytics must never break UX */
        }
      })();
      cleanup();
    };

    const onFocus = (e: FocusEvent) => {
      const t = e.target as Element | null;
      if (isFormControl(t) && inIntake(t)) fire();
    };
    const onChange = (e: Event) => {
      const t = e.target as Element | null;
      if (isFormControl(t) && inIntake(t)) fire();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (inIntake(t) && (isInteractive(t) || isFormControl(t))) fire();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      const t = e.target as Element | null;
      if (inIntake(t) && (isInteractive(t) || isFormControl(t))) fire();
    };

    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);

    return cleanup;
  }, [tool]);
}

export function fireEmailCaptured(source: string) {
  void trackEvent("email_captured", { source });
}

export function fireCheckoutStarted(
  opts: { plan?: string | null; tool?: string | null; surface?: string },
) {
  void trackEvent("checkout_started", {
    plan: opts.plan ?? null,
    tool: opts.tool ?? null,
    surface: opts.surface ?? null,
  });
}

export function firePurchaseCompleted(
  opts: { plan?: string | null; tool?: string | null; surface?: string },
) {
  const key = `purchase_completed:${opts.plan ?? ""}:${opts.tool ?? ""}:${opts.surface ?? ""}`;
  onceFire(key, () => {
    void trackEvent("purchase_completed", {
      plan: opts.plan ?? null,
      tool: opts.tool ?? null,
      surface: opts.surface ?? null,
    });
  });
}
