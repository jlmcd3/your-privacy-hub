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
  type RenderedTable,
  type SkeletonTables,
  type SlotValues,
} from "../../../_shared/prose/skeleton-render.ts";
// A-TEAM S3 RULING III.10 (doc 115) — acronym-safe mid-sentence casing.
import { lowerFirstWordSafe } from "../../../_shared/ltp/splice-case.ts";

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

// A-TEAM S3 RULING III.10 (doc 115, 2026-08-31) — acronym-guarded: the old
// first-char lowercase printed "DLP rules" as "dLP rules". A word opening
// with two capitals is preserved.
function lower(v: string): string {
  return lowerFirstWordSafe(v);
}

/** Deterministic register repair — the attribution voice is law (v3 bans).
 *
 * A-TEAM S3 RULING I.12 (doc 115, 2026-08-31): the repair target changes
 * from "on the company's answers" (questionnaire register, flagged for
 * overuse across the fleet) to "on the information provided" — the same
 * evidentiary anchor the Risk product's ratified spine uses. The v3 BAN
 * (record-voice constructions) is unchanged; only the replacement register
 * moves. */
export function repairRegister(text: string): string {
  let out = text;
  out = out.replace(/\bOn this record\b/g, "On the information provided");
  out = out.replace(/\bon this record\b/g, "on the information provided");
  out = out.replace(/\bThe record shows\b/g, "The company has indicated");
  out = out.replace(/\bthe record shows\b/g, "the company has indicated");
  out = out.replace(/\bThe record (reflects|indicates|demonstrates|establishes)\b/g, "The company has indicated");
  out = out.replace(/\bthe record (reflects|indicates|demonstrates|establishes)\b/g, "the company has indicated");
  out = out.replace(/\bThe record evidences\b/g, "The information provided evidences");
  out = out.replace(/\bthe record evidences\b/g, "the information provided evidences");
  out = out.replace(/\bThe record answers\b/g, "The company reports");
  out = out.replace(/\bthe record answers\b/g, "the company reports");
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
  "Yes — verified": "the company reports that those terms have been verified",
  "Partially": "the company reports that verification is partial",
  "Not verified": "the company reports that they have not been verified",
  "Unsure": "the company reports that it is unsure whether they have been verified",
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
  "Evidenced": "accountability is evidenced on the information provided",
  "Partly evidenced": "accountability is partly evidenced on the information provided",
  "Not evidenced": "accountability is not evidenced on the information provided",
  "Not yet determinable": "the accountability determination requires additional information before it can be made",
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
  satisfied: "is evidenced on the information provided",
  partially_satisfied: "is only partly evidenced on the information provided",
  not_satisfied: "is not evidenced on the information provided",
  not_determinable: "cannot be determined on the information provided",
  information_needed: "cannot be determined on the information provided",
};

