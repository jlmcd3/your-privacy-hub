// DOC 168 (2026-09-04, CEO options-not-free-text rule) — the ONE reader-label
// home for every coded RoPA answer. Mirrors the option lists in
// src/data/ropa-questions/index.ts (a browser module this edge function cannot
// import); the vitest parity test `ropa-answer-labels.parity.test.ts` pins the
// two sides key-for-key so they cannot drift. Dependency-free on purpose so
// the same file is importable from Deno (generator, transfer cell, Art. 30(5)
// note) and from vitest (the parity test).
//
// Also closes a doc-166-class defect found while building this: the
// transfer-mechanism option CODES ("sccs", "adequacy", …) reached the rendered
// document verbatim — there was a label map for the lawful basis and for the
// Art. 4(2) operations, but none for the mechanism.

export const SPECIAL_CATEGORY_BASIS_LABELS: Readonly<Record<string, string>> = {
  none: "Not applicable — no special category or criminal-offence data is processed",
  art9_2_a: "Art. 9(2)(a) — the data subject has given explicit consent for one or more specified purposes",
  art9_2_b: "Art. 9(2)(b) — necessary for obligations or rights in the field of employment, social security or social protection law",
  art9_2_c: "Art. 9(2)(c) — necessary to protect vital interests where the data subject is physically or legally incapable of giving consent",
  art9_2_d: "Art. 9(2)(d) — legitimate activities of a not-for-profit body with a political, philosophical, religious or trade-union aim, relating to its members",
  art9_2_e: "Art. 9(2)(e) — personal data manifestly made public by the data subject",
  art9_2_f: "Art. 9(2)(f) — necessary for the establishment, exercise or defence of legal claims, or where courts act in their judicial capacity",
  art9_2_g: "Art. 9(2)(g) — necessary for reasons of substantial public interest, on the basis of law",
  art9_2_h: "Art. 9(2)(h) — preventive or occupational medicine, assessment of working capacity, medical diagnosis, or health or social care",
  art9_2_i: "Art. 9(2)(i) — public interest in the area of public health, on the basis of law",
  art9_2_j: "Art. 9(2)(j) — archiving in the public interest, scientific or historical research or statistical purposes",
  art10: "Art. 10 — criminal convictions and offences data, under official authority or as authorised by law",
};
/** The one negative option of the special-category question. */
export const SPECIAL_CATEGORY_NONE = "none";

export const RECIPIENT_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  processors: "processors and service providers acting on the Company's instructions",
  group: "companies in the Company's corporate group",
  advertising_analytics: "advertising, marketing or analytics partners",
  payment_financial: "payment, banking or financial service providers",
  public_authorities: "public authorities and regulators, where required by law",
  professional_advisers: "professional advisers (legal, audit, insurance)",
  business_partners: "business partners, resellers or joint controllers",
  third_country: "recipients in a third country or an international organisation",
  none: "no recipient outside the organisation",
};
export const RECIPIENT_NONE = "none";
export const RECIPIENT_PROCESSORS = "processors";

export const PROCESSING_REGULARITY_LABELS: Readonly<Record<string, string>> = {
  regular: "regular or ongoing",
  occasional: "occasional",
  unsure: "unsure",
};

export const TRANSFER_MECHANISM_LABELS: Readonly<Record<string, string>> = {
  sccs: "Standard Contractual Clauses (SCCs)",
  adequacy: "an adequacy decision",
  bcrs: "Binding Corporate Rules",
  derogations: "an Article 49 derogation",
  none: "no documented transfer mechanism",
};

/** Mirrors INTERNATIONAL_ORGANISATION_OPTION.value in src/data/countries.ts. */
export const INTERNATIONAL_ORGANISATION_VALUE = "__international_organisation__";

/** Country names (as stored — src/data/countries.ts spellings) that take the
 *  definite article in running prose: "transferred to the United States". */
const COUNTRY_NAMES_WITH_ARTICLE: ReadonlySet<string> = new Set([
  "Bahamas",
  "Central African Republic",
  "Comoros",
  "Congo (Democratic Republic)",
  "Congo (Republic)",
  "Dominican Republic",
  "Gambia",
  "Maldives",
  "Marshall Islands",
  "Netherlands",
  "Philippines",
  "Seychelles",
  "Solomon Islands",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
]);

/** A stored country name in prose form ("the United States"; "Japan"). Any
 *  other value — a legacy free-text destination — passes through unchanged. */
export function countryProse(name: string): string {
  return COUNTRY_NAMES_WITH_ARTICLE.has(name) ? `the ${name}` : name;
}

const LABELS_BY_KEY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  special_category_basis: SPECIAL_CATEGORY_BASIS_LABELS,
  recipient_categories: RECIPIENT_CATEGORY_LABELS,
  processing_regularity: PROCESSING_REGULARITY_LABELS,
  transfer_mechanism: TRANSFER_MECHANISM_LABELS,
};

const toList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((x) => String(x ?? "").trim()).filter(Boolean)
    : value == null || value === ""
      ? []
      : [String(value).trim()];

/**
 * A coded answer rendered as reader labels; a value the map does not know
 * (a legacy free-text answer, or a fixture's prose) passes through as
 * written, so older records keep rendering exactly as they did.
 */
export function labelsFor(key: string, value: unknown): string[] {
  const map = LABELS_BY_KEY[key];
  return toList(value).map((v) => (map && map[v]) ? map[v] : v);
}

/** Reader-label prose for a coded answer ("a, b and c"); "" when empty. */
export function displayAnswer(key: string, value: unknown): string {
  const xs = labelsFor(key, value);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/** True when a multi-select answer carries at least one option other than
 *  the named negative option ("none"). A legacy free-text answer is never
 *  decided here (returns null) so the caller keeps its own text rule. */
export function selectionAffirms(value: unknown, negativeOption: string): boolean | null {
  if (!Array.isArray(value)) return null;
  const codes = toList(value);
  if (codes.length === 0) return null;
  return codes.some((c) => c !== negativeOption);
}
