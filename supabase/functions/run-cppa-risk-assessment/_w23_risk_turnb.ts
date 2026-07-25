// ─────────────────────────────────────────────────────────────────────────
// WAVE23-FIX TURN B (cppa-risk) — deploy turn on run-cppa-risk-assessment.
// Controller dispatch W23-RISK-TURNB-2026-07-25 (five-lens TEAM-REVIEWED).
// Closes wave-23 item 71 across three fix classes:
//   B1 — internal_reasoning_leak scrub extension (safeguard_gaps + all
//        sibling *_gaps / *_notes emitters) + concat-artifact normalization.
//   B2 — citation_misapplied fixes:
//        (a) bare "§ 7150(b)" trigger-negations in scope_notes /
//            scope_and_triggers pinpoint their subsection (sale/share,
//            sensitive PI, ADMT-decision, systematic-observation profiling,
//            sensitive-location, ADMT training);
//        (b) orphan-conjunction cleanup ("§ 7150(b) and are not engaged"
//            → "§ 7150(b) is not engaged");
//        (c) priority-action narrowing when intake already answers the
//            asked question (q18b_admt_training="No" → drop "(training)"
//            alternative in the § 7150(b) subsection ask; narrow to
//            "(significant decision)" / § 7150(b)(3)).
//   B3 — unsupported_business_claim fixes:
//        (a) "'Uncertain' as the organisation's own assessment" template
//            default rewritten as tool-weighing when intake carries no
//            benefits self-assessment;
//        (b) record-fact assertions ("Profiling inferences are drawn from
//            this processing") rewritten as conditional / tool analysis
//            when the ledger does not assert the underlying fact;
//        (c) provenance preservation — intake self-classifications
//            ("Yes — systematic observation …") reported as such rather
//            than recharacterized as independent factual findings.
//
// Runs AFTER W22 turnA and BEFORE the LEAK-PREV P1 emit gate. Fail-open at
// every helper and orchestrator. Anchor keys never mutated. Reserved
// subtrees (`_meta` / `_internal`) preserved. Never emits "information
// needed" phrasing on the customer surface. Telemetry lands under
// `_meta.internal.risk_w23b` — the LEAK-PREV-P2 serializer preserves
// `_meta.internal` verbatim (item-32 stamp-echo gate).
// ─────────────────────────────────────────────────────────────────────────

import type { FactRow } from "../_shared/intake/fact-ledger.ts";

export const W23_RISK_TURNB_STAMP = "w23-risk-turnb@2026-07-25T17:02:08Z";
export const W23_RISK_TURNB_VERSION = "risk-w23-turnb-v2-2026-07-25";

// ── Anchor keys (never mutate) ──────────────────────────────────────────
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
]);

// Target fields for T1/T2 scrubs — enumerated seams plus *_gaps / *_notes.
const TARGET_FIELD_KEYS = new Set<string>([
  "safeguard_gaps", "mitigation_gaps", "open_items",
  "scope_notes", "notes", "note", "gaps",
]);
function isTargetField(k: string | undefined): boolean {
  if (!k) return false;
  if (TARGET_FIELD_KEYS.has(k)) return true;
  return k.endsWith("_gaps") || k.endsWith("_notes");
}

// ── T1: internal-note / reasoning-leak patterns ─────────────────────────
const INTAKE_MISMATCH_RE =
  /The intake(?:\s+on\s+[^.]{0,200}?)?\s+does not support this statement;?\s*it must be reconciled(?:\s+before\s+use)?\.?/gi;
const RECONCILE_FRAGMENT_RE =
  /\bmust be reconciled(?:\s+before\s+use)?\.?/gi;
const COT_FRAGMENT_RE =
  /\b(?:—\s*wait,|correcting:|let me reconsider|on second thought|actually,\s+)/gi;

