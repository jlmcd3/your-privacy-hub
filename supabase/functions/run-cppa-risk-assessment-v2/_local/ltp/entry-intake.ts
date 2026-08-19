/**
 * ITEM 350 — SINGLE LTP ENTRY-INTAKE RESOLVER.
 *
 * The graded harness (`ltp-risk-doc-gen`) normalized archived intakes with
 * `normalizeEraIntake` before `derivePlan`; the production
 * `run-cppa-risk-assessment` LTP branch passed `row.intake_data` RAW. Two
 * entry paths, two intake shapes, non-comparable RenderPlans — one half of
 * the Item 349 Phase-2 degradation-differentiation defect (the other half
 * was operand-blind factor presence, see `factor-presence.ts`).
 *
 * Every LTP entry point MUST resolve intake through this function.
 * Fail-open: modern flat intakes pass through untouched.
 */
import { normalizeEraIntake, type EraNormalizationTelemetry } from "./replay/era-normalize.ts";

export const LTP_ENTRY_RESOLVER_VERSION = "ltp-entry-intake@2026-08-01-item350";

export interface ResolvedLtpIntake {
  readonly intake: Record<string, unknown>;
  readonly telemetry: EraNormalizationTelemetry;
}

export function resolveLtpIntake(raw: unknown): ResolvedLtpIntake {
  const base = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return normalizeEraIntake(base);
}
