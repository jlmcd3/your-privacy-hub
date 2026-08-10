// ITEM SO-3 WIRE-IN — GOVERNANCE: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// SO-3 step 3 (RENDERERS) requires the LIVE customer document to be assembled
// through `plans/governance.spine.ts`. This module is that assembly, and what
// it produces is what ships: the result is written to
// `report_data.skeleton_document`, `generate-report-pdf` renders the customer
// PDF from it, and `GovernanceAssessmentResult.tsx` renders the in-app document
// body from it with the legacy narrative suppressed.
//
// It is DETERMINISTIC and invents no prose. Every {slot} is filled from the
// live intake per `governance.slotmap.ts`; every [DETERMINATION LEAD] and
// [GENERATED] block is composed from the typed surfaces the governance
// pipeline already persists. The executive-summary lead binds to
// `readiness_determination.rating` — the 403-A one-voice law — and no lead may
// characterise the programme more favourably than its determination.
//
// ATTRIBUTION RULE: the company's facts are attributed to the company. The v3
// banned register ("the record shows" family, "on this record") is rewritten
// deterministically on the way in; the underlying typed surfaces are NOT
// mutated.

import {
  GOVERNANCE_SKELETON_SECTIONS,
  GOVERNANCE_SKELETON_TITLE,
  GOVERNANCE_SKELETON_SUBTITLE,
  GOVERNANCE_SKELETON_VERSION,
  GOVERNANCE_V3_BANNED_REGISTER,
} from "../prose/plans/governance.spine.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../prose/skeleton-render.ts";

export const GOVERNANCE_SKELETON_ASSEMBLER_STAMP =
  "governance-skeleton-assembler@so3-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
const isNA = (v: string) => !v || /^(n\/a|not applicable|unknown)$/i.test(v);

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function lower(v: string): string {
  return v ? v.charAt(0).toLowerCase() + v.slice(1) : v;
}

