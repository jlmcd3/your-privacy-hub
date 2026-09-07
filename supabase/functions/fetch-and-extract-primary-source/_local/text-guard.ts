// LEDGER B5-6 (2026-09-07) — SOURCE-TEXT OVERWRITE GUARD.
//
// A re-fetch on 2026-09-07 19:16–19:38 UTC replaced eight decision texts with
// bot-check interstitials ("Just a moment… Performing security verification",
// "no eres un robot") and one 37-character search-page title. Two of those rows
// render on every LIA report.
//
// Rule: stored source text is only ever replaced by text that is plausibly the
// decision itself. Any fetch that is shorter than what we already hold, under
// the minimum document length, or carries a bot-check / search-page marker is
// REJECTED — the stored text is left untouched.

export const MIN_SOURCE_TEXT_CHARS = 2_000;

/** Lower-cased substrings that identify a challenge page or a search results page. */
export const BOT_CHECK_MARKERS: readonly string[] = [
  "just a moment",
  "security verification",
  "performing security verification",
  "no eres un robot",
  "zoeken in uitspraken",
  "cargando",
  "checking your browser",
  "verify you are human",
  "enable javascript and cookies to continue",
];

export type GuardVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Decide whether `incoming` may overwrite `existing` source_document_text.
 * `existing` may be null/empty for a first fetch.
 */
export function evaluateSourceTextReplacement(
  incoming: string | null | undefined,
  existing: string | null | undefined,
): GuardVerdict {
  const next = (incoming ?? "").trim();
  const prev = (existing ?? "").trim();
  const lower = next.toLowerCase();

  for (const marker of BOT_CHECK_MARKERS) {
    if (lower.includes(marker)) {
      return { ok: false, reason: `bot_check_or_search_page ("${marker}")` };
    }
  }

  if (next.length < MIN_SOURCE_TEXT_CHARS) {
    return {
      ok: false,
      reason: `text_too_short (${next.length} chars < ${MIN_SOURCE_TEXT_CHARS})`,
    };
  }

  if (prev.length > 0 && next.length < prev.length) {
    return {
      ok: false,
      reason: `text_shorter_than_stored (${next.length} < ${prev.length})`,
    };
  }

  return { ok: true };
}

/**
 * Legifrance blocks datacenter traffic and returns a challenge page that reads
 * as valid HTML. CNIL decisions must be fetched from www.cnil.fr instead.
 */
export function isBotGatedSourceHost(url: string | null | undefined): boolean {
  return typeof url === "string" && url.includes("legifrance.gouv.fr");
}
