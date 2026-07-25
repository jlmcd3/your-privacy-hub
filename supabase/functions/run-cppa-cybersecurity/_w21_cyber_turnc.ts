// W21-CYBER-TURNC — Wave-21 fix turn for run-cppa-cybersecurity.
// TEAM-REVIEWED (statute / customer clarity / leak prevention / measurement
// integrity / regression safety). Deploy dispatch 2026-07-25 (item 47 digest;
// items 49/50 pattern). Closes the five wave-21 cyber HIGH findings from
// batch 12640b0f (campaign fd1be147, run 114 = 87.15 on s4):
//
//   C1 — § 7123(c)(N) SUBSECTION-MAP GUARD (doc 2355ea77): a (c)(N)
//        pinpoint in customer prose survives only if the parent entry's
//        proposition_key resolves in CYBER_VERIFIED_AUTHORITIES to that
//        exact subsection, OR (keyless) the parent object's canonical
//        control name or the prose itself names a control whose
//        COMPONENT_CITATIONS entry is 11 CCR § 7123(c)(N) with the same
//        N. Otherwise strip the (c)(N) portion, preserving the § 7123
//        composite anchor. Never invents pinpoints.
//   C2 — UNSUPPORTED DATA-CATEGORY CLAIMS (doc 2355ea77 "patient health
//        information"): if the intake fact ledger carries no support for
//        the asserted category, rewrite to intake-supported phrasing
//        ("the data categories reported in the intake"). Customer-facing
//        gaps use plain catalog phrasing; never raw field IDs; never
//        "information needed" for citation-resolution gaps.
//   C3 — DERIVED-ARITHMETIC GUARD (doc 85478f8e): numbers computed from
//        intake (head-count arithmetic etc.) must not be presented as
//        intake-stated facts. When "the intake states/records/reports N
//        <headcount-noun>" appears and N is NOT a verbatim substring of
//        the intake JSON, reframe as derivation ("based on the figures
//        provided, approximately N …").
//   C4 — § 7122(g) RETENTION-NUANCE GUARD (doc 85478f8e): § 7122(g)
//        survives in prose only when the sentence carries retention
//        context (retention/retain/audit-record/audit-support/records
//        supporting/five-year); elsewhere downgrade to §§ 7120–7124.
//        Mirrors the B5/B6 conservative pattern.
//   C5 — SPLICE/GARBLE SCRUB, CYBER VARIANT (doc 49353ce0 "SailPoint
//        provides comparative guidance"): port the admt/risk variant-
//        splice scrub to cyber. Deterministic, terminal. Drops the
//        offending sentence.
//   C6 — TELEMETRY: report._meta.internal.cyber_w21c = { stamp,
//        per-guard counters, strings_scanned }. LEAK-PREV-P2 serializer
//        preserves _meta.internal verbatim — no whitelist edit needed.
//
// Fail-open, non-blocking. Runs AFTER the W17 boilerplate guard and
// IMMEDIATELY BEFORE runEmitGate (LEAK-PREV P1) so the emit-gate sees
// final text.

import type { FactRow } from "../_shared/intake/fact-ledger.ts";
import {
  CYBER_VERIFIED_AUTHORITIES,
  CYBER_VERIFIED_AUTHORITY_VERSION as _CYBER_VA_VERSION,
} from "../_shared/registry/cyber-verified-authorities.ts";

export const W21_CYBER_TURNC_STAMP = "w21-cyber-turnc@2026-07-25T12:53:27Z";

// ── Anchor keys never mutated by this pass ─────────────────────────────
const ANCHOR_KEYS: ReadonlySet<string> = new Set<string>([
  "citation", "regulatory_basis", "fsor_citation", "verbatim_quote",
  "subsection", "governing_anchor", "proposition_key", "primary_source_url",
  "source_fields", "id", "key", "stamp", "build_stamp", "url",
  "deadline", "deadline_basis", "provision",
]);

