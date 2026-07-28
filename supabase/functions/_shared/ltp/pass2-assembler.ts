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
import { CPPA_RISK_SECTION_SHARDS, expectedEmissionForKey, type SectionShard, type ExpectedEmission } from "./section-shards/cppa-risk.ts";
import { renderTemplate, assertCalibrationMatch } from "./pass2-render.ts";
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
import { renderCyberAuditSchedule } from "./cyber-audit-schedule.ts";

export const PASS2_ASSEMBLER_VERSION = "ltp-pass2-assembler-2026-07-28-tm6";

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
    readonly model_role: "pass1_derive" | "harvest_legacy";
  }[];
  readonly intermediate_artifacts: readonly string[];
  readonly note: string;
}

export const COMPOSITION_SHAPE_DECLARATION: CompositionShapeDeclaration = {
  version: "cppa-risk-shape@2026-07-28-tm6",
  product: "cppa-risk-assessment",
  final_documents_per_assessment: 1,
  llm_calls_per_document: [
    { stage: "pass1_derive", role: "authoritative RenderPlan derive", model_role: "pass1_derive" },
    { stage: "harvest_legacy_generation", role: "Engine-A generation (subordinated; harvest guard filtered)", model_role: "harvest_legacy" },
  ],
  intermediate_artifacts: [
    "render_plan (authoritative)",
    "opening_summary_harvest (subordinated)",
    "submission_summary_harvest (subordinated)",
    "assembler_output (shipped body)",
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
  "scope_confirmation",
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
  const ids = shard.owner.template_ids;
  const rendered: string[] = [];
  const errors: string[] = [];
  const usedIds: string[] = [];
  for (const id of ids) {
    if (id === "deterministic") continue;
    const r = renderTemplate(id, plan);
    if (r.errors.length > 0) errors.push(...r.errors.map((e) => `${id}:${e}`));
    if (r.text && r.text.length > 0) {
      rendered.push(r.text);
      usedIds.push(id);
      // §2.5 flat-certainty on close balance.
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
  const value = rendered.length > 0 ? rendered : undefined;
  // PII gate on narrative-class surfaces.
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
    const artifact: SubmissionHarvestArtifact = harvest.submission_summary ?? {
      text: renderCyberAuditSchedule(),
      stamp: "cyber-audit-schedule@assembler-default",
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
    if (rendered.value !== undefined) {
      report[shard.key] = rendered.value;
    }
  }

  const shipped_surface = evaluateShippedSurfaceGuard(report);
  const shipped_value_screen = evaluateShippedValueScreen(report, { mode: exitMode });
  const emittedCount = sectionTele.filter((s) => s.emitted).length;
  const structural = structuralCompleteness(sectionTele);

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
  return assembleCore(plan, harvest, exitMode);
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
  readonly origin: "clock_cap" | "test_forced" | "unknown";
  readonly buildStamp?: string;
}): Record<string, unknown> {
  const disclosure =
    "Reserved-judgment output — the deterministic derive pass could not complete within the retry budget. " +
    "This document lists ONLY items needing your review; substantive risk conclusions are withheld. " +
    "Please resubmit or contact support.";
  return {
    schema_version: "cppa_risk_v4",
    opening_summary: disclosure,
    executive_summary: [disclosure],
    assessment_summary: { narrative: disclosure },
    submission_summary: renderCyberAuditSchedule(),
    risk_level: "reserved",
    overall_score: null,
    disclaimer:
      "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
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
    scope_confirmation: [],
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

