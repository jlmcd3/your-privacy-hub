// ITEM 346 (FRAME LIBRARY REVISION) — REGISTRY-LEGAL SLOT SOURCE.
//
// SLOT TYPE 2 of 3. A frame may never carry hard-coded legal prose (the Item 338
// lint enforces that). But the CEO-authored target structure requires clauses of
// the form "[CITE] requires [WHAT THE PROVISION REQUIRES]". This module is where
// "what the provision requires" lives: authored ONCE per provision, reviewed, and
// PINNED AS DATA. Nothing here is generated at render time.
//
// SOURCING RULE. Every phrasing is derived from, and must remain faithful to, a
// row that is already verified:
//   * `proposition_key` — the verified-authority registry row (verbatim quote +
//     pinpoint). The pinpoint that ships beside the phrasing is ALWAYS taken from
//     that row at render time; it is never typed here.
//   * `provision_key` — the `provision_texts` row whose `plain_requirements`
//     array the phrasing restates.
// The phrasing itself is a plain-English restatement of the requirement. It is
// NOT presented as a quotation, and it never adds an obligation the quoted text
// does not carry.
//
// REVIEW STATUS. Every row lands `pinned` and names the ledger item that reviewed
// it. Adding or editing a row is a reviewed change, not a render-time decision.

export const LEGAL_PHRASING_VERSION = "prose-legal-2026-08-01-item346";

export interface LegalPhrasing {
  /** Stable slot key a frame references. Equals the registry proposition key. */
  readonly key: string;
  /** Verified-authority registry row supplying the pinpoint and verbatim quote. */
  readonly proposition_key: string;
  /** `provision_texts.key` whose plain_requirements this restates; null if none. */
  readonly provision_key: string | null;
  /** Authored, reviewed restatement of what the provision requires. */
  readonly requirement_prose: string;
  readonly status: "pinned";
  readonly reviewed_in_ledger_item: string;
}

const P = (
  key: string,
  provision_key: string | null,
  requirement_prose: string,
): LegalPhrasing => ({
  key,
  proposition_key: key,
  provision_key,
  requirement_prose,
  status: "pinned",
  reviewed_in_ledger_item: "Item 346",
});

/** cppa-risk registry-legal phrasings, keyed by proposition key. */
export const CPPA_RISK_LEGAL_PHRASINGS: Record<string, LegalPhrasing> = {
  ra_when_required: P(
    "ra_when_required",
    "cppa-7150",
    "a risk assessment be completed before the processing begins, whenever the processing presents significant risk to consumers' privacy",
  ),
  ra_triggers_intro: P(
    "ra_triggers_intro",
    "cppa-7150",
    "each listed processing activity be treated as presenting significant risk to consumers' privacy",
  ),
  ra_content_purpose: P(
    "ra_content_purpose",
    "cppa-7152",
    "the purpose of the processing be stated specifically, rather than as a generic business objective",
  ),
  ra_content_categories: P(
    "ra_content_categories",
    "cppa-7152",
    "the categories of personal information processed be identified, and the minimum personal information necessary to the stated purpose be identified with them",
  ),
  ra_content_operational: P(
    "ra_content_operational",
    "cppa-7152",
    "the operational elements of the processing be set out, including how the information is collected, how long it is retained, to whom it is disclosed, and who receives it",
  ),
  ra_content_benefits: P(
    "ra_content_benefits",
    "cppa-7152",
    "the benefits of the processing be identified for the business, the consumer, other stakeholders, and the public, in terms specific enough to be weighed",
  ),
  ra_content_negative_impacts: P(
    "ra_content_negative_impacts",
    "cppa-7152",
    "the negative impacts to consumers' privacy be identified, together with the source of each impact and how the processing causes it",
  ),
  ra_content_safeguards: P(
    "ra_content_safeguards",
    "cppa-7152",
    "the safeguards relied on be identified and tied to the negative impacts they are intended to address, so that the impact remaining after each safeguard can be seen",
  ),
  ra_content_initiate: P(
    "ra_content_initiate",
    "cppa-7152",
    "the decision whether to initiate the processing be recorded, and the reasons for it stated",
  ),
  ra_content_approval: P(
    "ra_content_approval",
    "cppa-7152",
    "the person who reviewed and approved the assessment be named, with their position and the date of approval",
  ),
  ra_goal: P(
    "ra_goal",
    null,
    "the identified benefits be weighed against the negative impacts as mitigated by the safeguards, and the processing not proceed where the risks to consumers' privacy outweigh those benefits",
  ),
  ra_comparable_set: P(
    "ra_comparable_set",
    null,
    "a single assessment cover a set of comparable processing activities only where the activities present the same significant risk in the same way",
  ),
};

export interface LegalPhrasingBook {
  readonly product: string;
  readonly version: string;
  readonly phrasings: Record<string, LegalPhrasing>;
}

export const LEGAL_PHRASING_BOOKS: Record<string, LegalPhrasingBook> = {
  "cppa-risk": {
    product: "cppa-risk",
    version: LEGAL_PHRASING_VERSION,
    phrasings: CPPA_RISK_LEGAL_PHRASINGS,
  },
};

/**
 * Look up a pinned requirement phrasing. Returns null for an unknown key — the
 * realizer then treats the slot as silent, which is FILL-OR-OMIT, never
 * invention. There is deliberately no fallback and no generation path.
 */
export function resolveLegalPhrasing(product: string, key: string): string | null {
  const book = LEGAL_PHRASING_BOOKS[product];
  const row = book?.phrasings?.[key];
  return row ? row.requirement_prose : null;
}

export function legalPhrasingKeys(product: string): string[] {
  return Object.keys(LEGAL_PHRASING_BOOKS[product]?.phrasings ?? {});
}