type CategoryProbe = { re: RegExp; field: string };
const CATEGORY_PROBES: readonly CategoryProbe[] = [
  { re: /\bprofiling\b/i, field: "q5b_profiling_observation" },
  { re: /\bsystematic\s+observation\b/i, field: "q5b_profiling_observation" },
  { re: /\bcross[- ]context\s+(?:behavio(?:u)?ral\s+)?(?:advertising|tracking)\b/i, field: "q4_targeted_ads" },
  { re: /\btargeted\s+advertising\b/i, field: "q4_targeted_ads" },
  { re: /\bsell(?:ing)?\s*(?:\/|or|and)?\s*shar(?:e|ing)\b/i, field: "q3_sell_share" },
  { re: /\bsensitive[- ]location\s+profiling\b/i, field: "sensitive_location_basis" },
  { re: /\bsensitive\s+personal\s+information\b/i, field: "q15_sensitive_pi" },
  { re: /\bADMT\b/i, field: "i5_admt_logic" },
];

function ledgerAsserts(ledger: readonly FactRow[] | undefined, field: string): boolean {
  if (!ledger) return false;
  for (const r of ledger) {
    if ((r.key === field || r.source_field === field) && r.polarity === "asserted") return true;
  }
  return false;
}

function anyCategorySupportedByLedger(s: string, ledger: readonly FactRow[] | undefined): boolean {
  for (const p of CATEGORY_PROBES) {
    if (p.re.test(s) && ledgerAsserts(ledger, p.field)) return true;
  }
  return false;
}

const NEUTRAL_DOWNGRADE =
  "The controller should document the relevant facts and confirm whether this issue applies.";

// ── T2: concatenation-artifact normalization ────────────────────────────
function normalizeConcatArtifacts(s: string): string {
  let out = s;
  out = out.replace(/\.{2,}(?!\.)/g, ".");
  out = out.replace(/\.\s+\./g, ".");
  out = out.replace(/\.,/g, ".");
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  out = out.replace(/[ \t]{2,}/g, " ");
  return out.trim();
}

// ── B2: bare "§ 7150(b)" trigger pinpoints ──────────────────────────────
// Trigger → subsection map, derived from the CPPA § 7150 verbatim (docs
// courier CPPA-7150-VERBATIM-2026-07-25). Order matters: more-specific
// probes first so "sensitive-location profiling" wins over generic
// "profiling".
type TriggerMap = { re: RegExp; sub: string };
const TRIGGER_PINPOINTS: readonly TriggerMap[] = [
  { re: /\bsensitive[- ]location\s+profiling\b/i, sub: "(5)" },
  { re: /\bsystematic\s+observation\b/i, sub: "(4)" },
  { re: /\bADMT\s+training\b|\btrain(?:ing)?\s+(?:an?\s+)?ADMT\b|\bbiometric\s+training\b/i, sub: "(6)" },
  { re: /\bADMT\s+(?:use|significant\s+decision|for\s+a?\s*significant\s+decision)\b|\bsignificant\s+decision\b/i, sub: "(3)" },
  { re: /\bsensitive\s+personal\s+information\b/i, sub: "(2)" },
  { re: /\bsell(?:ing)?\s*(?:\/|or|and)?\s*shar(?:e|ing)\b/i, sub: "(1)" },
];

