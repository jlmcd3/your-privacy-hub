// ITEM 346 — cppa-risk FRAME VALUE ADAPTER,
// REVISED UNDER ITEM 363 (PROSE REVISION + NEW DOCUMENT PLAN).
//
// Builds the RECORD-VERBATIM slot values for the frame set from the intake
// record plus the engine's own computed `ActivityAnalytics`, and names the
// determination keys the ENGINE reached so the conclusion slots can be
// resolved against the pinned book.
//
// WHAT THIS FILE MAY DO: read the record, read the engine's output, and join
// them into attributed sentences.
// WHAT THIS FILE MAY NOT DO: author legal prose, author a consequence clause,
// or decide a determination. Legal prose lives in `../legal-phrasings.ts`;
// consequence prose lives in `../engine-conclusions.ts`; determinations are the
// engine's. This adapter only carries values across.
//
// ITEM 363 RULES OBSERVED HERE.
//   * NO QUOTATION MARKS around an intake-derived value. Every one is wrapped
//     in invisible span tracking (`rec(value, source)`) instead, so the leak
//     checks and the Pass-2R validators still identify it exactly.
//   * ATTRIBUTION INTEGRITY. Every record-derived value sits inside a clause
//     whose subject is the company and whose verb is an attribution verb, and
//     the subject/verb come BEFORE the value in the sentence. A company claim
//     never appears as the tool's own assertion.
//   * VARIED STRUCTURE, NOT A VERB ROTATION. The sentence pattern for a line is
//     selected by a deterministic hash of its own content, so the document
//     neither repeats one shape nor cycles mechanically through a fixed list.
//   * TIGHT GRAMMAR. Counts are spelled and agree with their nouns; no
//     "1 element(s)". Values never collide with the following punctuation.

import type { ActivityAnalytics } from "../../ltp/analytic-deliverables/types.ts";
import { resolveEngineConclusion } from "../engine-conclusions.ts";
import { rec } from "../span-tracking.ts";
import { countWord, pluralise } from "../record-summary.ts";
import { joinNaturalList } from "../slots.ts";

export const CPPA_RISK_VALUES_VERSION = "prose-values-2026-08-01-item363";

const NOT_STATED = "not stated in the information provided";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v);
}

function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(s).filter(Boolean);
  const t = s(v);
  return t ? t.split(/;\s*|,\s(?=[A-Z])/).map((x) => x.trim()).filter(Boolean) : [];
}

function clause(key: string): string {
  return resolveEngineConclusion("cppa-risk", key) ?? "";
}

/** Deterministic, content-addressed variant choice — never a fixed cycle. */
function pick<T>(seed: string, options: readonly T[]): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return options[Math.abs(h) % options.length];
}

/** Strip a trailing full stop from an embedded value so it cannot collide. */
function noTerminal(v: string): string {
  return v.replace(/[\s.;,]+$/, "");
}

/** Rank of the necessity verdicts, worst first — the frame reports the worst. */
const NECESSITY_RANK = [
  "minimisation_candidate",
  "undetermined_on_the_record",
  "supported_as_necessary",
] as const;

const WEIGHING_RANK = ["benefit_not_stated", "benefit_generic", "benefit_supported"] as const;

const RESIDUAL_WORST = ["undetermined", "high", "moderate", "low"] as const;

const BAND_PHRASE: Readonly<Record<string, string>> = {
  low: "a low residual risk profile",
  moderate: "a moderate residual risk profile",
  high: "a high residual risk profile",
  undetermined: "no determinable residual risk band on the information provided",
};

export interface FrameValueBundle {
  readonly values: Record<string, unknown>;
  readonly determinations: {
    readonly necessity: string;
    readonly weighing: string;
    readonly consequence: string;
  };
}

