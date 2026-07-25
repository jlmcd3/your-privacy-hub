// LIA-T6-FIX-TURN (2026-07-25) — deterministic post-pass discharging the
// T6-NONCPPA-MEASUREMENT-BATCH-1 LIA per-tool backlog items 81(a)+(b).
//
// Runs AFTER _w1_lia_wire (registry-first pinpoint stamping) and BEFORE
// LEAK-PREV-P1 emit-gate. Model NEVER writes/edits customer prose — this
// module is drop-only or neutral-downgrade-only.
//
// CLASS A — key-selection-mismatch audit (port of W24 admt Class A).
//   The W1 wire already substitutes verified pinpoints for any object whose
//   `proposition_key` resolves in LIA_VERIFIED_AUTHORITIES. It does NOT touch
//   objects whose key is unresolved (neither verified nor on the unanchored
//   list) — those retain whatever the model authored. This audit scrubs the
//   pinpoint fields on those nodes: omission over invention. It also scrubs
//   syntactically-truncated citation strings on nodes that carry no key at
//   all (dangling "Art. 6(", trailing hyphens/commas, unbalanced parens).
//
// CLASS B — unsupported-business-claim downgrade (port of W24 Class B).
//   Prose sentences that combine an assertive verb (confirms/shows/
//   establishes/demonstrates) with a factual business claim are downgraded
//   to a neutral "The organisation should confirm whether …" sentence when
//   the sentence's content nouns do NOT appear in the flattened intake
//   ledger. Intake-supported claims are preserved verbatim. NEVER emits
//   "information needed" phrasing on customer surfaces (RULE 2.7 S1).
//
// DOCTRINE (ledger item 84c): every sentence-level scrub consumes the
// entire sentence from start boundary through terminal period inclusive,
// with whitespace re-join. No partial-excision splice residue.
//
// Fail-open: every helper wrapped in try/catch; availability never blocked.

import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_UNANCHORED_PROPOSITIONS,
  LIA_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/lia-verified-authorities.ts";

export const LIA_T6_FIX_STAMP = "lia-t6fix@2026-07-25T23:10:00Z";

export interface LiaT6FixCounters {
  version: string;
  stamp: string;
  build_stamp?: string;
  classA_pinpoint_substitutions: number;   // already done by W1; audited/preserved here
  classA_pinpoint_omissions: number;       // unresolvable / truncated → nulled
  classB_downgrades: number;
  classB_preserved: number;
  sentences_excised: number;
  strings_scanned: number;
  errors: number;
}

// Structural / reserved subtrees — walk INTO them for prose only when they
// are not on the pinpoint-anchor path. Match the W1 wire skip list so the
// two passes agree on what is "customer surface".
const SKIP_SUBTREE_KEYS = new Set<string>([
  "_meta", "_staging", "_drafting_record", "_normalized_intake",
  "_revision", "deterministic_checks", "annotations", "lint_warnings",
  "engagement_map", "enforcement_meta", "enforcement_precedents",
  "enforcement_context", "citation_ledger",
]);

// Keys that MUST NOT be mutated as prose (they are identifiers, anchors,
// or verified pinpoints). Applies to Class B only; Class A explicitly
// manages the citation pinpoint keys.
const ANCHOR_KEYS = new Set<string>([
  "field", "source_fields", "id", "key", "stamp", "build_stamp",
  "proposition_key", "governing_anchor", "citation_verified",
  "write_around", "verbatim_quote", "citation", "subsection",
  "regulatory_citation", "provision", "citations",
]);

const UNANCHORED = new Set<string>(LIA_UNANCHORED_PROPOSITIONS);

// ── Class A helpers ────────────────────────────────────────────────────

const CITATION_PINPOINT_KEYS = ["citation", "subsection", "verbatim_quote"] as const;

/**
 * Truncated / malformed citation string detector. Conservative: only fires
 * on clearly broken shapes so we never scrub a legitimate long citation.
 */
