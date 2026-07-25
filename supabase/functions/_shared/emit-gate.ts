// LEAK-PREV-P1 — Emit gate.
//
// "The product never emits what its own instrument would deterministically
//  flag." Runs the SAME deterministic detectors the grader uses against the
//  terminal report BEFORE the database write; degrades any offending prose
//  node to the customer-safe `information.needed` catalog message and records
//  gate telemetry under `_meta.internal.emit_gate`.
//
// Design constraints (five-lens reviewed 2026-07-25):
//   - REUSE grader detectors — never re-author.
//   - Never edit strings in place — whole-node replacement only.
//   - Never drop whole report sections.
//   - Fail-visible: findings + degraded_count + version land on the report.
//   - Fail-safe: if the gate throws, the report ships unchanged and a
//     `crashed=true` flag is set; availability is never blocked.
//   - Safety valve: if the gate would degrade >30% of prose nodes on a
//     report, skip degradation entirely (wave-16 fact-ledger lesson) and
//     record `enforcement_skipped_reason`.
//
// This module authors NO customer sentences. Every degradation renders
// through `renderMessage("information.needed")` from customer-messages.ts.

import {
  runFormatChecksGeneric,
  type FormatFinding,
} from "./grader/format-checks.ts";
import { checkH2InternalVocab } from "./grader/cppa-hf1-checks.ts";
import { extractIntakeRoster } from "./grader/intake-roster.ts";
import { renderMessage } from "./customer-messages.ts";

export const EMIT_GATE_VERSION = "eg-w1-2026-07-25";

export type EmitGateTool =
  | "cppa_admt"
  | "cppa_risk_assessment"
  | "cppa_cybersecurity";

export interface EmitGateFinding {
  /** Stable id for aggregation (e.g. "e4_instruction_leak",
   *  "h2_internal_vocab", "template_stub", "unbalanced_parens"). */
  check_id: string;
  /** Where the offending text lives (dot-path). */
  path: string;
  /** Trimmed sample of the offending substring (<=200 chars). */
  evidence: string;
}

export interface EmitGateReport {
  version: string;
  tool: EmitGateTool | "unknown";
  degraded_count: number;
  prose_node_count: number;
  findings: EmitGateFinding[];
  enforcement_skipped_reason?: string;
  crashed?: boolean;
}

export interface EmitGateOptions {
  intakeRoster?: unknown;
  tool?: EmitGateTool;
}

const SAFETY_VALVE_RATIO = 0.30;

// Reserved keys — never scan or mutate structural / bookkeeping surfaces.
const RESERVED = new Set<string>([
  "_meta",
  "deterministic_checks",
  "prompt_version",
  "build_stamp",
  "generated_at",
  "enforcement_meta",
  "lint_warnings",
  "annotations",
  "citation_lints",
  "information_needed",
  "enforcement_precedents",
  "citation_ids",
  "field_ids",
  "source_fields",
  "element_id",
  "intake_field_1",
  "intake_field_2",
  "canonical_fields",
  "_drafting_record",
  "_normalized_intake",
  "regen_prior_deterministic_checks",
  "regen_nonce",
]);

// A leaf is a "prose node" if the string is long enough to plausibly carry a
// sentence. Very short strings (labels, enum values, IDs) are excluded from
// both the denominator and the detectors.
const PROSE_MIN_LEN = 40;

// ── Well-formedness detectors (LEAK-PREV-P1) ────────────────────────────

const DOUBLED_TOKEN_RE = /\b([A-Za-z]{3,})\s+\1\b/;

const TEMPLATE_STUB_PATTERNS: RegExp[] = [
  /\bsupply\s+the\s+missing\s+intake\s+dimensions?\s+and\s+re[-\s]?run\b/i,
  /\bre[-\s]?run\s+(?:the\s+)?(?:assessment|tool|report)\b/i,
  /\bplease\s+(?:complete|fill\s+(?:in|out))\s+the\s+intake\b/i,
  /\b(?:TBD|TODO|FIXME|xxx)\b/,
  /\{\{\s*[a-z_][a-z0-9_.]*\s*\}\}/i,
];

