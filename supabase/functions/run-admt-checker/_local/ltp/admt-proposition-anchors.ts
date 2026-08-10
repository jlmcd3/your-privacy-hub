/**
 * ITEM 422-C DEFECT 1 — CONTENT-ANCHORED PROPOSITION ASSIGNMENT.
 *
 * The item422-B resolver faithfully resolves whatever `proposition_key` the
 * model assigned. The a2c66373 pilot proved the consequence: ranks 3 and 6
 * carried `access_logic` → a VERIFIED pinpoint (11 CCR § 7222(b)(2), logic
 * disclosure) on actions whose content was SECURE TRANSMISSION (§ 7222(g))
 * and DENIAL BASIS (§ 7222(f)). A wrong ASSIGNMENT ships a verified-but-wrong
 * pinpoint — the worst failure shape, because every downstream verifier
 * agrees with it.
 *
 * DECLARED-ANCHORAGE DISCIPLINE (the only inference permitted here):
 *   A proposition's anchor vocabulary is DECLARED BY THE REGISTRY ITSELF and
 *   nowhere else. Two declared sources, both registry-owned:
 *     1. `CITATION_REGISTRY[id].label` — the registry's own statement of the
 *        element the section governs ("reasonable security measures when
 *        transmitting response", "denial for legal conflict …").
 *     2. `ADMT_VERIFIED_AUTHORITIES[key].verbatim_quote` — corpus-verbatim
 *        regulation text for the same proposition.
 *   Anchor terms are the content tokens of those two declared strings, minus
 *   a fixed stoplist. NO synonym expansion, NO embedding, NO free word-overlap
 *   inference beyond the declared anchors.
 *
 * MISMATCH RULE (deliberately conservative — two conditions, both required):
 *   (a) NONE of the assigned proposition's declared anchor terms appear in the
 *       action's own content, AND
 *   (b) at least one DISTINCTIVE declared anchor term of a DIFFERENT
 *       proposition does appear. "Distinctive" = the term is declared by
 *       exactly one proposition across the whole registry.
 *   Only then is the assignment rejected. A right assignment — or an action
 *   whose content is simply too thin to adjudicate — passes untouched.
 *
 * On rejection the caller takes the HONEST DOWNGRADE (neutral ADMT-subchapter
 * anchor, `proposition_key` cleared, provenance recorded) rather than shipping
 * a confident wrong pinpoint. Re-keying is NOT attempted: the correct
 * propositions here (`access_secure_tx`, `access_denial`) have no
 * corpus-verified row in ADMT_VERIFIED_AUTHORITIES, and inventing one would
 * be the very defect this item closes.
 *
 * Deterministic. No I/O, no clock, no model. Fail-open.
 */

import { ADMT_VERIFIED_AUTHORITIES } from "../registry/admt-verified-authorities.ts";
import { CITATION_REGISTRY } from "../../../_shared/admt-citation-registry.ts";

export const ADMT_PROPOSITION_ANCHOR_VERSION =
  "admt-proposition-anchors@so-ft1-2026-08-10";

/** Function words and legal boilerplate that carry no anchoring content. */
const STOPLIST = new Set<string>([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "by",
  "that", "which", "this", "these", "those", "as", "at", "from", "is", "are",
  "be", "been", "being", "was", "were", "it", "its", "their", "them", "they",
  "any", "all", "each", "such", "may", "must", "shall", "should", "will",
  "not", "no", "if", "when", "than", "then", "so", "other", "others",
  "business", "businesses", "consumer", "consumers", "personal", "information",
  "means", "including", "include", "includes", "included", "under", "section",
  "ccr", "cal", "code", "civ", "art", "article", "subsection", "regulation",
  "regulations", "shall", "make", "made", "using", "use", "used", "uses",
  "technology", "admt", "automated", "decisionmaking", "decision", "decisions",
  "request", "requests", "requirement", "requirements", "provide", "provided",
  "response", "respond", "responses", "right", "rights", "part", "parts",
  "one", "two", "three", "well", "also", "who", "whose", "how", "what",
]);