// Match bare "§ 7150(b)" that is NOT already pinpointed. Excludes the
// already-subsectioned forms "(b)(1)".."(b)(6)" by negative lookahead.
const BARE_7150B_RE =
  /(§\s*7150\(b\))(?!\s*\(\d)/g;

function pinpointBareTrigger(s: string, c: W23Counters): string {
  if (!/§\s*7150\(b\)/.test(s)) return s;
  // Determine subsection from surrounding sentence.
  let sub: string | null = null;
  for (const t of TRIGGER_PINPOINTS) {
    if (t.re.test(s)) { sub = t.sub; break; }
  }
  if (!sub) return s;
  let hit = false;
  const out = s.replace(BARE_7150B_RE, (_m, g1: string) => {
    hit = true;
    return `${g1}${sub}`;
  });
  if (hit) c.pinpoints_added += 1;
  return out;
}

// ── B2b: orphan-conjunction cleanup ────────────────────────────────────
// "…§ 7150(b) and are not engaged" → "…§ 7150(b) is not engaged"
// "…§ 7150(b)(N) and are …" → "…§ 7150(b)(N) is …"
// General: <citation> " and " (are|is) → <citation> " " (are|is)
const ORPHAN_AND_RE =
  /(§\s*7150\(b\)(?:\(\d\))?)\s+and\s+(are|is)\b/gi;
// "…, and, and …" collapse
const DOUBLE_AND_RE = /\band\s*,?\s*and\b/gi;
// Trailing " and ." / " and, " residuals.
const TRAILING_AND_RE = /\s+and\s*(?=[.,;])/gi;

function fixOrphanConjunctions(s: string, c: W23Counters): string {
  const before = s;
  let out = s;
  out = out.replace(ORPHAN_AND_RE, (_m, cite: string, verb: string) => {
    // Singular citation → singular verb.
    return `${cite} is`;
  });
  out = out.replace(DOUBLE_AND_RE, "and");
  out = out.replace(TRAILING_AND_RE, "");
  if (out !== before) c.orphan_joins_fixed += 1;
  return out;
}

// ── B2c: priority-action narrowing when intake answers the question ────
// Pattern from doc c2590988: "Resolve and document the applicable
// § 7150(b) subsection — (significant decision), (training), or both".
// When intake q18b_admt_training is "No" (or unset), drop "(training)"
// and "or both", narrow the citation to § 7150(b)(3).
function narrowPriorityActions(
  node: unknown,
  intake: Record<string, unknown> | undefined,
  c: W23Counters,
): unknown {
  if (!intake) return node;
  const trainingAns = String(intake.q18b_admt_training ?? "").trim().toLowerCase();
  const trainingIsNo = trainingAns === "no" || trainingAns === "" || trainingAns.startsWith("no");
  if (!trainingIsNo) return node;

  const rewrite = (s: string): string => {
    if (typeof s !== "string") return s;
    if (!/§\s*7150\(b\)/.test(s)) return s;
    const has = /significant\s+decision.*?training|training.*?significant\s+decision/i.test(s);
    if (!has) return s;
    let out = s;
    // Drop "(training)" alternative and "or both".
    out = out.replace(
      /—\s*\(significant\s+decision\)\s*,\s*\(training\)\s*,?\s*or\s+both/gi,
      "— (significant decision)",
    );
    out = out.replace(
      /\(significant\s+decision\)\s*,\s*\(training\)\s*,?\s*or\s+both/gi,
      "(significant decision)",
    );
    out = out.replace(
      /\(training\)\s*,?\s*or\s+both/gi,
      "",
    );
    // Pinpoint the bare citation.
    out = out.replace(BARE_7150B_RE, "$1(3)");
    // Tighten dangling punctuation.
    out = out.replace(/\s+,/g, ",").replace(/[ \t]{2,}/g, " ").trim();
    if (out !== s) c.priority_actions_narrowed += 1;
    return out;
  };

  const walk = (n: unknown): unknown => {
    if (n == null) return n;
    if (typeof n === "string") return rewrite(n);
    if (Array.isArray(n)) return n.map(walk);
    if (typeof n === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        if (k.startsWith("_") || ANCHOR_KEYS.has(k)) { out[k] = v; continue; }
        out[k] = walk(v);
      }
      return out;
    }
    return n;
  };
  return walk(node);
}

