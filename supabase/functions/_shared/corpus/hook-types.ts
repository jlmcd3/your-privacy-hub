// DOC 213 TRACK H2 — OFFLINE ANALOGY HOOKS: the ratified-hook type and the
// direction matrix (§0, §4). A hook is the machine-readable pairing of an
// authority's material facts with a customer record's own typed facts, so
// that RENDERING code — never a model — can say whether the record's facts
// are the same as, or distinguished from, the authority's, and print one of
// the ratified sentence shapes (or nothing). A hook never changes a
// verdict; it only decides what PROSE cites an already-computed verdict
// sits beside (§2's "generate" note: "a hook is persuasive rendering, not a
// verdict").
//
// DOC 222 (hooks contract v2, 2026-09-08) + DOC 224 (two-leg selection):
//   - `conditional` posture has its OWN matrix rows (S5a / S5b / S6 / S6x)
//     — the doc 218 D1 defect was folding it into `rejected`;
//   - R4 renders the boundary shape (S4) on SAME facts only;
//   - `unknown` agreement is no longer a silent omit: the join consults a
//     stored two-leg selection where one exists (hook-join.ts), and the
//     three outcomes it can reach are named flags, never prose;
//   - the v2 fields (source status, pinpoint, material facts, distinguishing
//     pairs, the proposition split) are OPTIONAL on the runtime type so a
//     v1 fixture still type-checks; the join renders S3/S6/S6x ONLY from a
//     distinguishing pair (doc 222 §2.4).
//
// That is also why the atom grammar this module's callers evaluate against
// (hook-join.ts) is a narrower, INDEPENDENTLY-DEFINED subset of
// rule-types.ts's grammar, not an import of it: a hook's `fact_atoms` /
// `distinguishing_atoms` / `required_atoms` (§0) are drawn from `flag:`,
// `class:`, `relationship:`, `data_category:`, `instrument:` and `state:`
// only — never `verdict:` (the engine's verdict on the hook's own factor
// arrives at `directionFor` as an explicit parameter, never through an
// atom). Keeping hooks off rule-types.ts/rule-interpreter.ts's import door
// (tests/edge/corpus/corpus-relevance-rule-boundary.test.ts) means a hook
// can never reach `applyRules` — it cannot change a determination even by
// accident, which is the whole point of a hook being "persuasive, not a
// verdict."
//
// IMPORT BOUNDARY (mirrors rule-types.ts's own): this module may be
// imported ONLY by a product's hook-join pass (LIA's is
// `lia-deliverables/hook-join.ts`), a product's persuasive-authority
// renderer consuming a hook-join result under its own `_HOOKS_ENABLED` flag
// (LIA's is `lia-persuasive-authority.ts`), or a test. A generic product
// module — an index.ts, an unrelated prose assembler, anything else —
// reaches a hook's rendered sentence only through one of those doors.

export type HookShape = "S1" | "S2" | "S3" | "S4" | "S5a" | "S5b" | "S6" | "S6x";

/** R1-R3 mirror rule-types.ts's `Settledness`; R4 ("under appeal /
 *  contested") exists only in the hook vocabulary — a rule can never fire
 *  on unsettled law, but a hook may still be rendered noting the boundary
 *  (S4). Declared locally (not imported) for the same self-containment
 *  reason documented above. */
export type HookSettledness = "R1" | "R2" | "R3" | "R4";

/** The authority's own posture on its facts — copied from the source
 *  profile's `outcome_posture` (cam-types.ts `CamRelevanceProfile`) at
 *  curation time. Duplicated as a literal union here rather than imported:
 *  this module's only coupling to the rest of the corpus machinery is the
 *  shape it declares, never an import of it. */
export type HookPosture = "accepted" | "conditional" | "rejected" | "contested";

/** How the record's own typed facts relate to the hook's `fact_atoms` /
 *  `distinguishing_atoms` — computed by the hook-join pass (§4), never
 *  authored on the hook itself. */
export type FactAgreement = "same" | "different" | "unknown";

/** DOC 222 §2.7 — the printed status is DERIVED from the source row at
 *  generate time, never drafted. `settledness` stays the ranking key. */
export type HookSourceStatus =
  | "edpb_guidelines_final"
  | "edpb_opinion"
  | "wp29_opinion"
  | "regulator_guidance"
  | "sa_decision"
  | "sa_decision_affirmed"
  | "sa_decision_appeal_pending";

