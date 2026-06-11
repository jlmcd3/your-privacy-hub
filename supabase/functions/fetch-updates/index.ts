import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── DPA Source-to-Jurisdiction Mapping ──────────────────────────────
const DPA_SOURCE_JURISDICTIONS: Record<string, string[]> = {
  // EU Member State DPAs
  'garante.it':             ['italy'],
  'gpdp.it':                ['italy'],
  'garanteprivacy.it':      ['italy'],
  'cnil.fr':                ['france'],
  'bfdi.bund.de':           ['germany'],
  'datenschutz.de':         ['germany'],
  'datenschutz-hamburg.de': ['germany'],
  'aepd.es':                ['spain'],
  'apd-gba.be':             ['belgium'],
  'gegevensbeschermingsautoriteit.be': ['belgium'],
  'autoriteitpersoonsgegevens.nl':     ['netherlands'],
  'datatilsynet.dk':        ['denmark'],
  'datatilsynet.no':        ['norway'],
  'imy.se':                 ['sweden'],
  'tietosuoja.fi':          ['finland'],
  'andmekaitse.ee':         ['estonia'],
  'dvi.gov.lv':             ['latvia'],
  'ada.lt':                 ['lithuania'],
  'uodo.gov.pl':            ['poland'],
  'dataprotection.ie':      ['ireland'],
  'dpc.ie':                 ['ireland'],
  'edps.europa.eu':         ['eu'],
  'edpb.europa.eu':         ['eu'],
  // UK
  'ico.org.uk':             ['united-kingdom'],
  // US Federal
  'ftc.gov':                ['us-federal'],
  'hhs.gov':                ['us-federal'],
  'consumerfinance.gov':    ['us-federal'],
  'congress.gov':           ['us-federal'],
  'federalregister.gov':    ['us-federal'],
  // US State AGs and specific regulators
  'oag.ca.gov':             ['california'],
  'cppa.ca.gov':            ['california'],
  'texasattorneygeneral.gov': ['texas'],
  'ag.ny.gov':              ['new-york'],
  'oag.dc.gov':             ['district-of-columbia'],
  'coag.gov':               ['colorado'],
  'myfloridalegal.com':     ['florida'],
  'atg.wa.gov':             ['washington'],
  'illinoisattorneygeneral.gov': ['illinois'],
  'mass.gov':               ['massachusetts'],
  // Other global authorities
  'gdprhub.eu':             [],
  'pdpc.gov.sg':            ['singapore'],
  'oaic.gov.au':            ['australia'],
  'priv.gc.ca':             ['canada'],
  'anpd.gov.br':            ['brazil'],
  'pipc.go.kr':             ['south-korea'],
  'ppc.go.jp':              ['japan'],
  // Civil society, policy, legal analysis (Batch 1 + 3)
  'noyb.eu':                   ['eu'],
  'out.law':                   ['united-kingdom', 'eu'],
  'euractiv.com':              ['eu'],
  'theregister.com':           ['united-kingdom'],
  'privacyinternational.org':  ['global'],
  'gibsondunn.com':            ['eu', 'united-kingdom'],
  'twobirds.com':              ['eu', 'united-kingdom'],
  'edri.org':                  ['eu'],
  'openrightsgroup.org':       ['united-kingdom'],
  'politico.eu':               ['eu'],
  'dataprotectionauthority.be':['belgium'],
  'cnpd.public.lu':            ['luxembourg'],
  'bsi.bund.de':               ['germany'],
  'uoou.cz':                   ['czech-republic'],
  'bitsoffreedom.nl':          ['netherlands'],
  'statewatch.org':            ['eu'],
  'accessnow.org':             ['global'],
  'cms.law':                   ['global'],
  'cliffordchance.com':        ['global'],
  'aoshearman.com':            ['global'],
  'freshfields.com':           ['global'],
  'hsfnotes.com':              ['global'],
  'insideprivacy.com':         ['us-federal', 'eu', 'united-kingdom'],
};

// Domains that are official DPA or government regulatory sources.
// Articles from these domains with Binding/Enforcement legal weight
// are dual-written to enforcement_actions.
const DPA_OFFICIAL_DOMAINS = new Set([
  "edpb.europa.eu", "cnil.fr", "ico.org.uk", "bfdi.bund.de",
  "garanteprivacy.it", "aepd.es", "autoriteitpersoonsgegevens.nl",
  "datatilsynet.dk", "datatilsynet.no", "imy.se", "cnpd.public.lu",
  "dataprotection.ie", "dpc.ie", "ftc.gov", "consumerfinance.gov",
  "cppa.ca.gov", "texasattorneygeneral.gov", "coag.gov", "portal.ct.gov",
  "oaic.gov.au", "pdpc.gov.sg", "priv.gc.ca", "uodo.gov.pl",
  "gdprhub.eu", "noyb.eu",
]);

