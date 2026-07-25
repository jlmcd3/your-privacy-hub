// W20-RISK-TURNB — Wave-20 fix turn for run-cppa-risk-assessment.
//
// Deterministic terminal sanitizers for the four defect classes surfaced in
// wave-20 batch d298609c (docs c7a03a1f, e6c808b4, ec8e6844):
//
//   B2 — Empty-parenthetical debris ("selling or sharing personal
//        information ()") on any prose surface, including the NEW recurrence
//        surface scope_and_triggers.scope_notes. Deterministic scrub across
//        every string leaf. Bare/missing-pinpoint recurrence for the same
//        surface is already covered upstream by rewriteProse (W15/W16); this
//        pass only removes the "()" residue.
//
//   B3 — Doubled-determiner splice debris ported from the W20-ADMT-TURNA
//        variant-tolerant pattern. Generalised for
//          "…two the § …" / "…the X the § …"
//        plus a small closed-set of doubled trailing nouns observed on risk
//        ("trigger analysis trigger indicators" → "trigger indicators").
//
//   B5 — Unsupported cross-reference guard. Sentences that claim ADMT
//        "content entries" (or otherwise reference ADMT payload the risk
//        report did not populate) are dropped when the risk report_data
//        carries no ADMT payload of its own.
//
//   B6 — Body-text counsel-referral scrub extended to inconsistency_flags
//        description / resolution_required. The existing counsel-voice pass
//        does not walk those keys; this terminal pass rewrites the escaped
//        phrasing in place.
//
// B1 (§ 7121(a) cohort determinism) is NOT emitted from this file: the
// risk verified-authority registry has no verbatim § 7121(a)(3) row and the
// public.provision_texts corpus has no § 7121(a) verbatim text. Per the
// dispatch rule "if no corpus verbatim text exists, DO NOT fabricate", the
// report emits only what is anchorable. The ledger flag lives in
// docs/pipeline-state.md queue item 39.
//
// B4 is implemented as a widened regex on the existing D2 profiling-denial
// guard in _w10_risk_b1.ts (ledger-consulted, never fabricates a positive).
//
// Fail-open, non-blocking; counters attach at _meta.internal.risk_w20b.

export const W20_RISK_TURNB_STAMP = "w20-risk-turnb@2026-07-25T09:48:30Z";

export interface W20RiskTurnBCounters {
  strings_scanned: number;
  empty_parens_scrubbed: number;
  doubled_determiner_scrubbed: number;
  doubled_trailing_noun_scrubbed: number;
  admt_cross_ref_sentences_dropped: number;
  counsel_referrals_rewritten: number;
}

const emptyCounters = (): W20RiskTurnBCounters => ({
  strings_scanned: 0,
  empty_parens_scrubbed: 0,
  doubled_determiner_scrubbed: 0,
  doubled_trailing_noun_scrubbed: 0,
  admt_cross_ref_sentences_dropped: 0,
  counsel_referrals_rewritten: 0,
});

// Keys whose values are anchor identifiers, not customer prose; never scrub.
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
]);

// ----- B2: empty parenthetical scrub ---------------------------------------
// Matches "(...)" containing only whitespace, punctuation, or dashes. Does
// not touch parentheticals with alphanumerics (real pinpoints like "(b)",
// "(a)(3)", "(4)"). Absorbs one preceding space so we do not leave a
// double-space wound.
const EMPTY_PAREN_RE = /\s?\(\s*[\-\u2013\u2014,;:.\s]*\)/g;

// ----- B3a: doubled-determiner splice --------------------------------------
// "two the § 7150(b)" → "the § 7150(b)"; "the record carries two the § …"
// → "the record carries the § …". Also collapses "the X the §" when X is a
// short filler word (up to 4 tokens) — same shape as the W20-ADMT-TURNA
// pattern, restricted to a § anchor on the right to avoid false positives.
// Restricted to the "two the §" splice — the exact debris shape observed
// on the wave-20 e6c808b4 recurrence ("carries two the § 7150(b)"). We do
// NOT match "the … the §" because that is legitimate English.
const DOUBLED_DETERMINER_RE =
  /\btwo\s+the\s+(§)/gi;