/** The verb a shape uses for the authority — decisions "found", guidance
 *  "states", a WP29 opinion "advised" (doc 222 §2.7). */
export type HookVerb = "found" | "states" | "advised";

export interface HookPinpoint {
  readonly kind: "paragraph" | "section" | "page" | "recital" | "heading";
  readonly ref: string;
  /** Verbatim anchor in the source text (checked at settle, doc 222 §2.5). */
  readonly anchor_span: string;
}

export interface HookMaterialFact {
  readonly atom: string;
  readonly materiality_reason: string;
  readonly source_span: string | null;
}

/** DOC 222 §2.4 — a hook-specific, polarity-aware source/record fact pair.
 *  S3 and S6/S6x render ONLY from one of these (never from an atom's
 *  generic phrase — the doc 218 D2 self-contradiction). */
export interface HookDistinguishingPair {
  /** The source's own fact, verbatim (what the finding turned on). */
  readonly source_fact_span: string;
  readonly source_polarity: "present" | "absent";
  /** The record atom whose PRESENCE (or absence) distinguishes. */
  readonly record_atom: string;
  readonly record_polarity: "present" | "absent";
  readonly why_material: string;
  /** Only this unlocks "does not extend" language (S6x). */
  readonly source_expressly_excludes: boolean;
  readonly exclusion_span?: string | null;
  /** Clause form; printed in S6x as `{exclusion_paraphrase}`. */
  readonly exclusion_paraphrase?: string | null;
}

/**
 * A ratified hook (§0). Every field is either a closed-list atom, a
 * ratified paraphrase, or a citation fact — never a raw quote and never
 * customer prose. `public.authority_hooks` (§1) carries additional
 * provenance/ratification columns not needed at render time; this is the
 * flattened runtime projection `generate-corpus-hooks`'s `generate` action
 * emits into a product's `corpus/maps/<product>-hooks.ts`.
 */
export interface AuthorityHook {
  readonly hook_id: string;
  readonly profile_id: string;
  readonly source_row_id: string;
  readonly fact_atoms: readonly string[];
  readonly distinguishing_atoms: readonly string[];
  readonly not_distinguishable: boolean;
  readonly required_atoms: readonly string[];
  readonly finding_span: string;
  readonly fact_pattern_paraphrase: string;
  readonly finding_paraphrase: string;
  readonly settledness: HookSettledness;
  readonly posture: HookPosture;
  /** The CAM factor label (e.g. LIA_FACTOR_VOCABULARY's "Balancing of
   *  interests, rights and freedoms") — feeds the rendered `{factor}` slot. */
  readonly factor_id: string;
  /** The three-part-test element the hook's factor maps to (LIA:
   *  "purpose" | "necessity" | "balancing") — feeds the rendered
   *  `{section}` slot and the engine-verdict lookup. */
  readonly bears_on_element: string;
  readonly authority_label: string;
  readonly regulator: string;
  /** DOC 213B — the source profile's relevance fields, copied verbatim by
   *  `generate-corpus-hooks` at generate time so a hook is a self-contained
   *  persuasive candidate: `lia-persuasive-authority.ts` builds a
   *  `CamRelevanceProfile` (cam-types.ts) straight off this block for a
   *  synthetic ranking candidate, without resolving anything through
   *  `liaProfileOf`/the CAM map (a hook's source need not even be a CAM
   *  row — doc 213 §3's own note: "hooks are keyed to profiles so the 215
   *  non-CAM profiles are ready the day precedents render from profiles
   *  directly"). `outcome_posture` here is expected to always equal
   *  `posture` above (copied from the same profile field); it is kept as
   *  its own string rather than reused so this block is a complete,
   *  independent `CamRelevanceProfile` projection on its own. */
  readonly relevance: AuthorityHookRelevance;

