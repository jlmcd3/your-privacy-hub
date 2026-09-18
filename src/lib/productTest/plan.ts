// /admin/product-test — pure planning and arithmetic (doc 272 §1-§6).
//
// Everything here is a pure function: no Supabase, no fetch, no time. This is
// what src/lib/productTest/__tests__/plan.test.ts exercises directly, and
// what src/lib/productTest/run.ts calls to decide what to generate and how
// to score what came back.

import type { CheckSeverity, PanelTool, ToolSummary, Variant, VariantKind } from "./types";

// ─── Deterministic vs model-assisted (doc 272 §0, §6.6) ────────────────────────

/** CPPA Risk, CPPA Cyber, CPPA ADMT, DPIA, LIA and Registration render from
 *  engines and pinned spines with no model call in generation.
 *
 *  Governance is NOT on this list (lead correction, 2026-09-18): the latest
 *  production governance document (4095e317, 2026-09-17) records
 *  generation_model claude-sonnet-5 and a model refinement pass switched on;
 *  its deterministic path sits behind GOVERNANCE_DETERMINISTIC_ENABLED, which
 *  defaults off and whose production value is a Lovable secret. Until the CEO
 *  confirms that flag is on, a hash difference between two governance copies
 *  is expected model variance (editorial), not a defect. Move it back here the
 *  day the flag is confirmed. */
export const DETERMINISTIC_TOOLS: readonly PanelTool[] = [
  "cppa-risk",
  "cppa-cyber",
  "cppa-admt",
  "dpia",
  "lia",
  "registration",
];

export function isDeterministicTool(tool: PanelTool): boolean {
  return (DETERMINISTIC_TOOLS as readonly string[]).includes(tool);
}

/** The stability check's severity depends on whether generation is
 *  deterministic (doc 272 build brief §2 stability rule): high for the
 *  six deterministic tools, editorial for the seven model-assisted ones
 *  (governance counted as model-assisted until its flag is confirmed). */
export function stabilitySeverityFor(tool: PanelTool): CheckSeverity {
  return isDeterministicTool(tool) ? "high" : "editorial";
}

// ─── Product grouping for the page's checkbox sections (doc 272 §1) ──────────

export const TOOL_GROUPS: { label: "CPPA" | "GDPR" | "Other"; tools: PanelTool[] }[] = [
  { label: "CPPA", tools: ["cppa-risk", "cppa-cyber", "cppa-admt"] },
  { label: "GDPR", tools: ["dpia", "lia", "governance"] },
  { label: "Other", tools: ["ir-playbook", "biometric", "dpa", "ropa", "us-notice", "eu-notice", "registration"] },
];

/** Default selection: the six Auto products (doc 272 §1). */
export const DEFAULT_TOOLS: PanelTool[] = ["cppa-risk", "cppa-cyber", "cppa-admt", "dpia", "lia", "governance"];

// ─── Copies & fixture picks (doc 272 §2) ───────────────────────────────────────

export const MIN_COPIES = 1;
export const MAX_COPIES = 15;
export const PANEL_SIZE = 15;
export const DEFAULT_CONCURRENCY = 3;

export function clampCopies(n: number): number {
  if (!Number.isFinite(n)) return MIN_COPIES;
  return Math.max(MIN_COPIES, Math.min(MAX_COPIES, Math.round(n)));
}

export interface FixturePick {
  tool: PanelTool;
  copyIndex: number; // 1-based
  fixtureIndex: number; // 0-based, into the 15-fixture panel
}

/**
 * Copy k of a product is always the same fixture on every run (doc 272 §2):
 * fixture = panel[repeatSameFixture ? 0 : (k-1) % panelSize].
 */
export function planFixturePicks(
  tools: readonly PanelTool[],
  copies: number,
  repeatSameFixture: boolean,
  panelSize = PANEL_SIZE,
): FixturePick[] {
  const n = clampCopies(copies);
  const picks: FixturePick[] = [];
  for (const tool of tools) {
    for (let k = 1; k <= n; k++) {
      const fixtureIndex = repeatSameFixture ? 0 : (k - 1) % panelSize;
      picks.push({ tool, copyIndex: k, fixtureIndex });
    }
  }
  return picks;
}

/** The distinct (tool, fixture) pairs a plan touches — one `variants` call
 *  per pair is enough, however many copies share it. */
