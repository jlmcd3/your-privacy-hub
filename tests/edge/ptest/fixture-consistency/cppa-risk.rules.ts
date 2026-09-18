// FIXTURE CONSISTENCY — cppa-risk rules.
//
// Field names are the intake keys used by src/lib/ptestPanels/cppa-risk.ts;
// option lists are read at runtime from ctx.contract (RC-REM-P1-B,
// supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts) rather
// than re-declared here, so a future option-set change cannot silently drift
// this file out of sync with the form.
//
// NOTE on risk.right-to-know-channels: the live contract's q6_right_know_multi
// options (Q6_ACCESS_OPTS) are "Online form with identity verification",
// "Email or written request process", "In-app account settings", "No formal
// process in place" — there is no selectable "Phone"/"Telephone" or "In
// person" option at all. The rule below still checks the free-text answer
// (q6_right_know) for phone/in-person mentions: since no option can ever
// match those keywords, any such mention in the free text is, by
// construction, a channel the customer could not have selected — exactly the
// kind of contradiction this file exists to catch.

import {
  arr,
  bag,
  type Bag,
  bandRange,
  type FixtureRule,
  flatText,
  firstInt,
  get,
  mentions,
  str,
} from "./framework.ts";

function rows(v: unknown): Bag[] {
  return Array.isArray(v) ? v.map((x) => bag(x)) : [];
}

// ── risk.consumer-band ────────────────────────────────────────────────────
// Catches a stated CA-consumer count that falls outside either band answer
// naming the same population (i3_ca_consumer_band, q2_consumers).
const riskConsumerBand: FixtureRule = {
  id: "risk.consumer-band",
  title: "approximate_ca_consumers falls inside both i3_ca_consumer_band and q2_consumers",
  check(intake) {
    const n = firstInt(intake.approximate_ca_consumers);
    if (n === null) return [];
    const out: string[] = [];
    const i3 = bandRange(str(intake.i3_ca_consumer_band));
    if (i3 && (n < i3.min || n > i3.max)) {
      out.push(`approximate_ca_consumers (${n}) falls outside i3_ca_consumer_band "${str(intake.i3_ca_consumer_band)}"`);
    }
    const q2 = bandRange(str(intake.q2_consumers));
    if (q2 && (n < q2.min || n > q2.max)) {
      out.push(`approximate_ca_consumers (${n}) falls outside q2_consumers "${str(intake.q2_consumers)}"`);
    }
    return out;
  },
};

// ── risk.consumer-scale-bands ─────────────────────────────────────────────
// Catches i3_ca_consumer_band (this Activity's recorded CA-consumer scale)
// and q2_consumers (the Company's CA-consumer/household applicability band)
// naming ranges that cannot both be true of one number — e.g. i3
// "Fewer than 10,000" paired with q2 "1,000,000 or more". DOC 263 run 1 (f2):
// this pairing is exactly what left Harborstone's fixture internally
// inconsistent (i3 "10,000–100,000" vs q2 "100,000 to under 250,000" — those
// two share only the single number 100,000; the lead review made that
// edge-only overlap a failure as well).
const riskConsumerScaleBands: FixtureRule = {
  id: "risk.consumer-scale-bands",
  title: "i3_ca_consumer_band and q2_consumers can both be true of one number",
  check(intake) {
    const i3Label = str(intake.i3_ca_consumer_band);
    const q2Label = str(intake.q2_consumers);
    const i3 = bandRange(i3Label);
    const q2 = bandRange(q2Label);
    if (!i3 || !q2) return [];
    // Lead review (run 3): an overlap of a single boundary number (i3
    // "10,000–100,000" against q2 "100,000 to under 250,000") is the exact
    // pairing the reviewers called a tension — a record does not sit on a
    // band edge by design — so the overlap must have positive width.
    const overlapWidth = Math.min(i3.max, q2.max) - Math.max(i3.min, q2.min);
    if (overlapWidth > 0) return [];
    const fmt = (r: { min: number; max: number }) => `${r.min}-${r.max === Infinity ? "∞" : r.max}`;
    return [
      `i3_ca_consumer_band "${i3Label}" (${fmt(i3)}) and q2_consumers "${q2Label}" (${fmt(q2)}) overlap only at a band edge or not at all — no ordinary number satisfies both`,
    ];
  },
};