// Compute a stable etid for an article URL (matches ingest-gov-enforcement pattern).
async function computeEtid(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// NOTE: Source list audited 2026-05-18, updated 2026-05-19.
// Sources removed because the publisher retired RSS or hard-blocks bot traffic
// (404 / 403 / Cloudflare) and there is no current working replacement via RSS:
//   BfDI, BSI Germany, APD Belgium, AEPD, Hamburg DPA, UOOU Czech, Statewatch,
//   PCPD Hong Kong, ENISA, EUR-Lex (RSSF014 retired), Council of Europe, FCC,
//   Norton Rose Data Protection Report, Linklaters Data Protected (static guide, not a blog),
//   Hogan Lovells, Baker McKenzie, Clifford Chance, Freshfields, HSF Data Notes,
//   Dentons, Greenberg Traurig, Lawfare.
// NOTE: Covington Inside Privacy restored 2026-05-19 (insideprivacy.com/feed confirmed working).
// NOTE: EU Parliament replaced with top-stories XML feed (correct replacement).
// NOTE: The following DPAs have no RSS but are now ingested via ingest-gov-enforcement
//       scraping: OAIC, Datatilsynet DK, Datatilsynet NO, PDPC Singapore, OPC Canada,
//       Texas AG, Colorado AG, HHS OCR.
// NOTE: Bird & Bird, Hogan Lovells, Baker McKenzie, Clifford Chance, Freshfields, HSF,
//       Dentons, and Greenberg Traurig are covered via JD Supra (already in feed) which
//       syndicates content from all of these firms.
// If any removed publishers re-expose an RSS endpoint, re-add here.
// NOTE: OAIC, PDPC Singapore, Datatilsynet Denmark (EN), CNIL, CPPA, and Connecticut AG
// RSS feeds removed — these sources are now fully covered by ingest-gov-enforcement
// which dual-writes to the updates table. FTC RSS and Garante RSS retained as they
// cover different content (press releases vs enforcement cases; docweb decisions vs news pages).
const RSS_SOURCES = [
  // ── EU & UK Regulators / Policy ───────────────────────────────────
  {
    url: "https://www.edpb.europa.eu/feed/news_en",
    source: "EDPB",
    domain: "edpb.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Data Protection Board",
  },
  {
    url: "https://www.bfdi.bund.de/SiteGlobals/Functions/RSSFeed/Allgemein/rssnewsfeed.xml",
    source: "BfDI",
    domain: "bfdi.bund.de",
    defaultCategory: "eu-uk",
    regulator: "Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit",
  },
  {
    url: "https://www.autoriteitpersoonsgegevens.nl/en/rss",
    source: "Dutch AP",
    domain: "autoriteitpersoonsgegevens.nl",
    defaultCategory: "eu-uk",
    regulator: "Autoriteit Persoonsgegevens",
  },
  {
    url: "https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/rss",
    source: "Garante",
    domain: "garanteprivacy.it",
    defaultCategory: "eu-uk",
    regulator: "Garante per la protezione dei dati personali",
  },
  {
    url: "https://www.imy.se/en/news/rss",
    source: "IMY Sweden",
    domain: "imy.se",
    defaultCategory: "eu-uk",
    regulator: "Integritetsskyddsmyndigheten (Swedish DPA)",
  },
  // CNPD Luxembourg removed — no public RSS feed (audit 2026-05). AEM CMS; needs scraper.
  {
    url: "https://www.europarl.europa.eu/rss/doc/top-stories/en.xml",
    source: "EU Parliament",
    domain: "europarl.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Parliament",
  },
  {
    url: "https://www.politico.eu/category/tech/feed/",
    source: "Politico EU Tech",
    domain: "politico.eu",
    defaultCategory: "eu-uk",
    regulator: "Politico Europe",
  },
  {
    url: "https://www.out-law.com/feeds/out-law_roundup.aspx",
    source: "Out-Law",
    domain: "out-law.com",
    defaultCategory: "eu-uk",
    regulator: "Pinsent Masons LLP",
  },
  {
    url: "https://www.theregister.com/security/headlines.atom",
    source: "The Register",
    domain: "theregister.com",
    defaultCategory: "eu-uk",
    regulator: "The Register",
  },

  // ── EU Civil Society ─────────────────────────────────────────────
  {
    url: "https://noyb.eu/en/rss.xml",
    source: "noyb",
    domain: "noyb.eu",
    defaultCategory: "eu-uk",
    regulator: "noyb - European Centre for Digital Rights",
  },
  {
    url: "https://edri.org/feed/",
    source: "EDRi",
    domain: "edri.org",
    defaultCategory: "eu-uk",
    regulator: "European Digital Rights",
  },
  {
    url: "https://www.openrightsgroup.org/feed/",
    source: "Open Rights Group",
    domain: "openrightsgroup.org",
    defaultCategory: "eu-uk",
    regulator: "Open Rights Group",
  },
  {
    url: "https://www.bitsoffreedom.nl/feed/",
    source: "Bits of Freedom",
    domain: "bitsoffreedom.nl",
    defaultCategory: "eu-uk",
    regulator: "Bits of Freedom",
    language: "nl",
  },
  {
    url: "https://privacyinternational.org/rss.xml",
    source: "Privacy International",
    domain: "privacyinternational.org",
    defaultCategory: "global",
    regulator: "Privacy International",
  },

  // ── U.S. Federal ──────────────────────────────────────────────────
  {
    url: "https://www.ftc.gov/feeds/press-release.xml",
    source: "FTC",
    domain: "ftc.gov",
    defaultCategory: "us-federal",
    regulator: "Federal Trade Commission",
  },
  {
    url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
    source: "NIST",
    domain: "nist.gov",
    defaultCategory: "us-federal",
    regulator: "NIST",
  },
  {
    url: "https://www.consumerfinance.gov/about-us/newsroom/feed/",
    source: "CFPB",
    domain: "consumerfinance.gov",
    defaultCategory: "us-federal",
    regulator: "Consumer Financial Protection Bureau",
  },
  {
    url: "https://www.hipaajournal.com/feed/",
    source: "HIPAA Journal",
    domain: "hipaajournal.com",
    defaultCategory: "us-federal",
    regulator: "HIPAA Journal",
  },
  {
    url: "https://www.huntonprivacyblog.com/feed/",
    source: "Hunton Privacy Blog",
    domain: "hunton.com",
    defaultCategory: "us-federal",
    regulator: "Hunton Andrews Kurth",
  },
  {
    url: "https://alstonprivacy.com/feed",
    source: "Alston Privacy",
    domain: "alstonprivacy.com",
    defaultCategory: "us-federal",
    regulator: "Alston & Bird LLP",
  },
  {
    url: "https://www.wilmerhale.com/insights/blogs/wilmerhale-privacy-and-cybersecurity-law?format=rss",
    source: "WilmerHale Privacy",
    domain: "wilmerhale.com",
    defaultCategory: "us-federal",
    regulator: "WilmerHale LLP",
  },
  {
    url: "https://epic.org/feed/",
    source: "EPIC",
    domain: "epic.org",
    defaultCategory: "us-federal",
    regulator: "Electronic Privacy Information Center",
  },

  // ── U.S. State Regulators ─────────────────────────────────────────
  // (CPPA and Connecticut AG RSS removed — covered by ingest-gov-enforcement.)


  // ── Global Law Firm / Industry Analysis ──────────────────────────
  {
    url: "https://iapp.org/feeds/daily_dashboard/",
    source: "IAPP",
    domain: "iapp.org",
    defaultCategory: "global",
    regulator: "International Association of Privacy Professionals",
  },
  {
    url: "https://iapp.org/news/feed/",
    source: "IAPP News",
    domain: "iapp.org",
    defaultCategory: "global",
    regulator: "International Association of Privacy Professionals",
  },
  {
    url: "https://fpf.org/feed/",
    source: "FPF",
    domain: "fpf.org",
    defaultCategory: "global",
    regulator: "Future of Privacy Forum",
  },
  {
    url: "https://www.jdsupra.com/topics/privacy-concerns/feed/",
    source: "JD Supra Privacy",
    domain: "jdsupra.com",
    defaultCategory: "global",
    regulator: "JD Supra",
  },
  {
    url: "https://datamatters.sidley.com/feed",
    source: "Sidley Data Matters",
    domain: "datamatters.sidley.com",
    defaultCategory: "global",
    regulator: "Sidley Austin LLP",
  },
  {
    url: "https://privacymatters.dlapiper.com/feed/",
    source: "DLA Piper Privacy Matters",
    domain: "dlapiper.com",
    defaultCategory: "global",
    regulator: "DLA Piper LLP",
  },
  {
    url: "https://www.insideprivacy.com/feed/",
    source: "Covington Inside Privacy",
    domain: "insideprivacy.com",
    defaultCategory: "global",
    regulator: "Covington & Burling LLP",
  },
  {
    url: "https://www.aoshearman.com/en/insights/rss",
    source: "A&O Shearman",
    domain: "aoshearman.com",
    defaultCategory: "global",
    regulator: "A&O Shearman LLP",
  },
  {
    url: "https://www.cms-lawnow.com/rss/data-protection-privacy",
    source: "CMS Law-Now Privacy",
    domain: "cms-lawnow.com",
    defaultCategory: "global",
    regulator: "CMS Law",
  },
  {
    url: "https://gdprhub.eu/index.php?title=Special:RecentChanges&feed=rss",
    source: "GDPRhub",
    domain: "gdprhub.eu",
    defaultCategory: "enforcement",
    regulator: "GDPRhub (multi-DPA)",
  },

  // ── AdTech & Advertising Privacy ─────────────────────────────────
  {
    url: "https://www.adexchanger.com/feed/",
    source: "AdExchanger",
    domain: "adexchanger.com",
    defaultCategory: "adtech",
    regulator: "AdExchanger",
  },
  {
    url: "https://iabeurope.eu/feed/",
    source: "IAB Europe",
    domain: "iabeurope.eu",
    defaultCategory: "adtech",
    regulator: "IAB Europe",
  },
  {
    url: "https://www.iab.com/blog/feed/",
    source: "IAB Blog",
    domain: "iab.com",
    defaultCategory: "adtech",
    regulator: "Interactive Advertising Bureau",
  },
  {
    url: "https://www.nai.me/blog/feed/",
    source: "NAI",
    domain: "nai.me",
    defaultCategory: "adtech",
    regulator: "Network Advertising Initiative",
  },
  {
    url: "https://digitalcontentnext.org/feed/",
    source: "DCN",
    domain: "digitalcontentnext.org",
    defaultCategory: "adtech",
    regulator: "Digital Content Next",
  },
  {
    url: "https://www.performancein.com/feed/",
    source: "Performance IN",
    domain: "performancein.com",
    defaultCategory: "adtech",
    regulator: "Performance IN",
  },
  {
    url: "https://clearcode.cc/blog/feed/",
    source: "Clearcode",
    domain: "clearcode.cc",
    defaultCategory: "adtech",
    regulator: "Clearcode",
  },
  {
    url: "https://digiday.com/feed/",
    source: "Digiday",
    domain: "digiday.com",
    defaultCategory: "adtech",
    regulator: "Digiday",
  },
  {
    url: "https://www.cpcstrategy.com/blog/feed/",
    source: "Tinuiti Blog",
    domain: "tinuiti.com",
    defaultCategory: "adtech",
    regulator: "Tinuiti",
  },
  {
    url: "https://www.martechalliance.com/stories?format=rss",
    source: "MarTech Alliance",
    domain: "martechalliance.com",
    defaultCategory: "adtech",
    regulator: "MarTech Alliance",
  },

  // ── AI Governance ────────────────────────────────────────────────
  {
    url: "https://www.adalovelaceinstitute.org/feed/",
    source: "Ada Lovelace Institute",
    domain: "adalovelaceinstitute.org",
    defaultCategory: "ai-privacy",
    regulator: "Ada Lovelace Institute",
  },
  {
    url: "https://algorithmwatch.org/en/feed/",
    source: "AlgorithmWatch",
    domain: "algorithmwatch.org",
    defaultCategory: "ai-privacy",
    regulator: "AlgorithmWatch",
  },

  // ── Global Civil Society & Policy ────────────────────────────────
  {
    url: "https://www.eff.org/rss/updates.xml",
    source: "EFF",
    domain: "eff.org",
    defaultCategory: "global",
    regulator: "Electronic Frontier Foundation",
  },
  {
    url: "https://www.accessnow.org/feed/",
    source: "Access Now",
    domain: "accessnow.org",
    defaultCategory: "global",
    regulator: "Access Now",
  },
  {
    url: "https://techpolicy.press/feed/",
    source: "Tech Policy Press",
    domain: "techpolicy.press",
    defaultCategory: "global",
    regulator: "Tech Policy Press",
  },

  // ── Additional EU/EEA DPAs ───────────────────────────────────────
  // Removed (no public RSS, audit 2026-05): ICO, DPC Ireland, AEPD Spain,
  // Datatilsynet Norway, APD/GBA Belgium, UODO Poland, DSB Austria, NAIH Hungary.
  // These regulators expose only HTML news pages and require dedicated scrapers.
  {
    url: "https://www.datatilsynet.dk/presse-og-nyheder/nyheder/rss",
    source: "Datatilsynet Denmark",
    domain: "datatilsynet.dk",
    defaultCategory: "eu-uk",
    regulator: "Datatilsynet (Denmark DPA)",
    language: "da",
  },
  {
    url: "https://www.personvernbloggen.no/feed",
    source: "Personvernbloggen (Datatilsynet NO)",
    domain: "personvernbloggen.no",
    defaultCategory: "eu-uk",
    regulator: "Datatilsynet (Norway DPA) — editorial blog",
    language: "no",
  },

  // ── Additional International Regulators ──────────────────────────
  // OAIC and PDPC Singapore RSS removed — covered by ingest-gov-enforcement.
  // PPC Japan and ANPD Brazil removed (no working RSS, audit 2026-05). Need scrapers.
  {
    url: "https://www.privacy.org.nz/about-us/news/rss/",
    source: "OPC New Zealand",
    domain: "privacy.org.nz",
    defaultCategory: "global",
    regulator: "Office of the Privacy Commissioner (New Zealand)",
  },

  // ── Additional U.S. Federal ──────────────────────────────────────
  {
    url: "https://www.sec.gov/news/pressreleases.rss",
    source: "SEC Press",
    domain: "sec.gov",
    defaultCategory: "us-federal",
    regulator: "U.S. Securities and Exchange Commission",
  },
  {
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    source: "CISA Advisories",
    domain: "cisa.gov",
    defaultCategory: "us-federal",
    regulator: "Cybersecurity and Infrastructure Security Agency",
  },
  // HHS OCR and FCC Headlines removed (WAF/geo blocks return 403/timeout, audit 2026-05).
  {
    url: "https://www.dfs.ny.gov/rss/press",
    source: "NY DFS",
    domain: "dfs.ny.gov",
    defaultCategory: "us-states",
    regulator: "New York Department of Financial Services",
  },

  // ── Cyber / Breach Intelligence ──────────────────────────────────
  {
    url: "https://krebsonsecurity.com/feed/",
    source: "Krebs on Security",
    domain: "krebsonsecurity.com",
    defaultCategory: "global",
    regulator: "Krebs on Security",
  },
  {
    url: "https://www.schneier.com/blog/atom.xml",
    source: "Schneier on Security",
    domain: "schneier.com",
    defaultCategory: "global",
    regulator: "Schneier on Security",
  },
  {
    url: "https://therecord.media/feed",
    source: "The Record",
    domain: "therecord.media",
    defaultCategory: "global",
    regulator: "The Record by Recorded Future",
  },
  {
    url: "https://cyberscoop.com/feed/",
    source: "CyberScoop",
    domain: "cyberscoop.com",
    defaultCategory: "global",
    regulator: "CyberScoop",
  },
  {
    url: "https://www.lawfaremedia.org/feeds/articles.rss",
    source: "Lawfare",
    domain: "lawfaremedia.org",
    defaultCategory: "global",
    regulator: "Lawfare",
  },

  // ── AI Policy & Research ─────────────────────────────────────────
  {
    url: "https://ainowinstitute.org/feed",
    source: "AI Now Institute",
    domain: "ainowinstitute.org",
    defaultCategory: "ai-privacy",
    regulator: "AI Now Institute",
  },
  {
    url: "https://cset.georgetown.edu/feed/",
    source: "CSET Georgetown",
    domain: "cset.georgetown.edu",
    defaultCategory: "ai-privacy",
    regulator: "Center for Security and Emerging Technology",
  },
  {
    url: "https://hai.stanford.edu/news/rss.xml",
    source: "Stanford HAI",
    domain: "hai.stanford.edu",
    defaultCategory: "ai-privacy",
    regulator: "Stanford Institute for Human-Centered AI",
  },
  {
    url: "https://www.enisa.europa.eu/front-page-items/news/RSS",
    source: "ENISA",
    domain: "enisa.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Union Agency for Cybersecurity",
  },

  // ── Additional Law Firm Blogs (not in JD Supra) ──────────────────
  // Bird & Bird removed — no public RSS (audit 2026-05). Their insights still surface via JD Supra.
  {
    url: "https://www.lw.com/admin/upload/rss/CPDPRSSFeed.xml",
    source: "Latham CPDP",
    domain: "lw.com",
    defaultCategory: "global",
    regulator: "Latham & Watkins LLP",
  },
  {
    url: "https://www.dataprotectionreport.com/feed/",
    source: "Norton Rose Data Protection Report",
    domain: "dataprotectionreport.com",
    defaultCategory: "global",
    regulator: "Norton Rose Fulbright",
  },
  {
    url: "https://www.privacyworld.blog/feed/",
    source: "Squire Patton Privacy World",
    domain: "privacyworld.blog",
    defaultCategory: "global",
    regulator: "Squire Patton Boggs",
  },
  {
    url: "https://www.mofo.com/rss/insights.xml",
    source: "Morrison Foerster Insights",
    domain: "mofo.com",
    defaultCategory: "global",
    regulator: "Morrison & Foerster LLP",
  },
  {
    url: "https://www.dglaw.com/feed/",
    source: "Davis+Gilbert",
    domain: "dglaw.com",
    defaultCategory: "us-federal",
    regulator: "Davis+Gilbert LLP",
  },
];


const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal": "https://picsum.photos/seed/federal-law/400/200",
  "us-states": "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk": "https://picsum.photos/seed/european-union/400/200",
  "global": "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
  "adtech": "https://picsum.photos/seed/advertising-technology/400/200",
};

