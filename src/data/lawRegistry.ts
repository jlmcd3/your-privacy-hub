/**
 * Law Registry — canonical source of truth for tracked laws & regulations.
 *
 * Each entry maps a canonical law name (as it appears in calendar/feed data)
 * to its internal jurisdiction page and the authoritative government URL.
 *
 * URL VERIFICATION POLICY:
 *   - `verifiedAt` is set ONLY after a human or `scripts/verify-law-urls.mjs`
 *     confirms `officialUrl` resolves with HTTP 200.
 *   - UI components MUST NOT render a hyperlink to `officialUrl` unless
 *     `verifiedAt` is present and within 180 days. Use `isUrlFresh()`.
 *   - Internal `internalPath` links are always safe to render.
 *
 * When adding a new law:
 *   1. Add entry below with `verifiedAt: null`
 *   2. Run: node scripts/verify-law-urls.mjs
 *   3. Paste the timestamp returned for that key into `verifiedAt`
 */

export interface LawRegistryEntry {
  /** Canonical name as it appears in calendar JSON / feed `law` field */
  name: string;
  /** Internal route on enduserprivacy.com */
  internalPath: string;
  /** Authoritative government / official source URL */
  officialUrl: string;
  /** ISO timestamp when officialUrl was last confirmed reachable (null = unverified, do not link) */
  verifiedAt: string | null;
  /** Optional aliases / alternate spellings found in feed data */
  aliases?: string[];
}

export const LAW_REGISTRY: LawRegistryEntry[] = [
  // ─── U.S. STATE COMPREHENSIVE PRIVACY LAWS ───
  {
    name: "Indiana SB 5",
    aliases: ["Indiana Comprehensive Privacy Law", "Indiana CDPA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://iga.in.gov/legislative/2023/bills/senate/5",
    verifiedAt: null,
  },
  {
    name: "Kentucky HB 15",
    aliases: ["Kentucky Consumer Data Protection Act", "KCDPA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://apps.legislature.ky.gov/record/24rs/hb15.html",
    verifiedAt: null,
  },
  {
    name: "Rhode Island HB 6122",
    aliases: ["Rhode Island Data Transparency and Privacy Protection Act", "RIDTPPA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://webserver.rilegislature.gov/BillText24/HouseText24/H7787.pdf",
    verifiedAt: null,
  },
  {
    name: "Maryland MODPA",
    aliases: ["Maryland Online Data Privacy Act", "Maryland SB 541"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://mgaleg.maryland.gov/2024RS/bills/sb/sb0541E.pdf",
    verifiedAt: null,
  },
  {
    name: "Minnesota HF 2309",
    aliases: ["Minnesota Consumer Data Privacy Act", "MCDPA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://www.revisor.mn.gov/bills/text.php?number=HF2309&session=ls93&version=latest&session_number=0&session_year=2024",
    verifiedAt: null,
  },
  {
    name: "Nebraska LB 1074",
    aliases: ["Nebraska Data Privacy Act", "NDPA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://nebraskalegislature.gov/bills/view_bill.php?DocumentID=55961",
    verifiedAt: null,
  },

  // ─── CALIFORNIA ───
  {
    name: "CPRA",
    aliases: ["California Privacy Rights Act", "CCPA/CPRA"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://cppa.ca.gov/regulations/",
    verifiedAt: null,
  },
  {
    name: "SB 362",
    aliases: ["California Delete Act", "Delete Act", "Opt Me Out"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB362",
    verifiedAt: null,
  },

  // ─── COLORADO ───
  {
    name: "Colorado SB 24-205",
    aliases: ["Colorado Algorithmic Accountability Act", "Colorado AI Act"],
    internalPath: "/jurisdiction/united-states",
    officialUrl: "https://leg.colorado.gov/bills/sb24-205",
    verifiedAt: null,
  },

  // ─── EUROPEAN UNION ───
  {
    name: "EU AI Act",
    aliases: ["AI Act", "Artificial Intelligence Act"],
    internalPath: "/jurisdiction/european-union",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    verifiedAt: null,
  },
  {
    name: "GDPR",
    aliases: ["General Data Protection Regulation"],
    internalPath: "/jurisdiction/european-union",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verifiedAt: null,
  },

  // ─── GLOBAL ───
  {
    name: "LGPD",
    aliases: ["Lei Geral de Proteção de Dados", "Brazil LGPD"],
    internalPath: "/jurisdiction/brazil",
    officialUrl: "https://www.gov.br/anpd/pt-br",
    verifiedAt: null,
  },
];

/**
 * Lookup a law by canonical name or alias (case-insensitive).
 */
export function findLaw(query: string | null | undefined): LawRegistryEntry | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const entry of LAW_REGISTRY) {
    if (entry.name.toLowerCase() === q) return entry;
    if (entry.aliases?.some((a) => a.toLowerCase() === q)) return entry;
  }
  return null;
}

const FRESH_DAYS = 180;

/**
 * Returns true if the officialUrl was verified within FRESH_DAYS.
 * Use this to gate whether to render a hyperlink to the gov source.
 */
export function isUrlFresh(entry: LawRegistryEntry | null): boolean {
  if (!entry?.verifiedAt) return false;
  const verified = new Date(entry.verifiedAt).getTime();
  if (Number.isNaN(verified)) return false;
  const ageMs = Date.now() - verified;
  return ageMs < FRESH_DAYS * 24 * 60 * 60 * 1000;
}
