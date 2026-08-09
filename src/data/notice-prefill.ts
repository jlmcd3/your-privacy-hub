/**
 * INTAKE-2 — prefill-confirm rules for the EU/Global and US notice builders.
 *
 * Presentation only. A rule never changes a question's key, its stored option
 * values, or the shape of the stored answer: it proposes a value that the user
 * either confirms (persisted under the question's OWN key, byte-identical to
 * what they would have typed/selected) or declines (normal input is revealed).
 *
 * Per-regime and per-state nuance is NOT collapsed — each confirm prompt names
 * the regime or state whose definition governs the later question, because the
 * definitions differ (Maryland's 1,750-foot geolocation radius, Connecticut's
 * consumer-health-data scope, the three EU purpose-specificity standards).
 */

export type PrefillAnswer = string | string[] | null;
export type PrefillAnswers = Record<string, PrefillAnswer>;

/** Resolves an option label for a source question key (supplied by the page). */
export type LabelOf = (questionKey: string, value: string) => string;

export interface PrefillProposal {
  /** Value proposed for the TARGET question, in the target's own shape. */
  suggested: PrefillAnswer;
  /** "Earlier you told us ..." — what the proposal is drawn from. */
  lead: string;
  /** Regime/state-specific caveat shown with the confirmation. */
  note: string;
}

export interface PrefillRule {
  target: string;
  /** Source question keys, for documentation and test assertions. */
  sources: string[];
  derive: (a: PrefillAnswers, labelOf: LabelOf) => PrefillProposal | null;
}

// ---------------- helpers ----------------

function str(a: PrefillAnswers, k: string): string {
  const v = a[k];
  return typeof v === "string" ? v.trim() : "";
}

function list(a: PrefillAnswers, k: string): string[] {
  const v = a[k];
  return Array.isArray(v) ? v : [];
}

function yesNo(a: PrefillAnswers, k: string): "yes" | "no" | null {
  const v = str(a, k);
  return v === "yes" || v === "no" ? v : null;
}

function anyOf(values: string[], targets: string[]): boolean {
  return targets.some((t) => values.includes(t));
}

