// OAIC privacy determinations register parser.
//
// Source: https://www.oaic.gov.au/privacy/privacy-decisions/privacy-determinations
// The register is the AUTHORITATIVE list of formal s.52 determinations —
// distinct from the media centre feed (which is publicity, not the register).
// Rows on the register carry a stable structure:
//   - Decision heading (respondent name + AICmr citation, may include date)
//   - `Decision year` field — the actual date (e.g. "11 June 2026")
//   - AustLII link:
//       https://classic.austlii.edu.au/au/cases/cth/AICmr/{YEAR}/{N}.html
//
// The parser is DETERMINISTIC — no LLM, no headline-pattern guessing.
// Subjects come from the decision heading; anonymized cases (e.g. "'AXF' and
// 'AXG'") return subject=null so the UI's "Undisclosed entity" fallback fires.

export interface RegisterDetermination {
  subject: string | null;         // Respondent name, or null if anonymized/pseudonymized
  citation: string;               // Canonical form: "[YYYY] AICmr N"
  decisionDate: string;           // ISO YYYY-MM-DD
  austliiUrl: string;             // Full determination on AustLII
  headingRaw: string;             // Original decision heading (for audit)
}

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function parseHumanDate(s: string): string | null {
  const m = s.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

// Strip AICmr citation and trailing " (date)" from a decision heading to
// recover the respondent expression. Then classify anonymised vs named.
function extractSubjectFromHeading(heading: string): string | null {
  // Remove AICmr citation and trailing parenthetical date if present.
  let s = heading.replace(/\[20\d{2}\]\s*AICmr\s*\d+.*$/i, "").trim();
  // Trim trailing "(Privacy)" marker and any stray brackets/punctuation.
  s = s.replace(/\(Privacy\)\s*$/i, "").trim();
  s = s.replace(/[\s.,\-]+$/, "").trim();

  // "Commissioner Initiated Investigation into X" → X
  const cii = s.match(/^Commissioner\s+Initiated\s+Investigation\s+into\s+(.+)$/i);
  if (cii) s = cii[1].trim();

  // Anonymised patterns: single-quoted three-letter code (e.g. 'AXF', 'ATU'),
  // or "'AXF' and 'AXG'" pairs — return null so UI fallback is used.
  if (/^['‘’][A-Z]{2,5}['’]/.test(s)) return null;
  if (/^['‘’][A-Z]{2,5}['’]\s+and\s+['‘’][A-Z]{2,5}['’]/.test(heading)) return null;

  if (s.length < 3) return null;
  return s;
}

// Match the AustLII URL pattern; the year and number are the citation anchors.
const AUSTLII_RE = /https:\/\/(?:classic\.)?austlii\.edu\.au\/(?:cgi-bin\/viewdoc\/)?au\/cases\/cth\/AICmr\/(20\d{2})\/(\d+)(?:\.html)?/i;

// Parse the whole register page markdown into structured determinations.
// The reader flattens the page into a sequence of headings + fields; we walk
// sequentially, opening a new record on each "Decision" or heading line and
// closing it when an AustLII URL is seen (that URL is the canonical anchor).
export function parseRegisterDeterminations(markdown: string): RegisterDetermination[] {
  const out: RegisterDetermination[] = [];
  // Split on the "Decision" section marker used repeatedly by the register.
  // The reader emits the label on its own line preceding the heading.
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Locate a decision heading: contains an AICmr citation.
    const citationMatch = line.match(/\[(20\d{2})\]\s*AICmr\s*(\d+)/i);
    if (!citationMatch) { i++; continue; }
    const year = citationMatch[1];
    const num = citationMatch[2];
    const citation = `[${year}] AICmr ${num}`;

    // Strip leading markdown link brackets and continuation backslashes that
    // the reader inserts around wrapped table cells.
    const headingRaw = line.replace(/^\[|\]$/g, "").replace(/\\$/g, "").trim();
    const subject = extractSubjectFromHeading(headingRaw);

    // Look ahead up to 40 lines for a "Decision year" field OR an inline
    // "(DD Month YYYY)" in the heading.
    let decisionDate: string | null = parseHumanDate(headingRaw);
    let austliiUrl: string | null = null;
    const scanEnd = Math.min(lines.length, i + 40);
    for (let j = i + 1; j < scanEnd; j++) {
      const l = lines[j].trim();
      // "Decision year" is followed a couple lines later by the date value.
      if (/^Decision year$/i.test(l)) {
        for (let k = j + 1; k < Math.min(lines.length, j + 4); k++) {
          const d = parseHumanDate(lines[k]);
          if (d) { decisionDate = decisionDate ?? d; break; }
        }
      }
      const au = l.match(AUSTLII_RE);
      if (au && au[1] === year && au[2] === num) {
        austliiUrl = `https://classic.austlii.edu.au/au/cases/cth/AICmr/${year}/${num}.html`;
        break;
      }
    }
    // Fallback URL — the classic AustLII pattern is fully determined by
    // (year, number), so we can always synthesise it. But we only emit a
    // row when the citation is present in the parse; the URL follows.
    if (!austliiUrl) {
      austliiUrl = `https://classic.austlii.edu.au/au/cases/cth/AICmr/${year}/${num}.html`;
    }
    if (decisionDate) {
      out.push({ subject, citation, decisionDate, austliiUrl, headingRaw });
    }
    i = i + 1;
  }
  // Dedup by citation (register sometimes renders the same row twice via
  // continuation markers).
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.citation) ? false : (seen.add(r.citation), true)));
}

// Media↔register dedup rule.
//
// A media-centre row and a register row describe the SAME matter iff:
//   (a) normalised subjects match (case-insensitive, strip common corporate
//       suffixes and "Pty Ltd"/"Limited"), AND
//   (b) decision dates are within ±30 days (media coverage often follows the
//       formal determination by a few days; 30d covers real-world lag but
//       stays under the ~87d gap between Optus 20-Mar and Optus White Pages
//       15-Jun — those remain distinct matters per the courier).
//
// When matched → register row is CANONICAL. Media row's URL is preserved on
// the register row as `legacy_summary_url`; the media row itself is left in
// place (to preserve subscriber-feed history), and its `case_reference`
// is backfilled from the register.
export function normalizeEntity(s: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(pty\s+ltd|pty\s+limited|proprietary\s+limited|limited|ltd|inc|llc|corp|company|australia|pty)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function datesWithin(d1: string, d2: string, maxDays: number): boolean {
  const t1 = Date.parse(d1);
  const t2 = Date.parse(d2);
  if (isNaN(t1) || isNaN(t2)) return false;
  const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
  return diffDays <= maxDays;
}
