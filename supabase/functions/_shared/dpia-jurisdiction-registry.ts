// ─────────────────────────────────────────────────────────────────────────────
// DPIA Jurisdiction Resolver — Registries + Resolvers (Layers 1 & 2)
//
// Single source of truth for: supervisory authorities, transfer mechanisms,
// special-category national hooks, works-council instruments, statutory
// retention floors, and EDPB DPIA template status.
//
// The model never authors authority names or citations — it echoes the
// values returned by these resolvers. See Lovable-DPIA-Jurisdiction-Resolver
// build prompt for full spec.
//
// Maintenance rule: every literal authority / citation / national-law section
// / retention period must live HERE. Each entry carries verifyAgainst + lastVerified.
// ─────────────────────────────────────────────────────────────────────────────

export type CountryCode =
  | "DE" | "UK" | "IE" | "FR" | "ES" | "NL" | "IT" | "SE" | "DK" | "BE"
  | "AT" | "FI" | "LU" | "GR" | "PT" | "NO" | "CH" | "PL" | "CZ" | "HU"
  | "RO" | "BG" | "HR" | "SI" | "SK" | "EE" | "LV" | "LT" | "MT" | "CY"
  | "IS" | "LI" | "US";

export type Sector = "private" | "public" | "federal-public" | "telecom" | "postal";

export type GermanLand =
  | "Baden-Württemberg" | "Bavaria" | "Berlin" | "Brandenburg" | "Bremen"
  | "Hamburg" | "Hesse" | "Lower Saxony" | "Mecklenburg-Vorpommern"
  | "North Rhine-Westphalia" | "Rhineland-Palatinate" | "Saarland"
  | "Saxony" | "Saxony-Anhalt" | "Schleswig-Holstein" | "Thuringia";

export interface SupervisoryAuthority {
  id: string;
  name: string;
  city?: string;
  scope: string;
  verifyAgainst: string;
  lastVerified: string; // YYYY-MM-DD
}

// ── 1a. Supervisory authorities ──────────────────────────────────────────────
// Germany: PRIVATE-SECTOR controllers → Land authority. NEVER BfDI.
// BfDI supervises ONLY federal public bodies, telecoms, and postal services.

const DE_PRIVATE_BY_LAND: Record<GermanLand, SupervisoryAuthority> = {
  "Bavaria": { id: "DE-BY-private", name: "Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)", city: "Ansbach", scope: "private sector in Bavaria", verifyAgainst: "https://www.lda.bayern.de/", lastVerified: "2026-06-01" },
  "Baden-Württemberg": { id: "DE-BW-private", name: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW)", city: "Stuttgart", scope: "all sectors in Baden-Württemberg (single authority)", verifyAgainst: "https://www.baden-wuerttemberg.datenschutz.de/", lastVerified: "2026-06-01" },
  "Berlin": { id: "DE-BE-private", name: "Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI)", city: "Berlin", scope: "all sectors in Berlin", verifyAgainst: "https://www.datenschutz-berlin.de/", lastVerified: "2026-06-01" },
  "Brandenburg": { id: "DE-BB-private", name: "Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA BB)", city: "Kleinmachnow", scope: "all sectors in Brandenburg", verifyAgainst: "https://www.lda.brandenburg.de/", lastVerified: "2026-06-01" },
  "Bremen": { id: "DE-HB-private", name: "Die Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen (LfDI HB)", city: "Bremen", scope: "all sectors in Bremen", verifyAgainst: "https://www.datenschutz.bremen.de/", lastVerified: "2026-06-01" },
  "Hamburg": { id: "DE-HH-private", name: "Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit (HmbBfDI)", city: "Hamburg", scope: "all sectors in Hamburg", verifyAgainst: "https://datenschutz-hamburg.de/", lastVerified: "2026-06-01" },
  "Hesse": { id: "DE-HE-private", name: "Der Hessische Beauftragte für Datenschutz und Informationsfreiheit (HBDI)", city: "Wiesbaden", scope: "all sectors in Hesse", verifyAgainst: "https://datenschutz.hessen.de/", lastVerified: "2026-06-01" },
  "Lower Saxony": { id: "DE-NI-private", name: "Die Landesbeauftragte für den Datenschutz Niedersachsen (LfD NI)", city: "Hanover", scope: "all sectors in Lower Saxony", verifyAgainst: "https://lfd.niedersachsen.de/", lastVerified: "2026-06-01" },
  "Mecklenburg-Vorpommern": { id: "DE-MV-private", name: "Der Landesbeauftragte für Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern (LfDI MV)", city: "Schwerin", scope: "all sectors in Mecklenburg-Vorpommern", verifyAgainst: "https://www.datenschutz-mv.de/", lastVerified: "2026-06-01" },
  "North Rhine-Westphalia": { id: "DE-NW-private", name: "Die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)", city: "Düsseldorf", scope: "all sectors in North Rhine-Westphalia", verifyAgainst: "https://www.ldi.nrw.de/", lastVerified: "2026-06-01" },
  "Rhineland-Palatinate": { id: "DE-RP-private", name: "Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz (LfDI RLP)", city: "Mainz", scope: "all sectors in Rhineland-Palatinate", verifyAgainst: "https://www.datenschutz.rlp.de/", lastVerified: "2026-06-01" },
  "Saarland": { id: "DE-SL-private", name: "Unabhängiges Datenschutzzentrum Saarland (UDS)", city: "Saarbrücken", scope: "all sectors in Saarland", verifyAgainst: "https://www.datenschutz.saarland.de/", lastVerified: "2026-06-01" },
  "Saxony": { id: "DE-SN-private", name: "Die Sächsische Datenschutz- und Transparenzbeauftragte (SDTB)", city: "Dresden", scope: "all sectors in Saxony", verifyAgainst: "https://www.saechsdsb.de/", lastVerified: "2026-06-01" },
  "Saxony-Anhalt": { id: "DE-ST-private", name: "Landesbeauftragter für den Datenschutz Sachsen-Anhalt (LfD LSA)", city: "Magdeburg", scope: "all sectors in Saxony-Anhalt", verifyAgainst: "https://datenschutz.sachsen-anhalt.de/", lastVerified: "2026-06-01" },
  "Schleswig-Holstein": { id: "DE-SH-private", name: "Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)", city: "Kiel", scope: "all sectors in Schleswig-Holstein", verifyAgainst: "https://www.datenschutzzentrum.de/", lastVerified: "2026-06-01" },
  "Thuringia": { id: "DE-TH-private", name: "Thüringer Landesbeauftragter für den Datenschutz und die Informationsfreiheit (TLfDI)", city: "Erfurt", scope: "all sectors in Thuringia", verifyAgainst: "https://www.tlfdi.de/", lastVerified: "2026-06-01" },
};

