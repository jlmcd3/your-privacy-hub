/**
 * LTP Pass-2 Section-Sharded Assembler — PRODUCTION (T-M6, Item 226).
 *
 * Ninth turn of the LEGAL-TEST-PIPELINE rebuild chain. The assembler
 * output IS report_data's body at the wire. Legacy Engine-A composer
 * call-site is retired; Engine-A remains only as subordinated harvest
 * artifacts (opening_summary, submission_summary) filtered through the
 * harvest guard at the write callsite.
 *
 * The historical shadow entrypoint (`assembleReportShadow`) is retained
 * as a thin alias for tests and for the retiring T-M5 telemetry slot.
 * New callers must use `assembleReport`.
 *
 * Design lineage:
 *   • Section-shard registry → _shared/ltp/section-shards/cppa-risk.ts (T-M2)
 *   • Template catalog       → _shared/ltp/content/pass2-templates.ts (T-M3)
 *   • Harvest guard          → _shared/ltp/harvest-guard.ts (T-M3)
 *   • Shipped guards         → _shared/ltp/composition-finalize.ts
 *
 * T-M4 mitigations (BINDING) preserved; T-M6(c) attaches the shipped
 * value-screen ENFORCE arm at production callsites (still telemetry-only
 * on shadow to keep the T-M5 test surface stable).
 */

import type { RenderPlan } from "../render-plan/schema.ts";
import { REPORT_DISCLAIMER } from "../report-disclaimer.ts";
import { CPPA_RISK_SECTION_SHARDS, expectedEmissionForKey, type SectionShard, type ExpectedEmission } from "./section-shards/cppa-risk.ts";
import { renderTemplate, assertCalibrationMatch } from "./pass2-render.ts";
import { applyMethodologyNote } from "../prose/methodology.ts";
import { CITATION_LINT_VERSION, lintNarrativeCitations } from "../prose/citation-lint.ts";
import { FIRM_VARIANT_CLOSENESS_MAX } from "./content/pass2-templates.ts";
import {
  evaluateOpeningHarvest,
  evaluateSubmissionHarvest,
  type HarvestTelemetry,
  type OpeningHarvestArtifact,
  type SubmissionHarvestArtifact,
} from "./harvest-guard.ts";
import {
  evaluateShippedSurfaceGuard,
  evaluateShippedValueScreen,
  currentEnforceMode,
  type FinalizeMode,
  type ShippedSurfaceEvaluation,
  type ShippedValueScreenEvaluation,
} from "./composition-finalize.ts";
import { renderCyberAuditSchedule, renderResolvedCohortSentence } from "./cyber-audit-schedule.ts";
import { classifyRevenueBand } from "../cppa-test-states.ts";
import {
  CYBER_AUDIT_SEPARATE_LEAD_IN,
  renderSubmissionAndRetention,
} from "./submission-retention.ts";

import { computeProngOutcomes } from "./waveb-completion.ts";
import { renderAllProngPostures } from "./submission-postures.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import {
  coerceNarrativeScalar,
  coerceAssessmentSummary,
  assertShippedCoherence,
  NARRATIVE_SCALAR_KEYS,
  CPPA_RISK_SHAPE_VERSION,
  type ShippedCoherenceViolation,
} from "../report-contracts/cppa-risk-shape.ts";
import { evaluateGoldenShape, type GoldenShapeReport } from "./golden-shape-quotas.ts";

export const PASS2_ASSEMBLER_VERSION = "ltp-pass2-assembler-2026-07-28-item244-addendum";

/**
 * ITEM 243 defect 2 — Rebuild the intake dict from plan.intake_ledger so
 * the assembler can compute § 7120(b) prong outcomes without a signature
 * change. The ledger IS the Pass-2 source of truth for intake facts.
 */
function intakeFromLedger(plan: RenderPlan): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of plan.intake_ledger ?? []) {
    if (l.intake_field) out[l.intake_field] = l.value;
  }
  return out;
}