function unterminatedSentence(s: string): boolean {
  const t = s.trim();
  if (t.length < 120) return false;
  const last = t.slice(-1);
  if ([".", "!", "?", ":", "]", ")", "\"", "'"].includes(last)) return false;
  // Long prose ending without terminal punctuation.
  return /[a-z]/i.test(last);
}

function unbalancedParens(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth < 0) return true; }
  }
  return depth !== 0;
}

// ── Walker ──────────────────────────────────────────────────────────────

type LeafRef = {
  parent: Record<string, unknown> | unknown[];
  key: string | number;
  value: string;
  path: string;
};

function collectLeaves(
  node: unknown,
  path: string,
  out: LeafRef[],
): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") return; // top-level string handled by caller
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") {
        if (v.length >= PROSE_MIN_LEN) {
          out.push({ parent: node, key: i, value: v, path: `${path}[${i}]` });
        }
      } else {
        collectLeaves(v, `${path}[${i}]`, out);
      }
    }
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (RESERVED.has(k)) continue;
      if (typeof v === "string") {
        if (v.length >= PROSE_MIN_LEN) {
          out.push({ parent: obj, key: k, value: v, path: `${path}.${k}` });
        }
      } else {
        collectLeaves(v, `${path}.${k}`, out);
      }
    }
  }
}

// ── Detection ───────────────────────────────────────────────────────────

function detectFindings(
  leaf: LeafRef,
  intakeRosterText: string,
): EmitGateFinding[] {
  const s = leaf.value;
  const findings: EmitGateFinding[] = [];

  // Reuse grader E-checks (E2..E6) on the single string. E1 sections not
  // applicable at leaf granularity.
  let eChecks: FormatFinding[] = [];
  try {
    eChecks = runFormatChecksGeneric(s, { intakeRoster: intakeRosterText });
  } catch {
    /* fail-open per-leaf */
  }
  for (const f of eChecks) {
    if (f.passed) continue;
    // Only the leak-relevant subset degrades a leaf. E2 heading skips /
    // E3 bracket / E5 bare close / E6 counsel referrals are not authored
    // by machinery per se; but if the leaf itself is a bare advisory close
    // or contains a counsel referral, it IS a leak we must not emit.
    if (
      f.check_id === "e4_instruction_leak" ||
      f.check_id === "e5_bare_advisory_close" ||
      f.check_id === "e6_counsel_referral"
    ) {
      findings.push({
        check_id: f.check_id,
        path: leaf.path,
        evidence: (f.evidence ?? "").slice(0, 200),
      });
    }
  }

  // Reuse grader H2 internal-vocab detection.
  try {
    const h2 = checkH2InternalVocab(s);
    for (const f of h2) {
      if (!f.passed && f.check_id === "h2_internal_vocab") {
        findings.push({
          check_id: "h2_internal_vocab",
          path: leaf.path,
          evidence: (f.evidence ?? "").slice(0, 200),
        });
      }
    }
  } catch { /* fail-open */ }

  // Template stubs.
  for (const re of TEMPLATE_STUB_PATTERNS) {
    const m = s.match(re);
    if (m) {
      findings.push({
        check_id: "template_stub",
        path: leaf.path,
        evidence: m[0].slice(0, 200),
      });
      break;
    }
  }

  // Well-formedness.
  const dt = s.match(DOUBLED_TOKEN_RE);
  if (dt) {
    findings.push({
      check_id: "doubled_token",
      path: leaf.path,
      evidence: dt[0].slice(0, 200),
    });
  }
  if (unbalancedParens(s)) {
    findings.push({
      check_id: "unbalanced_parens",
      path: leaf.path,
      evidence: s.slice(0, 200),
    });
  }
  if (unterminatedSentence(s)) {
    findings.push({
      check_id: "unterminated_sentence",
      path: leaf.path,
      evidence: s.slice(-200),
    });
  }

  return findings;
}

