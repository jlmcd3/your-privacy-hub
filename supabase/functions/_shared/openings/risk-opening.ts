// T7-RISK-OPENING-PARAGRAPH-PILOT — Deterministic opening_summary slot builder.
//
// Authoritative spec: docs/design/OPENING-PARAGRAPH-DESIGN.md (CEO-approved
// 2026-07-25, ledger item 82). Scope this file: cppa-risk pilot only.
//
// Contract
// --------
// buildRiskOpening(intake, opts?) -> { text, slots, provenance }
//
// The model NEVER writes this slot; the emit-gate hook in run-cppa-risk-
// assessment/index.ts OVERWRITES report_data.opening_summary with this
// builder's output immediately before the schema-driven serializer runs.
//
// Rules (from design doc §1)
// - Every slot sources from ONE fact-ledger row (customer intake, verbatim,
//   polarity locked) or ONE registry row (verbatim quote pin-tested against
//   the product's native corpus table, cppa_authorities for risk).
// - Omission over invention: a silent intake fact drops its clause; grammar
//   via pre-written clause-subset variants, not string surgery.
// - Missing facts surface later in information_needed — NEVER in the opening.
// - All-that-apply enumeration for legal qualifications (S0 criteria, S1
//   § 7150(b) triggers), in statutory order; unresolved criteria are simply
//   omitted, never rendered as "unmet".
// - Operative figures come from corpus text (CCPA_1798_140_D_1_A includes
//   the § 1798.199.95(d) CPI-adjustment cross-reference verbatim); NEVER
//   hard-code a numeric threshold.
// - Semantic honesty: intake field fills a slot only when its legal meaning
//   matches. (B) requires BOTH consumers-or-households volume >= 100,000
//   AND affirmative buy/sell/share activity; a "consumers processed" band
//   alone CANNOT support (B).
// - Boundary-band rule: assert a criterion only when the band unambiguously
//   clears the operative figure.

import {
  CCPA_1798_140_D_1_A,
  CCPA_1798_140_D_1_B,
} from "./ccpa-1798-140-pin.ts";
import { CCPA_7150_B_LABELS } from "./ccpa-7150-pin.ts";

export const RISK_OPENING_VERSION = "risk-opening-t7-pilotfix2@2026-07-26";

// Revenue bands that UNAMBIGUOUSLY clear the § 1798.140(d)(1)(A) threshold.
// The corpus figure is "twenty-five million dollars ($25,000,000), as adjusted
// pursuant to subdivision (d) of Section 1798.199.95" — CPI-adjusted. Only
// bands whose FLOOR strictly exceeds $25M pre-adjustment qualify. The
// "$25M–$50M" band straddles the base figure at its low edge (and any CPI
// adjustment moves the operative figure upward, so straddling is definitive).
const REVENUE_BANDS_CLEAR_A = new Set<string>([
  "$50M–$100M",
  "$100M–$500M",
  "Over $500M",
]);

// T7-PILOT-FIX-2 (2026-07-26) — bands whose FLOOR is >= 100,000 for the
// § 1798.140(d)(1)(B) BOUGHT/SOLD/SHARED count. Design rule 6: the operand
// for (B) MUST be a count field whose legal meaning is "bought, sold, or
// shared consumers or households". q2_consumers is a PROCESSED-consumers
// band (all-purpose data-subject volume) and is EXPLICITLY EXCLUDED here —
// it may never source (B). The live risk intake contract does not yet
// carry a compliant count field; when one is added (canonical key
// `bought_sold_shared_count`, same band vocabulary) the builder will
// consume it. Until then, (B) is dropped even when sell/share is
// affirmative, and the omission is telemetered as `s0_b_rejected_reason`.
const BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE = new Set<string>([
  "100,000–249,999",
  "250,000–1 million",
  "1–10 million",
  "Over 10 million",
]);

// q5_sell_share polarities that constitute AFFIRMATIVE buy/sell/share activity
// for § 1798.140(d)(1)(B). "No" and "Unsure" (and undefined) do NOT.
const SELL_SHARE_AFFIRMATIVE = new Set<string>([
  "Yes — sell only",
  "Yes — share for advertising only",
  "Both",
]);

export interface RiskOpeningInput {
  entity_name?: unknown;
  q1_revenue?: unknown;
  q2_consumers?: unknown;
  q5_sell_share?: unknown;
  q5b_profiling_observation?: unknown;
  q15_sensitive_pi?: unknown;
  q18_admt_use?: unknown;
  q18b_admt_training?: unknown;
  sensitive_location_basis?: unknown;
  q4_pi_categories?: unknown;
  i1_processing_purpose?: unknown;
  i1b_min_pi?: unknown;
  i4_disclosure_mechanisms?: unknown;
  /** T7-PILOT-FIX-2: canonical compliant count field for § 1798.140(d)(1)(B).
   *  Legal meaning: consumers or households whose PI was BOUGHT, SOLD, or
   *  SHARED (not "processed"). Same band vocabulary as q2_consumers. If the
   *  intake contract adds this key, the builder will consume it. */
  bought_sold_shared_count?: unknown;
  [k: string]: unknown;
}