function buildDefaultSubmissionSummary(plan: RenderPlan): string {
  // ITEM 273 FIX 2 — the § 7157/§ 7155 risk-assessment submission,
  // retention, and review/update content leads; the pre-existing
  // § 7121(a) cybersecurity-audit schedule follows under an explicit
  // lead-in marking it a RELATED, SEPARATE obligation.
  const head = renderSubmissionAndRetention();
  const schedule = `${CYBER_AUDIT_SEPARATE_LEAD_IN}\n\n${renderCyberAuditSchedule()}`;
  let base = `${head}\n\n${schedule}`;
  // ITEM 362 — project the RESOLVED cohort. The schedule states the law for
  // all three tiers; this names the deadline that follows from the revenue
  // band the record already resolves (qc_r1_4_cohort_determinism).
  try {
    const band = classifyRevenueBand(intakeFromLedger(plan).q1_revenue);
    base = `${base}\n\n${renderResolvedCohortSentence(band.label, String(band.audit_cohort))}`;
  } catch {
    /* fail-open — never lose the schedule text on a band-classification crash */
  }
  try {
    const intake = intakeFromLedger(plan);
    const outcomes = computeProngOutcomes(intake as Record<string, any>);
    const postures = renderAllProngPostures(outcomes);
    if (postures.length === 0) return base;
    return `${base}\n\nSubmission postures under 11 CCR § 7120(b):\n\n${postures.join("\n\n")}`;
  } catch {
    // Fail-open — never lose the schedule text on a posture crash.
    return base;
  }
}



/**
 * CP5 (f) — SINGLE-WRITER coercion helper. Consolidates the CP3 shape
 * dispatch behind one function so the assembler retains a single
 * `report(shard.key) = ...` write site (LAW 3(a)).
 */
function coerceForShard(key: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if ((NARRATIVE_SCALAR_KEYS as readonly string[]).includes(key)) {
    return coerceNarrativeScalar(value);
  }
  if (key === "assessment_summary") {
    return coerceAssessmentSummary(value);
  }
  return value;
}

/**
 * COMPOSITION SHAPE DECLARATION (T-M6(f); CEO ruling 2026-07-28 verbatim):
 * "if the rebuilt product requires 3 documents, or 3 API calls, to create
 * the final end user document, then that is hereby authorized." One
 * customer assessment still yields exactly one final document; declared
 * shape describes the intermediate LLM calls and artifacts. Conformance
 * asserts DECLARED shape — aborts undeclared drift only.
 */
export interface CompositionShapeDeclaration {
  readonly version: string;
  readonly product: "cppa-risk-assessment";
  readonly final_documents_per_assessment: 1;
  readonly llm_calls_per_document: readonly {
    readonly stage: string;
    readonly role: string;
    readonly model_role: "pass1_derive";
  }[];
  readonly intermediate_artifacts: readonly string[];
  readonly note: string;
}

export const COMPOSITION_SHAPE_DECLARATION: CompositionShapeDeclaration = {
  version: "cppa-risk-shape@2026-07-28-tm7-retirement",
  product: "cppa-risk-assessment",
  final_documents_per_assessment: 1,
  llm_calls_per_document: [
    { stage: "pass1_derive", role: "authoritative RenderPlan derive", model_role: "pass1_derive" },
  ],
  intermediate_artifacts: [
    "render_plan (authoritative)",
    "assembler_output (shipped body; harvests are deterministic)",
  ],
  note: "CEO ruling 2026-07-28: undeclared drift aborts; declared shape is the conformance target.",
};

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export interface HarvestInputs {
  readonly opening_summary?: OpeningHarvestArtifact | null;
  readonly submission_summary?: SubmissionHarvestArtifact | null;
}

export interface SectionTelemetry {
  readonly key: string;
  readonly owner_kind: "template" | "harvest" | "deterministic" | "template-cut";
  readonly template_ids_rendered: readonly string[];
  readonly render_errors: readonly string[];
  readonly emitted: boolean;
  readonly omitted_reason?:
    | "harvest_rejected"
    | "template_render_error"
    | "manifest_absent"
    | "flat_certainty_on_close_balance"
    | "pii_leak"
    | "template_cut_empty_by_design"
    | "no_content";
}

