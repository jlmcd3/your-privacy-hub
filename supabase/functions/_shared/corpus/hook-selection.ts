// DOC 224 / 224A — HOOK SELECTION: the two-leg AI pass, PURE HALF.
//
// Shared by the engine's planner (run-li-assessment hook-join.ts — decides
// which (field, hook) pairs need a model at all: doc 224A §8 D1/D2/D4) and
// the service that makes the calls (classify-propositions `select_hooks` —
// verifies each leg's output, merges the two legs, stores the decision).
//
// NO I/O, NO MODEL CLIENT, NO Deno GLOBALS: the doc 217 boundary walk
// (tests/edge/run-li-assessment/doc217-v3-boundary.test.ts) reaches this
// module from the assembler through hook-join.ts, so nothing here may name
// an endpoint or a key. The service imports it from `_shared/` (an edge
// function may import `_shared/`, never a sibling function directory).
//
// 212G §3, the contract this implements: "Selection (model, verified): one
// call per answer, shown the answer and the candidates' fact patterns,
// returning per hook fact_agreement ∈ {same, different, unknown} with a
// matched_atom drawn from that hook's ratified fact_atoms ∪
// distinguishing_atoms and an evidence span; two legs must agree; unknown is
// the default and the majority outcome. The model never emits the word
// 'supports'." Direction stays the ratified matrix (hook-types.ts).

export type SelectionAgreement = "same" | "different" | "unknown";

/** A settled selection for one hook — both legs agreed on `same` or
 *  `different` with a verified span and a matched atom. The join consumes
 *  it only where its own atom agreement is `unknown` (doc 224 §4.A.1). */
export interface HookSelection {
  readonly hook_id: string;
  readonly field_id: string;
  readonly agreement: "same" | "different";
  readonly matched_atom: string;
  readonly evidence_span: string;
  readonly decision_id: string;
  readonly source: "store" | "model";
}

/** hook_id → the settled selection the join may use. */
export type HookSelectionMap = ReadonlyMap<string, HookSelection>;

// ── D2 — canonical text (the input hash is over THIS, per leaf field) ──────

/** NFC-normalised, whitespace-collapsed, trimmed. A typo fix that changes
 *  no characters other than whitespace, or an edit to a sibling sub-field,
 *  never changes this string, so never re-runs a selection. */
