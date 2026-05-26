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
  if (!subject) return { verdict: "skipped" };
  const variants = [subject, stripCorporateSuffix(subject)].filter(
    (v, i, a) => v && v.length >= 3 && a.indexOf(v) === i,
  );
  for (const v of variants) {
    const f = findSubstr(doc, v);
    if (f) return pass(f);
  }
  return { verdict: "fail" };
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
  if (!provisions || provisions.length === 0) return { verdict: "skipped" };
  for (const p of provisions) {
    const f = findSubstr(doc, p);
    if (f) return pass(f);
    // Try stripping spaces around § and Article
    const compact = p.replace(/\s+/g, " ").replace(/§\s*/g, "§").trim();
    if (compact !== p) {
      const f2 = findSubstr(doc, compact);
      if (f2) return pass(f2);
    }
  }
  return { verdict: "fail" };
}

function formatNumberVariants(amt: number): string[] {
  const intStr = String(Math.round(amt));
  const withCommas = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const withDots = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const withSpaces = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return Array.from(new Set([intStr, withCommas, withDots, withSpaces]));
}

export function checkFineAmountPresent(
  doc: string,
  originalAmount?: number | null,
  originalCurrency?: string | null,
  fineEurEquivalent?: number | null,
): CheckResult {
  const tryAmounts = (amt: number): CheckResult | null => {
    for (const v of formatNumberVariants(amt)) {
      const f = findSubstr(doc, v);
      if (f) return pass(f);
    }
    return null;
  };
  if (originalAmount && originalAmount > 0) {
    const r = tryAmounts(originalAmount);
    if (r) return r;
  }
  if (fineEurEquivalent && fineEurEquivalent > 0) {
    // ±2% tolerance: try exact, plus a few rounded values.
    const targets = new Set<number>([
      Math.round(fineEurEquivalent),
      Math.round(fineEurEquivalent * 0.98),
      Math.round(fineEurEquivalent * 1.02),
      Math.round(fineEurEquivalent / 1000) * 1000,
    ]);
    for (const t of targets) {
      const r = tryAmounts(t);
      if (r) return r;
    }
  }
  if (!originalAmount && !fineEurEquivalent) return { verdict: "uncertain" };
  return { verdict: "fail" };
}

export function checkCaseReferencePresent(
  doc: string,
  caseRef?: string | null,
): CheckResult {
  if (!caseRef) return { verdict: "skipped" };
  const f = findSubstr(doc, caseRef);
  return f ? pass(f) : { verdict: "fail" };
}

export function aggregateDeterministic(
  preChecks: CheckResult[],
  postChecks: CheckResult[],
): boolean {
  const all = [...preChecks, ...postChecks];
  return all.every((c) => c.verdict === "pass" || c.verdict === "skipped");
}