  // ── DOC 222 — the v2 contract (optional on the runtime type; the
  // generator emits them from the v2 columns; a v1 hook renders without
  // them where a shape permits, and never reaches S3/S6/S6x) ──────────────
  /** Short label used inline (e.g. "EDPB Guidelines 06/2020"); the full
   *  `authority_label` + pinpoint is the trailing citation. */
  readonly authority_label_short?: string;
  readonly hook_version?: number;
  readonly source_status?: HookSourceStatus;
  /** The printed status label (derived, doc 222 §2.7). */
  readonly status_label?: string;
  readonly verb?: HookVerb;
  readonly appeal_note?: string | null;
  readonly verified_as_of?: string | null;
  readonly pinpoint?: HookPinpoint | null;
  /** `conditional` sources only (doc 222 §2.1). */
  readonly recognised_proposition?: string | null;
  readonly condition_text?: string | null;
  /** Record atoms that, if ALL held, satisfy the condition; null when the
   *  condition is a verdict, not a fact (then S5b is unreachable). */
  readonly condition_atoms?: readonly string[] | null;
  readonly material_facts?: readonly HookMaterialFact[];
  readonly distinguishing_pairs?: readonly HookDistinguishingPair[];

  // ── DOC 238 — PROPOSED shape-amendment plumbing (2026-09-09). Both fields
  // are OPTIONAL and additive: a hook that omits them renders exactly as it
  // does today, through the existing ratified/draft shapes. They exist so a
  // PROPOSED paragraph-form shape (doc 238) has somewhere to read from; no
  // shape shipped today references either slot name.
  /**
   * A ratified, curated sentence stating what the governing law/regulation
   * itself requires, BEFORE the cited authority is introduced (doc 237 §5
   * item 3 — "California's rule requires X (§ Y)…" / the CA-first
   * restructuring doc 234's editorial pass did by hand for candidates 1–4).
   * Used only by S1–S4 in the doc 238 proposal: S5a/S5b/S6/S6x already carry
   * an equivalent rule statement in `recognised_proposition`/`condition_text`.
   * NO drafting or verification pipeline writes this field yet (no DB
   * column, no drafter prompt, no `verify.ts` check) — it is curated content
   * exactly like `recognised_proposition`, and doc 238 flags it as a
   * `[NEEDS]` before any real hook can carry it.
   */
  readonly governing_provision_sentence?: string | null;
  /**
   * CLASSIFICATION ONLY — never selects rendered text (revised 2026-09-09,
   * the doc 238 follow-up). `domestic_facts`: the cited authority applies
   * the SAME governing law as this product's own report (an EU/UK guidance
   * or decision cited in LIA/DPIA, or a CPPA FSOR passage cited in
   * Risk/ADMT). `foreign_analogy`: the cited authority applies a DIFFERENT
   * law than this product's governing law (a GDPR enforcement decision cited
   * in Risk/ADMT, which is CCPA/CPPA-regulation law). Doc 238's first cut
   * had each product's `hedgeSuffix()` map this field to one generic
   * per-product constant; no CEO-approved paragraph in docs 223B/233/234/236
   * uses a generic hedge (every approved hedge is hand-tailored to its
   * hook), so that mapping was removed and the join now reads
   * `hedge_sentence` below instead. Kept as an inert annotation a future
   * `verify.ts` check may read (e.g. "a foreign_analogy hook's hedge must
   * say the decision is cited by analogy"). `null`/absent on every hook
   * shipped today.
   */
  readonly hedge_variant?: "domestic_facts" | "foreign_analogy" | null;
  /**
   * The hook's OWN CEO-approved hedge passage, VERBATIM, which each
   * product's `hedgeSuffix()` (hook-join.ts) appends after the appeal
   * suffix when present (doc 237 §5 item 4). Every approved hedge in docs
   * 223B/233/234/236 names that specific hook's own facts — e.g. `0af0876d`
   * (doc 223B): "But the outcome depends on this company's own facts: its
   * purposes, the data involved, its safeguards, the effects on people, and
   * what those people could reasonably expect." — so the hedge is DATA on
   * the hook, never a shared constant. May carry more than one sentence
   * where the approved passage does (doc 234 Candidate 1's two-sentence
   * "only persuasive here … depends on this company's own facts" hedge).
   * `null`/absent: no hedge appended — every hook shipped today. NO
   * drafting or verification pipeline writes this field (no DB column, no
   * drafter prompt, no `verify.ts` check); it is curated, CEO-approved
   * content exactly like `governing_provision_sentence`, and must only ever
   * be populated from a sentence the CEO has already ratified by hand.
   */
  readonly hedge_sentence?: string | null;
  /**
   * DOC 238 §5.5.2 FOLLOW-UP (2026-09-09) — whether the trailing citation
   * parenthetical carries the "; {status}" clause. Every shape prints
   * "({citation}; {status}.)" unconditionally, but doc 236's CEO-approved
   * ADMT FSOR citations print NO status clause at all ("(California Privacy
   * Protection Agency, Final Statement of Reasons, …, 11 CCR § 7220(c)(1).)")
   * while doc 234's Risk FSOR convention keeps it. The generator derives this
   * per product × source table (generate.ts `HOOK_PRODUCT_CITATION_CONVENTIONS`)
   * and each product's join reads it: `false` blanks the `{status}` slot in
   * the citation trailer and `tidyRenderedSentence` (hook-render-tidy.ts)
   * collapses the "; " the template left behind. S4 places `{status}`
   * mid-sentence ("That decision is {status}; …") and always keeps it.
   * `undefined`/`null`/`true`: the clause prints, exactly as before this field
   * existed — every hook shipped today.
   */
  readonly status_in_citation?: boolean | null;
  /**
   * DOC 223B RATIFICATION FOLLOW-UP (2026-09-09) — the hook's OWN
   * CEO-ratified sentence, VERBATIM, printed exactly as written INSTEAD OF
   * any shape/slot substitution when present. Exists because a ratified
   * sentence is hand-written prose, not a template fill: doc 223B's own
   * "Implementation note" for each of its four approved hooks says outright
   * that the approved paragraph does not fit its shape as a slot
   * substitution (different sentence breaks, no quoted clause on some,
   * hand-tailored asides) — forcing it through a template would produce
   * something structurally similar, not the CEO's actual ratified words.
   * `renderSentence` (every product's hook-join.ts) checks this FIRST and,
   * when set, returns it plus `appealSuffix` only — shape, slots, `{quote}`,
   * `{hedge}`, `{governing_provision}`, `{status}` are all bypassed entirely
   * for that hook. `undefined`/`null`: renders through the shape exactly as
   * before this field existed — every hook shipped before this ratification
   * round. CEO's own words, this session: "the 'simplified' prose was - and
   * is - CEO ratified" — this field is how that exact, already-ratified text
   * reaches the live report unchanged by a template that was never built to
   * reproduce hand-written prose.
   */
  readonly literal_sentence_override?: string | null;
}

