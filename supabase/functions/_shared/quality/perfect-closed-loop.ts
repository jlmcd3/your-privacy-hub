// PROMPT 8K (2026-08-12) — CLOSED-LOOP PERFECT FIXTURES. HARNESS ONLY.
//
// RATIONALE: the "perfect" variant drifted from the product twice because
// "perfect" was defined by a prose spec. From 8K on, PERFECT IS DEFINED BY THE
// PRODUCT ITSELF: a perfect intake is one the deliverables builder finds
// NOTHING MISSING in. This module runs the real, unmodified product builder
// (`buildDpiaDeliverables`) over a candidate intake and rejects the intake
// unless every insufficiency signal is clear.
//
// REJECT unless ALL of:
//   (a) gap_ledger is empty;
//   (b) no finding on any surface carries status "record_insufficient";
//   (c) no risk_register row has residual_band "undetermined";
//   (d) the sign-off block is complete — approver name, title, date, basis,
//       and a resolvable rescorer (the `{rescorer}` slot must not fall back
//       to "the company").
//
// NOT a rejection reason: the DETERMINATION (approved / conditionally_approved
// / consultation_required are all legitimate on perfect data), and
// risk_count_note firing (the assessment surfacing more risks than the company
// self-identified is an analytic result, not a data defect).
//
// CARVE-OUT (CEO-parked policy, 2026-08-12): a perfect scenario must NOT
// combine legal_basis_proposed "Legitimate interests" with special-category
// data_categories — the current balancing rule guarantees a gap on that
// combination and the design question sits with the CEO.

import { buildDpiaDeliverables } from "../ltp/dpia-deliverables/build.ts";

export const PERFECT_CLOSED_LOOP_VERSION = "perfect-closed-loop@prompt8k-2026-08-12";

export const CARVE_OUT_REASON =
  "6(1)(f)+special-category excluded from perfect variant pending CEO policy ruling";

const SPECIAL_CATEGORY_CATS = [
  "Health or medical data",
  "Biometric data",
  "Genetic data",
  "Racial or ethnic origin",
  "Political opinions",
  "Religious or philosophical beliefs",
  "Trade union membership",
  "Sex life or sexual orientation",
  "Criminal convictions or offences",
];

export interface PerfectDeficiency {
  /** "gap" | "insufficient" | "undetermined" | "signoff" | "carve_out" | "build" */
  readonly kind: string;
  readonly detail: string;
}

