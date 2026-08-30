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
} from "../../../_shared/prose/skeleton-render.ts";

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

    // Sector is a reader label, not prose — render it verbatim. Sentence-initial
    // lowercasing mangled compound labels ("healthcare/Life Sciences"), same
    // defect class as the org-name case-fold (SO-3 r3 defect).
    sector: s(intake.sector),
    orgSize: ORG_SIZE_PROSE[s(intake.org_size)] ?? s(intake.org_size),
    jurisdictions: asProse(arr(intake.jurisdictions)) || null,
    // PANEL GOV-3 (2026-08-30) — this value begins a sentence; when the
    // org-name fallback ("the company") fills it, the sentence used to open
    // lowercase. Real names are proper nouns and pass through unchanged.
    EU_UK_SENTENCE: isNA(euUk)
      ? null
      : /^Yes/i.test(euUk)
      ? `${org.charAt(0).toUpperCase()}${org.slice(1)} has indicated that it processes the personal data of individuals in the EU or the UK`
      : `${org.charAt(0).toUpperCase()}${org.slice(1)} has indicated that it does not process the personal data of individuals in the EU or the UK`,
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

// DOC-81 S-1 (CEO-directed, 2026-08-27) — "evidenced" replaces "stands":
// this is the file's OWN established word for this exact concept, already
// used twice (RATING_PHRASE above and verdictPhrase() below, both in this
// file) — "stands"/"stands only in part" was the outlier, not the norm,
// and doesn't gracefully take a partial modifier ("stands in part" isn't
// idiomatic). "Evidenced" also names the actual legal concept: all three
// surfaces this map serves are asking whether the company's answers let
// this be DEMONSTRATED, the literal Art. 5(2) standard.
const VERDICT_PHRASE: Record<string, string> = {
  satisfied: "is evidenced on the company's answers",
  partially_satisfied: "is only partly evidenced on the company's answers",
  not_satisfied: "is not evidenced on the company's answers",
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

// PANEL GOV-6 (2026-08-30) — where the upstream citation-verification pass
// degrades a domain's regulatory_basis, the field carries the emit-gate's
// substitution literal, not citations. Splicing whatever the field holds
// into "The provisions engaged are ___." rendered, verbatim on the public
// US sample (twice): "The provisions engaged are We could not verify this
// item from the information provided; it is listed under information
// needed.." — an error string as a citation, with a doubled period. A
// degraded basis is an UNVERIFIED citation: under the iff-cited law it is
// not stated at all, and the degradation already travels via
// information_needed. The literal is matched on its stable stem so a future
// wording tweak of the tail cannot silently re-open the leak.
const DEGRADED_BASIS_STEM = "We could not verify this item";

function domainProse(d: Bag): string {
  const basis = s(d.regulatory_basis);
  const basisIsDegraded = basis.includes(DEGRADED_BASIS_STEM);
  const parts = [
    s(d.domain_name) ? `${s(d.domain_name)}.` : "",
    s(d.current_state),
    s(d.gap_description),
    // DOC-81 G-1 — the terminal period lives here, not in the ten basis
    // strings, so the sentence can never run into the action that follows.
    basis && !basisIsDegraded ? `The provisions engaged are ${basis}.` : "",
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

// S-G2 (doc 80, 2026-08-27) — PN-G8 executed. The three Item-313 surfaces
// (computed and persisted on every run since 2026-08-01, never rendered)
// composed into the governance-infrastructure section. Verdict READS only.
function composeArt30RecordsBody(report: Bag): string {
  const parts: string[] = [];

  const elements = Array.isArray(report.art30_element_findings)
    ? (report.art30_element_findings as Bag[])
    : [];
  if (elements.length > 0) {
    const met = elements.filter((e) => s(e.verdict) === "satisfied");
    const open = elements.filter((e) => s(e.verdict) === "record_insufficient" || s(e.verdict) === "partially_satisfied");
    const unmet = elements.filter((e) => s(e.verdict) === "not_satisfied");
    const letters = (xs: Bag[]) => xs.map((e) => `(${s(e.element)})`).join(", ");
    let sentence = `On the Article 30(1) elements, the company's answers evidence ${met.length} of ${elements.length}`;
    // DOC-81 S-3 — attributed voice at source ("the record does not
    // support" passed the banned-list guard but violated the rule).
    if (unmet.length > 0) sentence += `; the company's answers do not support ${letters(unmet)}`;
    if (open.length > 0) sentence += `; ${letters(open)} ${open.length === 1 ? "remains" : "remain"} open on the information provided`;
    parts.push(sentence + ".");
  }

  const ex = (report.art30_exemption_determination ?? {}) as Bag;
  if (ex && typeof ex.exemption_available !== "undefined") {
    if (ex.exemption_available === false) {
      const met = Array.isArray(ex.defeating_conditions)
        ? (ex.defeating_conditions as Bag[]).filter((c) => c.met === true).map((c) => s(c.label)).filter(Boolean)
        : [];
      parts.push(
        met.length > 0
          ? `The Article 30(5) derogation is not available: ${met.join("; ")}.`
          : "The Article 30(5) derogation is not available on the company's answers.",
      );
    } else if (ex.exemption_available === true) {
      parts.push("On the company's answers the Article 30(5) derogation is available; maintaining the record remains good practice and accountability evidence.");
    } else {
      parts.push("Whether the Article 30(5) derogation is available cannot be resolved on the information provided.");
    }
  }

  const demo = Array.isArray(report.demonstrability_findings)
    ? (report.demonstrability_findings as Bag[])
    : [];
  if (demo.length > 0) {
    const present = demo.filter((d) => s(d.artifact_present) === "yes").length;
    const partial = demo.filter((d) => s(d.artifact_present) === "partial").length;
    let sentence = `On demonstrability, of the ${demo.length} duties walked, the evidencing artifact is present for ${present}`;
    if (partial > 0) sentence += ` and partially present for ${partial}`;
    parts.push(sentence + ".");
  }

  return parts.length ? repairRegister(parts.join(" ")) : "";
}

// S-G1 (doc 80, 2026-08-27) — the ICO Accountability Framework crosswalk.
// Ten entries, each a verdict READ from an existing typed determination; a
// category the assessment does not separately assess says so honestly.
function verdictPhrase(v: string): string {
  switch (v) {
    case "satisfied": return "evidenced on the company's answers";
    case "partially_satisfied": return "partly evidenced on the company's answers";
    case "not_satisfied": return "not evidenced on the company's answers";
    case "not_applicable": return "not applicable on the company's answers";
    case "record_insufficient": return "unresolved on the information provided";
    default: return "not separately assessed by this report";
  }
}

function domainSeverityPhrase(report: Bag, needle: RegExp): string {
  const d = domainEntries(report).find((x) => needle.test(`${s(x.domain_name)} ${s(x.domain)}`));
  if (!d) return "not separately assessed by this report";
  const sev = s(d.severity).toLowerCase();
  if (!sev) return "assessed in Section III without a recorded severity";
  // DOC-81 G-3 — "Compliant" and "Unresolved" are postures, not severities;
  // render them in the determination register instead.
  if (sev === "compliant") return "evidenced on the company's answers";
  if (sev === "unresolved") return "unresolved on the information provided";
  // FD703575-G3 (2026-08-27) — a bare severity label reads identically for
  // any organisation (live batch fd703575: five consecutive "assessed with
  // severity medium" rows). The domain's own recorded gap is already printed
  // in Section III; its first sentence anchors the crosswalk row to this
  // record's facts without deciding anything new.
  const gap = firstSentence(s(d.gap_description) || s(d.current_state));
  return gap ? `assessed with severity ${sev} — ${gap.replace(/\.$/, "")}` : `assessed with severity ${sev}`;
}

function composeIcoCrosswalk(report: Bag): string {
  const acct = (report.accountability_determination ?? {}) as Bag;
  const dpo = (report.dpo_determination ?? {}) as Bag;
  const risk = (report.risk_calibration_finding ?? {}) as Bag;
  const transfer = (report.transfer_analysis ?? {}) as Bag;
  const elements = Array.isArray(report.art30_element_findings)
    ? (report.art30_element_findings as Bag[])
    : [];
  const art30Read = elements.length > 0
    ? `${elements.filter((e) => s(e.verdict) === "satisfied").length} of ${elements.length} Article 30(1) elements evidenced`
    : "not separately assessed by this report";

  const rows: Array<[string, string]> = [
    ["Leadership and oversight", s(dpo.verdict) ? `the DPO determination is ${verdictPhrase(s(dpo.verdict))}` : "not separately assessed by this report"],
    ["Policies and procedures", domainSeverityPhrase(report, /internal.?policy|policy/i)],
    ["Training and awareness", domainSeverityPhrase(report, /training/i)],
    ["Individuals' rights", domainSeverityPhrase(report, /subject.?rights|rights/i)],
    ["Transparency", domainSeverityPhrase(report, /privacy.?notice|notice/i)],
    ["Records of processing and lawful basis", art30Read],
    ["Contracts and data sharing", domainSeverityPhrase(report, /vendor|contract/i)],
    ["Risks and DPIAs", s(risk.verdict) ? `the risk-calibration finding is ${verdictPhrase(s(risk.verdict))}` : domainSeverityPhrase(report, /dpia/i)],
    ["Records management and security", domainSeverityPhrase(report, /submission|security/i)],
    ["Breach response and monitoring", domainSeverityPhrase(report, /incident/i)],
  ];

  const lines = rows.map(([cat, read]) => `${cat}: ${read}.`);
  const acctTail = s(acct.verdict)
    ? ` The headline Article 5(2)/24(1) determination above is ${verdictPhrase(s(acct.verdict))}${s(transfer.regime) && s(transfer.regime) !== "not_engaged" ? ", with the Chapter V transfer analysis carried in Section IV" : ""}.`
    : "";
  return repairRegister(lines.join("\n") + acctTail);
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
  // FD703575-G1 (2026-08-27) — each remediation item names the DUTY and the
  // GAP it closes. The old lookup matched the remediation record's domain
  // (the Item-313 duty vocabulary: "demonstrability", "dpo", …) against the
  // model domain findings' domain names (the tool-usage vocabulary:
  // "tool_inventory", …), which never match — every item fell back to the
  // bare duty slug and items 2–9 rendered identically ("demonstrability
  // Priority: High — …" with no gap named, live batch fd703575). Each
  // remediation record was built FROM a domain_element_finding
  // (finding.remediation, keyed by finding_key), so that finding's label and
  // record_fact are the authoritative statement of what the item closes.
  const elements = Array.isArray(report.domain_element_findings) ? (report.domain_element_findings as Bag[]) : [];
  const elementFor = (p: Bag): Bag | undefined => elements.find((x) => s(x.key) === s(p.finding_key));
  if (plan.length) {
    parts.push(
      `The assessment records ${plan.length === 1 ? "one remediation item" : `${plan.length} remediation items`}, each tied to the duty it closes.`,
    );
    // 3E9AD759-G2 — when the intake's remediation defaults make every item's
    // priority, owner, date and validation identical, the ordering rule is
    // stated so the list still carries a triage signal.
    const uniformDefaults = plan.length > 1 &&
      plan.every((p) =>
        s(p.priority) === s(plan[0].priority) &&
        s(p.accountable_owner) === s(plan[0].accountable_owner) &&
        s(p.target_date) === s(plan[0].target_date) &&
        s(p.validation_method) === s(plan[0].validation_method));
    if (uniformDefaults) {
      parts.push(
        "The recorded owner, priority, target date and validation method are the intake's remediation defaults applied to each item. The items are ordered by the adversity of the finding each closes — duties recorded as not satisfied first, then partially satisfied, then record-completion items — and within a class by the order of the duty walk above.",
      );
    }
    plan.forEach((p, i) => {
      const el = elementFor(p);
      const label = (el && s(el.label)) || s(p.domain).replace(/_/g, " ");
      const gap = el ? firstSentence(s(el.record_fact)) : "";
      // D1D2B3B8-G2 (2026-08-28) — an item may not state a gap without a
      // closure act. The duty-vocabulary items never match a model domain
      // finding (see FD703575-G1 above), so their Action line was empty and
      // the item just restated the intake answer ("The record carries
      // nothing on this element" with nothing to DO — live batch, three
      // documents). The element finding's information_needed IS the closure
      // act for a record-completion item: what to state to close it.
      const action = actionFor(p) || (el ? s(el.information_needed) : "");
      const bits = [
        `${i + 1}. ${repairRegister([label, gap].filter(Boolean).join(" — "))}`,
        action ? `Action: ${repairRegister(action.replace(/\.$/, ""))}.` : "",
        s(p.priority) ? `Priority: ${s(p.priority)}.` : "",
        s(p.accountable_owner) ? `Accountable owner: ${s(p.accountable_owner)}.` : "",
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

// SO-FT FIX 2 (2026-08-11): authorities named only to disclaim them.
const NON_APPLICABLE_AUTHORITIES = ["uk gdpr art. 44", "uk gdpr article 44"];
function isNonApplicableAuthority(citation: string): boolean {
  const c = citation.replace(/\s+/g, " ").trim().toLowerCase();
  return NON_APPLICABLE_AUTHORITIES.some((n) => c === n || c.startsWith(`${n} `));
}


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
    // SO-FT FIX 2 (2026-08-11): rows that exist only to explain an omission
    // (UK GDPR Art. 44) never enter the Table of Authorities.
    if (e.applicable === false || isNonApplicableAuthority(citation)) continue;
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
      "Whether the accountability structure is evidenced on the company's answers cannot be determined.",
    ),
    "governance_infrastructure:3": composeDpoBody(report),
    // S-G2 — the Art. 30 records-and-demonstrability block.
    "governance_infrastructure:4": composeArt30RecordsBody(report),

    "training_tools_controls:0": verdictLead(
      { verdict: s(((report.risk_calibration_finding ?? {}) as Bag).verdict) },
      // DOC-81 S-1 — renamed from "The operational controls" (plural,
      // trailing unpaired dash) to match this section's OWN fallback below,
      // which already called it "the operational-control posture" — and to
      // give VERDICT_PHRASE a singular subject so "is evidenced" agrees.
      "The operational-control posture the company has described",
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

    // S-G1 — the ICO Accountability Framework crosswalk appendix. The rule
    // block is product-supplied (the renderer's contract for rule-kind
    // blocks, same as table_of_authorities:0): its fixed sentence prints
    // verbatim, followed by the ten composed verdict-read entries.
    "ico_crosswalk:0":
      "The UK Information Commissioner's Accountability Framework organises accountability into ten categories. This appendix maps the determinations of this assessment onto those categories, so the reader can see the record in the regulator's own structure; each entry restates a determination made above and decides nothing new.",
    "ico_crosswalk:1": composeIcoCrosswalk(report),
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
