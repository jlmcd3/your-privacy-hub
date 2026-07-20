// FF-DPA nd2 — Engaged-states deterministic check.
//
// Purpose: fail-closed when the generator asserts a US state privacy statute as
// operative for a DPA whose engaged US states (derived from the record) do not
// include that state. Runs alongside the existing speculative / baseline /
// blacklist detectors and merges into the same `extras` collector that already
// feeds the retry gate at hasHardViolations(lint).
//
// DERIVATION RULE (per courier Task 2(a)):
//   Engaged US states = the canonical DPA_JURISDICTIONS values of
//   `body.controllerJurisdiction` and `body.processorJurisdiction` that fall
//   inside US_JURS. Aliases have already been resolved by the caller
//   (`normalizeJurisdiction`) before this function is invoked, so the input is
//   the SET of canonical strings. No other intake field carries US-state
//   engagement in the current schema (verified 2026-07-18 against
//   `generate-dpa/index.ts`: `body.additionalJurisdictions`, `multiState*`,
//   and `body.jurisdictions` do NOT exist).
//
// EXCLUSIONS (per FF-DPA-HF1 Task 1 — narrowed nd2 exclusion set):
//   1. Comparative / contrastive context — the citation is preceded (within
//      the same sentence) by "unlike ", "similar to ", "modeled on ",
//      "modelled on ", "in contrast to ", "compared to ", "analogous to ",
//      "as with ", or "whereas ".
//   2. Legal-review / recital context — the citation appears inside a
//      "NOTE FOR LEGAL REVIEW:" block, a Recital paragraph, or a labelled
//      Comparative Appendix.
//
// HF1 Task 1 change: the previous savings-clause exclusion is REMOVED. The
// canonical generic savings sentence ("…and any other applicable state
// privacy laws") contains no state or statute names and matches no pattern
// in STATE_PATTERNS — the exclusion was dead code for the canonical form
// and was wrongly saving specific-statute enumerations that ride behind an
// "applicable state privacy laws" tail (Run C docs bee94e1e §1.3.4 /
// §1.3.6 and 74f0b87a §2.2). Any sentence naming a specific non-engaged
// state statute is a violation regardless of savings-clause phrasing
// elsewhere in the paragraph.

export type EngagedStateViolation = {
  code: "non_engaged_state_statute";
  severity: "hard";
  detail: string;
};

// Canonical DPA_JURISDICTIONS US values (must be kept in sync with US_JURS in
// generate-dpa/index.ts — the enumeration is duplicated here to keep this
// module self-contained and unit-testable without importing index.ts).
export const US_STATE_CANONICALS = new Set<string>([
  "California", "Texas", "New York", "Connecticut", "Colorado",
  "Virginia", "Florida", "Washington", "Illinois", "Massachusetts",
  "Oregon", "Indiana", "Montana", "Iowa", "Tennessee", "Minnesota",
  "Utah", "Delaware",
  // "United States (federal)" is intentionally excluded — federal-only
  // engagement does NOT engage any specific state's statute.
]);

// Per-state statute pattern registry.
// Each pattern is designed with whole-word / statutory-form discipline:
//   - Spelled-out act name (case-insensitive) requires the state-specific
//     descriptor so "Privacy Act" alone cannot match.
//   - Abbreviations that collide with common English words (CPA, TIPA) require
//     the STATE NAME or a statutory-citation-form anchor within a ±60-char
//     window so "CPA firm" or "TIPA insurance" do not false-positive.
//   - Codified citation forms (e.g. "Cal. Civ. Code § 1798.140",
//     "Va. Code § 59.1-575", "C.R.S. § 6-1-1301") anchor the state
//     unambiguously.
type StatePattern = {
  state: string;
  // Unambiguous full-phrase / citation-form patterns.
  strict: RegExp[];
  // Abbreviation patterns that additionally require a state-name proximity
  // guard applied by the detector (see abbreviationContextGuard).
  ambiguousAbbrev?: RegExp[];
};