export function distinctFixtureIndexes(picks: readonly FixturePick[]): Array<{ tool: PanelTool; fixtureIndex: number }> {
  const seen = new Set<string>();
  const out: Array<{ tool: PanelTool; fixtureIndex: number }> = [];
  for (const p of picks) {
    const key = `${p.tool}#${p.fixtureIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ tool: p.tool, fixtureIndex: p.fixtureIndex });
  }
  return out;
}

// ─── Variant kind selection (doc 272 §3-§4) ────────────────────────────────────

/** Stable display/processing order; golden first. */
export const VARIANT_KIND_ORDER: VariantKind[] = [
  "golden",
  "thin-all",
  "thin-one",
  "blank-required",
  "contradict",
  "authored",
  "wrong-regime",
];

/** Golden is always available and cannot be unchecked (doc 272 §3 / build brief §4c). */
export function normalizeVariantKinds(requested: readonly VariantKind[]): VariantKind[] {
  const set = new Set<VariantKind>(requested);
  set.add("golden");
  return VARIANT_KIND_ORDER.filter((k) => set.has(k));
}

/** True once any messy kind (anything beyond golden) is selected — this is
 *  what decides whether a `variants` call is needed for a fixture at all. */
export function wantsMessyVariants(kinds: readonly VariantKind[]): boolean {
  return normalizeVariantKinds(kinds).some((k) => k !== "golden");
}

/** The synthetic golden variant used when no messy kind is selected — no
 *  network round trip needed to know its shape (doc 272 build brief §2). */
export function goldenVariant(intake: Record<string, unknown>): Variant {
  return {
    variant_id: "golden",
    kind: "golden",
    description: "Golden (perfect) intake — no field removed or altered.",
    intake,
    removed_keys: [],
    expectations: { must_report_not_recorded: [], must_not_contain: [], must_contain: [] },
  };
}

/** From a fetched `variants` response, keep only the kinds the settings
 *  selected. A kind may appear on more than one returned variant (e.g.
 *  several "thin-one" variants, one per optional field); all of them stay. */
export function selectVariantsByKind(all: readonly Variant[], kinds: readonly VariantKind[]): Variant[] {
  const wanted = new Set(normalizeVariantKinds(kinds));
  return all.filter((v) => wanted.has(v.kind));
}

// ─── Document plan (fixture pick × variant → one document) ────────────────────

export interface DocumentUnit {
  tool: PanelTool;
  fixtureIndex: number;
  copyIndex: number;
  variant: Variant;
}

/**
 * Expands fixture picks into document units by pairing each pick with every
 * variant available for its (tool, fixtureIndex) pair. `variantsByKey` is
 * keyed `${tool}#${fixtureIndex}` (see distinctFixtureIndexes) and holds
 * either the single golden variant or the messy set selected by
 * selectVariantsByKind — the caller decides which, since only it knows
 * whether a network call was needed.
 */
export function planDocumentUnits(
  picks: readonly FixturePick[],
  variantsByKey: ReadonlyMap<string, readonly Variant[]>,
): DocumentUnit[] {
  const out: DocumentUnit[] = [];
  for (const p of picks) {
    const key = `${p.tool}#${p.fixtureIndex}`;
    const variants = variantsByKey.get(key) ?? [];
    for (const variant of variants) {
      out.push({ tool: p.tool, fixtureIndex: p.fixtureIndex, copyIndex: p.copyIndex, variant });
    }
  }
  return out;
}

// ─── Summary arithmetic (doc 272 §6 "Score") ───────────────────────────────────

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 1; // no documents/checks is vacuously 100%
}

export interface DocLike {
  document_pass: boolean | null;
  /** A document that failed to GENERATE is a failed document (lead fix
   *  2026-09-18: run 72e9a63c reported LIA at 100 percent with zero checks
   *  after all 28 of its inserts failed). */
  status?: string;
}

export interface CheckLike {
  passed: boolean;
  severity: CheckSeverity;
}

export function toolSummary(docs: readonly DocLike[], checks: readonly CheckLike[]): ToolSummary {
  const scored = docs.filter((d) => d.document_pass !== null || d.status === "failed");
  const passedDocs = scored.filter((d) => d.document_pass === true && d.status !== "failed").length;
  const checksPassed = checks.filter((c) => c.passed).length;
  const critical = checks.filter((c) => c.severity === "critical" && !c.passed).length;
  const high = checks.filter((c) => c.severity === "high" && !c.passed).length;
  const editorial = checks.filter((c) => c.severity === "editorial" && !c.passed).length;
  return {
    documents: docs.length,
    document_pass_rate: rate(passedDocs, scored.length),
    checks_total: checks.length,
    checks_passed: checksPassed,
    check_pass_rate: rate(checksPassed, checks.length),
    critical,
    high,
    editorial,
  };
}

export function overallSummary(perTool: Readonly<Record<string, ToolSummary>>): ToolSummary {
  const all = Object.values(perTool);
  const documents = all.reduce((a, s) => a + s.documents, 0);
  const checksTotal = all.reduce((a, s) => a + s.checks_total, 0);
  const checksPassed = all.reduce((a, s) => a + s.checks_passed, 0);
  const critical = all.reduce((a, s) => a + s.critical, 0);
  const high = all.reduce((a, s) => a + s.high, 0);
  const editorial = all.reduce((a, s) => a + s.editorial, 0);
  // Document pass rate is recomputed from the passing-document counts each
  // tool summary implies, not averaged, so it stays a true ratio.
  const passedDocs = all.reduce((a, s) => a + Math.round(s.document_pass_rate * s.documents), 0);
  return {
    documents,
    document_pass_rate: rate(passedDocs, documents),
    checks_total: checksTotal,
    checks_passed: checksPassed,
    check_pass_rate: rate(checksPassed, checksTotal),
    critical,
    high,
    editorial,
  };
}

// ─── Launch bars (doc 272 §6 table) ────────────────────────────────────────────

export const LAUNCH_BARS = {
  documentPassGolden: 1.0, // 100%
  documentPassMessy: 0.98, // 98%
  checkPass: 0.98, // 98% or better
} as const;

const EPS = 1e-9;

export interface LaunchBarResult {
  documentBarMet: boolean;
  documentBar: number;
  checkBarMet: boolean;
  checkBar: number;
}

/** Doc 272 §6: document pass rate must clear 100% on golden-only runs, 98%
 *  on runs including any messy variant; check pass rate must clear 98% either way. */
export function evaluateLaunchBars(
  summary: Pick<ToolSummary, "document_pass_rate" | "check_pass_rate">,
  hasMessyVariants: boolean,
): LaunchBarResult {
  const documentBar = hasMessyVariants ? LAUNCH_BARS.documentPassMessy : LAUNCH_BARS.documentPassGolden;
  const checkBar = LAUNCH_BARS.checkPass;
  return {
    documentBarMet: summary.document_pass_rate >= documentBar - EPS,
    documentBar,
    checkBarMet: summary.check_pass_rate >= checkBar - EPS,
    checkBar,
  };
}
