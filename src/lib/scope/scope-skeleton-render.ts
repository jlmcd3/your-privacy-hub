// SO-9 — deterministic composition of the CCPA / CPRA Scope Assessment.
//
// There is NO model step in this product and none is added here. The three
// [GENERATED] paragraphs are composed mechanically from typed values, exactly
// as the [DETERMINATION LEAD] paragraphs are (the SO-8 Registration discipline:
// no model slots anywhere).
//
// Register rules carried from item413 / SO-7 / SO-8:
//   - facts are always attributed to the company ("the company has indicated");
//   - the "record shows" / "on this record" family is banned;
//   - no dramatization, no rhetorical questions, no self-narration;
//   - an authority reaches the Table of Authorities if and only if it was cited.

import {
  SCOPE_SPINE,
  SCOPE_SPINE_SHA256,
  SCOPE_PARA_KINDS,
  SCOPE_PIPELINE_STAMP,
  SCOPE_STATUTORY_REGISTRY as REG,
  type ScopeParaKind,
} from "./scope-spine";

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface ScopeAnswers {
  entity_name: string;
  q1: string;                    // for-profit + California nexus (combined)
  q2: string;                    // prior-year gross revenue band
  q2_legacy_confirm: string;     // legacy straddling-band confirmation
  q3: string;                    // consumers / households band
  q4: string;                    // sells or shares PI
  q5: string;                    // >=50% of revenue from sale/share
  q6: string;                    // sensitive personal information
  q7: string;                    // ADMT for significant decisions
  q9_250k: string;
  q10_spi_50k: string;
  q8a_meets_definition: string;  // Delete Act data-broker definition
  q8b_registered_cppa: string;   // registration status
}

export interface ScopeEvaluation {
  inScopeConfident: boolean;
  inScopeUnsure: boolean;
  cyberScope: string;
  riskAssessment: string;
  sensitiveResult: string;
  admtResult: string;
  brokerObligation: string;
  cyberDeadline: { label: string; needsBandConfirmation: boolean };
}

// ── Output ──────────────────────────────────────────────────────────────────

export interface ScopeParagraph {
  index: number;
  kind: ScopeParaKind;
  text: string;
}

export interface ScopeAuthority {
  pinpoint: string;
  group: "Regulations" | "Statutes" | "Guidance and Persuasive Authority";
  persuasive: boolean;
  backrefs: string[];
}

export interface ScopeDocument {
  spine_hash: string;
  stamp: string;
  paragraphs: ScopeParagraph[];
  authorities: ScopeAuthority[];
  generated_at: string;
}

const SECTIONS = {
  exec: "Executive Summary",
  nexus: "I. California Nexus",
  thresholds: "II. The Statutory Thresholds",
  obligations: "III. Processing-Specific Obligations",
  conclusion: "IV. Conclusion",
} as const;

// ── Citation ledger ─────────────────────────────────────────────────────────

class Ledger {
  private map = new Map<string, ScopeAuthority>();
  cite(pinpoint: string, section: string) {
    const group: ScopeAuthority["group"] = pinpoint.startsWith("11 CCR")
      ? "Regulations"
      : "Statutes";
    const existing = this.map.get(pinpoint);
    if (existing) {
      if (!existing.backrefs.includes(section)) existing.backrefs.push(section);
      return;
    }
    this.map.set(pinpoint, { pinpoint, group, persuasive: false, backrefs: [section] });
  }
  entries(): ScopeAuthority[] {
    const order: ScopeAuthority["group"][] = [
      "Regulations",
      "Statutes",
      "Guidance and Persuasive Authority",
    ];
    return [...this.map.values()].sort(
      (a, b) =>
        order.indexOf(a.group) - order.indexOf(b.group) ||
        a.pinpoint.localeCompare(b.pinpoint),
    );
  }
}

// ── Typed derivations ───────────────────────────────────────────────────────

type LimbState = "met" | "not_met" | "undetermined";

const CONSUMER_MET = [
  "100,000–249,999",
  "250,000–1 million",
  "100,000–1 million",
  "Over 1 million",
];

export function revenueLimb(a: ScopeAnswers): LimbState {
  if (a.q2 === "$25M–$100M") {
    if (a.q2_legacy_confirm === "AboveThreshold") return "met";
    if (a.q2_legacy_confirm === "BelowThreshold") return "not_met";
    return "undetermined";
  }
  if (!a.q2 || a.q2 === "Unsure") return "undetermined";
  if (a.q2 === "Under $26.625 million" || a.q2 === "Under $25 million") return "not_met";
  return "met";
}