// Regex conventions used below:
//   - `\b` on both sides where the token is [A-Za-z0-9] to prevent partial
//     hits (e.g. "CCPA" inside "iCCPAy" would not match).
//   - Match global-insensitive so we can enumerate all hits.
const STATE_PATTERNS: StatePattern[] = [
  {
    state: "California",
    strict: [
      /\bCalifornia Consumer Privacy Act\b/gi,
      /\bCalifornia Privacy Rights Act\b/gi,
      /\bCCPA\b/g,
      /\bCPRA\b/g,
      /\bCal\.?\s*Civ\.?\s*Code\s*§\s*1798\.\d/gi,
    ],
  },
  {
    state: "Texas",
    strict: [
      /\bTexas Data Privacy and Security Act\b/gi,
      /\bTDPSA\b/g,
      /\bTex\.?\s*Bus\.?\s*&\s*Com\.?\s*Code\s*§\s*541\./gi,
    ],
  },
  {
    state: "New York",
    strict: [
      /\bNew York SHIELD Act\b/gi,
      /\bStop Hacks and Improve Electronic Data Security Act\b/gi,
      /\bN\.?Y\.?\s*Gen\.?\s*Bus\.?\s*Law\s*§\s*899-(?:aa|bb)\b/gi,
    ],
  },
  {
    state: "Connecticut",
    strict: [
      /\bConnecticut Data Privacy Act\b/gi,
      /\bCTDPA\b/g,
      /\bConn\.?\s*Gen\.?\s*Stat\.?\s*§\s*42-515\b/gi,
    ],
  },
  {
    state: "Colorado",
    strict: [
      /\bColorado Privacy Act\b/gi,
      /\bC\.?R\.?S\.?\s*§\s*6-1-130\d/gi,
    ],
    // "CPA" alone collides with "certified public accountant"; require
    // "Colorado" within ±60 chars OR a Colorado statute anchor.
    ambiguousAbbrev: [/\bCPA\b/g],
  },
  {
    state: "Virginia",
    strict: [
      /\bVirginia Consumer Data Protection Act\b/gi,
      /\bVCDPA\b/g,
      /\bVa\.?\s*Code\s*§\s*59\.1-57[0-9]/gi,
    ],
    // "CDPA" bare is Virginia's abbreviation but is ambiguous; require
    // "Virginia" within ±60 chars.
    ambiguousAbbrev: [/\bCDPA\b/g],
  },
  {
    state: "Florida",
    strict: [
      /\bFlorida Digital Bill of Rights\b/gi,
      /\bFDBR\b/g,
      /\bFla\.?\s*Stat\.?\s*§\s*501\.70\d/gi,
    ],
  },
  {
    state: "Washington",
    strict: [
      /\bMy Health My Data Act\b/gi,
      /\bMHMDA\b/g,
      /\bR\.?C\.?W\.?\s*§\s*19\.373\./gi,
      /\bWashington My Health My Data\b/gi,
    ],
  },
  {
    state: "Illinois",
    strict: [
      /\bIllinois Biometric Information Privacy Act\b/gi,
      /\bBIPA\b/g,
      /\b740 ILCS 14\/\d/g,
    ],
  },
  {
    state: "Massachusetts",
    strict: [
      /\bMassachusetts Data Privacy Act\b/gi,
      /\bMDPA\b/g,
      /\bM\.?G\.?L\.?\s*c\.?\s*93A\b/gi,
    ],
  },
  {
    state: "Oregon",
    strict: [
      /\bOregon Consumer Privacy Act\b/gi,
      /\bOCPA\b/g,
      /\bOR\.?S\.?\s*§\s*646A\.5\d/gi,
    ],
  },
  {
    state: "Indiana",
    strict: [
      /\bIndiana Consumer Data Protection Act\b/gi,
      /\bICDPA\b/g,
      /\bInd\.?\s*Code\s*§\s*24-15\b/gi,
    ],
  },
  {
    state: "Montana",
    strict: [
      /\bMontana Consumer Data Privacy Act\b/gi,
      /\bMCDPA\b/g,
      /\bMont\.?\s*Code\s*§\s*30-14-28\d/gi,
    ],
  },
  {
    state: "Iowa",
    strict: [
      /\bIowa Consumer Data Protection Act\b/gi,
      /\bIowa Code\s*§\s*715D\b/gi,
    ],
  },
  {
    state: "Tennessee",
    strict: [
      /\bTennessee Information Protection Act\b/gi,
      /\bTenn\.?\s*Code\s*§\s*47-18-32\d/gi,
    ],
    // "TIPA" alone collides with "Tennessee Insurance Producers Act" and
    // similar. Require "Tennessee" within ±60 chars.
    ambiguousAbbrev: [/\bTIPA\b/g],
  },
  {
    state: "Minnesota",
    strict: [
      /\bMinnesota Consumer Data Privacy Act\b/gi,
      /\bMinn\.?\s*Stat\.?\s*§\s*325[MO]\b/gi,
    ],
  },
  {
    state: "Utah",
    strict: [
      /\bUtah Consumer Privacy Act\b/gi,
      /\bUCPA\b/g,
      /\bUtah Code\s*§\s*13-61\b/gi,
    ],
  },
  {
    state: "Delaware",
    strict: [
      /\bDelaware Personal Data Privacy Act\b/gi,
      /\bDPDPA\b/g,
      /\b6 Del\.?\s*C\.?\s*§\s*12D\b/gi,
    ],
  },
];

