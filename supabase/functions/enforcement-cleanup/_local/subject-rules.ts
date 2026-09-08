// Local copy of the shared display rule for an enforcement subject (mirrors
// src/lib/enforcementSubject.ts). Kept inside _local/ so this function has no
// cross-function imports.

const FRAGMENT_START = /^[a-z]/;
const ENTITY_HINT =
  /(LLC|Inc\b|Ltd|S\.A|S\.r\.l|GmbH|Limited|Order|Ministry|Department|Sp\. z|Kft|A\.E|Oy|AB\b|BV\b|B\.V)/;

export function isFragmentSubject(subject?: string | null): boolean {
  const s = (subject ?? "").trim();
  if (!s) return false;
  if (FRAGMENT_START.test(s)) return true;
  if (s.length >= 118 && !ENTITY_HINT.test(s)) return true;
  return false;
}