// ── Degradation ─────────────────────────────────────────────────────────

function degrade(leaf: LeafRef): void {
  const replacement = renderMessage("information.needed");
  if (Array.isArray(leaf.parent)) {
    (leaf.parent as unknown[])[leaf.key as number] = replacement;
    return;
  }
  const obj = leaf.parent as Record<string, unknown>;
  obj[leaf.key as string] = replacement;
  // Additive structured flag — non-breaking. Consumers may key styling
  // on this without needing a literal string check.
  obj.information_needed = true;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Run the emit gate against a terminal report.
 *
 * Contract:
 *   - Never throws. On internal error the report is returned untouched and
 *     `_meta.internal.emit_gate.crashed=true` is recorded.
 *   - Writes gate telemetry to `report._meta.internal.emit_gate` and
 *     emits a `console.log` structured event on completion (or a
 *     `console.error` `emit_gate_crashed` event on crash).
 *   - Mutates the report in place; also returns it for chaining.
 */
export function runEmitGate(
  report: Record<string, unknown> | null | undefined,
  opts: EmitGateOptions = {},
): Record<string, unknown> | null | undefined {
  if (!report || typeof report !== "object") return report;
  const gateReport: EmitGateReport = {
    version: EMIT_GATE_VERSION,
    tool: opts.tool ?? "unknown",
    degraded_count: 0,
    prose_node_count: 0,
    findings: [],
  };
  try {
    const intakeRosterText = opts.intakeRoster
      ? extractIntakeRoster(opts.intakeRoster)
      : "";
    const leaves: LeafRef[] = [];
    collectLeaves(report, "$", leaves);
    gateReport.prose_node_count = leaves.length;

    // Detect first, then decide on safety valve BEFORE mutating anything.
    const leavesToDegrade: LeafRef[] = [];
    for (const leaf of leaves) {
      const findings = detectFindings(leaf, intakeRosterText);
      if (findings.length) {
        for (const f of findings) gateReport.findings.push(f);
        leavesToDegrade.push(leaf);
      }
    }

    const ratio = leaves.length === 0
      ? 0
      : leavesToDegrade.length / leaves.length;
    if (ratio > SAFETY_VALVE_RATIO) {
      gateReport.enforcement_skipped_reason =
        `safety_valve: ${leavesToDegrade.length}/${leaves.length} nodes (>${Math.round(SAFETY_VALVE_RATIO * 100)}%)`;
      console.warn(JSON.stringify({
        evt: "emit_gate_safety_valve",
        version: EMIT_GATE_VERSION,
        tool: gateReport.tool,
        degraded_candidates: leavesToDegrade.length,
        prose_nodes: leaves.length,
      }));
    } else {
      for (const leaf of leavesToDegrade) degrade(leaf);
      gateReport.degraded_count = leavesToDegrade.length;
    }
  } catch (e) {
    gateReport.crashed = true;
    console.error(JSON.stringify({
      evt: "emit_gate_crashed",
      version: EMIT_GATE_VERSION,
      tool: gateReport.tool,
      error: (e as Error)?.message ?? String(e),
    }));
  }

  try {
    const rd = report as Record<string, unknown>;
    const meta = (rd._meta && typeof rd._meta === "object")
      ? rd._meta as Record<string, unknown>
      : {};
    const internal = (meta.internal && typeof meta.internal === "object")
      ? meta.internal as Record<string, unknown>
      : {};
    internal.emit_gate = gateReport;
    meta.internal = internal;
    rd._meta = meta;
  } catch { /* never block emission */ }

  if (!gateReport.crashed) {
    console.log(JSON.stringify({
      evt: "emit_gate",
      version: EMIT_GATE_VERSION,
      tool: gateReport.tool,
      prose_nodes: gateReport.prose_node_count,
      degraded_count: gateReport.degraded_count,
      findings_count: gateReport.findings.length,
      skipped: gateReport.enforcement_skipped_reason ?? null,
    }));
  }

  return report;
}