export function consumerLimb(a: ScopeAnswers): LimbState {
  if (!a.q3 || a.q3 === "Unsure") return "undetermined";
  return CONSUMER_MET.includes(a.q3) ? "met" : "not_met";
}

export function saleShareLimb(a: ScopeAnswers): LimbState {
  if (a.q5 === "Yes") return "met";
  if (a.q5 === "No") return "not_met";
  return "undetermined";
}

export type ScopeState = "in_scope" | "not_in_scope" | "not_determinable";

export function scopeState(a: ScopeAnswers): {
  state: ScopeState;
  limbs: { key: "revenue" | "consumers" | "saleShare"; name: string; state: LimbState }[];
} {
  const limbs = [
    { key: "revenue" as const, name: "the annual-gross-revenue limb", state: revenueLimb(a) },
    { key: "consumers" as const, name: "the 100,000-consumer limb", state: consumerLimb(a) },
    { key: "saleShare" as const, name: "the 50-percent sale-or-share limb", state: saleShareLimb(a) },
  ];
  const nexus: LimbState = a.q1 === "Yes" ? "met" : a.q1 === "No" ? "not_met" : "undetermined";
  if (nexus === "not_met") return { state: "not_in_scope", limbs };
  if (nexus === "undetermined") return { state: "not_determinable", limbs };
  if (limbs.some((l) => l.state === "met")) return { state: "in_scope", limbs };
  if (limbs.some((l) => l.state === "undetermined")) return { state: "not_determinable", limbs };
  return { state: "not_in_scope", limbs };
}

// ── Slot renderers (¶8 and ¶11) ─────────────────────────────────────────────

const AFFIRMATION: Record<string, string> = {
  Yes: "in the affirmative",
  No: "in the negative",
  Unsure: "as unresolved",
};

function slotQ1(a: ScopeAnswers): string {
  return AFFIRMATION[a.q1] ?? "as unresolved";
}

function slotLegacyClause(a: ScopeAnswers): string {
  if (a.q2 !== "$25M–$100M") return "";
  if (a.q2_legacy_confirm === "AboveThreshold") {
    return ", having confirmed that prior-calendar-year gross revenue stood at or above the CPI-adjusted threshold of " + REG.revenue.figure;
  }
  if (a.q2_legacy_confirm === "BelowThreshold") {
    return ", having confirmed that prior-calendar-year gross revenue stood below the CPI-adjusted threshold of " + REG.revenue.figure;
  }
  return ", while leaving the CPI-adjusted revenue threshold of " + REG.revenue.figure + " unconfirmed";
}

function slotNexusPhrase(a: ScopeAnswers): string {
  if (a.q1 === "Yes") return "establish";
  if (a.q1 === "No") return "do not establish";
  return "leave open";
}

const REVENUE_PROSE: Record<string, string> = {
  "Under $26.625 million": "that prior-calendar-year gross revenue was under $26,625,000",
  "Under $25 million": "that prior-calendar-year gross revenue was under $25,000,000",
  "$26.625M–$50M": "that prior-calendar-year gross revenue was at least $26,625,000 and not more than $50 million",
  "$50M–$100M": "that prior-calendar-year gross revenue was more than $50 million and not more than $100 million",
  "$100M–$500M": "that prior-calendar-year gross revenue was more than $100 million and not more than $500 million",
  "Over $500M": "that prior-calendar-year gross revenue was more than $500 million",
  "$25M–$100M": "with a legacy band spanning $25 million to $100 million, which straddles the CPI-adjusted threshold of $26,625,000",
  Unsure: "that it is unsure of its prior-calendar-year gross revenue",
};

const CONSUMER_PROSE: Record<string, string> = {
  "Fewer than 100,000": "the company has indicated fewer than 100,000",
  "100,000–249,999": "the company has indicated at least 100,000 but fewer than 250,000",
  "250,000–1 million": "the company has indicated at least 250,000 but fewer than 1,000,000",
  "100,000–1 million": "the company has indicated at least 100,000 but fewer than 1,000,000",
  "Over 1 million": "the company has indicated more than 1,000,000",
  Unsure: "the company is unsure of the figure",
};

const SALESHARE_PROSE: Record<string, string> = {
  Yes: "the company has indicated that 50 percent or more of its annual revenue is derived from that activity",
  No: "the company has indicated that less than 50 percent of its annual revenue is derived from that activity",
  Unsure: "the company is unsure of the proportion",
};

