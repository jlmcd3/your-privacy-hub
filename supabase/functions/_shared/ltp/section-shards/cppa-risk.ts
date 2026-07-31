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
  "cppa-risk-section-shards-2026-07-28-tm3";

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

// ---------------------------------------------------------------------
// ITEM 236 fix (c) — Deterministic composers for always-emitting boilerplate
// surfaces. Every 38-key row now has an honest expected-emission class;
// the E2E document gate (LAW 2, tightened) fails when any always-section
// omits — an always-section's absence is never intentional.
// ---------------------------------------------------------------------

const STANDARD_DISCLAIMER =
  "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.";

const FRAMEWORK_DISCLAIMER =
  "This assessment is structured against the framework of the CCPA and its implementing regulations (11 CCR §§ 7150–7157). It is a documentation aid, not a legal opinion.";

const ACCURACY_CAVEAT =
  "The analytical outputs in this document are computed deterministically from the intake record and the corpus-verified statutory anchors. Facts that are silent on the record are omitted, never invented.";

const ENFORCEMENT_CONTEXT_STANDING_LINE =
  "No CPPA enforcement precedents are verified in the corpus at the time of this assessment. Enforcement context will be added when precedent rows are ingested and 40-character verbatim substring verified.";

const ATTESTATION_TEXT =
  "This assessment must be reviewed and attested to by qualified legal counsel before operational reliance. The Company remains responsible for the accuracy of the underlying intake and for its determination under 11 CCR § 7152.";

