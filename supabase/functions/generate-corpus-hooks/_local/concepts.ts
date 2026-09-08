// DOC 222 §2.3 — concept equivalence for the drafter's material-fact dedupe.
// A VERBATIM copy of `LIA_ATOM_CONCEPTS` in the canonical
// run-li-assessment/_local/corpus/maps/lia-hooks.ts (copied, not imported:
// an edge function may not import a sibling function directory). Pinned by
// tests/edge/corpus/doc222-hooks-v2.test.ts against the canonical table.
// An atom absent here is its own concept.

export const LIA_ATOM_CONCEPTS: Readonly<Record<string, string>> = {
  "flag:special_category": "special_category",
  "data_category:Special category data": "special_category",
  "state:intake.balancing_details.special_category_data=true": "special_category",
  "flag:children": "children",
  "state:intake.balancing_details.children_data_subjects=true": "children",
  "class:direct_marketing": "direct_marketing",
  "flag:electronic_marketing": "electronic_marketing",
  "state:intake.purpose_details.marketing_channels.email_sms=true": "electronic_marketing",
};

export function atomConcept(atom: string): string {
  return LIA_ATOM_CONCEPTS[atom] ?? atom;
}
