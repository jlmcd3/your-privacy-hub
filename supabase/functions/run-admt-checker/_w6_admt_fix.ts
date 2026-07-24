// W6-ADMT-FIX (2026-07-24) — atomic post-generation scrub for cppa-admt.
// Addresses wave-6 evidence-verified findings on campaign fd1be147:
//   1) Fallback overuse — resolve "the applicable ADMT-subchapter provision"
//      to a verified pinpoint when the surrounding sentence identifies a
//      known proposition (significant-decision def, human-involvement test,
//      classification duty, hiring exception).
//   1b) Garbled splice patterns like "full the applicable ADMT-subchapter
//       provision ADMT obligations attach" are rewritten to natural prose.
//   2) Depth cap — never emit § 7001 sub-pinpoints deeper than the
//      registry-verified depth (registry verifies § 7001(e), § 7001(e)(1),
//      § 7001(ddd) — NOT § 7001(ddd)(1)).
//   3) Body-text counsel referral leaks stripped everywhere except a
//      whitelisted counsel_close / advisory_close / disclaimer field.
//   4) "[INTERNAL WORKFLOW NOTE...]" and adjacent bracketed internal-note
//      blocks stripped exhaustively (belt-and-braces vs the prompt fence).
//   5) "(analyzed below)" cross-reference cues and "on this record" /
//      "on the record as supplied" deliberation hedges stripped in
//      scope_analysis narrative fields. Canonical "the record" phrasing
//      is preserved.
//   6a) Bare role assertions ("The CISO and HR Lead must jointly ...",
//       "The Privacy Program Manager must supply ...") are relaxed to the
//       designed "Suggested owner (confirm): <role>" form when the intake
//       does not name the role.
//   6b) Intake-silence-as-affirmative-fact framing ("The record explicitly
//       notes that X is not described") is rewritten to a silence framing
//       ("The record does not describe X").
//
// The block is idempotent, fail-open, and self-contained. It ships as a
// separate module so it can be unit-tested and reasoned about in isolation.

export const W6_ADMT_FIX_VERSION = "w6-admt-fix@2026-07-24";

// ── (2) Depth cap for § 7001 pinpoints ──────────────────────────────────
// Registry-verified § 7001 pinpoints are only: 7001(e), 7001(e)(1), 7001(ddd).
// Anything deeper (7001(ddd)(1), 7001(e)(1)(A), ...) is unverified depth and
// must be truncated to its verified parent. Non-7001 pinpoints are untouched.
const SEC_7001_RE = /(§\s*7001)((?:\([a-z0-9]+\))+)/gi;
export function capSec7001Depth(s: string): { out: string; capped: number } {
  let capped = 0;
  const out = s.replace(SEC_7001_RE, (_m, head: string, subs: string) => {
    // Extract subsection tokens like "(ddd)", "(e)", "(1)", "(A)".
    const toks = Array.from(subs.matchAll(/\(([a-z0-9]+)\)/gi)).map(m => m[1].toLowerCase());
    if (toks.length === 0) return `${head}${subs}`;
    const first = toks[0];
    let verified: string;
    if (first === "e") {
      // (e) verified; (e)(1) verified; deeper truncated to (e)(1) or (e).
      verified = toks.length >= 2 && toks[1] === "1" ? "(e)(1)" : "(e)";
    } else if (first === "ddd") {
      verified = "(ddd)";
    } else {
      // Unknown top subsection under 7001 — keep only the first token as the
      // safest floor; deeper depth is not registry-verified.
      verified = `(${first})`;
    }
    const rebuilt = `${head}${verified}`;
    if (rebuilt !== `${head}${subs}`) capped++;
    return rebuilt;
  });
  return { out, capped };
}

// ── (1) Propositional fallback resolution ────────────────────────────────
// Neutral fallback token emitted upstream when the resolver had no ID:
const FALLBACK = "the applicable ADMT-subchapter provision";
const FALLBACK_RE = /the applicable ADMT-subchapter provision/g;