export const CPPA_RISK_SECTION_SHARDS: readonly SectionShard[] = [
  // ── Metadata / frontend contract literals (deterministic) ─────────
  {
    key: "schema_version",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "schema-version-literal" },
    project: (_plan) => "cppa_risk_v4",
    note: "Frontend-visible schema tag; literal owned by the shard.",
  },
  {
    key: "document_metadata",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "document-metadata-composer" },
    project: (plan) => ({
      tool: "cppa_risk_assessment",
      render_plan_version: (plan as unknown as { plan_version?: string }).plan_version ?? "v1",
      build_stamp: plan.build_stamp,
      jurisdiction_tag: plan.jurisdiction_tag,
    }),
  },
  {
    key: "attestation_block",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "attestation-block-composer" },
    project: (_plan) => ({ text: ATTESTATION_TEXT, attested: false }),
  },
  {
    key: "disclaimer",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "standard-disclaimer-literal" },
    project: (_plan) => STANDARD_DISCLAIMER,
    note: 'Core-memory Standard Disclaimer literal ("not legal advice…").',
  },
  {
    key: "framework_disclaimer",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "framework-disclaimer-literal" },
    project: (_plan) => FRAMEWORK_DISCLAIMER,
  },
  {
    key: "accuracy_caveat",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "accuracy-caveat-literal" },
    project: (_plan) => ACCURACY_CAVEAT,
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
      // T-M3: dedicated top-of-report shape (distinct from summary.opening.*).
      template_ids: [
        "T.risk.exec.firm",
        "T.risk.exec.hedged",
        "T.risk.exec.negative",
        "T.risk.exec.insufficient",
        // ITEM 276 — primary-activity subject lead (Item-275 fields only).
        "T.risk.exec.primary_subject_lead",
      ],
    },
    project: projectFactorTable,
    note: "T-M3: dedicated exec templates (firm/hedged/negative/insufficient); calibration inherits from balance variant per FIRM_VARIANT_CLOSENESS_MAX.",
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
  // ITEM 290 — SINGLE-KEY SCOPE EMISSION. The `scope_confirmation` shard is
  // RETIRED: it rendered the identical composeScope() output under a second
  // key, and the GTM duplication detector correctly blocked the twin
  // (section_cross_duplication:scope_confirmation=scope_and_triggers). Both
  // renderers read `scope_and_triggers` FIRST
  // (src/components/cppa/RiskAssessmentReportLTP.tsx:130,
  //  supabase/functions/generate-report-pdf/index.ts:1249), so the surviving
  // key is `scope_and_triggers`. The retired key is NOT emitted at all — no
  // empty stub (fill-or-omit).

  {
    key: "scope_and_triggers",
    owner: {
      kind: "template",
      template_ids: [
        "T.risk.applicability.engaged",
        "T.risk.applicability.not_engaged",
        // ITEM 276 — § 7156(a) comparable-set segmentation item.
        "T.risk.scope.secondary_segmentation",
      ],
    },
    project: projectPropositionsByType("R"),
    note: "scope_notes CUT (OBJECT_PRUNE); triggered_activities_detail retained via object allow-list.",
  },
  // ── ITEM 244 (L1) — Processing Narrative ─────────────────────────
  {
    key: "processing_narrative",
    owner: {
      kind: "template",
      template_ids: ["T.risk.processing_narrative"],
    },
    project: projectIntakeLedger,
    note: "ITEM 244 (L1): deterministic prose from operational-elements ledger; silent sub-elements resolve to 'not stated on the record'.",
  },
  // ── ITEM 305 — Per-activity ANALYTIC DELIVERABLES ────────────────
  {
    key: "activity_analytics",
    owner: {
      kind: "deterministic",
      template_ids: ["deterministic"],
      emitter: "_shared/ltp/analytic-deliverables/build.ts (§ 7152(a)(2),(4),(5),(6),(7))",
    },
    project: (plan) => (plan as unknown as { activity_analytics?: unknown }).activity_analytics,
    note:
      "ITEM 305: necessity_analysis / harm_causation / safeguard_map / weighing / consequence, per assessed activity. Deterministic; the prose pass narrates it and may not alter it.",
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
    project: (plan) => plan.factor_table.filter((r) => r.kind === "negative_impact"),
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
      // T-M3: dedicated per-action shape (owner-slot deadline_basis).
      template_ids: ["T.risk.priority_action"],
    },
    project: (plan) => plan.factor_table.filter((r) => /gap|action|remediat/i.test(r.factor_id)),
    note: "T-M3: dedicated priority_action template; deadline_basis owner-slot enforced by STRUCTURED_OWNER_SLOTS + assertStructuredSlotShape.",
  },
  {
    key: "next_steps",
    owner: {
      kind: "template",
      // T-M3: dedicated per-step shape; ordering + dedup vs priority_actions
      // governed by NEXT_STEPS_MATERIALITY_TIERS + the dedup law in
      // pass2-templates.ts (T-M3 CONTENT COURIER 2026-07-28).
      template_ids: ["T.risk.next_step"],
    },
    project: projectFactorTable,
    note: "T-M3: dedicated next_step template; dedup vs priority_actions by case-insensitive action_label match; materiality-tier ordering; most-cautious-wins.",
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
      // T-M3: T.risk.review_items is the LIST-LEVEL surface template;
      // T.risk.review_items.entry is the per-entry shape it wraps.
      template_ids: ["T.risk.review_items", "T.risk.review_items.entry"],
      emitter: "TEMPLATE_CUT — key retained; content restricted to T.risk.review_items output (validator/gate-derived; EMPTY_ARRAY otherwise)",
    },
    project: (plan) => plan.propositions.filter((p) => p.epistemic_type === "J"),
    note: "T-M3: wired to T.risk.review_items + T.risk.review_items.entry; EMPTY_ARRAY when validators produce no bounded content.",
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
      // T-M3: dedicated per-record item shape.
      template_ids: ["T.risk.record_sufficiency.item"],
    },
    project: projectFactorTable,
    note: "T-M3: dedicated record_sufficiency.item template; element_status_clause is the closed RECORD_STATUS_CLAUSES enum.",
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
    // ITEM 237 fix (c) — emit as empty-by-design so telemetry states the
    // truth (structural presence at the shard) rather than `no_content`.
    project: () => ({}),
    note: "V3 legacy surface. Frontend-tolerant. Emits {} as empty-by-design.",
  },
  {
    key: "part_b",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "legacy-v3-passthrough" },
    project: () => ({}),
    note: "V3 legacy surface. Frontend-tolerant. Emits {} as empty-by-design.",
  },
  {
    key: "gating",
    owner: { kind: "deterministic", template_ids: ["deterministic"], emitter: "legacy-v3-passthrough" },
    project: () => ({}),
    note: "V3 legacy surface. Frontend-tolerant. Emits {} as empty-by-design.",
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
    project: (_plan) => ENFORCEMENT_CONTEXT_STANDING_LINE,
    note: "Limited-history standing line; replaced when CPPA enforcement rows verified into the corpus.",
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

/**
 * ITEM 290 — keys the P2 serializer whitelist still carries for LEGACY
 * (Track-1) rows but that Track-2 no longer emits. `scope_confirmation` is
 * retired from LTP emission (single-key scope emission, CEO ruling
 * 2026-07-30) while the production Track-1 engine still emits the legacy
 * OBJECT shape read by src/pages/CPPARiskAssessmentResult.tsx:328,
 * src/pages/CPPASuiteResult.tsx:66 and
 * supabase/functions/generate-cppa-suite-pdf/index.ts:59. The registry view
 * of the schema therefore excludes it.
 */
export const CPPA_RISK_LEGACY_ONLY_KEYS: readonly string[] = ["scope_confirmation"];

export function schemaTopLevelKeys(): readonly string[] {
  return CPPA_RISK_REPORT_SCHEMA.topLevel.filter(
    (k) => !CPPA_RISK_LEGACY_ONLY_KEYS.includes(k),
  );
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

/**
 * T-M3 status (2026-07-28): all seven Item-222 gap-report rows are
 * closed. Remaining Pass-2 wire-in (make the shipped surface come from
 * templates + harvest guard) is the T-M6 cutover; the AUTHORING and
 * GUARDS are complete here.
 *
 *   • executive_summary       — T.risk.exec.{firm,hedged,negative,insufficient}
 *   • priority_actions        — T.risk.priority_action (owner-slot deadline_basis)
 *   • next_steps              — T.risk.next_step + NEXT_STEPS_MATERIALITY_TIERS + dedup law
 *   • record_sufficiency      — T.risk.record_sufficiency.item + RECORD_STATUS_CLAUSES
 *   • inconsistency_flags     — T.risk.review_items + T.risk.review_items.entry (TEMPLATE_CUT)
 *   • opening_summary         — evaluateOpeningHarvest (harvest-guard.ts)
 *   • submission_summary      — evaluateSubmissionHarvest (harvest-guard.ts)
 */
export const CPPA_RISK_TEMPLATE_GAPS: readonly GapEntry[] = [] as const;

// ---------------------------------------------------------------------
// T-M6: EXPECTED-EMISSION CLASSIFICATION (structural completeness).
// ---------------------------------------------------------------------
//
// Every top-level report_data key is classified so the assembler can
// tell "intentionally empty" from "accidentally blank":
//
//   • "always"         — Must be emitted on any valid RenderPlan.
//   • "conditional"    — Emitted only when plan slice is non-empty.
//   • "manifest-gated" — Emitted only when RenderPlan.manifest is present.
//   • "template-cut"   — Bounded/empty-by-design (validator-derived).
//   • "empty-by-design"— Legacy passthrough / empty-by-finding surface.
//
// Test cppa-risk.tm6-structural.test.ts asserts every 38 keys have a
// classification and that assembler emissions match. Add new keys here
// when the schema top-level allow-list grows.
export type ExpectedEmission =
  | "always"
  | "conditional"
  | "manifest-gated"
  | "template-cut"
  | "empty-by-design";

const EXPECTED_EMISSION_MAP: Readonly<Record<string, ExpectedEmission>> = {
  // Metadata / disclaimers — ITEM 236 fix (c): always present (real
  // deterministic literal projections; boilerplate absence is never
  // intentional and the tightened E2E gate enforces this).
  schema_version: "always",
  document_metadata: "always",
  attestation_block: "always",
  disclaimer: "always",
  framework_disclaimer: "always",
  accuracy_caveat: "always",
  domains: "always",
  _meta: "always",
  // Headline scores — always emitted from factor_table.
  overall_score: "always",
  risk_level: "always",
  // Harvest bindings — subordinated to plan; conditional emission.
  opening_summary: "conditional",
  submission_summary: "conditional",
  // Body sections — conditional on non-empty template render.
  executive_summary: "conditional",
  assessment_summary: "conditional",
  // ITEM 290 — `scope_confirmation` RETIRED (single-key scope emission).
  scope_and_triggers: "conditional",
  processing_narrative: "conditional",
  // ITEM 305 — always emitted: the builder degrades rather than omitting.
  activity_analytics: "always",

  risk_assessment_by_activity: "conditional",
  risk_register: "conditional",
  top_risks: "conditional",
  priority_actions: "conditional",
  next_steps: "conditional",
  strengthen_items: "conditional",
  inconsistency_flags: "template-cut",
  exception_analysis: "conditional",
  record_sufficiency: "conditional",
  information_needed: "conditional",
  // V3 legacy passthroughs — ITEM 236 fix (c): empty-by-design.
  // Assembler ships them as `{}` (see deterministic projections) so
  // absence is honest and intentional.
  part_a: "empty-by-design",
  part_b: "empty-by-design",
  gating: "empty-by-design",
  // Annotations / debug — manifest or plan-derived.
  annotations: "conditional",
  requires_attorney_review: "conditional",
  debug_review_notes: "manifest-gated",
  fsor_commentary: "manifest-gated",
  citation_ledger: "conditional",
  validation_summary: "manifest-gated",
  // Enforcement — standing line always emitted until precedents ingested.
  enforcement_context: "always",
  enforcement_precedents: "empty-by-design",
  enforcement_meta: "empty-by-design",
};

export function expectedEmissionForKey(key: string): ExpectedEmission {
  return EXPECTED_EMISSION_MAP[key] ?? "conditional";
}

/** T-M6(c): shard-derived top-level allow-list — single source of truth
 *  regenerated from the section-shard registry for surface-guard binding. */
export function deriveTopLevelAllowedKeys(): readonly string[] {
  return CPPA_RISK_SECTION_SHARDS.map((s) => s.key);
}