/** The `CamRelevanceProfile` (cam-types.ts) fields a hook carries, in the
 *  hook's own product-agnostic vocabulary (plain strings, not the LIA-typed
 *  unions `CamRelevanceProfile` itself declares — the same generalisation
 *  `AuthorityRelevanceProfile`, doc 191, already makes for this exact
 *  reason). Declared as its own named type so a product's persuasive-
 *  authority renderer can narrow/validate it once, in one place. */
export interface AuthorityHookRelevance {
  readonly instrument: string;
  readonly factor_ids: readonly string[];
  readonly use_case_class: string | null;
  readonly relationship: string | null;
  readonly data_categories: readonly string[];
  readonly flags: readonly string[];
  readonly outcome_posture: string;
}

/** One hook that actually rendered. A dropped or omitted hook never reaches
 *  this shape — it surfaces only as a `{hook_id, reason}` flag from
 *  hook-join.ts's `applyLiaHooks`. */
export interface HookApplication {
  readonly hook_id: string;
  readonly profile_id: string;
  readonly source_row_id: string;
  readonly fact_agreement: FactAgreement;
  readonly shape: HookShape;
  readonly sentence: string;
  readonly label: string;
  /** DOC 224 — set when the agreement came from a stored two-leg selection
   *  rather than the atoms alone. */
  readonly selection_field_id?: string;
}

export interface HookDirectionShape {
  readonly shape: HookShape;
}

/** The omit reasons a direction can name. `rule_missing` is the lawyer's
 *  rule (§4): an adverse authority on the same facts under a passing
 *  verdict means a rule is missing, never a risk noted.
 *  `authority_not_dispositive` (doc 222 §3): a conditional source that does
 *  not reach the record's facts under a pass — nothing is missing, the
 *  source is silent. Every other omit row is silent (no reason). */
export type HookOmitReason = "rule_missing" | "authority_not_dispositive";

export interface HookDirectionOmit {
  readonly omit: true;
  readonly reason?: HookOmitReason;
}

export type HookDirection = HookDirectionShape | HookDirectionOmit;

/** The two verdict values every element scale (purpose/necessity/balancing)
 *  treats as "passing" (mirrors lia-persuasive-authority.ts's own private
 *  set of the same name and values — duplicated, not imported, for the
 *  same self-containment reason as the rest of this module). */