// ── B3a: "Uncertain" self-assessment template default ──────────────────
const UNCERTAIN_SELF_ASSESSMENT_RE =
  /The record asserts\s+['"]Uncertain['"]\s+as\s+the\s+organisation'?s?\s+own\s+assessment\s+of\s+whether\s+benefits\s+outweigh\s+risks\.?/gi;
const UNCERTAIN_REPLACEMENT =
  "This assessment weighs the documented benefits against the identified risks; the controller has not recorded its own conclusion on that balance.";

function scrubUncertainSelfAssessment(
  s: string,
  intake: Record<string, unknown> | undefined,
  c: W23Counters,
): string {
  if (typeof s !== "string" || !UNCERTAIN_SELF_ASSESSMENT_RE.test(s)) {
    UNCERTAIN_SELF_ASSESSMENT_RE.lastIndex = 0;
    return s;
  }
  UNCERTAIN_SELF_ASSESSMENT_RE.lastIndex = 0;
  // Only rewrite when the intake has no benefits self-assessment field.
  // (The intake schema has no such field; this guard is defensive.)
  const hasSelfAssessment = intake && (
    "benefits_self_assessment" in intake ||
    "q_benefits_outweigh_risks" in intake ||
    "controller_benefits_conclusion" in intake
  );
  if (hasSelfAssessment) return s;
  const out = s.replace(UNCERTAIN_SELF_ASSESSMENT_RE, UNCERTAIN_REPLACEMENT);
  if (out !== s) c.record_claims_rewritten += 1;
  return out;
}

// ── B3b: record-fact assertions unsupported by ledger ──────────────────
// "Profiling inferences are drawn from this processing" → conditional
// tool-analysis phrasing when the ledger does not assert profiling.
const RECORD_FACT_PATTERNS: readonly { re: RegExp; ledgerField: string; replacement: string }[] = [
  {
    re: /\bProfiling\s+inferences\s+are\s+drawn\s+from\s+this\s+processing\.?/gi,
    ledgerField: "q5b_profiling_observation",
    replacement:
      "If the described processing produces profiling inferences, § 7150(b)(4) may be engaged; the intake does not confirm that this occurs.",
  },
];

function scrubUnsupportedRecordFacts(
  s: string,
  ledger: readonly FactRow[] | undefined,
  c: W23Counters,
): string {
  if (typeof s !== "string") return s;
  let out = s;
  for (const p of RECORD_FACT_PATTERNS) {
    if (!p.re.test(out)) { p.re.lastIndex = 0; continue; }
    p.re.lastIndex = 0;
    if (ledgerAsserts(ledger, p.ledgerField)) continue; // intake supports it — leave.
    const next = out.replace(p.re, p.replacement);
    if (next !== out) {
      out = next;
      c.record_claims_rewritten += 1;
    }
  }
  return out;
}

// ── B3c: provenance preservation for intake self-classifications ───────
// "The record documents systematic observation … engaging § 7150(b)(4)"
// → "The intake reports systematic observation … engaging § 7150(b)(4)"
// (only when the underlying intake field is present — the assertion was
// the organisation's classification, not an independent product finding).
const PROVENANCE_PATTERNS: readonly { re: RegExp; ledgerField: string; anchor: string }[] = [
  {
    re: /\bThe record documents\b/g,
    ledgerField: "q5b_profiling_observation",
    anchor: "systematic observation",
  },
];

function annotateProvenance(
  s: string,
  ledger: readonly FactRow[] | undefined,
  c: W23Counters,
): string {
  if (typeof s !== "string") return s;
  let out = s;
  for (const p of PROVENANCE_PATTERNS) {
    if (!new RegExp(p.anchor, "i").test(out)) continue;
    if (!ledgerAsserts(ledger, p.ledgerField)) continue;
    const next = out.replace(p.re, "The intake reports");
    if (next !== out) {
      out = next;
      c.provenance_annotated += 1;
    }
  }
  return out;
}

// ── Combined per-string scrub for target fields (B1 T1 + T2) ────────────
function scrubTargetString(
  s: string,
  ledger: readonly FactRow[] | undefined,
  c: W23Counters,
): string {
  if (typeof s !== "string" || !s) return s;
  const before = s;
  let out = s;

  if (INTAKE_MISMATCH_RE.test(out)) {
    INTAKE_MISMATCH_RE.lastIndex = 0;
    if (anyCategorySupportedByLedger(out, ledger)) {
      c.intake_supported_preserved += 1;
    } else {
      out = out.replace(INTAKE_MISMATCH_RE, NEUTRAL_DOWNGRADE);
      c.internal_note_scrubs += 1;
    }
  }
  if (RECONCILE_FRAGMENT_RE.test(out)) {
    RECONCILE_FRAGMENT_RE.lastIndex = 0;
    out = out.replace(RECONCILE_FRAGMENT_RE, "");
    c.internal_note_scrubs += 1;
  }
  if (COT_FRAGMENT_RE.test(out)) {
    COT_FRAGMENT_RE.lastIndex = 0;
    out = out.replace(COT_FRAGMENT_RE, "");
    c.cot_scrubs += 1;
  }

  const t2before = out;
  out = normalizeConcatArtifacts(out);
  if (out !== t2before) c.concat_normalizations += 1;

  if (out !== before) c.strings_rewritten += 1;
  return out;
}

// Fields where B2 pinpoint / orphan-join fixes apply. Broader than the
// T1/T2 target set: scope_notes, scope_and_triggers, and their common
// nested string leaves.
const B2_FIELD_KEYS = new Set<string>([
  "scope_notes", "scope_and_triggers", "scope_confirmation",
  "content_detail", "detail", "text", "summary",
  "rationale", "note", "notes",
]);
function isB2Field(k: string | undefined): boolean {
  if (!k) return false;
  return B2_FIELD_KEYS.has(k);
}

// Fields where B3 rewrites apply (benefits rationale + free prose).
const B3_FIELD_KEYS = new Set<string>([
  "benefits_outweigh_risks_rationale", "argument_strength_rationale",
  "content_detail", "detail", "text", "rationale", "summary",
  "adverse_effects", "description",
  "scope_notes", "scope_and_triggers", "scope_confirmation",
]);
function isB3Field(k: string | undefined): boolean {
  if (!k) return false;
  return B3_FIELD_KEYS.has(k);
}

// ── Walker: touches string leaves in target field contexts ─────────────
function walk(
  node: unknown,
  ledger: readonly FactRow[] | undefined,
  intake: Record<string, unknown> | undefined,
  c: W23Counters,
  keyCtx?: string,
  ctx: { t12: boolean; b2: boolean; b3: boolean } = { t12: false, b2: false, b3: false },
): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    let out = node;
    if (ctx.t12) { c.strings_scanned += 1; out = scrubTargetString(out, ledger, c); }
    if (ctx.b2) {
      out = pinpointBareTrigger(out, c);
      out = fixOrphanConjunctions(out, c);
    }
    if (ctx.b3) {
      out = scrubUncertainSelfAssessment(out, intake, c);
      out = scrubUnsupportedRecordFacts(out, ledger, c);
      out = annotateProvenance(out, ledger, c);
    }
    return out;
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, ledger, intake, c, keyCtx, ctx));
  }
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; }
      const childCtx = {
        t12: ctx.t12 || isTargetField(k),
        b2: ctx.b2 || isB2Field(k),
        b3: ctx.b3 || isB3Field(k),
      };
      out[k] = walk(v, ledger, intake, c, k, childCtx);
    }
    return out;
  }
  return node;
}

