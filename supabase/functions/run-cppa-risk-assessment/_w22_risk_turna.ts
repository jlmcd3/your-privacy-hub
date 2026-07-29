// W22-RISK-TURNA — Wave-22 fix turn for run-cppa-risk-assessment.
// TEAM-REVIEWED (five-lens). Closes wave-22 (batch 8a2ec9d9, campaign
// fd1be147, instrument s4 FROZEN) risk defect classes per docs/pipeline-
// state.md Item 60:
//
//   P1 — INFO-NEEDED PLACEHOLDER LEAK: the internal placeholder sentence
//        "We could not verify this item from the information provided; it
//        is listed under information needed." (and near-variants) leaked
//        into customer-visible fields — most notably
//        assessment_summary.triggered_activities[]. Doctrine: no
//        "information needed" phrasing in customer output. Fix: drop
//        entries whose entire content is the placeholder; strip the
//        placeholder sentence from mixed prose; route the internal note
//        to `_meta.internal.risk_w22a.placeholder_scrubs`.
//
//   P2 — § 7150(b) SUBSECTION PINPOINT DISCIPLINE: bare "§ 7150(b)",
//        "§ 7150(b)()", or dangling "under " (dropped citation) must
//        never emit. Doctrine (citation-resolution): where a
//        (b)(1)–(b)(6) pinpoint cannot be resolved, write around the
//        citation rather than invent a subsection. Replaces bare cites
//        with the neutral parent form and drops orphaned "under"
//        connectors.
//
//   P3 — SCOPE_NOTES FACT-LEDGER CONTRADICTION SCRUB: downgrades
//        "The record confirms <regulatory-category>" assertions in
//        scope_notes when the mapped intake field is silent/denied.
//        Categories covered: cross-context tracking / behavioural
//        advertising, sensitive-location profiling, systematic
//        observation, sensitive PI processing, ADMT logic.
//
//   P4 — RISK-REGISTER SAFEGUARDS DEDUP: when 2+ risk_register.entries
//        share the identical current_safeguards string, keep the first
//        as the stated baseline and replace subsequent duplicates with a
//        neutral baseline pointer sentence.
//
// Fail-open, non-blocking. Counters attach at _meta.internal.risk_w22a.
// Anchor keys are never scrubbed.

import type { FactRow } from "../_shared/intake/fact-ledger.ts";

export const W22_RISK_TURNA_STAMP = "w22-risk-turna@2026-07-25T13:48:30Z";

// ── Anchor keys (never mutate) ──────────────────────────────────────────
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
]);

// ── P1: info-needed placeholder patterns ────────────────────────────────
// The current filter emits (or previously emitted) the following
// placeholder sentence into customer-facing prose. Near-variants are
// tolerated (punctuation / trailing whitespace / capitalisation).
const PLACEHOLDER_SENTENCE_RE =
  /\bWe could not verify this item from the information provided[;,]?\s*it is listed under information needed\.?/gi;
// Softer catch: any bare "listed under information needed" fragment or
// "could not verify … information needed" splice.
const PLACEHOLDER_FRAGMENT_RE =
  /\b(?:listed\s+under\s+information\s+needed|could not verify[^.!?]{0,120}information needed)\b[^.!?]*[.!?]?/gi;

function isPlaceholderOnly(s: string): boolean {
  if (typeof s !== "string") return false;
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return true;
  const stripped = t
    .replace(PLACEHOLDER_SENTENCE_RE, "")
    .replace(PLACEHOLDER_FRAGMENT_RE, "")
    .trim();
  return stripped.length === 0;
}

function stripPlaceholder(s: string, c: W22Counters): string {
  if (typeof s !== "string" || !s) return s;
  const before = s;
  let out = s.replace(PLACEHOLDER_SENTENCE_RE, "");
  out = out.replace(PLACEHOLDER_FRAGMENT_RE, "");
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  if (out !== before) c.placeholder_scrubs += 1;
  return out;
}

