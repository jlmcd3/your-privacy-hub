/**
 * ITEM 253 — Replay runner.
 *
 * runReplayDoc: provider → assembleReport(exitMode:"observe") → substance
 *   + structure evaluators → PerDocResult. Never throws; catches into
 *   hard_failures ["harness_error:<msg>"].
 * runReplayBatch: aggregates per-gate failure counts + presence-rate
 *   distribution + side-by-side rows.
 */
import { assembleReport } from "../pass2-assembler.ts";
import type { AssemblerResult, SectionTelemetry } from "../pass2-assembler.ts";
import { evaluateSubstance } from "./substance-gates.ts";
import { compareDoc } from "./side-by-side.ts";
import {
  REPLAY_HARNESS_VERSION,
  type AggregateReport,
  type Pass1Provider,
  type PerDocResult,
  type PresenceRateDistribution,
  type ProviderKind,
  type ReplayDoc,
  type ReplayRunConfig,
  type SideBySideRow,
} from "./types.ts";

export async function runReplayDoc(
  doc: ReplayDoc,
  provider: Pass1Provider,
  providerKind: ProviderKind,
  cfg: ReplayRunConfig = {},
): Promise<PerDocResult> {
  try {
    const p1 = await provider({
      intake: doc.intake_data,
      report_data: {},
      buildStamp: `replay@${REPLAY_HARNESS_VERSION}#${doc.doc_id}`,
    });
    const result: AssemblerResult = assembleReport(
      p1.plan,
      {},
      { exitMode: "observe" },
    );
    const substance = evaluateSubstance(p1.plan, result, cfg.substance);
    const structure = summarizeStructure(result);

    return {
      doc_id: doc.doc_id,
      provider_kind: providerKind,
      pass1_telemetry_summary: {
        ok: p1.telemetry.ok,
        attempts: p1.telemetry.attempts,
        write_around: p1.telemetry.write_around,
        grounded_note_replacement_rate:
          p1.telemetry.grounded_note_replacement_rate ?? 0,
      },
      substance: substance.metrics,
      structure,
      hard_failures: substance.hard_failures,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      doc_id: doc.doc_id,
      provider_kind: providerKind,
      pass1_telemetry_summary: {
        ok: false,
        attempts: 0,
        write_around: true,
        grounded_note_replacement_rate: 0,
      },
      substance: {
        presence_rate: 0,
        present_factor_count: 0,
        factors_with_ledger_refs: 0,
        note_token_diversity: 0,
        action_kind_diversity_ok: false,
        golden_shape: { review_flag: true, shortfall_keys: [] },
      },
      structure: { sections_emitted: 0, sections_omitted_by_class: {} },
      hard_failures: [`harness_error:${msg}`],
    };
  }
}

function summarizeStructure(result: AssemblerResult): PerDocResult["structure"] {
  const sections: readonly SectionTelemetry[] =
    (result.telemetry as unknown as { sections?: readonly SectionTelemetry[] }).sections ??
    [];
  const emitted = sections.filter((s) => (s as { emitted?: boolean }).emitted).length;
  const omittedByClass: Record<string, number> = {};
  for (const s of sections) {
    const rec = s as unknown as { emitted?: boolean; omitted_reason_class?: string };
    if (rec.emitted) continue;
    const cls = rec.omitted_reason_class ?? "unknown";
    omittedByClass[cls] = (omittedByClass[cls] ?? 0) + 1;
  }
  return {
    sections_emitted: emitted || result.telemetry.emitted_sections,
    sections_omitted_by_class: omittedByClass,
  };
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function distribution(values: readonly number[]): PresenceRateDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0] ?? 0,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

export async function runReplayBatch(
  docs: readonly ReplayDoc[],
  provider: Pass1Provider,
  providerKind: ProviderKind,
  cfg: ReplayRunConfig = {},
): Promise<AggregateReport> {
  const perDoc: PerDocResult[] = [];
  const sideBySide: SideBySideRow[] = [];
  for (const d of docs) {
    const r = await runReplayDoc(d, provider, providerKind, cfg);
    perDoc.push(r);
    if (d.legacy_report) {
      sideBySide.push(compareDoc(r, d.legacy_report));
    }
  }
  const perGate: Record<string, number> = {};
  let hardFailureCount = 0;
  for (const r of perDoc) {
    if (r.hard_failures.length > 0) hardFailureCount += 1;
    for (const f of r.hard_failures) {
      const gateKey = f.split(":")[0] || f;
      perGate[gateKey] = (perGate[gateKey] ?? 0) + 1;
    }
  }
  const presence = perDoc.map((r) => r.substance.presence_rate);
  return {
    version: REPLAY_HARNESS_VERSION,
    docs: perDoc,
    hard_failure_count: hardFailureCount,
    presence_rate_distribution: distribution(presence),
    per_gate_failure_counts: perGate,
    side_by_side_rows: sideBySide,
  };
}