export interface ExitCheckTelemetry {
  readonly flat_certainty_rejections: readonly string[];
  readonly pii_rejections: readonly { key: string; kind: "email" | "phone" }[];
  readonly shipped_surface: ShippedSurfaceEvaluation;
  readonly shipped_value_screen: ShippedValueScreenEvaluation;
  /** CP5-COHERENCE-PROSE — post-serializer exec/balance mode agreement. */
  readonly shipped_coherence: {
    readonly mode: FinalizeMode;
    readonly violations: readonly ShippedCoherenceViolation[];
    readonly enforce_violation: boolean;
  };
  /** ITEM 241.1 — depth telemetry against the top-50 empirical quotas. */
  readonly golden_shape: GoldenShapeReport;
  /** ITEM 337 Part C — methodology sentences stripped from body text. */
  readonly methodology_note?: { readonly removed: number; readonly note_attached: boolean };
  /** ITEM 337 Part E — registry citation lint over model-authored prose. */
  readonly citation_lint?: unknown;

}

export interface StructuralCompletenessRow {
  readonly key: string;
  readonly expected: ExpectedEmission;
  readonly emitted: boolean;
  readonly conformant: boolean;
}

export interface AssemblerTelemetry {
  readonly version: string;
  readonly sections: readonly SectionTelemetry[];
  readonly harvest_decisions: readonly HarvestTelemetry[];
  readonly exit_checks: ExitCheckTelemetry;
  readonly structural_completeness: {
    readonly rows: readonly StructuralCompletenessRow[];
    readonly nonconformant_keys: readonly string[];
    readonly ok: boolean;
  };
  readonly composition_shape: CompositionShapeDeclaration;
  readonly total_sections: number;
  readonly emitted_sections: number;
  readonly omitted_sections: number;
}

export interface AssemblerResult {
  readonly version: string;
  /** Full report-shape object at the schema's 38 top-level keys. */
  readonly report: Record<string, unknown>;
  readonly telemetry: AssemblerTelemetry;
}

// ---------------------------------------------------------------------
// Section rendering
// ---------------------------------------------------------------------