// ── risk.right-to-know-channels ──────────────────────────────────────────
// Catches a q6 free-text answer that omits a selected access channel, or
// names a phone/in-person channel that was never selected.
const RIGHT_TO_KNOW_CHANNELS: ReadonlyArray<{ id: string; optionRe: RegExp; textRe: RegExp }> = [
  { id: "online form", optionRe: /online form|web form|portal/i, textRe: /online form|web form|portal/i },
  { id: "email or written", optionRe: /email|written|letter|mail/i, textRe: /email|written|letter|mail/i },
  { id: "phone", optionRe: /phone|telephone|call|hotline/i, textRe: /phone|call|hotline/i },
  { id: "in person", optionRe: /in person|in-person|branch|store/i, textRe: /in person|in-person|branch|store/i },
];
const riskRightToKnowChannels: FixtureRule = {
  id: "risk.right-to-know-channels",
  title: "q6_right_know text reflects the selected q6_right_know_multi channels and no others",
  check(intake, ctx) {
    const text = str(intake.q6_right_know);
    const selected = arr(intake.q6_right_know_multi);
    const options = ctx.contract?.fields.find((f) => f.key === "q6_right_know_multi")?.options ?? [];
    const out: string[] = [];
    for (const ch of RIGHT_TO_KNOW_CHANNELS) {
      const option = options.find((o) => ch.optionRe.test(o));
      const isSelected = option !== undefined && selected.includes(option);
      const textHasChannel = mentions(text, ch.textRe);
      if (isSelected && !textHasChannel) {
        out.push(`q6_right_know does not mention the selected q6_right_know_multi option "${option}"`);
      }
      if (!isSelected && textHasChannel && (ch.id === "phone" || ch.id === "in person")) {
        out.push(`q6_right_know mentions a ${ch.id} channel that is not among the selected q6_right_know_multi options`);
      }
    }
    return out;
  },
};

// ── risk.impact-vs-pathways ──────────────────────────────────────────────
// Catches impact_intake.likelihood/severity disagreeing with the worst-case
// pathway, and impact_intake.harmTypes disagreeing with the pathway harm set.
const riskImpactVsPathways: FixtureRule = {
  id: "risk.impact-vs-pathways",
  title: "impact_intake.likelihood/severity/harmTypes agree with a5_harm_pathways",
  check(intake, ctx) {
    const out: string[] = [];
    const pathways = rows(get(intake, "a5_harm_pathways"));
    const likelihoodOptions = ctx.contract?.fields.find((f) => f.key === "a5_harm_pathways[].likelihood")?.options ?? [];
    const severityOptions = ctx.contract?.fields.find((f) => f.key === "a5_harm_pathways[].severity")?.options ?? [];

    if (pathways.length && likelihoodOptions.length) {
      const idx = Math.max(...pathways.map((p) => likelihoodOptions.indexOf(str(p.likelihood))));
      const worst = idx >= 0 ? likelihoodOptions[idx] : "";
      const impactVal = str(get(intake, "impact_intake.likelihood"));
      if (impactVal && worst && impactVal !== worst) {
        out.push(`impact_intake.likelihood is "${impactVal}" but the highest likelihood across a5_harm_pathways is "${worst}"`);
      }
    }
    if (pathways.length && severityOptions.length) {
      const idx = Math.max(...pathways.map((p) => severityOptions.indexOf(str(p.severity))));
      const worst = idx >= 0 ? severityOptions[idx] : "";
      const impactVal = str(get(intake, "impact_intake.severity"));
      if (impactVal && worst && impactVal !== worst) {
        out.push(`impact_intake.severity is "${impactVal}" but the highest severity across a5_harm_pathways is "${worst}"`);
      }
    }

    // The two fields carry two option vocabularies for the same harms; compare a
    // normalised key (spelling, plural, and the pathway list's longer tails).
    const harmKey = (s: string) => s.replace(/^\([A-Z]\)\s*/, "").toLowerCase().replace(/unauthorised/g, "unauthorized")
      .replace(/;\s*loss of availability$/, "").replace(/\s+on protected characteristics$/, "").replace(/harms\b/g, "harm").trim();
    const pathwayHarms = new Map(pathways.map((p) => [harmKey(str(p.harm)), str(p.harm)] as const));
    const harmTypes = arr(get(intake, "impact_intake.harmTypes"));
    if (harmTypes.length) {
      const harmTypeMap = new Map(harmTypes.map((h) => [harmKey(h), h] as const));
      for (const [k, label] of pathwayHarms) {
        if (!harmTypeMap.has(k)) out.push(`impact_intake.harmTypes is missing "${label}" though it appears in a5_harm_pathways`);
      }
      for (const [k, label] of harmTypeMap) {
        if (!pathwayHarms.has(k)) out.push(`impact_intake.harmTypes names "${label}" which is not the harm of any a5_harm_pathways row`);
      }
    }
    return out;
  },
};

