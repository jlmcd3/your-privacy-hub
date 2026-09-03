/**
 * cyber-applicability — C1.2 (2026-08-25), doc 64 §1 ratified content.
 *
 * Pure, deterministic resolution of the 11 CCR § 7120(a)-(b) audit-
 * applicability test from the six § 7120(a)-(b) intake fields added to
 * the cyber contract this landing (profile.q1_revenue, q2_consumers,
 * q5_sell_share, q5c_share_revenue_50pct, q15_sensitive_pi,
 * q15c_spi_volume — verbatim reuses of Risk's identical, already-ratified
 * fields; see the intake-contract header for the full rationale).
 *
 * TRUTH TABLE (doc 64 §1, from Civ. Code § 1798.140(d)(1) and § 7120(b)):
 *   A1 = the business derives 50% or more of its annual revenue from
 *        selling or sharing consumers' personal information
 *        (§ 1798.140(d)(1)(C), cited by § 7120(b)(1)).
 *   A2 = the business's annual gross revenue exceeds $25,000,000
 *        (§ 1798.140(d)(1)(A)) AND, in the preceding calendar year, it
 *        processed 250,000+ consumers'/households' personal information
 *        OR 50,000+ consumers' sensitive personal information
 *        (§ 7120(b)(2)(A)-(B)).
 *   Audit required = A1 OR A2.
 *
 * Tri-state throughout (OMISSION-OVER-INVENTION — matches this product's
 * own TEST-STATES / M1-M21 discipline): `null` means the intake does not
 * resolve the question, never a guessed true/false. A1/A2 use standard
 * tri-state boolean logic — `false` on one AND-operand or `true` on one
 * OR-operand is decisive even when the sibling operand is unresolved.
 *
 * Pure. No I/O. Never throws.
 */

import {
  CONSUMER_BAND_APPLICABILITY,
  REVENUE_BAND_APPLICABILITY_A,
  resolveConsumerBand,
  resolveRevenueBand,
} from "../../../_shared/bands/revenue-consumer.ts";
import type { RenderedTable } from "../../../_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** `null` = indeterminate (the intake does not resolve this question). */
export type Tri = boolean | null;

export function triAnd(a: Tri, b: Tri): Tri {
  if (a === false || b === false) return false;
  if (a === true && b === true) return true;
  return null;
}

export function triOr(a: Tri, b: Tri): Tri {
  if (a === true || b === true) return true;
  if (a === false && b === false) return false;
  return null;
}

export interface TriResult {
  readonly value: Tri;
  /** Plain-English basis when resolved; the specific missing input when not. */
  readonly basis: string;
}

const SELL_SHARE_NONE = "No";

/** A1 — § 7120(b)(1) / § 1798.140(d)(1)(C): 50%+ revenue from selling/sharing PI. */
export function resolveA1(profile: Bag): TriResult {
  const sellShare = s(profile.q5_sell_share);
  if (!sellShare) {
    return { value: null, basis: "the business has not stated whether it sells or shares personal information" };
  }
  if (sellShare === SELL_SHARE_NONE) {
    return { value: false, basis: "the business has stated that it does not sell or share personal information" };
  }
  const pct = s(profile.q5c_share_revenue_50pct);
  if (pct === "Yes") {
    return { value: true, basis: "the business has stated that 50% or more of its annual gross revenue derives from selling or sharing personal information" };
  }
  if (pct === "No") {
    return { value: false, basis: "the business has stated that less than 50% of its annual gross revenue derives from selling or sharing personal information" };
  }
  return { value: null, basis: "the business sells or shares personal information but has not stated (or is unsure) whether 50% or more of its annual gross revenue derives from that activity" };
}

/** The § 7120(b)(2)(A)-(B) volume prong: 250,000+ consumers OR 50,000+ sensitive-PI consumers. */
function resolveVolumeProng(profile: Bag): TriResult {
  const consumerBand = resolveConsumerBand(s(profile.q2_consumers));
  const consumerProng: Tri = consumerBand ? CONSUMER_BAND_APPLICABILITY[consumerBand].over_250k : null;

  const spi = s(profile.q15_sensitive_pi);
  let spiProng: Tri = null;
  let spiBasis = "the business has not stated whether it processes sensitive personal information";
  if (spi === "No") {
    spiProng = false;
    spiBasis = "the business has stated that it does not process sensitive personal information";
  } else if (spi === "Yes") {
    const vol = s(profile.q15c_spi_volume);
    if (vol === "50,000 or more") {
      spiProng = true;
      spiBasis = "the business has stated that it processes sensitive personal information of 50,000 or more consumers annually";
    } else if (vol === "Fewer than 50,000") {
      spiProng = false;
      spiBasis = "the business has stated that it processes sensitive personal information of fewer than 50,000 consumers annually";
    } else {
      spiBasis = "the business processes sensitive personal information but has not stated (or is unsure) how many consumers it reaches annually";
    }
  } else if (spi === "Unsure") {
    spiBasis = "the business is unsure whether it processes sensitive personal information";
  }

  const value = triOr(consumerProng, spiProng);
  if (value === true) {
    return {
      value: true,
      basis: consumerProng === true
        ? "the business has stated that it processes 250,000 or more consumers' or households' personal information annually"
        : spiBasis,
    };
  }
  if (value === false) {
    return { value: false, basis: "the business has stated that it processes fewer than 250,000 consumers' or households' personal information and that " + spiBasis.replace(/^the business /, "") };
  }
  return {
    value: null,
    basis: consumerBand
      ? spiBasis
      : "the business has not stated how many consumers' or households' personal information it processes annually",
  };
}

