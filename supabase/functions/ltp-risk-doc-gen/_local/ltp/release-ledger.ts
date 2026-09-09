// ITEM 379 — DELIVERABLE 4: RELEASE LEDGER (soft, non-blocking).
//
// A single roll-up of everything the battery flagged but did not repair,
// computed AFTER the deterministic battery and written to
// `_meta.internal.release_ledger`. One console alert line is emitted when any
// value is nonzero. It NEVER blocks, delays, or alters the document.

export const RELEASE_LEDGER_VERSION = "release-ledger-2026-08-05-item379";

/** Structural finding classes that count as blocking for the ledger. */
export const BLOCKING_FINDING_CLASSES: readonly string[] = [
  "record-contradiction",
  "internal-inconsistency",
  "citation-misapplication",
];

export interface ReleaseLedger {
  version: string;
  blocking_findings_open: number;
  csc_flags_unrepaired: number;
  coverage_orphans: number;
  unused_material_facts: number;
  citation_failures: number;
  clean: boolean;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Structural findings of a blocking class, from refinement telemetry. */
export function countBlockingFindings(refinement: unknown): number {
  const r = (refinement ?? {}) as Record<string, unknown>;
  const structural = asArray(r.structural_findings_log ?? r.structural_findings_detail);
  if (structural.length > 0) {
    return structural.filter((f) => {
      const cls = String((f as Record<string, unknown>)?.class ?? "");
      return BLOCKING_FINDING_CLASSES.includes(cls);
    }).length;
  }
  // Only a count survives in v1.1 telemetry — treat every structural finding
  // as open, which is the conservative reading.
  const n = Number(r.structural_findings ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** CSC violations that were flagged but NOT repaired. */
export function countUnrepairedCsc(csc: unknown): number {
  const c = (csc ?? {}) as Record<string, unknown>;
  return asArray(c.violations).filter((v) =>
    !(v as Record<string, unknown>)?.repaired
  ).length;
}

/**
 * Citation failures from the existing citation machinery. Reads the counters
 * that exist today and tolerates every one of them being absent.
 */
export function countCitationFailures(
  report: Record<string, unknown> | null | undefined,
): number {
  try {
    if (!report || typeof report !== "object") return 0;
    const internal = ((report._meta as Record<string, unknown> | undefined)?.internal ?? {}) as Record<string, unknown>;
    let n = 0;
    for (const key of ["citation_audit", "citation_lint", "dpia_w1_wire", "n_wire"]) {
      const blk = internal[key] as Record<string, unknown> | undefined;
      if (!blk || typeof blk !== "object") continue;
      for (const f of ["failures", "failed", "unverified", "unanchored", "rejected"]) {
        const v = Number(blk[f]);
        if (Number.isFinite(v) && v > 0) n += v;
      }
    }
    n += asArray(report.lint_warnings).filter((w) => /citation/i.test(String(w))).length;
    n += asArray(report.deterministic_checks).filter((c) => {
      const row = (c ?? {}) as Record<string, unknown>;
      return /citation/i.test(String(row.id ?? row.check ?? "")) &&
        (row.pass === false || String(row.status ?? "") === "fail");
    }).length;
    return n;
  } catch {
    return 0;
  }
}

export interface ReleaseLedgerInputs {
  readonly refinement?: unknown;
  readonly csc?: unknown;
  readonly coverage?: unknown;
}

export function computeReleaseLedger(
  report: Record<string, unknown> | null | undefined,
  inputs: ReleaseLedgerInputs = {},
): ReleaseLedger {
  const cov = (inputs.coverage ?? {}) as Record<string, unknown>;
  const ledger: ReleaseLedger = {
    version: RELEASE_LEDGER_VERSION,
    blocking_findings_open: countBlockingFindings(inputs.refinement),
    csc_flags_unrepaired: countUnrepairedCsc(inputs.csc),
    coverage_orphans: asArray(cov.orphans).length,
    unused_material_facts: asArray(cov.unused_intake_facts).length,
    citation_failures: countCitationFailures(report),
    clean: true,
  };
  ledger.clean = ledger.blocking_findings_open === 0 &&
    ledger.csc_flags_unrepaired === 0 &&
    ledger.coverage_orphans === 0 &&
    ledger.unused_material_facts === 0 &&
    ledger.citation_failures === 0;
  return ledger;
}

/**
 * Compute, attach at `_meta.internal.release_ledger`, and alert. Never throws;
 * never blocks. Returns the ledger (or null if the report is unusable).
 */
export function attachReleaseLedger(
  report: Record<string, unknown> | null | undefined,
  inputs: ReleaseLedgerInputs,
  ctx: { fn: string; product: string; source_row_id?: string | null },
): ReleaseLedger | null {
  try {
    if (!report || typeof report !== "object") return null;
    const ledger = computeReleaseLedger(report, inputs);
    const meta = ((report as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.release_ledger = ledger;
    if (!ledger.clean) {
      console.warn(JSON.stringify({
        evt: "release_ledger_alert",
        fn: ctx.fn,
        product: ctx.product,
        source_row_id: ctx.source_row_id ?? null,
        ...ledger,
      }));
    }
    return ledger;
  } catch {
    return null;
  }
}
