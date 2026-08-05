// ITEM 372 — SECOND CORRECTION ROUND, ITEM 1 (support module).
//
// THE DEFECT
// ----------
// The determination block stitched RAW `information_needed` strings straight
// into a sentence. Those strings are field-level asks written for the asks
// table, not for prose, and on a degraded record they carry the record's own
// wreckage with them — "DD/MM/YYYY", "[TO COMPLETE — …]", bare field names.
// The document's first paragraph therefore read as a form, not as counsel.
//
// WHAT THIS MODULE DOES
// ---------------------
// It maps an ask to one of a CLOSED SET of counsel-language CATEGORIES. The
// category labels below are fixed, authored text: they are never composed from
// the record, so a placeholder token can never reach a caller through them.
// An ask that matches nothing lands on the generic category, which says only
// what is true — that the record leaves something the assessment needed.
//
// Deterministic and pure. No I/O, no model, no invention.

export const ASK_CATEGORY_VERSION = "ask-categories-2026-08-05-item372r2";

export interface AskCategory {
  /** Stable id — telemetry and tests key on this, never on the label. */
  readonly id: string;
  /**
   * Counsel-language noun phrase, lower-case, no terminal punctuation, so it
   * reads inside a list and can be sentence-cased by the caller.
   */
  readonly label: string;
}

interface CategoryRule extends AskCategory {
  readonly re: RegExp;
}

/**
 * Ordered, most specific first. The first rule that matches wins, so a rule
 * that mentions two domains must sit above the rules for each domain.
 */
const RULES: readonly CategoryRule[] = [
  {
    id: "accountability_owner",
    label: "who prepared this assessment and who has approved it",
    re: /\b(assessment[_\s-]?team|prepared[_\s-]?by|drafted|author|sign[- ]?off|signoff|approv(?:al|er|ed[_\s-]?by)|validation|accountab)/i,
  },
  {
    id: "dpo",
    label: "the data protection officer's advice and whether it was sought",
    re: /\b(dpo|data\s+protection\s+officer|art(?:icle|\.)?\s*3[89])\b/i,
  },
  {
    id: "consultation",
    label: "whether data subjects or their representatives were consulted",
    re: /\b(consult|views\s+of\s+data\s+subjects|data[_\s-]?subjects?[_\s-]?views|interested\s+parties|stakeholder)/i,
  },
  {
    id: "retention",
    label: "how long the data is kept and what happens to it at the end",
    re: /\b(retention|retain|storage\s+limitation|erasure|deletion|delete|disposal|how\s+long)/i,
  },
  {
    id: "special_category",
    label: "the Article 9 condition relied on for special-category data",
    re: /\b(article\s*9|art\.?\s*9\b|special[_\s-]?categor|sensitive\s+data|criminal[_\s-]?offence)/i,
  },
  {
    id: "legal_basis",
    label: "the lawful basis relied on for each purpose",
    re: /\b(lawful\s+basis|legal\s+basis|legal[_\s-]?basis|article\s*6|art\.?\s*6\b|legitimate[\s-]?interests?(?:\s+assessment)?|lia\b|consent\b)/i,
  },
  {
    id: "transfers",
    label: "the mechanism relied on for transfers outside the EEA",
    re: /\b(transfer|third\s+country|scc|standard\s+contractual|adequac|bcr|dpf|onward\s+disclosure)/i,
  },
  {
    id: "processors",
    label: "the processors engaged and the contracts that govern them",
    re: /\b(processor|sub[- ]?processor|vendor|supplier|article\s*28|art\.?\s*28\b|data\s+processing\s+agreement)/i,
  },
  {
    id: "security",
    label: "the technical and organisational security measures in place",
    re: /\b(security|encrypt|pseudonym|access\s+control|article\s*32|art\.?\s*32\b|safeguard|technical\s+and\s+organisational|technical\s+and\s+organizational)/i,
  },
  {
    id: "transparency",
    label: "how individuals are told about the processing",
    re: /\b(transparen|privacy\s+notice|fair\s+processing|article\s*1[34]|art\.?\s*1[34]\b|inform(?:ation)?\s+(?:to|of)\s+data\s+subjects)/i,
  },
  {
    id: "rights",
    label: "how requests from individuals are handled in practice",
    re: /\b(data\s+subject\s+rights?|rights?\s+request|access\s+request|objection|portability|rectification|article\s*1[5-9]|art\.?\s*2[01]\b)/i,
  },
  {
    id: "risk_measures",
    label: "the mitigation measures, their owners, and the residual risk",
    re: /\b(mitigat|residual\s+risk|risk\s+treatment|control(?:s)?\b|measure(?:s)?\b|remediat|owner)/i,
  },
  {
    id: "necessity",
    label: "why the processing is necessary and proportionate to its purpose",
    re: /\b(necessit|proportional|less\s+intrusive|minimi[sz]ation|purpose\s+limitation)/i,
  },
  {
    id: "scope_description",
    label: "what the processing actually does, described in operational terms",
    re: /\b(descri|nature[,\s]+scope|functional|data\s+flow|system|processing\s+activity|purpose\b|scope\b)/i,
  },
  {
    id: "volume",
    label: "the volume of data and the frequency of the processing",
    re: /\b(volume|frequency|how\s+many|record\s+count|scale\b|number\s+of\s+(?:records|individuals|data\s+subjects))/i,
  },
  {
    id: "timing",
    label: "the dates on which the processing and this assessment take effect",
    re: /\b(date|timeline|launch|go[- ]?live|review\s+schedule|effective|when\b|period\b)/i,
  },
  {
    id: "identity",
    label: "the legal identity of the controller and of any joint controllers",
    re: /\b(controller|joint\s+control|entity\s+name|legal\s+name|establishment|organi[sz]ation\s+name)/i,
  },
];