const PASSING_VERDICTS: ReadonlySet<string> = new Set(["passes", "likely_passes"]);

export function isPassingVerdict(verdict: string | null): boolean {
  return verdict !== null && PASSING_VERDICTS.has(verdict);
}

/** DOC 222 §3 — the two facts the `conditional` rows key on beyond the
 *  four every row keys on. Both resolved by the caller (hook-join.ts). */
export interface ConditionalDirectionFacts {
  /** All `condition_atoms` hold on the record (null when the hook has none
   *  or the condition is a verdict — S5b is then unreachable). */
  readonly conditionAtomsHeld?: boolean | null;
  /** The distinguishing pair that holds carries `source_expressly_excludes`. */
  readonly expresslyExcludes?: boolean;
}

/**
 * The direction matrix (doc 213 §4 as amended by doc 222 §3), as code.
 * `LIA_HOOK_DIRECTION_MATRIX` in corpus/maps/lia-hooks.ts is the SAME table
 * transcribed as ratified data — kept only so a byte-pin test can catch
 * drift between the two; this function is the actual behaviour a report
 * renders through.
 *
 * Nomination (`required_atoms`), `factAgreement` and the two conditional
 * facts are the caller's job (hook-join.ts's `applyLiaHooks`): this
 * function never reads a hook or a state bag, only the already-resolved
 * facts the matrix keys on, so it can never throw.
 */
export function directionFor(
  posture: HookPosture,
  factAgreement: FactAgreement,
  engineVerdict: string | null,
  settledness: HookSettledness,
  facts: ConditionalDirectionFacts = {},
): HookDirection {
  const passing = isPassingVerdict(engineVerdict);

  // A contested (R4) settledness renders the boundary shape on SAME facts
  // only (doc 222 §3 — a contested decision on different facts adds
  // nothing and may imply a relation that was never established).
  if (settledness === "R4") {
    return factAgreement === "same" ? { shape: "S4" } : { omit: true };
  }

  if (posture === "accepted") {
    if (factAgreement === "same") return { shape: "S1" };
    return { omit: true }; // different or unknown — nothing to say
  }

  if (posture === "conditional") {
    if (factAgreement === "same") {
      // S5b only when the record satisfies the stated condition AND the
      // engine agrees (a passing verdict); the hook never overrules the
      // engine, so held atoms under a non-passing verdict stay S5a.
      return facts.conditionAtomsHeld === true && passing ? { shape: "S5b" } : { shape: "S5a" };
    }
    if (factAgreement === "different") {
      if (passing) {
        // An express exclusion under a pass is the adverse-under-pass case
        // — the lawyer's rule applies; a merely silent source is not.
        return { omit: true, reason: facts.expresslyExcludes ? "rule_missing" : "authority_not_dispositive" };
      }
      return { shape: facts.expresslyExcludes ? "S6x" : "S6" };
    }
    return { omit: true }; // unknown
  }

  if (posture === "rejected") {
    if (factAgreement === "same") {
      // The lawyer's rule (§4): an adverse authority on the same facts
      // under a pass means a rule is missing — never printed as a risk
      // noted. Every non-passing verdict (fails/uncertain, and any value
      // this matrix does not name as passing) already reflects the finding.
      return passing ? { omit: true, reason: "rule_missing" } : { shape: "S2" };
    }
    if (factAgreement === "different") return { shape: "S3" };
    return { omit: true }; // unknown
  }

  // posture === "contested" without R4 settledness is not a matrix row — a
  // contested posture ships R4 settledness in practice (§0); omit rather
  // than guess at a shape the matrix never named for this combination.
  return { omit: true };
}

/**
 * DOC 224A §8 D1 — the matrix pre-filter. A (record, hook) pair whose
 * agreement is `unknown` is worth a model call ONLY if at least one of the
 * two answers the legs could give (`same`, `different`) would put a
 * sentence on the page under the current verdict. Pure; used by the
 * planner in hook-join.ts.
 */
export function couldPrintEitherWay(
  posture: HookPosture,
  engineVerdict: string | null,
  settledness: HookSettledness,
  facts: ConditionalDirectionFacts = {},
): boolean {
  const same = directionFor(posture, "same", engineVerdict, settledness, facts);
  const different = directionFor(posture, "different", engineVerdict, settledness, facts);
  return "shape" in same || "shape" in different;
}