function isTruncatedCitation(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  // Unbalanced parens
  const opens = (t.match(/\(/g) ?? []).length;
  const closes = (t.match(/\)/g) ?? []).length;
  if (opens !== closes) return true;
  // Trailing punctuation that indicates truncation
  if (/[,\-–—;:(]$/.test(t)) return true;
  // "Art." / "Article" with no number
  if (/^(Art\.?|Article|Section|§)\s*$/i.test(t)) return true;
  // Bare "GDPR Art." with nothing after
  if (/\bArt\.?\s*$/i.test(t)) return true;
  return false;
}

function nullPinpoints(node: Record<string, unknown>): boolean {
  let touched = false;
  for (const k of CITATION_PINPOINT_KEYS) {
    if (node[k] != null) {
      node[k] = null;
      touched = true;
    }
  }
  if (touched) {
    node.citation_verified = false;
    node.pinpoint_omitted = true;
  }
  return touched;
}

// ── Class B helpers ────────────────────────────────────────────────────

const ASSERTIVE_VERB_RE =
  /\b(confirms?|shows?|establishes?|demonstrates?|proves?|verifies)\b/i;

const NEUTRAL_DOWNGRADE =
  "The organisation should confirm whether the described position applies here.";

// Whole-sentence split that preserves boundaries; used for both classes so
// the doctrine (item 84c) is enforced identically everywhere.
function splitSentences(s: string): string[] {
  // Split on sentence-terminal punctuation followed by whitespace or EOL.
  // Keeps the terminal punctuation attached to the preceding sentence.
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+|\S[^.!?]*$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push(m[0]);
  return out;
}

function rejoin(parts: string[]): string {
  return parts.map(p => p.trim()).filter(Boolean).join(" ");
}

/**
 * Flatten intake into a lowercase text blob for content-noun lookup.
 * Cheap and deterministic; skips reserved keys.
 */
function flattenIntake(intake: unknown): string {
  const parts: string[] = [];
  const walk = (n: unknown) => {
    if (n == null) return;
    if (typeof n === "string" || typeof n === "number" || typeof n === "boolean") {
      parts.push(String(n));
      return;
    }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n === "object") {
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
        if (k.startsWith("_")) continue;
        walk(v);
      }
    }
  };
  try { walk(intake); } catch { /* fail-open */ }
  return parts.join(" ").toLowerCase();
}

const STOPWORDS = new Set<string>([
  "the","a","an","and","or","of","to","in","on","for","with","by","as",
  "is","are","was","were","be","been","being","that","this","these","those",
  "it","its","which","who","whom","whose","from","at","into","than","then",
  "shall","should","must","may","can","will","would","could","also","not",
  "no","yes","any","all","each","every","some","one","two","three","here",
  "there","organisation","organization","controller","processor","company",
  "business","subject","data","processing","assessment","legitimate",
  "interest","interests","gdpr","article","section","art","record","records",
  "confirm","confirms","confirmed","shows","show","showed","establish",
  "establishes","established","demonstrate","demonstrates","demonstrated",
  "prove","proves","proved","verify","verifies","verified",
]);

function contentTokens(sentence: string): string[] {
  return Array.from(new Set(
    sentence.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOPWORDS.has(w))
  ));
}

/**
 * Downgrade a single prose string. Returns { text, downgrades, preserved }.
 */
function downgradeString(
  s: string,
  intakeText: string,
  c: LiaT6FixCounters,
): string {
  if (!s || typeof s !== "string") return s;
  if (!ASSERTIVE_VERB_RE.test(s)) return s;

  const sentences = splitSentences(s);
  let mutated = false;
  const out: string[] = [];
  for (const raw of sentences) {
    const sent = raw.trim();
    if (!sent) continue;
    if (!ASSERTIVE_VERB_RE.test(sent)) {
      out.push(sent);
      continue;
    }
    // Intake-supported? Any content token appears in flattened intake.
    const toks = contentTokens(sent);
    const supported = toks.some(t => intakeText.includes(t));
    if (supported) {
      c.classB_preserved += 1;
      out.push(sent);
    } else {
      c.classB_downgrades += 1;
      c.sentences_excised += 1;
      out.push(NEUTRAL_DOWNGRADE);
      mutated = true;
    }
  }
  return mutated ? rejoin(out) : s;
}

