// Deterministic verification checks. Pure functions, no I/O.
// Each returns { verdict, evidence_text?, evidence_offset_start?, evidence_offset_end? }.

export type CheckVerdict = "pass" | "fail" | "uncertain" | "skipped";
export type CheckResult = {
  verdict: CheckVerdict;
  evidence_text?: string;
  evidence_offset_start?: number;
  evidence_offset_end?: number;
};

// Top-30 regulator alias map (canonical full name → list of common aliases/abbreviations).
const REGULATOR_ALIASES: Record<string, string[]> = {
  CNIL: ["CNIL", "Commission Nationale de l'Informatique et des Libertés"],
  AEPD: ["AEPD", "Agencia Española de Protección de Datos", "Spanish Data Protection Agency"],
  ICO: ["ICO", "Information Commissioner's Office", "Information Commissioner"],
  BfDI: ["BfDI", "Bundesbeauftragte für den Datenschutz"],
  Garante: ["Garante", "Garante per la protezione dei dati personali", "Italian Data Protection Authority"],
  UODO: ["UODO", "Urząd Ochrony Danych Osobowych", "Polish Data Protection Authority"],
  DPC: ["DPC", "Data Protection Commission", "Irish Data Protection Commission"],
  APD: ["APD", "Autorité de protection des données", "Belgian DPA"],
  AP: ["AP", "Autoriteit Persoonsgegevens", "Dutch DPA"],
  Datatilsynet: ["Datatilsynet", "Norwegian Data Protection Authority", "Danish Data Protection Authority"],
  IMY: ["IMY", "Integritetsskyddsmyndigheten", "Swedish Authority for Privacy Protection"],
  EDPB: ["EDPB", "European Data Protection Board"],
  EDPS: ["EDPS", "European Data Protection Supervisor"],
  HHS: ["HHS", "Department of Health and Human Services", "Office for Civil Rights"],
  FTC: ["FTC", "Federal Trade Commission"],
  SEC: ["SEC", "Securities and Exchange Commission"],
  CPPA: ["CPPA", "California Privacy Protection Agency"],
  "California Attorney General": ["California Attorney General", "California AG", "Office of the Attorney General of California"],
  "Texas Attorney General": ["Texas Attorney General", "Texas AG", "Office of the Attorney General of Texas"],
  NYAG: ["NYAG", "New York Attorney General", "New York AG"],
  PCPD: ["PCPD", "Privacy Commissioner for Personal Data", "Hong Kong PCPD"],
  PIPC: ["PIPC", "Personal Information Protection Commission"],
  OAIC: ["OAIC", "Office of the Australian Information Commissioner"],
  OPC: ["OPC", "Office of the Privacy Commissioner of Canada"],
  ANPD: ["ANPD", "Autoridade Nacional de Proteção de Dados"],
  INAI: ["INAI", "Instituto Nacional de Transparencia"],
  NPC: ["NPC", "National Privacy Commission"],
  PDPC: ["PDPC", "Personal Data Protection Commission"],
  CAC: ["CAC", "Cyberspace Administration of China"],
  BSI: ["BSI", "Bundesamt für Sicherheit in der Informationstechnik"],
};