export interface RiskOpeningOutput {
  text: string;
  slots: {
    S0: string | null;
    S1: string | null;
    S2: string | null;
    S3: string | null;
    S4: string | null;
    S5: string;
    S6: string;
  };
  provenance: {
    version: string;
    s0_criteria: string[]; // e.g. ["A","B"]
    s1_triggers: number[]; // e.g. [1,3,4]
    omitted: string[]; // slot labels omitted with reason codes
    sources: Record<string, string>; // slot -> intake field or registry pin
    /** T7-PILOT-FIX-2: reason (B) was NOT rendered, when applicable.
     *  null when (B) was rendered, or when (B) was not evaluated because
     *  intake did not affirm sell/share activity. Populated with a stable
     *  reason code otherwise. Telemetry-only; never on customer surfaces. */
    s0_b_rejected_reason: string | null;
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

function formatOxford(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Build the deterministic opening_summary. Pure function; no I/O. */
export function buildRiskOpening(
  intake: RiskOpeningInput,
  opts?: { asOfDate?: string },
): RiskOpeningOutput {
  const omitted: string[] = [];
  const sources: Record<string, string> = {};
  const provCriteria: string[] = [];
  const provTriggers: number[] = [];

  const entity = str(intake.entity_name);

  // ── S0 — CCPA applicability (all-that-apply, statutory order A,B) ──
  const revenue = str(intake.q1_revenue);
  const sellShare = str(intake.q5_sell_share);
  // T7-PILOT-FIX-2: (B) count operand comes ONLY from the compliant
  // bought/sold/shared count field. q2_consumers (consumers PROCESSED) is
  // explicitly excluded — design rule 6 forbids it as a (B) operand.
  const bssCount = str(intake.bought_sold_shared_count);

  const clearsA = REVENUE_BANDS_CLEAR_A.has(revenue);
  const affirmativeBuySellShare = SELL_SHARE_AFFIRMATIVE.has(sellShare);
  const hasCompliantBssBand = BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE.has(bssCount);
  const satisfiesB = affirmativeBuySellShare && hasCompliantBssBand;

  // (B)-rejection reason for telemetry (never customer prose). Only meaningful
  // when the intake affirms sell/share activity — silent intake is a plain
  // omission, not a rejection.
  let s0BRejectedReason: string | null = null;
  if (!satisfiesB && affirmativeBuySellShare) {
    s0BRejectedReason = "no_compliant_count_field";
  }

  const criteria: Array<{ letter: "A" | "B"; quote: string }> = [];
  if (clearsA) criteria.push({ letter: "A", quote: CCPA_1798_140_D_1_A });
  if (satisfiesB) criteria.push({ letter: "B", quote: CCPA_1798_140_D_1_B });

  let S0: string | null = null;
  if (entity && criteria.length > 0) {
    const rendered = criteria
      .map((c) => `(${c.letter}) ${c.quote}`)
      .join(" ");
    S0 =
      `The record indicates ${entity} is a "business" subject to the CCPA under Civ. Code \u00A7 1798.140(d)(1), meeting the following criteria: ${rendered}`;
    provCriteria.push(...criteria.map((c) => c.letter));
    sources.S0 = "cppa_authorities:Cal. Civ. Code § 1798.140 (d)(1)";
  } else {
    // Neutral applicability frame — omission over invention. Body-side
    // applicability logic remains untouched (all-that-apply/unresolved).
    omitted.push(
      entity
        ? "S0:no_criteria_unambiguously_resolved"
        : "S0:missing_entity_name",
    );
    if (s0BRejectedReason) {
      omitted.push(`S0:B_rejected:${s0BRejectedReason}`);
    }
  }

  // ── S1 — 11 CCR § 7150(b) triggers (all-that-apply, statutory order) ──
  const triggers: number[] = [];
  if (SELL_SHARE_AFFIRMATIVE.has(sellShare)) triggers.push(1);
  if (str(intake.q15_sensitive_pi) === "Yes") triggers.push(2);
  if (str(intake.q18_admt_use) === "Yes") triggers.push(3);
  const prof = str(intake.q5b_profiling_observation);
  if (prof && /^Yes/.test(prof) && /worker|student|applicant/i.test(prof)) {
    triggers.push(4);
  }
  const sensLoc = str(intake.sensitive_location_basis);
  if (
    sensLoc && !/not\s+applicable/i.test(sensLoc) &&
    !/^No\b/i.test(sensLoc)
  ) {
    triggers.push(5);
  }
  if (/^Yes/.test(str(intake.q18b_admt_training))) triggers.push(6);

  let S1: string | null = null;
  if (triggers.length > 0) {
    const labelParts = triggers.map((n) =>
      `\u00A7 7150(b)(${n}) (${CCPA_7150_B_LABELS[n as 1 | 2 | 3 | 4 | 5 | 6]})`
    );
    S1 =
      `The processing engages 11 CCR \u00A7 7150(b) at ${
        formatOxford(labelParts)
      }.`;
    provTriggers.push(...triggers);
    sources.S1 = "provision_texts:cppa-7150";
  } else {
    omitted.push("S1:no_trigger_resolved");
  }

  // ── S2 — company / data / purpose (verbatim from intake) ──
  const piCats = arr(intake.q4_pi_categories);
  const purpose = str(intake.i1_processing_purpose);
  let S2: string | null = null;
  if (entity && piCats.length > 0 && purpose) {
    S2 = `This assessment covers ${entity}\u2019s processing of ${
      formatOxford(piCats)
    } for the following stated purpose: ${purpose}`;
    sources.S2 = "intake:entity_name,q4_pi_categories,i1_processing_purpose";
  } else {
    omitted.push("S2:missing_entity_or_categories_or_purpose");
  }

  // ── S3 — qualifiers trio (sell-share / targeted-ads / profiling), polarity locked ──
  const qparts: string[] = [];
  if (sellShare) {
    if (sellShare === "No") {
      qparts.push("does not sell or share personal information");
    } else if (sellShare === "Yes — sell only") {
      qparts.push("sells personal information");
    } else if (sellShare === "Yes — share for advertising only") {
      qparts.push("shares personal information for cross-context behavioral advertising");
    } else if (sellShare === "Both") {
      qparts.push(
        "both sells personal information and shares it for cross-context behavioral advertising",
      );
    }
  }
  // targeted-ads polarity is a projection of q5_sell_share (share polarity).
  // ADMT / profiling posture from q18_admt_use + q5b_profiling_observation.
  const admt = str(intake.q18_admt_use);
  if (admt === "Yes") qparts.push("uses ADMT for significant decisions");
  else if (admt === "No") qparts.push("does not use ADMT for significant decisions");
  else if (admt === "In evaluation") qparts.push("is evaluating ADMT for significant decisions");

  if (prof) {
    if (/^No\b/i.test(prof)) {
      qparts.push("does not conduct systematic-observation profiling");
    } else if (/^Yes/.test(prof)) {
      qparts.push("conducts systematic-observation profiling as described in the intake");
    }
  }

  let S3: string | null = null;
  if (qparts.length > 0 && entity) {
    S3 = `${entity} ${formatOxford(qparts)}.`;
    sources.S3 = "intake:q5_sell_share,q18_admt_use,q5b_profiling_observation";
  } else {
    omitted.push("S3:no_qualifier_polarities_available");
  }

  // ── S4 — safeguards VERBATIM; omit if silent ──
  const disclosures = arr(intake.i4_disclosure_mechanisms);
  const minPi = str(intake.i1b_min_pi);
  let S4: string | null = null;
  if (disclosures.length > 0 && minPi) {
    S4 =
      `Documented safeguards on the record: notice delivered via ${
        formatOxford(disclosures)
      }; data-minimisation posture: ${minPi}`;
    sources.S4 = "intake:i4_disclosure_mechanisms,i1b_min_pi";
  } else if (disclosures.length > 0) {
    S4 = `Documented safeguards on the record: notice delivered via ${
      formatOxford(disclosures)
    }.`;
    sources.S4 = "intake:i4_disclosure_mechanisms";
  } else if (minPi) {
    S4 = `Documented safeguards on the record: data-minimisation posture: ${minPi}`;
    sources.S4 = "intake:i1b_min_pi";
  } else {
    omitted.push("S4:no_safeguard_facts_on_record");
  }

  // ── S5 — content-statute frame (§ 7152) ──
  const S5 =
    "This assessment is structured against the content required by 11 CCR \u00A7 7152.";
  sources.S5 = "provision_texts:cppa-7152 (frame)";

  // ── S6 — as-of date ──
  const asOf = opts?.asOfDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.asOfDate)
    ? opts.asOfDate
    : new Date().toISOString().slice(0, 10);
  const S6 = `As of ${asOf}.`;
  sources.S6 = "runtime:asOfDate";

  const text = [S0, S1, S2, S3, S4, S5, S6].filter(Boolean).join(" ");

  return {
    text,
    slots: { S0, S1, S2, S3, S4, S5, S6 },
    provenance: {
      version: RISK_OPENING_VERSION,
      s0_criteria: provCriteria,
      s1_triggers: provTriggers,
      omitted,
      sources,
      s0_b_rejected_reason: s0BRejectedReason,
    },
  };
}
