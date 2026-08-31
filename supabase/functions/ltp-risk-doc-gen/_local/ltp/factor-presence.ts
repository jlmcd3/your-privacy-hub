/**
 * ITEM 350 — DETERMINISTIC § 7152 FACTOR-PRESENCE DETECTION.
 *
 * ROOT CAUSE THIS MODULE CLOSES
 * -----------------------------
 * `derive.ts::pickFactorTable()` pinned `present_in_intake:false` on EVERY
 * factor row ("presence detection is a Pass-1 model responsibility",
 * Ruling A). Consequence, reproduced on the Item 349 smoke fixtures:
 * the sufficiency evaluator saw ZERO operands on every record, so the
 * perfect record (`a073d9c5…`, carries `a6_safeguards`) and the messy
 * record (`bd458f0d…`, no `a6_safeguards`) produced BYTE-IDENTICAL
 * `record_sufficiency` and `information_needed` — and the complete record
 * was itself reported insufficient for the § 7152(a)(6) balancing frame.
 *
 * CONTRACT
 * --------
 * Presence is asserted ONLY from contract-real intake fields
 * (`_shared/intake-contracts/cppa-risk-assessment.ts`), and every asserted
 * row carries the ledger id that evidences it, so the Item 243 defect-3
 * present-requires-refs coherence rule stays satisfied.
 *
 * OMISSION OVER INVENTION: factor rows with no unambiguous contract-real
 * operand (§ 7152(a)(6)(ii) privacy-enhancing technologies,
 * (a)(6)(iii) external consultation) stay `false`. The model overlay in
 * `pass1-llm.ts::applySingleWriterInjection` may still raise them; this
 * module only supplies the deterministic floor.
 *
 * Pure; never throws.
 */

/** Harm-code letter → negative-impact factor id (§ 7152(a)(5)(A)-(H)). */
const HARM_CODE_TO_FACTOR: Readonly<Record<string, string>> = {
  A: "neg.a.unauthorized_access",
  B: "neg.b.discrimination",
  C: "neg.c.impaired_control",
  D: "neg.d.coercion_dark_patterns",
  E: "neg.e.economic_harms",
  F: "neg.f.physical_harms",
  G: "neg.g.reputational_harms",
  H: "neg.h.psychological_harms",
};

// A-TEAM DELTA (ChatGPT-flagged batch finding, 2026-08-31) — a second,
// contract-declared way to answer the SAME § 7152(a)(5) harm-category
// question: `impact_intake.harmTypes` (a multi-enum, HARM_TYPES in
// cppa-risk-assessment.ts) rather than the detailed `a5_harm_pathways`
// structured list. Both are legitimate contract fields; this module only
// ever read the pathway shape, so an intake answered via the simpler
// multi-select showed every negative-impact factor as absent regardless of
// what was selected. "Loss of availability of personal information" has no
// A-H counterpart and intentionally maps to nothing (omission over
// invention -- it does not grant presence to an unrelated factor).
const HARM_TYPE_TEXT_TO_CODE: Readonly<Record<string, string>> = {
  "Unauthorised access, destruction, use, modification, or disclosure": "A",
  "Unlawful discrimination": "B",
  "Impairment of consumer control over personal information": "C",
  "Coercion or dark patterns": "D",
  "Economic harm": "E",
  "Physical harm": "F",
  "Reputational harm": "G",
  "Psychological harm": "H",
};

/** Benefit factor id → the § 7152(a)(4) contract field that evidences it. */
const BENEFIT_FIELD_BY_FACTOR: Readonly<Record<string, string>> = {
  "benefit.business": "a4_benefit_business",
  "benefit.consumer": "a4_benefit_consumer",
  "benefit.other_stakeholders": "a4_benefit_other_stakeholders",
  "benefit.public": "a4_benefit_public",
};

export interface FactorPresence {
  readonly present: boolean;
  /** Ledger ids ("L.<field>") evidencing the assertion; [] when absent. */
  readonly ledger_refs: readonly string[];
}

const nonEmptyText = (v: unknown): boolean =>
  typeof v === "string" && v.trim().length > 0;

const nonEmptyList = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

const absent: FactorPresence = { present: false, ledger_refs: [] };

/** Which of the two contract-real sources evidenced each harm-code letter. */
function harmCodeSourcesOnRecord(intake: Record<string, unknown>): Map<string, Set<"pathways" | "harmTypes">> {
  const out = new Map<string, Set<"pathways" | "harmTypes">>();
  const add = (code: string, source: "pathways" | "harmTypes") => {
    const s = out.get(code) ?? new Set<"pathways" | "harmTypes">();
    s.add(source);
    out.set(code, s);
  };
  const rows = intake?.a5_harm_pathways;
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const harm = (r as Record<string, unknown> | null)?.harm;
      if (typeof harm !== "string") continue;
      const m = harm.trim().match(/^\(([A-H])\)/i);
      if (m) add(m[1].toUpperCase(), "pathways");
    }
  }
  const impactIntake = intake?.impact_intake as Record<string, unknown> | null | undefined;
  const harmTypes = impactIntake?.harmTypes;
  if (Array.isArray(harmTypes)) {
    for (const t of harmTypes) {
      if (typeof t !== "string") continue;
      const code = HARM_TYPE_TEXT_TO_CODE[t.trim()];
      if (code) add(code, "harmTypes");
    }
  }
  return out;
}

/**
 * Deterministic presence for one factor row. Unknown factor ids and any
 * unreadable intake shape resolve to absent.
 */
export function detectFactorPresence(
  factorId: string,
  intakeIn: Record<string, unknown> | null | undefined,
): FactorPresence {
  const intake = (intakeIn ?? {}) as Record<string, unknown>;
  try {
    const benefitField = BENEFIT_FIELD_BY_FACTOR[factorId];
    if (benefitField) {
      return nonEmptyText(intake[benefitField])
        ? { present: true, ledger_refs: [`L.${benefitField}`] }
        : absent;
    }

    if (factorId.startsWith("neg.")) {
      const letter = Object.keys(HARM_CODE_TO_FACTOR)
        .find((k) => HARM_CODE_TO_FACTOR[k] === factorId);
      if (!letter) return absent;
      const sources = harmCodeSourcesOnRecord(intake).get(letter);
      if (!sources) return absent;
      const ledger_refs: string[] = [];
      if (sources.has("pathways")) ledger_refs.push("L.a5_harm_pathways");
      if (sources.has("harmTypes")) ledger_refs.push("L.impact_intake.harmTypes");
      return { present: true, ledger_refs };
    }

    if (factorId === "safe.i.technical_controls") {
      // § 7152(a)(6)(i) — the safeguards the business documents.
      return nonEmptyList(intake.a6_safeguards)
        ? { present: true, ledger_refs: ["L.a6_safeguards"] }
        : absent;
    }

    if (factorId === "safe.iv.admt_governance") {
      // § 7152(a)(6)(iv) — only engaged when the record affirms ADMT use.
      const admt = intake.q18_admt_use;
      const affirmative = typeof admt === "string" && /^(yes|true)/i.test(admt.trim());
      if (!affirmative) return absent;
      return nonEmptyList(intake.a6_safeguards)
        ? { present: true, ledger_refs: ["L.q18_admt_use", "L.a6_safeguards"] }
        : absent;
    }

    // safe.ii / safe.iii — no contract-real operand; stays absent.
    return absent;
  } catch {
    return absent;
  }
}