// ── Reserved container subtrees — walked-through but leaves untouched ─
// These carry structured citation/telemetry content the emit-gate + P2
// serializer already govern; walking past their anchor-shaped leaves is
// unnecessary and risks self-mutation.
const RESERVED_CONTAINERS: ReadonlySet<string> = new Set<string>([
  "_meta", "_staging", "_drafting_record", "_normalized_intake",
  "deterministic_checks", "annotations", "lint_warnings",
  "engagement_map", "enforcement_meta", "enforcement_precedents",
  "enforcement_context", "citation_ledger", "crosswalk_matrix",
]);

// ── COMPONENT_CITATIONS — mirrors run-cppa-cybersecurity/index.ts:268 ─
// Duplicated deliberately (no export from index) so this module has no
// import cycle. Keep in lock-step manually.
const COMPONENT_CITATIONS: Readonly<Record<string, string>> = {
  "Authentication":                                                 "11 CCR § 7123(c)(1)",
  "Encryption of personal information":                             "11 CCR § 7123(c)(2)",
  "Account management and access controls":                         "11 CCR § 7123(c)(3)",
  "Inventory and management of personal information and systems":   "11 CCR § 7123(c)(4)",
  "Secure configuration of hardware and software":                  "11 CCR § 7123(c)(5)",
  "Vulnerability scanning and penetration testing":                 "11 CCR § 7123(c)(6)",
  "Audit-log management":                                           "11 CCR § 7123(c)(7)",
  "Network monitoring and defenses":                                "11 CCR § 7123(c)(8)",
  "Antivirus and anti-malware protections":                         "11 CCR § 7123(c)(9)",
  "Segmentation of an information system":                          "11 CCR § 7123(c)(10)",
  "Port and protocol management and protection":                    "11 CCR § 7123(c)(11)",
  "Cybersecurity awareness":                                        "11 CCR § 7123(c)(12)",
  "Cybersecurity education and training":                           "11 CCR § 7123(c)(13)",
  "Secure development and coding practices":                        "11 CCR § 7123(c)(14)",
  "Oversight of service providers, contractors, and third parties": "11 CCR § 7123(c)(15)",
  "Retention schedules and proper disposal of personal information":"11 CCR § 7123(c)(16)",
  "Security-incident response management":                          "11 CCR § 7123(c)(17)",
  "Business-continuity and disaster-recovery planning":             "11 CCR § 7123(c)(18)",
};

const CONTROL_NAME_TO_N: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const [name, cite] of Object.entries(COMPONENT_CITATIONS)) {
    const mm = cite.match(/\(c\)\((\d+)\)/);
    if (mm) m.set(name.toLowerCase(), Number(mm[1]));
  }
  return m;
})();

// Registry N-map: proposition_key → subsection N (only if § 7123(c)(N))
const REGISTRY_KEY_TO_C_N: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const row of Object.values(CYBER_VERIFIED_AUTHORITIES as Record<string, {
    proposition_key: string; subsection?: string; citation?: string;
  }>)) {
    const src = `${row.subsection ?? ""} ${row.citation ?? ""}`;
    const mm = src.match(/§\s*7123\s*\(c\)\s*\((\d+)\)/);
    if (mm) m.set(row.proposition_key, Number(mm[1]));
  }
  return m;
})();

// ── Counters ────────────────────────────────────────────────────────────
export interface W21CyberTurnCCounters {
  strings_scanned: number;
  c1_c_n_stripped: number;
  c1_c_n_kept_registry: number;
  c1_c_n_kept_component: number;
  c2_unsupported_category_scrubbed: number;
  c3_derived_arith_reframed: number;
  c4_retention_downgraded: number;
  c5_splice_sentences_dropped: number;
}

const emptyCounters = (): W21CyberTurnCCounters => ({
  strings_scanned: 0,
  c1_c_n_stripped: 0,
  c1_c_n_kept_registry: 0,
  c1_c_n_kept_component: 0,
  c2_unsupported_category_scrubbed: 0,
  c3_derived_arith_reframed: 0,
  c4_retention_downgraded: 0,
  c5_splice_sentences_dropped: 0,
});

