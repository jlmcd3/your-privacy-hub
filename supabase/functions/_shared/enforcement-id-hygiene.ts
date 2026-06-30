// Shared enforcement-id hygiene helper (defense-in-depth).
//
// Enforcement-context "id:" tokens (E1, E2, …) exist ONLY for the structured
// annotations array. They must never surface in user-facing prose. Generators
// instruct the model to keep them out of body text, but the model sometimes
// leaks them (e.g. "[E3]", "[E2, E8]", "BREBAU case [E3]"). This removes the
// bracketed id tags from a body-text string. It does NOT touch structured
// fields, and does NOT remove bare case names (which may be legitimate).

/**
 * Remove enforcement-id tags like "[E1]", "[E2, E8]", "(E3)", "(E4, E7)" from prose.
 * The "id:" tokens (E1, E2, …) exist ONLY for the structured annotations array and
 * must never surface in user-facing text. The model leaks them in both bracketed and
 * parenthesised forms; this strips both. It does NOT touch structured fields, and does
 * NOT remove bare case names (which may be legitimate).
 */
export function stripEnforcementTags(text: string): string {
  if (!text) return text;
  return text
    // bracketed ids: [E1] | [E2, E8] | [E1,E6]
    .replace(/\[\s*E\d+(?:\s*,\s*E?\d+)*\s*\]/gi, "")
    // parenthesised ids: (E1) | (E2, E8) | (E1,E6)
    .replace(/\(\s*E\d+(?:\s*,\s*E?\d+)*\s*\)/gi, "")
    // tidy artifacts left behind by removal
    .replace(/\(\s*\)/g, "")            // empty parens
    .replace(/[ \t]{2,}/g, " ")         // collapsed double spaces
    .replace(/\s+([.,;:)])/g, "$1")     // space before punctuation
    .replace(/[ \t]+\n/g, "\n");        // trailing spaces before newline
}

