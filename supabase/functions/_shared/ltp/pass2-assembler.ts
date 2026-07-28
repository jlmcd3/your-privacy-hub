/**
 * LTP Pass-2 Section-Sharded Assembler — SHADOW MODE (T-M5, Item 225).
 *
 * Seventh turn of the LEGAL-TEST-PIPELINE rebuild chain (Items 219–224
 * complete). Pure module. NO writes to the shipped surface. Output
 * persists to _meta.internal.assembler_shadow, mirroring the Item-221
 * render_plan pattern. Legacy composer path is untouched.
 *
 * Design lineage:
 *   • Section-shard registry → _shared/ltp/section-shards/cppa-risk.ts (T-M2)
 *   • Template catalog       → _shared/ltp/content/pass2-templates.ts (T-M3)
 *   • Harvest guard          → _shared/ltp/harvest-guard.ts (T-M3)
 *   • Shipped guards         → _shared/ltp/composition-finalize.ts
 *                              (evaluateShippedSurfaceGuard + shipped
 *                              value screen; TELEMETRY-ONLY on shadow).
 *
 * T-M4 mitigations (BINDING):
 *   (1) MANIFEST-HYDRATION: existence check gates all manifest-derived
 *       projections (debug_review_notes / fsor_commentary /
 *       validation_summary). Absent manifest → empty-by-finding.
 *   (2) HARVEST GUARD AT WRITE CALLSITE: evaluateOpeningHarvest /
 *       evaluateSubmissionHarvest run HERE. Rejection → omit + telemeter.
 *   (3) SHADOW OUTPUT ONLY.
 *   (4) SHIPPED GUARDS TELEMETRY-ONLY.
 *   (5) STALE TESTS: waveb.test.ts model + template-count assertions
 *       fixed alongside this turn.
 *
 * Assembler-exit checks (per T-M5 dispatch):
 *   • §2.5 flat-certainty on close balance: if any balance section
 *     rendered "T.risk.balance.firm" while any activity closeness
 *     >= FIRM_VARIANT_CLOSENESS_MAX, hard-reject that section.
 *   • PII post-render: email/phone regex on narrative-class surfaces
 *     = hard reject (in shadow mode: omit + telemeter, never ship
 *     because the whole assembler is shadow).
 */

import type { RenderPlan } from "../render-plan/schema.ts";
import { CPPA_RISK_SECTION_SHARDS, type SectionShard } from "./section-shards/cppa-risk.ts";
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
  type ShippedSurfaceEvaluation,
  type ShippedValueScreenEvaluation,
} from "./composition-finalize.ts";
import { renderCyberAuditSchedule } from "./cyber-audit-schedule.ts";

export const PASS2_ASSEMBLER_VERSION = "ltp-pass2-assembler-2026-07-28-tm5-shadow";

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

export interface AssemblerTelemetry {
  readonly version: string;
  readonly sections: readonly SectionTelemetry[];
  readonly harvest_decisions: readonly HarvestTelemetry[];
  readonly exit_checks: ExitCheckTelemetry;
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

export function assembleReportShadow(
  plan: RenderPlan,
  harvest: HarvestInputs = {},
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

  // Assembler-exit shipped guards — TELEMETRY-ONLY on shadow.
  const shipped_surface = evaluateShippedSurfaceGuard(report);
  const shipped_value_screen = evaluateShippedValueScreen(report, { mode: "observe" });

  const emittedCount = sectionTele.filter((s) => s.emitted).length;

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
      total_sections: sectionTele.length,
      emitted_sections: emittedCount,
      omitted_sections: sectionTele.length - emittedCount,
    },
  };
}
