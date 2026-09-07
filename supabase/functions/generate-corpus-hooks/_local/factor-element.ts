// DOC 213 §2 — FACTOR → THREE-PART-TEST ELEMENT.
//
// A verbatim copy of `LIA_FACTOR_ELEMENT` from the canonical
// run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts (doc 189
// §2.3(c)). Copied, not imported: doc 213 §2 forbids cross-function imports.
// tests/edge/corpus/doc213-factor-element-pin.test.ts pins this copy to the
// canonical map in both directions.
//
// Gates and overlays (special-category / ePrivacy) have NO element; their
// bearing travels through the flags. A hook whose factor has no element here
// is EXCLUDED by name at generation — never emitted with a blank.

const F_INTEREST = "Interest legitimacy";
const F_THIRD_PARTY = "Third-party interests";
const F_NECESSITY = "Necessity and less-intrusive means";
const F_BALANCING = "Balancing of interests, rights and freedoms";
const F_EXPECTATIONS = "Reasonable expectations of the data subject";
const F_RELATIONSHIP = "Relationship with the individual";
const F_HARMS = "Potential harms and severity";
const F_SAFEGUARDS = "Safeguards and mitigations";
const F_CHILDREN = "Children's data";

export const LIA_FACTOR_ELEMENT: Readonly<Record<string, "purpose" | "necessity" | "balancing">> = {
  [F_INTEREST]: "purpose",
  [F_THIRD_PARTY]: "purpose",
  "Public-authority exclusion": "purpose",
  [F_NECESSITY]: "necessity",
  [F_BALANCING]: "balancing",
  [F_EXPECTATIONS]: "balancing",
  [F_RELATIONSHIP]: "balancing",
  [F_HARMS]: "balancing",
  [F_SAFEGUARDS]: "balancing",
  [F_CHILDREN]: "balancing",
};

export function liaElementOf(factorId: string): "purpose" | "necessity" | "balancing" | null {
  return LIA_FACTOR_ELEMENT[factorId] ?? null;
}
