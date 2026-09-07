// DOC 213 TRACK H2 — OFFLINE ANALOGY HOOKS: the ratified-hook type and the
// direction matrix (§0, §4). A hook is the machine-readable pairing of an
// authority's material facts with a customer record's own typed facts, so
// that RENDERING code — never a model — can say whether the record's facts
// are the same as, or distinguished from, the authority's, and print one of
// four ratified sentence shapes (or nothing). A hook never changes a
// verdict; it only decides what PROSE cites an already-computed verdict
// sits beside (§2's "generate" note: "a hook is persuasive rendering, not a
// verdict").
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

export type HookShape = "S1" | "S2" | "S3" | "S4";

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
}

export interface HookDirectionShape {
  readonly shape: HookShape;
}

export interface HookDirectionOmit {
  readonly omit: true;
  /** Set only for the one row the lawyer's rule names by name (§4): an
   *  adverse authority on the same facts under a passing verdict means a
   *  rule is missing, never a risk noted. Every other omit row is silent. */
  readonly reason?: "rule_missing";
}

export type HookDirection = HookDirectionShape | HookDirectionOmit;

/** The two verdict values every element scale (purpose/necessity/balancing)
 *  treats as "passing" (mirrors lia-persuasive-authority.ts's own private
 *  set of the same name and values — duplicated, not imported, for the
 *  same self-containment reason as the rest of this module). */
const PASSING_VERDICTS: ReadonlySet<string> = new Set(["passes", "likely_passes"]);

/**
 * The direction matrix (§4), as code. `LIA_HOOK_DIRECTION_MATRIX` in
 * corpus/maps/lia-hooks.ts is the SAME table transcribed as ratified data —
 * kept only so a byte-pin test can catch drift between the two; this
 * function is the actual behaviour a report renders through.
 *
 * Nomination (`required_atoms`) and `factAgreement` are the caller's job
 * (hook-join.ts's `applyLiaHooks`): this function never reads a hook or a
 * state bag, only the four already-resolved facts the matrix keys on, so it
 * can never throw.
 */
export function directionFor(
  posture: HookPosture,
  factAgreement: FactAgreement,
  engineVerdict: string | null,
  settledness: HookSettledness,
): HookDirection {
  // A contested (R4) settledness always renders as the boundary shape,
  // regardless of the authority's own posture — the finding itself is
  // under appeal, so no relation to the record's verdict is ever drawn.
  if (settledness === "R4") {
    if (factAgreement === "same" || factAgreement === "different") {
      return { shape: "S4" };
    }
    return { omit: true }; // unknown — nothing to say either way
  }

  if (posture === "accepted") {
    if (factAgreement === "same") return { shape: "S1" };
    return { omit: true }; // different or unknown — nothing to say
  }

  if (posture === "rejected" || posture === "conditional") {
    if (factAgreement === "same") {
      const passing = engineVerdict !== null && PASSING_VERDICTS.has(engineVerdict);
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
