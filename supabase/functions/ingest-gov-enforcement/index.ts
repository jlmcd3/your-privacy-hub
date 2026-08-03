// Ingest enforcement actions from global DPA and government sources via Jina Reader.
// Dual-writes to both enforcement_actions (enforcement corpus for compliance tools)
// and updates (subscriber feed and weekly brief via AI enrichment).
// Government regulatory press releases and enforcement notices are public domain.
// All eight DPA scrape sources added 2026-05-19: OAIC, Datatilsynet DK/NO,
// PDPC Singapore, OPC Canada, Texas AG, Colorado AG, HHS OCR.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canonicalizeSourceUrl, isOaicEnforcementTitle, extractOaicSubject } from "./oaic.ts";
import { isFtcEnforcementUrl, extractFtcSubject, isHhsOcrEnforcementUrl, extractHhsSubject, normalizeRegulatorLabel } from "./us-ingest.ts";
import { parseRegisterDeterminations, normalizeEntity, datesWithin } from "./oaic-register.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JINA = "https://r.jina.ai/";

interface SourceEntry {
  regulator: string;
  jurisdiction: string;
  law: string;
  url: string;
  source: string;
  secondHop?: boolean;
  ftcPage?: number;
  // When set, monitor-mode runs fetch only this many pages (typically page 1).
  // Multi-page listings should set monitorPages: 1 and rely on backfill mode for
  // historical pages. Sources that aren't paginated can omit this.
  monitorPages?: number;
  // Logical grouping for selective dispatch: "core" (existing tier 1), "us_state",
  // "canada". Defaults to "core" when omitted.
  sourceGroup?: "core" | "us_state" | "canada";
  // When true, candidate titles are filtered through isTitleRelevant() to drop
  // non-privacy press releases (used for state AG / general newsroom sources).
  requireRelevance?: boolean;
  // When true, this entry only runs in backfill mode (skipped in monitor mode).
  // Used for page-2+ historical pagination pages.
  backfillOnly?: boolean;
  // ENF-1d: when set, the response is parsed as the OAIC determinations
  // register (structured rows — subject/citation/date/AustLII url). Bypasses
  // the generic markdown-link extractor and headline-pattern gates.
  registerParser?: "oaic";
}

// Privacy / data-protection terms used to filter generalist press-release feeds.
// English first, then French (for Quebec CAI / OPC FR), then statute names.
const PRIVACY_TERMS: RegExp[] = [
  /\bprivacy\b/i, /\bdata\s+protection\b/i, /\bdata\s+breach\b/i,
  /\bpersonal\s+(information|data)\b/i, /\bconsumer\s+protection\b/i,
  /\bidentity\s+theft\b/i, /\bcyber(security)?\b/i, /\bsecurity\s+breach\b/i,
  /\bdata\s+(sharing|sale|broker)\b/i, /\bbiometric\b/i, /\bsurveillance\b/i,
  /\bgenetic\s+data\b/i, /\bhealth\s+(data|records)\b/i,
  /\bCCPA\b/, /\bCPRA\b/, /\bTDPSA\b/, /\bCPA\b/, /\bVCDPA\b/, /\bCTDPA\b/,
  /\bUCPA\b/, /\bSHIELD\b/, /\bBIPA\b/, /\bCOPPA\b/, /\bHIPAA\b/,
  /\bPIPEDA\b/, /\bLoi\s*25\b/i, /\bLaw\s*25\b/i, /\bPHIPA\b/, /\bPIPA\b/,
  /\bvie\s+priv[ée]e\b/i, /\brenseignements\s+personnels\b/i,
  /\bprotection\s+des\s+(renseignements|donn[ée]es)\b/i,
  /\benforcement\b/i, /\bsettlement\b/i, /\binvestigation\b/i, /\bfine\b/i, /\bpenalty\b/i,
  // Phase 2 — state-specific statutes
  /\bMy\s+Health\s+My\s+Data\b/i, /\bMHMDA\b/, /\b201\s+CMR\s+17\b/i, /\bc\.\s*93H\b/i, /\bFDUTPA\b/i, /\bdata\s+broker\b/i,
];

function isTitleRelevant(title: string): boolean {
  if (!title || title.length < 8) return false;
  if (isAnnouncementNoise(title)) return false;
  return PRIVACY_TERMS.some((re) => re.test(title));
}

// Titles that describe regulator *announcements* rather than enforcement actions.
// These pass isTitleRelevant() because they mention privacy topics, but they are
// not enforcement actions and should not enter the enforcement_actions corpus.
const ANNOUNCEMENT_EXCLUSION: RegExp[] = [
  /\bboard\s+(meeting|session|agenda|minutes|vote)\b/i,
  /\bpublic\s+(meeting|hearing|workshop|comment|forum|session)\b/i,
  /\bcomment\s+period\b/i,
  /\bopen\s+for\s+(public\s+)?comment\b/i,
  /\bstakeholder\s+(meeting|session|workshop|forum|outreach)\b/i,
  /\bnotice\s+of\s+(proposed\s+)?(rulemaking|regulation|rule)\b/i,
  /\b(annual|quarterly)\s+(report|budget|plan)\b/i,
  /\bstrategic\s+plan\b/i,
  /\bappointment\s+of\b/i,
  /\bwelcomes?\s+new\b/i,
  /\b(executive\s+director|commissioner|chair(person)?|staff\s+director)\s+(appointed|named|joins|resigns|steps\s+down)\b/i,
  /\brequest\s+for\s+(proposals?|information|qualifications)\b/i,
  /\brfp\b/i,
  /\bsave\s+the\s+date\b/i,
  /\bwebinar\b/i,
  /\bconference\s+(agenda|program|registration|proceedings)\b/i,
  /\bnewsletter\b/i,
  /\bopportunity\s+to\s+comment\b/i,
  /\binvites?\s+(public\s+)?(comment|input|feedback)\b/i,
  /\bseeks?\s+(public\s+)?(comment|input|feedback)\b/i,
  /\bgrant\s+(award|program|funding|opportunity)\b/i,
  /\bjob\s+(posting|opening|vacancy)\b/i,
  /\bnow\s+hiring\b/i,
];

function isAnnouncementNoise(title: string): boolean {
  return ANNOUNCEMENT_EXCLUSION.some((re) => re.test(title));
}