export const GENERIC_CATEGORY: AskCategory = {
  id: "unspecified",
  label: "further detail the record does not supply",
};

/** Every category this module can return — closed set, for tests. */
export const ALL_ASK_CATEGORIES: readonly AskCategory[] = [
  ...RULES.map((r) => ({ id: r.id, label: r.label })),
  GENERIC_CATEGORY,
];

/**
 * Placeholder wreckage that must never reach prose. Used to reject an ask's
 * raw text as a source of words — the category label is used instead.
 */
export const PLACEHOLDER_TOKEN_RE =
  /(\[[^\]]*\]|\]|DD\s*[\/.-]\s*MM\s*[\/.-]\s*YYYY|MM\s*[\/.-]\s*DD\s*[\/.-]\s*YYYY|YYYY\s*-\s*MM\s*-\s*DD|X{3,}|<[^>]+>|\{\{[^}]*\}\}|\bTBD\b|\bN\/A\b|TO\s+(?:BE\s+)?(?:COMPLETE|COMPLETED|ASSESSED|CONFIRMED|DETERMINED)\b)/i;

/** True when a string carries a completion placeholder or template token. */
export function hasPlaceholderToken(text: unknown): boolean {
  return typeof text === "string" && PLACEHOLDER_TOKEN_RE.test(text);
}

/** Map one ask (string or `{field, dimensions, …}`) to its category. */
export function categorizeAsk(ask: unknown): AskCategory {
  const parts: string[] = [];
  if (typeof ask === "string") {
    parts.push(ask);
  } else if (ask && typeof ask === "object") {
    const a = ask as Record<string, unknown>;
    for (const k of ["dimensions", "field", "question", "item", "provision", "enables"]) {
      const v = a[k];
      if (typeof v === "string" && v.trim()) parts.push(v);
    }
  }
  const haystack = parts.join(" ");
  if (!haystack.trim()) return GENERIC_CATEGORY;
  for (const rule of RULES) {
    if (rule.re.test(haystack)) return { id: rule.id, label: rule.label };
  }
  return GENERIC_CATEGORY;
}

/**
 * Roll a list of asks up into distinct categories, in first-seen order.
 * `max` caps the list so the determination stays a paragraph, not a register.
 */
