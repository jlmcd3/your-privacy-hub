/**
 * LTP Section-Shard Registry — cppa-risk (T-M2, Item 222).
 *
 * Fourth turn of the LEGAL-TEST-PIPELINE rebuild chain (Items 219–221
 * complete). Registry-only artifact: no new templates, no grader edits,
 * no batch inserts, no deploy.
 *
 * Purpose
 * -------
 * Enumerate every top-level key of `report-schemas/cppa-risk.ts`
 * (`CPPA_RISK_REPORT_SCHEMA.topLevel`) and bind each to:
 *
 *   (a) a TEMPLATE SET  — the Pass-2 template ids (or deterministic
 *       emitter sentinel, or the TEMPLATE_CUT sentinel) that own the
 *       key's shipped content; and
 *   (b) a PROJECTION FN — a pure function `(plan: RenderPlan) => unknown`
 *       that produces the RenderPlan slice consumed by the owner. The
 *       projection surface is what T-M3/T-M4 will wire when the
 *       template set for a given key is authored.
 *
 * Frontend contract is preserved: the report_data key set stays
 * identical to what `report-schemas/cppa-risk.ts` allow-lists at the
 * LEAK-PREV-P2 serializer. "Unmapped" is not a permitted state —
 * every top-level key has an owner in this registry.
 *
 * ENGINE-A HARVEST BINDINGS (CEO subordination ruling — verbatim:
 * "Engine B should always control. However, where there are any useful
 * artifacts of Engine A, we should use them SO LONG AS THEY CANNOT
 * OVERRIDE OR DIMINISH ENGINE B."):
 *
 *   • `opening_summary`     → T7 deterministic emitter
 *     (`_shared/openings/risk-opening.ts`, S0–S6). Subordinated
 *     plan-bound artifact. Not a template; not on any deletion list.
 *
 *   • `submission_summary`  → § 7121(a) cohort truth-table emitter
 *     (`_shared/ltp/cyber-audit-schedule.ts` + § 7120 cyber-audit
 *     crosswalk clauses). Migrating as pure functions per Item 218
 *     §(b)(4).
 *
 * Subordination is enforced downstream: any conflict between a harvest
 * artifact and the RenderPlan REJECTS the artifact, telemetered, never
 * silently suppressed. That enforcement rides with T-M3 wire-in; this
 * turn declares the binding only.
 *
 * Companion files:
 *   • ../../report-schemas/cppa-risk.ts        (frontend contract)
 *   • ../content/pass2-templates.ts            (template catalog)
 *   • ../content/risk-surface-map.ts           (per-path bindings)
 *   • ../../render-plan/schema.ts              (RenderPlan v1)
 */

import type { RenderPlan } from "../../render-plan/schema.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../../report-schemas/cppa-risk.ts";

export const CPPA_RISK_SECTION_SHARDS_VERSION =
  "cppa-risk-section-shards-2026-07-28-tm2";

/**
 * The three owner kinds recognized by the registry.
 *
 *   • "template"       — Pass-2 template ids are the authoritative
 *                        producers of the shipped surface.
 *   • "harvest"        — Deterministic Engine-A artifact, SUBORDINATED
 *                        to the RenderPlan (rejected on conflict).
 *   • "deterministic"  — Engine-B deterministic emitter or literal
 *                        (metadata, disclaimers, ledger passthroughs).
 *   • "template-cut"   — Key retained for frontend/renderer tolerance
 *                        only; content bounded per RISK_CUT_RULINGS.
 */
export type ShardOwnerKind =
  | "template"
  | "harvest"
  | "deterministic"
  | "template-cut";

export interface ShardOwner {
  readonly kind: ShardOwnerKind;
  /** Pass-2 template ids (from PASS2_TEMPLATES) or emitter sentinels. */
  readonly template_ids: readonly string[];
  /** Human-readable emitter tag when kind ∈ {"harvest","deterministic"}. */
  readonly emitter?: string;
  /** Harvest artifacts are always subordinated to the RenderPlan. */
  readonly subordinated?: true;
}

/** Registry entry — one per top-level key of the report schema. */
export interface SectionShard {
  readonly key: string;
  readonly owner: ShardOwner;
  /**
   * Pure projection of the RenderPlan into the slice the owner consumes.
   * MUST NOT read intake, database, or environment. `undefined` means
   * "no plan-derived slice for this key" (typical for schema_version,
   * disclaimers, and metadata literals owned by deterministic emitters).
   */
  readonly project: (plan: RenderPlan) => unknown;
  /** Free-form authoring note. Not consumed at runtime. */
  readonly note?: string;
}