function stripCorporateSuffix(name: string): string {
  return name
    .replace(/\b(Inc\.?|Incorporated|Ltd\.?|Limited|LLC|LLP|S\.A\.S?\.?|GmbH|Sp\.?\s*z\s*o\.?o\.?|S\.p\.A\.|S\.A\.|S\.L\.|N\.V\.|B\.V\.|Co\.?|Corp\.?|Corporation|AG|PLC|Pty\.?|Limitada|Lda\.?)\b/gi, "")
    .replace(/[,]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Normalisation layer (Package 7 smoke-fix). All transforms are pure and
// deterministic — they run on BOTH the corpus value and the source-document
// text before any exact substring comparison. No fuzzy matching.
// ---------------------------------------------------------------------------

const STATUTE_ALIASES: Array<[RegExp, string]> = [
  // GDPR variants
  [/\bAVG\b/gi, "GDPR"],
  [/\bRGPD\b/gi, "GDPR"],
  [/\bDSGVO\b/gi, "GDPR"],
  [/\bGDPR\b/gi, "GDPR"],
  [/Regolamento\s+UE\s+2016\/679/gi, "GDPR"],
  [/Reglamento\s+\(UE\)\s+2016\/679/gi, "GDPR"],
  [/Règlement\s+\(UE\)\s+2016\/679/gi, "GDPR"],
  [/Verordnung\s+\(EU\)\s+2016\/679/gi, "GDPR"],
  [/Rozporządzenie\s+2016\/679/gi, "GDPR"],
  // Spanish national implementation
  [/\bLOPDGDD\b/gi, "LOPDGDD"],
  [/Ley\s+Org[áa]nica\s+3\/2018/gi, "LOPDGDD"],
  // German national implementation
  [/\bBDSG\b/gi, "BDSG"],
  [/Bundesdatenschutzgesetz/gi, "BDSG"],
  // UK
  [/\bUK\s+GDPR\b/gi, "UK GDPR"],
  [/Data\s+Protection\s+Act\s+2018/gi, "DPA 2018"],
  // California
  [/California\s+Consumer\s+Privacy\s+Act/gi, "CCPA"],
  [/California\s+Privacy\s+Rights\s+Act/gi, "CPRA"],
  [/\bCCPA\b/gi, "CCPA"],
  // Illinois
  [/Biometric\s+Information\s+Privacy\s+Act/gi, "BIPA"],
  [/\bBIPA\b/gi, "BIPA"],
  [/740\s+ILCS\s+14/gi, "BIPA"],
  // Texas
  [/Texas\s+Data\s+Privacy\s+and\s+Security\s+Act/gi, "TDPSA"],
  [/\bTDPSA\b/gi, "TDPSA"],
  [/Capture\s+or\s+Use\s+of\s+Biometric\s+Identifier/gi, "CUBI"],
  [/\bCUBI\b/gi, "CUBI"],
  // Washington
  [/My\s+Health\s+My\s+Data\s+Act/gi, "MHMDA"],
  [/\bMHMDA\b/gi, "MHMDA"],
];

export function normaliseStatuteNames(text: string): string {
  let result = text;
  for (const [pattern, replacement] of STATUTE_ALIASES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function normaliseArticleCitations(text: string): string {
  let result = text;

  // Dutch: "art. 5, lid 1, onder a"
  result = result.replace(
    /\bart(?:ikel|\.)?\s*(\d+)(?:\s*,?\s*lid\s+(\d+))?(?:\s*,?\s*onder\s+([a-z]))?/gi,
    (_m, art, lid, onder) => {
      let out = `Article ${art}`;
      if (lid) out += `(${lid})`;
      if (onder) out += `(${String(onder).toLowerCase()})`;
      return out;
    },
  );

  // German: "Art. 5 Abs. 1 lit. a"
  result = result.replace(
    /\b(?:Art(?:ikel|\.)?)\s*(\d+)(?:\s*Abs(?:atz|\.)?\s*(\d+))?(?:\s*(?:lit\.?|Buchstabe)\s*([a-z]))?/gi,
    (_m, art, abs, lit) => {
      let out = `Article ${art}`;
      if (abs) out += `(${abs})`;
      if (lit) out += `(${String(lit).toLowerCase()})`;
      return out;
    },
  );

  // French
  result = result.replace(
    /\bart(?:icle|\.)?\s*(\d+)(?:\s*,?\s*paragraphe\s+(\d+))?(?:\s*,?\s*point\s+([a-z]))?/gi,
    (_m, art, par, point) => {
      let out = `Article ${art}`;
      if (par) out += `(${par})`;
      if (point) out += `(${String(point).toLowerCase()})`;
      return out;
    },
  );

  // Italian
  result = result.replace(
    /\bart(?:icolo|\.)?\s*(\d+)(?:\s*,?\s*par(?:agrafo|\.)?\s*(\d+))?(?:\s*,?\s*lett(?:era|\.)?\s*([a-z]))?/gi,
    (_m, art, par, lett) => {
      let out = `Article ${art}`;
      if (par) out += `(${par})`;
      if (lett) out += `(${String(lett).toLowerCase()})`;
      return out;
    },
  );

  // Spanish
  result = result.replace(
    /\bart(?:[íi]culo|\.)?\s*(\d+)(?:\s*,?\s*apartado\s+(\d+))?(?:\s*,?\s*letra\s+([a-z]))?/gi,
    (_m, art, ap, letra) => {
      let out = `Article ${art}`;
      if (ap) out += `(${ap})`;
      if (letra) out += `(${String(letra).toLowerCase()})`;
      return out;
    },
  );

  // Polish
  result = result.replace(
    /\bart(?:ykuł|\.)?\s*(\d+)(?:\s*ust(?:ęp|\.)?\s*(\d+))?(?:\s*lit(?:era|\.)?\s*([a-z]))?/gi,
    (_m, art, ust, lit) => {
      let out = `Article ${art}`;
      if (ust) out += `(${ust})`;
      if (lit) out += `(${String(lit).toLowerCase()})`;
      return out;
    },
  );

  // Canonical Article N(M)(letter) — normalise whitespace + lowercase letter
  result = result.replace(
    /\bArticle\s+(\d+)\s*(?:\(\s*(\d+)\s*\))?\s*(?:\(\s*([a-z])\s*\))?/gi,
    (_m, art, num, letter) => {
      let out = `Article ${art}`;
      if (num) out += `(${num})`;
      if (letter) out += `(${String(letter).toLowerCase()})`;
      return out;
    },
  );

  // CCPA section patterns
  result = result.replace(
    /(?:§\s*|Section\s+|Sec\.\s+)?(1798\.\d+(?:\.\d+)?)\s*(?:\(([a-z])\))?/gi,
    (_m, section, letter) => {
      let out = `§${section}`;
      if (letter) out += `(${String(letter).toLowerCase()})`;
      return out;
    },
  );

  // BIPA section normalisation
  result = result.replace(
    /(?:740\s+ILCS\s+14\/|BIPA\s+Section\s+|Section\s+)(\d+)\s*(?:\(([a-z])\))?/gi,
    (_m, sec, letter) => {
      let out = `Section ${sec}`;
      if (letter) out += `(${String(letter).toLowerCase()})`;
      return out;
    },
  );

  return result;
}

const CORPORATE_SUFFIXES = [
  // English
  "Inc.", "Inc", "LLC", "L.L.C.", "Ltd.", "Ltd", "Limited", "Corp.", "Corp",
  "Corporation", "Co.", "Co", "Company", "PLC", "P.L.C.", "L.P.", "LP",
  // Spanish / Portuguese
  "S.A.", "S A", "SA", "S.L.", "SL", "S.L.U.", "SLU", "S.A.S.", "SAS",
  // French
  "SAS", "SARL", "S.A.R.L.", "EURL", "SASU",
  // German / Austrian
  "GmbH", "AG", "KG", "GmbH & Co. KG", "mbH", "OHG",
  // Italian
  "S.p.A.", "SpA", "S.r.l.", "Srl", "S.a.s.", "Sas",
  // Dutch
  "B.V.", "BV", "N.V.", "NV", "V.O.F.", "VOF",
  // Polish
  "Sp. z o.o.", "Sp z o o", "sp. z o.o.", "SK",
  // Nordic
  "AB", "A/S", "AS", "Oy", "ApS", "ASA",
  // Swiss
  "Sàrl", "S.à r.l.",
];

export function normaliseSubjectName(text: string): string {
  let result = text;
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const sorted = [...CORPORATE_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`,?\\s*\\b${escaped}\\b\\.?`, "gi");
    result = result.replace(pattern, "");
  }
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

export function normaliseNumericString(s: string): string {
  let cleaned = s.replace(/[^\d.,]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep > 0 && cleaned.length - lastSep <= 3) {
    const integerPart = cleaned.substring(0, lastSep).replace(/[.,]/g, "");
    const decimalPart = cleaned.substring(lastSep + 1);
    cleaned = `${integerPart}.${decimalPart}`;
  } else {
    cleaned = cleaned.replace(/[.,]/g, "");
  }
  return cleaned;
}


function findSubstr(
  haystack: string,
  needle: string,
): { start: number; end: number; snippet: string } | null {
  if (!needle || !haystack) return null;
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 50);
  const end = Math.min(haystack.length, idx + needle.length + 50);
  return {
    start: idx,
    end: idx + needle.length,
    snippet: haystack.slice(start, end).replace(/\s+/g, " ").trim(),
  };
}

function pass(found: { start: number; end: number; snippet: string }): CheckResult {
  return {
    verdict: "pass",
    evidence_text: found.snippet.slice(0, 100),
    evidence_offset_start: found.start,
    evidence_offset_end: found.end,
  };
}

export function checkSubjectPresent(doc: string, subject?: string | null): CheckResult {
  if (!subject) return { verdict: "skipped", evidence_text: "subject not populated in corpus" };
  const normalisedDoc = normaliseSubjectName(doc);
  const normalisedSubject = normaliseSubjectName(subject);
  if (!normalisedSubject) {
    return { verdict: "uncertain", evidence_text: "subject is entirely corporate suffix after normalisation" };
  }
  const docLower = normalisedDoc.toLowerCase();
  const idx = docLower.indexOf(normalisedSubject.toLowerCase());
  if (idx >= 0) {
    const contextStart = Math.max(0, idx - 50);
    const contextEnd = Math.min(normalisedDoc.length, idx + normalisedSubject.length + 50);
    return {
      verdict: "pass",
      evidence_text: normalisedDoc.substring(contextStart, contextEnd).slice(0, 200),
      evidence_offset_start: idx,
      evidence_offset_end: idx + normalisedSubject.length,
    };
  }
  return { verdict: "fail", evidence_text: "subject not found in document after normalisation" };
}


export function checkRegulatorPresent(doc: string, regulator?: string | null): CheckResult {
  if (!regulator) return { verdict: "skipped" };
  const candidates: string[] = [regulator];
  for (const [k, aliases] of Object.entries(REGULATOR_ALIASES)) {
    if (regulator.toLowerCase().includes(k.toLowerCase()) || aliases.some((a) => regulator.toLowerCase().includes(a.toLowerCase()))) {
      candidates.push(k, ...aliases);
    }
  }
  for (const v of Array.from(new Set(candidates))) {
    const f = findSubstr(doc, v);
    if (f) return pass(f);
  }
  return { verdict: "uncertain" };
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function checkDecisionDatePresent(doc: string, isoDate?: string | null): CheckResult {
  if (!isoDate) return { verdict: "skipped" };
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return { verdict: "skipped" };
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const variants = [
    `${y}-${mm}-${dd}`,
    `${dd}/${mm}/${y}`,
    `${mm}/${dd}/${y}`,
    `${dd}.${mm}.${y}`,
    `${MONTHS[m]} ${day}, ${y}`,
    `${day} ${MONTHS[m]} ${y}`,
    `${day} ${MONTHS[m]}, ${y}`,
  ];
  for (const v of variants) {
    const f = findSubstr(doc, v);
    if (f) return pass(f);
  }
  return { verdict: "uncertain" };
}

export function checkSourceUrlResolves(fetchStatus: "ok" | "fail" | "skipped"): CheckResult {
  return { verdict: fetchStatus === "ok" ? "pass" : "fail" };
}

export function checkStatutoryProvisionPresent(
  doc: string,
  provisions: string[] | null | undefined,
): CheckResult {
  if (!provisions || provisions.length === 0) {
    return { verdict: "skipped", evidence_text: "no provisions extracted" };
  }
  const normalisedDoc = normaliseArticleCitations(normaliseStatuteNames(doc));
  const normalisedDocLower = normalisedDoc.toLowerCase();
  for (const provision of provisions) {
    const normalisedProvision = normaliseArticleCitations(normaliseStatuteNames(provision));
    const idx = normalisedDocLower.indexOf(normalisedProvision.toLowerCase());
    if (idx >= 0) {
      const contextStart = Math.max(0, idx - 50);
      const contextEnd = Math.min(normalisedDoc.length, idx + normalisedProvision.length + 50);
      return {
        verdict: "pass",
        evidence_text: normalisedDoc.substring(contextStart, contextEnd).slice(0, 200),
        evidence_offset_start: idx,
        evidence_offset_end: idx + normalisedProvision.length,
      };
    }
  }
  return {
    verdict: "fail",
    evidence_text: `none of [${provisions.join(", ")}] found in normalised document`.slice(0, 200),
  };
}

export function checkFineAmountPresent(
  doc: string,
  originalAmount?: number | null,
  _originalCurrency?: string | null,
  fineEurEquivalent?: number | null,
): CheckResult {
  if ((originalAmount == null || originalAmount <= 0) && (fineEurEquivalent == null || fineEurEquivalent <= 0)) {
    return { verdict: "skipped", evidence_text: "no fine amount in corpus" };
  }
  const candidates = doc.match(/[\d.,]+/g) || [];
  const targets: number[] = [];
  if (originalAmount && originalAmount > 0) targets.push(originalAmount);
  if (fineEurEquivalent && fineEurEquivalent > 0) targets.push(fineEurEquivalent);

  for (const candidate of candidates) {
    const normalised = normaliseNumericString(candidate);
    const asNumber = parseFloat(normalised);
    if (isNaN(asNumber) || asNumber === 0) continue;
    for (const target of targets) {
      const tolerance = target * 0.02;
      if (Math.abs(asNumber - target) <= tolerance) {
        return {
          verdict: "pass",
          evidence_text: `matched ${candidate} ≈ ${target}`,
        };
      }
    }
  }
  return { verdict: "fail", evidence_text: "no matching fine amount in document" };
}

export function checkCaseReferencePresent(
  doc: string,
  caseRef?: string | null,
): CheckResult {
  if (!caseRef) return { verdict: "skipped", evidence_text: "no case reference in corpus" };
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const normalisedDoc = norm(doc);
  const normalisedRef = norm(caseRef);
  const idx = normalisedDoc.indexOf(normalisedRef);
  if (idx >= 0) {
    return {
      verdict: "pass",
      evidence_text: caseRef,
      evidence_offset_start: idx,
      evidence_offset_end: idx + normalisedRef.length,
    };
  }
  return { verdict: "fail", evidence_text: "case reference not found in normalised document" };
}


export function aggregateDeterministic(
  preChecks: CheckResult[],
  postChecks: CheckResult[],
): boolean {
  const all = [...preChecks, ...postChecks];
  return all.every((c) => c.verdict === "pass" || c.verdict === "skipped");
}