// Ordered proposition tests — first match wins. Patterns look at the WHOLE
// containing sentence so they fire only when the model was clearly writing
// about the named proposition. Only registry-verified pinpoints are emitted.
const PROPOSITION_MAP: Array<{ probe: RegExp; pin: string; label: string }> = [
  // § 7221(b)(2) — hiring / admission opt-out exception. Test first because
  // it's the most specific and often co-occurs with generic "significant
  // decision" wording.
  { probe: /(hiring|admission)[^.]*\bexception\b|\bemployment exception\b|\b\(b\)\(2\)\b/i,
    pin: "§ 7221(b)(2)", label: "hiring_exception" },
  // § 7200(a) — classification / pre-use notice classification duty.
  { probe: /\bclassification duty\b|\bclassify (?:the )?(?:system|ADMT)\b|\bpre-?use notice classification\b/i,
    pin: "§ 7200(a)", label: "classification_duty" },
  // § 7001(e)(1) — human-involvement three-part test. Fired only when the
  // sentence names the human-involvement/human-review standard explicitly.
  { probe: /\bhuman[- ]involvement\b|\bthree[- ]part (?:human|involvement) test\b|\bmeaningful human review standard\b/i,
    pin: "§ 7001(e)(1)", label: "human_involvement_standard" },
  // § 7001(e) — ADMT definition itself.
  { probe: /\bADMT (?:is )?defined\b|\bdefinition of ADMT\b|\bwithin the meaning of\b[^.]*\bADMT\b/i,
    pin: "§ 7001(e)", label: "admt_definition" },
  // § 7001(ddd) — significant-decision definition. Depth-capped: never (ddd)(1).
  { probe: /\bsignificant[- ]decision (?:definition|element|meaning)\b|\bdefined as a significant decision\b|\bwithin the (?:§\s*7001\(ddd\)|meaning of significant decision)\b/i,
    pin: "§ 7001(ddd)", label: "significant_decision_definition" },
];

// Split a string into sentence-like spans (keep punctuation with the span).
function sentenceSplit(s: string): string[] {
  return s.split(/(?<=[.!?])\s+/);
}

export function resolvePropositionalFallback(
  s: string,
): { out: string; resolved: number; kept: number } {
  if (!s.includes(FALLBACK)) return { out: s, resolved: 0, kept: 0 };
  let resolved = 0;
  let kept = 0;
  const sentences = sentenceSplit(s);
  for (let i = 0; i < sentences.length; i++) {
    if (!sentences[i].includes(FALLBACK)) continue;
    let pinned: string | null = null;
    for (const { probe, pin } of PROPOSITION_MAP) {
      if (probe.test(sentences[i])) { pinned = pin; break; }
    }
    if (pinned) {
      sentences[i] = sentences[i].replace(FALLBACK_RE, pinned);
      resolved++;
    } else {
      kept++;
    }
  }
  return { out: sentences.join(" "), resolved, kept };
}

// ── (1b) Garbled splice repair ───────────────────────────────────────────
// Rewrites the specific class of splice artifacts reported in wave 6.
export function repairFallbackSplice(s: string): string {
  let next = s;
  // "full/entire/complete/all the applicable ADMT-subchapter provision
  //  ADMT obligations" → "full range of ADMT obligations"
  next = next.replace(
    /\b(the\s+)?(full|entire|complete|all)\s+the applicable ADMT-subchapter provision\s+ADMT\s+obligations\b/gi,
    "$1$2 range of ADMT obligations",
  );
  // "under the applicable ADMT-subchapter provision ADMT obligations" →
  //  "under the ADMT subchapter"
  next = next.replace(
    /\bunder\s+the applicable ADMT-subchapter provision\s+ADMT\s+obligations\b/gi,
    "under the ADMT subchapter",
  );
  // Adjacent-noun collision: "the applicable ADMT-subchapter provision ADMT" →
  //  "the ADMT subchapter" (drops the doubled "ADMT" head-noun).
  next = next.replace(
    /\bthe applicable ADMT-subchapter provision\s+ADMT\b/g,
    "the ADMT subchapter",
  );
  return next;
}