function joinLabels(keys: string[], sourceKey: string, labelOf: LabelOf): string {
  const labels = keys.map((k) => labelOf(sourceKey, k)).filter(Boolean);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function officerContact(a: PrefillAnswers): string {
  const name = str(a, "dpo_name");
  if (!name) return "";
  const email = str(a, "dpo_email");
  return email ? `${name} — ${email}` : name;
}

/** US "sensitive" categories, as the universal data-categories list encodes them. */
const US_SENSITIVE_CATEGORIES = [
  "health_medical",
  "mental_health",
  "biometric",
  "race_ethnicity",
  "religion",
  "sexual_orientation",
  "citizenship",
  "geolocation",
];

// ---------------- EU / Global builder ----------------

export const EU_PREFILL_RULES: PrefillRule[] = [
  {
    target: "adequacy_status",
    sources: ["transfer_safeguards", "transfer_destinations"],
    derive: (a) => {
      if (!list(a, "transfer_safeguards").includes("adequacy")) return null;
      const dest = str(a, "transfer_destinations");
      return {
        suggested: dest
          ? `Yes — an adequacy decision covers transfers to ${dest}.`
          : "Yes — an adequacy decision covers at least one destination.",
        lead: "You named an adequacy decision as one of your transfer safeguards.",
        note: "Confirm this only for the destinations actually covered by an adequacy decision; any others need Art. 46 safeguards instead.",
      };
    },
  },
  {
    target: "gdpr_controller_representative",
    sources: ["eu_rep_name"],
    derive: (a) => {
      if (!str(a, "eu_rep_name")) return null;
      return {
        suggested: "yes",
        lead: `You named ${str(a, "eu_rep_name")} as your EU representative.`,
        note: "This confirms the GDPR Art. 27 appointment for the EU/EEA specifically — the UK requires a separate Section 27 DPA 2018 representative.",
      };
    },
  },
  {
    target: "gdpr_profiling",
    sources: ["automated_decisions"],
    derive: (a) => {
      if (str(a, "automated_decisions") !== "yes") return null;
      return {
        suggested: "yes",
        lead: "You told us you make automated decisions with legal or similarly significant effects.",
        note: "Profiling under GDPR Art. 4(4) is broader than automated decision-making — confirm only if you also build profiles of individuals.",
      };
    },
  },
  {
    target: "lgpd_dpo_name",
    sources: ["dpo_name", "dpo_email"],
    derive: (a) => {
      const contact = officerContact(a);
      if (!contact) return null;
      return {
        suggested: contact,
        lead: `You gave ${contact} as your data protection officer.`,
        note: "Brazil's LGPD Art. 41 Encarregado may be the same person — confirm, or name a different contact for Brazilian data subjects.",
      };
    },
  },
  {
    target: "dpdpa_grievance_officer",
    sources: ["dpo_name", "dpo_email"],
    derive: (a) => {
      const contact = officerContact(a);
      if (!contact) return null;
      return {
        suggested: contact,
        lead: `You gave ${contact} as your data protection officer.`,
        note: "India's DPDPA Section 8(9) Grievance Officer may be the same person — confirm, or name a different contact for Indian data principals.",
      };
    },
  },
  {
    target: "popia_information_officer",
    sources: ["dpo_name", "dpo_email"],
    derive: (a) => {
      const contact = officerContact(a);
      if (!contact) return null;
      return {
        suggested: contact,
        lead: `You gave ${contact} as your data protection officer.`,
        note: "South Africa's POPIA Information Officer must be registered with the Information Regulator and is often the head of the organisation — confirm, or name that person instead.",
      };
    },
  },
  {
    target: "appi_third_country_transfer",
    sources: ["transfer_outside_eea"],
    derive: (a) => {
      const v = yesNo(a, "transfer_outside_eea");
      if (!v) return null;
      return {
        suggested: v,
        lead:
          v === "yes"
            ? "You told us personal data moves outside your home jurisdiction."
            : "You told us personal data does not move outside your home jurisdiction.",
        note: "Japan's APPI measures this from Japan — confirm whether personal information leaves Japan, which can differ from your EU/EEA answer.",
      };
    },
  },
  {
    target: "appi_purpose_specificity",
    sources: ["processing_purposes"],
    derive: (a, labelOf) => {
      const chosen = list(a, "processing_purposes");
      if (chosen.length === 0) return null;
      const text = joinLabels(chosen, "processing_purposes", labelOf);
      if (!text) return null;
      return {
        suggested: text,
        lead: `You selected these purposes of processing: ${text}.`,
        note: "APPI Art. 17 asks for purposes specified as far as possible — confirm this wording, or state the Japanese purposes more narrowly.",
      };
    },
  },
  {
    target: "dpdpa_notice_purpose",
    sources: ["processing_purposes"],
    derive: (a, labelOf) => {
      const chosen = list(a, "processing_purposes");
      if (chosen.length === 0) return null;
      const text = joinLabels(chosen, "processing_purposes", labelOf);
      if (!text) return null;
      return {
        suggested: text,
        lead: `You selected these purposes of processing: ${text}.`,
        note: "DPDPA Section 5 requires the notice to state the purpose each item of personal data is processed for — confirm, or expand this into itemised purposes.",
      };
    },
  },
  {
    target: "popia_purpose",
    sources: ["processing_purposes"],
    derive: (a, labelOf) => {
      const chosen = list(a, "processing_purposes");
      if (chosen.length === 0) return null;
      const text = joinLabels(chosen, "processing_purposes", labelOf);
      if (!text) return null;
      return {
        suggested: text,
        lead: `You selected these purposes of processing: ${text}.`,
        note: "POPIA Section 13 requires a specific, explicitly defined and lawful purpose — confirm, or narrow this for South African data subjects.",
      };
    },
  },
];

// ---------------- US builder ----------------

export const US_PREFILL_RULES: PrefillRule[] = [
  {
    target: "ccpa_sensitive_data",
    sources: ["data_categories"],
    derive: (a, labelOf) => {
      const cats = list(a, "data_categories");
      if (cats.length === 0) return null;
      const hits = cats.filter((c) => US_SENSITIVE_CATEGORIES.includes(c));
      const yes = hits.length > 0;
      return {
        suggested: yes ? "yes" : "no",
        lead: yes
          ? `You said you collect ${joinLabels(hits, "data_categories", labelOf)}.`
          : "None of the categories you selected are sensitive on their face.",
        note: "California's definition also covers SSNs, account log-ins, the contents of mail/email/text, and genetic data — confirm against the CCPA/CPRA list.",
      };
    },
  },
  {
    target: "vam_profiling",
    sources: ["ccpa_admt"],
    derive: (a) => {
      const v = yesNo(a, "ccpa_admt");
      if (!v) return null;
      return {
        suggested: v,
        lead:
          v === "yes"
            ? "You told us you use automated decision-making technology for significant decisions in California."
            : "You told us you do not use automated decision-making technology for significant decisions in California.",
        note: "The Virginia-model states ask about profiling that produces legal or similarly significant effects — the same practice, framed by each state's own opt-out right.",
      };
    },
  },
  {
    target: "md_precise_geolocation",
    sources: ["data_categories"],
    derive: (a) => {
      const cats = list(a, "data_categories");
      if (cats.length === 0) return null;
      const geo = cats.includes("geolocation");
      return {
        suggested: geo ? "yes" : "no",
        lead: geo
          ? "You said you collect geolocation data."
          : "You did not select geolocation data as a category you collect.",
        note: "Maryland counts location only within a 1,750-foot (~533 m) radius as precise — city- or postcode-level location does not qualify.",
      };
    },
  },
  {
    target: "fl_children_known",
    sources: ["data_categories"],
    derive: (a) => {
      const cats = list(a, "data_categories");
      if (cats.length === 0) return null;
      const kids = cats.includes("children");
      return {
        suggested: kids ? "yes" : "no",
        lead: kids
          ? "You said you collect children's data."
          : "You did not select children's data as a category you collect.",
        note: "Florida's FDBR threshold is knowing collection from residents under 18 — higher than the under-13/under-16 line used elsewhere.",
      };
    },
  },
  {
    target: "co_uoom_honored",
    sources: ["vam_targeted_advertising_optout"],
    derive: (a) => {
      const v = str(a, "vam_targeted_advertising_optout");
      if (v === "yes_link_and_uoom") {
        return {
          suggested: "yes",
          lead: "You told us you honour Universal Opt-Out Mechanisms such as Global Privacy Control.",
          note: "Colorado requires recognition of UOOMs on its own public list (4 CCR 904-3, Rule 5.06) — confirm your site honours the Colorado-recognised signals.",
        };
      }
      if (v === "yes_link_only") {
        return {
          suggested: "no",
          lead: "You told us you offer an opt-out link but do not process UOOM signals.",
          note: "Colorado requires recognition of UOOMs on its own public list (4 CCR 904-3, Rule 5.06) — an opt-out link alone does not satisfy it.",
        };
      }
      return null;
    },
  },
  {
    target: "ct_consumer_health_data",
    sources: ["md_consumer_health_data", "data_categories"],
    derive: (a) => {
      const md = yesNo(a, "md_consumer_health_data");
      if (md) {
        return {
          suggested: md,
          lead:
            md === "yes"
              ? "You told us you process consumer health data for Maryland."
              : "You told us you do not process consumer health data for Maryland.",
          note: "Connecticut's consumer-health-data definition (Conn. Gen. Stat. § 42-515) is drawn separately from Maryland's — confirm it against the Connecticut scope.",
        };
      }
      const cats = list(a, "data_categories");
      if (cats.length === 0) return null;
      const health = anyOf(cats, ["health_medical", "mental_health"]);
      return {
        suggested: health ? "yes" : "no",
        lead: health
          ? "You said you collect health or mental-health data."
          : "You did not select health or mental-health data as a category you collect.",
        note: "Connecticut's definition reaches inferences drawn from non-health data as well as health records themselves.",
      };
    },
  },
  {
    target: "fl_profiling_opt_out",
    sources: ["vam_profiling", "ccpa_admt"],
    derive: (a) => {
      const v = yesNo(a, "vam_profiling") ?? yesNo(a, "ccpa_admt");
      if (!v) return null;
      return {
        suggested: v,
        lead:
          v === "yes"
            ? "You told us you profile individuals for decisions with legal or similarly significant effects."
            : "You told us you do not profile individuals for decisions with legal or similarly significant effects.",
        note: "Florida grants its own opt-out right over that profiling (Fla. Stat. § 501.705(1)(e)) — confirm it applies to Florida consumers.",
      };
    },
  },
  {
    target: "fl_known_children",
    sources: ["fl_children_known", "data_categories"],
    derive: (a) => {
      const prior = yesNo(a, "fl_children_known");
      if (prior) {
        return {
          suggested: prior,
          lead:
            prior === "yes"
              ? "You told us you knowingly collect personal data from Florida residents under 18."
              : "You told us you do not knowingly collect personal data from Florida residents under 18.",
          note: "This question covers processing of that data, not only its collection — Florida's minor protections attach to both.",
        };
      }
      const cats = list(a, "data_categories");
      if (cats.length === 0) return null;
      const kids = cats.includes("children");
      return {
        suggested: kids ? "yes" : "no",
        lead: kids
          ? "You said you collect children's data."
          : "You did not select children's data as a category you collect.",
        note: "Florida's threshold is knowing processing of data about residents under 18.",
      };
    },
  },
];

/** Index a rule list by target key. */
export function indexRules(rules: PrefillRule[]): Record<string, PrefillRule> {
  const out: Record<string, PrefillRule> = {};
  for (const r of rules) out[r.target] = r;
  return out;
}

export const EU_PREFILL_BY_TARGET = indexRules(EU_PREFILL_RULES);
export const US_PREFILL_BY_TARGET = indexRules(US_PREFILL_RULES);

/**
 * Resolve a proposal for `targetKey`, or null when no rule fires.
 * `allowed` (when supplied) is the set of stored option values the target
 * question accepts; a proposal outside that set is discarded rather than
 * offered, so a confirmation can never persist an unknown option value.
 */
export function resolvePrefill(
  rules: Record<string, PrefillRule>,
  targetKey: string,
  answers: PrefillAnswers,
  labelOf: LabelOf,
  allowed?: string[] | null,
): PrefillProposal | null {
  const rule = rules[targetKey];
  if (!rule) return null;
  const proposal = rule.derive(answers, labelOf);
  if (!proposal) return null;
  const s = proposal.suggested;
  if (typeof s !== "string" || s.trim() === "") return null;
  if (allowed && allowed.length > 0 && !allowed.includes(s)) return null;
  return proposal;
}

/** Stored option values a question will accept, or null for free-text types. */
export function allowedValuesFor(q: {
  type: string;
  options?: { value: string }[];
}): string[] | null {
  if (q.type === "yes_no") return ["yes", "no"];
  if (q.type === "yes_no_unsure") return ["yes", "no", "unsure"];
  if (q.type === "single_choice" || q.type === "multi_choice") {
    return (q.options ?? []).map((o) => o.value);
  }
  return null;
}