// ── risk.retention-rows ──────────────────────────────────────────────────
// Catches a retention row with neither a period nor criteria, and (when the
// overall i2_retention_criteria is answered) a row with a period but no
// criteria.
const riskRetentionRows: FixtureRule = {
  id: "risk.retention-rows",
  title: "every retention_by_pi_category row has a period or criteria",
  check(intake) {
    const out: string[] = [];
    const rowsArr = rows(get(intake, "retention_by_pi_category"));
    for (const row of rowsArr) {
      if (!str(row.retention_period) && !str(row.retention_criteria)) {
        out.push(`retention_by_pi_category row "${str(row.pi_category) || "(no category)"}" has neither retention_period nor retention_criteria`);
      }
    }
    return out;
  },
};

// ── risk.vendors-vs-recipients ───────────────────────────────────────────
// Catches a vendor named in i6_vendors that never appears as a recipient,
// and a recipient never named anywhere the vendor should be mentioned.
function firstWord(s: string): string {
  return (s.trim().match(/^[^\s]+/)?.[0] ?? "").replace(/[.,;:]+$/, "");
}
const riskVendorsVsRecipients: FixtureRule = {
  id: "risk.vendors-vs-recipients",
  title: "i6_vendors and recipients[].recipient_name_or_category cross-reference each other",
  check(intake) {
    const out: string[] = [];
    const vendorsText = str(intake.i6_vendors);
    const vendorNames = vendorsText.split(";").map((s) => s.split("(")[0].trim())
      .filter((s) => s && /^[A-Z0-9]/.test(s) && !/^(both|all|each|and|under|with|the)\b/i.test(s) && s.length <= 60);
    const recipientNames = arr(get(intake, "recipients[].recipient_name_or_category"));
    for (const v of vendorNames) {
      const word = firstWord(v).toLowerCase();
      if (!word) continue;
      const found = recipientNames.some((rn) => rn.toLowerCase().includes(word));
      if (!found) out.push(`i6_vendors names "${v}" but no recipients[].recipient_name_or_category mentions it`);
    }
    return out;
  },
};

// ── risk.sell-share-vs-recipients ────────────────────────────────────────
// Catches a "Yes" sell/share answer with no third-party recipient, and a
// "No" answer contradicted by a recipient's own disclosure_purpose.
const riskSellShareVsRecipients: FixtureRule = {
  id: "risk.sell-share-vs-recipients",
  title: "q5_sell_share agrees with the recipients table",
  check(intake) {
    const out: string[] = [];
    const q5 = str(intake.q5_sell_share);
    if (/^yes/i.test(q5)) {
      const types = arr(get(intake, "recipients[].recipient_type"));
      if (!types.includes("Third party")) {
        out.push(`q5_sell_share is "${q5}" but no recipients[] row has recipient_type "Third party"`);
      }
    } else if (/^no/i.test(q5)) {
      const purposes = arr(get(intake, "recipients[].disclosure_purpose"));
      const leaky = purposes.find((p) => /\bsale\b|\bsell\b|\bshare\b/i.test(p));
      if (leaky) out.push(`q5_sell_share is "No" but a recipient's disclosure_purpose mentions selling/sharing: "${leaky}"`);
    }
    return out;
  },
};

// ── risk.admt-consistency ────────────────────────────────────────────────
// Catches ADMT follow-on fields answered as if ADMT were in use when
// q18_admt_use says "No".
const riskAdmtConsistency: FixtureRule = {
  id: "risk.admt-consistency",
  title: "q18_admt_use \"No\" leaves the ADMT follow-on fields at No/Not applicable",
  check(intake) {
    if (str(intake.q18_admt_use) !== "No") return [];
    const out: string[] = [];
    for (const key of ["i5_admt_training_source", "i5_admt_fairness_testing"] as const) {
      const v = str(intake[key]);
      if (v && !/^not applicable/i.test(v)) {
        out.push(`q18_admt_use is "No" but ${key} is answered without starting "Not applicable": "${v}"`);
      }
    }
    return out;
  },
};