// ── (3) Body-text counsel referral strip (whitelisted fields) ────────────
const COUNSEL_WHITELIST = new Set([
  "counsel_close", "advisory_close", "disclaimer", "closing_disclaimer",
]);
const COUNSEL_PATTERNS: RegExp[] = [
  /\b(?:if\s+)?legal\s+counsel\s+advises[^.;]*[.;]?/gi,
  /\bconsult\s+(?:with\s+)?(?:your\s+)?(?:legal\s+)?counsel[^.;]*[.;]?/gi,
  /\bcoordinate\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.;]*[.;]?/gi,
  /\bwork\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.;]*[.;]?/gi,
  /\bconfirm\s+with\s+(?:your\s+)?(?:legal\s+)?counsel[^.;]*[.;]?/gi,
  /\bhave\s+(?:your\s+)?(?:legal\s+)?counsel\s+[^.;]*[.;]?/gi,
  /\b(?:once|when|if)\s+(?:legal\s+)?counsel\s+(?:advises|confirms|reviews|approves)[^.;]*[.;]?/gi,
];
export function stripCounselReferrals(s: string): string {
  let next = s;
  for (const re of COUNSEL_PATTERNS) next = next.replace(re, "");
  return next;
}

// ── (4) Bracketed internal-note block strip (belt-and-braces) ────────────
const INTERNAL_BLOCK_RE = /\[\s*(?:INTERNAL(?:\s+[A-Z][A-Z0-9 _/-]{0,40})?|SOP|PROCEDURE|WORKFLOW NOTE|ROUTING NOTE|REVIEWER|DRAFTER NOTE|LEGAL REVIEW|NOTE FOR LEGAL REVIEW|TODO|EDITOR NOTE|NOTE TO REVIEWER|FOR INTERNAL USE)\b[^\]]*?(?:\]|$)/gi;
export function stripInternalNoteBlocks(s: string): string {
  return s.replace(INTERNAL_BLOCK_RE, "");
}

