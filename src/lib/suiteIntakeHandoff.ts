// QA round two (SUITE-A-02 / SUITE-B03, High, 2026-09-06) — the CPPA Suite
// charged for two assessments and generated the Cybersecurity one from the
// Risk questionnaire.
//
// The Suite has two entry points, /cppa-risk-assessment?suite=true and
// /cppa-cybersecurity?suite=true. Each collects ONE module's intake and then
// opened checkout, so a bundle was always paid for with half its evidence
// missing. This module carries the completed module across the hand-off from
// one intake page to the other, so checkout is only ever opened once both are
// answered.
//
// The predicates come from supabase/functions/_shared/suite-intake.ts, which
// is also what create-tool-checkout enforces — the client and the server agree
// on what "answered" means by construction rather than by convention.
import {
  hasCyberIntake,
  hasRiskIntake,
  missingSuiteModules,
  type SuiteModuleIntakes,
} from "../../supabase/functions/_shared/suite-intake";

export { hasCyberIntake, hasRiskIntake, missingSuiteModules };
export type { SuiteModuleIntakes };

export type SuiteModule = "risk_assessment" | "cybersecurity";

const STORAGE_KEY = "cppa_suite_modules_v1";

/**
 * sessionStorage rather than localStorage: a Suite purchase is one sitting,
 * and a stale envelope must not survive into an unrelated later visit. Every
 * access is guarded — storage throws in private modes and embedded contexts.
 */
function readRaw(): SuiteModuleIntakes {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readSuiteHandoff(): SuiteModuleIntakes {
  return readRaw();
}

/** Record one module's completed intake for the hand-off to the other module. */
export function saveSuiteModule(module: SuiteModule, intake: Record<string, unknown>): SuiteModuleIntakes {
  const next = { ...readRaw(), [module]: intake };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable. The caller still gets the merged object back, so a
    // same-page purchase works; only the cross-page hand-off is lost, and the
    // server guard then refuses the incomplete bundle rather than charging for
    // it — which is the behaviour we want when we cannot be sure.
  }
  return next;
}

export function clearSuiteHandoff(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The intake_data a Suite checkout must send: an explicit per-module envelope.
 * create-tool-checkout writes each row its own module's answers from this and
 * refuses the purchase if either is missing.
 */
export function suiteCheckoutIntake(modules: SuiteModuleIntakes): Record<string, unknown> {
  return { suite_modules: modules };
}

/** Where to send the customer to finish the bundle, or null when it is complete. */
export function nextSuiteStep(modules: SuiteModuleIntakes): { module: SuiteModule; path: string; label: string } | null {
  const missing = missingSuiteModules(modules);
  if (missing.length === 0) return null;
  // Cybersecurity is Module 2, so it is the natural next step whenever both
  // are outstanding.
  if (missing.includes("cybersecurity")) {
    return {
      module: "cybersecurity",
      path: "/cppa-cybersecurity?suite=true",
      label: "CPPA Cybersecurity Audit Readiness (Module 2)",
    };
  }
  return {
    module: "risk_assessment",
    path: "/cppa-risk-assessment?suite=true",
    label: "Risk Assessment (Module 1)",
  };
}
