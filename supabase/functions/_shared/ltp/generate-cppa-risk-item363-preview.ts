/**
 * ITEM 369 — cppa-risk ITEM-363 PREVIEW ENTRYPOINT (BUILD-AND-PROVE ONLY).
 *
 * NOT REACHABLE FROM ANY LIVE ROUTE, CRON OR WEBHOOK. Nothing in
 * `supabase/functions/*\/index.ts` imports this module. It exists so the
 * Item 363 frame/plan pipeline can be exercised end-to-end — through the real
 * PDF exporter and the real viewer — beside the live path, exactly as the T-M
 * cutover (Items 355/357/359/360) was built and proved before it was flipped.
 *
 * REUSE LAW: every input is obtained through the SAME call site the live path
 * uses. This module fetches nothing of its own:
 *   - base payload      → generateCppaRiskReport (generate-cppa-risk.ts)
 *   - intake normalize  → resolveLtpIntake (entry-intake.ts, Item 350)
 *   - EU corpus         → fetchEuAuthorityCorpus (eu-authority/fetch.ts)
 *   - activity analytics→ buildActivityAnalytics (analytic-deliverables/build.ts)
 *   - approved library  → loadFrameSet / loadDocumentPlan (library-source.ts,
 *                         reading prose_frame_sets / prose_document_plans)
 *
 * FAIL-CLOSED: if the approved library cannot be loaded, or if it is not
 * `approved`, this entrypoint throws. It never silently returns the live
 * payload dressed up as a prose-9 payload — that would defeat the proof.
 */
import {
  generateCppaRiskReport,
  type GenerateCppaRiskOptions,
  type GenerateCppaRiskResult,
} from "./generate-cppa-risk.ts";
import { resolveLtpIntake } from "./entry-intake.ts";
import { fetchEuAuthorityCorpus } from "./eu-authority/fetch.ts";
import { buildEuAuthoritySection } from "./eu-authority/build.ts";
import { buildActivityAnalytics } from "./analytic-deliverables/build.ts";
import {
  loadDocumentPlan,
  loadFrameSet,
  type ProseLibrarySource,
} from "../prose/library-source.ts";
import {
  composeCppaRisk,
  CPPA_RISK_COMPOSE_VERSION,
} from "../prose/plans/cppa-risk.compose.ts";
import { renderDocumentFromPlan } from "../prose/plan-render.ts";
import {
  applyProse9Mapping,
  CPPA_RISK_PROSE9_SHAPE_VERSION,
  type Prose9Section,
  type ProseDocumentEnvelope,
} from "../report-contracts/cppa-risk-prose9.ts";

export const ITEM369_PREVIEW_STAMP = "generate-cppa-risk-item363-preview@2026-08-02-item369";

export interface Item363PreviewOptions extends GenerateCppaRiskOptions {
  /** Where the approved frame set / document plan are read from. Required. */
  readonly librarySource: ProseLibrarySource;
  /**
   * Offline proving only: the file-backed source reports `approved:false`
   * because approval lives in the DB row. Set true to render anyway. The
   * DB-backed source must NEVER need this.
   */
  readonly allowUnapprovedLibrary?: boolean;
}

export interface Item363PreviewResult extends GenerateCppaRiskResult {
  /** Persisted-shape payload: live v1 payload + prose-9 envelope + overlays. */
  readonly report: Record<string, unknown>;
  /** The live v1 payload, untouched, for before/after diffing. */
  readonly baselineReport: Record<string, unknown>;
  readonly envelope: ProseDocumentEnvelope;
  /** Sections as rendered, with lint findings, for the Phase-2 battery. */
  // deno-lint-ignore no-explicit-any
  readonly rendered: any;
  readonly composed: ReturnType<typeof composeCppaRisk>;
}

export async function generateCppaRiskReportItem363Preview(
  rawIntakeInput: unknown,
  options: Item363PreviewOptions,
): Promise<Item363PreviewResult> {
  const rawIntake = (rawIntakeInput && typeof rawIntakeInput === "object" ? rawIntakeInput : {}) as
    Record<string, unknown>;

  // ── Inputs, through the live call sites. ────────────────────────────────
  let euCorpus = options.euCorpus;
  if (euCorpus === undefined && options.db) {
    euCorpus = await fetchEuAuthorityCorpus(options.db as never);
  }

  // ── The live payload. Unchanged behaviour, unchanged defaults. ──────────
  const live = await generateCppaRiskReport(rawIntake, { ...options, euCorpus });
  const baselineReport = live.report;

  // ── The Item 363 document. ──────────────────────────────────────────────
  const era = resolveLtpIntake(rawIntake);
  const intake = era.intake as Record<string, unknown>;
  const analytics = buildActivityAnalytics(intake)[0];
  if (!analytics) {
    throw new Error("[item369-preview] no activity analytics for this record — cannot compose");
  }

  const [frameSet, plan] = await Promise.all([
    loadFrameSet("cppa-risk", options.librarySource),
    loadDocumentPlan("cppa-risk", options.librarySource),
  ]);

  const approvedOk = frameSet.approved && plan.approved;
  if (!approvedOk && !options.allowUnapprovedLibrary) {
    throw new Error(
      `[item369-preview] library not approved (frames=${frameSet.approved} plan=${plan.approved}) — fail-closed`,
    );
  }
  const frames = approvedOk ? frameSet : {
    ...frameSet,
    approved: true,
    frames: frameSet.frames.map((f) => ({ ...f, status: "approved" as const })),
  };
  const docPlan = approvedOk ? plan : {
    ...plan,
    approved: true,
    sections: plan.sections.map((s) => ({ ...s, status: "approved" as const })),
  };

  const composed = composeCppaRisk({
    intake,
    analytics,
    frames,
    euAuthority: buildEuAuthoritySection(intake, (euCorpus ?? null) as never),
  });

  const doc = renderDocumentFromPlan(docPlan, composed.inputs, {
    mentions: { primary: composed.entity, shortForm: "the company" },
    graph: composed.graph,
    strict: false,
  });

  const sections: Prose9Section[] = doc.sections.map((s) => ({
    section_id: s.section_id,
    title: s.title,
    text: s.text,
    degraded: s.degraded,
    determination_status: s.determination_status,
    record_card: s.record_card.map((r) => ({ label: r.label, value: r.value })),
    spans: s.spans.map((sp) => ({
      start: sp.start,
      end: sp.end,
      source_path: sp.source,
      value: sp.value,
    })),
  }));

  const envelope: ProseDocumentEnvelope = {
    version: CPPA_RISK_PROSE9_SHAPE_VERSION,
    product: "cppa-risk",
    plan_version: String(docPlan.version ?? "unknown"),
    frame_set_version: String(frames.version ?? "unknown"),
    compose_version: CPPA_RISK_COMPOSE_VERSION,
    sections,
    omitted_frames: composed.omitted_frames,
    span_count: sections.reduce((n, s) => n + s.spans.length, 0),
  };

  const report = applyProse9Mapping({ ...baselineReport }, envelope);
  const meta = (report._meta ?? {}) as Record<string, unknown>;
  const internal = (meta.internal ?? {}) as Record<string, unknown>;
  report._meta = {
    ...meta,
    internal: { ...internal, item369_preview: ITEM369_PREVIEW_STAMP, engine_path: "ltp+prose9" },
  };

  return { ...live, report, baselineReport, envelope, rendered: doc, composed };
}