function tokens(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= 4 && !STOPLIST.has(t));
}

/** proposition_key → the set of terms the registry declares for it. */
export type AnchorVocabulary = Record<string, Set<string>>;

function buildVocabulary(): AnchorVocabulary {
  const vocab: AnchorVocabulary = {};
  const add = (key: string, text: string) => {
    if (!key || !text) return;
    (vocab[key] ??= new Set<string>());
    for (const t of tokens(text)) vocab[key].add(t);
  };
  try {
    for (const [key, row] of Object.entries(
      CITATION_REGISTRY as Record<string, { label?: string; snippet?: string }>,
    )) {
      add(key, String(row?.label ?? ""));
      // SO-FT-1: the registry's own `snippet` is a THIRD declared, registry-owned
      // anchor source. It carries the distinctive short form of the element
      // ("secure transmission", "denial basis", "aggregate >4x") that the label's
      // formal phrasing ("reasonable security measures when transmitting
      // response") does not surface. No synonym expansion is introduced — the
      // terms are still declared by the registry and nowhere else.
      add(key, String(row?.snippet ?? ""));
    }
  } catch { /* fail-open */ }
  try {
    for (const [key, row] of Object.entries(
      ADMT_VERIFIED_AUTHORITIES as Record<string, { verbatim_quote?: string }>,
    )) {
      add(key, String(row?.verbatim_quote ?? ""));
    }
  } catch { /* fail-open */ }
  return vocab;
}

/** Declared anchor vocabulary, built once from the two registry sources. */
export const ADMT_ANCHOR_VOCABULARY: AnchorVocabulary = buildVocabulary();

/** term → the single proposition that declares it (distinctive terms only). */
function buildDistinctive(vocab: AnchorVocabulary): Map<string, string> {
  const counts = new Map<string, string[]>();
  for (const [key, set] of Object.entries(vocab)) {
    for (const t of set) {
      const arr = counts.get(t) ?? [];
      arr.push(key);
      counts.set(t, arr);
    }
  }
  const out = new Map<string, string>();
  for (const [t, keys] of counts) if (keys.length === 1) out.set(t, keys[0]);
  return out;
}

export const ADMT_DISTINCTIVE_ANCHORS: Map<string, string> = buildDistinctive(
  ADMT_ANCHOR_VOCABULARY,
);

/** Content fields of a typed action record that carry the action's substance. */
const CONTENT_FIELDS = [
  "action", "finding", "gap_description", "remediation", "rationale",
  "requirement", "element", "detail", "description", "text", "title",
  "topic", "note", "notes",
];

export function actionContentText(entry: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const f of CONTENT_FIELDS) {
    const v = entry[f];
    if (typeof v === "string" && v.trim()) parts.push(v);
  }
  return parts.join(" ");
}

export interface AnchorValidation {
  /** "ok" — assignment stands. "mismatch" — take the honest downgrade. */
  verdict: "ok" | "mismatch" | "unknown_key" | "no_content";
  /** the distinctive anchor that contradicted the assignment, if any. */
  contradicted_by?: string;
  /** the proposition that declares `contradicted_by`. */
  contradicting_key?: string;
  /** count of the assigned proposition's declared anchors found in content. */
  assigned_support?: number;
  /** count of DISTINCTIVE anchors of `contradicting_key` found in content. */
  contradicting_support?: number;
}

/**
 * Validate ONE action's assigned proposition against the registry's declared
 * anchor vocabulary. Never re-keys; only accepts or rejects.
 */