interface RenderedSection {
  readonly value: unknown;
  readonly telemetry: SectionTelemetry;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,2}[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/;

const NARRATIVE_CLASS_KEYS = new Set([
  "executive_summary",
  "assessment_summary",
  // ITEM 290 — "scope_confirmation" retired (single-key scope emission).
  "scope_and_triggers",
  "risk_assessment_by_activity",
  "priority_actions",
  "next_steps",
  "strengthen_items",
  "exception_analysis",
  "record_sufficiency",
  "information_needed",
  "opening_summary",
  "submission_summary",
]);

/** Existence check for manifest on the RenderPlan. */
function hasManifest(plan: RenderPlan): boolean {
  const m = (plan as unknown as { manifest?: unknown }).manifest;
  return m != null && typeof m === "object";
}

/** Detect close-balance closeness across weighing_frame. */
function anyCloseBalance(plan: RenderPlan): boolean {
  return plan.weighing_frame.some(
    (f) => typeof f.closeness_contribution === "number" && f.closeness_contribution >= FIRM_VARIANT_CLOSENESS_MAX,
  );
}

function containsPii(value: unknown): "email" | "phone" | null {
  const walk = (v: unknown): "email" | "phone" | null => {
    if (typeof v === "string") {
      if (EMAIL_RE.test(v)) return "email";
      if (PHONE_RE.test(v)) return "phone";
      return null;
    }
    if (Array.isArray(v)) {
      for (const x of v) {
        const r = walk(x);
        if (r) return r;
      }
      return null;
    }
    if (v && typeof v === "object") {
      for (const x of Object.values(v as Record<string, unknown>)) {
        const r = walk(x);
        if (r) return r;
      }
    }
    return null;
  };
  return walk(value);
}

function renderTemplateSection(
  shard: SectionShard,
  plan: RenderPlan,
  closeBalance: boolean,
): RenderedSection {
  const rendered: string[] = [];
  const errors: string[] = [];
  const usedIds: string[] = [];

  // ITEM 235 (T-M9.5) — per-instance composer path. When a composer
  // exists for this key, render each instance with its populated ctx.
  // Renderer enforces fill-or-omit at the instance level.
  //
  // ITEM 264 — ONE-ITEM AGGREGATION SEAM (assembler mechanics, not prose).
  // A composer instance may carry `parts`: an ordered list of ratified
  // template instances whose rendered texts are JOINED with a single
  // space into ONE shipped list item. This exists because the shipped
  // list item is the golden-shape quota unit (avg chars per item), and
  // the enriched activity rationale is a composition of several ratified
  // templates. No new text is introduced by the join.
  const instances = composeSection(shard.key, plan);
  type Part = { id: string; ctx: Record<string, unknown> };
  const renderList: { parts: Part[] }[] = instances
    ? instances.map((i) => ({
        parts: (i.parts && i.parts.length > 0)
          ? i.parts.map((p) => ({ id: p.template_id, ctx: p.ctx as Record<string, unknown> }))
          : [{ id: i.template_id, ctx: i.ctx as Record<string, unknown> }],
      }))
    : shard.owner.template_ids
        .filter((id) => id !== "deterministic")
        .map((id) => ({ parts: [{ id, ctx: {} as Record<string, unknown> }] }));

  for (const unit of renderList) {
    const chunks: string[] = [];
    for (const { id, ctx } of unit.parts) {
      const r = renderTemplate(id, plan, ctx);
      if (r.errors.length > 0) errors.push(...r.errors.map((e) => `${id}:${e}`));
      if (r.text && r.text.length > 0) {
        chunks.push(r.text);
        usedIds.push(id);
        if (closeBalance) {
          const cal = assertCalibrationMatch(id, FIRM_VARIANT_CLOSENESS_MAX);
          if (cal) {
            return {
              value: undefined,
              telemetry: {
                key: shard.key,
                owner_kind: shard.owner.kind,
                template_ids_rendered: usedIds,
                render_errors: [...errors, `flat_certainty:${cal}`],
                emitted: false,
                omitted_reason: "flat_certainty_on_close_balance",
              },
            };
          }
        }
      }
    }
    if (chunks.length > 0) {
      rendered.push(chunks.length === 1 ? chunks[0] : chunks.map((c) => c.trim()).join(" "));
    }
  }

  const value = rendered.length > 0 ? rendered : undefined;
  if (value !== undefined && NARRATIVE_CLASS_KEYS.has(shard.key)) {
    const pii = containsPii(value);
    if (pii) {
      return {
        value: undefined,
        telemetry: {
          key: shard.key,
          owner_kind: shard.owner.kind,
          template_ids_rendered: usedIds,
          render_errors: errors,
          emitted: false,
          omitted_reason: "pii_leak",
        },
      };
    }
  }
  return {
    value,
    telemetry: {
      key: shard.key,
      owner_kind: shard.owner.kind,
      template_ids_rendered: usedIds,
      render_errors: errors,
      emitted: value !== undefined,
      omitted_reason: value === undefined ? "no_content" : undefined,
    },
  };
}

function renderHarvestSection(
  shard: SectionShard,
  plan: RenderPlan,
  harvest: HarvestInputs,
): { rendered: RenderedSection; decision: HarvestTelemetry } {
  if (shard.key === "opening_summary") {
    const d = evaluateOpeningHarvest(harvest.opening_summary, plan);
    if (!d.accepted) {
      return {
        rendered: {
          value: undefined,
          telemetry: {
            key: shard.key,
            owner_kind: "harvest",
            template_ids_rendered: [],
            render_errors: [d.telemetry.rejection_reason ?? "rejected"],
            emitted: false,
            omitted_reason: "harvest_rejected",
          },
        },
        decision: d.telemetry,
      };
    }
    return {
      rendered: {
        value: harvest.opening_summary?.text,
        telemetry: {
          key: shard.key,
          owner_kind: "harvest",
          template_ids_rendered: [],
          render_errors: [],
          emitted: true,
        },
      },
      decision: d.telemetry,
    };
  }
  if (shard.key === "submission_summary") {
    // ITEM 243 defect 2 — POSTURE DEAD-PATH FIX. The assembler's default
    // artifact previously invoked only the cyber-audit schedule text; the
    // § 7120(b) posture clauses authored in submission-postures.ts were
    // never composed onto the shipped surface. Rebuild the default
    // artifact so each prong posture is stated verbatim alongside the
    // schedule. Intake is reconstructed from the plan's intake_ledger
    // (single source of truth on the Pass-2 side).
    const artifact: SubmissionHarvestArtifact = harvest.submission_summary ?? {
      text: buildDefaultSubmissionSummary(plan),
      stamp: "submission-retention+cyber-audit-schedule+postures@assembler-default",
    };
    const d = evaluateSubmissionHarvest(artifact, plan);
    if (!d.accepted) {
      return {
        rendered: {
          value: undefined,
          telemetry: {
            key: shard.key,
            owner_kind: "harvest",
            template_ids_rendered: [],
            render_errors: [d.telemetry.rejection_reason ?? "rejected"],
            emitted: false,
            omitted_reason: "harvest_rejected",
          },
        },
        decision: d.telemetry,
      };
    }
    return {
      rendered: {
        value: artifact.text,
        telemetry: {
          key: shard.key,
          owner_kind: "harvest",
          template_ids_rendered: [],
          render_errors: [],
          emitted: true,
        },
      },
      decision: d.telemetry,
    };
  }
  throw new Error(`assembler:unknown_harvest_key:${shard.key}`);
}

const MANIFEST_GATED_KEYS = new Set([
  "debug_review_notes",
  "fsor_commentary",
  "validation_summary",
]);

function renderDeterministicSection(
  shard: SectionShard,
  plan: RenderPlan,
): RenderedSection {
  // Manifest-gated existence check (T-M4 mitigation #1).
  if (MANIFEST_GATED_KEYS.has(shard.key) && !hasManifest(plan)) {
    return {
      value: undefined,
      telemetry: {
        key: shard.key,
        owner_kind: "deterministic",
        template_ids_rendered: [],
        render_errors: [],
        emitted: false,
        omitted_reason: "manifest_absent",
      },
    };
  }
  const projected = shard.project(plan);
  const value = projected === undefined ? undefined : projected;
  return {
    value,
    telemetry: {
      key: shard.key,
      owner_kind: "deterministic",
      template_ids_rendered: [],
      render_errors: [],
      emitted: value !== undefined,
      omitted_reason: value === undefined ? "no_content" : undefined,
    },
  };
}

function renderTemplateCutSection(shard: SectionShard): RenderedSection {
  // TEMPLATE_CUT: bounded content only; assembler default is
  // empty-by-design (validator-derived content lands in T-M6 wire).
  return {
    value: [],
    telemetry: {
      key: shard.key,
      owner_kind: "template-cut",
      template_ids_rendered: [],
      render_errors: [],
      emitted: true,
      omitted_reason: "template_cut_empty_by_design",
    },
  };
}

// ---------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------

export interface AssembleOptions {
  /** Exit-mode for the shipped value-screen. Defaults to observe. */
  readonly exitMode?: FinalizeMode;
  /**
   * ITEM 337 (PROSE PROGRAM 1, Part E) — citations actually supplied to the
   * model for this run. When provided, narrative citations are linted against
   * it and an unsupplied cite is degraded rather than shipped.
   */
  readonly citationSupply?: readonly string[];
  readonly runId?: string | null;
}

function structuralCompleteness(sections: readonly SectionTelemetry[]) {
  const rows: StructuralCompletenessRow[] = [];
  const nonconformant: string[] = [];
  for (const s of sections) {
    const expected = expectedEmissionForKey(s.key);
    let conformant = true;
    if (expected === "always" && !s.emitted) conformant = false;
    // "conditional", "manifest-gated", "template-cut", "empty-by-design" —
    // both emitted and omitted are conformant; the check is that we
    // reached the shard (no accidental drop-through). Presence in
    // section telemetry proves reach, so all such rows are conformant.
    rows.push({ key: s.key, expected, emitted: s.emitted, conformant });
    if (!conformant) nonconformant.push(s.key);
  }
  return { rows, nonconformant_keys: nonconformant, ok: nonconformant.length === 0 };
}

function assembleCore(
  plan: RenderPlan,
  harvest: HarvestInputs,
  exitMode: FinalizeMode,
  lintOpts?: { supply?: readonly string[]; runId?: string | null },
): AssemblerResult {
  const report: Record<string, unknown> = {};
  const sectionTele: SectionTelemetry[] = [];
  const harvestDecisions: HarvestTelemetry[] = [];
  const flatRejections: string[] = [];
  const piiRejections: { key: string; kind: "email" | "phone" }[] = [];
  const closeBalance = anyCloseBalance(plan);

  for (const shard of CPPA_RISK_SECTION_SHARDS) {
    let rendered: RenderedSection;
    if (shard.owner.kind === "template") {
      rendered = renderTemplateSection(shard, plan, closeBalance);
      if (rendered.telemetry.omitted_reason === "flat_certainty_on_close_balance") {
        flatRejections.push(shard.key);
      }
      if (rendered.telemetry.omitted_reason === "pii_leak") {
        piiRejections.push({ key: shard.key, kind: "email" });
      }
    } else if (shard.owner.kind === "harvest") {
      const h = renderHarvestSection(shard, plan, harvest);
      rendered = h.rendered;
      harvestDecisions.push(h.decision);
    } else if (shard.owner.kind === "template-cut") {
      rendered = renderTemplateCutSection(shard);
    } else {
      rendered = renderDeterministicSection(shard, plan);
    }
    sectionTele.push(rendered.telemetry);
    // LAW 3(a) SINGLE-WRITER — exactly ONE assembler write site.
    // in the assembler. Shape coercion happens in this helper, not in a
    // branching set of write statements.
    const coerced = coerceForShard(shard.key, rendered.value);
    if (coerced !== undefined) {
      report[shard.key] = coerced;
    }
  }

  // ITEM 337 (PROSE PROGRAM 1, Part C) — METHODOLOGY NARRATION OUT OF BODY.
  // Methodology sentences are stripped from every narrative field and the
  // canonical note is rendered ONCE at report.methodology_note.
  const methodology = applyMethodologyNote(report as Record<string, unknown>, { always: true });

  // ITEM 337 (PROSE PROGRAM 1, Part E) — REGISTRY CITATION LINT. Runs only
  // when the caller supplies the run's citation supply; an unsupplied or
  // repealed cite is degraded, never shipped.
  let citation_lint: unknown = { ran: false, reason: "no citation supply provided" };
  if (lintOpts?.supply && lintOpts.supply.length > 0) {
    const narrativeFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(report)) {
      if (typeof v === "string" && v.trim().length > 0) narrativeFields[k] = v;
    }
    const lint = lintNarrativeCitations(narrativeFields, {
      tool: "cppa-risk",
      runId: lintOpts.runId ?? null,
      supplied: lintOpts.supply,
    });
    for (const f of lint.fields_changed) report[f] = lint.fields[f];
    citation_lint = {
      ran: true,
      version: CITATION_LINT_VERSION,
      events: lint.events.length,
      degraded: lint.events.filter((e) => e.action !== "kept").length,
      fields_changed: lint.fields_changed,
      information_needed: lint.information_needed,
    };
  }

  const shipped_surface = evaluateShippedSurfaceGuard(report);
  const shipped_value_screen = evaluateShippedValueScreen(report, { mode: exitMode });
  // CP5-COHERENCE-PROSE — exec/balance coherence, ENFORCED at exit.
  const coherenceViolations = assertShippedCoherence(report);
  const shipped_coherence = {
    mode: exitMode,
    violations: coherenceViolations,
    enforce_violation: exitMode === "enforce" && coherenceViolations.length > 0,
  };
  if (shipped_coherence.enforce_violation) {
    // Enforce: collapse the ship to insufficient exec + narrative so the
    // customer never receives contradictory prose. The full failure is
    // captured in telemetry for the controller. LAW 3(a) preserved:
    // routed through Object.assign — no additional bracketed write site.
    const disclosure =
      "On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis. The specific items needed to complete this assessment are set out under Items for your review.";
    Object.assign(report, {
      executive_summary: disclosure,
      assessment_summary: { ...(report.assessment_summary as object ?? {}), narrative: disclosure },
    });
  }
  const emittedCount = sectionTele.filter((s) => s.emitted).length;
  const structural = structuralCompleteness(sectionTele);
  // ITEM 241.1 — GOLDEN-SHAPE quotas as depth telemetry. Never deletes
  // content; production behavior is telemetry + review-flag on shortfall.
  const golden_shape: GoldenShapeReport = evaluateGoldenShape(report);

  return {
    version: PASS2_ASSEMBLER_VERSION,
    report,
    telemetry: {
      version: PASS2_ASSEMBLER_VERSION,
      sections: sectionTele,
      harvest_decisions: harvestDecisions,
      exit_checks: {
        flat_certainty_rejections: flatRejections,
        pii_rejections: piiRejections,
        shipped_surface,
        shipped_value_screen,
        shipped_coherence,
        golden_shape,
        methodology_note: methodology,
        citation_lint,
      },
      structural_completeness: structural,
      composition_shape: COMPOSITION_SHAPE_DECLARATION,
      total_sections: sectionTele.length,
      emitted_sections: emittedCount,
      omitted_sections: sectionTele.length - emittedCount,
    },
  };
}