// ----- B3b: doubled trailing noun-pair (closed set) -----------------------
// Observed on risk: "trigger analysis trigger indicators" → "trigger
// indicators". Closed-set so we never touch legitimate prose.
const DOUBLED_NOUN_PAIRS: readonly [RegExp, string][] = [
  [/\btrigger\s+analysis\s+trigger\s+indicators\b/gi, "trigger indicators"],
  [/\btrigger\s+indicators\s+trigger\s+analysis\b/gi, "trigger analysis"],
];

// ----- B6: counsel-referral rewrite (body-text escape) --------------------
// Same shape enforced by ADVISORY_VOICE_RULES; this pass catches the
// escapes on inconsistency_flags.description/resolution_required surfaces.
const COUNSEL_REFERRAL_RE =
  /\b(?:consult|engage|retain|contact|seek advice from|obtain guidance from)\s+(?:with\s+)?(?:qualified\s+)?(?:legal\s+)?counsel\b[^.!?\n]*/gi;
const COUNSEL_REPLACEMENT = "document the determination with the assessment record";

function scrubString(s: string, c: W20RiskTurnBCounters): string {
  if (!s || typeof s !== "string") return s;
  c.strings_scanned += 1;
  let out = s;

  // B2
  const beforeParens = out;
  out = out.replace(EMPTY_PAREN_RE, "");
  if (out !== beforeParens) c.empty_parens_scrubbed += 1;

  // B3a
  const beforeDet = out;
  out = out.replace(DOUBLED_DETERMINER_RE, (_m, sec: string) => `the ${sec}`);
  if (out !== beforeDet) c.doubled_determiner_scrubbed += 1;

  // B3b
  for (const [re, rep] of DOUBLED_NOUN_PAIRS) {
    const beforeNoun = out;
    out = out.replace(re, rep);
    if (out !== beforeNoun) c.doubled_trailing_noun_scrubbed += 1;
  }

  // B6
  const beforeCounsel = out;
  out = out.replace(COUNSEL_REFERRAL_RE, COUNSEL_REPLACEMENT);
  if (out !== beforeCounsel) c.counsel_referrals_rewritten += 1;

  // Collapse runs of whitespace introduced by scrubs.
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1");

  return out;
}

function walk(node: unknown, c: W20RiskTurnBCounters, keyCtx?: string): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    return scrubString(node, c);
  }
  if (Array.isArray(node)) return node.map((v) => walk(v, c, keyCtx));
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; } // never touch _meta / underscore keys
      out[k] = walk(v, c, k);
    }
    return out;
  }
  return node;
}

// ----- B5: ADMT cross-reference guard --------------------------------------
// Drops sentences that reference ADMT payload the risk report did not
// populate. Runs on prose leaves; conservative pattern.
const ADMT_XREF_SENTENCE_RE =
  /[^.!?\n]*\b(?:'n\/a'|"n\/a"|n\/a|no|zero)\s+ADMT\s+content\s+entries[^.!?\n]*[.!?]/gi;

function reportHasAdmtPayload(report: Record<string, unknown>): boolean {
  const admt = (report as any).admt_summary ?? (report as any).admt_content_entries;
  if (!admt) return false;
  if (Array.isArray(admt)) return admt.length > 0;
  if (typeof admt === "object") return Object.keys(admt).length > 0;
  return true;
}

function stripAdmtXref(
  node: unknown,
  hasAdmt: boolean,
  c: W20RiskTurnBCounters,
  keyCtx?: string,
): unknown {
  if (hasAdmt) return node;
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    const stripped = node.replace(ADMT_XREF_SENTENCE_RE, () => {
      c.admt_cross_ref_sentences_dropped += 1;
      return "";
    });
    return stripped.replace(/\s{2,}/g, " ").trim();
  }
  if (Array.isArray(node)) return node.map((v) => stripAdmtXref(v, hasAdmt, c, keyCtx));
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; }
      out[k] = stripAdmtXref(v, hasAdmt, c, k);
    }
    return out;
  }
  return node;
}

export function applyW20RiskTurnB(
  report: Record<string, unknown>,
): { counters: W20RiskTurnBCounters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };

  // Deterministic prose scrubs (B2/B3/B6).
  const scrubbed = walk(report, counters) as Record<string, unknown>;

  // B5 — ADMT cross-reference guard (only if the report has no ADMT payload).
  const hasAdmt = reportHasAdmtPayload(scrubbed);
  const final = stripAdmtXref(scrubbed, hasAdmt, counters) as Record<string, unknown>;

  return { counters, report: final };
}