export function validatePropositionAssignment(
  entry: Record<string, unknown>,
  propositionKey: string,
): AnchorValidation {
  try {
    const key = String(propositionKey || "").trim();
    if (!key) return { verdict: "no_content" };
    const declared = ADMT_ANCHOR_VOCABULARY[key];
    if (!declared || declared.size === 0) return { verdict: "unknown_key" };

    const content = actionContentText(entry);
    const contentTokens = new Set(tokens(content));
    if (contentTokens.size === 0) return { verdict: "no_content" };

    // (a) SUPPORT — how many of the assigned proposition's declared anchors
    //     appear in the action's content.
    let support = 0;
    for (const t of declared) if (contentTokens.has(t)) support++;

    // (b) CONTRADICTION — the strongest competing proposition, counted over
    //     DISTINCTIVE declared anchors only (a term declared by exactly one
    //     proposition across the registry).
    const rival = new Map<string, number>();
    let topKey = "";
    let topTerm = "";
    let topCount = 0;
    for (const t of contentTokens) {
      const owner = ADMT_DISTINCTIVE_ANCHORS.get(t);
      if (!owner || owner === key) continue;
      const n = (rival.get(owner) ?? 0) + 1;
      rival.set(owner, n);
      if (n > topCount) { topCount = n; topKey = owner; topTerm = t; }
    }

    // The assignment is rejected ONLY when a competing proposition is
    // anchored more strongly than the assigned one. Ties and thin content
    // leave the assignment untouched.
    if (topCount > support) {
      return {
        verdict: "mismatch",
        contradicted_by: topTerm,
        contradicting_key: topKey,
        assigned_support: support,
        contradicting_support: topCount,
      };
    }
    if (support > 0) return { verdict: "ok", assigned_support: support };

    // Neither supported nor contradicted — not adjudicable, leave untouched.
    return { verdict: "no_content" };
  } catch {
    return { verdict: "no_content" }; // fail-open: never downgrade on a crash
  }
}

/**
 * SO-FT-1 — RE-KEY ON UNAMBIGUOUS DISTINCTIVE SUPPORT.
 *
 * The item422-C header states re-keying was withheld because the correct
 * propositions (`access_secure_tx`, `access_denial`, `access_aggregate`,
 * `optout_cease15`, …) had NO corpus-verified row. That coverage gap is now
 * closed in ADMT_VERIFIED_AUTHORITIES, so a contradicted assignment can be
 * moved to the RIGHT verified pinpoint instead of dropped to the neutral
 * fallback — but only when the rival's support is unambiguous.
 *
 * Conditions (all required):
 *   - the validation verdict is "mismatch";
 *   - the contradicting proposition has a corpus-verified row;
 *   - that row is duty-imposing (NOT a § 7001 definitional anchor);
 *   - the rival's distinctive support is at least 2 AND exceeds the assigned
 *     proposition's support by at least 2. A single distinctive token is a
 *     coincidence, not an identification: one shared word ("qualifications",
 *     "period") is enough to out-count a zero-support assignment while saying
 *     nothing about which duty the action actually states. Below that bar the
 *     honest downgrade stands.
 * Otherwise: null, and the caller keeps the honest downgrade.
 */
export function rekeyPropositionAssignment(
  v: AnchorValidation,
): { proposition_key: string; subsection: string } | null {
  try {
    if (v.verdict !== "mismatch") return null;
    const key = String(v.contradicting_key || "").trim();
    if (!key) return null;
    const rivalSupport = Number(v.contradicting_support ?? 0);
    const assigned = Number(v.assigned_support ?? 0);
    if (rivalSupport < 2 || rivalSupport - assigned < 2) return null;

    const row = (ADMT_VERIFIED_AUTHORITIES as Record<string, {
      subsection?: string;
      citation?: string;
      proposition_key?: string;
    }>)[key];
    if (!row || typeof row.subsection !== "string" || !row.subsection.trim()) return null;
    // Definitional § 7001 rows are never promoted onto a duty-bearing action.
    if (/^11\s*CCR\s*\u00a7\s*7001\b/.test(String(row.citation ?? ""))) return null;
    return { proposition_key: key, subsection: row.subsection };
  } catch {
    return null; // fail-open — caller falls back to the honest downgrade
  }
}