const DE_BAYERN_PUBLIC: SupervisoryAuthority = {
  id: "DE-BY-public", name: "Bayerischer Landesbeauftragter für den Datenschutz (BayLfD)", city: "Munich",
  scope: "public bodies in Bavaria", verifyAgainst: "https://www.datenschutz-bayern.de/", lastVerified: "2026-06-01",
};

const BfDI: SupervisoryAuthority = {
  id: "DE-BfDI", name: "Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)", city: "Bonn",
  scope: "federal public bodies, telecoms, and postal services ONLY — never private sector",
  verifyAgainst: "https://www.bfdi.bund.de/", lastVerified: "2026-06-01",
};

const COUNTRY_SINGLE_AUTHORITY: Partial<Record<CountryCode, SupervisoryAuthority>> = {
  UK: { id: "UK-ICO", name: "Information Commissioner's Office (ICO)", city: "Wilmslow", scope: "all sectors UK", verifyAgainst: "https://ico.org.uk/", lastVerified: "2026-06-01" },
  IE: { id: "IE-DPC", name: "Data Protection Commission (DPC)", city: "Dublin", scope: "all sectors Ireland", verifyAgainst: "https://www.dataprotection.ie/", lastVerified: "2026-06-01" },
  FR: { id: "FR-CNIL", name: "Commission Nationale de l'Informatique et des Libertés (CNIL)", city: "Paris", scope: "all sectors France", verifyAgainst: "https://www.cnil.fr/", lastVerified: "2026-06-01" },
  ES: { id: "ES-AEPD", name: "Agencia Española de Protección de Datos (AEPD)", city: "Madrid", scope: "all sectors Spain", verifyAgainst: "https://www.aepd.es/", lastVerified: "2026-06-01" },
  NL: { id: "NL-AP", name: "Autoriteit Persoonsgegevens (AP)", city: "The Hague", scope: "all sectors Netherlands", verifyAgainst: "https://www.autoriteitpersoonsgegevens.nl/", lastVerified: "2026-06-01" },
  IT: { id: "IT-Garante", name: "Garante per la protezione dei dati personali", city: "Rome", scope: "all sectors Italy", verifyAgainst: "https://www.garanteprivacy.it/", lastVerified: "2026-06-01" },
  SE: { id: "SE-IMY", name: "Integritetsskyddsmyndigheten (IMY)", city: "Stockholm", scope: "all sectors Sweden", verifyAgainst: "https://www.imy.se/", lastVerified: "2026-06-01" },
  DK: { id: "DK-Datatilsynet", name: "Datatilsynet", city: "Copenhagen", scope: "all sectors Denmark", verifyAgainst: "https://www.datatilsynet.dk/", lastVerified: "2026-06-01" },
  BE: { id: "BE-APD", name: "Autorité de protection des données (APD) / Gegevensbeschermingsautoriteit (GBA)", city: "Brussels", scope: "all sectors Belgium", verifyAgainst: "https://www.autoriteprotectiondonnees.be/", lastVerified: "2026-06-01" },
  AT: { id: "AT-DSB", name: "Datenschutzbehörde (DSB)", city: "Vienna", scope: "all sectors Austria", verifyAgainst: "https://www.dsb.gv.at/", lastVerified: "2026-06-01" },
  FI: { id: "FI-TSV", name: "Tietosuojavaltuutetun toimisto (Office of the Data Protection Ombudsman)", city: "Helsinki", scope: "all sectors Finland", verifyAgainst: "https://tietosuoja.fi/", lastVerified: "2026-06-01" },
  LU: { id: "LU-CNPD", name: "Commission nationale pour la protection des données (CNPD)", city: "Belval", scope: "all sectors Luxembourg", verifyAgainst: "https://cnpd.public.lu/", lastVerified: "2026-06-01" },
  GR: { id: "GR-HDPA", name: "Hellenic Data Protection Authority (HDPA)", city: "Athens", scope: "all sectors Greece", verifyAgainst: "https://www.dpa.gr/", lastVerified: "2026-06-01" },
  PT: { id: "PT-CNPD", name: "Comissão Nacional de Protecção de Dados (CNPD)", city: "Lisbon", scope: "all sectors Portugal", verifyAgainst: "https://www.cnpd.pt/", lastVerified: "2026-06-01" },
  NO: { id: "NO-Datatilsynet", name: "Datatilsynet (Norway)", city: "Oslo", scope: "all sectors Norway", verifyAgainst: "https://www.datatilsynet.no/", lastVerified: "2026-06-01" },
  CH: { id: "CH-FDPIC", name: "Federal Data Protection and Information Commissioner (FDPIC / EDÖB)", city: "Bern", scope: "all sectors Switzerland (FADP)", verifyAgainst: "https://www.edoeb.admin.ch/", lastVerified: "2026-06-01" },
  PL: { id: "PL-UODO", name: "Urząd Ochrony Danych Osobowych (UODO)", city: "Warsaw", scope: "all sectors Poland", verifyAgainst: "https://uodo.gov.pl/", lastVerified: "2026-06-01" },
  CZ: { id: "CZ-UOOU", name: "Úřad pro ochranu osobních údajů (ÚOOÚ)", city: "Prague", scope: "all sectors Czech Republic", verifyAgainst: "https://www.uoou.cz/", lastVerified: "2026-06-01" },
  HU: { id: "HU-NAIH", name: "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)", city: "Budapest", scope: "all sectors Hungary", verifyAgainst: "https://www.naih.hu/", lastVerified: "2026-06-01" },
  RO: { id: "RO-ANSPDCP", name: "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)", city: "Bucharest", scope: "all sectors Romania", verifyAgainst: "https://www.dataprotection.ro/", lastVerified: "2026-06-01" },
  BG: { id: "BG-CPDP", name: "Commission for Personal Data Protection (CPDP)", city: "Sofia", scope: "all sectors Bulgaria", verifyAgainst: "https://www.cpdp.bg/", lastVerified: "2026-06-01" },
  HR: { id: "HR-AZOP", name: "Agencija za zaštitu osobnih podataka (AZOP)", city: "Zagreb", scope: "all sectors Croatia", verifyAgainst: "https://azop.hr/", lastVerified: "2026-06-01" },
  SI: { id: "SI-IP", name: "Informacijski pooblaščenec (IP RS)", city: "Ljubljana", scope: "all sectors Slovenia", verifyAgainst: "https://www.ip-rs.si/", lastVerified: "2026-06-01" },
  SK: { id: "SK-UOOU", name: "Úrad na ochranu osobných údajov SR", city: "Bratislava", scope: "all sectors Slovakia", verifyAgainst: "https://dataprotection.gov.sk/", lastVerified: "2026-06-01" },
  EE: { id: "EE-AKI", name: "Andmekaitse Inspektsioon (AKI)", city: "Tallinn", scope: "all sectors Estonia", verifyAgainst: "https://www.aki.ee/", lastVerified: "2026-06-01" },
  LV: { id: "LV-DVI", name: "Datu valsts inspekcija (DVI)", city: "Riga", scope: "all sectors Latvia", verifyAgainst: "https://www.dvi.gov.lv/", lastVerified: "2026-06-01" },
  LT: { id: "LT-VDAI", name: "Valstybinė duomenų apsaugos inspekcija (VDAI)", city: "Vilnius", scope: "all sectors Lithuania", verifyAgainst: "https://vdai.lrv.lt/", lastVerified: "2026-06-01" },
  MT: { id: "MT-IDPC", name: "Office of the Information and Data Protection Commissioner (IDPC)", city: "Floriana", scope: "all sectors Malta", verifyAgainst: "https://idpc.org.mt/", lastVerified: "2026-06-01" },
  CY: { id: "CY-DPC", name: "Office of the Commissioner for Personal Data Protection", city: "Nicosia", scope: "all sectors Cyprus", verifyAgainst: "https://www.dataprotection.gov.cy/", lastVerified: "2026-06-01" },
  IS: { id: "IS-Personuvernd", name: "Persónuvernd", city: "Reykjavík", scope: "all sectors Iceland", verifyAgainst: "https://www.personuvernd.is/", lastVerified: "2026-06-01" },
  LI: { id: "LI-DSS", name: "Datenschutzstelle Liechtenstein (DSS)", city: "Vaduz", scope: "all sectors Liechtenstein", verifyAgainst: "https://www.datenschutzstelle.li/", lastVerified: "2026-06-01" },
};