// ---------------------------------------------------------------------
// Projection helpers (pure; RenderPlan-only inputs).
// ---------------------------------------------------------------------

const NONE = (_plan: RenderPlan): unknown => undefined;

const projectPropositionsByType = (type: "R" | "W" | "J") =>
  (plan: RenderPlan): unknown =>
    plan.propositions.filter((p) => p.epistemic_type === type);

const projectFactorTable = (plan: RenderPlan): unknown => plan.factor_table;

const projectIntakeLedger = (plan: RenderPlan): unknown => plan.intake_ledger;

const projectCitationBindings = (plan: RenderPlan): unknown =>
  plan.citation_bindings;

const projectManifest = (plan: RenderPlan): unknown =>
  (plan as unknown as { manifest?: unknown }).manifest;

const projectMeta = (plan: RenderPlan): unknown => ({
  render_plan_version:
    (plan as unknown as { version?: string }).version ?? null,
  propositions: plan.propositions.length,
  factor_rows: plan.factor_table.length,
  citation_bindings: plan.citation_bindings.length,
});

// ---------------------------------------------------------------------
// The registry.
// ---------------------------------------------------------------------

export const CPPA_RISK_SECTION_SHARDS: readonly SectionShard[] = [
  // ── Metadata / frontend contract literals (deterministic) ─────────
  {
    key: "schema_version",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "schema-version-literal" },
    project: NONE,
    note: "Frontend-visible schema tag; emitted by run-cppa-risk-assessment.",
  },
  {
    key: "document_metadata",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "document-metadata-composer" },
    project: NONE,
  },
  {
    key: "attestation_block",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "attestation-block-composer" },
    project: NONE,
  },
  {
    key: "disclaimer",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "standard-disclaimer-literal" },
    project: NONE,
    note: 'Core-memory Standard Disclaimer literal ("not legal advice…").',
  },
  {
    key: "framework_disclaimer",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "framework-disclaimer-literal" },
    project: NONE,
  },
  {
    key: "accuracy_caveat",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "accuracy-caveat-literal" },
    project: NONE,
  },
  {
    key: "domains",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "domains-jurisdiction-tag" },
    project: (plan) => Array.from(new Set(plan.propositions.map((p) => p.jurisdiction_tag))),
    note: "Jurisdiction-tag rollup from Q4(e) authority-domain scoping (LEGAL-TEST v2.1/v2.3).",
  },
  {
    key: "_meta",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "meta-envelope" },
    project: projectMeta,
    note: "Includes _meta.internal.render_plan (Item 221 authoritative persistence).",
  },

  // ── Headline scores / risk band (deterministic from plan) ─────────
  {
    key: "overall_score",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "risk-level-map@overall_score" },
    project: projectFactorTable,
    note: "Derived by risk-level-map from factor_table weights.",
  },
  {
    key: "risk_level",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "risk-level-map@risk_level" },
    project: projectFactorTable,
    note: "Derived by risk-level-map from factor_table weights.",
  },

  // ── ENGINE-A HARVEST BINDINGS (subordinated to RenderPlan) ────────
  {
    key: "opening_summary",
    owner: {
      kind: "harvest",
      template_ids: ["deterministic"],
      emitter: "_shared/openings/risk-opening.ts (T7 pilot, S0–S6)",
      subordinated: true,
    },
    project: projectIntakeLedger,
    note: 'HARVEST: T7 deterministic emitter. NOT a template, NOT on any deletion list. Subordinated to RenderPlan per CEO ruling: "…SO LONG AS THEY CANNOT OVERRIDE OR DIMINISH ENGINE B."',
  },
  {
    key: "submission_summary",
    owner: {
      kind: "harvest",
      template_ids: ["T.risk.cohort"],
      emitter: "_shared/ltp/cyber-audit-schedule.ts + § 7120 crosswalk clauses",
      subordinated: true,
    },
    project: (plan) => ({
      cohort_factors: plan.factor_table.filter((r) =>
        /cohort|7121|7157|revenue|bought_sold_shared/i.test(r.factor_id)
      ),
      citation_bindings: plan.citation_bindings.filter((b) =>
        /7120|7121|7157/.test(b.pinpoint)
      ),
    }),
    note: "HARVEST: § 7121(a) cohort truth-table emitter + § 7120 cyber-audit crosswalk. Migrating as pure functions per Item 218 §(b)(4). Subordinated.",
  },

  // ── Body sections (template-owned) ────────────────────────────────
  {
    key: "executive_summary",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.summary.opening.all_firm",
        "T.risk.summary.opening.mixed_hedged",
        "T.risk.summary.opening.any_negative",
        "T.risk.summary.opening.insufficient",
        "T.risk.summary.aggregation_note",
      ],
    },
    project: projectFactorTable,
    note: "Answer-first opening template group; calibration MUST match the balance variant.",
  },
  {
    key: "assessment_summary",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.balance.firm",
        "T.risk.balance.hedged",
        "T.risk.closing.reserved",
        "T.risk.summary.activity_line",
        "T.risk.summary.docs",
      ],
    },
    project: projectFactorTable,
    note: "Object allow-listed at serializer (10 keys + narrative). Firm summary forbidden when any activity rendered hedged.",
  },
  {
    key: "scope_confirmation",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.applicability.engaged",
        "T.risk.applicability.not_engaged",
      ],
    },
    project: projectPropositionsByType("R"),
    note: "One rendering per § 7150(b) prong (Type R).",
  },
  {
    key: "scope_and_triggers",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.applicability.engaged",
        "T.risk.applicability.not_engaged",
      ],
    },
    project: projectPropositionsByType("R"),
    note: "scope_notes CUT (OBJECT_PRUNE); triggered_activities_detail retained via object allow-list.",
  },
  {
    key: "risk_assessment_by_activity",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.balance.firm",
        "T.risk.balance.hedged",
        "T.risk.balance.factor_line",
        "T.risk.admt.consequence_suppressed",
      ],
    },
    project: (plan) => ({
      W_propositions: plan.propositions.filter((p) => p.epistemic_type === "W"),
      factor_table: plan.factor_table,
    }),
    note: "Per-activity Type W surface; closeness evaluated per activity.",
  },
  {
    key: "risk_register",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "risk-register-projection" },
    project: (plan) => plan.factor_table.filter((r) => r.polarity === "negative"),
    note: "Deterministic projection over negative-polarity factor rows.",
  },
  {
    key: "top_risks",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "top-risks-ranking" },
    project: (plan) => plan.factor_table,
    note: "Deterministic rank over factor_table; no template composition.",
  },
  {
    key: "priority_actions",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.documentation.gap",
        "T.risk.documentation.present",
      ],
    },
    project: (plan) => plan.factor_table.filter((r) => /gap|action|remediat/i.test(r.factor_id)),
  },
  {
    key: "next_steps",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.documentation.gap",
        "T.risk.documentation.present",
      ],
    },
    project: projectFactorTable,
  },
  {
    key: "strengthen_items",
    owner: { kind: "template", template_ids: ["T.risk.documentation.gap"] },
    project: (plan) => plan.factor_table.filter((r) => /gap|strengthen/i.test(r.factor_id)),
  },
  {
    key: "inconsistency_flags",
    owner: {
      kind: "template-cut",
      template_ids: ["T.risk.review_items"],
      emitter: "TEMPLATE_CUT — key retained; content restricted to T.risk.review_items output",
    },
    project: (plan) => plan.propositions.filter((p) => p.epistemic_type === "J"),
    note: "RISK_CUT_RULINGS.mode=EMPTY_ARRAY unless T.risk.review_items produces bounded content.",
  },
  {
    key: "exception_analysis",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.documentation.present",
        "T.risk.documentation.gap",
      ],
    },
    project: projectPropositionsByType("R"),
    note: "Type R over exceptions_intake fields.",
  },
  {
    key: "record_sufficiency",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.documentation.present",
        "T.risk.documentation.gap",
      ],
    },
    project: projectFactorTable,
  },
  {
    key: "information_needed",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.documentation.gap",
        "T.risk.information_needed.b_criterion_count",
      ],
    },
    project: (plan) => plan.propositions.filter((p) => p.epistemic_type === "J"),
    note: "Customer questions from gate/validator outputs; B4 empty-filter retained.",
  },

  // ── V3 legacy surfaces (frontend-tolerant; deterministic passthrough) ─
  {
    key: "part_a",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "legacy-v3-passthrough" },
    project: NONE,
    note: "V3 legacy surface. Frontend-tolerant. No plan projection; empty-by-default.",
  },
  {
    key: "part_b",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "legacy-v3-passthrough" },
    project: NONE,
    note: "V3 legacy surface. Frontend-tolerant. No plan projection; empty-by-default.",
  },
  {
    key: "gating",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "legacy-v3-passthrough" },
    project: NONE,
    note: "V3 legacy surface. Frontend-tolerant. No plan projection; empty-by-default.",
  },

  // ── Annotations / review / debug (deterministic from plan/validators) ─
  {
    key: "annotations",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "validator-annotations-projection" },
    project: projectPropositionsByType("J"),
  },
  {
    key: "requires_attorney_review",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "attorney-review-flag" },
    project: (plan) => plan.propositions.some((p) => p.epistemic_type === "J"),
  },
  {
    key: "debug_review_notes",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "debug-review-telemetry" },
    project: projectManifest,
  },
  {
    key: "fsor_commentary",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "fsor-commentary-projection" },
    project: projectManifest,
  },
  {
    key: "citation_ledger",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "citation-bindings-projection" },
    project: projectCitationBindings,
    note: "Deterministic projection of plan.citation_bindings (registry-resolved).",
  },
  {
    key: "validation_summary",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "validators-v1-v8-summary" },
    project: projectManifest,
    note: "Validators V1–V8 outcomes; hard-reject gate at derive-exit (Item 221).",
  },

  // ── Enforcement surfaces (deterministic, empty-by-finding today) ──
  {
    key: "enforcement_context",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "enforcement-context-standing-line" },
    project: NONE,
    note: "CPPA-verified rows only; none exist today → standing line or empty-by-finding omission.",
  },
  {
    key: "enforcement_precedents",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "enforcement-precedents-projection" },
    project: NONE,
    note: "40-char verbatim substring verification (Core-memory Track 3).",
  },
  {
    key: "enforcement_meta",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "enforcement-meta-projection" },
    project: NONE,
  },
] as const;