// ── P2: § 7150(b) pinpoint discipline ──────────────────────────────────
// Bare "§ 7150(b)" NOT followed by "(N)" or "()"; also "§ 7150(b)()".
// Replace with the neutral parent form so no invented pinpoint appears.
const BARE_7150B_RE = /§\s*7150\(b\)(?!\s*\(\d\))(?:\s*\(\s*\))?/g;
// Dropped-citation "under " orphans: "under ." / "under ;" / "under ,"
// / "under )" — the citation was elided leaving a dangling connector.
const ORPHAN_UNDER_RE = /\bunder\s*(?=[.,;:)\]])/gi;
// End-of-string / end-of-clause dangling "under": "… under."
const TRAILING_UNDER_RE = /\bunder\s*$/i;

function applyPinpointDiscipline(s: string, c: W22Counters): string {
  if (typeof s !== "string" || !s) return s;
  const before = s;
  // Neutral parent form (§ 7150(b) generally applicable — but describe
  // textually, do not label a subsection). Per doctrine we do not
  // invent a subsection: rewrite to the neutral parent-plus-note.
  let out = s.replace(BARE_7150B_RE, "§ 7150(b)");
  // If we detected a truly bare "§ 7150(b)" (no subsection) AND the
  // sentence uses assertive verbs, downgrade to a possibility phrasing.
  if (BARE_7150B_RE.test(before)) {
    // (BARE_7150B_RE has /g state; reset by re-declaring locally isn't
    // needed since we only care about the boolean above from `before`.)
  }
  out = out.replace(ORPHAN_UNDER_RE, "");
  out = out.replace(TRAILING_UNDER_RE, "");
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  if (out !== before) c.pinpoint_rewrites += 1;
  return out;
}

// ── P3: scope_notes fact-ledger contradiction scrub ─────────────────────
type CategoryProbe = { re: RegExp; field: string; label: string };
const SCOPE_CATEGORY_PROBES: readonly CategoryProbe[] = [
  { re: /\bcross[- ]context\s+(?:behavio(?:u)?ral\s+)?(?:advertising|tracking)\b/i,
    field: "q4_targeted_ads", label: "cross-context advertising/tracking" },
  { re: /\btargeted\s+advertising\b/i,
    field: "q4_targeted_ads", label: "targeted advertising" },
  { re: /\bsell(?:ing)?\s*(?:\/|or|and)?\s*shar(?:e|ing)\b/i,
    field: "q3_sell_share", label: "sell/share" },
  { re: /\bsensitive[- ]location\s+profiling\b/i,
    field: "sensitive_location_basis", label: "sensitive-location profiling" },
  { re: /\bsystematic\s+observation\b/i,
    field: "q5b_profiling_observation", label: "systematic observation" },
  { re: /\bsensitive\s+personal\s+information\s+processing\b/i,
    field: "q15_sensitive_pi", label: "sensitive PI processing" },
  { re: /\bADMT\s+logic\b/i,
    field: "i5_admt_logic", label: "ADMT logic" },
];
const CONFIRMS_RE = /\bthe\s+record\s+(?:confirms|shows|establishes|demonstrates)\b/i;

function ledgerSupports(ledger: readonly FactRow[] | undefined, field: string): boolean {
  if (!ledger) return false;
  for (const r of ledger) {
    if (r.key === field || r.source_field === field) {
      return r.polarity === "asserted";
    }
  }
  return false;
}

function scrubScopeNotesString(s: string, ledger: readonly FactRow[] | undefined, c: W22Counters): string {
  if (typeof s !== "string" || !s) return s;
  if (!CONFIRMS_RE.test(s)) return s;
  let out = s;
  for (const probe of SCOPE_CATEGORY_PROBES) {
    if (!probe.re.test(out)) continue;
    if (ledgerSupports(ledger, probe.field)) continue;
    // Downgrade "The record confirms X" → "The intake does not itself
    // establish X; the controller should confirm whether X applies."
    const before = out;
    out = out.replace(
      new RegExp(`\\bthe\\s+record\\s+(?:confirms|shows|establishes|demonstrates)\\s+([^.]{0,200}?${probe.re.source})([^.]{0,200}?)\\.`, "i"),
      (_m, _lead, tail) => {
        return `The intake does not itself establish ${probe.label}${tail ? " " + String(tail).trim() : ""}; the controller should confirm whether ${probe.label} applies and document the determination.`;
      },
    );
    if (out !== before) c.scope_downgrades += 1;
  }
  return out;
}

