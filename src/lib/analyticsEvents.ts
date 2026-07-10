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