// ── C5 splice / garble scrub (cyber variant) ────────────────────────────
// Wave-21 doc 49353ce0: "SailPoint provides comparative guidance" — a
// vendor proper-noun spliced into "provides comparative guidance" is a
// generation artefact, not a substantive claim. Cyber variant of the
// admt/risk splice scrub (see run-admt-checker/_w20_admt_turna.ts B1 and
// run-cppa-risk-assessment/_w21_risk_turna.ts A3): drop the offending
// sentence outright rather than leave a truncated stub.
const CYBER_VENDOR_TOKEN =
  "(?:SailPoint|CrowdStrike|Splunk|Rapid7|Qualys|Tenable|SentinelOne|Okta|Duo|CyberArk|HashiCorp|Palo\\s*Alto(?:\\s*Networks)?|Fortinet|Cisco|Microsoft(?:\\s+(?:Defender|Sentinel|Entra|Purview))?|Azure|AWS|GCP|Google\\s*Cloud|IBM|Oracle|Trellix|Zscaler|Cloudflare|Datadog|Elastic)";
// Sentence containing "<vendor> provides comparative guidance" — drop it.
const SPLICE_SENTENCE_RE = new RegExp(
  `(?:^|(?<=[.!?\\n]))\\s*[^.!?\\n]*\\b${CYBER_VENDOR_TOKEN}\\s+provides\\s+comparative\\s+guidance\\b[^.!?\\n]*[.!?]?`,
  "gi",
);
// Also handle a bare stub not tied to a preceding period (defensive).
const SPLICE_BARE_RE = new RegExp(
  `\\b${CYBER_VENDOR_TOKEN}\\s+provides\\s+comparative\\s+guidance\\b[^.!?\\n]*[.!?]?`,
  "gi",
);

function scrubSpliceCyber(s: string, c: W21CyberTurnCCounters): string {
  if (!s) return s;
  let out = s;
  let hits = 0;
  out = out.replace(SPLICE_SENTENCE_RE, () => { hits += 1; return ""; });
  // Any residual bare stub (defensive; SPLICE_SENTENCE_RE usually swallows it).
  out = out.replace(SPLICE_BARE_RE, () => { hits += 1; return ""; });
  c.c5_splice_sentences_dropped += hits;
  return out;
}

// ── C4 § 7122(g) retention-nuance guard ────────────────────────────────
const S_7122G_TOKEN_RE = /§\s*7122\s*\(\s*g\s*\)/gi;
const RETENTION_CONTEXT_RE =
  /\b(retain|retention|retained|five[- ]?year|5[- ]?year|audit[- ]?record|audit[- ]?support|records?\s+supporting|documentation\s+supporting|record[- ]?keeping)\b/i;
const NEUTRAL_7122G_CITATION = "11 CCR §§ 7120–7124";

function scrubRetention7122g(s: string, c: W21CyberTurnCCounters): string {
  if (!s || !S_7122G_TOKEN_RE.test(s)) return s;
  // Split by sentence terminators; keep the terminators inline.
  const parts = s.split(/([.!?]\s+|\n)/);
  let mutated = false;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg) continue;
    if (!/§\s*7122\s*\(\s*g\s*\)/i.test(seg)) continue;
    if (RETENTION_CONTEXT_RE.test(seg)) continue; // retention context — keep
    const before = seg;
    const replaced = seg.replace(/(?:11\s*CCR\s*)?§\s*7122\s*\(\s*g\s*\)/gi, NEUTRAL_7122G_CITATION);
    if (replaced !== before) {
      parts[i] = replaced;
      mutated = true;
      c.c4_retention_downgraded += 1;
    }
  }
  return mutated ? parts.join("") : s;
}