export function canonicalAnswerText(text: unknown): string {
  return String(text ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

/** sha256 hex of the canonical text — `hook_selections.answer_hash` and the
 *  service's input hash use exactly this. Web Crypto only (no model, no
 *  I/O). */
export async function canonicalAnswerHash(text: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAnswerText(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── D4 — no call on an unanswered field ────────────────────────────────────
// Mirrors lia-intake-gate/_local/precheck.ts (copied, not imported — an edge
// function may not import a sibling function directory).

export const SELECTION_MIN_ANSWER_CHARS = 12;

const PLACEHOLDER_LEXICON: ReadonlySet<string> = new Set(["n/a", "na", "tbd", "see above", "as above", "none", "-", "."]);
const REPEATED_PUNCT = /^[\s\p{P}\p{S}]+$/u;

/** True when the answer is worth reading: not empty, not a placeholder, not
 *  under the minimum. A field that fails this is neither selected against
 *  nor flagged — the missing-field ask already covers it (D4). */
export function answerIsUsable(text: unknown): boolean {
  const t = canonicalAnswerText(text).toLowerCase();
  if (t.length < SELECTION_MIN_ANSWER_CHARS) return false;
  if (PLACEHOLDER_LEXICON.has(t) || PLACEHOLDER_LEXICON.has(t.replace(/[.\s]+$/g, ""))) return false;
  return !REPEATED_PUNCT.test(t);
}

// ── The request the legs see ───────────────────────────────────────────────

export interface SelectionCandidate {
  readonly hook_id: string;
  readonly hook_version: number | null;
  /** The authority's fact pattern in the drafter's own words (ratified). */
  readonly fact_pattern_paraphrase: string;
  readonly fact_atoms: readonly string[];
  readonly distinguishing_atoms: readonly string[];
}

/** One item = one free-text answer and every candidate hook judged against
 *  it. The service batches every item of a generation into ONE request per
 *  leg (doc 224 §3) and stores each item under its own key. */
export interface SelectionItem {
  readonly field_id: string;
  readonly question_text: string;
  /** Canonical (D2). */
  readonly answer: string;
  readonly candidates: readonly SelectionCandidate[];
}

/** Deterministic key over the candidate set — part of the decision id, so
 *  a newly ratified hook is a new question, never a silent re-read. */
export function selectionCandidateKey(candidates: readonly SelectionCandidate[]): string {
  return candidates
    .map((c) => `${c.hook_id}@${c.hook_version ?? 0}`)
    .sort()
    .join("|");
}

// ── Leg verification and the merge (code, before anything is stored) ───────

/** Byte-substring check over the UTF-8 encodings (Law L8). */
export function isByteSubstring(span: string, answer: string): boolean {
  const enc = new TextEncoder();
  const s = enc.encode(span);
  const a = enc.encode(answer);
  if (s.length === 0 || s.length > a.length) return false;
  outer: for (let i = 0; i + s.length <= a.length; i++) {
    for (let j = 0; j < s.length; j++) if (a[i + j] !== s[j]) continue outer;
    return true;
  }
  return false;
}

export interface SelectionLegReading {
  readonly hook_id: string;
  readonly fact_agreement: SelectionAgreement;
  readonly matched_atom: string | null;
  readonly evidence_span: string | null;
  readonly confidence: number;
}

/**
 * Verify one leg's raw output for one item. Unknown hook ids are dropped; a
 * `same`/`different` whose `matched_atom` is not one of THAT hook's ratified
 * atoms, or whose span is not a byte-substring of the answer, becomes
 * `unknown`. Every candidate gets exactly one reading (default `unknown`).
 */
export function verifySelectionLeg(raw: unknown, item: SelectionItem): Map<string, SelectionLegReading> {
  const byId = new Map(item.candidates.map((c) => [c.hook_id, c] as const));
  const out = new Map<string, SelectionLegReading>();
  const list = Array.isArray((raw as { readings?: unknown })?.readings)
    ? (raw as { readings: unknown[] }).readings
    : [];
  for (const it of list) {
    const o = (it ?? {}) as Record<string, unknown>;
    const hook_id = typeof o.hook_id === "string" ? o.hook_id : "";
    const cand = byId.get(hook_id);
    if (!cand || out.has(hook_id)) continue;
    const wanted = o.fact_agreement === "same" || o.fact_agreement === "different" ? o.fact_agreement : "unknown";
    const atom = typeof o.matched_atom === "string" && o.matched_atom.length > 0 ? o.matched_atom : null;
    const span = typeof o.evidence_span === "string" && o.evidence_span.length > 0 ? o.evidence_span : null;
    const atomOk = atom !== null && (cand.fact_atoms.includes(atom) || cand.distinguishing_atoms.includes(atom));
    const spanOk = span !== null && isByteSubstring(span, item.answer);
    const settled = wanted !== "unknown" && atomOk && spanOk;
    out.set(hook_id, {
      hook_id,
      fact_agreement: settled ? wanted : "unknown",
      matched_atom: settled ? atom : null,
      evidence_span: settled ? span : null,
      confidence: typeof o.confidence === "number" && Number.isFinite(o.confidence) ? o.confidence : 0,
    });
  }
  for (const c of item.candidates) {
    if (!out.has(c.hook_id)) {
      out.set(c.hook_id, { hook_id: c.hook_id, fact_agreement: "unknown", matched_atom: null, evidence_span: null, confidence: 0 });
    }
  }
  return out;
}

export interface MergedSelection {
  readonly hook_id: string;
  /** `same`/`different` only when BOTH legs said so; otherwise `unknown`. */
  readonly fact_agreement: SelectionAgreement;
  readonly matched_atom: string | null;
  readonly evidence_span: string | null;
  readonly confidence: number;
  /** Both legs returned the same agreement (including both `unknown`). */
  readonly legs_agree: boolean;
  /** The legs returned different settled agreements, or one settled and one
   *  unknown — the pair goes to the ROO (doc 224A §3.2). */
  readonly legs_disagreed: boolean;
}

/** Two legs must agree (212G §3). `unknown`+`unknown` is agreement on
 *  nothing — not a disagreement, and not a selection. */
export function mergeSelectionLegs(
  primary: Map<string, SelectionLegReading>,
  second: Map<string, SelectionLegReading>,
  item: SelectionItem,
): MergedSelection[] {
  return item.candidates.map((c) => {
    const a = primary.get(c.hook_id);
    const b = second.get(c.hook_id);
    const agreementA = a?.fact_agreement ?? "unknown";
    const agreementB = b?.fact_agreement ?? "unknown";
    const legs_agree = agreementA === agreementB;
    const settled = legs_agree && agreementA !== "unknown";
    const anySettled = agreementA !== "unknown" || agreementB !== "unknown";
    return {
      hook_id: c.hook_id,
      fact_agreement: settled ? agreementA : "unknown",
      matched_atom: settled ? (a!.matched_atom ?? b!.matched_atom) : null,
      evidence_span: settled ? (a!.evidence_span ?? b!.evidence_span) : null,
      confidence: settled ? Math.min(a!.confidence, b!.confidence) : 0,
      legs_agree,
      legs_disagreed: !legs_agree && anySettled,
    };
  });
}

/** The statuses a `hook_selections` row moves through (doc 224 §4.B.1;
 *  224A §3.4 "let it go"). */
export type HookSelectionStatus = "agreed" | "disagreed" | "unsettled_final" | "superseded";