// ── Class A citation-string audit ─────────────────────────────────────

function auditNode(node: Record<string, unknown>, c: LiaT6FixCounters): void {
  const pk = typeof node.proposition_key === "string" ? node.proposition_key : "";
  const isVerified = node.citation_verified === true;
  const isWriteAround = node.write_around === true;

  if (pk && LIA_VERIFIED_AUTHORITIES[pk] && isVerified) {
    // Already substituted by W1 wire. Preserved untouched.
    c.classA_pinpoint_substitutions += 1;
    return;
  }
  if (pk && UNANCHORED.has(pk) && isWriteAround) {
    // W1 already applied write-around (nulls). Nothing to do.
    return;
  }
  if (pk && pk.length > 0) {
    // Unresolved key — never invent. Null pinpoints (idempotent).
    if (node.pinpoint_omitted === true) return;
    if (nullPinpoints(node)) c.classA_pinpoint_omissions += 1;
    return;
  }
  // No proposition_key. Scrub only clearly-truncated citation strings.
  const cit = node.citation;
  if (typeof cit === "string" && isTruncatedCitation(cit)) {
    if (nullPinpoints(node)) c.classA_pinpoint_omissions += 1;
  }
}

// ── Walker ─────────────────────────────────────────────────────────────

function walk(
  node: unknown,
  intakeText: string,
  c: LiaT6FixCounters,
  parentKey: string | null,
): unknown {
  if (node == null) return node;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = walk(node[i], intakeText, c, parentKey);
    }
    return node;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    // Class A on this node
    try { auditNode(obj, c); } catch { c.errors += 1; }
    // Recurse
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_SUBTREE_KEYS.has(k)) continue;
      obj[k] = walk(v, intakeText, c, k);
    }
    return obj;
  }
  if (typeof node === "string") {
    c.strings_scanned += 1;
    if (parentKey && ANCHOR_KEYS.has(parentKey)) return node;
    try { return downgradeString(node, intakeText, c); }
    catch { c.errors += 1; return node; }
  }
  return node;
}

/**
 * Public entry. Mutates report in place; returns telemetry counters.
 * Never throws.
 */
export function applyLiaT6Fix(
  report: unknown,
  opts?: { intake?: unknown; buildStamp?: string },
): LiaT6FixCounters {
  const c: LiaT6FixCounters = {
    version: LIA_VERIFIED_AUTHORITY_VERSION,
    stamp: LIA_T6_FIX_STAMP,
    build_stamp: opts?.buildStamp,
    classA_pinpoint_substitutions: 0,
    classA_pinpoint_omissions: 0,
    classB_downgrades: 0,
    classB_preserved: 0,
    sentences_excised: 0,
    strings_scanned: 0,
    errors: 0,
  };
  try {
    const intakeText = flattenIntake(opts?.intake ?? {});
    if (report && typeof report === "object") walk(report, intakeText, c, null);
    // Telemetry
    try {
      const r = report as Record<string, unknown>;
      const meta = (r._meta = (r._meta && typeof r._meta === "object")
        ? r._meta as Record<string, unknown> : {});
      const internal = (meta.internal = (meta.internal && typeof meta.internal === "object")
        ? meta.internal as Record<string, unknown> : {});
      internal.lia_t6fix = { ...c };
    } catch { /* never block emission */ }
  } catch (e) {
    c.errors += 1;
    (c as unknown as Record<string, unknown>).crash_message = (e as Error)?.message ?? String(e);
  }
  return c;
}

export const _internals = {
  isTruncatedCitation, splitSentences, rejoin,
  flattenIntake, contentTokens, downgradeString, auditNode,
};
