// DOC 238 §5.5.2 / CEO ruling 2026-09-09 ("no fail-closed designs") — THE
// RENDER-TIME TIDY PASS for a hook sentence.
//
// A hook shape is a fixed template — "…({citation}; {status}.)" — and every
// slot is either resolved or the shape refuses to render (an unresolved slot
// is a dropped, flagged application, never a blank on the page). But some
// slots are LEGITIMATELY empty for some hooks: `{governing_provision}` and
// `{hedge}` for a hook without those curated sentences, and — the reason
// this module exists — `{status}` for a hook whose approved citation carries
// no status clause (doc 236's ADMT FSOR convention, `status_in_citation:
// false`). When such a slot resolves to "", the template's own punctuation
// around it is left behind: "; .)" where the status clause was, a double
// space where a sentence was, an empty "()" where nothing at all remained.
//
// The CEO's instruction (2026-09-09) was explicit: never leave an
// unresolved slot, a double space, an empty parenthetical or a stray
// punctuation mark — write the small text function that removes the gap
// cleanly rather than a validation gate that refuses to render. This is
// that function. It is deliberately NARROW: every rule below removes only a
// punctuation ARTIFACT that a correctly-drafted sentence never contains, so
// on a clean sentence it is a byte-for-byte no-op (pinned by
// tests/edge/corpus/doc238-status-labels-and-tidy.test.ts against the
// literal CEO-approved sentences of docs 223B/233/234/236). It never
// rewords, never touches letters, and never removes punctuation that is
// attached to a word.
//
// IMPORT BOUNDARY: shared by every product's hook join (LIA's
// `lia-deliverables/hook-join.ts`, DPIA's `dpia-hook-join.ts`, Risk's and
// ADMT's `hook-join.ts`) the same way hook-types.ts and hook-selection.ts
// are — a pure text function with no imports of its own.

/** Collapse the punctuation artifacts an empty slot leaves in a rendered
 *  hook sentence. Idempotent; a no-op on a clean sentence. */
export function tidyRenderedSentence(sentence: string): string {
  let s = sentence;
  // An omitted status clause: "({citation}; {status}.)" -> "({citation}; .)"
  // -> "({citation}.)". Also the bare-close variant a shape without the
  // trailing period would leave.
  s = s.replace(/;\s*\.\)/g, ".)");
  s = s.replace(/;\s*\)/g, ")");
  // A leading empty part inside a parenthetical: "(; status.)" -> "(status.)".
  s = s.replace(/\(\s*;\s*/g, "(");
  // Two separators with nothing between them.
  s = s.replace(/;\s*;/g, ";");
  s = s.replace(/,\s*,/g, ",");
  // An empty parenthetical, with the space that introduced it.
  s = s.replace(/\s*\(\s*\)/g, "");
  // A space that an empty slot left before closing punctuation. Deliberately
  // NOT `;`/`:`/`!`/`?` — French typography (a CNIL decision's verbatim
  // `finding_span`) legitimately spaces before those, and a verbatim quote
  // must never be reworded by this pass; the template artifacts this module
  // exists for ("; .)", see above) are handled by the first two rules.
  s = s.replace(/[ \t]+([.,)])/g, "$1");
  s = s.replace(/\(\s+/g, "(");
  // Runs of spaces (never newlines) where an empty sentence-slot sat.
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}