// L2 — content-type URL blacklist. Applied generically across every source
// so speeches / statements / blog / testimony / opinions / conferences /
// staff-letters / newsletter / rulemaking pages never enter the corpus,
// even when a headline mentions a privacy term.
const NON_ENFORCEMENT_URL_PATH_RE =
  /\/(public-statements|speeches?|commissioner-statements|policy-statements|staff-letters|closing-letters|testimony|opinions?|blog|business-blog|blogs|newsletter|newsletters|events?|conference|conferences|webinars?|workshops?|podcast|podcasts|videos?|about|about-us|our-work|careers?|jobs|contact|subscribe|rss|feeds?|reports?|research|publications|guidance|training|awareness|consultation|consultations|rulemaking|exposure-drafts?|annual-report|strategic-plan)(\/|$)/i;

function isNonEnforcementUrl(u: string): boolean {
  if (!u) return false;
  try {
    const path = new URL(u).pathname;
    return NON_ENFORCEMENT_URL_PATH_RE.test(path);
  } catch {
    return false;
  }
}

// L3 — generic deterministic subject extraction from headlines for
// regulators without a dedicated extractor. Returns null when the title
// yields no plausible named entity (e.g. "President signs ..." press
// releases, "Statement on ...", or headlines that lead with the regulator
// itself). Never a fallback string — the caller rejects the row.
const GENERIC_SUBJECT_PATTERNS: RegExp[] = [
  // "fines/orders/penalises/sanctions/settles/reprimands/warns {X} ..."
  /\b(?:fines?|fined|orders?|ordered|penalis(?:e|es|ed|ing)|penaliz(?:e|es|ed|ing)|sanctions?|sanctioned|settles?|settled|reprimands?|reprimanded|warns?|warned|charges?|charged|sues?|sued|investigates?|investigated)\s+([A-Z][\w&.\-']*(?:\s+[A-Z0-9][\w&.\-']*){0,6})/,
  // "against {X} ..." / "action against {X}" — SWEEP-2 T9: the alternation
  // head is case-insensitive (spelled out) but the capture keeps the strict
  // per-word [A-Z]-start behavior of patterns 1 and 3. The previous /i flag
  // broadened the capture and swallowed trailing prepositional phrases
  // (e.g. "for HIPAA Violations"), producing multi-clause junk subjects.
  /(?:[Aa]ction\s+[Aa]gainst|[Pp]roceedings\s+[Aa]gainst|[Cc]omplaint\s+[Aa]gainst|[Pp]enalty\s+[Aa]gainst|[Oo]rder\s+[Aa]gainst|[Ff]ine\s+[Aa]gainst|[Ee]nforcement\s+[Aa]gainst)\s+([A-Z][\w&.\-']*(?:\s+[A-Z0-9][\w&.\-']*){0,6})/,
  // "{X} to pay $N" / "{X} agrees to pay" / "{X} fined"
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



