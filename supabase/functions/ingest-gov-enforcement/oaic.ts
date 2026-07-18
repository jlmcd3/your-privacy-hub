// OAIC-specific helpers: URL canonicalization for the Funnelback redirect
// wrapper, enforcement-class relevance gate, and deterministic subject
// extraction. Kept in a co-located module so unit tests can import without
// pulling the full edge-function runtime.

// ─────────────────────────────────────────────────────────────────────────────
// URL normalization
// OAIC's media-centre search links go through a Funnelback redirect:
//   https://www.oaic.gov.au/s/redirect?...&url=<ENCODED>&auth=...&rank=...
// The `auth` and `rank` params rotate every crawl, so the raw wrapper URL is
// effectively unique-per-crawl. We normalise to the decoded inner `url=`
// target for dedup + storage. Any other source using the same
// /s/redirect?...&url=... shape (e.g. sibling Funnelback deployments) is
// covered by the pathname check.
export function canonicalizeSourceUrl(rawUrl: string): { canonical: string; wrapper: string | null } {
  try {
    const u = new URL(rawUrl);
    if (/\/s\/redirect\/?$/i.test(u.pathname)) {
      const inner = u.searchParams.get("url");
      if (inner) {
        const decoded = decodeURIComponent(inner).split("#")[0];
        return { canonical: decoded, wrapper: rawUrl };
      }
    }
    return { canonical: rawUrl.split("#")[0], wrapper: null };
  } catch {
    return { canonical: rawUrl, wrapper: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Enforcement-class relevance gate for OAIC titles.
//
// Rule: title must (a) match at least one ENFORCEMENT term AND (b) not be
// vetoed by a NON-ENFORCEMENT term. This narrows the gate to actual
// determinations, findings, orders, penalties, and enforceable undertakings —
// blocking statements, communiqués, awareness weeks, exposure drafts, joint
// oversight announcements, sweep results, NDB stats, guidance, and surveys.
const OAIC_ENFORCEMENT_TERMS: RegExp[] = [
  /\bfinds?\s+against\b/i,
  /\bfinds?\s+privacy\s+breach(es)?\b/i,
  // ENF-1c Task 7(a): widen to bare "Privacy Commissioner finds …" (without
  // "against"), which the OAIC uses for findings that don't name a respondent
  // in the headline.
  /\bPrivacy\s+Commissioner\s+finds\b/i,
  // ENF-1c Task 7(a): "ordered to pay/cease/comply" forms in addition to the
  // active "orders X to …" shape already covered below.
  /\bordered\s+to\s+(pay|cease|comply)\b/i,
  /\borders?\s+.+?\s+to\s+(compensate|pay|cease|stop|refrain|comply)/i,
  /\bcivil\s+penalt(y|ies)\s+(against|proceedings)\b/i,
  /\benforceable\s+undertaking\b/i,
  /\binfringement\s+notice\b/i,
  /\bpenalis(e|ed|es|ing)\b/i,
  /\bfinalises?\s+investigation\s+into\b/i,
  /\bdetermination\s+(against|regarding|in\s+the\s+matter)\b/i,
  /\bcommenc(es|ed|ing)\s+(federal\s+court|proceedings)\b/i,
];

const OAIC_NON_ENFORCEMENT_VETO: RegExp[] = [
  /^statement\s+on\b/i,
  /\bcommuniqu[eé]\b/i,
  /\bawareness\s+week\b/i,
  /\bexposure\s+draft\b/i,
  /\bsurvey\s+finds\b/i,
  /\bjoint\s+oversight\b/i,
  /\bworking\s+together\b/i,
  /\bglobal\s+privacy\s+sweep\b/i,
  /\bstats\s+show\b/i,
  /\bndb\s+stats\b/i,
  /\bpublishes?\s+(new\s+)?guidance\b/i,
  /\blaunches?\b/i,
  /\breleases?\s+.*draft\b/i,
  /\bappoint(ed|ment)\b/i,
];

export function isOaicEnforcementTitle(title: string): boolean {
  if (!title || title.length < 12) return false;
  if (OAIC_NON_ENFORCEMENT_VETO.some((re) => re.test(title))) return false;
  return OAIC_ENFORCEMENT_TERMS.some((re) => re.test(title));
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject extraction — deterministic, no LLM.
//
// Pattern order matters: more specific patterns run first. Each pattern
// captures the named entity from the headline. Returns null when no entity is
// extractable (genuinely anonymized determinations); the UI fallback
// "Undisclosed entity" is then the correct rendering.
const SUBJECT_PATTERNS: RegExp[] = [
  // "finds against {X} in ..." / "finds against {X}."
  /\bfinds?\s+against\s+([A-Z][^,.]*?)(?:\s+in\s+|\s+over\s+|[,.]|$)/,
  // "orders {X} to compensate/pay/cease/stop ..."
  /\borders?\s+([A-Z][^,.]*?)\s+to\s+(?:compensate|pay|cease|stop|refrain|comply)/,
  // "{X} penalised ..." / "penalises {X} ..."
  /\bpenalis(?:e|ed|es|ing)\s+([A-Z][^,.]*?)(?:\s+for\s+|\s+over\s+|[,.]|$)/,
  // "civil penalty against {X}"
  /\bcivil\s+penalt(?:y|ies)\s+against\s+([A-Z][^,.]*?)(?:[,.]|$)/,
  // "finalises investigation into {X}" — allow domain-like dots; stop at
  // comma, period+space, period+end, or end-of-string.
  /\bfinalises?\s+investigation\s+into\s+([A-Z0-9][^,]*?)(?:,|\.\s|\.$|$)/,
  // "enforceable undertaking (from|by|with) {X}"
  /\benforceable\s+undertaking\s+(?:from|by|with)\s+([A-Z][^,.]*?)(?:[,.]|$)/,
];

export function extractOaicSubject(title: string): string | null {
  if (!title) return null;
  for (const re of SUBJECT_PATTERNS) {
    const m = title.match(re);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, " ");
      // Reject obvious non-entities.
      if (cleaned.length < 3) continue;
      if (/^(the|a|an)\s/i.test(cleaned)) continue;
      return cleaned;
    }
  }
  return null;
}