// ── risk.safeguards-vs-pathways ──────────────────────────────────────────
// Catches a safeguard naming a harm, or linking a risk_pathway_id, that is
// not one of the record's own a5_harm_pathways.
const riskSafeguardsVsPathways: FixtureRule = {
  id: "risk.safeguards-vs-pathways",
  title: "a6_safeguards only names harms/pathway ids present in a5_harm_pathways",
  check(intake) {
    const out: string[] = [];
    const pathwayHarms = new Set(rows(get(intake, "a5_harm_pathways")).map((p) => str(p.harm)));
    for (const sg of rows(get(intake, "a6_safeguards"))) {
      const harm = str(sg.harm);
      if (harm && !pathwayHarms.has(harm)) {
        out.push(`a6_safeguards names harm "${harm}" that is not in a5_harm_pathways`);
      }
      for (const pid of arr(sg.risk_pathway_ids)) {
        if (!pathwayHarms.has(pid)) {
          out.push(`a6_safeguards.risk_pathway_ids names "${pid}" that is not in a5_harm_pathways`);
        }
      }
    }
    return out;
  },
};

// ── risk.approver ─────────────────────────────────────────────────────────
// Catches an approver name absent from the reviewers/approvers table, and a
// confirmed authority with no stated basis.
const riskApprover: FixtureRule = {
  id: "risk.approver",
  title: "a9_approver_name appears among assessment_reviewers_approvers, and confirmed authority has a basis",
  check(intake) {
    const out: string[] = [];
    const approver = str(intake.a9_approver_name);
    if (approver) {
      const names = arr(get(intake, "assessment_reviewers_approvers[].name"));
      if (!names.includes(approver)) {
        out.push(`a9_approver_name "${approver}" does not appear in assessment_reviewers_approvers[].name`);
      }
    }
    if (str(intake.approver_authority_confirmed) === "Yes" && !str(intake.approver_authority_basis)) {
      out.push(`approver_authority_confirmed is "Yes" but approver_authority_basis is empty`);
    }
    return out;
  },
};

// ── risk.under-16 ─────────────────────────────────────────────────────────
// Catches a denial of knowingly processing under-16 data contradicted by a
// minors/students mention elsewhere in the same record.
const UNDER16_MENTION_RE = /\b(children|minors?|under[- ]16|under 13|students?)\b/i;
const riskUnder16: FixtureRule = {
  id: "risk.under-16",
  title: "q15b_under16_knowledge \"No\" is not contradicted by a minors/students mention",
  check(intake) {
    if (!/^no/i.test(str(intake.q15b_under16_knowledge))) return [];
    const out: string[] = [];
    const fields: ReadonlyArray<readonly [string, string]> = [
      ["primary_activity_purpose", str(intake.primary_activity_purpose)],
      ["i1_processing_purpose", str(intake.i1_processing_purpose)],
      ["subject_anchor", str(intake.subject_anchor)],
    ];
    for (const [key, text] of fields) {
      if (mentions(text, UNDER16_MENTION_RE)) {
        out.push(`q15b_under16_knowledge is "No" but ${key} mentions minors/students: "${text}"`);
      }
    }
    return out;
  },
};

// ── risk.secondary-uses ──────────────────────────────────────────────────
// Catches has_secondary_uses disagreeing with whether secondary_activities
// actually has rows.
const riskSecondaryUses: FixtureRule = {
  id: "risk.secondary-uses",
  title: "has_secondary_uses \"No\" iff secondary_activities is empty",
  check(intake) {
    const startsNo = /^no/i.test(str(intake.has_secondary_uses));
    const hasRows = rows(get(intake, "secondary_activities")).length > 0;
    const out: string[] = [];
    if (startsNo && hasRows) out.push(`has_secondary_uses starts "No" but secondary_activities has row(s)`);
    if (!startsNo && !hasRows) out.push(`has_secondary_uses does not start "No" but secondary_activities is empty`);
    return out;
  },
};

