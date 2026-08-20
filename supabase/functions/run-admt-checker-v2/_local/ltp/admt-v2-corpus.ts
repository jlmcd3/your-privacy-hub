// CPPA ADMT v1.2 — VA REGISTRY -> AUTHORITY-EXHIBIT CORPUS ADAPTER.
//
// `buildAuthorityExhibit` (the shared, fleet-wide exhibit builder) matches a
// report's cited authorities against approved corpus provisions at BASE
// SECTION granularity: an incoming citation like "11 CCR § 7221(c)" is
// stripped to "11 CCR § 7221" before lookup (see authority-exhibit.ts's
// `baseSection`), so multiple pinpoint cites to the same section resolve to
// one exhibit entry.
//
// The VA registry (`ADMT_VERIFIED_AUTHORITIES`) is keyed the OTHER way — one
// row per exact pinpoint subsection ("11 CCR § 7221(b)(1)", "7221(m)",
// "7221(n)(1)", ...), because it exists to anchor sentence-level citations
// precisely, not to serve as a base-section corpus. Handing those pinpoint
// keys to `buildAuthorityExhibit` directly means a finding citing
// "11 CCR § 7221(c)" (a real subsection with no VA row of its own) never
// matches ANY of the section's pinpoint rows, even though the registry does
// carry real verbatim text for that section — every entry renders
// "Citation only," system-wide, regardless of what the registry actually
// covers.
//
// This adapter groups VA rows by base section — first-declared row per
// section wins, so the pick is deterministic — so a base-stripped finding
// citation matches whenever the registry covers ANY subsection of that
// section. This trades pinpoint precision (a "(c)" finding may surface the
// section's "(a)" text rather than its own) for the exhibit actually
// resolving real corpus text instead of silently degrading to citation-only
// for every entry.
import { baseSection, type CorpusProvision } from "../../../_shared/report-exhibits/authority-exhibit.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../registry/admt-verified-authorities.ts";

export function vaRegistryAsProvisions(): CorpusProvision[] {
  const byBase = new Map<string, CorpusProvision>();
  for (const row of Object.values(ADMT_VERIFIED_AUTHORITIES as Record<string, any>)) {
    if (!row?.subsection || !row?.verbatim_quote) continue;
    const base = baseSection(String(row.subsection));
    const key = base.replace(/\s+/g, " ").trim().toLowerCase();
    if (byBase.has(key)) continue; // first-declared row per base section wins — deterministic
    byBase.set(key, { key: row.proposition_key, citation: base, verbatim_excerpt: row.verbatim_quote });
  }
  return [...byBase.values()];
}