// Exclusion pattern set — see EXCLUSIONS block at the top of the file.
// (HF1 Task 1: savings-clause pattern removed — see rationale above.)
// (DPA-FIX-3 Task 2: canonical advisory-close carve-out added — rule 658
//  carve-out (iii): "a single inline advisory sentence using a canonical
//  close". Canonical closes are "; further clarification is advisable." and
//  the internal-facts variant "; further internal investigation is
//  advisable." — the two close forms named in the DRAFTING-NOTE DISCIPLINE
//  rulebook. A non-engaged-state statute mention is permitted where the
//  sentence it sits in terminates in one of those canonical closes; anywhere
//  else in operative text remains a hard violation.)
const RE_COMPARATIVE_PREFIX =
  /\b(unlike|similar to|modeled on|modelled on|in contrast to|compared to|analogous to|as with|whereas)\b[^.]{0,80}$/i;

const RE_CANONICAL_ADVISORY_CLOSE =
  /;\s*further\s+(?:clarification|internal\s+investigation)\s+is\s+advisable\s*\.?\s*$/i;

/**
 * Derive the set of engaged US states from the record. Aliases must already be
 * resolved to canonical DPA_JURISDICTIONS strings by the caller
 * (`normalizeJurisdiction`).
 */
export function deriveEngagedStates(canonicalJurisdictions: string[]): Set<string> {
  const engaged = new Set<string>();
  for (const raw of canonicalJurisdictions) {
    const j = String(raw ?? "").trim();
    if (US_STATE_CANONICALS.has(j)) engaged.add(j);
  }
  return engaged;
}

// Line-range helper: splits document into "paragraphs" (double-newline
// separated) for lightweight NOTE/Recital context detection.
function isInNonOperativeBlock(text: string, matchIndex: number): boolean {
  // Look back within the current paragraph (or 400 chars, whichever is
  // smaller) for the start-of-paragraph or a NOTE/Recital header.
  const paragraphStart = Math.max(
    0,
    text.lastIndexOf("\n\n", matchIndex),
    matchIndex - 400,
  );
  const window = text.slice(paragraphStart, matchIndex);
  if (/\bNOTE FOR LEGAL REVIEW\s*:/i.test(window)) return true;
  if (/(^|\n)\s*(?:Recital\b|WHEREAS\b|COMPARATIVE APPENDIX\b|COMPARATIVE REFERENCE\b)/i.test(window)) return true;
  return false;
}