export function buildCppaRiskFrameValues(input: {
  intake: Record<string, unknown>;
  analytics: ActivityAnalytics;
  inconsistencyFlags?: readonly string[];
  informationNeeded?: readonly string[];
}): FrameValueBundle {
  const { intake, analytics } = input;

  const worstNecessity =
    NECESSITY_RANK.find((v) => analytics.necessity_analysis.some((n) => n.verdict === v)) ??
    "undetermined_on_the_record";
  const worstWeighing =
    WEIGHING_RANK.find((v) => analytics.weighing.some((w) => w.sufficiency === v)) ??
    "benefit_not_stated";

  const necessityKey = `necessity.${worstNecessity}`;
  const weighingKey = `weighing.${worstWeighing}`;
  const consequenceKey = `consequence.${analytics.consequence.decision}`;

  const minimisation = analytics.necessity_analysis.filter(
    (n) => n.verdict === "minimisation_candidate",
  );

  // ── § 7152(a)(2) — one attributed sentence per element ────────────────
  const necessityLines = analytics.necessity_analysis.map((n) => {
    const el = rec(noTerminal(n.element), "necessity_analysis[].element");
    const st = rec(noTerminal(n.asserted_status), "necessity_analysis[].asserted_status");
    const c = clause(`necessity.${n.verdict}`);
    const base = pick(n.element + n.asserted_status, [
      `The company has identified ${el} as ${st}, and on that footing this assessment ${c}.`,
      `It describes ${el} as ${st}, and measured against the stated purpose this assessment ${c}.`,
      `The company reports ${el} as ${st}, so this assessment ${c}.`,
      `It lists ${el} among the elements it collects and gives the status as ${st}, which leaves this assessment to ${c}.`,
    ]);
    return n.information_needed
      ? `${base} To carry that element further we would need ${noTerminal(n.information_needed)}.`
      : base;
  });

  // ── § 7152(a)(5) — impacts, with source and causal path ───────────────
  const harmLines = analytics.harm_causation.map((h) => {
    const src = rec(noTerminal(h.source), "harm_causation[].source");
    const cause = rec(noTerminal(h.cause), "harm_causation[].cause");
    const base = pick(h.harm_id + h.source, [
      `The company traces ${h.harm_label} to ${src} and describes the causal path as ${cause}. Assessed on those facts, the impact carries ${h.likelihood} likelihood and ${h.severity} severity, and is inherently ${h.inherent_band} under ${h.harm_pinpoint}.`,
      `The company identifies ${h.harm_label}, naming ${src} as its source and ${cause} as the way the processing brings it about. That impact reads as ${h.likelihood} likelihood and ${h.severity} severity, inherently ${h.inherent_band} under ${h.harm_pinpoint}.`,
      `On ${h.harm_label} the company points to ${src}, and it sets out the causal path as ${cause}. The impact is assessed at ${h.likelihood} likelihood and ${h.severity} severity, inherently ${h.inherent_band} under ${h.harm_pinpoint}.`,
    ]);
    return h.information_needed
      ? `${base} We would need ${noTerminal(h.information_needed)} to take that impact further.`
      : base;
  });

  // ── § 7152(a)(6) — safeguards and what remains after them ─────────────
  const safeguardLines = analytics.safeguard_map.map((g) => {
    const harm = analytics.harm_causation.find((h) => h.harm_id === g.harm_id);
    const label = harm?.harm_label ?? g.harm_id;
    const sg = rec(noTerminal(g.safeguard), "safeguard_map[].safeguard");
    const base = pick(g.harm_id + g.safeguard, [
      `To address ${label}, the company relies on ${sg}, recorded as ${g.safeguard_status}, and a ${g.residual_band} residual remains once it is applied.`,
      `Against ${label} the company describes ${sg} as the measure in place, recorded as ${g.safeguard_status}, leaving a ${g.residual_band} residual.`,
      `The company answers ${label} with ${sg}, which is recorded as ${g.safeguard_status} and leaves a ${g.residual_band} residual.`,
    ]);
    return g.information_needed
      ? `${base} We would need ${noTerminal(g.information_needed)} before that residual could be narrowed further.`
      : base;
  });

  // ── § 7152(a)(4) + § 7154 — benefits, one beneficiary class at a time ─
  const benefitLines = analytics.weighing.map((w) => {
    const st = rec(noTerminal(w.benefit_statement), "weighing[].benefit_statement");
    const c = clause(`weighing.${w.sufficiency}`);
    const base = pick(w.beneficiary_class + w.benefit_statement, [
      `For ${w.beneficiary_class}, the company states the benefit as ${st}, and this assessment ${c}.`,
      `The company puts the benefit to ${w.beneficiary_class} as ${st}, and on that statement this assessment ${c}.`,
      `Turning to ${w.beneficiary_class}, the company gives the benefit as ${st}, which leaves this assessment to ${c}.`,
    ]);
    const generic = w.generic_benefit_flag
      ? " The statement is generic in the terms the provision screens for."
      : "";
    const need = w.information_needed
      ? ` We would need ${noTerminal(w.information_needed)} to give it more weight.`
      : "";
    return `${base}${generic}${need}`;
  });

  const flagLines = (input.inconsistencyFlags ?? []).map((f) =>
    `The company's answers do not agree on one point, and this assessment reports rather than resolves it: ${
      noTerminal(rec(f, "inconsistency_flags[]"))
    }.`
  );

  const openNeeds = [
    ...(input.informationNeeded ?? []),
    ...analytics.necessity_analysis.map((n) => n.information_needed).filter(Boolean) as string[],
    ...analytics.harm_causation.map((h) => h.information_needed).filter(Boolean) as string[],
    ...analytics.weighing.map((w) => w.information_needed).filter(Boolean) as string[],
  ].map(noTerminal).filter(Boolean);

  const conditions = analytics.consequence.conditions ?? [];

  // ── Deterministic engine phrases for the new plan's lead sections ─────
  const worstResidual = RESIDUAL_WORST.find((b) =>
    analytics.safeguard_map.some((g) => String(g.residual_band).toLowerCase() === b)
  ) ?? "undetermined";
  const bandPhrase = BAND_PHRASE[worstResidual];

  const conditionsPhrase = conditions.length === 0
    ? "no conditions"
    : `${countWord(conditions.length)} ${pluralise(conditions.length, "condition")}`;

  const impactCount = analytics.harm_causation.length;
  const synthesis =
    `the purpose the processing serves, ${countWord(impactCount)} negative ${
      pluralise(impactCount, "impact")
    } with the causal path for each, the safeguards described against them and the residual that remains once they are applied, and the benefits offered on the other side of the weighing`;

  const strengthen = openNeeds.length
    ? `The analysis would be strengthened by ${joinNaturalList(openNeeds)}.`
    : "No further information is required for the points this assessment reaches.";

  const actionPara = (() => {
    const parts: string[] = [];
    if (conditions.length) {
      parts.push(
        `The determination stands only while ${conditionsPhrase} ${
          pluralise(conditions.length, "is", "are")
        } met, and ${
          conditions.length === 1 ? "it is" : "they are"
        } set out below in the order they bear on the decision.`,
      );
    }
    if (openNeeds.length) {
      parts.push(
        `Before the assessment is filed, the company should supply ${joinNaturalList(openNeeds)}.`,
      );
    }
    parts.push(
      "The company should then have the completed assessment reviewed and approved by the person who will be named in it, and retain it with the dated record of that approval.",
    );
    return parts.join(" ");
  })();

  const values: Record<string, unknown> = {
    entity_name: s(intake.entity_name) || NOT_STATED,
    q2_consumers: s(intake.q2_consumers) || NOT_STATED,
    trigger_fact_verbatim: s(intake.i1_processing_purpose) || analytics.activity_purpose,
    data_categories: splitList(intake.q4_pi_categories),
    sources: s(intake.i4b_sources) || NOT_STATED,
    retention_period: s(intake.i2_retention_period) || NOT_STATED,
    vendors: splitList(intake.i6_vendors),
    i6_vendors: splitList(intake.i6_vendors),
    "impact_intake.safeguards": analytics.safeguard_map.map((g) => g.safeguard),
    secondary_use_status: s(intake.has_secondary_uses) || NOT_STATED,

    // Engine-normalised values and engine-composed prose. Never span-tracked
    // as company words (the record spans they contain are marked inside).
    "engine.entity_name": s(intake.entity_name) || NOT_STATED,
    "engine.activity_name": analytics.activity_name,
    "engine.activity_purpose": analytics.activity_purpose,
    "engine.band_phrase": bandPhrase,
    "engine.conditions_phrase": conditionsPhrase,
    "engine.necessity_paragraph": necessityLines.join(" "),
    "engine.harm_paragraph": harmLines.join(" "),
    "engine.safeguard_paragraph": safeguardLines.join(" "),
    "engine.benefit_paragraph": benefitLines.join(" "),
    "engine.synthesis_phrase": synthesis,
    "engine.strengthen_phrase": strengthen,
    "engine.action_paragraph": actionPara,

    minimisation_count: minimisation.length,
    minimisation_elements: minimisation.map((n) => n.element),
    "engine.minimisation_phrase": minimisation.length
      ? `${countWord(minimisation.length)} ${
        pluralise(minimisation.length, "element")
      } collected beyond what the stated purpose needs`
      : "no element collected beyond what the stated purpose needs",

    necessity_lines: necessityLines,
    harm_lines: harmLines,
    safeguard_lines: safeguardLines,
    benefit_lines: benefitLines,
    flag_lines: flagLines,
    gap_lines: openNeeds,

    // Conclusion slots address the book through the key the ENGINE reached.
    necessity_determination: necessityKey,
    necessity_determination_blocked: `${necessityKey}#blocked`,
    weighing_determination: weighingKey,
    consequence_determination: consequenceKey,
    consequence_determination_blocked: `${consequenceKey}#blocked`,
  };

  return {
    values,
    determinations: { necessity: necessityKey, weighing: weighingKey, consequence: consequenceKey },
  };
}