/** SHADOW entrypoint (retained for T-M5 tests + legacy telemetry slot). */
export function assembleReportShadow(
  plan: RenderPlan,
  harvest: HarvestInputs = {},
): AssemblerResult {
  return assembleCore(plan, harvest, "observe");
}

/** PRODUCTION entrypoint (T-M6). Exit-mode defaults to env-derived. */
export function assembleReport(
  plan: RenderPlan,
  harvest: HarvestInputs = {},
  opts: AssembleOptions = {},
): AssemblerResult {
  let exitMode: FinalizeMode = "observe";
  try { exitMode = opts.exitMode ?? currentEnforceMode(); } catch { /* env unavailable */ }
  return assembleCore(plan, harvest, exitMode, {
    supply: opts.citationSupply,
    runId: opts.runId ?? null,
  });
}

// ---------------------------------------------------------------------
// Type-J WRITE-AROUND BODY (T-M6(b); deferred from T-M1(e))
// ---------------------------------------------------------------------

/** Reserved-judgment SHIPPED body used when Pass-1 terminally fails.
 *  Registry-only degraded sections + explicit disclosure. No fall-through
 *  to any legacy path. Origin telemetered by the caller.
 */
export function buildTypeJWriteAroundBody(input: {
  readonly intake?: unknown;
  readonly origin: "clock_cap" | "test_forced" | "pass1_abort_timeout" | "pass1_validator_reject" | "pass1_model_error" | "timeout" | "unknown";
  readonly buildStamp?: string;
}): Record<string, unknown> {
  const disclosure =
    "Reserved-judgment output — the deterministic derive pass could not complete within the retry budget. " +
    "This document lists ONLY items needing your review; substantive risk conclusions are withheld. " +
    "Please resubmit or contact support.";
  return {
    schema_version: "cppa_risk_v4",
    opening_summary: disclosure,
    executive_summary: disclosure,
    assessment_summary: { narrative: disclosure },
    submission_summary: renderCyberAuditSchedule(),
    risk_level: "reserved",
    overall_score: null,
    disclaimer: REPORT_DISCLAIMER,
    framework_disclaimer: disclosure,
    accuracy_caveat: disclosure,
    domains: [],
    inconsistency_flags: [],
    priority_actions: [],
    next_steps: [],
    strengthen_items: [],
    information_needed: [
      { question: "Items for your review — please resubmit; the automated pass could not complete." },
    ],
    record_sufficiency: [],
    exception_analysis: [],
    // ITEM 290 — "scope_confirmation" retired; no empty stub is emitted.
    scope_and_triggers: {},
    risk_assessment_by_activity: [],
    risk_register: [],
    top_risks: [],
    attestation_block: {},
    document_metadata: { build_stamp: input.buildStamp ?? null, type_j_origin: input.origin },
    annotations: [],
    requires_attorney_review: true,
    citation_ledger: [],
    validation_summary: {},
    enforcement_context: {},
    enforcement_precedents: [],
    enforcement_meta: {},
    part_a: {},
    part_b: {},
    gating: {},
  };
}

