// Shared display rule for an enforcement action's headline name.
//
// A small number of corpus rows carry a prose fragment in `subject` (the
// importer captured a sentence out of the decision text instead of the party
// name), and ~2,100 rows are legitimately anonymised with no subject at all.
// In both cases the headline falls back to the formal citation, then to a
// regulator-scoped label — never to a mid-sentence fragment.

const FRAGMENT_START = /^[a-z]/;
const ENTITY_HINT = /(LLC|Inc\b|Ltd|S\.A|S\.r\.l|GmbH|Limited|Order|Ministry|Department|Sp\. z|Kft|A\.E|Oy|AB\b|BV\b|B\.V)/;

export function isFragmentSubject(subject?: string | null): boolean {
  const s = (subject ?? "").trim();
  if (!s) return false;
  if (FRAGMENT_START.test(s)) return true;
  if (s.length >= 118 && !ENTITY_HINT.test(s)) return true;
  return false;
}

export function displaySubject(action: {
  subject?: string | null;
  case_reference?: string | null;
  regulator?: string | null;
  jurisdiction?: string | null;
}): string {
  const s = (action.subject ?? "").trim();
  if (s && !isFragmentSubject(s)) return s;
  const cite = (action.case_reference ?? "").trim();
  if (cite) {
    return action.regulator ? `${action.regulator} — ${cite}` : cite;
  }
  if (action.regulator) {
    return action.jurisdiction
      ? `${action.regulator} enforcement action (${action.jurisdiction})`
      : `${action.regulator} enforcement action`;
  }
  return "Anonymised determination";
}