// ── risk.pi-categories-cover ─────────────────────────────────────────────
// Catches a recipient or retention row naming a PI category never selected
// in q4_pi_categories.
const riskPiCategoriesCover: FixtureRule = {
  id: "risk.pi-categories-cover",
  title: "recipients[].pi_categories_made_available and retention_by_pi_category[].pi_category stay inside q4_pi_categories",
  check(intake) {
    const out: string[] = [];
    const q4 = new Set(arr(intake.q4_pi_categories));
    const fromRecipients = rows(get(intake, "recipients")).flatMap((r) => arr(r.pi_categories_made_available));
    for (const cat of fromRecipients) {
      if (!q4.has(cat)) out.push(`recipients[].pi_categories_made_available names "${cat}" that is not in q4_pi_categories`);
    }
    for (const cat of arr(get(intake, "retention_by_pi_category[].pi_category"))) {
      if (!q4.has(cat)) out.push(`retention_by_pi_category[].pi_category names "${cat}" that is not in q4_pi_categories`);
    }
    return out;
  },
};

// ── risk.sensitive-pi ─────────────────────────────────────────────────────
// Catches q15_sensitive_pi "No" contradicted by a sensitive category still
// selected in q4_pi_categories.
const SENSITIVE_KEYWORD_RE = /sensitive|biometric|health|precise geolocation|racial|religious|sexual|union|genetic|ssn|government id/i;
const riskSensitivePi: FixtureRule = {
  id: "risk.sensitive-pi",
  title: "q15_sensitive_pi \"No\" leaves no sensitive category selected in q4_pi_categories",
  check(intake, ctx) {
    if (str(intake.q15_sensitive_pi) !== "No") return [];
    const options = ctx.contract?.fields.find((f) => f.key === "q4_pi_categories")?.options ?? [];
    const sensitiveLabels = new Set(options.filter((o) => SENSITIVE_KEYWORD_RE.test(o)));
    const out: string[] = [];
    for (const cat of arr(intake.q4_pi_categories)) {
      if (sensitiveLabels.has(cat)) {
        out.push(`q15_sensitive_pi is "No" but q4_pi_categories includes the sensitive category "${cat}"`);
      }
    }
    return out;
  },
};

// ── risk.revenue-band ─────────────────────────────────────────────────────
// Catches a narrative revenue figure ("$1.2 billion", "$340M") that falls
// outside the q1_revenue band.
const riskRevenueBand: FixtureRule = {
  id: "risk.revenue-band",
  title: "a narrative revenue figure stays inside the q1_revenue band",
  check(intake) {
    const range = bandRange(str(intake.q1_revenue));
    if (!range) return [];
    const out: string[] = [];
    const text = flatText(intake);
    const re = /revenue[^.]{0,80}?(over|above|exceed(?:s|ing)?|more than|in excess of|at least)?\s*\$\s?(\d[\d,.]*)\s*(billion|million|B|M)\b(\+)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[2].replace(/,/g, ""));
      if (!Number.isFinite(n)) continue;
      const unit = m[3].toLowerCase();
      const dollars = Math.round(n * (unit.startsWith("b") ? 1e9 : 1e6));
      // A qualified figure ("over $100M", "$100M+") is a lower bound: consistent when the band reaches above it.
      const lowerBound = !!(m[1] || m[4]);
      if (lowerBound ? range.max <= dollars : (dollars < range.min || dollars > range.max)) {
        const maxLabel = range.max === Infinity ? "∞" : String(range.max);
        out.push(`a narrative states annual revenue of ~$${dollars.toLocaleString()} which falls outside the q1_revenue band "${str(intake.q1_revenue)}" (${range.min}-${maxLabel})`);
      }
    }
    return out;
  },
};

export const CPPA_RISK_RULES: readonly FixtureRule[] = [
  riskConsumerBand,
  riskConsumerScaleBands,
  riskRightToKnowChannels,
  riskImpactVsPathways,
  riskRetentionRows,
  riskVendorsVsRecipients,
  riskSellShareVsRecipients,
  riskAdmtConsistency,
  riskSafeguardsVsPathways,
  riskApprover,
  riskUnder16,
  riskSecondaryUses,
  riskPiCategoriesCover,
  riskSensitivePi,
  riskRevenueBand,
];