function ratingLead(report: Bag, org: string): string {
  const rd = (report.readiness_determination ?? {}) as Bag;
  const rating = s(rd.rating);
  const phrase = RATING_PHRASE[rating] ?? "the accountability determination requires additional information before it can be made";
  // Org names are proper nouns — never case-fold them (SO-3 r2 defect).
  return `Assessed against Articles 5(2) and 24(1), ${phrase}: ${org} ${
    rating === "Evidenced" ? "can demonstrate the compliance those provisions require" : "has not demonstrated, in full, the compliance those provisions require"
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
    let sentence = `On the Article 30(1) elements, the information provided evidences ${met.length} of ${elements.length}`;
    // DOC-81 S-3 — attributed voice at source ("the record does not
    // support" passed the banned-list guard but violated the rule).
    if (unmet.length > 0) sentence += `; the information provided does not support ${letters(unmet)}`;
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
          : "The Article 30(5) derogation is not available on the information provided.",
      );
    } else if (ex.exemption_available === true) {
      parts.push("On the information provided the Article 30(5) derogation is available; maintaining the record remains good practice and accountability evidence.");
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
    let sentence = `On demonstrability, of the ${demo.length} requirements assessed, supporting evidence is identified for ${present}`;
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
    case "satisfied": return "evidenced on the information provided";
    case "partially_satisfied": return "partly evidenced on the information provided";
    case "not_satisfied": return "not evidenced on the information provided";
    case "not_applicable": return "not applicable on the information provided";
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
  if (sev === "compliant") return "evidenced";
  if (sev === "unresolved") return "unresolved on the information provided";
  // FD703575-G3 (2026-08-27) — a bare severity label reads identically for
  // any organisation (live batch fd703575: five consecutive "assessed with
  // severity medium" rows). The domain's own recorded gap is already printed
  // in Section III; its first sentence anchors the crosswalk row to this
  // record's facts without deciding anything new.
  const gap = firstSentence(s(d.gap_description) || s(d.current_state));
  return gap ? `assessed with severity ${sev} — ${gap.replace(/\.$/, "")}` : `assessed with severity ${sev}`;
}

// BATCH 20a (Wave C4, doc 113 S5.2) — the crosswalk's ten rows, shared by
// the table builder; the verdict reads keep their bytes.
function icoCrosswalkRows(report: Bag): Array<[string, string]> {
  const dpo = (report.dpo_determination ?? {}) as Bag;
  const risk = (report.risk_calibration_finding ?? {}) as Bag;
  const elements = Array.isArray(report.art30_element_findings)
    ? (report.art30_element_findings as Bag[])
    : [];
  const art30Read = elements.length > 0
    ? `${elements.filter((e) => s(e.verdict) === "satisfied").length} of ${elements.length} Article 30(1) elements evidenced`
    : "not separately assessed by this report";

  return [
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
}

function deriveIcoCrosswalkTable(report: Bag): RenderedTable | null {
  const rows = icoCrosswalkRows(report).map(([cat, read]) => {
    const repaired = repairRegister(read);
    return [cat, repaired.charAt(0).toUpperCase() + repaired.slice(1)];
  });
  if (!rows.length) return null;
  return {
    key: "",
    surface: "ico_accountability_crosswalk",
    title: "ICO Accountability Framework crosswalk",
    columns: ["Category", "Position on the record"],
    rows,
  };
}

// BATCH 20a (doc 113 S5.2) — the prose block now carries ONLY the detached
// closing sentence (it used to glue onto the last crosswalk line); the ten
// rows render in the table above it.
function composeIcoCrosswalk(report: Bag): string {
  const acct = (report.accountability_determination ?? {}) as Bag;
  const transfer = (report.transfer_analysis ?? {}) as Bag;
  const acctTail = s(acct.verdict)
    ? `The headline Article 5(2)/24(1) determination above is ${verdictPhrase(s(acct.verdict))}${s(transfer.regime) && s(transfer.regime) !== "not_engaged" ? ", with the Chapter V transfer analysis carried in Section 4" : ""}.`
    : "";
  return repairRegister(acctTail);
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
  // BATCH 20a (Wave C4, doc 113 S5.1) — the numbered item paragraphs moved
  // into the Remediation Register table below; the prose keeps the count
  // sentence and the adversity-ordering sentence, and the uniform-defaults
  // sentence rides the table's own note.
  if (plan.length) {
    parts.push(
      `The assessment records ${plan.length === 1 ? "one remediation item" : `${plan.length} remediation items`}, each tied to the duty it closes and set out in the remediation register below.`,
    );
    if (plan.length > 1) {
      parts.push(
        "The items are ordered by the adversity of the finding each closes — duties recorded as not satisfied first, then partially satisfied, then record-completion items — and within a class by the order of the duty walk above.",
      );
    }
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
  // A-TEAM S3 RULINGS I.21/III.22 (doc 115, 2026-08-31) — the exhibit ledger
  // underreported: the body discusses many GDPR articles the ledger never
  // carried, so the final list showed three rows against a report citing a
  // dozen provisions. The body scan below adds a consolidated "GDPR Art. N"
  // row for every article the document actually cites that no ledger entry
  // already covers. Iff-cited discipline is preserved (the scan reads the
  // assembled body only); ledger rows keep their fuller pinpoint forms.
  const citedArticles = new Set<number>();
  const artRe = /\b(?:UK\s+)?GDPR\s+Art(?:icle)?s?\.?\s*(\d{1,2})\b|\bArt(?:icle)?s?\.?\s*(\d{1,2})(?:\(\d+\))?\s+(?:UK\s+)?GDPR\b/gi;
  let am: RegExpExecArray | null;
  while ((am = artRe.exec(body))) {
    const n = Number(am[1] ?? am[2]);
    if (n >= 1 && n <= 99) citedArticles.add(n);
  }
  const covered = new Set<number>();
  for (const c of groups["Regulations"]) {
    let cm: RegExpExecArray | null;
    const cRe = /Art(?:icle)?s?\.?\s*(\d{1,2})/gi;
    while ((cm = cRe.exec(c))) covered.add(Number(cm[1]));
  }
  for (const n of [...citedArticles].sort((a, b) => a - b)) {
    if (!covered.has(n)) groups["Regulations"].push(`GDPR Art. ${n}`);
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

// BATCH 20a (Wave C4, doc 113 S5.1) — the §V Remediation Register. Rows
// carry the FD703575-G1 duty/gap lookup (each remediation record was built
// FROM a domain_element_finding keyed by finding_key, so that finding's
// label and record_fact are the authoritative statement of what the item
// closes; D1D2B3B8-G2's closure-act rule rides the Action column). The
// §1.4 constant-column rule applies to the four meta columns: a column
// whose every cell is identical is dropped and its constant stated once in
// the table note.
export function deriveRemediationRegisterTable(report: Bag): RenderedTable | null {
  const plan = Array.isArray(report.remediation_plan) ? (report.remediation_plan as Bag[]) : [];
  if (!plan.length) return null;
  const domains = domainEntries(report);
  const actionFor = (finding: Bag): string => {
    const d = domains.find((x) => s(x.domain) === s(finding.domain));
    return d ? s(d.recommended_action) : "";
  };
  const elements = Array.isArray(report.domain_element_findings) ? (report.domain_element_findings as Bag[]) : [];
  const elementFor = (p: Bag): Bag | undefined => elements.find((x) => s(x.key) === s(p.finding_key));

  const metaColumns: Array<{ label: string; value: (p: Bag) => string }> = [
    { label: "Priority", value: (p) => s(p.priority) },
    { label: "Accountable owner", value: (p) => s(p.accountable_owner) },
    { label: "Target date", value: (p) => s(p.target_date) },
    { label: "Validation", value: (p) => s(p.validation_method) },
  ];
  const kept = metaColumns.filter((c) => {
    const first = c.value(plan[0]);
    return !plan.every((p) => c.value(p) === first);
  });
  const dropped = metaColumns.filter((c) => !kept.includes(c) && c.value(plan[0]));

  const rows = plan.map((p, i) => {
    const el = elementFor(p);
    const label = (el && s(el.label)) || s(p.domain).replace(/_/g, " ");
    const gap = el ? firstSentence(s(el.record_fact)) : "";
    // Cells carry an initial capital (doc 109 §1.4) — the slug fallback
    // label may arrive lowercase.
    const duty = repairRegister([label, gap].filter(Boolean).join(" — "));
    const action = actionFor(p) || (el ? s(el.information_needed) : "");
    return [
      String(i + 1),
      duty ? duty.charAt(0).toUpperCase() + duty.slice(1) : "—",
      action ? repairRegister(action.replace(/\.$/, "")) : "—",
      ...kept.map((c) => c.value(p) || "—"),
    ];
  });

  return {
    key: "",
    surface: "remediation_plan",
    title: "Remediation register",
    columns: ["#", "Duty and gap", "Action", ...kept.map((c) => c.label)],
    rows,
    ...(dropped.length
      ? {
        note: `${dropped.map((c) => `${c.label}: ${c.value(plan[0])}`).join("; ")} — these values apply to every item in this register.`,
      }
      : {}),
  };
}

// BATCH 19a (Wave C3, doc 113 S3.2) — the Executive Summary scoreboard,
// each row read from a typed surface's own counts; a surface absent from
// the record skips its row. This is the anchor for the scattered-tallies
// cluster the panel flagged (doc 109 Documents 6-7, offense #3); the
// sections' own sentences still carry the analysis.
export function deriveGovernanceScoreboard(report: Bag): RenderedTable | null {
  const rows: string[][] = [];

  const demo = Array.isArray(report.demonstrability_findings)
    ? (report.demonstrability_findings as Bag[])
    : [];
  if (demo.length > 0) {
    const present = demo.filter((d) => s(d.artifact_present) === "yes").length;
    rows.push(["Duties with an identified supporting artifact", `${present} of ${demo.length}`]);
  }

  const elements = Array.isArray(report.art30_element_findings)
    ? (report.art30_element_findings as Bag[])
    : [];
  if (elements.length > 0) {
    const met = elements.filter((e) => s(e.verdict) === "satisfied").length;
    rows.push(["Article 30(1) elements evidenced", `${met} of ${elements.length}`]);
  }

  const domains = domainEntries(report);
  if (domains.length > 0) {
    const withGap = domains.filter((d) => {
      const sev = s(d.severity).toLowerCase();
      return sev !== "" && sev !== "compliant";
    }).length;
    rows.push(["Domains with a recorded gap", `${withGap} of ${domains.length}`]);
  }

  const plan = Array.isArray(report.remediation_plan) ? (report.remediation_plan as Bag[]) : [];
  if (plan.length > 0) {
    rows.push(["Remediation items recorded", String(plan.length)]);
  }

  if (!rows.length) return null;
  return {
    key: "",
    surface: "art30_element_findings+demonstrability_findings+domain_element_findings+remediation_plan",
    title: "Programme scoreboard",
    columns: ["Measure", "Count"],
    rows,
    hideHeader: true,
  };
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
      "Additional information is required before the accountability determination can be made on the information provided.",
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
    // BATCH 20a (doc 113 S5.2) — :1 is the crosswalk table; the detached
    // closing sentence composes at :2.
    "ico_crosswalk:2": composeIcoCrosswalk(report),
  };

  // BATCH 19a (doc 113 S3.2) — the scoreboard, keyed to its spine block.
  const tables: SkeletonTables = {
    "executive_summary:3": deriveGovernanceScoreboard(report),
    // BATCH 20a (doc 113 S5.1/S5.2).
    "the_determination:2": deriveRemediationRegisterTable(report),
    "ico_crosswalk:1": deriveIcoCrosswalkTable(report),
  };

  const draft = renderSkeletonDocument({
    sections: GOVERNANCE_SKELETON_SECTIONS,
    title: GOVERNANCE_SKELETON_TITLE,
    subtitle: GOVERNANCE_SKELETON_SUBTITLE,
    spineVersion: GOVERNANCE_SKELETON_VERSION,
    values,
    composed,
    tables,
  });

  const toa = governanceToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: GOVERNANCE_SKELETON_SECTIONS,
    title: GOVERNANCE_SKELETON_TITLE,
    subtitle: GOVERNANCE_SKELETON_SUBTITLE,
    spineVersion: GOVERNANCE_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
    tables,
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = GOVERNANCE_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, GOVERNANCE_SKELETON_SECTIONS),
    register_findings,
  };
}