function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractAllItems(xml: string): string[] {
  const results: string[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) results.push(match[1]);
  while ((match = entryRegex.exec(xml)) !== null) results.push(match[1]);
  return results;
}

function categorize(title: string, description: string, defaultCat: string): string {
  const text = (title + " " + description).toLowerCase();
  // Litigation-specific detection (check first)
  if (/\b(class action|lawsuit filed|complaint filed|court filing|litigation|bipa|vppa|cipa|wiretap|suit alleges|plaintiffs allege|settlement reached|jury verdict|class certified)\b/.test(text)) return "enforcement";
  // AdTech-specific detection — check BEFORE general enforcement
  if (/\b(adtech|ad tech|real-time bidding|rtb|programmatic|tcf|consent management platform|cmp\b|iab europe|transparency consent framework|third.party cookie|third party cookie|cookie deprecation|cookieless|privacy sandbox|topics api|protected audience|fledge|cookie consent|consent banner|consent signal|behavioral advertising|targeted advertising|ad targeting|ad network|demand.side platform|dsp\b|supply.side platform|ssp\b|data management platform|dmp\b|ad exchange|ad server|pixel tracking|tracking pixel|retargeting|lookalike audience|contextual advertising|identity resolution|first.party data|zero.party data|data clean room|id bridging|unified id|prebid|header bidding|ad fraud|viewability|brand safety|garm\b|nai\b|daa\b|commercial surveillance|behavioral tracking|cross.site tracking|fingerprinting|device fingerprint|supercookie|evercookie)\b/.test(text)) return "adtech";
  // US state regulator detection — catches state AG press releases
  if (/\b(cppa|california privacy protection agency|texas attorney general privacy|colorado attorney general privacy|connecticut attorney general privacy|tdpsa|ctdpa|vcdpa enforcement|cpa enforcement)\b/.test(text)) return "us-states";
  // HIPAA/health enforcement — catches HHS OCR actions
  if (/\b(hhs ocr|office for civil rights|hipaa fine|hipaa penalty|hipaa enforcement|hipaa violation|hipaa settlement|covered entity|protected health information|phi breach)\b/.test(text)) return "us-federal";
  if (/\b(fine|penalty|enforcement action|sued|lawsuit|violation|sanction|prosecut)\b/.test(text)) return "enforcement";
  if (/\b(dpdp act|digital personal data protection|india privacy|pdpc singapore|oaic australia|pipc korea|pdpa thailand|anpd brazil|lgpd enforcement)\b/.test(text)) return "global";
  if (/\b(admt|automated decision.making technology|california delete act|drop system|data broker registry)\b/.test(text)) return "us-states";
  if (/\b(8-k cybersecurity|material cybersecurity incident|sec cyber disclosure)\b/.test(text)) return "enforcement";
  if (/\b(eu ai act|ai act enforcement|high.risk ai|gpai|general purpose ai|ai office)\b/.test(text)) return "ai-privacy";
  if (/\b(duaa|data use and access act|uk data reform)\b/.test(text)) return "eu-uk";
  if (/\b(noyb|max schrems|schrems iii)\b/.test(text)) return "eu-uk";
  if (/\b(cpni|customer proprietary network|fcc privacy|telecom privacy)\b/.test(text)) return "us-federal";
  if (/\b(ai\b|artificial intelligence|machine learning|biometric|facial recognition|deepfake|llm|generative)\b/.test(text)) return "ai-privacy";
  if (/\b(california|texas|virginia|colorado|connecticut|utah|state privacy|cppa|ccpa|cpra|tdpsa|vcdpa)\b/.test(text)) return "us-states";
  if (/\b(ftc|congress|federal privacy|hipaa|coppa|senate|house bill|federal trade)\b/.test(text)) return "us-federal";
  if (/\b(gdpr|edpb|ico|cnil|dpc|european|eu data|uk gdpr|britain|dpa\b)\b/.test(text)) return "eu-uk";
  return defaultCat;
}

function assignTopicTags(title: string, description: string): string[] {
  const text = (title + " " + (description || "")).toLowerCase();
  const tags: string[] = [];
  if (/\b(ai act|ai governance|artificial intelligence|ai regulation|ai policy|algorithmic accountability|foundation model|generative ai|llm|large language model)\b/.test(text)) tags.push("ai-governance");
  if (/\b(data breach|breach notification|incident response|cyber incident|security incident|ransomware|data leak|unauthorized access)\b/.test(text)) tags.push("data-breaches");
  if (/\b(biometric|facial recognition|fingerprint|iris scan|voiceprint|faceprint|face detection)\b/.test(text)) tags.push("biometric-data");
  if (/\b(cross-border|data transfer|international transfer|adequacy decision|standard contractual|binding corporate rules|sccs|bcrs|data localization)\b/.test(text)) tags.push("data-transfers");
  if (/\b(children|child|coppa|age verification|age assurance|minors|under 13|under 16|kids|teen|parental consent)\b/.test(text)) tags.push("children-privacy");
  if (/\b(adtech|ad tech|advertising technology|cookie\b|consent banner|tracking pixel|targeted advertising|behavioral advertising|real-time bidding|rtb\b|programmatic|third.party cookie|third party cookie|consent management|cmp\b|tcf\b|iab europe|iab\b|transparency consent|privacy sandbox|topics api|protected audience|fledge|cookieless|identity resolution|first.party data|zero.party data|data clean room|id bridging|unified id|prebid|header bidding|ad fraud|viewability|brand safety|garm\b|nai\b|daa\b|commercial surveillance|behavioral tracking|cross.site tracking|fingerprinting|device fingerprint|supercookie|demand.side|supply.side|dsp\b|ssp\b|dmp\b|ad exchange|ad server|retargeting|lookalike|contextual advertising)\b/.test(text)) tags.push("adtech");
  if (/\b(bipa|vppa|cipa|wiretap act|class action privacy|privacy litigation|class certified|class settlement)\b/.test(text)) tags.push("privacy-litigation");
  if (/\b(dpdp act|pdpl vietnam|appi japan|pipc|pdpc|oaic|lgpd|pdpa|anpd)\b/.test(text)) tags.push("apac-latam");
  if (/\b(eu ai act|ai act|high-risk ai|gpai|general purpose ai|ai office|foundation model)\b/.test(text)) tags.push("ai-governance");
  if (/\b(data broker|data broker registry|people search|broker opt.out|drop system)\b/.test(text)) tags.push("data-brokers");
  if (/\b(workplace privacy|employee monitoring|employment ai|hr data|workers data)\b/.test(text)) tags.push("workplace-privacy");
  return tags;
}

// Hosts that serve auto-generated headline-card images (text overlaid on a
// branded template). We treat these as no-image so a real fallback is used.
const TEMPLATED_IMAGE_HOSTS = [
  "images.bannerbear.com",
  "bannerbear.com",
  "og-image.vercel.app",
  "dynamic-og-image-generator.vercel.app",
];

function isTemplatedImage(imageUrl: string | null): boolean {
  if (!imageUrl) return false;
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return TEMPLATED_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 EndUserPrivacy-Bot/1.0" },
    });
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const imageUrl = match ? match[1] : null;
    if (isTemplatedImage(imageUrl)) return null;
    return imageUrl;
  } catch {
    return null;
  }
}


