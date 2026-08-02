/**
 * CORPUS SOURCE-QUALITY CLASSIFICATION (2026-08-02, CEO-approved).
 *
 * A corpus row may point at (a) the authority's OWN ruling/decision, (b) the
 * authority's press/news write-up of a ruling, (c) a third-party tracker or
 * case database, or (d) third-party commentary/news. Only (a) is citable as
 * enforcement authority; the others are somebody's description of a decision.
 *
 * Vocabulary is closed. `null` means NOT YET CLASSIFIED and fails closed
 * everywhere it is consumed.
 */

export const SOURCE_TYPES = [
  "regulator_primary",
  "regulator_press",
  "third_party_tracker",
  "third_party_commentary",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Source labels that are explicitly the regulator's NEWS feed, not decisions. */
export const REGULATOR_PRESS_SOURCES = new Set(["AEPD News", "ICO News"]);

/** Community-edited case-summary wiki. Never the regulator's own text. */
export const COMMENTARY_SOURCES = new Set(["GDPRhub", "GDPRHub", "Gibson Dunn"]);

/** Canonicalise the GDPRhub casing duplication. */
export function canonicalSourceDatabase(sourceDatabase?: string | null): string {
  const s = String(sourceDatabase ?? "").trim();
  return s.toLowerCase() === "gdprhub" ? "GDPRhub" : s;
}

/** Authority-owned / official-publisher domains observed in the corpus. */
export const REGULATOR_DOMAINS = new Set<string>([
  "aepd.es", "uodo.gov.pl", "orzeczenia.uodo.gov.pl", "orzeczenia.nsa.gov.pl",
  "oipc.ab.ca", "dataprotection.ro", "garanteprivacy.it", "gpdp.it", "garante.it",
  "ftc.gov", "priv.gc.ca", "naih.hu", "hhs.gov", "illinoisattorneygeneral.gov",
  "dpa.gr", "cppa.ca.gov", "datatilsynet.dk", "ipc.on.ca", "decisions.ipc.on.ca",
  "ico.org.uk", "uoou.gov.cz", "uoou.cz", "datatilsynet.no", "cnil.fr",
  "dataprotectionauthority.be", "azop.hr", "autoriteitpersoonsgegevens.nl",
  "dataprotection.gov.cy", "dataprotection.ie", "cnpd.public.lu",
  "datenschutz-hamburg.de", "legifrance.gouv.fr", "autoriteprotectiondonnees.be",
  "imy.se", "pdpc.gov.sg", "cpdp.bg", "ag.ny.gov", "personuvernd.is",
  "tietosuoja.fi", "ris.bka.gv.at", "ip-rs.si", "datainspektionen.se",
  "gegevensbeschermingsautoriteit.be", "baden-wuerttemberg.datenschutz.de",
  "idpc.org.mt", "vdai.lrv.lt", "dsb.gv.at", "atg.wa.gov", "dataprotection.gov.sk",
  "aki.ee", "portal.ct.gov", "edpb.europa.eu", "mass.gov", "datenschutz.hessen.de",
  "doj.state.or.us", "dvi.gov.lv", "cnpd.pt", "datenschutz-berlin.de", "coag.gov",
  "finlex.fi", "oaic.gov.au", "oag.ca.gov", "bfdi.bund.de", "lfd.niedersachsen.de",
  "inforights.im", "texasattorneygeneral.gov", "datenschutz.saarland.de",
  "oag.state.va.us", "datenschutz.sachsen.de", "cai.gouv.qc.ca", "privacy.ca.gov",
  "lda.brandenburg.de", "in.gov", "faqs.in.gov", "dca.ca.gov", "island.is",
  "poderjudicial.es", "myfloridalegal.com", "lda.bayern.de", "scamshield.gov.sg",
  "ada.lt", "datenschutz.rlp.de", "legisquebec.gouv.qc.ca", "tech.gov.sg", "sec.gov",
  "datenschutz.bremen.de", "datenschutzstelle.li", "pipc.go.kr", "anpd.gov.br",
  "ca.gov",
]);

/** Third-party trackers, wikis and case databases. */
export const TRACKER_DOMAINS = new Set<string>([
  "gdprhub.eu", "zaftda.de", "enforcementtracker.com", "datenschutzarchiv.org",
  "classic.austlii.edu.au", "360.lexisnexis.at", "gdprtoolkit.eu", "fragdenstaat.de",
  "indd.adobe.com", "youtube.com", "twitter.com",
]);

/** Media / law-firm commentary domains. */
export const COMMENTARY_DOMAINS = new Set<string>([
  "heise.de", "cms-lawnow.com", "agplaw.com", "etrend.sk", "derstandard.at",
  "irishlegal.com", "faz.net", "noe.orf.at", "pingdigital.de",
  "theword.iuslaboris.com", "mz.de", "irishtimes.com", "cyprus-mail.com",
  "independent.ie", "spiegel.de", "noyb.eu", "gvzh.com.mt", "eldiario.es",
  "news.post.at", "irishexaminer.com", "gibsondunn.com", "hvg.hu", "sudinfo.be",
  "handelsblatt.com",
]);

export function urlHost(url?: string | null): string {
  const m = String(url ?? "").trim().toLowerCase()
    .match(/^https?:\/\/(?:www\.)?([^/?#]+)/);
  return m ? m[1] : "";
}

export function isRegulatorDomain(url?: string | null): boolean {
  return REGULATOR_DOMAINS.has(urlHost(url));
}

export interface ClassifiableRow {
  source_database?: string | null;
  source_url?: string | null;
  source_document_text?: string | null;
  strat_has_document?: boolean | null;
}

/**
 * Deterministic classifier — the exact rule set applied to the corpus in the
 * 2026-08-02 sweep. No network, no inference.
 */
export function classifySourceType(row: ClassifiableRow): SourceType | null {
  const db = canonicalSourceDatabase(row.source_database);
  const host = urlHost(row.source_url);
  if (REGULATOR_PRESS_SOURCES.has(db)) return "regulator_press";
  if (COMMENTARY_SOURCES.has(db) || host === "gdprhub.eu") return "third_party_commentary";
  if (!host) return null;
  if (TRACKER_DOMAINS.has(host)) return "third_party_tracker";
  if (COMMENTARY_DOMAINS.has(host)) return "third_party_commentary";
  if (REGULATOR_DOMAINS.has(host)) {
    // CMS is an aggregator: the regulator domain alone is not enough — the row
    // must also carry the captured document, otherwise the link may be a
    // CMS-authored summary page. Fail closed until a refetch confirms it.
    if (db === "CMS") {
      const hasDoc = (row.source_document_text ?? "").trim().length >= 200 ||
        row.strat_has_document === true;
      return hasDoc ? "regulator_primary" : "third_party_tracker";
    }
    return "regulator_primary";
  }
  return "third_party_tracker";
}

/** Source labels that can never yield a citable row — excluded from sweeps. */
export const NON_PRIMARY_SOURCE_DATABASES = [
  "AEPD News",
  "ICO News",
  "GDPRhub",
  "GDPRHub",
] as const;