export interface SiteFacts {
  country: CountryCode | string;
  land?: GermanLand | string;
  sector?: Sector;
}

export function competentSA(site: SiteFacts): SupervisoryAuthority {
  const country = String(site.country || "").toUpperCase() as CountryCode;
  const sector: Sector = (site.sector || "private") as Sector;

  if (country === "DE") {
    if (sector === "federal-public" || sector === "telecom" || sector === "postal") return BfDI;
    if (sector === "public") {
      if (site.land === "Bavaria") return DE_BAYERN_PUBLIC;
      // Many Länder use the SAME authority for public and private; for those marked
      // "all sectors" in DE_PRIVATE_BY_LAND, the private entry is correct for public too.
      const auth = site.land ? DE_PRIVATE_BY_LAND[site.land as GermanLand] : undefined;
      if (auth && /all sectors/i.test(auth.scope)) return auth;
      return {
        id: `DE-${site.land || "unknown"}-public-unresolved`,
        name: `[TO COMPLETE — confirm Land public-sector authority for ${site.land || "the relevant Land"}; do NOT default to BfDI]`,
        scope: "public-sector authority for the Land", verifyAgainst: "", lastVerified: "2026-06-01",
      };
    }
    // private sector → MUST be a Land authority
    const auth = site.land ? DE_PRIVATE_BY_LAND[site.land as GermanLand] : undefined;
    if (auth) return auth;
    return {
      id: "DE-unknown-private", name: "[TO COMPLETE — identify the competent Land DPA; private-sector controllers in Germany are supervised by the Land authority, never the BfDI]",
      scope: "Land authority for the controller's Land", verifyAgainst: "", lastVerified: "2026-06-01",
    };
  }
  const single = COUNTRY_SINGLE_AUTHORITY[country];
  if (single) return single;
  return {
    id: `${country || "??"}-unresolved`,
    name: `[TO COMPLETE — identify competent supervisory authority for ${site.country || "the controller's country"}]`,
    scope: "competent SA", verifyAgainst: "", lastVerified: "2026-06-01",
  };
}

// ── OSS / Lead authority ─────────────────────────────────────────────────────
export interface OSSResult {
  ossAvailable: boolean;
  leadAuthority: SupervisoryAuthority | null;
  concernedAuthorities: SupervisoryAuthority[];
  rationale: string;
}

export function leadAuthorityAndOSS(input: {
  centralAdministrationCountry?: string;
  euEstablishmentWithDecisionAuthority?: { country: CountryCode | string; land?: string; sector?: Sector } | null;
  concernedSites?: SiteFacts[];
}): OSSResult {
  const concerned = (input.concernedSites || []).map(competentSA);
  const ca = String(input.centralAdministrationCountry || "").toUpperCase();
  const EEA = new Set<string>(["DE","UK","IE","FR","ES","NL","IT","SE","DK","BE","AT","FI","LU","GR","PT","NO","PL","CZ","HU","RO","BG","HR","SI","SK","EE","LV","LT","MT","CY","IS","LI"]);
  // UK is post-Brexit — UK GDPR OSS doesn't apply across EU.
  const caInEEA = EEA.has(ca) && ca !== "UK";
  if (caInEEA) {
    const lead = competentSA({ country: ca as CountryCode, sector: "private" });
    return {
      ossAvailable: true, leadAuthority: lead, concernedAuthorities: concerned,
      rationale: `Central administration in ${ca} — main establishment under GDPR Art. 4(16)(a) (controller limb: place of central administration in the Union); lead SA via Art. 56 one-stop-shop.`,
    };
  }
  if (input.euEstablishmentWithDecisionAuthority) {
    const lead = competentSA(input.euEstablishmentWithDecisionAuthority as SiteFacts);
    return {
      ossAvailable: true, leadAuthority: lead, concernedAuthorities: concerned,
      // FF-4 pd6 — corrected: this is still the Art. 4(16)(a) controller limb.
      // Where decisions on the purposes and means are taken in another
      // establishment of the controller in the Union with power to have them
      // implemented, that establishment is the main establishment. Art. 4(16)(b)
      // is the PROCESSOR limb and does not govern controller main-establishment.
      rationale: `Central administration outside the EU, but another establishment of the controller in the Union takes the decisions on the purposes and means of this processing and has the power to have them implemented → that establishment is the main establishment under GDPR Art. 4(16)(a) (controller limb, second clause).`,
    };
  }
  return {
    ossAvailable: false, leadAuthority: null, concernedAuthorities: concerned,
    rationale: `Central administration outside the EU and no EU establishment of the controller takes the decisions on the purposes and means of this processing → no main establishment under GDPR Art. 4(16)(a); OSS is unavailable; each concerned SA is independently competent (EDPB Guidelines 8/2022). (Art. 4(16)(b) governs the processor limb, not the controller.)`,
  };
}

// ── 1b. Transfer mechanisms ──────────────────────────────────────────────────
export interface TransferMechanism {
  id: string;
  mechanism: string;
  citation: string;
  tiaRequired: boolean;
  notes?: string;
  verifyAgainst: string;
  lastVerified: string;
}