// ── (5) Scope-analysis reasoning-leak strip ──────────────────────────────
// Only strips the deliberation cues; canonical "the record" phrasing kept.
const SCOPE_LEAK_PATTERNS: RegExp[] = [
  /\s*\((?:as\s+)?analyzed\s+(?:below|above)\)/gi,
  /\s*\((?:see\s+)?discussion\s+(?:below|above)\)/gi,
  /,?\s+on\s+this\s+record\b/gi,
  /,?\s+on\s+the\s+record\s+as\s+supplied\b/gi,
];
export function stripScopeReasoningLeaks(s: string): string {
  let next = s;
  for (const re of SCOPE_LEAK_PATTERNS) next = next.replace(re, "");
  return next.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

// ── (6a) Bare role assertion softening ───────────────────────────────────
// When the intake does not name a role, rewrite "The <ROLE> must ..." →
// "Suggested owner (confirm): <ROLE> — must ..." (matches POST-C1-FIX-2(1)).
const KNOWN_ROLES = [
  "CISO", "CIO", "CTO", "CPO", "DPO", "HR Lead", "HR Manager",
  "Privacy Program Manager", "Privacy Manager", "Privacy Officer",
  "Compliance Officer", "Compliance Lead", "Security Lead", "Security Officer",
  "General Counsel", "Data Protection Officer",
];
function rolesInIntake(intake: unknown): Set<string> {
  const hits = new Set<string>();
  try {
    const blob = typeof intake === "string" ? intake : JSON.stringify(intake ?? "");
    for (const r of KNOWN_ROLES) {
      const re = new RegExp(`\\b${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(blob)) hits.add(r);
    }
  } catch { /* fail-open */ }
  return hits;
}
export function softenBareRoleAssertions(
  s: string,
  intakeRoles: Set<string>,
): { out: string; softened: number } {
  let softened = 0;
  // Matches "The <ROLE>[ and <ROLE>] (must|shall|will) <verb-phrase>"
  const ROLE_UNION = KNOWN_ROLES
    .map(r => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const RE = new RegExp(
    `\\bThe\\s+(${ROLE_UNION})(?:\\s+and\\s+(?:the\\s+)?(${ROLE_UNION}))?\\s+(?:must|shall|will|is\\s+required\\s+to|are\\s+required\\s+to)\\s+`,
    "g",
  );
  const out = s.replace(RE, (m, r1: string, r2: string | undefined) => {
    const roles = [r1, r2].filter(Boolean) as string[];
    // Skip softening if EVERY named role appears in the intake.
    if (roles.every(r => intakeRoles.has(r))) return m;
    softened++;
    const joined = roles.join(" / ");
    return `Suggested owner (confirm): ${joined} — `;
  });
  return { out, softened };
}

// ── (6b) Intake-silence-as-affirmative-fact rewrite ──────────────────────
export function rewriteSilenceAsFact(s: string): string {
  let next = s;
  // "The record explicitly notes that X is not described/provided/named" →
  //   "The record does not describe/provide/name X"
  next = next.replace(
    /\bThe\s+record\s+explicitly\s+notes\s+that\s+([^.]*?)\s+is\s+not\s+(described|provided|named|specified|disclosed)\b/gi,
    (_m, subj: string, verb: string) => `The record does not ${verb} ${subj.trim()}`,
  );
  // "the record explicitly notes the absence of X" → "the record does not identify X"
  next = next.replace(
    /\bthe\s+record\s+explicitly\s+notes\s+the\s+absence\s+of\s+/gi,
    "the record does not identify ",
  );
  return next;
}

// ── Orchestrator ─────────────────────────────────────────────────────────
export interface W6FixDiag {
  fallback_resolved: number;
  fallback_kept: number;
  splices_repaired: number;
  depth_capped_7001: number;
  counsel_stripped_fields: number;
  internal_blocks_stripped_fields: number;
  scope_leaks_stripped_fields: number;
  roles_softened: number;
  silence_rewrites: number;
}

const SCOPE_KEYS = new Set([
  "scope_analysis",
]);

export function applyW6AdmtFix(report: any, intake: unknown): W6FixDiag {
  const diag: W6FixDiag = {
    fallback_resolved: 0,
    fallback_kept: 0,
    splices_repaired: 0,
    depth_capped_7001: 0,
    counsel_stripped_fields: 0,
    internal_blocks_stripped_fields: 0,
    scope_leaks_stripped_fields: 0,
    roles_softened: 0,
    silence_rewrites: 0,
  };
  if (!report || typeof report !== "object") return diag;
  const intakeRoles = rolesInIntake(intake);

  const visit = (node: any, keyPath: string[]) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") node[i] = transform(v, keyPath);
        else if (v && typeof v === "object") visit(v, keyPath);
      }
      return;
    }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      if (typeof v === "string") (node as any)[k] = transform(v, [...keyPath, k]);
      else if (v && typeof v === "object") visit(v, [...keyPath, k]);
    }
  };

  const transform = (v: string, keyPath: string[]): string => {
    const fieldKey = keyPath[keyPath.length - 1] ?? "";
    const inScopeAnalysis = keyPath.some(k => SCOPE_KEYS.has(k));
    const isCounselWhitelisted = COUNSEL_WHITELIST.has(fieldKey);

    let next = v;

    // (1b) Splice repair BEFORE propositional resolution.
    const beforeSplice = next;
    next = repairFallbackSplice(next);
    if (next !== beforeSplice) diag.splices_repaired++;

    // (1) Propositional resolution of the neutral fallback.
    const r1 = resolvePropositionalFallback(next);
    diag.fallback_resolved += r1.resolved;
    diag.fallback_kept += r1.kept;
    next = r1.out;

    // (2) Depth cap on § 7001 pinpoints.
    const r2 = capSec7001Depth(next);
    diag.depth_capped_7001 += r2.capped;
    next = r2.out;

    // (3) Body-text counsel referrals — everywhere EXCEPT whitelisted field.
    if (!isCounselWhitelisted) {
      const beforeCounsel = next;
      next = stripCounselReferrals(next);
      if (next !== beforeCounsel) diag.counsel_stripped_fields++;
    }

    // (4) Bracketed internal-note block strip.
    const beforeIntl = next;
    next = stripInternalNoteBlocks(next);
    if (next !== beforeIntl) diag.internal_blocks_stripped_fields++;

    // (5) Scope-analysis reasoning-leak strip.
    if (inScopeAnalysis) {
      const beforeScope = next;
      next = stripScopeReasoningLeaks(next);
      if (next !== beforeScope) diag.scope_leaks_stripped_fields++;
    }

    // (6a) Bare role assertion softening.
    const r6 = softenBareRoleAssertions(next, intakeRoles);
    diag.roles_softened += r6.softened;
    next = r6.out;

    // (6b) Silence-as-affirmative-fact rewrite.
    const beforeSil = next;
    next = rewriteSilenceAsFact(next);
    if (next !== beforeSil) diag.silence_rewrites++;

    // Post-scrub whitespace normalisation.
    next = next.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
    return next;
  };

  visit(report, []);
  return diag;
}