function fillSlots(template: string, values: string[]): string {
  let i = 0;
  return template.replace(/\{[^}]*\}/g, () => values[i++] ?? "");
}

// ── Deterministic composers ─────────────────────────────────────────────────

function org(a: ScopeAnswers): string {
  return a.entity_name.trim() || "The company";
}

function metLimbNames(
  limbs: ReturnType<typeof scopeState>["limbs"],
  state: LimbState,
): string[] {
  return limbs.filter((l) => l.state === state).map((l) => l.name);
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + " and " + items[1];
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

/** ¶4 — Executive Summary determination lead. */
function leadExecutive(a: ScopeAnswers, s: ReturnType<typeof scopeState>, led: Ledger): string {
  led.cite(REG.chapeau.pinpoint, SECTIONS.exec);
  const met = metLimbNames(s.limbs, "met");
  if (s.state === "in_scope") {
    return `Under Cal. Civ. Code Section 1798.140(d)(1), ${org(a)} is a business within the scope of the CCPA, on ${joinList(met)}.`;
  }
  if (s.state === "not_in_scope") {
    return `Under Cal. Civ. Code Section 1798.140(d)(1), ${org(a)} is not a business within the scope of the CCPA on the answers given, because no statutory threshold is satisfied.`;
  }
  const open = metLimbNames(s.limbs, "undetermined");
  const openText = a.q1 !== "Yes"
    ? "the for-profit and doing-business-in-California question is itself unresolved"
    : `${joinList(open)} ${open.length === 1 ? "remains" : "remain"} unanswered`;
  return `Under Cal. Civ. Code Section 1798.140(d)(1), scope is not determinable on the answers given, because ${openText}.`;
}

/** ¶6 — deterministic composition: limbs engaged and the decisive fact for each. */
function composeExecutiveBody(a: ScopeAnswers, s: ReturnType<typeof scopeState>, led: Ledger): string {
  const out: string[] = [];
  const decisive: Record<string, { pinpoint: string; sentence: string }> = {
    revenue: {
      pinpoint: REG.revenue.pinpoint,
      sentence: `on revenue, the company has answered ${REVENUE_PROSE[a.q2] ?? "that no band has been given"} against the CPI-adjusted threshold of ${REG.revenue.figure}`,
    },
    consumers: {
      pinpoint: REG.consumers.pinpoint,
      sentence: `on consumer volume, ${CONSUMER_PROSE[a.q3] ?? "no band has been given"} against the statutory figure of ${REG.consumers.figure} consumers or households`,
    },
    saleShare: {
      pinpoint: REG.saleShare.pinpoint,
      sentence: `on revenue share, ${SALESHARE_PROSE[a.q5] ?? "no answer has been given"} against the statutory figure of ${REG.saleShare.figure}`,
    },
  };
  const engaged = s.limbs.filter((l) => l.state === "met");
  const open = s.limbs.filter((l) => l.state === "undetermined");
  if (engaged.length > 0) {
    for (const l of engaged) led.cite(decisive[l.key].pinpoint, SECTIONS.exec);
    out.push(
      `The company's answers engage ${joinList(engaged.map((l) => l.name))}: ${joinList(engaged.map((l) => decisive[l.key].sentence))}.`,
    );
  } else {
    out.push("The company's answers engage none of the three thresholds affirmatively.");
  }
  if (open.length > 0) {
    for (const l of open) led.cite(decisive[l.key].pinpoint, SECTIONS.exec);
    out.push(
      `${joinList(open.map((l) => l.name))} ${open.length === 1 ? "is" : "are"} left undetermined by the answers given, and ${open.length === 1 ? "is" : "are"} carried forward rather than assumed.`,
    );
  } else {
    out.push("No threshold is left undetermined by the answers given.");
  }
  out.push(
    s.state === "in_scope"
      ? "One satisfied threshold is sufficient; the assessment therefore proceeds on the footing that the CCPA applies."
      : s.state === "not_in_scope"
        ? "Because a single satisfied threshold would suffice, the absence of any satisfied threshold is what carries the conclusion."
        : "Because a single satisfied threshold would suffice, the outstanding answers are capable of changing the conclusion.",
  );
  return out.join(" ");
}

/** ¶10 — thresholds determination lead. */
function leadThresholds(a: ScopeAnswers, s: ReturnType<typeof scopeState>): string {
  const met = metLimbNames(s.limbs, "met");
  if (met.length > 0) {
    return `On the answers given, ${joinList(met)} ${met.length === 1 ? "is" : "are"} met.`;
  }
  const open = metLimbNames(s.limbs, "undetermined");
  if (open.length > 0) {
    return `On the answers given, no limb is met, and ${joinList(open)} ${open.length === 1 ? "remains" : "remain"} undetermined.`;
  }
  return "On the answers given, none of the three limbs is met.";
}

/** ¶12 — deterministic limb-by-limb analysis with what would settle open limbs. */
function composeThresholdBody(a: ScopeAnswers, s: ReturnType<typeof scopeState>, led: Ledger): string {
  const settle: Record<string, string> = {
    revenue: `the company's prior-calendar-year gross revenue figure, measured against ${REG.revenue.figure}`,
    consumers: `the count of California consumers or households whose personal information the company buys, sells, shares, or receives annually, measured against ${REG.consumers.figure}`,
    saleShare: `the proportion of the company's annual revenue derived from selling or sharing personal information, measured against ${REG.saleShare.figure}`,
  };
  const pin: Record<string, string> = {
    revenue: REG.revenue.pinpoint,
    consumers: REG.consumers.pinpoint,
    saleShare: REG.saleShare.pinpoint,
  };
  const label: Record<string, string> = {
    revenue: `The revenue limb, ${REG.revenue.pinpoint}`,
    consumers: `The consumer-volume limb, ${REG.consumers.pinpoint}`,
    saleShare: `The sale-or-share revenue limb, ${REG.saleShare.pinpoint}`,
  };
  const said: Record<string, string> = {
    revenue: REVENUE_PROSE[a.q2] ? `the company has answered ${REVENUE_PROSE[a.q2]}` : "the company has given no revenue band",
    consumers: CONSUMER_PROSE[a.q3] ?? "the company has given no consumer band",
    saleShare: SALESHARE_PROSE[a.q5] ?? "the company has given no answer on revenue share",
  };
  const out: string[] = [];
  for (const l of s.limbs) {
    led.cite(pin[l.key], SECTIONS.thresholds);
    if (l.state === "met") {
      out.push(`${label[l.key]}, is satisfied: ${said[l.key]}.`);
    } else if (l.state === "not_met") {
      out.push(`${label[l.key]}, is not satisfied: ${said[l.key]}.`);
    } else {
      out.push(
        `${label[l.key]}, is undetermined: ${said[l.key]}. What would settle it is ${settle[l.key]}.`,
      );
    }
  }
  return out.join(" ");
}

/** ¶14 — conditional per-obligation treatment across the five triggers. */
function composeObligations(a: ScopeAnswers, e: ScopeEvaluation, led: Ledger): string {
  const out: string[] = [];
  // {q6} — sensitive personal information.
  if (a.q6 === "Yes") {
    led.cite("Cal. Civ. Code \u00A7 1798.121", SECTIONS.obligations);
    led.cite("11 CCR \u00A7 7150(b)(2)", SECTIONS.obligations);
    out.push(
      "The company has indicated that it processes sensitive personal information, which attaches the duty to offer consumers the right to limit its use and disclosure under Cal. Civ. Code Section 1798.121, and which is a risk-assessment trigger under 11 CCR Section 7150(b)(2).",
    );
  } else if (a.q6 === "Unsure") {
    led.cite("Cal. Civ. Code \u00A7 1798.121", SECTIONS.obligations);
    out.push(
      "The company is unsure whether it processes sensitive personal information, so the right-to-limit duty under Cal. Civ. Code Section 1798.121 is neither attached nor excluded here.",
    );
  }
  // {q7} — automated decisionmaking technology.
  if (a.q7 === "Yes" || a.q7 === "In evaluation") {
    led.cite("11 CCR \u00A7 7220", SECTIONS.obligations);
    led.cite("11 CCR \u00A7 7150(b)(3)", SECTIONS.obligations);
    out.push(
      a.q7 === "Yes"
        ? "The company has indicated that it uses automated decisionmaking technology for a significant decision concerning a consumer, which attaches the pre-use notice and opt-out duties under 11 CCR Section 7220 and is a risk-assessment trigger under 11 CCR Section 7150(b)(3)."
        : "The company has indicated that use of automated decisionmaking technology for significant decisions is under evaluation, and the assessment treats that as attaching the pre-use notice and opt-out duties under 11 CCR Section 7220 rather than deferring them.",
    );
  } else if (a.q7 === "Unsure") {
    led.cite("11 CCR \u00A7 7220", SECTIONS.obligations);
    out.push(
      "The company is unsure whether it uses automated decisionmaking technology for significant decisions, so the duties under 11 CCR Section 7220 remain open.",
    );
  }
  // {q8} / {q8a} / {q8b} — data-broker activity as recorded.
  if (a.q8a_meets_definition === "Yes") {
    led.cite("Cal. Civ. Code \u00A7 1798.99.80(d)", SECTIONS.obligations);
    led.cite("Cal. Civ. Code \u00A7 1798.99.82", SECTIONS.obligations);
    if (a.q8b_registered_cppa === "Yes") {
      out.push(
        "The company has indicated that it meets the data-broker definition in Cal. Civ. Code Section 1798.99.80(d) and that it is registered with the California Privacy Protection Agency, so the annual registration duty under Cal. Civ. Code Section 1798.99.82 is presently satisfied and recurs each year.",
      );
    } else {
      out.push(
        "The company has indicated that it meets the data-broker definition in Cal. Civ. Code Section 1798.99.80(d) but has not confirmed registration with the California Privacy Protection Agency, which leaves the annual registration duty under Cal. Civ. Code Section 1798.99.82 outstanding.",
      );
    }
  } else if (a.q8a_meets_definition === "Unsure") {
    led.cite("Cal. Civ. Code \u00A7 1798.99.80(d)", SECTIONS.obligations);
    out.push(
      "The company is unsure whether it meets the data-broker definition in Cal. Civ. Code Section 1798.99.80(d), so the registration question is carried forward unresolved.",
    );
  }
  // Derived audit scope, where the answers put it beyond argument.
  if (e.cyberScope === "required") {
    led.cite("11 CCR \u00A7 7120(b)", SECTIONS.obligations);
    led.cite("11 CCR \u00A7 7121", SECTIONS.obligations);
    out.push(
      `The company's processing answers place it within the cybersecurity-audit scope of 11 CCR Section 7120(b), with the phased certification date of ${e.cyberDeadline.label} under 11 CCR Section 7121.`,
    );
  }
  if (out.length === 0) {
    return "None of the processing-specific obligations in this section attaches on the answers given: the company has not indicated sensitive-personal-information processing, automated decisionmaking for significant decisions, or data-broker activity.";
  }
  return out.join(" ");
}

/** ¶16 — conclusion determination lead, carrying any unanswered limb forward. */
function leadConclusion(a: ScopeAnswers, s: ReturnType<typeof scopeState>): string {
  const open = metLimbNames(s.limbs, "undetermined");
  const tail = open.length > 0
    ? `, with ${joinList(open)} carried forward unanswered`
    : "";
  if (s.state === "in_scope") {
    return `${org(a)} is within the scope of the CCPA${tail}.`;
  }
  if (s.state === "not_in_scope") {
    return `${org(a)} is not within the scope of the CCPA on the answers given${tail}.`;
  }
  return `Scope remains undetermined for ${org(a)}${tail || ", pending the answers identified above"}.`;
}

/** ¶17 — deterministic closing: what the conclusion obligates next. */
function composeClosing(a: ScopeAnswers, e: ScopeEvaluation, s: ReturnType<typeof scopeState>, led: Ledger): string {
  const out: string[] = [];
  if (s.state === "in_scope") {
    led.cite("Cal. Civ. Code \u00A7\u00A7 1798.100\u20131798.135", SECTIONS.conclusion);
    out.push(
      "Being within scope, the company owes the consumer-rights and notice obligations at Cal. Civ. Code Sections 1798.100 to 1798.135, and those duties run from the point at which the threshold was met rather than from the date of this assessment.",
    );
    if (e.riskAssessment === "required") {
      led.cite("11 CCR \u00A7 7150(b)", SECTIONS.conclusion);
      out.push(
        "The company's answers also trigger a risk assessment under 11 CCR Section 7150(b).",
      );
    }
    const act = e.cyberScope === "required"
      ? `commission the cybersecurity audit required by 11 CCR Section 7120(b) in time for the ${e.cyberDeadline.label} certification`
      : e.riskAssessment === "required"
        ? "complete the risk assessment triggered under 11 CCR Section 7150(b)"
        : "confirm the company's consumer-facing notices against Cal. Civ. Code Section 1798.100";
    if (e.cyberScope === "required") led.cite("11 CCR \u00A7 7120(b)", SECTIONS.conclusion);
    if (e.cyberScope !== "required" && e.riskAssessment !== "required") {
      led.cite("Cal. Civ. Code \u00A7 1798.100", SECTIONS.conclusion);
    }
    out.push(`The single next act is to ${act}.`);
    return out.join(" ");
  }
  if (s.state === "not_in_scope") {
    led.cite(REG.chapeau.pinpoint, SECTIONS.conclusion);
    out.push(
      "Because no threshold in Cal. Civ. Code Section 1798.140(d)(1) is satisfied, no CCPA business obligation attaches at present, and the position is one the company should re-test whenever its revenue, consumer volume, or sale-and-share practices change.",
    );
    out.push(
      "The single next act is to diarise a re-test of the three thresholds at the close of the current financial year.",
    );
    return out.join(" ");
  }
  const open = metLimbNames(s.limbs, "undetermined");
  led.cite(REG.chapeau.pinpoint, SECTIONS.conclusion);
  out.push(
    `Because ${open.length > 0 ? joinList(open) : "the nexus question"} ${open.length === 1 || open.length === 0 ? "remains" : "remain"} unanswered, the company should not treat this assessment as a finding either way, and should resolve the outstanding figure before deciding how to act.`,
  );
  out.push(
    `The single next act is to obtain ${open.length > 0 ? "the figure behind " + joinList(open) : "a determination on whether the company operates for profit and does business in California"} and re-run this screening.`,
  );
  return out.join(" ");
}

// ── Assembly ────────────────────────────────────────────────────────────────

export function renderScopeDocument(
  answers: ScopeAnswers,
  evaluation: ScopeEvaluation,
  opts?: { generatedAt?: string },
): ScopeDocument {
  const led = new Ledger();
  const s = scopeState(answers);
  const paragraphs: ScopeParagraph[] = [];

  const push = (index: number, text: string) => {
    paragraphs.push({ index, kind: SCOPE_PARA_KINDS[index], text });
  };

  push(0, SCOPE_SPINE[0]);
  push(1, SCOPE_SPINE[1]);
  // ¶2 register guide is an encode-time instruction and does not emit.
  push(3, SCOPE_SPINE[3]);
  push(4, leadExecutive(answers, s, led));
  push(5, SCOPE_SPINE[5]);
  push(6, composeExecutiveBody(answers, s, led));
  push(7, SCOPE_SPINE[7]);
  push(
    8,
    fillSlots(SCOPE_SPINE[8], [
      slotQ1(answers),
      slotQ1(answers),
      slotLegacyClause(answers),
      slotNexusPhrase(answers),
    ]),
  );
  push(9, SCOPE_SPINE[9]);
  push(10, leadThresholds(answers, s));
  push(
    11,
    fillSlots(SCOPE_SPINE[11], [
      REVENUE_PROSE[answers.q2] ?? "no band",
      CONSUMER_PROSE[answers.q3] ?? "the company has given no band",
      SALESHARE_PROSE[answers.q5] ?? "the company has given no answer",
    ]),
  );
  push(12, composeThresholdBody(answers, s, led));
  push(13, SCOPE_SPINE[13]);
  push(14, composeObligations(answers, evaluation, led));
  push(15, SCOPE_SPINE[15]);
  push(16, leadConclusion(answers, s));
  push(17, composeClosing(answers, evaluation, s, led));
  push(18, SCOPE_SPINE[18]);
  // ¶19 assembly rule does not emit; the authorities list below replaces it.

  return {
    spine_hash: SCOPE_SPINE_SHA256,
    stamp: SCOPE_PIPELINE_STAMP,
    paragraphs,
    authorities: led.entries(),
    generated_at: opts?.generatedAt ?? new Date().toISOString(),
  };
}

/** Register lint: banned phrase family and self-narration guards. */
export const SCOPE_BANNED_PHRASES = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record establishes",
  "this record",
  "as an AI",
  "I will now",
];

export function lintScopeDocument(doc: ScopeDocument): string[] {
  const findings: string[] = [];
  for (const p of doc.paragraphs) {
    const lower = p.text.toLowerCase();
    for (const banned of SCOPE_BANNED_PHRASES) {
      if (lower.includes(banned)) findings.push(`P${p.index}: banned phrase "${banned}"`);
    }
    if (p.kind !== "guide" && /\{[^}]*\}/.test(p.text)) {
      findings.push(`P${p.index}: unfilled slot token`);
    }
    if (/\[(GENERATED|DETERMINATION LEAD|CONDITIONAL)\]/.test(p.text)) {
      findings.push(`P${p.index}: uncomposed skeleton marker`);
    }
    if (p.text.includes("?")) findings.push(`P${p.index}: rhetorical question`);
  }
  return findings;
}