const ADEQUACY_EU: Record<string, TransferMechanism> = {
  CH: { id: "EU-CH-adequacy", mechanism: "Adequacy decision (Switzerland)", citation: "Commission Decision 2000/518/EC (26 Jul 2000); review confirmed 15 Jan 2024 (SWD(2024) 3 final)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2000/518/oj", lastVerified: "2026-06-01" },
  UK: { id: "EU-UK-adequacy", mechanism: "Adequacy decision (United Kingdom)", citation: "Adequacy decision (United Kingdom) — renewed by the European Commission on 19 December 2025 (GDPR adequacy, Article 45), valid until 27 December 2031 with a Commission mid-point review after four years; supersedes Commission Implementing Decision (EU) 2021/1772. [Verify exact implementing-decision number for the 19 December 2025 renewal on EUR-Lex / the Commission adequacy-decisions page.]", tiaRequired: false, verifyAgainst: "https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en", lastVerified: "2026-06-26" },
  JP: { id: "EU-JP-adequacy", mechanism: "Adequacy decision (Japan)", citation: "Commission Implementing Decision (EU) 2019/419 (23 Jan 2019)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec_impl/2019/419/oj", lastVerified: "2026-06-01" },
  KR: { id: "EU-KR-adequacy", mechanism: "Adequacy decision (Republic of Korea)", citation: "Commission Implementing Decision (EU) 2022/254 (17 Dec 2021)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec_impl/2022/254/oj", lastVerified: "2026-06-01" },
  CA: { id: "EU-CA-adequacy", mechanism: "Adequacy decision (Canada — commercial organisations only)", citation: "Commission Decision 2002/2/EC (20 Dec 2001)", tiaRequired: false, notes: "PIPEDA-regulated commercial organisations only.", verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2002/2/oj", lastVerified: "2026-06-01" },
  AR: { id: "EU-AR-adequacy", mechanism: "Adequacy decision (Argentina)", citation: "Commission Decision 2003/490/EC (30 Jun 2003)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2003/490/oj", lastVerified: "2026-06-01" },
  NZ: { id: "EU-NZ-adequacy", mechanism: "Adequacy decision (New Zealand)", citation: "Commission Implementing Decision 2013/65/EU (19 Dec 2012)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec_impl/2013/65/oj", lastVerified: "2026-06-01" },
  IL: { id: "EU-IL-adequacy", mechanism: "Adequacy decision (Israel)", citation: "Commission Decision 2011/61/EU (31 Jan 2011)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2011/61/oj", lastVerified: "2026-06-01" },
  UY: { id: "EU-UY-adequacy", mechanism: "Adequacy decision (Uruguay)", citation: "Commission Implementing Decision 2012/484/EU (21 Aug 2012)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec_impl/2012/484/oj", lastVerified: "2026-06-01" },
  AD: { id: "EU-AD-adequacy", mechanism: "Adequacy decision (Andorra)", citation: "Commission Decision 2010/625/EU (19 Oct 2010)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2010/625/oj", lastVerified: "2026-06-01" },
  FO: { id: "EU-FO-adequacy", mechanism: "Adequacy decision (Faroe Islands)", citation: "Commission Decision 2010/146/EU (5 Mar 2010)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2010/146/oj", lastVerified: "2026-06-01" },
  GG: { id: "EU-GG-adequacy", mechanism: "Adequacy decision (Guernsey)", citation: "Commission Decision 2003/821/EC (21 Nov 2003)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2003/821/oj", lastVerified: "2026-06-01" },
  JE: { id: "EU-JE-adequacy", mechanism: "Adequacy decision (Jersey)", citation: "Commission Decision 2008/393/EC (8 May 2008)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2008/393/oj", lastVerified: "2026-06-01" },
  IM: { id: "EU-IM-adequacy", mechanism: "Adequacy decision (Isle of Man)", citation: "Commission Decision 2004/411/EC (28 Apr 2004)", tiaRequired: false, verifyAgainst: "https://eur-lex.europa.eu/eli/dec/2004/411/oj", lastVerified: "2026-06-01" },
};

const EU_US_DPF: TransferMechanism = { id: "EU-US-DPF", mechanism: "EU-US Data Privacy Framework (adequacy for DPF-certified importers)", citation: "Commission Implementing Decision (EU) 2023/1795 (10 Jul 2023)", tiaRequired: false, notes: "No SCCs and no TIA required while the importer's certification remains active. DPF validity is subject to active litigation — verify status before relying.", verifyAgainst: "https://www.dataprivacyframework.gov/", lastVerified: "2026-06-01" };
const EU_SCCS: TransferMechanism = { id: "EU-SCCs", mechanism: "Article 46 Standard Contractual Clauses + Transfer Impact Assessment (TIA)", citation: "Commission Implementing Decision (EU) 2021/914 (4 Jun 2021)", tiaRequired: true, verifyAgainst: "https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj", lastVerified: "2026-06-01" };
const UK_US_BRIDGE: TransferMechanism = { id: "UK-US-Bridge", mechanism: "UK-US Data Bridge (UK Extension to the EU-US DPF)", citation: "UK Extension to the EU-US Data Privacy Framework, in force 12 Oct 2023", tiaRequired: false, notes: "No IDTA required while the US importer's UK Extension certification remains active.", verifyAgainst: "https://www.dataprivacyframework.gov/uk-extension", lastVerified: "2026-06-01" };
const UK_IDTA: TransferMechanism = { id: "UK-IDTA", mechanism: "UK International Data Transfer Agreement (IDTA) or UK Addendum to EU SCCs + Transfer Risk Assessment (TRA)", citation: "ICO IDTA and Addendum, in force 21 Mar 2022", tiaRequired: true, verifyAgainst: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-data-transfer-agreement-and-guidance/", lastVerified: "2026-06-01" };
const INTERNAL: TransferMechanism = { id: "EEA-internal", mechanism: "No Chapter V transfer mechanism required (intra-EEA)", citation: "GDPR Art. 28 DPA only", tiaRequired: false, verifyAgainst: "—", lastVerified: "2026-06-01" };

export interface TransferFlow {
  originRegime: "EU" | "UK";
  destinationCountry: string; // ISO-2 or free text
  importerDpfCertified?: boolean;
  importerUkExtensionCertified?: boolean;
  importerEntity?: string;
}

const EEA_CODES = new Set(["DE","IE","FR","ES","NL","IT","SE","DK","BE","AT","FI","LU","GR","PT","NO","PL","CZ","HU","RO","BG","HR","SI","SK","EE","LV","LT","MT","CY","IS","LI"]);

export function transferMechanism(flow: TransferFlow): TransferMechanism {
  const dest = String(flow.destinationCountry || "").toUpperCase();
  if (flow.originRegime === "EU") {
    if (EEA_CODES.has(dest)) return INTERNAL;
    if (dest === "US") return flow.importerDpfCertified ? EU_US_DPF : EU_SCCS;
    const adq = ADEQUACY_EU[dest];
    if (adq) return adq;
    return EU_SCCS;
  }
  // UK origin
  if (dest === "US") return flow.importerUkExtensionCertified ? UK_US_BRIDGE : UK_IDTA;
  if (EEA_CODES.has(dest) || dest === "UK") {
    // UK has adequacy for EEA inbound; UK→EEA: ICO confirms transfers covered by UK adequacy regulations.
    return { id: "UK-EEA-adequacy", mechanism: "UK adequacy regulations (EEA + Gibraltar)", citation: "The Data Protection (Adequacy) (European Union) Regulations 2024", tiaRequired: false, verifyAgainst: "https://ico.org.uk/", lastVerified: "2026-06-01" };
  }
  return UK_IDTA;
}

// ── 1c. Special-category national hooks ──────────────────────────────────────
export interface SpecialCategoryHook {
  hook: string;
  caveat: string;
  verifyAgainst: string;
  lastVerified: string;
}

export function specialCategoryHook(country: string, art9Condition: string): SpecialCategoryHook | null {
  const c = String(country || "").toUpperCase();
  if (/9\(2\)\(b\)/.test(art9Condition) || /employment/i.test(art9Condition)) {
    if (c === "DE") return {
      hook: "§ 26 BDSG (employee data processing)",
      caveat: "Validity is contested following CJEU C-34/21 (30 Mar 2023, Hessischer Beauftragter für Datenschutz und Informationsfreiheit v. Land Hessen): § 26(1) BDSG was found not to satisfy the Art. 88(2) GDPR safeguards requirement. Do NOT present § 26 BDSG as a settled standalone basis. Recommend concluding a Betriebsvereinbarung (works agreement) as the authorising 'Member State law' under Art. 9(2)(b), with the appropriate-safeguards content required by Art. 88(2).",
      verifyAgainst: "https://www.gesetze-im-internet.de/bdsg_2018/__26.html ; CJEU C-34/21",
      lastVerified: "2026-06-01",
    };
    if (c === "UK") return {
      hook: "Data Protection Act 2018, Schedule 1, Part 1, paragraph 1 (employment, social security and social protection)",
      caveat: "Requires an Appropriate Policy Document under DPA 2018 Schedule 1, Part 4, paragraph 39, retained for the duration of processing + 6 months after the last processing event.",
      verifyAgainst: "https://www.legislation.gov.uk/ukpga/2018/12/schedule/1",
      lastVerified: "2026-06-01",
    };
  }
  return null;
}

// ── 1d. Works-council ────────────────────────────────────────────────────────
export function worksCouncil(country: string): { instrument: string; verifyAgainst: string; lastVerified: string } | null {
  const c = String(country || "").toUpperCase();
  if (c === "DE") return {
    instrument: "Betriebsverfassungsgesetz § 87(1)(6) — co-determination right of the works council for the introduction and use of technical devices designed to monitor employees' conduct or performance. Conclude a Betriebsvereinbarung (works agreement) before deployment.",
    verifyAgainst: "https://www.gesetze-im-internet.de/betrvg/__87.html",
    lastVerified: "2026-06-01",
  };
  if (c === "UK") return {
    instrument: "No statutory co-determination equivalent. Consider Information and Consultation of Employees Regulations 2004 (ICE) and recognised-union consultation obligations.",
    verifyAgainst: "https://www.legislation.gov.uk/uksi/2004/3426",
    lastVerified: "2026-06-01",
  };
  return null;
}

// ── 1e. Retention floors ─────────────────────────────────────────────────────
export interface RetentionFloor { floor: string; verifyAgainst: string; lastVerified: string; }

export function retentionFloor(country: string, recordType: string): RetentionFloor | null {
  const c = String(country || "").toUpperCase();
  const rt = String(recordType || "").toLowerCase();
  if (c === "UK") {
    if (/payroll|paye/.test(rt)) return { floor: "3 years after the end of the tax year (HMRC PAYE record-keeping requirement)", verifyAgainst: "https://www.gov.uk/paye-for-employers/keeping-records", lastVerified: "2026-06-01" };
    if (/accounting|company|companies act/.test(rt)) return { floor: "6 years (Companies Act 2006 s.388)", verifyAgainst: "https://www.legislation.gov.uk/ukpga/2006/46/section/388", lastVerified: "2026-06-01" };
  }
  if (c === "DE") {
    if (/commercial|tax|hgb|ao|accounting/.test(rt)) return { floor: "6 or 10 years depending on document class (HGB § 257; AO § 147)", verifyAgainst: "https://www.gesetze-im-internet.de/hgb/__257.html", lastVerified: "2026-06-01" };
  }
  return null;
}

// ── DPIA template status (date-aware) ────────────────────────────────────────
export function dpiaTemplateStatus(today: Date = new Date()): { label: string; phase: "draft" | "post-consultation" | "final" } {
  const consultationClose = new Date("2026-06-09");
  const finalised: Date | null = null;
  if (!finalised && today <= consultationClose) {
    return { label: "EDPB DPIA template v1.0 — public-consultation draft (adopted 10 Mar 2026; consultation closes 9 Jun 2026)", phase: "draft" };
  }
  if (!finalised) {
    return { label: "EDPB DPIA template v1.0 — post-consultation, pending finalisation (consultation closed 9 Jun 2026; final version not yet published)", phase: "post-consultation" };
  }
  return { label: "EDPB DPIA template v1.0 — final", phase: "final" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver façade — call once with intake, get ALL resolved facts for the prompt
// ─────────────────────────────────────────────────────────────────────────────

export interface DpiaIntakeFacts {
  controllerSites: SiteFacts[];                       // one per processing site
  centralAdministrationCountry?: string;              // for OSS
  euEstablishmentWithDecisionAuthority?: SiteFacts | null;
  transferFlows: TransferFlow[];
  article9Condition?: string;
  retentionRecordType?: string;                       // e.g. "payroll", "accounting"
}

export interface ResolvedJurisdiction {
  template: ReturnType<typeof dpiaTemplateStatus>;
  sites: Array<{ site: SiteFacts; competentSA: SupervisoryAuthority }>;
  oss: OSSResult;
  transfers: Array<{ flow: TransferFlow; resolved: TransferMechanism }>;
  specialCategoryHooks: Array<{ country: string; hook: SpecialCategoryHook | null }>;
  worksCouncils: Array<{ country: string; instrument: ReturnType<typeof worksCouncil> }>;
  retentionFloors: Array<{ country: string; recordType: string; floor: RetentionFloor | null }>;
}

export function resolveDpiaJurisdiction(facts: DpiaIntakeFacts): ResolvedJurisdiction {
  const sites = facts.controllerSites.map((s) => ({ site: s, competentSA: competentSA(s) }));
  const oss = leadAuthorityAndOSS({
    centralAdministrationCountry: facts.centralAdministrationCountry,
    euEstablishmentWithDecisionAuthority: facts.euEstablishmentWithDecisionAuthority ?? null,
    concernedSites: facts.controllerSites,
  });
  const transfers = facts.transferFlows.map((f) => ({ flow: f, resolved: transferMechanism(f) }));
  const countries = Array.from(new Set(facts.controllerSites.map((s) => String(s.country || "").toUpperCase())));
  const specialCategoryHooks = facts.article9Condition
    ? countries.map((c) => ({ country: c, hook: specialCategoryHook(c, facts.article9Condition!) }))
    : [];
  const worksCouncils = countries.map((c) => ({ country: c, instrument: worksCouncil(c) }));
  const retentionFloors = facts.retentionRecordType
    ? countries.map((c) => ({ country: c, recordType: facts.retentionRecordType!, floor: retentionFloor(c, facts.retentionRecordType!) }))
    : [];
  return { template: dpiaTemplateStatus(), sites, oss, transfers, specialCategoryHooks, worksCouncils, retentionFloors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt block — read-only resolved values handed to the model
// ─────────────────────────────────────────────────────────────────────────────

export function renderResolvedBlock(r: ResolvedJurisdiction): string {
  const lines: string[] = [];
  lines.push("════════ RESOLVED JURISDICTION FACTS (READ-ONLY — echo verbatim; do NOT alter) ════════");
  lines.push(`EDPB TEMPLATE STATUS: ${r.template.label}`);
  lines.push("");
  lines.push("COMPETENT SUPERVISORY AUTHORITIES (per processing site):");
  for (const s of r.sites) {
    const where = [s.site.country, s.site.land, s.site.sector].filter(Boolean).join(" / ");
    lines.push(`  • Site [${where}] → ${s.competentSA.name}${s.competentSA.city ? ` (${s.competentSA.city})` : ""}`);
  }
  lines.push("");
  lines.push("LEAD AUTHORITY / OSS:");
  if (r.oss.ossAvailable && r.oss.leadAuthority) {
    lines.push(`  Lead SA: ${r.oss.leadAuthority.name}`);
    lines.push(`  OSS available: YES. ${r.oss.rationale}`);
  } else {
    lines.push(`  Lead SA: NONE — OSS UNAVAILABLE.`);
    lines.push(`  Rationale: ${r.oss.rationale}`);
    lines.push(`  Implication: each concerned SA is independently competent. Do NOT assert a lead SA, a main establishment in the EU, or a one-stop-shop benefit anywhere in the document.`);
  }
  lines.push("");
  lines.push("TRANSFER MECHANISMS (per flow):");
  if (r.transfers.length === 0) {
    lines.push("  • No third-country transfers identified in intake.");
  } else {
    for (const t of r.transfers) {
      const imp = t.flow.importerEntity ? `${t.flow.importerEntity} → ` : "";
      lines.push(`  • ${imp}${t.flow.originRegime} → ${t.flow.destinationCountry}: ${t.resolved.mechanism}`);
      lines.push(`      Citation: ${t.resolved.citation}`);
      lines.push(`      TIA/TRA required: ${t.resolved.tiaRequired ? "YES" : "NO"}${t.resolved.notes ? ` — ${t.resolved.notes}` : ""}`);
    }
  }
  lines.push("");
  if (r.specialCategoryHooks.length) {
    lines.push("SPECIAL-CATEGORY NATIONAL HOOK(S):");
    for (const h of r.specialCategoryHooks) {
      if (!h.hook) { lines.push(`  • ${h.country}: [TO COMPLETE — confirm national provision with counsel]`); continue; }
      lines.push(`  • ${h.country}: ${h.hook.hook}`);
      lines.push(`      MANDATORY CAVEAT (must be rendered with the hook): ${h.hook.caveat}`);
    }
    lines.push("");
  }
  if (r.worksCouncils.some((w) => w.instrument)) {
    lines.push("WORKS-COUNCIL / CO-DETERMINATION:");
    for (const w of r.worksCouncils) {
      if (w.instrument) lines.push(`  • ${w.country}: ${w.instrument.instrument}`);
    }
    lines.push("");
  }
  if (r.retentionFloors.length) {
    lines.push("STATUTORY RETENTION FLOORS:");
    for (const f of r.retentionFloors) {
      if (f.floor) lines.push(`  • ${f.country} / ${f.recordType}: ${f.floor.floor}`);
      else lines.push(`  • ${f.country} / ${f.recordType}: [TO COMPLETE — confirm statutory minimum with counsel]`);
    }
    lines.push("");
  }
  lines.push("HARD RULES FOR THE MODEL:");
  lines.push("  1. You may NOT author any supervisory-authority name, EUR-Lex citation (e.g. \"(EU) 2021/914\"), national-law section (e.g. \"§ 26 BDSG\"), or Art./Article/§ number for jurisdiction-specific facts. Echo the strings above verbatim.");
  lines.push("  2. Use the SAME competent SA name everywhere in the document for a given site (scope banner, Art. 36 section, conditions, completion notes).");
  lines.push("  3. If OSS is UNAVAILABLE above, do NOT name a lead SA or assert a one-stop-shop benefit.");
  lines.push("  4. For EEA-internal flows, do NOT assert SCCs, IDTA, or TIA.");
  lines.push("  5. When citing a contested hook (e.g. § 26 BDSG), the mandatory caveat MUST be rendered with it.");
  lines.push("════════════════════════════════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 — Validator
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationFinding {
  code: string;
  severity: "error" | "warning";
  message: string;
  location?: string;
}

export function validateJurisdiction(report: any, resolved: ResolvedJurisdiction): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const text = JSON.stringify(report || {});

  // Check #2 — no BfDI for private-sector sites
  const hasPrivateSite = resolved.sites.some((s) => (s.site.sector || "private") === "private" && String(s.site.country).toUpperCase() === "DE");
  if (hasPrivateSite && /\bBfDI\b|Bundesbeauftragte[^.]{0,40}Informationsfreiheit/i.test(text)) {
    const allowed = resolved.sites.some((s) => s.competentSA.id === "DE-BfDI");
    if (!allowed) {
      findings.push({ code: "SA_BFDI_FOR_PRIVATE", severity: "error", message: "Report names BfDI but the resolved competent SA for the private-sector controller is a Land authority. BfDI supervises only federal public bodies, telecoms, and postal services." });
    }
  }

  // Check #1 — SA consistency: every named resolved SA must be the only one cited for that site's country/land
  for (const s of resolved.sites) {
    const expected = s.competentSA.name;
    if (expected.startsWith("[TO COMPLETE")) continue;
    if (!text.includes(expected.split(" (")[0])) {
      findings.push({ code: "SA_NOT_NAMED", severity: "warning", message: `Resolved competent SA "${expected}" was not echoed in the report.`, location: JSON.stringify(s.site) });
    }
  }

  // Check #3 — OSS honesty
  if (!resolved.oss.ossAvailable) {
    if (/one[- ]stop[- ]shop|lead supervisory authority|main establishment/i.test(text)) {
      // Allow phrases that include negation
      const negated = /no (EU )?main establishment|OSS (is )?unavailable|no lead (SA|supervisory authority)/i.test(text);
      if (!negated) findings.push({ code: "OSS_FALSE_ASSERTION", severity: "error", message: "OSS is unavailable per resolver, but report appears to assert a lead SA / one-stop-shop benefit without negating it." });
    }
  }

  // Check #4 — Chapter V instruments for EEA-internal flows
  for (const t of resolved.transfers) {
    if (t.resolved.id === "EEA-internal") {
      // Nothing to enforce on the flow itself unless the report claims SCCs apply to it — heuristic only.
    }
    if (t.resolved.citation && !t.resolved.citation.startsWith("—")) {
      if (!text.includes(t.resolved.citation.split(";")[0].trim().slice(0, 30))) {
        findings.push({ code: "TRANSFER_CITATION_MISSING", severity: "warning", message: `Resolved transfer citation not echoed: ${t.resolved.citation}` });
      }
    }
  }

  // Check #5 — § 26 BDSG caveat must accompany the hook
  if (/§\s*26\s*BDSG/.test(text) && !/C-?34\/21|Betriebsvereinbarung/i.test(text)) {
    findings.push({ code: "BDSG26_MISSING_CAVEAT", severity: "error", message: "§ 26 BDSG is cited without the mandatory C-34/21 / Betriebsvereinbarung caveat." });
  }

  // Check #6 — UK payroll = 3 years, not 6
  if (/UK[^.]{0,40}payroll[^.]{0,40}6\s*years/i.test(text)) {
    findings.push({ code: "UK_PAYROLL_RETENTION_WRONG", severity: "error", message: "UK payroll retention stated as 6 years; HMRC PAYE floor is 3 years after the end of the tax year." });
  }

  // Check #7 — citation freshness (180 days)
  const STALE_DAYS = 180;
  const now = Date.now();
  const allEntries: Array<{ lastVerified: string; label: string }> = [];
  for (const s of resolved.sites) allEntries.push({ lastVerified: s.competentSA.lastVerified, label: s.competentSA.name });
  for (const t of resolved.transfers) allEntries.push({ lastVerified: t.resolved.lastVerified, label: t.resolved.mechanism });
  for (const e of allEntries) {
    const d = Date.parse(e.lastVerified);
    if (!isNaN(d) && (now - d) / 86400000 > STALE_DAYS) {
      findings.push({ code: "REGISTRY_STALE", severity: "warning", message: `Registry entry "${e.label}" lastVerified ${e.lastVerified} — older than ${STALE_DAYS} days; re-verify.` });
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-processing — strip model-authored jurisdiction tokens (defence in depth)
// ─────────────────────────────────────────────────────────────────────────────

const AUTHORITY_TOKENS = [
  "BfDI", "BayLDA", "BayLfD", "ICO", "DPC", "CNIL", "AEPD", "AP", "Garante",
  "IMY", "Datatilsynet", "APD", "DSB", "CNPD", "FDPIC", "EDÖB", "UODO", "ÚOOÚ",
  "NAIH", "ANSPDCP", "CPDP", "AZOP", "AKI", "DVI", "VDAI", "IDPC", "Persónuvernd", "DSS",
];

// Reserved for future selective stripping — currently we surface raw model
// output and rely on prompt + validator. Exported in case callers want it.
export function stripModelJurisdictionTokens(text: string, allowedNames: string[]): string {
  let out = text;
  for (const tok of AUTHORITY_TOKENS) {
    const re = new RegExp(`\\b${tok}\\b`, "g");
    out = out.replace(re, (match) => allowedNames.some((n) => n.includes(match)) ? match : `[redacted: model named ${match} — use resolved SA]`);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART A — Consolidated GDPR registry (SA names + Article-6 LI examples)
// Single source of truth consumed by LIA, DPIA, and Governance.
// ─────────────────────────────────────────────────────────────────────────────

export const EU_SUPERVISORY_AUTHORITIES: Record<string, string> = {
  AT: "DSB (Datenschutzbehörde)",
  BE: "GBA / APD", // never "APE"
  BG: "CPDP",
  HR: "AZOP",
  CY: "OAD",
  CZ: "ÚOOÚ",
  DK: "Datatilsynet",
  EE: "AKI",
  FI: "Tietosuojavaltuutettu",
  FR: "CNIL",
  // Germany handled by resolveSupervisoryAuthorityName (Land vs federal) — NOT a flat string
  GR: "HDPA",
  HU: "NAIH",
  IE: "DPC",
  IT: "Garante",
  LV: "DVI",
  LT: "VDAI",
  LU: "CNPD",
  MT: "IDPC",
  NL: "AP (Autoriteit Persoonsgegevens)", // never "UODO" (that is Poland)
  PL: "UODO",
  PT: "CNPD",
  RO: "ANSPDCP",
  SK: "ÚOOÚ",
  SI: "IP",
  ES: "AEPD",
  SE: "IMY (Integritetsskyddsmyndigheten)",
  GB: "ICO",
  UK: "ICO",
};

/**
 * Resolves the correct supervisory-authority NAME for a country.
 * Germany routes through competentSA so that private-sector controllers
 * receive the relevant Land authority — never the BfDI.
 */
export function resolveSupervisoryAuthorityName(
  country: string,
  opts?: { land?: string; sector?: Sector },
): string {
  const c = (country || "").toUpperCase();
  if (c === "DE") {
    return competentSA({
      country: "DE",
      land: opts?.land as any,
      sector: (opts?.sector ?? "private") as Sector,
    }).name;
  }
  return EU_SUPERVISORY_AUTHORITIES[c] ?? `the relevant supervisory authority in ${country}`;
}

export type GdprRegime = "gdpr" | "uk_gdpr";

/**
 * Article-6 legitimate-interest example citations, jurisdiction-conditional.
 * EU GDPR has NO Article 6(11); recital citations are the correct anchor.
 * UK GDPR (DUAA 2025, in force 5 Feb 2026) inserted Article 6(11) with an
 * exhaustive list of recognised-legitimate-interests examples, and separately
 * Article 6(1)(ea) + Annex 1 (recognised-legitimate-interests basis — no
 * balancing test, five public-interest purposes, private/third-sector only).
 * These two provisions are distinct and must never be conflated.
 *
 * C1-a (2026-07-23T14:20:00Z) — the three UK sites are parameterised by regime
 * and quote the corpus-verified verbatim UK Article 6(11) text (see
 * grade-single-assessment/index.ts L144 and run-quality-batch/index.ts L904:
 * "UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025
 * (recognised-legitimate-interests examples: direct marketing, intra-group
 * transmission for internal administrative purposes, network and information
 * security)"). Each site names its example verbatim; no paraphrase.
 */
export function resolveArticle6Examples(regime: GdprRegime): {
  directMarketing: string;
  intraGroup: string;
  networkSecurity: string;
  recognisedLI: string;
} {
  if (regime === "uk_gdpr") {
    return {
      // Site 1 — verbatim from the corpus-verified Art. 6(11) list.
      directMarketing:
        "Article 6(11) UK GDPR, inserted by the Data (Use and Access) Act 2025 — recognised-legitimate-interests example: \"direct marketing\" (LIA/balancing test still required).",
      // Site 2 — verbatim from the corpus-verified Art. 6(11) list.
      intraGroup:
        "Article 6(11) UK GDPR, inserted by the Data (Use and Access) Act 2025 — recognised-legitimate-interests example: \"intra-group transmission for internal administrative purposes\" (LIA/balancing test still required).",
      // Site 3 — verbatim from the corpus-verified Art. 6(11) list.
      networkSecurity:
        "Article 6(11) UK GDPR, inserted by the Data (Use and Access) Act 2025 — recognised-legitimate-interests example: \"network and information security\" (LIA/balancing test still required).",
      recognisedLI:
        "Article 6(1)(ea) + Annex 1 UK GDPR — recognised legitimate interests (no balancing test; five public-interest purposes; private/third-sector only). Do NOT conflate with Article 6(11).",
    };
  }
  return {
    // EU GDPR — no Article 6(11).
    directMarketing: "Recital 47 EU GDPR",
    intraGroup: "Recital 48 EU GDPR",
    networkSecurity: "Recital 49 EU GDPR",
    recognisedLI:
      "N/A — EU GDPR has no 'recognised legitimate interests' basis (that is a UK GDPR / DUAA 2025 construct).",
  };
}

/**
 * Renderable citation block for injection into LIA / Governance system prompts.
 * Mirrors renderResolvedBlock so the model can cite SA names + Article-6 examples
 * deterministically rather than from its own recall.
 */
export function renderGdprCitationBlock(input: {
  regime: GdprRegime;
  jurisdictions: string[];
}): string {
  const a6 = resolveArticle6Examples(input.regime);
  const sas = (input.jurisdictions || [])
    .map((j) => `${j}: ${resolveSupervisoryAuthorityName(j)}`)
    .join("; ");
  return [
    "RESOLVED GDPR CITATIONS (authoritative — use ONLY these for the items below):",
    `Regime: ${
      input.regime === "uk_gdpr"
        ? "UK GDPR (DUAA 2025 in force 5 Feb 2026)"
        : "EU GDPR (Regulation (EU) 2016/679)"
    }`,
    `Legitimate-interest examples — direct marketing: ${a6.directMarketing}; intra-group: ${a6.intraGroup}; network/info security: ${a6.networkSecurity}.`,
    `Recognised legitimate interests: ${a6.recognisedLI}`,
    sas ? `Supervisory authorities: ${sas}.` : "",
    "For German private-sector controllers the competent authority is the relevant Land authority, never the BfDI.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── FORK-R1: AI Act citation block (additive — no existing output changes) ───
// Identity + four current-law phased dates + Digital Omnibus WATCH note.
// Per Team 3: Omnibus framed as PENDING PROVISIONAL AGREEMENT, never as
// current law, until OJ publication.

export const AI_ACT = {
  id: "EU-AI-Act",
  identifier: "Regulation (EU) 2024/1689",
  inForce: "1 August 2024",
  phasedDates: {
    prohibitedAndLiteracy: "2 February 2025", // Article 5 + AI literacy
    gpaiAndGovernance: "2 August 2025",       // Chapter V GPAI + governance
    highRiskAnnexIII: "2 August 2026",        // Article 6(2) / Annex III
    highRiskAnnexI: "2 August 2027",          // Annex I safety-component systems
  },
  digitalOmnibus: {
    instrument: "Digital Omnibus on AI (COM(2025) 836)",
    statusAsOf: "2026-06-26",
    status: "Provisional political agreement reached 6–7 May 2026 — NOT YET ADOPTED / NOT YET PUBLISHED IN OJ",
    proposedDeferrals: {
      highRiskAnnexIII: "2 December 2027",
      highRiskAnnexI: "2 August 2028",
    },
    proposedAdditions:
      "New Article 5 NCII/CSAM ban (~2 Dec 2026); Article 50(2) watermarking → 2 Dec 2026",
  },
  verifyAgainst: "https://artificialintelligenceact.eu/implementation-timeline/",
  lastVerified: "2026-06-26",
} as const;

export function renderAiActCitationBlock(): string {
  const a = AI_ACT;
  return [
    "EU AI ACT — RESOLVED CITATIONS (authoritative — use ONLY these facts and dates):",
    `Identity: ${a.identifier}, in force ${a.inForce}. The AI Act is enacted law — never call it a proposal, proposed regulation, or draft, and never use any identifier other than ${a.identifier} (never 2024/900 or any other number).`,
    "PHASED APPLICATION (current operative law — cite the date that matches the system/registration type; never a single blanket date):",
    `- Prohibited practices (Article 5) + AI literacy: applied from ${a.phasedDates.prohibitedAndLiteracy}.`,
    `- General-purpose AI model obligations (Chapter V) + governance: applied from ${a.phasedDates.gpaiAndGovernance}.`,
    `- Majority of high-risk obligations (Article 6(2) / Annex III systems and most of Chapters III, IV, VI–IX): apply from ${a.phasedDates.highRiskAnnexIII}.`,
    `- High-risk AI systems that are safety components of products under the Annex I Union harmonisation legislation: apply from ${a.phasedDates.highRiskAnnexI}.`,
    `WATCH — ${a.digitalOmnibus.instrument}: ${a.digitalOmnibus.status}. Pending provisional agreement (as of ${a.digitalOmnibus.statusAsOf}) would defer Annex III high-risk obligations to ${a.digitalOmnibus.proposedDeferrals.highRiskAnnexIII} and Annex I high-risk obligations to ${a.digitalOmnibus.proposedDeferrals.highRiskAnnexI}; ${a.digitalOmnibus.proposedAdditions}. Until publication in the Official Journal, the dates above remain operative — present any Omnibus deferral expressly as a pending agreement, never as current law.`,
    `Verify against: ${a.verifyAgainst} (last verified ${a.lastVerified}).`,
  ].join("\n");
}

// ─── FORK-R1: Transfer-adequacy note (additive, separate from renderGdprCitationBlock per P5) ───
// Surfaces the specific EU-UK dated fact already homed in ADEQUACY_EU.UK,
// while preserving the generic verify-note for any other adequacy decision.

export function renderTransferAdequacyNote(): string {
  return [
    "TRANSFER ADEQUACY — RESOLVED CITATION (authoritative):",
    `EU-UK: ${ADEQUACY_EU.UK.citation}`,
    "For any OTHER adequacy decision cited as a transfer mechanism, append: [Verify current status — adequacy decisions are subject to periodic Commission review].",
  ].join("\n");
}