export function rollUpAskCategories(
  asks: readonly unknown[] | null | undefined,
  max = 6,
): AskCategory[] {
  const out: AskCategory[] = [];
  const seen = new Set<string>();
  for (const ask of asks ?? []) {
    const cat = categorizeAsk(ask);
    if (seen.has(cat.id)) continue;
    seen.add(cat.id);
    out.push(cat);
    if (out.length >= max) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// ITEM 374 FIX 2 — CATEGORY → INTAKE-KEY MAP (DPIA contract keys).
//
// THE DEFECT
// ----------
// The determination enumerated categories rolled up from the asks surface with
// no reference to the record. Both arms of batch 646e3bf3 therefore named "the
// legal identity of the controller" and "who prepared this assessment and who
// has approved it" as MISSING FOUNDATIONS on records that supply
// `controller_contact`, `dpia_prepared_by`, `dpia_approved_by_name`,
// `dpia_approved_by_title` and `dpia_approval_date`.
//
// THE RULE
// --------
// A category is emitted as a missing foundation only when at least ONE of its
// mapped intake keys is empty. A category with NO mapped key is never
// suppressed — absence of a mapping is not evidence the record answers it.
// Keys are read from the DPIA intake contract (`dpia-framework.ts`).
// ---------------------------------------------------------------------------

export const ASK_CATEGORY_INTAKE_KEYS: Readonly<Record<string, readonly string[]>> = {
  accountability_owner: [
    "dpia_prepared_by",
    "dpia_team",
    "dpia_approved_by_name",
    "dpia_approved_by_title",
    "dpia_approval_date",
    "dpia_signoff_basis",
  ],
  dpo: ["dpo_info", "dpo_advice"],
  consultation: ["data_subjects_views_sought", "data_subjects_views"],
  retention: ["retention_period"],
  special_category: ["article_9_condition"],
  legal_basis: ["legal_basis_proposed"],
  transfers: ["transfer_flows"],
  processors: ["third_party_processors", "processor_obligations"],
  security: ["existing_safeguards", "dp_by_design_measures"],
  rights: ["data_subject_rights_mechanisms"],
  risk_measures: ["existing_safeguards"],
  necessity: ["necessity_proportionality", "data_minimisation_justification"],
  scope_description: ["description", "purpose", "functional_description"],
  volume: ["volume_frequency"],
  timing: ["estimated_launch_date"],
  identity: ["organization_name", "controller_contact"],
  // ITEM 380 r3 — TRANSPARENCY is now mapped. Item 380 §4 declared exactly
  // these two keys as the backing record for "how individuals are told about
  // the processing" (the same pair the DPIA CSC transparency surface uses), so
  // the earlier deliberate unmapping no longer holds. `categoryAnsweredByRecord`
  // requires EVERY mapped key to be filled, so a record supplying only one of
  // them — or neither, as in every non-DPIA product — keeps the category
  // exactly as before.
  transparency: ["data_subject_rights_mechanisms", "nature_scope_context"],
  // unspecified: deliberately unmapped — no single intake key answers it, so it
  // is never suppressed by this filter.
};

/** True when the intake value at `key` carries something. */
export function intakeKeyFilled(intake: unknown, key: string): boolean {
  if (!intake || typeof intake !== "object") return false;
  const v = (intake as Record<string, unknown>)[key];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0 && !hasPlaceholderToken(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
}

/**
 * True when the record actually answers everything this category covers — i.e.
 * every mapped intake key is filled. Unmapped categories always return false.
 */
export function categoryAnsweredByRecord(categoryId: string, intake: unknown): boolean {
  const keys = ASK_CATEGORY_INTAKE_KEYS[categoryId];
  if (!keys || keys.length === 0) return false;
  return keys.every((k) => intakeKeyFilled(intake, k));
}

/** Drop categories the record actually answers. Pure; no intake → no change. */
export function filterCategoriesAgainstRecord<T extends AskCategory>(
  categories: readonly T[],
  intake: unknown,
): T[] {
  if (!intake || typeof intake !== "object") return [...categories];
  return categories.filter((c) => !categoryAnsweredByRecord(c.id, intake));
}

