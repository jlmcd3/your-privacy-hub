/**
 * ITEM 305 — § 7152(a)(5)(A)–(H) NEGATIVE-IMPACT CATALOGUE.
 *
 * Chapter 1 of docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md.
 * The gap finding for cppa-risk was that the generator RECITES harm labels
 * instead of catalogueing harms against the enumerated statutory examples
 * and tracing their sources and causes. This module is the closed
 * catalogue every harm_causation entry must bind to.
 *
 * SOURCE OF TRUTH: provision_texts row key `cppa-7152`
 *   citation: "11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)"
 * The excerpts below are VERBATIM from that row's `verbatim_excerpt`.
 *
 * TRANSCRIPTION NOTE (the only deviation, and it is mechanical): the
 * canonical PDF inserts a running page header inside sub-paragraph (D)
 * ("CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS / (CCPA Updates,
 * Cyber, Risk, ADMT, and Insurance Regulations) / Page 104 of 127").
 * That header is a pagination artifact, not statutory text, and is
 * excised from HARM_CATALOGUE[D].verbatim. The pin test asserts the
 * remaining text is a contiguous substring of the corpus row on either
 * side of the excision.
 *
 * NO CONCLUSION CONTENT lives here. This file supplies statutory text and
 * identifiers only; every verdict is computed in ./build.ts.
 */

export const HARM_CATALOGUE_VERSION = "cppa-risk-harm-catalogue-2026-07-31-item305";

export const HARM_CATALOGUE_CITATION = "11 CCR § 7152(a)(5)";

export const HARM_CATALOGUE_CORPUS_KEY = "cppa-7152";

/** Closed set of statutory harm identifiers. No other value is admissible. */
export type HarmId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface HarmCatalogueEntry {
  readonly id: HarmId;
  /** Pinpoint written exactly as prose may cite it. */
  readonly pinpoint: string;
  /** Short handle for UI/label use. NEVER substituted for `verbatim`. */
  readonly label: string;
  /** VERBATIM statutory example text. */
  readonly verbatim: string;
}

export const HARM_CATALOGUE: readonly HarmCatalogueEntry[] = [
  {
    id: "A",
    pinpoint: "11 CCR § 7152(a)(5)(A)",
    label: "Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
    verbatim:
      "Unauthorized access, destruction, use, modification, or disclosure of personal information; and unauthorized activity resulting in the loss of availability of personal information.",
  },
  {
    id: "B",
    pinpoint: "11 CCR § 7152(a)(5)(B)",
    label: "Unlawful discrimination on protected characteristics",
    verbatim:
      "Discrimination upon the basis of protected characteristics that would violate federal or state law.",
  },
  {
    id: "C",
    pinpoint: "11 CCR § 7152(a)(5)(C)",
    label: "Impairment of consumer control over personal information",
    verbatim:
      "Impairing consumers’ control over their personal information, such as by providing insufficient information for consumers to make an informed decision regarding the processing of their personal information, or by interfering with consumers’ ability to make choices consistent with their reasonable expectations.",
  },
  {
    id: "D",
    pinpoint: "11 CCR § 7152(a)(5)(D)",
    label: "Coercion or compulsion, including dark patterns",
    verbatim:
      "Coercing or compelling consumers into allowing the processing of their personal information, such as by conditioning consumers’ acquisition or use of an online service upon their disclosure of personal information that is unnecessary to the expected functionality of the service, or requiring consumers to consent to processing when such consent cannot be freely given (e.g., because it was obtained through the use of a dark pattern).",
  },
  {
    id: "E",
    pinpoint: "11 CCR § 7152(a)(5)(E)",
    label: "Economic harms",
    verbatim:
      "Economic harms, including limiting or depriving consumers of economic opportunities, charging consumers higher prices, or compensating consumers at lower rates based upon profiling; or imposing additional costs upon consumers, including costs associated with the unauthorized access to consumers’ personal information.",
  },
  {
    id: "F",
    pinpoint: "11 CCR § 7152(a)(5)(F)",
    label: "Physical harms",
    verbatim:
      "Physical harms to consumers or to property, including processing that creates the opportunity for physical or sexual violence.",
  },
  {
    id: "G",
    pinpoint: "11 CCR § 7152(a)(5)(G)",
    label: "Reputational harms",
    verbatim:
      "Reputational harms, including stigmatization, that could negatively impact an average consumer, such as stigmatization of a consumer as a result of a mobile dating application’s disclosure of the consumer’s sexual or other preferences in a partner outside of the dating application.",
  },
  {
    id: "H",
    pinpoint: "11 CCR § 7152(a)(5)(H)",
    label: "Psychological harms",
    verbatim:
      "Psychological harms, including emotional distress, stress, anxiety, embarrassment, fear, frustration, shame, and feelings of violation, that could negatively impact an average consumer. Examples of such harms include emotional distress resulting from disclosure of nonconsensual intimate imagery or disclosure of a consumer’s purchase of pregnancy tests or emergency contraception for non-medical purposes.",
  },
] as const;

export const HARM_IDS: readonly HarmId[] = HARM_CATALOGUE.map((h) => h.id);

const BY_ID = new Map<string, HarmCatalogueEntry>(HARM_CATALOGUE.map((h) => [h.id, h]));

/** CATALOGUE-MEMBERSHIP LAW — an id outside (A)–(H) is never admissible. */
export function isHarmId(value: unknown): value is HarmId {
  return typeof value === "string" && BY_ID.has(value);
}

export function harmEntry(id: HarmId): HarmCatalogueEntry {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`harm_catalogue_miss:${id}`);
  return e;
}

/**
 * Resolve an intake-side harm label to a catalogue id. Intake option
 * labels are authored to carry the "(A)".."(H)" tag as a prefix, so the
 * resolution is a tag read, never a semantic guess. Anything unresolvable
 * returns null and is degraded by the builder — never coerced.
 */
export function resolveHarmId(raw: unknown): HarmId | null {
  if (typeof raw !== "string") return null;
  const tag = raw.trim().match(/^\(([A-H])\)/);
  if (tag && isHarmId(tag[1])) return tag[1] as HarmId;
  const bare = raw.trim().toUpperCase();
  return isHarmId(bare) ? (bare as HarmId) : null;
}
