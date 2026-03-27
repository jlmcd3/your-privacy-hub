import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RSS_SOURCES = [
  // ── EU & UK ────────────────────────────────────────────────────────
  {
    url: "https://www.edpb.europa.eu/feed/news_en",
    source: "EDPB",
    domain: "edpb.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Data Protection Board",
  },
  {
    url: "https://www.huntonprivacyblog.com/feed/",
    source: "Hunton Privacy Blog",
    domain: "hunton.com",
    defaultCategory: "us-federal",
    regulator: "Hunton Andrews Kurth",
  },
  {
    url: "https://www.cnil.fr/en/rss.xml",
    source: "CNIL",
    domain: "cnil.fr",
    defaultCategory: "eu-uk",
    regulator: "Commission Nationale de l'Informatique et des Libertés",
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
  // ── Global / Industry ─────────────────────────────────────────────
  {
    url: "https://iapp.org/news/rss/",
    source: "IAPP",
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
  // ── Litigation / Courts ──────────────────────────────────────────────
  {
    url: "https://feeds.law360.com/privacy",
    source: "Law360 Privacy",
    domain: "law360.com",
    defaultCategory: "enforcement",
    regulator: "Law360",
  },
  {
    url: "https://www.reuters.com/legal/privacy/rss",
    source: "Reuters Legal",
    domain: "reuters.com",
    defaultCategory: "enforcement",
    regulator: "Reuters Legal",
  },
  {
    url: "https://www.jdsupra.com/topics/privacy/rss/",
    source: "JD Supra Privacy",
    domain: "jdsupra.com",
    defaultCategory: "global",
    regulator: "JD Supra",
  },
  // ── Additional regulatory sources ────────────────────────────────────
  {
    url: "https://www.ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/",
    source: "ICO",
    domain: "ico.org.uk",
    defaultCategory: "eu-uk",
    regulator: "Information Commissioner's Office",
  },
  {
    url: "https://www.dataprotection.ie/en/news-media/press-releases/rss",
    source: "DPC Ireland",
    domain: "dataprotection.ie",
    defaultCategory: "eu-uk",
    regulator: "Data Protection Commission",
  },
  {
    url: "https://edps.europa.eu/press-publications/press-news/news_en/rss",
    source: "EDPS",
    domain: "edps.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Data Protection Supervisor",
  },
  // ── AdTech & Advertising Privacy ─────────────────────────────────────
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
    url: "https://www.thedrums.com/rss/",
    source: "The Drum",
    domain: "thedrum.com",
    defaultCategory: "adtech",
    regulator: "The Drum",
  },
  {
    url: "https://digiday.com/feed/",
    source: "Digiday",
    domain: "digiday.com",
    defaultCategory: "adtech",
    regulator: "Digiday",
  },
  {
    url: "https://martechalliance.com/feed/",
    source: "MarTech Alliance",
    domain: "martechalliance.com",
    defaultCategory: "adtech",
    regulator: "MarTech Alliance",
  },
  {
    url: "https://blog.iab.com/feed/",
    source: "IAB Blog",
    domain: "iab.com",
    defaultCategory: "adtech",
    regulator: "Interactive Advertising Bureau",
  },
  {
    url: "https://www.cpcstrategy.com/blog/feed/",
    source: "Tinuiti Blog",
    domain: "tinuiti.com",
    defaultCategory: "adtech",
    regulator: "Tinuiti",
  },
  // ── EU Enforcement — Additional DPAs ─────────────────────────────────────────
  {
    url: "https://gdprhub.eu/index.php?title=Special:RecentChanges&feed=rss",
    source: "GDPRhub",
    domain: "gdprhub.eu",
    defaultCategory: "enforcement",
    regulator: "GDPRhub (multi-DPA)",
  },
  {
    url: "https://www.autoriteitpersoonsgegevens.nl/en/news.rss",
    source: "Dutch AP",
    domain: "autoriteitpersoonsgegevens.nl",
    defaultCategory: "eu-uk",
    regulator: "Autoriteit Persoonsgegevens",
  },
  {
    url: "https://www.aepd.es/en/rss",
    source: "AEPD",
    domain: "aepd.es",
    defaultCategory: "eu-uk",
    regulator: "Agencia Española de Protección de Datos",
  },
  {
    url: "https://datenschutz-hamburg.de/news.rss",
    source: "Hamburg DPA",
    domain: "datenschutz-hamburg.de",
    defaultCategory: "eu-uk",
    regulator: "Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit",
  },
  {
    url: "https://www.bfdi.bund.de/SharedDocs/rss/RSS_Pressemitteilungen.xml",
    source: "BfDI",
    domain: "bfdi.bund.de",
    defaultCategory: "eu-uk",
    regulator: "Bundesbeauftragte für den Datenschutz und die Informationsfreiheit",
  },
  {
    url: "https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/rss",
    source: "Garante",
    domain: "garanteprivacy.it",
    defaultCategory: "eu-uk",
    regulator: "Garante per la protezione dei dati personali",
  },
  // ── US State Regulators ───────────────────────────────────────────────────────
  {
    url: "https://cppa.ca.gov/rss/news.rss",
    source: "CPPA",
    domain: "cppa.ca.gov",
    defaultCategory: "us-states",
    regulator: "California Privacy Protection Agency",
  },
  {
    url: "https://www.texasattorneygeneral.gov/consumer-protection/rss.xml",
    source: "Texas AG",
    domain: "texasattorneygeneral.gov",
    defaultCategory: "us-states",
    regulator: "Texas Attorney General",
  },
  {
    url: "https://coag.gov/press-releases/feed/",
    source: "Colorado AG",
    domain: "coag.gov",
    defaultCategory: "us-states",
    regulator: "Colorado Attorney General",
  },
  {
    url: "https://portal.ct.gov/AG/RSS/PressReleases",
    source: "Connecticut AG",
    domain: "portal.ct.gov",
    defaultCategory: "us-states",
    regulator: "Connecticut Attorney General",
  },
  {
    url: "https://www.hhs.gov/rss/news.xml",
    source: "HHS OCR",
    domain: "hhs.gov",
    defaultCategory: "us-federal",
    regulator: "HHS Office for Civil Rights",
  },
  // ── Legal Analysis — Premium Sources ─────────────────────────────────────────
  {
    url: "https://www.dataprotectionreport.com/feed/",
    source: "Fieldfisher Data Protection",
    domain: "dataprotectionreport.com",
    defaultCategory: "eu-uk",
    regulator: "Fieldfisher LLP",
  },
  {
    url: "https://www.linklaters.com/en/insights/blogs/data-protected/rss",
    source: "Linklaters Data Protected",
    domain: "linklaters.com",
    defaultCategory: "eu-uk",
    regulator: "Linklaters LLP",
  },
  {
    url: "https://www.twobirds.com/en/insights/practice-areas/privacy-and-data-protection/rss",
    source: "Bird & Bird Privacy",
    domain: "twobirds.com",
    defaultCategory: "global",
    regulator: "Bird & Bird LLP",
  },
  {
    url: "https://iapp.org/resources/topics/privacy-tracker/rss/",
    source: "IAPP Privacy Tracker",
    domain: "iapp.org",
    defaultCategory: "global",
    regulator: "International Association of Privacy Professionals",
  },
  {
    url: "https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/rss",
    source: "WilmerHale Privacy",
    domain: "wilmerhale.com",
    defaultCategory: "us-federal",
    regulator: "WilmerHale LLP",
  },
  // ── Legislative Tracking ──────────────────────────────────────────────────────
  {
    url: "https://eur-lex.europa.eu/RSSF/RSS014.xml",
    source: "EUR-Lex",
    domain: "eur-lex.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Commission / EUR-Lex",
  },
  {
    url: "https://www.coe.int/en/web/data-protection/rss",
    source: "Council of Europe",
    domain: "coe.int",
    defaultCategory: "global",
    regulator: "Council of Europe",
  },

  // ── Law Firm Blogs ───────────────────────────────────────────────
  {
    url: "https://www.insideprivacy.com/feed",
    source: "Covington Inside Privacy",
    domain: "insideprivacy.com",
    defaultCategory: "global",
    regulator: "Covington & Burling LLP",
  },
  {
    url: "https://datamatters.sidley.com/feed",
    source: "Sidley Data Matters",
    domain: "datamatters.sidley.com",
    defaultCategory: "global",
    regulator: "Sidley Austin LLP",
  },
  {
    url: "https://www.dlapiper.com/en/rss",
    source: "DLA Piper Privacy Matters",
    domain: "dlapiper.com",
    defaultCategory: "global",
    regulator: "DLA Piper LLP",
  },
  {
    url: "https://gtlaw-dataprivacydish.com/feed",
    source: "Greenberg Traurig Privacy Dish",
    domain: "gtlaw-dataprivacydish.com",
    defaultCategory: "us-states",
    regulator: "Greenberg Traurig LLP",
  },
  {
    url: "https://alstonprivacy.com/feed",
    source: "Alston Privacy",
    domain: "alstonprivacy.com",
    defaultCategory: "us-federal",
    regulator: "Alston & Bird LLP",
  },
  {
    url: "https://www.privacyandcybersecuritylaw.com/feed",
    source: "Dentons Privacy & Cyber",
    domain: "privacyandcybersecuritylaw.com",
    defaultCategory: "global",
    regulator: "Dentons LLP",
  },
  {
    url: "https://www.hoganlovells.com/en/news-and-insights/rss",
    source: "Hogan Lovells",
    domain: "hoganlovells.com",
    defaultCategory: "global",
    regulator: "Hogan Lovells LLP",
  },
  {
    url: "https://www.bakermckenzie.com/en/rss",
    source: "Baker McKenzie",
    domain: "bakermckenzie.com",
    defaultCategory: "global",
    regulator: "Baker McKenzie LLP",
  },

  // ── APAC Regulators ─────────────────────────────────────────────
  {
    url: "https://www.oaic.gov.au/news/rss.xml",
    source: "OAIC",
    domain: "oaic.gov.au",
    defaultCategory: "global",
    regulator: "Office of the Australian Information Commissioner",
  },
  {
    url: "https://www.pdpc.gov.sg/rss",
    source: "PDPC Singapore",
    domain: "pdpc.gov.sg",
    defaultCategory: "global",
    regulator: "Personal Data Protection Commission Singapore",
  },
  {
    url: "https://www.priv.gc.ca/en/news/rss/",
    source: "OPC Canada",
    domain: "priv.gc.ca",
    defaultCategory: "global",
    regulator: "Office of the Privacy Commissioner of Canada",
  },
  {
    url: "https://www.pcpd.org.hk/english/news_events/rss.xml",
    source: "PCPD Hong Kong",
    domain: "pcpd.org.hk",
    defaultCategory: "global",
    regulator: "Privacy Commissioner for Personal Data Hong Kong",
  },

  // ── Civil Society & Advocacy ─────────────────────────────────────
  {
    url: "https://epic.org/feed/",
    source: "EPIC",
    domain: "epic.org",
    defaultCategory: "us-federal",
    regulator: "Electronic Privacy Information Center",
  },
  {
    url: "https://www.eff.org/rss/updates.xml",
    source: "EFF",
    domain: "eff.org",
    defaultCategory: "global",
    regulator: "Electronic Frontier Foundation",
  },
  {
    url: "https://privacyinternational.org/rss",
    source: "Privacy International",
    domain: "privacyinternational.org",
    defaultCategory: "global",
    regulator: "Privacy International",
  },
  {
    url: "https://www.accessnow.org/feed/",
    source: "Access Now",
    domain: "accessnow.org",
    defaultCategory: "global",
    regulator: "Access Now",
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

  // ── Healthcare & Financial ───────────────────────────────────────
  {
    url: "https://www.hipaajournal.com/feed/",
    source: "HIPAA Journal",
    domain: "hipaajournal.com",
    defaultCategory: "us-federal",
    regulator: "HIPAA Journal",
  },
  {
    url: "https://www.consumerfinance.gov/activity/blog/feed/",
    source: "CFPB",
    domain: "consumerfinance.gov",
    defaultCategory: "us-federal",
    regulator: "Consumer Financial Protection Bureau",
  },

  // ── EU Supplemental ──────────────────────────────────────────────
  {
    url: "https://www.enisa.europa.eu/news/rss-news",
    source: "ENISA",
    domain: "enisa.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "EU Agency for Cybersecurity",
  },
  {
    url: "https://www.datatilsynet.no/en/news/rss/",
    source: "Datatilsynet Norway",
    domain: "datatilsynet.no",
    defaultCategory: "eu-uk",
    regulator: "Datatilsynet (Norwegian DPA)",
  },

  // ── Policy & Legislative ─────────────────────────────────────────
  {
    url: "https://www.lawfareblog.com/rss.xml",
    source: "Lawfare",
    domain: "lawfareblog.com",
    defaultCategory: "global",
    regulator: "Lawfare Institute",
  },
  {
    url: "https://techpolicy.press/feed/",
    source: "Tech Policy Press",
    domain: "techpolicy.press",
    defaultCategory: "global",
    regulator: "Tech Policy Press",
  },
  {
    url: "https://www.europarl.europa.eu/rss/en/news.xml",
    source: "EU Parliament",
    domain: "europarl.europa.eu",
    defaultCategory: "eu-uk",
    regulator: "European Parliament",
  },
  {
    url: "https://www.fcc.gov/news-events/rss",
    source: "FCC",
    domain: "fcc.gov",
    defaultCategory: "us-federal",
    regulator: "Federal Communications Commission",
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
  return tags;
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
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
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
    // Remove any leftover tag fragments like "p " or "div " at the start
    .replace(/^[a-z]{1,10}\s+/i, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
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

function isRelevant(title: string, description: string): boolean {
  const text = (title + " " + (description || "")).toLowerCase();
  const titleLower = title.toLowerCase();

  const TITLE_KEYWORDS = [
    "privacy", "data protection", "gdpr", "ccpa", "cpra", "data breach",
    "enforcement", "fine", "penalty", "regulator", "dpa", "ico ", "edpb",
    "cnil", "ftc ", "cppa", "lgpd", "pipl", "ai act", "biometric",
    "personal data", "surveillance law", "data security", "privacy law",
    "consent", "data transfer", "privacy regulation",
    "adtech", "ad tech", "cookie consent", "tcf", "programmatic",
    "real-time bidding", "behavioral advertising", "commercial surveillance",
    "third-party cookie", "privacy sandbox", "consent management", "iab ",
    "ad targeting", "tracking pixel",
    // New regulators
    "cppa", "texas ag", "colorado ag", "hhs ocr", "garante", "aepd",
    "dutch ap", "bfdi", "gdprhub", "convention 108",
    // New law/framework terms
    "tdpsa", "ctdpa", "hipaa enforcement", "data (use and access)",
    "digital markets act", "dma ", "eur-lex",
  ];
  const titleHasKeyword = TITLE_KEYWORDS.some(k => titleLower.includes(k));
  if (!titleHasKeyword) return false;

  const isExcluded = EXCLUSION_KEYWORDS.some(k => text.includes(k));
  if (isExcluded) return false;

  const matchCount = REQUIRED_KEYWORDS.filter(k => text.includes(k.toLowerCase())).length;
  return matchCount >= 2;
}

// ── AI Summary Generation ──────────────────────────────────────────
async function generateAISummary(
  title: string,
  summary: string,
  sourceName: string,
  apiKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: `You are a privacy regulatory analyst at a leading intelligence firm.
Produce expert-level summaries for DPOs, privacy lawyers, and compliance managers.

Rules:
(1) Always name the specific regulator AND jurisdiction AND regulation where present.
(2) Never write generic advice — every sentence must be specific to this article.
(3) Return ONLY valid JSON — no preamble, no markdown, no explanation.
(4) Be precise about legal weight: distinguish binding regulatory decisions from
    guidance, proposals, and commentary. This distinction matters enormously to
    legal professionals.`,
        messages: [
          {
            role: "user",
            content: `Analyze this privacy/data protection article.

Title: ${title}
Description: ${summary || "No description available."}
Source: ${sourceName || "Unknown"}

STEP 1 — RELEVANCE CHECK:
If this article is NOT genuinely about privacy regulation, data protection law,
regulatory enforcement, or compliance obligations (e.g. it is about general
business pricing, non-privacy topics, or entertainment), return exactly:
{"skip": true}

STEP 2 — If relevant, return this JSON:
{
  "why_it_matters": "2 sentences. Must name the specific regulator AND jurisdiction
    AND explain the specific legal significance. No generic statements.",

  "takeaways": [
    "Specific factual point from this article — cite regulator or law name",
    "Specific implication, deadline, or scope if present in the article",
    "Specific type of organization affected and what they must review or do"
  ],

  "compliance_impact": "One sentence naming the specific organization type affected
    and the specific action required under the specific law. If no clear action
    exists, write: Monitor — no immediate compliance action required.",

  "who_should_care": "The single most specific audience:
    DPO | Privacy Counsel | Compliance Manager | CISO | All privacy professionals",

  "urgency": "Immediate | This quarter | Monitor — choose based on whether article
    contains enforcement action, binding deadline, or new binding guidance",

  "legal_weight": "Classify this article's regulatory significance:
    Binding — final regulatory decision, court ruling, or adopted regulation with
      immediate legal force (EDPB final opinion, DPA enforcement decision, enacted
      statute, court judgment)
    Enforcement — active enforcement action: fine, investigation, consent order,
      or lawsuit filed
    Guidance — official guidance, recommendation, or opinion that is not yet binding
      (draft EDPB guidelines, ICO blog, FTC workshop proceedings, agency FAQ)
    Proposal — draft regulation, proposed rulemaking, public consultation, or
      legislative bill not yet enacted
    Commentary — analysis, reporting, or opinion from non-regulatory sources
      (law firm blog, trade press, academic commentary)",

  "source_strength": "Classify the article's source type:
    Primary regulator — content directly from the regulatory authority itself
      (EDPB publication, ICO press release, FTC enforcement notice, state AG filing)
    Legal analysis — analysis by practicing privacy lawyers or legal publications
      (Hunton, Fieldfisher, Linklaters, Bird & Bird, Law360, JD Supra)
    Media coverage — news or trade press reporting on regulatory developments
      (Reuters, IAPP news, AdExchanger, Digiday)",

  "cross_jurisdiction_signal": "If this article reflects a pattern occurring across
    multiple regulators or jurisdictions simultaneously, describe the pattern in
    one sentence. Examples:
    'Cookie consent enforcement coordinating across CNIL, ICO, and APD Belgium'
    'Children's privacy enforcement wave: ICO, FTC, and Texas AG acting in parallel'
    If no cross-jurisdiction pattern is evident, return null.",

  "risk_level": "Low | Medium | High | Critical — how urgently does this require
    compliance action? Low = monitoring only, Medium = review within quarter,
    High = review within weeks, Critical = immediate legal exposure"
}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Anthropic API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // If the AI determined the article is not relevant, skip it
    if (parsed.skip === true) return null;

    return parsed;
  } catch (e) {
    console.error("AI summary generation failed:", e);
    return null;
  }
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  // No auth check needed — this function only ingests public RSS data
  // and writes via service_role. Rate-limited by cron schedule.

  const results = { inserted: 0, skipped: 0, summaries_generated: 0, errors: [] as string[] };
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  for (const source of RSS_SOURCES) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EndUserPrivacy/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = extractAllItems(xml).slice(0, 10);

      for (const item of items) {
        let title = stripHtml(extractTag(item, "title"));
        const link = extractLink(item);
        let description = stripHtml(extractTag(item, "description") || extractTag(item, "summary") || extractTag(item, "content"));
        const pubDate = extractTag(item, "pubDate") || extractTag(item, "published") || extractTag(item, "dc:date");

        if (!title || !link || !link.startsWith("http")) continue;

        // Translate non-English content to English before processing
        if (anthropicKey && isLikelyNonEnglish(title + " " + description)) {
          const translated = await translateToEnglish(title, description, anthropicKey);
          title = translated.title;
          description = translated.description;
        }

        if (!isRelevant(title, description)) { results.skipped++; continue; }

        const category = categorize(title, description, source.defaultCategory);
        const imageUrl = await extractOgImage(link) || FALLBACK_IMAGES[category];

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
        };

        // Generate AI summary if API key is available
        if (anthropicKey) {
          const aiSummary = await generateAISummary(title, description, source.source, anthropicKey);
          if (aiSummary) {
            row.ai_summary = aiSummary;
            results.summaries_generated++;
          }
        }

        const { error } = await supabase
          .from("updates")
          .upsert(row, { onConflict: "url", ignoreDuplicates: true });

        if (error) results.skipped++;
        else results.inserted++;
      }
    } catch (e: any) {
      results.errors.push(`${source.source}: ${e.message}`);
    }
  }

  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  if (newsApiKey) {
    const queries = [
      "data privacy regulation enforcement",
      "GDPR privacy fine",
      "privacy law compliance",
      "AdTech advertising privacy regulation",
      "cookie consent enforcement GDPR",
      "FTC commercial surveillance advertising",
      "IAB TCF transparency consent framework",
      "behavioral advertising privacy law",
      "third party cookie privacy",
      "programmatic advertising regulation",
      // New coverage areas from expanded sources
      "California CPPA privacy enforcement",
      "Texas TDPSA data privacy",
      "HHS OCR HIPAA enforcement fine",
      "AEPD Spain GDPR fine",
      "Netherlands AP Autoriteit Persoonsgegevens",
      "Italian Garante data protection",
      "EU legislative privacy regulation",
      "state attorney general privacy enforcement",
    ];
    for (const q of queries) {
      try {
        const res = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const json = await res.json();
        for (const article of json.articles || []) {
          if (!article.title || !article.url || article.title === "[Removed]") continue;
          if (!isRelevant(article.title, article.description || "")) { results.skipped++; continue; }
          const domain = new URL(article.url).hostname.replace("www.", "");
          const category = categorize(article.title, article.description || "", "global");
          const row: Record<string, unknown> = {
            title: article.title.slice(0, 400),
            summary: (article.description || "").slice(0, 500) || null,
            url: article.url,
            source_name: article.source?.name || domain,
            source_domain: domain,
            image_url: article.urlToImage || FALLBACK_IMAGES[category],
            category,
            topic_tags: assignTopicTags(article.title, article.description || ""),
            regulator: article.source?.name || "",
            published_at: article.publishedAt || new Date().toISOString(),
            is_premium: false,
          };

          // Generate AI summary if API key is available
          if (anthropicKey) {
            const aiSummary = await generateAISummary(article.title, article.description || "", article.source?.name || "", anthropicKey);
            if (aiSummary) {
              row.ai_summary = aiSummary;
              results.summaries_generated++;
            }
          }

          const { error } = await supabase
            .from("updates")
            .upsert(row, { onConflict: "url", ignoreDuplicates: true });
          if (!error) results.inserted++;
          else results.skipped++;
        }
      } catch (e: any) {
        results.errors.push(`NewsAPI [${q}]: ${e.message}`);
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});