function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Decode double-encoded ampersands first (&amp; → &)
    .replace(/&amp;/gi, "&")
    // Remove all HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    // NOTE: previously stripped a leading 1–10 letter "word" here to clean
    // leftover tag fragments like "p ". That was unsafe — all tags are
    // already removed above, so this regex was eating real first words
    // ("We", "On", "FTC", "Issues", "Act", etc.). Removed.
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// Strips RSS/WordPress excerpt boilerplate that legal blogs append to feed
// descriptions (e.g. "Continue Reading", "Read more", "[…]", "The post X
// appeared first on Y").
function cleanRssBoilerplate(text: string): string {
  if (!text) return text;
  let cleaned = text
    // Remove "The post … appeared first on …" WordPress footer
    .replace(/\s*The post\s+.*$/i, "")
    // Remove trailing "Continue Reading" / "Read more" variants
    .replace(/\s*(?:[…\.]{1,3}|\[\s*(?:…|\.{3})\s*\])?\s*(?:Continue\s+reading|Read\s+more|Read\s+the\s+full\s+(?:article|post)|Click\s+here\s+to\s+read\s+more)\s*(?:[→»>\.…]+)?\s*$/i, "")
    // Remove standalone "[…]" / "[...]" excerpt markers
    .replace(/\[\s*(?:…|\.{3})\s*\]/g, "")
    // Decode common HTML entities that survive stripHtml
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…")
    // Normalize smart quotes/dashes for consistent punctuation
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, "—")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    // Fix space before punctuation (e.g. "word ." -> "word.")
    .replace(/\s+([.,;:!?])/g, "$1")
    // Ensure single space after sentence punctuation when followed by a letter
    .replace(/([.,;:!?])([A-Za-z])/g, "$1 $2")
    // Collapse repeated punctuation (e.g. "..", "!!", "?!?" -> single)
    .replace(/([,;:!?])\1+/g, "$1")
    .replace(/\.{4,}/g, "…")
    .trim();

  // Strip dangling orphan punctuation/whitespace at end, then ensure a
  // terminal sentence punctuation mark.
  cleaned = cleaned.replace(/[\s,;:\-—–]+$/g, "").trim();
  if (cleaned.length > 0) {
    // Capitalize first character if it's a lowercase letter
    const first = cleaned.charAt(0);
    if (first >= "a" && first <= "z") {
      cleaned = first.toUpperCase() + cleaned.slice(1);
    }
    // Ensure terminal punctuation
    if (!/[.!?…]$/.test(cleaned)) {
      cleaned += ".";
    }
  }
  return cleaned;
}

function extractLink(itemXml: string): string {
  const linkTag = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (linkTag) return linkTag[1].trim();
  const linkHref = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (linkHref) return linkHref[1].trim();
  const guid = itemXml.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (guid && guid[1].startsWith("http")) return guid[1].trim();
  return "";
}

const REQUIRED_KEYWORDS = [
  "privacy", "data protection", "personal data", "gdpr", "ccpa", "cpra",
  "data breach", "data security", "surveillance", "tracking", "consent",
  "data subject", "data controller", "data processor", "right to erasure",
  "right to access", "opt-out", "opt out", "cookie", "biometric",
  "edpb", "ico ", "cnil", "dpc ", "anpd", "cppa", "ftc ", "nist",
  "information commissioner", "data protection authority", "dpa ",
  "attorney general", "privacy commissioner",
  "lgpd", "pipl", "pdpa", "tdpsa", "vcdpa", "coppa", "hipaa",
  "privacy act", "privacy law", "privacy regulation", "privacy rule",
  "privacy bill", "privacy legislation", "data privacy",
  "privacy fine", "privacy penalty", "privacy enforcement", "privacy violation",
  "privacy lawsuit", "privacy settlement", "privacy investigation",
  "data protection fine", "regulatory action", "enforcement action",
  "ai privacy", "ai regulation", "ai act", "ai data", "facial recognition",
  "generative ai", "llm privacy", "algorithmic", "automated decision",
  "machine learning privacy", "deepfake", "synthetic data",
  // AdTech additions
  "real-time bidding", "programmatic advertising", "consent management",
  "transparency consent framework", "tcf ", "cookie consent",
  "third-party cookie", "behavioral advertising", "targeted advertising",
  "ad targeting", "commercial surveillance", "privacy sandbox",
  "identity resolution", "first-party data", "data clean room",
  "ad exchange", "ad network", "tracking pixel", "retargeting",
  "lookalike audience", "iab europe", "network advertising initiative",
  "digital advertising alliance", "cookieless", "contextual advertising",
  "ad fraud", "cross-site tracking", "browser fingerprinting",
  // New source coverage additions
  "cppa", "california privacy protection", "autoriteit persoonsgegevens",
  "dutch dpa", "aepd", "garante", "bfdi", "hmbbfdi", "hamburg dpa",
  "hhs ocr", "office for civil rights", "hipaa enforcement",
  "tdpsa", "texas data privacy", "colorado privacy", "connecticut privacy",
  "ctdpa", "cpa enforcement", "convention 108", "eur-lex", "gdprhub",
  "linklaters", "fieldfisher",
  // APAC & global regulators
  "dpdp act", "digital personal data protection", "pdpc", "oaic",
  "pipc", "pdpa", "anpd", "lgpd enforcement", "datatilsynet", "noyb",
  // US additions
  "admt", "automated decision making technology",
  "drop system", "data broker registry",
  "8-k cybersecurity", "material cybersecurity incident",
  "cpni", "customer proprietary network",
  // UK & AI
  "duaa", "data use and access act",
  "ai act enforcement", "high-risk ai", "gpai",
];

const EXCLUSION_KEYWORDS = [
  "freedom of information",
  "foia request",
  "public records request",
  "sunshine week",
  "government transparency",
  "net neutrality",
  "section 230",
  "copyright infringement",
  "free speech",
  "first amendment",
  "open source license",
  "patent lawsuit",
  "antitrust",
  "merger review",
  "trade secret",
  "whistleblower",
];

// Patterns that indicate a breach announcement rather than regulatory/legal content
const BREACH_ANNOUNCEMENT_PATTERNS = [
  /\bannounce[sd]?\s+data\s+breach/i,
  /\bdata\s+breach\s+(affects?|impacts?|exposes?|compromises?)\b/i,
  /\bdata\s+breach\s+more\s+than\s+\d/i,
  /\b\d[\d,]+\s+(individuals?|patients?|customers?|records?|accounts?)\s+(affected|exposed|compromised|impacted)/i,
  /\bnotif(y|ies|ied|ying)\s+(patients?|customers?|individuals?|consumers?)\s+(of|about)\s+(a\s+)?data\s+breach/i,
  /\bdata\s+breach\s+(notification|notice|disclosure|report)\b/i,
  /\bsecurity\s+incident\s+(notification|notice|disclosure)\b/i,
  /\b(ransomware|phishing|malware)\s+attack\b/i,
  /\bunauthorized\s+access\s+to\s+(patient|customer|employee|personal)\b/i,
  /\bbreach\s+(litigation|settlement|class\s+action)\b/i,
  /\bsettlement\s+(reached|approved|agreement)\b/i,
  /\bpays?\s+\$[\d.]+[MBK]?\s+to\s+settle\b/i,
  /\bdata\s+breach\s+settlement\b/i,
];

// Patterns indicating the article IS about regulation/law (override breach exclusion)
const REGULATORY_OVERRIDE_PATTERNS = [
  /\b(new|proposed|enacted|signed|passed|amended)\s+(law|bill|regulation|statute|act|rule|ordinance)\b/i,
  /\b(rulemaking|notice of proposed|final rule|enforcement action by)\b/i,
  /\b(guidance|guidelines?|opinion|recommendation)\s+(issued|published|released|adopted)\s+by\b/i,
  /\b(dpa|regulator|authority|commission|commissioner)\s+(issues?|publishes?|announces?|releases?|adopts?)\b/i,
  /\b(fine[sd]?|penalt(y|ies)|sanction[sed]?)\s+(by|from|imposed)\b/i,
  /\b(gdpr|ccpa|cpra|tdpsa|vcdpa|ctdpa|coppa|hipaa|lgpd|pipl|pdpa|dpdp|ai act|duaa)\s+(enforcement|compliance|violation|fine|amendment|update)\b/i,
];