export interface PerfectCheckResult {
  readonly ok: boolean;
  readonly deficiencies: PerfectDeficiency[];
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function categories(intake: Record<string, unknown>): string[] {
  const v = intake["data_categories"];
  if (Array.isArray(v)) return v.map((x) => s(x)).filter(Boolean);
  return s(v) ? [s(v)] : [];
}

/** CEO-parked carve-out: 6(1)(f) + special-category data. */
export function violatesPerfectCarveOut(intake: unknown): boolean {
  const o = (intake ?? {}) as Record<string, unknown>;
  const basis = s(o["legal_basis_proposed"]).toLowerCase();
  if (!/legitimate interest/.test(basis)) return false;
  const cats = categories(o).map((c) => c.toLowerCase());
  return SPECIAL_CATEGORY_CATS.some((sc) => cats.includes(sc.toLowerCase()));
}

/** Sign-off block completeness — the four recorded fields plus a rescorer. */
export function signOffDeficiencies(intake: unknown): PerfectDeficiency[] {
  const o = (intake ?? {}) as Record<string, unknown>;
  const out: PerfectDeficiency[] = [];
  const req: Array<[string, string]> = [
    ["dpia_approved_by_name", "approver name"],
    ["dpia_approved_by_title", "approver title"],
    ["dpia_approval_date", "approval date"],
    ["dpia_signoff_basis", "sign-off basis"],
  ];
  for (const [key, label] of req) {
    if (!s(o[key])) out.push({ kind: "signoff", detail: `sign-off block incomplete: ${label} (${key}) is not recorded` });
  }
  // The {rescorer} slot resolves to dpia_approved_by_name, else "the company".
  if (!s(o["dpia_approved_by_name"])) {
    out.push({ kind: "signoff", detail: "the {rescorer} slot falls back to \"the company\" — record dpia_approved_by_name" });
  }
  return out;
}

/**
 * Run the PRODUCT builder over the candidate intake and report every
 * insufficiency signal. Pure; no I/O, no model calls.
 */
export function checkPerfectDpiaIntake(intake: unknown): PerfectCheckResult {
  const deficiencies: PerfectDeficiency[] = [];

  if (violatesPerfectCarveOut(intake)) {
    return { ok: false, deficiencies: [{ kind: "carve_out", detail: CARVE_OUT_REASON }] };
  }

  let built: ReturnType<typeof buildDpiaDeliverables>;
  try {
    built = buildDpiaDeliverables(intake);
  } catch (e) {
    return {
      ok: false,
      deficiencies: [{ kind: "build", detail: `deliverables builder threw: ${(e as Error)?.message ?? String(e)}` }],
    };
  }

  // (a) gap_ledger empty.
  for (const g of built.gap_ledger ?? []) {
    deficiencies.push({ kind: "gap", detail: `gap_ledger: ${g.field} — ${g.dimensions}` });
  }

  // (b) no record_insufficient finding on any surface.
  const surfaces: Array<[string, ReadonlyArray<{ status?: string; information_needed?: string }>]> = [
    ["necessity_findings", built.necessity_findings ?? []],
    ["proportionality", built.proportionality ?? []],
    ["legal_basis", built.legal_basis ?? []],
    ["risk_register", built.risk_register ?? []],
    ["processing_inventory.controllers", built.processing_inventory?.controllers ?? []],
    ["processing_inventory.processors", built.processing_inventory?.processors ?? []],
    ["processing_inventory.data_items", built.processing_inventory?.data_items ?? []],
  ];
  for (const [name, rows] of surfaces) {
    for (const r of rows) {
      if (r?.status === "record_insufficient") {
        deficiencies.push({
          kind: "insufficient",
          detail: `${name}: record_insufficient${r.information_needed ? ` — needs ${r.information_needed}` : ""}`,
        });
      }
    }
  }
  if ((built.art36_consultation as { status?: string } | undefined)?.status === "record_insufficient") {
    deficiencies.push({ kind: "insufficient", detail: "art36_consultation: record_insufficient" });
  }
  const cov = built.section2_coverage as unknown as Record<string, unknown> | undefined;
  if (cov) {
    for (const [key, val] of Object.entries(cov)) {
      if (!Array.isArray(val)) continue;
      for (const row of val as Array<{ status?: string; information_needed?: string }>) {
        if (row?.status === "record_insufficient") {
          deficiencies.push({
            kind: "insufficient",
            detail: `section2_coverage.${key}: record_insufficient${row.information_needed ? ` — needs ${row.information_needed}` : ""}`,
          });
        }
      }
    }
  }

  // (c) no undetermined residual band.
  for (const r of built.risk_register ?? []) {
    if (r.residual_band === "undetermined") {
      deficiencies.push({ kind: "undetermined", detail: `risk_register: ${r.risk_label} has residual_band "undetermined"` });
    }
  }

  // (d) sign-off block complete.
  deficiencies.push(...signOffDeficiencies(intake));

  return { ok: deficiencies.length === 0, deficiencies };
}

/** One-line reasons, deduped, for the progress_log and generator retry guidance. */
export function deficiencyLines(d: readonly PerfectDeficiency[]): string[] {
  return [...new Set(d.map((x) => `${x.kind}: ${x.detail}`))];
}

/** Retry guidance fed back to the generator (8G per-scenario retry path). */
export function perfectRetryGuidance(d: readonly PerfectDeficiency[]): string {
  const lines = deficiencyLines(d).slice(0, 12);
  return [
    "CLOSED-LOOP REJECTION — the previous scenario was rejected because the product's own deliverables builder found the record insufficient.",
    "Regenerate the SAME kind of scenario with these specific facts supplied (add facts, never remove detail):",
    ...lines.map((l) => `- ${l}`),
    `CARVE-OUT: ${CARVE_OUT_REASON}. Never combine legal_basis_proposed "Legitimate interests" with special-category data_categories.`,
  ].join("\n");
}