const SOURCES: SourceEntry[] = [
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/action-weve-taken/enforcement/", source: "ICO", sourceGroup: "core", monitorPages: 1 },
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", source: "ICO News", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  // FTC cases-and-proceedings index — pages 0-10 (authoritative enforcement list).
  ...Array.from({ length: 10 }, (_, idx): SourceEntry => {
    const i = idx + 1;
    return {
      regulator: "FTC",
      jurisdiction: "United States",
      law: "FTC Act / COPPA / FCRA",
      url: `https://www.ftc.gov/enforcement/cases-proceedings?page=${i}`,
      source: "FTC",
      secondHop: true,
      ftcPage: i,
      sourceGroup: "core",
    };
  }),

  { regulator: "HHS OCR", jurisdiction: "United States", law: "HIPAA", url: "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html", source: "HHS-OCR", sourceGroup: "core", monitorPages: 1 },
  { regulator: "DPC Ireland", jurisdiction: "Ireland", law: "GDPR / Data Protection Act 2018", url: "https://www.dataprotection.ie/en/news-media/latest-news", source: "DPC Ireland", sourceGroup: "core", monitorPages: 1 },
  { regulator: "Gibson Dunn", jurisdiction: "EU", law: "GDPR", url: "https://www.gibsondunn.com/topic/european-data-protection-newsletter/", source: "Gibson Dunn", sourceGroup: "core", monitorPages: 1 },
  { regulator: "UODO", jurisdiction: "Poland", law: "GDPR (Poland)", url: "https://uodo.gov.pl/en/p/news-and-events", source: "UODO Poland", sourceGroup: "core", monitorPages: 1 },
  { regulator: "OAIC", jurisdiction: "Australia", law: "Privacy Act 1988", url: "https://www.oaic.gov.au/news/media-centre", source: "OAIC", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  // ENF-1d: OAIC privacy determinations register is the PRIMARY source for
  // formal s.52 determinations (the media-centre feed is publicity, not
  // exhaustive). Weekly monitor cadence — the register updates on the order
  // of days/weeks between determinations. Register rows are canonical; media
  // rows for the same matter get merged via the (subject, ±30d) rule below.
  { regulator: "OAIC", jurisdiction: "Australia", law: "Privacy Act 1988", url: "https://www.oaic.gov.au/privacy/privacy-decisions/privacy-determinations", source: "OAIC Register", sourceGroup: "core", monitorPages: 1, registerParser: "oaic" },
  { regulator: "Datatilsynet DK", jurisdiction: "Denmark", law: "GDPR (Denmark)", url: "https://www.datatilsynet.dk/english/news", source: "Datatilsynet DK", sourceGroup: "core", monitorPages: 1 },
  { regulator: "Datatilsynet NO", jurisdiction: "Norway", law: "GDPR (Norway)", url: "https://www.datatilsynet.no/en/news/", source: "Datatilsynet NO", sourceGroup: "core", monitorPages: 1 },
  { regulator: "PDPC Singapore", jurisdiction: "Singapore", law: "PDPA 2012", url: "https://www.pdpc.gov.sg/news-and-events/announcements", source: "PDPC Singapore", sourceGroup: "core", monitorPages: 1 },
  { regulator: "Texas AG", jurisdiction: "Texas", law: "TDPSA", url: "https://www.texasattorneygeneral.gov/news/press-releases", source: "Texas AG", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  { regulator: "Colorado AG", jurisdiction: "Colorado", law: "CPA", url: "https://coag.gov/press-releases/", source: "Colorado AG", sourceGroup: "core", monitorPages: 1, requireRelevance: true },

  // ── Additional EU DPA news feeds (no RSS — Jina HTML scrape) ──
  { regulator: "AEPD", jurisdiction: "Spain", law: "GDPR (Spain)", url: "https://www.aepd.es/en/notices", source: "AEPD News", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  { regulator: "APD/GBA", jurisdiction: "Belgium", law: "GDPR (Belgium)", url: "https://www.dataprotectionauthority.be/citizen/news", source: "APD Belgium", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  { regulator: "NAIH", jurisdiction: "Hungary", law: "GDPR (Hungary)", url: "https://www.naih.hu/en/news", source: "NAIH", sourceGroup: "core", monitorPages: 1, requireRelevance: true },
  { regulator: "ANSPDCP", jurisdiction: "Romania", law: "GDPR (Romania)", url: "https://www.dataprotection.ro/?page=Noutati_en", source: "ANSPDCP", sourceGroup: "core", monitorPages: 1, requireRelevance: true },

  // ── US state regulators (Phase 1 — sourceGroup: "us_state") ──────
  { regulator: "California Privacy Protection Agency (CPPA)", jurisdiction: "California", law: "CCPA / CPRA", url: "https://cppa.ca.gov/announcements/", source: "CPPA", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "California Attorney General (CA AG)", jurisdiction: "California", law: "CCPA / CPRA", url: "https://oag.ca.gov/news/press-releases", source: "CA AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "New York Attorney General (NY AG)", jurisdiction: "New York", law: "NY SHIELD / GBL 349", url: "https://ag.ny.gov/press-releases", source: "NY AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "Connecticut Attorney General (CT AG)", jurisdiction: "Connecticut", law: "CTDPA", url: "https://portal.ct.gov/AG/Press-Releases", source: "CT AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "Oregon Attorney General (OR AG)", jurisdiction: "Oregon", law: "OCPA", url: "https://www.doj.state.or.us/media-home/news-media-releases/", source: "OR AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "Indiana Attorney General (IN AG)", jurisdiction: "Indiana", law: "INCDPA", url: "https://www.in.gov/attorneygeneral/about-the-office/news/", source: "IN AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  { regulator: "Virginia Attorney General (VA AG)", jurisdiction: "Virginia", law: "VCDPA", url: "https://www.oag.state.va.us/media-center/news-releases", source: "VA AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },

  // ── Florida Attorney General (us_state Phase 2) ──────────────────
  { regulator: "Florida Attorney General", jurisdiction: "Florida", law: "Florida breach notification law / FDUTPA / consumer protection", url: "https://www.myfloridalegal.com/press-release", source: "FL-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  ...Array.from({ length: 4 }, (_, i): SourceEntry => ({
    regulator: "Florida Attorney General",
    jurisdiction: "Florida",
    law: "Florida breach notification law / FDUTPA / consumer protection",
    url: `https://www.myfloridalegal.com/press-release?page=${i + 1}`,
    source: "FL-AG",
    sourceGroup: "us_state",
    requireRelevance: true,
  })),

  // ── Washington Attorney General ──────────────────────────────────
  { regulator: "Washington Attorney General", jurisdiction: "Washington", law: "Washington My Health My Data Act / CPA / consumer protection", url: "https://www.atg.wa.gov/pressrelease.aspx", source: "WA-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  ...Array.from({ length: 4 }, (_, i): SourceEntry => ({
    regulator: "Washington Attorney General",
    jurisdiction: "Washington",
    law: "Washington My Health My Data Act / CPA / consumer protection",
    url: `https://www.atg.wa.gov/pressrelease.aspx?page=${i + 1}`,
    source: "WA-AG",
    sourceGroup: "us_state",
    requireRelevance: true,
  })),

  // ── Illinois Attorney General ────────────────────────────────────
  { regulator: "Illinois Attorney General", jurisdiction: "Illinois", law: "Illinois PIPA / BIPA / consumer protection", url: "https://illinoisattorneygeneral.gov/news-room/", source: "IL-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },

  // ── Massachusetts Attorney General ───────────────────────────────
  { regulator: "Massachusetts Attorney General", jurisdiction: "Massachusetts", law: "Massachusetts data breach law (M.G.L. c. 93H) / 201 CMR 17", url: "https://www.mass.gov/orgs/office-of-the-attorney-general/news", source: "MA-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true },
  ...Array.from({ length: 4 }, (_, i): SourceEntry => ({
    regulator: "Massachusetts Attorney General",
    jurisdiction: "Massachusetts",
    law: "Massachusetts data breach law (M.G.L. c. 93H) / 201 CMR 17",
    url: `https://www.mass.gov/orgs/office-of-the-attorney-general/news?page=${i + 1}`,
    source: "MA-AG",
    sourceGroup: "us_state",
    requireRelevance: true,
  })),

  // ── Canadian regulators (sourceGroup: "canada") ──────────────────
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA / Privacy Act", url: "https://www.priv.gc.ca/en/opc-news/news-and-announcements/", source: "OPC", sourceGroup: "canada", monitorPages: 1 },
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA", url: "https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/", source: "OPC Investigations", sourceGroup: "canada", monitorPages: 1 },
  { regulator: "Commission d'accès à l'information du Québec (CAI)", jurisdiction: "Quebec", law: "Loi 25 / Private Sector Act", url: "https://www.cai.gouv.qc.ca/salle-de-presse/", source: "CAI Québec", sourceGroup: "canada", monitorPages: 1, requireRelevance: true },
  { regulator: "Information and Privacy Commissioner of Ontario (IPC)", jurisdiction: "Ontario", law: "PHIPA / FIPPA / MFIPPA", url: "https://www.ipc.on.ca/en/newsroom/news-releases", source: "IPC Ontario", sourceGroup: "canada", monitorPages: 1 },
  { regulator: "Office of the Information and Privacy Commissioner of Alberta (OIPC AB)", jurisdiction: "Alberta", law: "PIPA / HIA / FOIP", url: "https://oipc.ab.ca/news-releases/", source: "OIPC Alberta", sourceGroup: "canada", monitorPages: 1 },
  { regulator: "Office of the Information and Privacy Commissioner for BC (OIPC BC)", jurisdiction: "British Columbia", law: "PIPA BC / FIPPA", url: "https://www.oipc.bc.ca/news/", source: "OIPC BC", sourceGroup: "canada", monitorPages: 1 },

  // ── Backfill: page 2 + 3 of confirmed-paginating sources ──
  // Each entry reuses the same `source` key so dedupe-by-URL stays consistent.
  // monitor mode skips these (they only fire in backfill mode, see filter below).
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/action-weve-taken/enforcement/?facet_serve_paged=2", source: "ICO", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/action-weve-taken/enforcement/?facet_serve_paged=3", source: "ICO", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/?facet_serve_paged=2", source: "ICO News", sourceGroup: "core", monitorPages: 1, requireRelevance: true, backfillOnly: true },
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/?facet_serve_paged=3", source: "ICO News", sourceGroup: "core", monitorPages: 1, requireRelevance: true, backfillOnly: true },
  { regulator: "DPC Ireland", jurisdiction: "Ireland", law: "GDPR / Data Protection Act 2018", url: "https://www.dataprotection.ie/en/news-media/latest-news?page=2", source: "DPC Ireland", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "DPC Ireland", jurisdiction: "Ireland", law: "GDPR / Data Protection Act 2018", url: "https://www.dataprotection.ie/en/news-media/latest-news?page=3", source: "DPC Ireland", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "Datatilsynet NO", jurisdiction: "Norway", law: "GDPR (Norway)", url: "https://www.datatilsynet.no/en/news/?page=2", source: "Datatilsynet NO", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "Datatilsynet NO", jurisdiction: "Norway", law: "GDPR (Norway)", url: "https://www.datatilsynet.no/en/news/?page=3", source: "Datatilsynet NO", sourceGroup: "core", monitorPages: 1, backfillOnly: true },
  { regulator: "Illinois Attorney General", jurisdiction: "Illinois", law: "Illinois PIPA / BIPA / consumer protection", url: "https://illinoisattorneygeneral.gov/news-room/?paged=2", source: "IL-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true, backfillOnly: true },
  { regulator: "Illinois Attorney General", jurisdiction: "Illinois", law: "Illinois PIPA / BIPA / consumer protection", url: "https://illinoisattorneygeneral.gov/news-room/?paged=3", source: "IL-AG", sourceGroup: "us_state", monitorPages: 1, requireRelevance: true, backfillOnly: true },
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA / Privacy Act", url: "https://www.priv.gc.ca/en/opc-news/news-and-announcements/?page=2", source: "OPC", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA / Privacy Act", url: "https://www.priv.gc.ca/en/opc-news/news-and-announcements/?page=3", source: "OPC", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA", url: "https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/?page=2", source: "OPC Investigations", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  { regulator: "Office of the Privacy Commissioner of Canada (OPC)", jurisdiction: "Canada", law: "PIPEDA", url: "https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/?page=3", source: "OPC Investigations", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  { regulator: "Office of the Information and Privacy Commissioner of Alberta (OIPC AB)", jurisdiction: "Alberta", law: "PIPA / HIA / FOIP", url: "https://oipc.ab.ca/news-releases/page/2/", source: "OIPC Alberta", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  { regulator: "Office of the Information and Privacy Commissioner of Alberta (OIPC AB)", jurisdiction: "Alberta", law: "PIPA / HIA / FOIP", url: "https://oipc.ab.ca/news-releases/page/3/", source: "OIPC Alberta", sourceGroup: "canada", monitorPages: 1, backfillOnly: true },
  // OAIC media-centre historical backfill (ENF-1b, CEO-ratified 2026-07-18).
  // Cutoff = 2026-01-19 (180 days). OAIC uses Funnelback pagination with
  // start_rank=1,11,21,... (10 items/page, dmetapublishedDateISO sorted).
  // Probe on 2026-07-18: page 2 (start_rank=11) reaches 4 February 2026;
  // page 3 (start_rank=21) reaches 21 January 2026 then predates cutoff.
  // Page 1 is already covered by the monitor entry. Two backfillOnly entries
  // suffice; deeper pages predate the window and are omitted. backfillOnly
  // flag ensures monitor cron (L462) never re-crawls these.
  { regulator: "OAIC", jurisdiction: "Australia", law: "Privacy Act 1988", url: "https://www.oaic.gov.au/news/media-centre?&collection=113e9365-ffcc-4320-a995-5c1b98bea3bb~sp-oaic-web-new&form=result&num_ranks=10&profile=news-results-page&sort=dmetapublishedDateISO&start_rank=11", source: "OAIC", sourceGroup: "core", monitorPages: 1, requireRelevance: true, backfillOnly: true },
  { regulator: "OAIC", jurisdiction: "Australia", law: "Privacy Act 1988", url: "https://www.oaic.gov.au/news/media-centre?&collection=113e9365-ffcc-4320-a995-5c1b98bea3bb~sp-oaic-web-new&form=result&num_ranks=10&profile=news-results-page&sort=dmetapublishedDateISO&start_rank=21", source: "OAIC", sourceGroup: "core", monitorPages: 1, requireRelevance: true, backfillOnly: true },
];

// Second-hop fetcher: given an FTC case summary page URL, find the Decision and
// Order (or equivalent) PDF link. Returns null if none found.
const FTC_PRIORITY: RegExp[] = [
  /^decision\s+and\s+order\b/i,
  /^final\s+order\b/i,
  /^consent\s+order\b/i,
  /^stipulated\s+(final\s+)?order\b/i,
  /^agreement\s+containing\s+consent\s+order\b/i,
  /^complaint\s+and\s+stipulated\s+order\b/i,
  /^amended\s+stipulated\s+order\b/i,
  /^default\s+(final\s+)?judgment\b/i,
];

async function extractDecisionAndOrderDetail(
  caseSummaryUrl: string,
): Promise<{ url: string; anchor: string; isFallback: boolean } | null> {
  try {
    const md = await jinaFetch(caseSummaryUrl);
    const FTC_PDF_RE = /\[([^\]]+)\]\((https:\/\/www\.ftc\.gov\/system\/files\/ftc_gov\/pdf\/[^\s)]+\.pdf)[^)]*\)/gi;
    const found: Array<{ anchor: string; url: string }> = [];
    let m: RegExpExecArray | null;
    FTC_PDF_RE.lastIndex = 0;
    while ((m = FTC_PDF_RE.exec(md)) !== null) {
      found.push({ anchor: m[1].trim(), url: m[2] });
    }
    if (found.length === 0) return null;
    for (const pattern of FTC_PRIORITY) {
      const match = found.find((f) => pattern.test(f.anchor));
      if (match) return { url: match.url, anchor: match.anchor, isFallback: false };
    }
    // No fallback — orders/stipulations only.
    return null;
  } catch {
    return null;
  }
}


async function extractDecisionAndOrderUrl(
  caseSummaryUrl: string,
): Promise<string | null> {
  const d = await extractDecisionAndOrderDetail(caseSummaryUrl);
  return d ? d.url : null;
}


async function jinaFetch(targetUrl: string): Promise<string> {
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = { "User-Agent": "EndUserPrivacy-Bot/1.0" };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  const res = await fetch(JINA + targetUrl, { headers });
  if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
  return await res.text();
}

// ── AI enrichment for updates table ───────────────────────────────
// NOTE (Source Fidelity overhaul, Function 2): this function must ONLY be called
// when real body text is available (description distinct from title and >= 100 chars).
// The previous dual-write call site passed `title` as both title and description,
// causing the model to fabricate decision details from a headline. That call site has
// been changed to skip the dual-write when body text is absent. The prompt below
// applies THIN SOURCE DISCIPLINE for any future caller that does have body text.
async function generateUpdateSummary(
  title: string,
  description: string,
  sourceName: string,
  regulator: string,
  jurisdiction: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  const descText = description || "";
  const isThin = descText.trim().length < 100 || descText.trim() === title.trim();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 5000,
        system: `You are a senior privacy regulatory analyst at a leading intelligence firm.
Analyse this enforcement action or regulatory announcement and return a single valid JSON object.
Return ONLY the JSON — no preamble, no markdown, no explanation.

SOURCE: This content comes from an official regulatory authority (${regulator}, ${jurisdiction}).
It is a primary source. Write in direct declarative voice.

GOVERNING PRINCIPLES:

SOURCE FIDELITY: Every specific factual claim in your output — fine amounts, case reference numbers, specific article violations, company names, decision dates — must be directly present in the provided text. If the provided text is only a title with no body content, return a minimal object with null for fields that cannot be grounded. NEVER generate case reference numbers, fine amounts, or specific violation details from training knowledge. The absence of information in the source is not a reason to fabricate it.

THIN SOURCE DISCIPLINE: If the source text is only a headline (under 100 characters, or identical to the title), you have insufficient basis for most fields. Return:
- why_it_matters_short: a general statement based on the headline
- why_it_matters: one general sentence (still must be >= 10 chars) acknowledging full text is pending
- compliance_impact: 'Monitor — [headline topic] — full decision text pending retrieval.'
- takeaways: a single general string acknowledging the headline topic (the validator requires >= 1)
- legal_weight and attention_level based on the headline topic
- All entity arrays: empty unless the headline names them
- All specific fact fields (fine amounts, case refs, article numbers): null
- action_items: empty array
Do not extrapolate. A headline is not a decision.

VOICE: Write in direct, active declarative voice appropriate to an official source. Lead with the compliance implication.`,
        messages: [{
          role: "user",
          content: `Regulator: ${regulator}
Jurisdiction: ${jurisdiction}
Title: ${title}
Source text: ${descText || "No body text available — title only."}
Source: ${sourceName}

SOURCE TEXT LENGTH: ${descText.length} characters.
${isThin ? "WARNING: Source text is very short or duplicates the title. Apply THIN SOURCE DISCIPLINE — return null for all specific-fact fields that cannot be grounded in this text." : ""}

Return this JSON object:
{
  "why_it_matters_short": "ONE sentence (max 25 words) based only on what the source text states.",
  "why_it_matters": "2 sentences based only on what the source text states. If source is title-only, ONE general sentence (>= 10 chars) acknowledging the headline topic is acceptable.",
  "takeaways": ["1-3 strings citing specific facts FROM THE SOURCE TEXT. If source text is title-only, return a single general string about the headline topic. Never empty — validator requires >= 1."],
  "compliance_impact": "One sentence. If source is title-only: 'Monitor — [headline topic] — full decision text pending retrieval.'",
  "affected_jurisdictions": ["Use only: eu, united-kingdom, us-federal, california, texas, new-york, france, germany, italy, spain, ireland, netherlands, poland, belgium, denmark, sweden, norway, australia, canada, brazil, singapore, japan, south-korea, india, switzerland, hong-kong"],
  "legal_weight": "Binding | Enforcement | Guidance | Proposal | Commentary",
  "attention_level": "High | Medium | Low",
  "regulatory_theory": "One sentence on the legal doctrine IF determinable from the source text. Return null if source is title-only or doctrine is not stated.",
  "action_items": [],
  "defense_considerations": null,
  "entities": {
    "regulators": ["${regulator}"],
    "companies": ["Company names STATED IN SOURCE TEXT. Empty array if none or if source is title-only."],
    "laws": ["Laws with article numbers STATED IN SOURCE TEXT. Empty array if not stated."],
    "case_references": ["Case reference numbers or decision identifiers STATED VERBATIM IN SOURCE TEXT. NEVER generate or infer reference numbers. Empty array if none."]
  },
  "source_fidelity_note": "Short note on source quality: title-only | short summary | full body text"
}`,
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Asset extensions that can never be an enforcement document. Markdown image
// syntax (`![alt](src)`) previously slipped through the link extractor, which
// is how the UODO (il.gov.pl) ingest stored thumbnail JPEG paths as
// `source_url` with the image alt-text as `violation`. Both guards below —
// the `!`-prefix check and this extension list — are required: some hosts
// emit bare links to assets too.
const ASSET_URL_RE =
  /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff?|mp4|mp3|wav|avi|mov|css|js|woff2?|ttf|eot|zip|rar)(?:$|[?#])/i;

// Extract markdown links + nearby date as candidate actions
function extractActions(markdown: string, src: typeof SOURCES[number]) {
  const out: Array<{ title: string; url: string; date: string | null }> = [];
  // Match markdown links: [title](url)
  const linkRe = /\[([^\]]{8,200})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    // Skip markdown IMAGE syntax `![alt](src)` — the `[` is preceded by `!`.
    if (m.index > 0 && markdown[m.index - 1] === "!") continue;

    const title = m[1].trim();
    const href = m[2];
    // Skip links whose target is a static asset (thumbnails, stylesheets…).
    if (ASSET_URL_RE.test(href)) continue;
    // Skip alt-text-shaped titles left behind by image-to-markdown converters.
    if (/^Image\s+\d+\s*:/i.test(title)) continue;

    // Only keep links that look like enforcement actions on the regulator's domain
    const host = new URL(href).hostname;
    const expectedHost = new URL(src.url).hostname;
    if (!host.includes(expectedHost.split(".").slice(-2).join("."))) continue;


    // Look for a date within 200 chars surrounding the match
    const ctx = markdown.slice(Math.max(0, m.index - 200), m.index + 200);
    const dIso = ctx.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;
    const dHuman = ctx.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
    let date: string | null = dIso;
    if (!date && dHuman) {
      const months: Record<string, string> = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
      date = `${dHuman[3]}-${months[dHuman[2].toLowerCase()]}-${dHuman[1].padStart(2,"0")}`;
    }
    // Canonicalize URL: OAIC's /s/redirect wrapper carries rotating auth/rank
    // params that break dedup. Store the decoded inner target; non-redirect
    // URLs pass through with only fragment stripped.
    const { canonical } = canonicalizeSourceUrl(href);
    out.push({ title, url: canonical, date });
  }
  // De-dup by url (now canonical)
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // HF2 Task 3 — unconditional function_runs telemetry. Wraps the entire
  // handler so every invocation (including dry-runs and 5xx paths) writes
  // start + finish rows. Fail-open: telemetry errors never block ingestion.
  const fnRun = await startFunctionRun(supabase, "ingest-gov-enforcement", {
    invokedBy: req.headers.get("x-invoked-by") ?? "http",
    metadata: { method: req.method, url_path: new URL(req.url).pathname },
  });
  try {

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }
  const param = (k: string): string | null => {
    const q = url.searchParams.get(k);
    if (q !== null) return q;
    const v = (body as any)[k];
    return v === undefined || v === null ? null : String(v);
  };

  const dryRun = param("dry_run") === "true";
  const ftcPageParam = param("ftc_page");
  const ftcPagesParam = param("ftc_pages");
  const onlyFtc = ftcPageParam !== null || ftcPagesParam !== null;
  const modeRaw = (param("mode") || "backfill").toLowerCase();
  const mode: "backfill" | "monitor" = modeRaw === "monitor" ? "monitor" : "backfill";
  const sourceGroupParam = param("source_group"); // "core" | "us_state" | "canada" | "all" | null
  const sourceKeyParam = param("source"); // exact match on src.source (e.g. "CPPA")
  // SWEEP-2 T3: register-parser filter — accept only register rows whose
  // decisionDate >= sinceDate (ISO YYYY-MM-DD). Applied ONLY to the OAIC
  // register parser; non-register sources ignore this param.
  const sinceDateParam = param("since_date");
  const sinceDate = sinceDateParam && /^\d{4}-\d{2}-\d{2}$/.test(sinceDateParam) ? sinceDateParam : null;

  let ftcPageFilter: Set<number> | null = null;
  if (ftcPageParam !== null) {
    ftcPageFilter = new Set([parseInt(ftcPageParam, 10)]);
  } else if (ftcPagesParam !== null) {
    ftcPageFilter = new Set<number>();
    if (ftcPagesParam.includes("-")) {
      const [a, b] = ftcPagesParam.split("-").map((s) => parseInt(s, 10));
      for (let i = a; i <= b; i++) ftcPageFilter.add(i);
    } else {
      for (const s of ftcPagesParam.split(",")) ftcPageFilter.add(parseInt(s, 10));
    }
  }

  const runStartedAt = new Date();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let legacyUpdated = 0;
  let pdfFound = 0;
  let pdfMissing = 0;
  const summary: Record<string, number> = {};
  const samples: Array<Record<string, unknown>> = [];
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

  const activeSources = SOURCES.filter((s) => {
    if (onlyFtc) {
      if (s.source !== "FTC") return false;
      if (ftcPageFilter && (s.ftcPage === undefined || !ftcPageFilter.has(s.ftcPage))) return false;
      return true;
    }
    if (sourceKeyParam && s.source !== sourceKeyParam) return false;
    if (sourceGroupParam && sourceGroupParam !== "all") {
      const grp = s.sourceGroup || "core";
      if (grp !== sourceGroupParam) return false;
    }
    // In monitor mode, skip multi-page FTC backfill pages (only page 1).
    if (mode === "monitor" && s.ftcPage !== undefined && s.ftcPage > 1) return false;
    // Backfill-only pagination pages: skip in monitor mode.
    if (mode === "monitor" && s.backfillOnly) return false;
    return true;
  });

  for (const src of activeSources) {
    try {
      const md = await jinaFetch(src.url);
      let actions: Array<{ title: string; url: string; date: string | null } & Record<string, unknown>>;

      // ENF-1d: OAIC determinations register — structured parse (subject,
      // citation, date come from register rows). Bypasses generic link
      // extraction and headline gates; the AustLII URL is the canonical anchor.
      if (src.registerParser === "oaic") {
        let rows = parseRegisterDeterminations(md);
        // SWEEP-2 T3: apply since_date gate before action mapping.
        if (sinceDate) {
          const before = rows.length;
          rows = rows.filter((r) => r.decisionDate >= sinceDate);
          console.log(`OAIC Register: since_date=${sinceDate} filter ${before} -> ${rows.length}`);
        }
        actions = rows.map((r) => ({
          title: `${r.headingRaw}`,
          url: r.austliiUrl,
          date: r.decisionDate,
          _registerSubject: r.subject,
          _registerCitation: r.citation,
        }));
        console.log(`OAIC Register: parsed ${actions.length} determinations`);
      } else {
        actions = extractActions(md, src);
      }

      // FTC cases-and-proceedings index pages: filter to real case-detail
      // links (nav, footer, blog, and policy links share the ftc.gov host).
      // Uses the shared isFtcEnforcementUrl gate so the same rule protects
      // the crawler and the corpus-cleanup path in us-ingest.ts.
      if (src.secondHop && src.source === "FTC") {
        const before = actions.length;
        actions = actions.filter((a) => isFtcEnforcementUrl(a.url));
        console.log(`FTC url gate: ${before} -> ${actions.length}`);
      }

      // HHS OCR: only /hipaa/for-professionals/compliance-enforcement/
      // {agreements,examples,enforcement-highlights,enforcement-by-state}/
      // case pages are enforcement. Everything else (nav, grant pages,
      // accessibility statements, news, index landing pages) is dropped.
      // This is the ENF-1c gate — prevents the legacy junk that populated
      // 302 HHS OCR rows from being re-ingested after cleanup.
      if (src.source === "HHS-OCR") {
        const before = actions.length;
        actions = actions.filter((a) => isHhsOcrEnforcementUrl(a.url));
        console.log(`HHS-OCR url gate: ${before} -> ${actions.length}`);
      }

      // Generalist press-release feeds: keep only privacy-relevant titles.
      // OAIC gets a stricter enforcement-class gate (findings/orders/penalties/
      // undertakings) so statements, communiqués, awareness weeks, exposure
      // drafts, sweeps, guidance, and joint-oversight announcements are dropped.
      if (src.requireRelevance && !src.registerParser) {
        const before = actions.length;
        const gate = src.source === "OAIC" ? isOaicEnforcementTitle : isTitleRelevant;
        actions = actions.filter((a) => gate(a.title));
        console.log(`${src.source}: relevance filter ${before} -> ${actions.length}`);
      }

      // L2 — content-type URL blacklist applied to every source. Register
      // parser rows come from a structured feed and are exempt.
      if (!src.registerParser) {
        const before = actions.length;
        actions = actions.filter((a) => !isNonEnforcementUrl(a.url));
        if (before !== actions.length) {
          console.log(`${src.source}: content-type url gate ${before} -> ${actions.length}`);
        }
      }




      summary[`${src.source}${src.ftcPage !== undefined ? `:p${src.ftcPage}` : ""}`] = actions.length;
      console.log(`${src.source}${src.ftcPage !== undefined ? ` page=${src.ftcPage}` : ""}: ${actions.length} candidate actions`);

      // Second-hop enrichment for FTC case summaries.
      if (src.secondHop) {
        for (const a of actions) {
          await new Promise((r) => setTimeout(r, 1000));
          const detail = await extractDecisionAndOrderDetail(a.url);
          const pdfUrl = detail ? detail.url : null;
          (a as any).primarySourceUrl = pdfUrl;
          if (pdfUrl) pdfFound++; else pdfMissing++;
          if (samples.length < 10) {
            samples.push({
              title: a.title,
              case_url: a.url,
              decision_pdf_url: pdfUrl,
              matched_anchor: detail?.anchor ?? null,
              is_fallback: detail?.isFallback ?? null,
              proposed_etid: `${src.source.toLowerCase()}:${a.url}`,
            });
          }
        }
      }


      for (const a of actions) {
        const etid = `${src.source.toLowerCase()}:${a.url}`;
        // HF2 Task 2 — dedup fallback: legacy rows (2026-05-27 backfill and
        // earlier) have NULL etid, so an etid-only lookup misses them and
        // re-inserts. Match on etid OR (regulator, source_url) so any
        // pre-existing row for this URL is caught.
        const canonicalRegulator = normalizeRegulatorLabel(src.regulator) ?? src.regulator;
        const { data: existing } = await supabase
          .from("enforcement_actions")
          .select("id")
          .or(`etid.eq.${etid},and(regulator.eq.${canonicalRegulator},source_url.eq.${a.url})`)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        // ENF-1d: register-row dedup against a same-matter media row.
        // Rule: normalised subject match + decision date within ±30 days.
        // On match → register row is CANONICAL: skip inserting the new
        // register etid (a "merge" of the media row's URL onto a register
        // ingest, rather than a duplicate), and backfill the media row's
        // case_reference + regulator to the register value. The media row's
        // etid stays intact so subscriber-feed history is preserved.
        const registerSubject = (a as { _registerSubject?: string | null })._registerSubject ?? null;
        const registerCitation = (a as { _registerCitation?: string })._registerCitation ?? null;
        if (src.registerParser === "oaic" && registerSubject && a.date) {
          const targetKey = normalizeEntity(registerSubject);
          const { data: mediaCandidates } = await supabase
            .from("enforcement_actions")
            .select("id, subject, decision_date, case_reference, source_url")
            .eq("regulator", "OAIC")
            .eq("source_database", "OAIC")
            .gte("decision_date", "2025-06-01");
          const match = (mediaCandidates ?? []).find((m) => {
            if (!m.subject || !m.decision_date) return false;
            const nk = normalizeEntity(m.subject);
            if (!nk) return false;
            if (nk !== targetKey && !nk.includes(targetKey) && !targetKey.includes(nk)) return false;
            return datesWithin(String(m.decision_date), a.date!, 30);
          });
          if (match) {
            // Merge: annotate media row with citation; do not insert register etid.
            const patch: Record<string, unknown> = {};
            if (!match.case_reference && registerCitation) patch.case_reference = registerCitation;
            if (Object.keys(patch).length > 0) {
              await supabase.from("enforcement_actions").update(patch).eq("id", match.id);
            }
            skipped++;
            console.log(`OAIC dedup merge: register ${registerCitation} → media row ${match.id} (${match.subject})`);
            continue;
          }
        }

        const fineMatch = a.title.match(/[£$€]\s?([\d,.]+)\s?(million|m|k|thousand)?/i);
        let fine_eur: number | null = null;
        let fine_amount: string | null = null;
        if (fineMatch) {
          fine_amount = fineMatch[0];
          let n = parseFloat(fineMatch[1].replace(/,/g, ""));
          if (/million|m\b/i.test(fineMatch[2] || "")) n *= 1_000_000;
          if (/thousand|k\b/i.test(fineMatch[2] || "")) n *= 1_000;
          if (!isNaN(n)) fine_eur = n;
        }

        const primarySourceUrl = (a as any).primarySourceUrl ?? null;
        // ENF-1c: deterministic subject extraction per regulator. Falls back
        // to null (never a headline copy) so downstream UI shows the correct
        // "Undisclosed entity" rendering for genuinely anonymized cases.
        // ENF-1d: register subject wins when present (comes from the
        // structured register row, not from a headline pattern guess).
        let extractedSubject: string | null = null;
        if (src.registerParser === "oaic") extractedSubject = registerSubject;
        else if (src.source === "OAIC") extractedSubject = extractOaicSubject(a.title);
        else if (src.source === "FTC") extractedSubject = extractFtcSubject(a.title);
        else if (src.source === "HHS-OCR") extractedSubject = extractHhsSubject(a.title);
        // L3 — generic title-based fallback for regulators without a
        // dedicated extractor. Keeps subject deterministic (no LLM).
        if (!extractedSubject) extractedSubject = deriveGenericSubject(a.title);

        // L3 — reject rows that never resolve a subject. These are the
        // rows that previously rendered as "Undisclosed entity". Skip the
        // insert entirely; count as skipped so the run summary reflects it.
        // SWEEP-2 T10: register-parser rows are EXEMPT from this null-skip.
        // A structured register row with subject=null is a genuinely
        // anonymized formal determination (e.g. "'AXF' and 'AXG'") — it
        // must be inserted so the register remains complete. The row is
        // stamped verification_status='requires_review' so downstream read
        // paths can hide it by default until moderator review.
        if (!extractedSubject && src.registerParser !== "oaic") {
          skipped++;
          continue;
        }

        const baseRow: Record<string, unknown> = {
          etid,
          source_database: src.source,
          source_url: a.url,
          // ENF-1c Task 4: canonical short labels (e.g. "FTC" not
          // "Federal Trade Commission (FTC)").
          regulator: normalizeRegulatorLabel(src.regulator) ?? src.regulator,
          jurisdiction: src.jurisdiction,
          law: src.law,
          subject: extractedSubject,
          violation: a.title,
          decision_date: a.date,
          fine_amount,
          fine_eur,
        };
        if (src.registerParser === "oaic" && registerCitation) {
          baseRow.case_reference = registerCitation;
          baseRow.case_reference_extraction_method = "register_deterministic";
        }
        // SWEEP-2 T10: anonymised register rows insert with subject=null and
        // are marked requires_review so the L1 default hide-null filter
        // masks them from public archive/UI until a moderator resolves.
        if (src.registerParser === "oaic" && !extractedSubject) {
          baseRow.verification_status = "requires_review";
        }
        if (src.secondHop) {
          baseRow.primary_source_url = primarySourceUrl;
          baseRow.primary_source_status = primarySourceUrl ? "pending_fetch" : "pending_discovery";
          baseRow.primary_source_url_discovered_at = new Date().toISOString();
          baseRow.legacy_enrichment_version = 2;
        }


        if (dryRun) {
          inserted++; // count would-be inserts
          // Legacy match preview
          if (src.secondHop && a.title && a.title.length > 20) {
            const { data: legacyRows } = await supabase
              .from("enforcement_actions")
              .select("id")
              .eq("regulator", "FTC")
              .is("primary_source_url", null)
              .ilike("violation", `%${a.title.slice(0, 40)}%`)
              .limit(1);
            if (legacyRows && legacyRows.length > 0) legacyUpdated++;
          }
          continue;
        }

        const { data: insertedEA, error } = await supabase
          .from("enforcement_actions")
          .insert(baseRow)
          .select("id")
          .single();

        if (error || !insertedEA) {
          errors++;
          console.error("insert enforcement_actions", etid, error?.message ?? "no data returned");
          continue;
        }
        inserted++;
        const enforcementActionId: string | null = insertedEA.id ?? null;

        // Legacy dedup: link case_url + primary PDF onto a matching legacy row.
        if (src.secondHop && a.title && a.title.length > 20) {
          const { data: legacyRows } = await supabase
            .from("enforcement_actions")
            .select("id, violation, source_url")
            .eq("regulator", "FTC")
            .is("primary_source_url", null)
            .ilike("violation", `%${a.title.slice(0, 40)}%`)
            .limit(1);
          if (legacyRows && legacyRows.length > 0) {
            const { error: updErr } = await supabase
              .from("enforcement_actions")
              .update({
                source_url: a.url,
                primary_source_url: primarySourceUrl,
                primary_source_status: primarySourceUrl ? "pending_fetch" : "pending_discovery",
                primary_source_url_discovered_at: new Date().toISOString(),
              })
              .eq("id", legacyRows[0].id);
            if (!updErr) legacyUpdated++;
          }
        }

        // Dual-write to updates table (skip for FTC second-hop scrape: cases
        // index entries aren't suitable for the subscriber feed — handled by
        // existing weekly brief pipeline instead).
        //
        // SOURCE FIDELITY (Function 2 overhaul): the previous implementation
        // passed `a.title` as both title AND description to generateUpdateSummary,
        // causing the model to fabricate decision specifics from a headline.
        // `extractActions()` only returns {title, url, date} — no body text.
        // Until a body-fetch step is wired into this path (TODO: extend
        // fetch-and-extract-primary-source to also enrich the updates row),
        // we skip the AI dual-write entirely rather than write hallucinated
        // content. The enforcement_actions row is already stored above with
        // primary_source_status='pending_fetch', and the weekly brief pipeline
        // will pick up enforcement actions independently.
        const bodyText = (a as { bodyText?: string }).bodyText || null;
        if (anthropicKey && !src.secondHop && bodyText && bodyText.trim().length >= 100) {
          try {
            const aiSummary = await generateUpdateSummary(
              a.title, bodyText, src.source, src.regulator, src.jurisdiction, anthropicKey,
            );
            if (aiSummary && aiSummary.legal_weight !== undefined) {
              const updateRow: Record<string, unknown> = {
                url: a.url,
                title: a.title,
                summary: bodyText.slice(0, 2000),
                source_name: src.source,
                source_url: src.url,
                category: "enforcement",
                published_at: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
                source_tier: 1,
                legal_weight: aiSummary.legal_weight ?? "Enforcement",
                attention_level: aiSummary.attention_level ?? "High",
                why_it_matters_short: aiSummary.why_it_matters_short ?? null,
                why_it_matters: aiSummary.why_it_matters ?? null,
                compliance_impact: aiSummary.compliance_impact ?? null,
                takeaways: aiSummary.takeaways ?? [],
                affected_jurisdictions: aiSummary.affected_jurisdictions ?? [],
                regulatory_theory: aiSummary.regulatory_theory ?? null,
                action_items: aiSummary.action_items ?? [],
                defense_considerations: aiSummary.defense_considerations ?? null,
                entities: aiSummary.entities ?? {},
                ai_summary: aiSummary,
                enforcement_action_id: enforcementActionId,
                key_date: typeof aiSummary.key_date === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(aiSummary.key_date as string)
                  ? aiSummary.key_date : null,
                direct_jurisdictions: Array.isArray(aiSummary.affected_jurisdictions)
                  ? aiSummary.affected_jurisdictions : [],
              };
              const { error: updateErr } = await supabase
                .from("updates")
                .upsert(updateRow, { onConflict: "url", ignoreDuplicates: true });
              if (updateErr) console.error("dual-write updates failed", a.url, updateErr.message);
            }
          } catch (aiErr) {
            console.error("generateUpdateSummary failed", a.url, aiErr);
          }
        } else if (anthropicKey && !src.secondHop) {
          // Body text not available — skip dual-write rather than fabricate from headline.
          console.log(`[ingest-gov-enforcement] skip dual-write (no body): ${a.url}`);
        }
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors++;
      console.error(src.source, (e as Error).message);
    }
  }

  const runCompletedAt = new Date();
  const durationMs = runCompletedAt.getTime() - runStartedAt.getTime();
  const finalResult = {
    dry_run: dryRun,
    mode,
    source_group: sourceGroupParam,
    source: sourceKeyParam,
    ftc_pages: ftcPageFilter ? [...ftcPageFilter] : null,
    duration_ms: durationMs,
    inserted, skipped, errors, legacy_updated: legacyUpdated,
    pdf_found: pdfFound, pdf_missing: pdfMissing,
    summary, samples,
  };
  console.log("FINAL_RESULT", JSON.stringify(finalResult));

  if (!dryRun) {
    try {
      await supabase.from("ingest_run_log").insert({
        mode,
        source_group: sourceGroupParam || (onlyFtc ? "ftc" : "all"),
        started_at: runStartedAt.toISOString(),
        completed_at: runCompletedAt.toISOString(),
        duration_ms: durationMs,
        inserted, skipped, errors,
        per_source: summary,
        notes: sourceKeyParam ? `source=${sourceKeyParam}` : null,
      });
    } catch (logErr) {
      console.error("ingest_run_log insert failed", (logErr as Error).message);
    }
  }

    await finishFunctionRun(supabase, fnRun, {
      status: errors > 0 ? "partial" : "success",
      sourceTable: "enforcement_actions",
      metadata: {
        dry_run: dryRun, mode, source_group: sourceGroupParam, source: sourceKeyParam,
        inserted, skipped, errors, legacy_updated: legacyUpdated,
        pdf_found: pdfFound, pdf_missing: pdfMissing,
      },
    });

    return new Response(JSON.stringify(finalResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    await failFunctionRun(supabase, fnRun, err);
    console.error("ingest-gov-enforcement fatal:", err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