// ── C2 unsupported data-category claims ────────────────────────────────
// Bounded token list — wave-21 case was "patient health information". Any
// category token that does NOT appear in the intake JSON is rephrased to
// a neutral, intake-anchored placeholder. Health tokens are the primary
// remediation; other tokens are conservative additions for the same
// class of defect.
interface CategoryRule {
  pattern: RegExp;
  intakeCue: RegExp;
  replacement: string;
}
const CATEGORY_RULES: readonly CategoryRule[] = [
  {
    pattern: /\b(patient\s+health\s+information|protected\s+health\s+information|\bPHI\b)\b/gi,
    intakeCue: /\b(health|medical|clinical|patient|PHI|HIPAA)\b/i,
    replacement: "the data categories reported in the intake",
  },
  {
    pattern: /\b(biometric\s+(?:data|identifiers?|information))\b/gi,
    intakeCue: /\bbiometric\b/i,
    replacement: "the data categories reported in the intake",
  },
  {
    pattern: /\b(children'?s?\s+(?:data|personal\s+information))\b/gi,
    intakeCue: /\b(child|children|minor|under\s+13|COPPA)\b/i,
    replacement: "the data categories reported in the intake",
  },
];

function intakeContainsCue(intakeText: string, cue: RegExp): boolean {
  if (!intakeText) return false;
  return cue.test(intakeText);
}

function scrubUnsupportedCategories(
  s: string,
  intakeText: string,
  c: W21CyberTurnCCounters,
): string {
  if (!s) return s;
  let out = s;
  for (const rule of CATEGORY_RULES) {
    if (!rule.pattern.test(out)) { rule.pattern.lastIndex = 0; continue; }
    rule.pattern.lastIndex = 0;
    if (intakeContainsCue(intakeText, rule.intakeCue)) continue;
    const before = out;
    out = out.replace(rule.pattern, rule.replacement);
    if (out !== before) c.c2_unsupported_category_scrubbed += 1;
  }
  return out;
}

// ── C3 derived-arithmetic guard ─────────────────────────────────────────
const INTAKE_ATTRIB_RE =
  /\b(the\s+intake\s+(?:records|states|reports|shows|documents|indicates)|according\s+to\s+the\s+intake|per\s+the\s+intake)\b([^.!?\n]*?)\b(\d[\d,]*)\s+(users?|accounts?|employees|staff|personnel|records?|systems?|endpoints?|devices?|servers?|workstations?)\b/gi;

function intakeContainsNumberVerbatim(intakeText: string, n: string): boolean {
  if (!intakeText || !n) return false;
  const clean = n.replace(/,/g, "");
  // Match either the comma form or the plain digit form.
  return intakeText.includes(n) || (clean !== n && intakeText.includes(clean));
}

function scrubDerivedArithmetic(
  s: string,
  intakeText: string,
  c: W21CyberTurnCCounters,
): string {
  if (!s) return s;
  return s.replace(INTAKE_ATTRIB_RE, (match, _lead, mid, num, noun) => {
    if (intakeContainsNumberVerbatim(intakeText, String(num))) return match;
    c.c3_derived_arith_reframed += 1;
    return `based on the figures provided, approximately ${num} ${noun}`;
  });
}

// ── C1 § 7123(c)(N) subsection-map guard ────────────────────────────────
const CN_RE = /(§\s*7123)\s*\(c\)\s*\((\d+)\)/gi;

function nFromParent(parent: Record<string, unknown> | undefined): number | undefined {
  if (!parent) return undefined;
  // Registry route (opts in only if proposition_key resolves and maps to c)(N).
  const pk = parent["proposition_key"];
  if (typeof pk === "string") {
    const n = REGISTRY_KEY_TO_C_N.get(pk);
    if (typeof n === "number") return n;
  }
  // Component-name route on the parent object.
  for (const field of ["control", "component", "label", "name"]) {
    const v = parent[field];
    if (typeof v !== "string") continue;
    const n = CONTROL_NAME_TO_N.get(v.trim().toLowerCase());
    if (typeof n === "number") return n;
  }
  return undefined;
}

function proseNamesControlN(prose: string): number | undefined {
  const lo = prose.toLowerCase();
  for (const [name, n] of CONTROL_NAME_TO_N.entries()) {
    if (lo.includes(name)) return n;
  }
  return undefined;
}

function scrubSubsectionMap(
  s: string,
  parent: Record<string, unknown> | undefined,
  c: W21CyberTurnCCounters,
): string {
  if (!s || !CN_RE.test(s)) { CN_RE.lastIndex = 0; return s; }
  CN_RE.lastIndex = 0;
  const parentN = nFromParent(parent);
  const proseN = proseNamesControlN(s);
  return s.replace(CN_RE, (_m, base, nRaw) => {
    const found = Number(nRaw);
    // Registry / component-name (parent) route.
    if (parentN === found) {
      // classify credit
      const pk = parent && typeof parent["proposition_key"] === "string"
        ? String(parent["proposition_key"]) : "";
      if (pk && REGISTRY_KEY_TO_C_N.get(pk) === found) c.c1_c_n_kept_registry += 1;
      else c.c1_c_n_kept_component += 1;
      return `${String(base).replace(/\s+/g, " ")}(c)(${found})`;
    }
    // Keyless prose route.
    if (proseN === found) {
      c.c1_c_n_kept_component += 1;
      return `${String(base).replace(/\s+/g, " ")}(c)(${found})`;
    }
    // Strip the (c)(N) portion; preserve § 7123 composite anchor.
    c.c1_c_n_stripped += 1;
    return String(base).replace(/\s+/g, " ");
  });
}

// ── String pipeline ─────────────────────────────────────────────────────
function scrubString(
  s: string,
  parent: Record<string, unknown> | undefined,
  intakeText: string,
  c: W21CyberTurnCCounters,
): string {
  if (!s || typeof s !== "string") return s;
  c.strings_scanned += 1;
  let out = s;
  // Order: splice drop FIRST (removes garbled sentences from further passes)
  out = scrubSpliceCyber(out, c);
  out = scrubRetention7122g(out, c);
  out = scrubUnsupportedCategories(out, intakeText, c);
  out = scrubDerivedArithmetic(out, intakeText, c);
  out = scrubSubsectionMap(out, parent, c);
  // Whitespace/punctuation tidy — never introduces terms.
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  return out;
}

// ── Walker ──────────────────────────────────────────────────────────────
function walk(
  node: unknown,
  parent: Record<string, unknown> | undefined,
  keyCtx: string | undefined,
  intakeText: string,
  c: W21CyberTurnCCounters,
): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    return scrubString(node, parent, intakeText, c);
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, parent, keyCtx, intakeText, c));
  }
  if (typeof node === "object") {
    const src = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (k.startsWith("_") || RESERVED_CONTAINERS.has(k)) {
        out[k] = v; // pass-through: reserved subtree or underscore-prefixed
        continue;
      }
      if (ANCHOR_KEYS.has(k)) {
        out[k] = v; // never mutate anchor-shaped values
        continue;
      }
      out[k] = walk(v, src, k, intakeText, c);
    }
    return out;
  }
  return node;
}