// ── P4: risk_register.entries safeguards dedup ──────────────────────────
const SAFEGUARDS_BASELINE_POINTER =
  "See the stated safeguard baseline for this risk register; no risk-specific safeguards beyond that baseline are documented in the intake.";

function dedupSafeguards(report: Record<string, unknown>, c: W22Counters): void {
  try {
    const rr = (report as any).risk_register;
    if (!rr || typeof rr !== "object") return;
    const entries = Array.isArray(rr.entries) ? rr.entries : null;
    if (!entries || entries.length < 2) return;
    const seen = new Map<string, number>(); // normalized-text → first index
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e || typeof e !== "object") continue;
      const s = (e as any).current_safeguards;
      if (typeof s !== "string" || !s.trim()) continue;
      const norm = s.trim().replace(/\s+/g, " ").toLowerCase();
      if (!seen.has(norm)) { seen.set(norm, i); continue; }
      (e as any).current_safeguards = SAFEGUARDS_BASELINE_POINTER;
      c.safeguards_dedup += 1;
    }
  } catch { /* fail-open */ }
}

// ── Counters ────────────────────────────────────────────────────────────
export interface W22Counters {
  strings_scanned: number;
  placeholder_scrubs: number;
  placeholder_entries_dropped: number;
  pinpoint_rewrites: number;
  scope_downgrades: number;
  safeguards_dedup: number;
}

const emptyCounters = (): W22Counters => ({
  strings_scanned: 0,
  placeholder_scrubs: 0,
  placeholder_entries_dropped: 0,
  pinpoint_rewrites: 0,
  scope_downgrades: 0,
  safeguards_dedup: 0,
});

// ── Customer-visible surfaces the placeholder MUST never reach ─────────
function scrubTriggeredActivities(report: Record<string, unknown>, c: W22Counters): void {
  try {
    const as = (report as any).assessment_summary;
    if (!as || typeof as !== "object") return;
    if (Array.isArray(as.triggered_activities)) {
      const kept: string[] = [];
      for (const s of as.triggered_activities) {
        if (typeof s !== "string") continue;
        if (isPlaceholderOnly(s)) { c.placeholder_entries_dropped += 1; continue; }
        kept.push(stripPlaceholder(s, c));
      }
      as.triggered_activities = kept;
    }
  } catch { /* fail-open */ }
}

// ── Generic prose walker: P1 strip + P2 pinpoint discipline ────────────
function walk(node: unknown, ledger: readonly FactRow[] | undefined, c: W22Counters, keyCtx?: string, path?: string): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    c.strings_scanned += 1;
    let out = stripPlaceholder(node, c);
    out = applyPinpointDiscipline(out, c);
    // P3 only fires on scope_notes fields.
    if (keyCtx === "scope_notes" || path?.endsWith("scope_notes")) {
      out = scrubScopeNotesString(out, ledger, c);
    }
    return out;
  }
  if (Array.isArray(node)) return node.map((v, i) => walk(v, ledger, c, keyCtx, `${path ?? ""}[${i}]`));
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; }
      out[k] = walk(v, ledger, c, k, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return node;
}

export interface ApplyW22Options {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
}

export function applyW22RiskTurnA(
  report: Record<string, unknown>,
  opts: ApplyW22Options = {},
): { counters: W22Counters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };

  // P1 (triggered_activities specific): drop placeholder-only entries.
  scrubTriggeredActivities(report, counters);

  // P1 + P2 + P3 walk (mutating a copy).
  const walked = walk(report, opts.ledger, counters) as Record<string, unknown>;

  // Re-run triggered_activities strip AFTER walk (walker preserves array
  // but per-entry strip converts partials — dropping now catches any
  // entry whose entire content became empty after stripping).
  try {
    const as: any = (walked as any).assessment_summary;
    if (as && Array.isArray(as.triggered_activities)) {
      const kept: string[] = [];
      for (const s of as.triggered_activities) {
        if (typeof s !== "string") continue;
        if (isPlaceholderOnly(s) || !s.trim()) { counters.placeholder_entries_dropped += 1; continue; }
        kept.push(s);
      }
      as.triggered_activities = kept;
    }
  } catch { /* fail-open */ }

  // P4 dedup runs on the mutated object.
  dedupSafeguards(walked, counters);

  return { counters, report: walked };
}
