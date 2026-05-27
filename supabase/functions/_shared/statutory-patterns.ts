// Per-regulator statutory citation patterns.
//
// Unified GDPR Article pattern (Track 2): matches native-language citations
// such as "Articolul 5(1)(a) din GDPR", "art. 6(1)(f) RGPD", "Article 32 of
// the GDPR", "Articolul 13 al Regulamentului", etc. Normalises every hit to
// the canonical "GDPR Article N(N)(x)" form.
//
// Applied to: ANSPDCP, AEPD, Garante, HDPA, NAIH, ÚOOÚ.
// NOT applied to FTC / OAIC — their summaries do not contain GDPR-style
// citations; those wait for Track 3 (source-document fetch + verbatim verify).

export const UNIFIED_GDPR_ARTICLE_REGEX =
  /\b(?:Art(?:icle|\.)?)\s*(\d{1,3})(?:\s*\(\s*(\d+)\s*\))?(?:\s*\(\s*([a-z])\s*\))?\s+(?:of\s+the\s+)?(?:GDPR|RGPD|del\s+RGPD|Regulamentului)\b/gi;

export const GDPR_PATTERN_REGULATORS = new Set<string>([
  "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)",
  "Agencia Española de Protección de Datos (AEPD)",
  "Garante per la protezione dei dati personali",
  "Hellenic Data Protection Authority (HDPA)",
  "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
  "Úřad pro ochranu osobních údajů (ÚOOÚ)",
]);

export function extractUnifiedGdprCitations(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = new RegExp(UNIFIED_GDPR_ARTICLE_REGEX.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let s = `GDPR Article ${m[1]}`;
    if (m[2]) s += `(${m[2]})`;
    if (m[3]) s += `(${m[3]})`;
    out.add(s);
  }
  return Array.from(out).sort();
}

export function extractWithPerRegulatorPattern(
  regulatorCanonical: string | null,
  text: string,
): { provisions: string[]; method: "pattern_per_regulator" | "no_pattern_found" } {
  if (regulatorCanonical && GDPR_PATTERN_REGULATORS.has(regulatorCanonical)) {
    const provisions = extractUnifiedGdprCitations(text);
    if (provisions.length > 0) {
      return { provisions, method: "pattern_per_regulator" };
    }
  }
  return { provisions: [], method: "no_pattern_found" };
}