// ---------------------------------------------------------------------
// Coverage helpers (consumed by the unit test; also useful in telemetry).
// ---------------------------------------------------------------------

export function shardKeys(): readonly string[] {
  return CPPA_RISK_SECTION_SHARDS.map((s) => s.key);
}

export function schemaTopLevelKeys(): readonly string[] {
  return CPPA_RISK_REPORT_SCHEMA.topLevel;
}

/**
 * Compare registry keys against the report-schema top-level allow-list.
 * `missing_from_registry` MUST be empty ("unmapped" is forbidden).
 * `extra_in_registry`     MUST be empty (frontend contract preserved).
 */
export function coverageReport(): {
  readonly missing_from_registry: readonly string[];
  readonly extra_in_registry: readonly string[];
  readonly duplicates_in_registry: readonly string[];
} {
  const schema = new Set(schemaTopLevelKeys());
  const registry = shardKeys();
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const k of registry) {
    if (seen.has(k)) duplicates.push(k);
    seen.add(k);
  }
  const missing = [...schema].filter((k) => !seen.has(k));
  const extra = [...seen].filter((k) => !schema.has(k));
  return {
    missing_from_registry: missing,
    extra_in_registry: extra,
    duplicates_in_registry: duplicates,
  };
}

/**
 * GAP REPORT — sections whose owner is `kind: "template"` but whose
 * template ids are not yet fully authored in `content/pass2-templates.ts`.
 * This is the T-M3 / T-M4 scoping input.
 *
 * Empty `template_ids` is impossible today (every template owner names
 * at least one id), so the gap is expressed as (a) sections that still
 * need a fresh template beyond the reused catalog, and (b) sections
 * whose `template-cut` binding needs review-items content authored.
 */