/** Deterministic register repair — the attribution voice is law (v3 bans). */
export function repairRegister(text: string): string {
  let out = text;
  out = out.replace(/\bOn this record\b/g, "On the company's answers");
  out = out.replace(/\bon this record\b/g, "on the company's answers");
  out = out.replace(/\bThe record shows\b/g, "The company has indicated");
  out = out.replace(/\bthe record shows\b/g, "the company has indicated");
  out = out.replace(/\bThe record (reflects|indicates|demonstrates|establishes)\b/g, "The company has indicated");
  out = out.replace(/\bthe record (reflects|indicates|demonstrates|establishes)\b/g, "the company has indicated");
  out = out.replace(/\bThe record evidences\b/g, "The company's answers evidence");
  out = out.replace(/\bthe record evidences\b/g, "the company's answers evidence");
  out = out.replace(/\bThe record answers\b/g, "The company has answered");
  out = out.replace(/\bthe record answers\b/g, "the company has answered");
  out = out.replace(/\bThe record states\b/g, "The company has stated");
  out = out.replace(/\bthe record states\b/g, "the company has stated");
  out = out.replace(/\bThe record describes\b/g, "The company has described");
  out = out.replace(/\bthe record describes\b/g, "the company has described");
  out = out.replace(/\bAs the record makes clear,?\s*/g, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

// Abbreviations whose trailing period is NOT a sentence boundary. Without this
// guard, "(GDPR Art. 5(2))" truncates the sentence at "Art." (SO-3 r2 defect).
const ABBREV_TAIL =
  /(?:\b(?:Art|Arts|Artt|No|Nos|Reg|Sched|Sec|Secs|Ch|Cl|para|paras|pp|cf|Cal|Civ|Code|Inc|Ltd|Co|Corp|plc|Nr|vs|v|e\.g|i\.e|etc|approx|Dr|Mr|Mrs|Ms|St|U\.S|U\.K|Ass'n)|\s[A-Z])\.$/;

function firstSentence(text: string): string {
  const t = text.trim();
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + 1;
    const head = t.slice(0, end);
    if (ABBREV_TAIL.test(head)) continue;
    // A period immediately followed by a lowercase word or digit is not a stop.
    if (/^\s+[a-z0-9]/.test(t.slice(end))) continue;
    return head.trim();
  }
  return t;
}


function afterFirstSentence(text: string): string {
  const first = firstSentence(text);
  return text.trim().slice(first.length).trim();
}

// ── Reader-label maps (skeleton rendering rules) ────────────────────────────

const DPO_PHRASES: Record<string, string> = {
  "Yes, formal DPO": "that it has formally designated a data protection officer",
  "Yes, informal privacy lead": "that it has an informal privacy lead rather than a formally designated officer",
  "No": "that it has not designated a data protection officer",
  "Unsure": "that it is unsure whether a data protection officer has been designated",
};

const PRIVACY_POLICY_PHRASES: Record<string, string> = {
  "Yes, current (reviewed in last 12 months)": "a current privacy notice, reviewed within the last twelve months",
  "Yes, but outdated": "a privacy notice it describes as outdated",
  "No": "that it has no privacy notice",
  "Unsure": "that it is unsure of its privacy notice position",
};

const TRAINING_PHRASES: Record<string, string> = {
  "Yes, formal onboarding + annual refresh": "formal training at onboarding with an annual refresher",
  "Yes, onboarding only": "training at onboarding only",
  "Ad hoc only": "ad hoc training only",
  "No formal training": "no formal training",
};

const TOOL_INSTRUCTION_PHRASES: Record<string, string> = {
  "Yes, written policy with specific prohibitions": "a written policy with specific prohibitions",
  "Yes, general guidance only": "general written guidance only",
  "Verbal guidance only": "verbal guidance only",
  "No instruction provided": "that no instruction has been provided",
};

const DPA_STATUS_PHRASES: Record<string, string> = {
  "Yes, all vendors": "that processor contracts are in place with all of its vendors",
  "Yes, most vendors": "that processor contracts are in place with most of its vendors",
  "Most vendors": "that processor contracts are in place with most of its vendors",
  "Some vendors": "that processor contracts are in place with some of its vendors",
  "No": "that it has no processor contracts in place",
  "Unsure": "that it is unsure whether processor contracts are in place",
};

const DPA_VERIFIED_PHRASES: Record<string, string> = {
  "Yes — verified": "the company has answered that those terms have been verified",
  "Partially": "the company has answered that verification is partial",
  "Not verified": "the company has answered that they have not been verified",
  "Unsure": "the company has answered that it is unsure whether they have been verified",
};

const TRANSFER_PHRASES: Record<string, string> = {
  "Yes, US-based tools": "that it transfers personal data to US-based tools",
  "Yes, other non-adequate countries": "that it transfers personal data to countries without an adequacy decision",
  "All tools store data in EU/UK": "that all of its tools store data in the EU or the UK",
  "No transfers": "that it makes no transfers outside the EU or the UK",
  "Unsure": "that it is unsure whether transfers outside the EU or the UK occur",
};

const ORG_SIZE_PROSE: Record<string, string> = {
  "1-10": "1 to 10 people",
  "11-50": "11 to 50 people",
  "51-250": "51 to 250 people",
  "251-1000": "251 to 1,000 people",
  "1000+": "more than 1,000 people",
};

function labelled(map: Record<string, string>, value: string): string | null {
  if (isNA(value)) return null;
  return map[value] ?? lower(value);
}

const TRANSFERS_OCCUR = /^(Yes|Unsure)/i;

function technicalControlsSentence(intake: Bag): string {
  const status = s(intake.technical_controls);
  const list = arr(intake.technical_controls_list);
  const through = list.length ? `, through ${asProse(list.map(lower))}` : "";
  if (/^Yes/i.test(status)) {
    return `The company has indicated that technical controls are actively enforced${through}`;
  }
  if (/^Partial/i.test(status)) {
    return `The company has indicated that technical controls are in place for some tools or categories${through}`;
  }
  if (/^No/i.test(status)) {
    return "The company has indicated that it relies on policy and training alone, with no technical controls in place";
  }
  return "The company has not stated whether technical controls are in place; that element is unanswered rather than assumed";
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildGovernanceSlotValues(intake: Bag): SlotValues {
  const org = s(intake.organization_name) || "the company";
  const tools = arr(intake.tools);
  const other = tools.find((t) => /^Other\s*:/i.test(t));
  const namedTools = tools.filter((t) => t !== other);
  const specialList = arr(intake.special_categories_list);
  const transferStatus = s(intake.transfer_status);
  const mechanism = s(intake.transfer_mechanism);
  const euUk = s(intake.eu_uk_data);
  const policy = s(intake.privacy_policy);
  const coverage = s(intake.privacy_notice_coverage);
  const aiCoverage = s(intake.training_ai_coverage);
  const context = s(intake.additional_context);

  const transferClause = TRANSFERS_OCCUR.test(transferStatus)
    ? (isNA(mechanism) || /^none/i.test(mechanism)
      ? ", without the company having recorded the Chapter V mechanism it relies on"
      : `, relying on ${mechanism}`)
    : "";

  return {
    organizationName: org,

    sector: labelled({}, s(intake.sector)) ?? s(intake.sector),
    orgSize: ORG_SIZE_PROSE[s(intake.org_size)] ?? s(intake.org_size),
    jurisdictions: asProse(arr(intake.jurisdictions)) || null,
    EU_UK_SENTENCE: isNA(euUk)
      ? null
      : /^Yes/i.test(euUk)
      ? `${org} has indicated that it processes the personal data of individuals in the EU or the UK`
      : `${org} has indicated that it does not process the personal data of individuals in the EU or the UK`,
    dataCategories: asProse(arr(intake.data_categories).map(lower)) || null,
    SPECIAL_CATEGORY_CLAUSE: /^Yes/i.test(s(intake.special_category)) && specialList.length
      ? `, including the special categories ${asProse(specialList.map(lower))}, which engage Article 9`
      : "",

    DPO_PHRASE: labelled(DPO_PHRASES, s(intake.dpo_status)),
    PRIVACY_POLICY_PHRASE: labelled(PRIVACY_POLICY_PHRASES, policy),
    privacyNoticeCoverage: isNA(coverage)
      ? (/^No\b/i.test(policy)
        ? "not applicable, since the company reports no privacy notice"
        : "not stated in its answers")
      : lower(coverage),

    TRAINING_PHRASE: labelled(TRAINING_PHRASES, s(intake.training_status)),
    TRAINING_AI_CLAUSE: isNA(aiCoverage) ? "" : `, with coverage of AI tools recorded as ${lower(aiCoverage)}`,
    tools: namedTools.length ? asProse(namedTools) : "none that its answers record",
    OTHER_TOOL_CLAUSE: other ? `, together with ${other.replace(/^Other\s*:\s*/i, "")}` : "",
    TOOL_INSTRUCTION_PHRASE: labelled(TOOL_INSTRUCTION_PHRASES, s(intake.tool_instruction)),
    TECHNICAL_CONTROLS_SENTENCE: technicalControlsSentence(intake),

    DPA_STATUS_PHRASE: labelled(DPA_STATUS_PHRASES, s(intake.dpa_status)),
    DPA_VERIFIED_PHRASE: labelled(DPA_VERIFIED_PHRASES, s(intake.dpa_art28_verified)),
    TRANSFER_PHRASE: labelled(TRANSFER_PHRASES, transferStatus),
    TRANSFER_MECHANISM_CLAUSE: transferClause,

    additionalContext: context,
  };
}

// ── Composed blocks ─────────────────────────────────────────────────────────

const RATING_PHRASE: Record<string, string> = {
  "Evidenced": "accountability is evidenced on the answers the company has given",
  "Partly evidenced": "accountability is partly evidenced on the answers the company has given",
  "Not evidenced": "accountability is not evidenced on the answers the company has given",
  "Not yet determinable": "accountability is not yet determinable on the answers the company has given",
};

const VERDICT_PHRASE: Record<string, string> = {
  satisfied: "stands on the company's answers",
  partially_satisfied: "stands only in part on the company's answers",
  not_satisfied: "does not stand on the company's answers",
  not_determinable: "cannot be determined on the company's answers",
  information_needed: "cannot be determined on the company's answers",
};

function ratingLead(report: Bag, org: string): string {
  const rd = (report.readiness_determination ?? {}) as Bag;
  const rating = s(rd.rating);
  const phrase = RATING_PHRASE[rating] ?? "accountability is not yet determinable on the answers the company has given";
  // Org names are proper nouns — never case-fold them (SO-3 r2 defect).
  return `Assessed against Articles 5(2) and 24(1), ${phrase}: ${org} ${
    rating === "Evidenced" ? "can demonstrate the compliance those provisions require" : "cannot yet demonstrate, in full, the compliance those provisions require"
  }.`;
}

function verdictLead(surface: Bag, subject: string, fallback: string): string {
  const verdict = s(surface.verdict);
  const phrase = VERDICT_PHRASE[verdict];
  if (!phrase) return fallback;
  return `${subject} ${phrase}.`;
}

function domainEntries(report: Bag): Bag[] {
  const df = report.domain_findings;
  if (Array.isArray(df)) return df as Bag[];
  if (df && typeof df === "object") return Object.values(df as Bag) as Bag[];
  return [];
}

function domainProse(d: Bag): string {
  const parts = [
    s(d.domain_name) ? `${s(d.domain_name)}.` : "",
    s(d.current_state),
    s(d.gap_description),
    s(d.regulatory_basis) ? `The provisions engaged are ${s(d.regulatory_basis)}` : "",
    s(d.recommended_action),
  ].filter(Boolean);
  return repairRegister(parts.join(" "));
}

const OPERATIONAL_DOMAINS = /(training|tool|control|submission|policy|incident)/i;
const VENDOR_DOMAINS = /(vendor|processor|transfer|contract)/i;

function composeDomains(report: Bag, match: RegExp): string {
  const entries = domainEntries(report).filter((d) => match.test(`${s(d.domain_name)} ${s(d.domain)}`));
  return entries.map(domainProse).filter(Boolean).join("\n\n");
}

function composeDpoBody(report: Bag): string {
  const dpo = (report.dpo_determination ?? {}) as Bag;
  const parts: string[] = [];
  for (const key of ["designation_trigger", "position_and_independence", "task_coverage"]) {
    const c = (dpo[key] ?? {}) as Bag;
    const bits = [s(c.record_fact), s(c.application), s(c.information_needed)].filter(Boolean);
    if (bits.length) parts.push(repairRegister(bits.join(" ")));
  }
  const acct = (report.accountability_determination ?? {}) as Bag;
  if (s(acct.reasoning)) parts.push(repairRegister(s(acct.reasoning)));
  return parts.join("\n\n");
}

function composeTransfersBody(report: Bag): string {
  const t = (report.transfer_analysis ?? {}) as Bag;
  const parts = [s(t.record_fact), s(t.application)].filter(Boolean).map(repairRegister);
  const vendor = composeDomains(report, VENDOR_DOMAINS);
  if (vendor) parts.push(vendor);
  return parts.join("\n\n");
}

function composeDeterminationBody(report: Bag, intake: Bag): string {
  const parts: string[] = [];
  const exec = s(report.executive_summary);
  const rd = (report.readiness_determination ?? {}) as Bag;
  if (s(rd.rationale)) parts.push(repairRegister(s(rd.rationale)));
  if (exec) {
    const rest = afterFirstSentence(exec);
    if (rest) parts.push(repairRegister(rest));
  }

  const plan = Array.isArray(report.remediation_plan) ? (report.remediation_plan as Bag[]) : [];
  const domains = domainEntries(report);
  const actionFor = (finding: Bag): string => {
    const d = domains.find((x) => s(x.domain) === s(finding.domain));
    return d ? s(d.recommended_action) : "";
  };
  if (plan.length) {
    parts.push(
      `The assessment records ${plan.length === 1 ? "one remediation item" : `${plan.length} remediation items`}, each tied to the duty it closes.`,
    );
    plan.forEach((p, i) => {
      const bits = [
        `${i + 1}. ${repairRegister(actionFor(p) || s(p.domain).replace(/_/g, " "))}`,
        s(p.priority) ? `Priority: ${s(p.priority)}.` : "",
        s(p.accountable_owner) ? `Accountable owner: ${s(p.accountable_owner)}` : "",
        s(p.target_date) ? `Target date: ${s(p.target_date)}.` : "",
        s(p.validation_method) ? `Validation: ${s(p.validation_method)}.` : "",
      ].filter(Boolean);
      parts.push(bits.join(" "));
    });
  }

  const context = s(intake.additional_context);
  if (context.length > 80) {
    parts.push(`The company has provided the following further context, which the assessment has taken into account: ${context}`);
  }
  return parts.join("\n\n");
}

// ── Table of Authorities (governance grouping: GDPR is a Regulation) ────────

function governanceToa(report: Bag, body: string): string {
  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const entries = Array.isArray(exhibit.entries) ? (exhibit.entries as Bag[]) : [];
  const groups: Record<string, string[]> = {
    "Regulations": [],
    "Statutes": [],
    "Guidance and Persuasive Authority": [],
  };
  const seen = new Set<string>();
  for (const e of entries) {
    const citation = s(e.citation);
    if (!citation || seen.has(citation)) continue;
    if (!body.includes(citation)) continue; // iff-cited
    seen.add(citation);
    const cls = s(e.authority_class);
    const group = cls === "regulation" || /GDPR/i.test(citation)
      ? "Regulations"
      : cls === "statute"
      ? "Statutes"
      : "Guidance and Persuasive Authority";
    groups[group].push(citation);
  }
  const lines: string[] = [];
  for (const group of Object.keys(groups)) {
    const inGroup = groups[group].sort();
    if (!inGroup.length) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const c of inGroup) lines.push(`    ${c}`);
  }
  return lines.join("\n");
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface GovernanceSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

export function assembleGovernanceSkeletonDocument(
  report: Bag,
  intakeInput: Bag,
): GovernanceSkeletonResult {
  const intake = Object.keys(intakeInput ?? {}).length
    ? intakeInput
    : ((report.organisation_profile ?? {}) as Bag);
  const values = buildGovernanceSlotValues(intake);
  const org = s(intake.organization_name) || "the company";

  const composed: ComposedBlocks = {
    "executive_summary:0": ratingLead(report, org),
    "executive_summary:2": repairRegister(firstSentence(s(report.executive_summary))),

    "governance_infrastructure:0": verdictLead(
      (report.accountability_determination ?? {}) as Bag,
      "The accountability structure the company has described — designation, notice and records —",
      "Whether the accountability structure stands cannot be determined on the company's answers.",
    ),
    "governance_infrastructure:3": composeDpoBody(report),

    "training_tools_controls:0": verdictLead(
      { verdict: s(((report.risk_calibration_finding ?? {}) as Bag).verdict) },
      "The operational controls the company has described —",
      "The operational-control posture rests on the answers set out below.",
    ),
    "training_tools_controls:2": composeDomains(report, OPERATIONAL_DOMAINS),

    "processors_and_transfers:0": verdictLead(
      (report.transfer_analysis ?? {}) as Bag,
      "The Article 28 and Chapter V position the company has described",
      "The Article 28 and Chapter V position rests on the answers set out below.",
    ),
    "processors_and_transfers:2": composeTransfersBody(report),

    "the_determination:0": ratingLead(report, org),
    "the_determination:1": composeDeterminationBody(report, intake),
  };

  const draft = renderSkeletonDocument({
    sections: GOVERNANCE_SKELETON_SECTIONS,
    title: GOVERNANCE_SKELETON_TITLE,
    subtitle: GOVERNANCE_SKELETON_SUBTITLE,
    spineVersion: GOVERNANCE_SKELETON_VERSION,
    values,
    composed,
  });

  const toa = governanceToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: GOVERNANCE_SKELETON_SECTIONS,
    title: GOVERNANCE_SKELETON_TITLE,
    subtitle: GOVERNANCE_SKELETON_SUBTITLE,
    spineVersion: GOVERNANCE_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = GOVERNANCE_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, GOVERNANCE_SKELETON_SECTIONS),
    register_findings,
  };
}