// Patterns indicating non-editorial organizational noise (jobs, events, RFPs, admin)
const NON_EDITORIAL_PATTERNS = [
  /\b(internship|intern\s+(program|opportunity|position)|apprenticeship)\b/i,
  /\b(we[''']re\s+hiring|now\s+hiring|join\s+(our|the)\s+team|career\s+opportunit|job\s+(opening|vacancy|posting)|vacancy|vacancies)\b/i,
  /\b(open\s+position|positions?\s+available|recruiting\s+for|apply\s+(now|today|by))\b/i,
  /\b(call\s+for\s+(papers|proposals|nominations|speakers|applications)|cfp\b|request\s+for\s+(proposals?|tender|quotation)|rfp\b|rft\b|rfq\b)\b/i,
  /\b(save\s+the\s+date|register\s+(now|today)\s+for|webinar\s+invitation|event\s+registration|tickets?\s+on\s+sale)\b/i,
  /\b(annual\s+report|membership\s+(renewal|drive)|board\s+(election|elections|nomination))\b/i,
  /\b(newsletter\s+sign[\s-]?up|subscribe\s+to\s+our)\b/i,
];

// First-person "we updated our privacy policy" company announcements — pure noise.
// Tight patterns: require possessive "our" or first-person verb so we don't catch
// regulator pieces like "ICO updates UK GDPR guidance" or "FTC rule on privacy policies".
const POLICY_UPDATE_NOTICE_PATTERNS = [
  /\b(we|we[''']ve|we\s+have|we\s+are|we[''']re)\s+(updated|updating|revised|revising|changed|changing|made\s+changes\s+to)\s+(our|the)\s+privacy\s+(policy|notice|statement)\b/i,
  /\b(update|updates|changes|revision|amendment)s?\s+to\s+(our|the)\s+privacy\s+(policy|notice|statement)\b/i,
  /\b(our|the)\s+(new|updated|revised)\s+privacy\s+(policy|notice|statement)\b/i,
  /\bnotice\s+of\s+(changes?|updates?|amendments?)\s+to\s+(our|the)?\s*privacy\s+(policy|notice|statement)\b/i,
  /^\s*privacy\s+(policy|notice|statement)\s+(update|notice|change|revision)s?\s*$/i,
];

function isNonEditorial(title: string, description: string): boolean {
  const text = title + " " + (description || "");
  if (NON_EDITORIAL_PATTERNS.some(p => p.test(text))) return true;
  if (POLICY_UPDATE_NOTICE_PATTERNS.some(p => p.test(text))) return true;
  return false;
}

function isRelevant(title: string, description: string): boolean {
  const text = (title + " " + (description || "")).toLowerCase();
  const titleLower = title.toLowerCase();

  // Drop non-editorial organizational noise (job postings, events, RFPs)
  if (isNonEditorial(title, description)) return false;

  // Check for breach announcements first — these are NOT regulatory content
  const isBreach = BREACH_ANNOUNCEMENT_PATTERNS.some(p => p.test(title + " " + (description || "")));
  if (isBreach) {
    // Only keep if it's actually about a regulation/enforcement response to breaches
    const isRegulatory = REGULATORY_OVERRIDE_PATTERNS.some(p => p.test(title + " " + (description || "")));
    if (!isRegulatory) return false;
  }

  const TITLE_KEYWORDS = [
    "privacy", "data protection", "gdpr", "ccpa", "cpra",
    "enforcement", "fine", "penalty", "regulator", "dpa", "ico ", "edpb",
    "cnil", "ftc ", "cppa", "lgpd", "pipl", "ai act", "biometric",
    "personal data", "surveillance law", "data security", "privacy law",
    "consent", "data transfer", "privacy regulation",
    "adtech", "ad tech", "cookie consent", "tcf", "programmatic",
    "real-time bidding", "behavioral advertising", "commercial surveillance",
    "third-party cookie", "privacy sandbox", "consent management", "iab ",
    "ad targeting", "tracking pixel",
    "cppa", "texas ag", "colorado ag", "hhs ocr", "garante", "aepd",
    "dutch ap", "bfdi", "gdprhub", "convention 108",
    "tdpsa", "ctdpa", "hipaa enforcement", "data (use and access)",
    "digital markets act", "dma ", "eur-lex",
    // Regulatory-specific terms (exclude generic breach terms)
    "new law", "new regulation", "proposed rule", "final rule",
    "rulemaking", "legislative", "statute", "enacted", "compliance",
  ];
  const titleHasKeyword = TITLE_KEYWORDS.some(k => titleLower.includes(k));
  if (!titleHasKeyword) return false;

  const isExcluded = EXCLUSION_KEYWORDS.some(k => text.includes(k));
  if (isExcluded) return false;

  const matchCount = REQUIRED_KEYWORDS.filter(k => text.includes(k.toLowerCase())).length;
  return matchCount >= 2;
}

// ── Throttle & Retry helpers ───────────────────────────────────────
const AI_CALL_DELAY_MS = 500; // minimum ms between Anthropic calls
let lastAiCallTime = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastAiCallTime;
  if (elapsed < AI_CALL_DELAY_MS) {
    await new Promise(r => setTimeout(r, AI_CALL_DELAY_MS - elapsed));
  }
  lastAiCallTime = Date.now();
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await throttle();
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const backoff = Math.max(retryAfter * 1000, 1000 * Math.pow(2, attempt));
      console.warn(`Anthropic 429 — retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

// ── Source tier classification (Batch 4B) ───────────────────────────
// 1 = official regulators/courts/government
// 2 = law-firm analysis & legal commentary
// 3 = media, civil society, industry trade press (default)
const TIER_1_DOMAINS = [
  "edpb.europa.eu", "cnil.fr", "ico.org.uk", "ftc.gov", "nist.gov", "hhs.gov",
  "cppa.ca.gov", "texasattorneygeneral.gov", "coag.gov", "portal.ct.gov",
  "consumerfinance.gov", "bfdi.bund.de", "bsi.bund.de",
  "autoriteitpersoonsgegevens.nl", "aepd.es", "dataprotectionauthority.be",
  "cnpd.public.lu", "datatilsynet.dk", "imy.se", "uoou.cz",
  "datenschutz-hamburg.de", "garanteprivacy.it", "eur-lex.europa.eu",
  "coe.int", "oaic.gov.au", "pdpc.gov.sg", "priv.gc.ca", "pcpd.org.hk",
  "gdprhub.eu",
];
const TIER_2_DOMAINS = [
  "huntonprivacyblog.com", "hunton.com", "out-law.com", "twobirds.com",
  "cms.law", "cliffordchance.com", "aoshearman.com", "freshfields.com",
  "hsfnotes.com", "dataprotectionreport.com", "linklaters.com",
  "wilmerhale.com", "insideprivacy.com", "datamatters.sidley.com",
  "dlapiper.com", "gtlaw-dataprivacydish.com", "alstonprivacy.com",
  "privacyandcybersecuritylaw.com", "hoganlovells.com", "bakermckenzie.com",
  "jdsupra.com",
];
function inferSourceTier(source: { domain?: string; tier?: number }): 1 | 2 | 3 {
  if (source.tier === 1 || source.tier === 2 || source.tier === 3) return source.tier;
  const d = (source.domain || "").toLowerCase();
  if (TIER_1_DOMAINS.some(t => d.includes(t))) return 1;
  if (TIER_2_DOMAINS.some(t => d.includes(t))) return 2;
  return 3;
}

// ── Enrichment quality validation (Batch 4C) ────────────────────────
function assessEnrichmentQuality(aiSummary: any, entities: any): "high" | "standard" | "low" {
  if (!aiSummary) return "low";
  const hasRegulator = (entities?.regulators?.length ?? 0) > 0 ||
    /\b(ICO|EDPB|CNIL|FTC|CPPA|BfDI|Garante|AEPD|DPC|DPA|supervisory authority)\b/i
      .test(aiSummary.why_it_matters_short ?? "");
  const hasLawRef = /(Article|Art\.|GDPR|CCPA|CPRA|BIPA|§|Regulation)\s*\d*/i
    .test(aiSummary.why_it_matters ?? "");
  const hasSpecificAction = (aiSummary.action_items ?? [])
    .some((a: any) => /(Article|§|GDPR|CCPA|CPRA|ICO|EDPB|CNIL|FTC)/i.test(a?.action ?? ""));
  if (hasRegulator && hasLawRef && hasSpecificAction) return "high";
  if (hasRegulator || hasLawRef) return "standard";
  return "low";
}

// ── Contextual teaser generation (Batch 4D) ─────────────────────────
async function generateContextualTeaser(
  whyShort: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const prompt = `Given this regulatory development: "${whyShort}"

Write ONE sentence (max 30 words) that describes the TYPE of contextual intelligence available — name the specific jurisdiction or regulator and the nature of the insight (divergence from prior enforcement, confirmation of emerging trend, novel regulatory theory, relevant historical precedent).
DO NOT reveal the specific content. The reader should understand the insight is real and specific but not be able to act on it without subscribing.
WRONG: "This development reveals an important pattern in EU enforcement practices that has significant implications for data processors."
RIGHT: "The CNIL's position here diverges from both the EDPB and ICO, creating a jurisdiction-specific compliance gap for organisations operating across all three."
Return only the sentence, no quotes, no preamble.`;
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "");
    if (text.length > 20 && text.length < 240) return text;
    return null;
  } catch {
    return null;
  }
}

// ── AI Summary Generation ──────────────────────────────────────────
async function generateAISummary(
  title: string,
  summary: string,
  sourceName: string,
  apiKey: string,
  sourceTier: 1 | 2 | 3 = 3,
  publishedAt: string = new Date().toISOString(),
): Promise<Record<string, unknown> | null> {
  const todayDay = new Date().toISOString().slice(0, 10);
  const pubDate = new Date(publishedAt);
  const pubDay = isNaN(pubDate.getTime()) ? todayDay : pubDate.toISOString().slice(0, 10);
  const dateContext = `DATE CONTEXT: Today's date is ${todayDay}. This article was published on ${pubDay}. Every date you write must be consistent with these. If the source text does not state an explicit year for an event, refer to the event by month or relative phrasing WITHOUT guessing a year. Never date the article's own events to a year earlier than its publication date.\n\n`;

  const systemPrompt = `You are a privacy regulatory intelligence analyst processing articles for a professional-grade compliance platform serving Data Protection Officers, General Counsel, and privacy lawyers at multinational organizations.

Your task: analyze each article and return a single valid JSON object. Return ONLY the JSON — no preamble, no markdown, no explanation. Return {"skip": true} for non-privacy articles, or the full enrichment object for privacy articles.

GOVERNING PRINCIPLES — apply without exception:

SOURCE FIDELITY: Every specific factual claim — fine amounts, deadlines, case reference numbers, regulatory instrument names, named decision outcomes — must appear verbatim in the provided article text. If a specific fact is not in the article text, return null for that field. Do not infer facts from regulatory context. Do not use training knowledge to supply facts the article does not state.

SOURCE CALIBRATION: Match your voice to your source.
- Primary regulator source (official DPA website, government publication): write in direct declarative voice. "The ICO fined X £Y for Z."
- Legal analysis source (law firm blog, IAPP, legal commentary): use explicit attribution. "According to [source], ..." or "As reported by [source], ..."
- Media/civil society source: use attribution. "Coverage of this development suggests..." or "[Source] reports that..."
Never present a secondary source's interpretation as if it were the primary regulator's position.

NO SPECULATION: Do not predict regulatory outcomes, future enforcement, or what regulators are "likely" to do. The only permitted forward-looking statements are deadlines explicitly stated in the article text with a specific date.

THIN SOURCE DISCIPLINE: If the article text is a short RSS summary (under 150 words), you will have insufficient basis for specific action items, case references, or deadline claims. Return null or [] for fields that cannot be grounded in what is actually written. It is correct to produce a minimal enrichment object. It is wrong to fabricate specificity. NOTE: the validator requires why_it_matters (>= 10 chars), compliance_impact (>= 5 chars), and takeaways (>= 1 non-empty string). For thin sources, write GENERAL versions of these — do not invent specifics to fill them.

QUALITY STANDARDS:
1. If information is not present in the article, return null — never infer or fabricate.
2. Legal weight hierarchy: Binding > Enforcement > Guidance > Proposal > Commentary. Assign based on the document TYPE described, not the significance of the topic. A law firm blog post analysing a binding decision is "Legal analysis" source strength and "Guidance" or "Commentary" legal weight — not "Binding."
3. For affected_jurisdictions: include only jurisdictions where this development creates a direct compliance obligation stated in the article. EU-wide EDPB guidance → "eu" only unless the article names specific member states.
4. For regulatory_theory: name the underlying legal doctrine in plain English. Only populate for Binding and Enforcement articles. Return null for Commentary and Proposal. Do not fabricate doctrine names.

DOMAIN COVERAGE:
AdTech: IAB TCF, GDPR consent for tracking cookies, DPA cookie enforcement, FTC commercial surveillance, Google Privacy Sandbox, COPPA in ad environments, RTB data flows.
Healthcare: HIPAA Privacy and Security Rules, HITECH, GDPR Article 9, EDPB health data guidance, state health privacy laws.
AI governance: EU AI Act, GDPR Article 22 automated decision-making, FTC AI enforcement, NIST AI RMF.
Financial services: GLBA, CFPB Section 1033, DORA, SEC cybersecurity disclosure, NY DFS Part 500.
Civil society and legal analysis: EFF, EPIC, Privacy International, IAPP, law firm analysis — assign "Commentary" or "Legal analysis" legal weight as appropriate.
Cross-border transfers: SCCs, BCRs, adequacy decisions, Schrems II.
Biometric: BIPA, Texas CUBI, GDPR Article 9(1).
Children: COPPA, FERPA, UK Age Appropriate Design Code.

VOICE: Write in direct, active voice. Lead with the compliance implication, not the regulatory action. Apply SOURCE CALIBRATION above — match your declarative confidence to your source type.`;

  const buildUserContent = (correction: string | null) => {
    const base = `Analyze this privacy/data protection article.

Source type: ${sourceTier === 1 ? "PRIMARY — official regulator publication. Use direct declarative voice." : sourceTier === 2 ? "SECONDARY — legal analysis or commentary. Use attribution (\"According to [source]...\")." : "TERTIARY — media or civil society coverage. Use attribution. Apply extra caution on specific factual claims."}
Title: ${title}
Description: ${summary || "No description available."}
Source: ${sourceName || "Unknown"}

STEP 1 — RELEVANCE CHECK: If this article is NOT genuinely about privacy regulation, data protection law, regulatory enforcement, or compliance obligations, return exactly: {"skip": true}

STEP 2 — SOURCE TEXT INVENTORY (internal check, do not output):
Before generating any field, identify which specific facts are directly stated in the Description above:
- Is a fine amount stated? (yes/no and the amount)
- Is a specific deadline or date stated? (yes/no and the date)
- Is a case reference number stated? (yes/no)
- Is a specific article or section number stated? (yes/no)
Only populate fields with facts that passed this inventory. Return null for everything else.

STEP 3 — If relevant, return this JSON:
{
  "why_it_matters_short": "ONE sentence (max 25 words). Name the specific regulator and what organisations subject to it must know. CONSTRAINT: Use only facts stated in the Description above. If the Description is too thin to support a specific statement, write a general one without inventing specifics.",

  "why_it_matters": "2 sentences (>= 10 chars total). Sentence 1: the compliance implication for the affected organisation type. Sentence 2: the regulator, jurisdiction, and legal basis. CONSTRAINT: Apply SOURCE CALIBRATION — if this is a secondary source, attribute claims to the source. Do not present a secondary source's interpretation as primary regulatory fact.",

  "related_signals": [
    {
      "label": "Short pattern/precedent observation grounded in the SOURCE TEXT (e.g. the article itself states 'this is the third CCPA enforcement this quarter'). CONSTRAINT: Only include signals the article text directly supports. Do not generate pattern claims from training knowledge. Return [] if the article does not state any cross-pattern.",
      "kind": "pattern | precedent | trend"
    }
  ],

  "takeaways": ["Array of 1-3 strings (validator requires >= 1). Each must cite a specific regulator, law, or deadline STATED IN THE SOURCE TEXT. If the source text does not provide specific cited facts, return ONE general takeaway and nothing more. Do not fabricate specific citations to appear more authoritative."],

  "compliance_impact": "One sentence (>= 5 chars) naming the specific organisation type and required action. If no immediate action is required: 'Monitor — [specific named development] before [specific named trigger].' CONSTRAINT: Only describe actions compelled by facts stated in the source text.",

  "who_should_care": "DPO | Privacy Counsel | Compliance Manager | CISO | All privacy professionals",

  "urgency": "Immediate | This quarter | Monitor",

  "legal_weight": "Binding | Enforcement | Guidance | Proposal | Commentary — assign based on document TYPE described in the article, not topic importance. Secondary source analysis of a binding decision = Commentary or Guidance, NOT Binding.",

  "source_strength": "Primary regulator | Legal analysis | Media coverage",

  "cross_jurisdiction_signal": "If the article EXPLICITLY states that multiple regulators in different jurisdictions are taking coordinated action on the same issue, describe it in one sentence. If the article does not state this, return null. Do not infer coordination from separate unrelated developments.",

  "risk_level": "Low | Medium | High | Critical",

  "affected_jurisdictions": ["Slugs where this development creates direct compliance obligations STATED IN THE ARTICLE. Conservative. Use only: eu, united-kingdom, us-federal, california, texas, new-york, france, germany, italy, spain, ireland, netherlands, poland, belgium, denmark, sweden, norway, australia, canada, brazil, singapore, japan, south-korea, india, switzerland, hong-kong, china, israel, thailand, philippines, mexico"],

  "precedent_novelty": "new_theory | confirms_existing | reverses_prior | routine",

  "regulatory_theory": "The legal doctrine underlying this development in one sentence. Required for Binding and Enforcement only. Return null for Commentary and Proposal. CONSTRAINT: Do not fabricate doctrine names. If you cannot identify the doctrine from the article text, describe the principle in plain terms or return null.",

  "action_items": [
    {
      "role": "DPO | Privacy Counsel | CISO | Compliance Manager",
      "action": "Specific action naming the specific law or regulator FROM THE SOURCE TEXT. CONSTRAINT: Do not invent specific article numbers or deadlines not stated in the source. If no specific law or deadline is stated, return [].",
      "timeframe": "Immediate (within 7 days) | This quarter | Monitor"
    }
  ],

  "key_date": "YYYY-MM-DD ONLY if a specific compliance deadline or effective date is EXPLICITLY STATED with a specific date in the article text. Return null if the article mentions a timeframe without a specific date (e.g. 'expected Q3 2026'). NEVER estimate or infer a date.",

  "entities": {
    "regulators": ["Official abbreviated names of regulators NAMED IN THE ARTICLE TEXT. Empty array if none."],
    "companies": ["Company names that are subjects of regulatory action, NAMED IN THE ARTICLE TEXT. Do not add entities from training knowledge. Empty array if none."],
    "laws": ["Specific laws with article numbers WHERE STATED IN THE ARTICLE TEXT. Do not add law citations from training knowledge. Empty array if none."],
    "case_references": ["Case names or guidance document identifiers STATED VERBATIM IN THE ARTICLE TEXT. Do not generate or infer case reference numbers. Empty array if none."]
  },

  "defense_considerations": "For Binding or Enforcement articles only: one sentence on the strongest distinguishing factor stated or implied in the source. Return null for all other legal weights.",

  "source_fidelity_note": "One sentence summarising the quality of the source text available. Example: 'Full article body available — high confidence in specific claims.' or 'RSS summary only (82 words) — specific claims limited to what description states; action items and case references not inferable.' This field is stored for downstream quality control and not shown to users."
}

Generate 0-3 action_items. Return [] if the source text does not support specific named-law actions. For entities: populate ONLY from content present in the article text — not from training knowledge.`;
    const correctionSuffix = correction
      ? `\n\nCORRECTION REQUIRED: your previous draft contained date errors: ${correction}. Re-generate the full JSON with all dates consistent with the DATE CONTEXT block. If the source does not state a year, omit the year.`
      : "";
    return dateContext + base + correctionSuffix;
  };

  const ctx = { fn: "fetch-updates", title };

  const attempt = async (correction: string | null): Promise<Record<string, unknown> | null> => {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: "user", content: buildUserContent(correction) }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("ANTHROPIC_429");
      console.error(`Anthropic API error: ${res.status}`);
      throw new Error(`ANTHROPIC_${res.status}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try { return JSON.parse(jsonMatch[0]); } catch { return null; }
  };

  try {
    const first = await attempt(null);
    if (!first) { console.warn(`[fetch-updates][AI] no parse for "${title.slice(0,80)}"`); return null; }
    if (first.skip === true) { console.log(`[fetch-updates][AI] model returned skip=true for "${title.slice(0,80)}"`); return null; }
    const v1 = validateAISummary(first, ctx);
    if (!v1.ok) { console.warn(`[fetch-updates][AI] validation failed for "${title.slice(0,80)}"`); return null; }
    const d1 = checkDateConsistency(JSON.stringify(v1.data), pubDay, ctx);
    if (d1.ok) return v1.data;

    // ONE bounded retry with correction note
    const foundList = d1.issues.map(i => i.found).join(", ");
    let retry: Record<string, unknown> | null = null;
    try { retry = await attempt(foundList); } catch (e) { console.warn(`[fetch-updates][AI] retry threw: ${(e as Error).message}`); }
    if (retry && retry.skip !== true) {
      const v2 = validateAISummary(retry, ctx);
      if (v2.ok) {
        const d2 = checkDateConsistency(JSON.stringify(v2.data), pubDay, ctx);
        if (d2.ok) return v2.data;
        console.error(JSON.stringify({ evt: "date_inconsistency_unresolved", fn: "fetch-updates", articleId: null, title, issues: d2.issues }));
        return v2.data;
      }
    }
    console.error(JSON.stringify({ evt: "date_inconsistency_unresolved", fn: "fetch-updates", articleId: null, title, issues: d1.issues }));
    return v1.data;
  } catch (e) {
    console.error("AI summary generation failed:", e);
    return null;
  }
}

// ── Title Repair ──────────────────────────────────────────────────
// Many RSS feeds strip the publication name or leading subject, leaving
// titles that begin with a verb, lowercase letter, or punctuation
// (e.g. "Becomes 21st State to Pass Privacy Law"). We detect these
// subject-less / truncated titles and prepend the missing entity by
// (1) scanning the description for a known jurisdiction or proper noun,
// or (2) falling back to the source-mapped jurisdiction display name.

const JURISDICTION_SLUG_TO_NAME: Record<string, string> = {
  'italy': 'Italy', 'france': 'France', 'germany': 'Germany', 'spain': 'Spain',
  'belgium': 'Belgium', 'netherlands': 'Netherlands', 'denmark': 'Denmark',
  'norway': 'Norway', 'sweden': 'Sweden', 'finland': 'Finland', 'estonia': 'Estonia',
  'latvia': 'Latvia', 'lithuania': 'Lithuania', 'poland': 'Poland', 'ireland': 'Ireland',
  'eu': 'EU', 'united-kingdom': 'UK', 'us-federal': 'US',
  'california': 'California', 'texas': 'Texas', 'new-york': 'New York',
  'district-of-columbia': 'D.C.', 'singapore': 'Singapore', 'australia': 'Australia',
  'canada': 'Canada', 'brazil': 'Brazil', 'south-korea': 'South Korea', 'japan': 'Japan',
};

// Proper nouns we expect to see leading a privacy news title.
// Matched against the first ~120 chars of description to find a missing subject.
const KNOWN_SUBJECTS = [
  // US states (most common truncation source)
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  // Countries / regions
  'EU','European Union','UK','United Kingdom','US','United States','Ireland',
  'Germany','France','Italy','Spain','Netherlands','Belgium','Poland','Denmark',
  'Sweden','Norway','Finland','Brazil','Canada','Australia','Japan','South Korea',
  'China','India','Singapore','Mexico','Argentina','South Africa','Israel',
  // Major regulators / agencies often dropped from titles
  'FTC','HHS','OCR','SEC','CFPB','DOJ','EDPB','EDPS','CNIL','ICO','DPC','AEPD',
  'Garante','BfDI','Datatilsynet','IMY','PDPC','OAIC','OPC','ANPD','PIPC','PPC',
  'CPPA','CCPA','GDPR',
];

// Words that typically open a verb-led, subject-less title fragment.
// When the source RSS strips the leading subject (e.g. "Colorado Revises Its AI Act"
// arrives as "Revises Its AI Act"), we detect the verb-led opener and re-prepend
// the subject from the description or the source jurisdiction.
const SUBJECTLESS_LEADERS = new Set([
  // Legislative / regulatory action
  'becomes','passes','enacts','signs','adopts','issues','announces','releases',
  'publishes','proposes','launches','approves','rejects','fines','penalises',
  'penalizes','sanctions','orders','rules','warns','investigates','sues','files',
  'settles','agrees','reaches','updates','amends','expands','clarifies',
  'requires','mandates','bans','restricts','imposes','urges','calls','pushes',
  'considers','reviews','strengthens','tightens','loosens','introduces',
  'unveils','finalizes','finalises','withdraws','postpones','delays',
  'confirms','denies','grants','refuses','seeks','wins','loses','accuses',
  'allows','blocks','demands','threatens',
  // Revision / change verbs (caught Colorado/FPF "Revises Its AI Act" bug)
  'revises','revisits','revamps','overhauls','rewrites','modifies','alters',
  'changes','replaces','repeals','reinstates','restores','enforces','reaffirms',
  // Movement verbs
  'opens','closes','begins','starts','ends','drops','picks','hits','joins',
  'votes','targets','charges','alleges','claims','names','eyes','mulls',
  'weighs','debates','finds','holds','dismisses','certifies','awards','halts',
  'suspends','revokes','terminates','declares','faces','plans','prepares',
  'extends','shortens','accelerates','speeds','slows','pauses','resumes',
  // Communication verbs
  'says','tells','asks','responds','replies','answers','reports','reveals',
  'discloses','admits','acknowledges','claims','asserts','argues','contends',
  // Publication verbs (regulator guidance flow)
  'opens','launches','rolls','rolls-out','rolled','opens','reopens','closes',
  'publishes','republishes','reissues','reissued','re-issues',
]);

function repairTitle(
  rawTitle: string,
  description: string,
  sourceJurisdictions: string[],
  sourceName: string | null,
): string {
  const t = (rawTitle || '').trim();
  if (!t) return t;

  // Detect "broken" titles: leading lowercase/symbol/ellipsis, or a verb-led fragment.
  const firstChar = t.charAt(0);
  const startsWithLowerOrSymbol = /^[a-z]/.test(firstChar) || /^[…\-—–:,.\(\[]/.test(firstChar);
  const firstWord = (t.match(/^[A-Za-z']+/)?.[0] || '').toLowerCase();
  const startsWithVerb = SUBJECTLESS_LEADERS.has(firstWord);
  const isBroken = startsWithLowerOrSymbol || startsWithVerb;
  if (!isBroken) return t;

  // Skip repair if the title already contains a known subject anywhere in the
  // first few words (e.g. "Today, California passes ...").
  const head = t.slice(0, 60);
  for (const subj of KNOWN_SUBJECTS) {
    const re = new RegExp(`\\b${subj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(head)) {
      // If lowercase leader, just capitalise; otherwise leave as-is.
      return startsWithLowerOrSymbol
        ? t.charAt(0).toUpperCase() + t.slice(1)
        : t;
    }
  }

  // 1) Scan the description for a known subject (prefer the earliest match).
  let foundSubject: string | null = null;
  if (description) {
    const desc = description.slice(0, 400);
    let bestIdx = Number.POSITIVE_INFINITY;
    for (const subj of KNOWN_SUBJECTS) {
      const re = new RegExp(`\\b${subj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const m = desc.match(re);
      if (m && typeof m.index === 'number' && m.index < bestIdx) {
        bestIdx = m.index;
        foundSubject = subj;
      }
    }
  }

  // 2) Fall back to the source's mapped jurisdiction (e.g. cnil.fr → France).
  if (!foundSubject && sourceJurisdictions.length > 0) {
    const slug = sourceJurisdictions[0];
    foundSubject = JURISDICTION_SLUG_TO_NAME[slug] || null;
  }

  if (!foundSubject) {
    // Nothing to prepend; at least fix capitalisation.
    return startsWithLowerOrSymbol
      ? t.charAt(0).toUpperCase() + t.slice(1)
      : t;
  }

  // Strip a leading punctuation/ellipsis and lowercase the first letter so the
  // sentence reads naturally after the prepended subject.
  let body = t.replace(/^[\s…\-—–:,.\(\[]+/, '').trim();
  if (startsWithVerb) {
    // Keep verb lowercase: "Becomes" → "becomes" so result reads "Alabama becomes ...".
    body = body.charAt(0).toLowerCase() + body.slice(1);
  }
  return `${foundSubject} ${body}`.trim();
}

// Detects if text is likely non-English using common word patterns
function isLikelyNonEnglish(text: string): boolean {
  if (!text || text.length < 10) return false;
  const lower = text.toLowerCase();
  const frenchWords = ["le ", "la ", "les ", "de ", "du ", "des ", "et ", "en ", "un ", "une ",
    "pour ", "sur ", "avec ", "que ", "qui ", "dans ", " est ", " sont ", "cette ", "ces ",
    "délibération", "cnil", "données", "traitement", "personnes", "règlement"];
  const germanWords = ["der ", "die ", "das ", "und ", "ist ", "ein ", "eine ", "des ",
    "dem ", "den ", "mit ", "auf ", "für ", "nicht ", "sich ", "auch ", "werden", "datenschutz"];
  const spanishWords = ["el ", "la ", "los ", "las ", "de ", "del ", "en ", "con ", "por ",
    "para ", "que ", "una ", "este ", "esta ", "también", "protección"];
  const allIndicators = [...frenchWords, ...germanWords, ...spanishWords];
  const matches = allIndicators.filter(w => lower.includes(w)).length;
  return matches >= 3;
}

async function translateToEnglish(
  title: string,
  description: string,
  apiKey: string
): Promise<{ title: string; description: string }> {
  try {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `Translate the following privacy/data protection article title and description to English. Return ONLY a JSON object with keys "title" and "description". Do not add any explanation or markdown.

Title: ${title}
Description: ${description || ""}`,
        }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { title, description };
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { title, description };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || title,
      description: parsed.description || description,
    };
  } catch {
    return { title, description };
  }
}

// Batch 2 — Per-feed declared-language translation. Used when a feed entry
// declares a `language` other than "en". Translates title + description via Haiku
// before relevance / enrichment / storage.
async function translateIfNeeded(
  title: string,
  description: string,
  language: string,
  apiKey: string
): Promise<{ title: string; description: string }> {
  if (!language || language === "en") return { title, description };
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Translate this privacy/data protection article from ${language} to English.
Return ONLY valid JSON: {"title": "...", "description": "..."}.
Preserve all proper nouns, regulator names, fine amounts, and legal references exactly.
Title: ${title}
Description: ${(description || "").substring(0, 1000)}`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return { title, description };
    const data = await resp.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { title, description };
    const parsed = JSON.parse(match[0]);
    return {
      title: parsed.title || title,
      description: parsed.description || description,
    };
  } catch {
    return { title, description };
  }
}

import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";
import { validateAISummary } from "../_shared/ai-validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // No auth check needed — this function only ingests public RSS data
  // and writes via service_role. Rate-limited by cron schedule.

  // Sharding: caller may pass ?shard=N&shards=M (1-indexed) to process only a
  // slice of RSS_SOURCES. Uses modulo (round-robin) distribution so new feeds
  // added anywhere in RSS_SOURCES spread evenly across shards automatically.
  const url = new URL(req.url);
  const shards = Math.max(1, Math.min(10, parseInt(url.searchParams.get("shards") || "1", 10) || 1));
  const shard = Math.max(1, Math.min(shards, parseInt(url.searchParams.get("shard") || "1", 10) || 1));
  const sourcesForRun = shards === 1
    ? RSS_SOURCES
    : RSS_SOURCES.filter((_, i) => i % shards === (shard - 1));


  const run = await startRun(supabase, "fetch-updates", {
    sources: sourcesForRun.length,
    shard,
    shards,
  });
  const startedMs = Date.now();
  // Stay safely under the edge-runtime wall-clock cap (~150s) so finishRun()
  // always gets to record completion. With sharding, 120s per shard is plenty.
  const maxRuntimeMs = 120_000;
  const results = { inserted: 0, skipped: 0, skipped_existing: 0, summaries_generated: 0, enrichment_failed_429: 0, enrichment_failed_other: 0, stopped_due_to_time_budget: false, errors: [] as string[] };
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  console.log(`[fetch-updates] ANTHROPIC_API_KEY present=${!!anthropicKey} length=${anthropicKey?.length ?? 0}`);

  try {

  // Pre-fetch all existing URLs so duplicate RSS items do not spend time on
  // image extraction / AI enrichment and do not get counted as new inserts.
  const { data: existingRows } = await supabase
    .from("updates")
    .select("url");
  const existingUrls = new Set((existingRows || []).map((r: { url: string }) => r.url));

  for (const source of sourcesForRun) {
    if (Date.now() - startedMs > maxRuntimeMs) {
      results.stopped_due_to_time_budget = true;
      break;
    }
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EndUserPrivacy/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = extractAllItems(xml).slice(0, 10);

      for (const item of items) {
        if (Date.now() - startedMs > maxRuntimeMs) {
          results.stopped_due_to_time_budget = true;
          break;
        }
        let title = stripHtml(extractTag(item, "title"));
        const link = extractLink(item);
        let description = cleanRssBoilerplate(stripHtml(extractTag(item, "description") || extractTag(item, "summary") || extractTag(item, "content")));
        const pubDate = extractTag(item, "pubDate") || extractTag(item, "published") || extractTag(item, "dc:date");

        if (!title || !link || !link.startsWith("http")) continue;
        if (existingUrls.has(link)) { results.skipped_existing++; continue; }

        // Per-feed declared-language translation (Batch 2). Runs first when the
        // feed config explicitly sets `language`, so we get reliable translation
        // for non-English DPAs. The heuristic fallback below covers feeds with
        // no declared language that still emit non-English items.
        const declaredLang = (source as { language?: string }).language;
        if (anthropicKey && declaredLang && declaredLang !== "en") {
          const translated = await translateIfNeeded(title, description, declaredLang, anthropicKey);
          title = translated.title;
          description = translated.description;
        } else if (anthropicKey && isLikelyNonEnglish(title + " " + description)) {
          const translated = await translateToEnglish(title, description, anthropicKey);
          title = translated.title;
          description = translated.description;
        }

        if (!isRelevant(title, description)) { results.skipped++; continue; }

        const category = categorize(title, description, source.defaultCategory);
        // Use the article's own OG image if available; otherwise leave null and
        // let assign-fallback-images apply the curated pool / EUP brand tile.
        const imageUrl = (await extractOgImage(link)) || null;

        // Compute direct_jurisdictions from DPA source mapping
        const sourceDomain = extractDomain(link);
        const directJurisdictions: string[] = [];
        for (const [domain, jurisdictions] of Object.entries(DPA_SOURCE_JURISDICTIONS)) {
          if (sourceDomain.includes(domain) && jurisdictions.length > 0) {
            directJurisdictions.push(...jurisdictions);
            break;
          }
        }

        // Repair subject-less / truncated RSS titles using the article description
        // and (as fallback) the source-mapped jurisdiction display name.
        title = repairTitle(title, description, directJurisdictions, source.source);

        const row: Record<string, unknown> = {
          title: title.slice(0, 400),
          summary: description.slice(0, 500) || null,
          url: link,
          source_name: source.source,
          source_domain: source.domain,
          image_url: imageUrl,
          category,
          topic_tags: assignTopicTags(title, description),
          regulator: source.regulator,
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          is_premium: false,
          direct_jurisdictions: directJurisdictions.length > 0 ? directJurisdictions : null,
          source_tier: inferSourceTier(source),
        };

        // Generate AI summary only for new articles; existing URLs are skipped above.
        if (anthropicKey) {
          try {
            const sourceTier = inferSourceTier(source);
            const aiSummary = await generateAISummary(title, description.slice(0, 800), source.source, anthropicKey, sourceTier);
            if (aiSummary) {
              row.ai_summary = aiSummary;
              // Extract affected_jurisdictions from AI response into dedicated column
              if (Array.isArray(aiSummary.affected_jurisdictions) && aiSummary.affected_jurisdictions.length > 0) {
                row.affected_jurisdictions = aiSummary.affected_jurisdictions;
              }
              // Extract new top-level enrichment fields into dedicated columns
              if (typeof aiSummary.regulatory_theory === "string" && aiSummary.regulatory_theory.trim()) {
                row.regulatory_theory = aiSummary.regulatory_theory;
              }
              if (typeof aiSummary.why_it_matters_short === "string" && aiSummary.why_it_matters_short.trim()) {
                row.why_it_matters_short = aiSummary.why_it_matters_short.trim();
              }
              if (Array.isArray(aiSummary.related_signals) && aiSummary.related_signals.length > 0) {
                row.related_signals = aiSummary.related_signals
                  .filter((s: any) => s && typeof s.label === "string" && s.label.trim())
                  .slice(0, 4);
              }
              if (Array.isArray(aiSummary.action_items) && aiSummary.action_items.length > 0) {
                row.action_items = aiSummary.action_items;
              }
              if (typeof aiSummary.key_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(aiSummary.key_date)) {
                row.key_date = aiSummary.key_date;
              }
              if (aiSummary.entities && typeof aiSummary.entities === "object") {
                row.entities = aiSummary.entities;
              }
              if (typeof aiSummary.defense_considerations === "string" && aiSummary.defense_considerations.trim()) {
                row.defense_considerations = aiSummary.defense_considerations;
              }
              if (typeof aiSummary.urgency === "string" && aiSummary.urgency.trim()) {
                const urgencyMap: Record<string, string> = {
                  "Immediate": "High",
                  "This quarter": "Medium",
                  "Monitor": "Low",
                };
                const mapped = urgencyMap[aiSummary.urgency.trim()];
                if (mapped) row.attention_level = mapped;
              }



              // Batch 4C — quality validation
              const quality = assessEnrichmentQuality(aiSummary, aiSummary.entities);
              row.enrichment_quality = quality;
              if (quality === "low") {
                console.warn(`[fetch-updates] Low quality enrichment for: ${String(row.title ?? "").slice(0, 60)}`);
              }

              // Batch 4D — contextual teaser for tier-1 sources with usable enrichment
              if (
                sourceTier === 1 &&
                quality !== "low" &&
                typeof aiSummary.why_it_matters_short === "string" &&
                aiSummary.why_it_matters_short.trim()
              ) {
                const teaser = await generateContextualTeaser(aiSummary.why_it_matters_short, anthropicKey);
                if (teaser) row.contextual_teaser = teaser;
              }

              results.summaries_generated++;
            }
          } catch (enrichErr: any) {
            if (enrichErr.message?.includes("ANTHROPIC_429")) {
              results.enrichment_failed_429++;
            } else {
              results.enrichment_failed_other++;
            }
          }
        }

        // Use .select() so PostgREST returns the inserted row(s). With
        // ignoreDuplicates, a URL conflict returns an empty array (no error),
        // letting us distinguish real inserts from silent no-ops.
        const { data: upserted, error } = await supabase
          .from("updates")
          .upsert(row, { onConflict: "url", ignoreDuplicates: true })
          .select("id");

        if (error) {
          results.skipped++;
        } else if (!upserted || upserted.length === 0) {
          // Duplicate URL — silently ignored by Postgres. Don't count as inserted.
          results.skipped_existing++;
          existingUrls.add(link);
          // Roll back the summary credit since the row didn't actually persist.
          if (row.ai_summary) results.summaries_generated = Math.max(0, results.summaries_generated - 1);
        } else {
          results.inserted++;
          existingUrls.add(link);

          // Fire-and-forget: trigger contextual enrichment for Tier 1 sources
          const insertedId = upserted[0]?.id;
          if (insertedId && inferSourceTier(source) === 1) {
            const enrichUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-with-context`;
            fetch(enrichUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ article_id: insertedId, force: false }),
            }).catch((e) => console.warn("enrich-with-context trigger failed:", e.message));
          }

          // ── Dual-write to enforcement_actions for official DPA enforcement/binding articles ──
          const articleDomain = extractDomain(row.url ?? "");
          const isOfficialDPA = DPA_OFFICIAL_DOMAINS.has(articleDomain);
          const isEnforcementWeight =
            row.legal_weight === "Enforcement" || row.legal_weight === "Binding";

          if (isOfficialDPA && isEnforcementWeight) {
            try {
              const etid = await computeEtid(row.url ?? "");

              const jurisdictionSlugs: string[] =
                DPA_SOURCE_JURISDICTIONS[articleDomain] ??
                (Array.isArray(row.direct_jurisdictions) ? row.direct_jurisdictions : []);
              const jurisdiction = jurisdictionSlugs[0] ?? "global";

              const regulatorName =
                row.source_name ?? source.regulator ?? articleDomain;

              const { error: enfErr } = await supabase
                .from("enforcement_actions")
                .upsert({
                  etid,
                  regulator: regulatorName,
                  jurisdiction,
                  violation: row.title,
                  decision_date: row.published_at
                    ? new Date(row.published_at).toISOString().split("T")[0]
                    : null,
                  source_url: row.url,
                  source_database: row.source_name ?? "RSS",
                  subject: null,
                  law: null,
                  fine_amount: null,
                  fine_eur: null,
                  sector: null,
                  enrichment_version: 0,
                }, { onConflict: "etid", ignoreDuplicates: true });

              if (enfErr) {
                console.error("dual-write to enforcement_actions failed", row.url, enfErr.message);
              } else {
                console.log("dual-write to enforcement_actions succeeded", row.url);
              }
            } catch (enfDualErr) {
              console.error("enforcement dual-write error", row.url, enfDualErr);
            }
          }
        }

        // Prevent Anthropic API rate limiting — small delay between AI calls
        if (anthropicKey) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    } catch (e: any) {
      results.errors.push(`${source.source}: ${e.message}`);
    }
  }


  } catch (e) {
    await failRun(supabase, run, e, {
      inserted: results.inserted,
      skipped: results.skipped,
      enriched: results.summaries_generated,
      enrichmentFailed429: results.enrichment_failed_429,
      enrichmentFailedOther: results.enrichment_failed_other,
      metadata: { errors: results.errors.slice(0, 5) },
    });
    return new Response(JSON.stringify({ ...results, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  await finishRun(supabase, run, {
    inserted: results.inserted,
    skipped: results.skipped,
    enriched: results.summaries_generated,
    enrichmentFailed429: results.enrichment_failed_429,
    enrichmentFailedOther: results.enrichment_failed_other,
    status: results.stopped_due_to_time_budget ? "partial" : undefined,
    metadata: { errors: results.errors.slice(0, 10), sources: sourcesForRun.length, total_sources: RSS_SOURCES.length, shard, shards, skipped_existing: results.skipped_existing, stopped_due_to_time_budget: results.stopped_due_to_time_budget },
  });

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});