// ── Entrypoint ─────────────────────────────────────────────────────────
export interface ApplyW21CyberTurnCOptions {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
  stamp?: string; // override for tests only; default = W21_CYBER_TURNC_STAMP
}

export interface ApplyW21CyberTurnCResult {
  counters: W21CyberTurnCCounters;
  report: Record<string, unknown>;
}

export function applyW21CyberTurnC(
  report: Record<string, unknown>,
  opts: ApplyW21CyberTurnCOptions = {},
): ApplyW21CyberTurnCResult {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };

  // Build intake-text haystack ONCE for cheap substring checks.
  let intakeText = "";
  try {
    if (opts.intake) intakeText = JSON.stringify(opts.intake);
    else if (opts.ledger && opts.ledger.length > 0) {
      // Fallback: fold ledger raw values into the haystack.
      intakeText = opts.ledger.map((r) => JSON.stringify(r)).join(" ");
    }
  } catch { intakeText = ""; }

  const scrubbed = walk(report, undefined, undefined, intakeText, counters) as
    Record<string, unknown>;

  // C6 telemetry — non-destructive attach under _meta.internal.
  try {
    const meta = (scrubbed._meta = (scrubbed._meta as Record<string, unknown>) ?? {});
    const internal = ((meta as Record<string, unknown>).internal =
      (meta as Record<string, unknown>).internal as Record<string, unknown> ?? {});
    (internal as Record<string, unknown>).cyber_w21c = {
      stamp: opts.stamp ?? W21_CYBER_TURNC_STAMP,
      cyber_va_version: _CYBER_VA_VERSION,
      ...counters,
    };
  } catch { /* fail-open */ }

  return { counters, report: scrubbed };
}