/** A2 — § 7120(b)(2): revenue >$25M AND the volume prong. */
export function resolveA2(profile: Bag): TriResult {
  const revenueBand = resolveRevenueBand(s(profile.q1_revenue));
  const revenueGate: Tri = revenueBand ? REVENUE_BAND_APPLICABILITY_A[revenueBand] : null;
  const volume = resolveVolumeProng(profile);

  const value = triAnd(revenueGate, volume.value);
  if (value === false && revenueGate === false) {
    return { value: false, basis: "the business has stated annual gross revenue under $25,000,000" };
  }
  if (value === false) {
    return { value: false, basis: volume.basis };
  }
  if (value === true) {
    return { value: true, basis: `the business's annual gross revenue exceeds $25,000,000 and ${volume.basis.replace(/^the business /, "the business ")}` };
  }
  return {
    value: null,
    basis: revenueBand
      ? volume.basis
      : "the business has not stated its annual gross revenue",
  };
}

export interface CyberApplicabilityResult {
  readonly a1: TriResult;
  readonly a2: TriResult;
  readonly auditRequired: TriResult;
}

export function resolveCyberApplicability(profile: Bag): CyberApplicabilityResult {
  const a1 = resolveA1(profile);
  const a2 = resolveA2(profile);
  const auditRequired: TriResult = {
    value: triOr(a1.value, a2.value),
    basis: a1.value === true
      ? `Trigger A1 is met: ${a1.basis}.`
      : a2.value === true
      ? `Trigger A2 is met: ${a2.basis}.`
      : a1.value === false && a2.value === false
      ? `Neither trigger is met on the answers given: ${a1.basis}; and ${a2.basis}.`
      : "The record does not yet resolve at least one trigger.",
  };
  return { a1, a2, auditRequired };
}

function statusCell(r: TriResult): string {
  if (r.value === true) return `Yes — ${r.basis}.`;
  if (r.value === false) return `No — ${r.basis}.`;
  return `Insufficient information — ${r.basis}.`;
}

/**
 * The doc 64 §1 applicability table, computed against the live record.
 * `null` when the applicability question cannot even partially resolve in
 * a way worth rendering — never the case here (every profile, even an
 * empty one, produces two "insufficient information" rows), but the
 * caller (cyber-skeleton-assemble.ts) gates inclusion on the
 * CYBER_DETERMINISTIC_ENABLED flag, not on this function's output.
 */
export function buildCyberApplicabilityTable(profile: Bag): RenderedTable {
  const result = resolveCyberApplicability(profile);
  const overall = result.auditRequired.value === true
    ? "On the record as answered, an independent cybersecurity audit is required."
    : result.auditRequired.value === false
    ? "On the record as answered, neither trigger is met and an independent cybersecurity audit is not required on this basis."
    : "The record does not yet resolve whether an independent cybersecurity audit is required.";
  return {
    key: "",
    surface: "cyber_applicability",
    title: "Cybersecurity Audit Applicability (11 CCR § 7120)",
    // C2 (2026-08-26): column header re-registered "On this record" ->
    // the fleet's ratified "on the information provided" family (the v5.2
    // register ruling; the old phrase is a fleet-banned register). Ledgered.
    columns: ["Trigger", "What the regulation requires", "On the information provided"],
    rows: [
      [
        "A1 — § 7120(b)(1)",
        "50% or more of the business's annual revenue derives from selling or sharing consumers' personal information (Civ. Code § 1798.140(d)(1)(C)).",
        statusCell(result.a1),
      ],
      [
        "A2 — § 7120(b)(2)",
        "Annual gross revenue exceeds $25,000,000 (§ 1798.140(d)(1)(A)), and in the preceding calendar year the business processed 250,000 or more consumers' or households' personal information, or 50,000 or more consumers' sensitive personal information (§ 7120(b)(2)(A)-(B)).",
        statusCell(result.a2),
      ],
    ],
    note:
      `${overall} A business meeting either trigger must complete the audit; meeting neither does not exempt the business from § 7120's threshold being met later, as its revenue or processing volume changes. ` +
      "Each audit component below is assessed subject to the auditor's own applicability determination (§ 7123(b)(2)/(c)). The business, in consultation with qualified legal counsel, confirms this determination against its final figures for the preceding calendar year. " +
      // DOC 159 — the duty-bearer, stated as law: § 7120 speaks of a
      // "business", and 11 CCR § 7001(v) defines a nonbusiness as a person
      // or entity outside Civ. Code § 1798.140(d)'s definition. No entity-
      // type answer is collected, so nothing is inferred about this Company.
      "The § 7120 duty attaches to a business as defined in Civ. Code § 1798.140(d); a nonbusiness under 11 CCR § 7001(v), a person or entity outside that definition, is outside § 7120 altogether.",
  };
}
