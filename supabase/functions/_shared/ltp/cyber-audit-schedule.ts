/**
 * cyber-audit-schedule — ITEM-204 CEO RULING (Defect B), 2026-07-27.
 *
 * The § 7121(a) cybersecurity-audit cohort surface no longer computes
 * or asserts the customer's cohort membership. Instead the graded
 * surface STATES THE LAW: the full three-tier phase-in schedule,
 * corpus-quoted from the VERIFIED AUTHORITY REGISTRY row for 11 CCR
 * § 7121, rendered in counsel voice, closing with the customer-
 * determination framing (reserved-to-customer-and-counsel discipline).
 *
 * Same output for every band (resolved AND indeterminate). No revenue
 * ask is emitted. The cohort-append conditional clause is retired for
 * this surface (see cohort-append.ts).
 *
 * Corpus source (VERIFIED, status=approved):
 *   docs/courier/CPPA-7121-VERBATIM-2026-07-25.md
 *   provision_texts row `cppa-7121`, subdivision (a)(1)–(3), (b).
 *   Literals cross-checked against the OAL-approved PDF (SHA-256
 *   7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650).
 *
 * Design-law: this file is the standing pattern for phase-in-schedule
 * surfaces — state the law, never compute the customer's tier. See
 * docs/design/LEGAL-TEST-PIPELINE.md §31.
 */

export const CYBER_AUDIT_SCHEDULE_STAMP =
  "cyber-audit-schedule@2026-07-27T-item204";
export const CYBER_AUDIT_SCHEDULE_VERSION =
  "cyber-audit-schedule-v1-phase-in-2026-07-27";

/** Corpus-pinned literals — verbatim from provision_texts `cppa-7121`. */
export const SCHEDULE_LITERALS = {
  tier1: {
    subdivision: "(a)(1)",
    deadline: "April 1, 2028",
    revenue_condition:
      "the business's annual gross revenue for 2026 was more than one hundred million dollars ($100,000,000) as of January 1, 2027",
    audit_period: "January 1, 2027, through January 1, 2028",
  },
  tier2: {
    subdivision: "(a)(2)",
    deadline: "April 1, 2029",
    revenue_condition:
      "the business's annual gross revenue for 2027 was between fifty million dollars ($50,000,000) and one hundred million dollars ($100,000,000) as of January 1, 2028",
    audit_period: "January 1, 2028, through January 1, 2029",
  },
  tier3: {
    subdivision: "(a)(3)",
    deadline: "April 1, 2030",
    revenue_condition:
      "the business's annual gross revenue for 2028 was less than fifty million dollars ($50,000,000)",
    audit_period: "January 1, 2029, through January 1, 2030",
  },
} as const;

/** A single deterministic marker so idempotency is exact-substring safe. */
export const SCHEDULE_MARKER = "[§ 7121(a) phase-in schedule]";

/**
 * Render the corpus-quoted phase-in schedule in counsel voice, closing
 * with the reserved-to-customer-and-counsel framing.
 */
export function renderCyberAuditSchedule(): string {
  const t = SCHEDULE_LITERALS;
  return [
    `${SCHEDULE_MARKER} Under 11 CCR § 7121(a), a business must complete its first cybersecurity audit report no later than one of three cohort deadlines fixed by the regulation:`,
    `— Per § 7121${t.tier1.subdivision}, ${t.tier1.deadline}, if ${t.tier1.revenue_condition}; the audit would cover the period from ${t.tier1.audit_period}.`,
    `— Per § 7121${t.tier2.subdivision}, ${t.tier2.deadline}, if ${t.tier2.revenue_condition}; the audit would cover the period from ${t.tier2.audit_period}.`,
    `— Per § 7121${t.tier3.subdivision}, ${t.tier3.deadline}, if ${t.tier3.revenue_condition}; the audit would cover the period from ${t.tier3.audit_period}.`,
    `The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in and calendars the corresponding deadline.`,
  ].join(" ");
}

export interface CyberAuditScheduleResult {
  readonly emitted: boolean;
  readonly reason: "already_present" | "emitted" | "no_report" | "error";
  readonly stamp: string;
  readonly version: string;
}

/**
 * Idempotently ensure the § 7121(a) phase-in schedule is present on the
 * graded submission_summary surface (also mirrored to legacy
 * cross_tool_recommendations.cybersecurity_audit_rationale so existing
 * renderers continue to work). Fail-open.
 */
export function applyCyberAuditSchedule(
  report: any,
): CyberAuditScheduleResult {
  const base = {
    stamp: CYBER_AUDIT_SCHEDULE_STAMP,
    version: CYBER_AUDIT_SCHEDULE_VERSION,
  };
  try {
    if (!report || typeof report !== "object") {
      return { emitted: false, reason: "no_report", ...base };
    }
    const summary = (report.submission_summary ??= {});
    const existing = String(summary.cybersecurity_audit_schedule ?? "");
    if (existing.includes(SCHEDULE_MARKER)) {
      return { emitted: false, reason: "already_present", ...base };
    }
    const schedule = renderCyberAuditSchedule();
    summary.cybersecurity_audit_schedule = schedule;

    // Legacy renderer mirror — retained for backwards compatibility only.
    const ctr = (report.cross_tool_recommendations ??= {});
    if (ctr && typeof ctr === "object" && !Array.isArray(ctr)) {
      const legacy = String((ctr as any).cybersecurity_audit_rationale ?? "");
      if (!legacy.includes(SCHEDULE_MARKER)) {
        (ctr as any).cybersecurity_audit_rationale = schedule;
      }
    }
    return { emitted: true, reason: "emitted", ...base };
  } catch {
    return { emitted: false, reason: "error", ...base };
  }
}