// ── Counters ────────────────────────────────────────────────────────────
export interface W23Counters {
  version: string;
  strings_scanned: number;
  strings_rewritten: number;
  internal_note_scrubs: number;
  intake_supported_preserved: number;
  concat_normalizations: number;
  cot_scrubs: number;
  pinpoints_added: number;
  orphan_joins_fixed: number;
  priority_actions_narrowed: number;
  record_claims_rewritten: number;
  provenance_annotated: number;
}

const emptyCounters = (): W23Counters => ({
  version: W23_RISK_TURNB_VERSION,
  strings_scanned: 0,
  strings_rewritten: 0,
  internal_note_scrubs: 0,
  intake_supported_preserved: 0,
  concat_normalizations: 0,
  cot_scrubs: 0,
  pinpoints_added: 0,
  orphan_joins_fixed: 0,
  priority_actions_narrowed: 0,
  record_claims_rewritten: 0,
  provenance_annotated: 0,
});

export interface ApplyW23Options {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
}

/**
 * Apply WAVE23-FIX TURN B to a risk report. Fail-open: on any error the
 * input report is returned unchanged and empty counters are returned so
 * telemetry still stamps.
 */
export function applyW23RiskTurnB(
  report: Record<string, unknown>,
  opts: ApplyW23Options = {},
): { counters: W23Counters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };
  const intake = (opts.intake as Record<string, unknown> | undefined) ?? undefined;
  try {
    // Pass 1 — walker: T1/T2 leaks + B2 pinpoints/orphans + B3 record-fact rewrites.
    let walked = walk(report, opts.ledger, intake, counters) as Record<string, unknown>;
    // Pass 2 — B2c: priority-action narrowing (targeted, top-level).
    if (intake) {
      const buckets = ["priority_actions", "next_steps", "cross_tool_recommendations"];
      for (const b of buckets) {
        if (b in walked) {
          (walked as Record<string, unknown>)[b] = narrowPriorityActions(
            walked[b], intake, counters,
          );
        }
      }
    }
    return { counters, report: walked };
  } catch {
    return { counters, report };
  }
}