export interface GapEntry {
  readonly key: string;
  readonly reason:
    | "template-set-needs-authoring"
    | "template-cut-needs-review-items"
    | "harvest-needs-subordination-wire";
  readonly note: string;
}

export const CPPA_RISK_TEMPLATE_GAPS: readonly GapEntry[] = [
  {
    key: "executive_summary",
    reason: "template-set-needs-authoring",
    note: "Opening group exists; aggregation across activities not yet a dedicated template.",
  },
  {
    key: "priority_actions",
    reason: "template-set-needs-authoring",
    note: "Reuses documentation.{gap,present}; a dedicated priority-action shape may be needed for deadline_basis owner-slot fidelity.",
  },
  {
    key: "next_steps",
    reason: "template-set-needs-authoring",
    note: "Reuses documentation.{gap,present}; ordering + deduplication vs priority_actions is unauthored.",
  },
  {
    key: "record_sufficiency",
    reason: "template-set-needs-authoring",
    note: "Reuses documentation.{gap,present}; per-record shape not yet authored.",
  },
  {
    key: "inconsistency_flags",
    reason: "template-cut-needs-review-items",
    note: "Currently EMPTY_ARRAY unless T.risk.review_items produces bounded content.",
  },
  {
    key: "opening_summary",
    reason: "harvest-needs-subordination-wire",
    note: "T7 emitter present; the plan-conflict rejection + telemetry wire lands with T-M3.",
  },
  {
    key: "submission_summary",
    reason: "harvest-needs-subordination-wire",
    note: "cyber-audit-schedule + § 7120 crosswalk emitters present; subordination guard rides T-M3.",
  },
] as const;
