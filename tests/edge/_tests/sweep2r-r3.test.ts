// SWEEP-2R R3 — unit test for the fixed generic-subject deriver in
// ingest-gov-enforcement (SWEEP-2 T9, the [Aa]-spelled-out alternation
// with a strict Capitalised-word-only capture). Independent replication
// (courier 08:04Z, 09:16Z) shows the fixed pattern correctly derives the
// entity name from an HHS-OCR title and halts at the first lowercase
// word ("for"), so the trailing prepositional phrase "for HIPAA
// Violations" is NOT captured.
//
// This test mirrors the two regexes at ingest-gov-enforcement/index.ts:131
// (GENERIC_SUBJECT_PATTERNS) and the deriveGenericSubject helper at :147,
// then asserts on the OCR / Jackson Health System headline.

import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

const GENERIC_SUBJECT_PATTERNS: RegExp[] = [
  /\b(?:fines?|fined|orders?|ordered|penalis(?:e|es|ed|ing)|penaliz(?:e|es|ed|ing)|sanctions?|sanctioned|settles?|settled|reprimands?|reprimanded|warns?|warned|charges?|charged|sues?|sued|investigates?|investigated)\s+([A-Z][\w&.\-']*(?:\s+[A-Z0-9][\w&.\-']*){0,6})/,
  /(?:[Aa]ction\s+[Aa]gainst|[Pp]roceedings\s+[Aa]gainst|[Cc]omplaint\s+[Aa]gainst|[Pp]enalty\s+[Aa]gainst|[Oo]rder\s+[Aa]gainst|[Ff]ine\s+[Aa]gainst|[Ee]nforcement\s+[Aa]gainst)\s+([A-Z][\w&.\-']*(?:\s+[A-Z0-9][\w&.\-']*){0,6})/,
  /^([A-Z][\w&.\-']*(?:\s+[A-Z0-9][\w&.\-']*){0,6})\s+(?:agrees\s+to\s+pay|to\s+pay|will\s+pay|pays|paid|fined|settles?|agrees|reaches?\s+settlement)/,
];

const GENERIC_SUBJECT_BLOCKLIST =
  /^(the|a|an|new|update|updates|statement|guidance|report|reports|notice|notices|final|draft|press|release|releases|news|announcement|commissioner|commission|department|office|federal|state|attorney|general|court|supreme|company|companies|organization|organizations|business|businesses|consumer|consumers|data|privacy|security|regulation|regulations|rulemaking|rulemakings|investigation|investigations|enforcement)$/i;

function deriveGenericSubject(title: string): string | null {
  if (!title || title.length < 8) return null;
  for (const re of GENERIC_SUBJECT_PATTERNS) {
    const m = title.match(re);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
      if (cleaned.length < 3) continue;
      if (GENERIC_SUBJECT_BLOCKLIST.test(cleaned)) continue;
      return cleaned;
    }
  }
  return null;
}

Deno.test("R3 — Penalty against derives 'Jackson Health System', halts at lowercase 'for'", () => {
  const title =
    "OCR Imposes a $2.15 Million Civil Money Penalty against Jackson Health System for HIPAA Violations";
  assertEquals(deriveGenericSubject(title), "Jackson Health System");
});

Deno.test("R3 — lowercase 'action against' head still matches, capture stays capitalised", () => {
  const title = "New enforcement action against Acme Data Ltd announced today";
  assertEquals(deriveGenericSubject(title), "Acme Data Ltd");
});

Deno.test("R3 — no junk suffix beyond a capitalised entity", () => {
  const title =
    "FTC brings action against BigCo Inc for deceptive privacy practices under Section 5";
  // "for" is lowercase → capture must stop at "BigCo Inc".
  assertEquals(deriveGenericSubject(title), "BigCo Inc");
});