function abbreviationContextGuard(
  text: string,
  matchIndex: number,
  matchLength: number,
  stateName: string,
): boolean {
  // For ambiguous abbreviations (CPA / CDPA / TIPA), require the state name
  // or a state-specific statutory anchor within ±60 chars of the match.
  const from = Math.max(0, matchIndex - 60);
  const to = Math.min(text.length, matchIndex + matchLength + 60);
  const window = text.slice(from, to);
  const stateRe = new RegExp(`\\b${stateName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
  if (stateRe.test(window)) return true;
  // State-specific statutory anchor patterns (subset of strict citation
  // regexes above). This is a defensive backup — if the abbreviation appears
  // adjacent to its own statute citation, the strict pattern will also match
  // and the state-name guard rarely needs to fire.
  if (stateName === "Colorado" && /\bC\.?R\.?S\.?\s*§\s*6-1-130/i.test(window)) return true;
  if (stateName === "Virginia" && /\bVa\.?\s*Code\s*§\s*59\.1-57/i.test(window)) return true;
  if (stateName === "Tennessee" && /\bTenn\.?\s*Code\s*§\s*47-18-32/i.test(window)) return true;
  return false;
}

function nextSentenceWindow(text: string, matchIndex: number, matchLength: number): string {
  // 120 chars trailing the match, terminated at a hard sentence break.
  const end = Math.min(text.length, matchIndex + matchLength + 200);
  const window = text.slice(matchIndex + matchLength, end);
  const stop = window.search(/[.!?](?:\s|$)/);
  return stop === -1 ? window : window.slice(0, stop + 1);
}

/**
 * Scan the DPA text for state-statute references that assert a NON-engaged
 * state's statute as operative. Applies the three exclusions.
 *
 * @param text       The DPA text (post-parse).
 * @param engaged    The set of engaged US states (from deriveEngagedStates).
 * @returns          Hard violations to be merged into the `extras` collector.
 */
export function detectNonEngagedStateAssertions(
  text: string,
  engaged: Set<string>,
): EngagedStateViolation[] {
  if (!text) return [];
  const violations: EngagedStateViolation[] = [];
  const seen = new Set<string>(); // dedupe by (state|matchText)

  for (const entry of STATE_PATTERNS) {
    if (engaged.has(entry.state)) continue;
    const patterns: Array<{ re: RegExp; ambiguous: boolean }> = [
      ...entry.strict.map((re) => ({ re, ambiguous: false })),
      ...(entry.ambiguousAbbrev ?? []).map((re) => ({ re, ambiguous: true })),
    ];

    for (const { re, ambiguous } of patterns) {
      // Ensure global flag so we can iterate all matches.
      const source = re.source;
      const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
      const scanner = new RegExp(source, flags);
      let m: RegExpExecArray | null;
      while ((m = scanner.exec(text)) !== null) {
        const idx = m.index;
        const matched = m[0];
        // Exclusion 3 — non-operative block (Recital / NOTE / Appendix).
        if (isInNonOperativeBlock(text, idx)) continue;
        // Abbreviation guard — for ambiguous abbrevs, require state-name /
        // statute proximity.
        if (ambiguous && !abbreviationContextGuard(text, idx, matched.length, entry.state)) {
          continue;
        }
        // Exclusion 1 — comparative prefix within the sentence.
        const sentenceStart = Math.max(0, text.lastIndexOf(".", idx - 1) + 1);
        const sentenceLead = text.slice(sentenceStart, idx);
        if (RE_COMPARATIVE_PREFIX.test(sentenceLead)) continue;
        // Exclusion 2 (DPA-FIX-3 Task 2) — canonical advisory close carve-out.
        // The sentence containing the match ends with "; further clarification
        // is advisable." (or the "; further internal investigation is
        // advisable." variant). See rule 658 carve-out (iii).
        const trailing = nextSentenceWindow(text, idx, matched.length);
        if (RE_CANONICAL_ADVISORY_CLOSE.test(trailing)) continue;
        // (HF1 Task 1: savings-clause exclusion removed — see file header.)

        const key = `${entry.state}|${matched.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        violations.push({
          code: "non_engaged_state_statute",
          severity: "hard",
          detail: `Non-engaged US state "${entry.state}" statute asserted (match: "${matched}"). Engaged states from record: [${[...engaged].join(", ") || "—"}].`,
        });
      }
    }
  }
  return violations;
}
