// Shared citation-discipline machinery for CPPA / privacy generators.
//
// Extracted from run-cppa-risk-assessment so multiple edge functions can share
// the same banned-phrase blocklist and (eventually) a common post-generation
// citation verifier.
//
// Caller log format for any removed citation (do this in the calling function):
//   console.log(JSON.stringify({
//     evt: "citation_removed",
//     fn,                       // edge-function name, e.g. "run-cppa-risk-assessment"
//     kind,                     // "authority" | "enforcement" | "fsor"
//     citation,                 // the exact token that was stripped
//     sentence: sentence.slice(0, 160),
//   }));

// ---------------------------------------------------------------------------
// STEP 1 — Banned-phrase blocklist
// ---------------------------------------------------------------------------

export const BANNED_PHRASES: string[] = [
  "improve our services", "improve services",
  "for security purposes", "for business purposes",
  "to enhance user experience", "as described in our privacy policy",
  "to provide better services", "to support our business objectives",
];

/**
 * Case-insensitive scan that returns every banned phrase found in `text`.
 * `clean` is true iff no banned phrase was found.
 */
export function checkBannedPhrases(text: string): { clean: boolean; hits: string[] } {
  if (!text || typeof text !== "string") return { clean: true, hits: [] };
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) hits.push(phrase);
  }
  return { clean: hits.length === 0, hits };
}

// ---------------------------------------------------------------------------
// STEP 2 — Post-generation citation verifier
// ---------------------------------------------------------------------------

export interface RetrievalPayload {
  /** Statutory citations, e.g. "11 CCR § 7152", "Cal. Civ. Code § 1798.185", "GDPR Article 6". */
  authorityCites: string[];
  /** Enforcement indices present in the model's context, e.g. ["1","2","3"] for [E1] [E2] [E3]. */
  enforcementIds: string[];
  /** FSOR indices present in the model's context, e.g. ["1","12"] for [F1] [F12]. */
  fsorIds: string[];
  /**
   * GDPR/EDPB reference strings actually retrieved, e.g. "Art. 6 EU", "Recital 47",
   * "EDPB Guidelines 1/2024". When undefined, bracketed GDPR-style citations are
   * NOT verified (backwards compatible). When provided, bracketed citations
   * matching /\[(Art\.|Recital|EDPB)[^\]]*\]/ are checked against this list using
   * the same normalisation approach as authority cites.
   */
  gdprCites?: string[];
}

const FLAG = " [citation removed — verify with counsel]";

// Bracketed markers like [A1], [E3], [F12]
const BRACKET_RE = /\[([AEF])(\d+)\]/g;

// Statutory-citation patterns we care about.
const STAT_PATTERNS: RegExp[] = [
  // 11 CCR § 7152  /  11 CCR §7152  /  11 CCR Section 7152
  /\b\d+\s*CCR\s*(?:§|§§|Section|Sec\.?)\s*\d+(?:\.\d+)?\b/gi,
  // Cal. Civ. Code § 1798.185
  /\bCal\.?\s*Civ\.?\s*Code\s*(?:§|§§|Section|Sec\.?)\s*\d+(?:\.\d+)+\b/gi,
  // Article NN GDPR  /  Art. NN GDPR  /  GDPR Article NN
  /\bArticle\s+\d{1,3}(?:\(\d+\))?(?:\([a-z]\))?\s+GDPR\b/gi,
  /\bArt\.?\s*\d{1,3}(?:\(\d+\))?(?:\([a-z]\))?\s+GDPR\b/gi,
  /\bGDPR\s+Article\s+\d{1,3}(?:\(\d+\))?(?:\([a-z]\))?\b/gi,
];

/** Normalise whitespace and section-symbol variants for citation comparison. */
function normCite(s: string): string {
  return s
    .replace(/§§/g, "§")
    .replace(/\bSection\b/gi, "§")
    .replace(/\bSec\.?\b/gi, "§")
    .replace(/\s+/g, " ")
    .replace(/\s*§\s*/g, " § ")
    .trim()
    .toLowerCase();
}

/** Split text into sentences while preserving the original separators. */
function splitSentences(text: string): string[] {
  // Capture-group split keeps the punctuation+whitespace as its own chunk so
  // we can rejoin without losing characters.
  const parts = text.split(/([.!?]+\s+|\n+)/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i] ?? "";
    const sep = parts[i + 1] ?? "";
    if (body.length === 0 && sep.length === 0) continue;
    out.push(body + sep);
  }
  return out;
}

export function verifyCitations(
  text: string,
  payload: RetrievalPayload,
): { text: string; removed: Array<{ citation: string; kind: "authority" | "enforcement" | "fsor"; sentence: string }> } {
  const removed: Array<{ citation: string; kind: "authority" | "enforcement" | "fsor"; sentence: string }> = [];
  if (!text) return { text: "", removed };

  const allowedAuthorities = new Set((payload.authorityCites ?? []).map(normCite));
  const allowedE = new Set((payload.enforcementIds ?? []).map(String));
  const allowedF = new Set((payload.fsorIds ?? []).map(String));

  const sentences = splitSentences(text);
  const rebuilt: string[] = [];

  for (const original of sentences) {
    let sentence = original;
    let flagged = false;

    // --- Bracketed markers ---
    sentence = sentence.replace(BRACKET_RE, (match, letter: string, num: string) => {
      let kind: "authority" | "enforcement" | "fsor";
      let allowed: boolean;
      if (letter === "A") {
        kind = "authority";
        // [A#] markers reference the authorityCites array positionally.
        allowed = Number(num) >= 1 && Number(num) <= (payload.authorityCites?.length ?? 0);
      } else if (letter === "E") {
        kind = "enforcement";
        allowed = allowedE.has(num);
      } else {
        kind = "fsor";
        allowed = allowedF.has(num);
      }
      if (allowed) return match;
      removed.push({ citation: match, kind, sentence: original });
      flagged = true;
      return "";
    });

    // --- Statutory citations ---
    for (const pat of STAT_PATTERNS) {
      sentence = sentence.replace(new RegExp(pat.source, pat.flags), (match) => {
        if (allowedAuthorities.has(normCite(match))) return match;
        removed.push({ citation: match, kind: "authority", sentence: original });
        flagged = true;
        return "";
      });
    }

    if (flagged) {
      // Clean up leftover " ," or doubled spaces from the stripped tokens,
      // then append the flag once before the trailing punctuation/whitespace.
      const trailingMatch = sentence.match(/([.!?]+\s*|\n+)$/);
      const trailing = trailingMatch ? trailingMatch[0] : "";
      const body = trailing ? sentence.slice(0, -trailing.length) : sentence;
      const cleanedBody = body
        .replace(/\s+([,;:.])/g, "$1")
        .replace(/\(\s*\)/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+$/g, "");
      sentence = cleanedBody + FLAG + trailing;
    }

    rebuilt.push(sentence);
  }

  return { text: rebuilt.join(""), removed };
}
