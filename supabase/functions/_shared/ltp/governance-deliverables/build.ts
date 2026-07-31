/**
 * ITEM 313 — builder for the governance analytic deliverables.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env.
 *
 * SINGLE-WRITER LAW: this module is the only writer of
 * `accountability_determination`, `demonstrability_findings`,
 * `art30_element_findings`, `art30_exemption_determination`,
 * `dpo_determination`, `risk_calibration_finding`,
 * `review_and_update_finding` and `maturity_tier_readability_aid`.
 *
 * DEMOTION LAW (Item 313): the maturity tier ("Initial | Developing | Defined |
 * Managed | Optimised") has NO statutory basis. It may survive only as a
 * secondary, explicitly-labelled readability aid. The headline conclusion is
 * `accountability_determination` — Art. 5(2) demonstrability plus Art. 24(1)
 * risk-appropriateness.
 */
import {
  ADEQUATE_CADENCES,
  anchor,
  ART30_ELEMENTS,
  DEMONSTRABILITY_DUTIES,
  LARGE_SCALE_SIZES,
  PUBLIC_AUTHORITY_SECTORS,
  UNDER_250_SIZES,
} from "./elements.ts";
import type {
  AccountabilityDetermination,
  Art30ElementFinding,
  Art30ExemptionDetermination,
  DemonstrabilityFinding,
  DpoDetermination,
  Finding,
  GovernanceDeliverables,
  MaturityTierAid,
  Verdict,
} from "./types.ts";

export const GOVERNANCE_DELIVERABLES_VERSION =
  "governance-deliverables-item313-2026-07-31";

// ── record helpers ───────────────────────────────────────────────────
function get(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const seg of path.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
}
function unanswered(v: string): boolean {
  return !v || v === "n/a" || v.toLowerCase() === "unsure";
}

// ── shared facts ─────────────────────────────────────────────────────
export interface GovernanceFacts {
  org: string;
  sector: string;
  size: string;
  jurisdictions: string[];
  euUk: boolean;
  dataCategories: string[];
  specialCategory: boolean;
  specialList: string[];
  dpoStatus: string;
  nature: string;
  scope: string;
  context: string;
  purposes: string;
  cadence: string;
  lastReview: string;
  under250: boolean;
  largeScale: boolean;
  publicAuthority: boolean;
}

export function readGovernanceFacts(intake: unknown): GovernanceFacts {
  const jurisdictions = arr(get(intake, "jurisdictions"));
  const euUkFlag = str(get(intake, "eu_uk_data")).toLowerCase() === "yes";
  const size = str(get(intake, "org_size"));
  const sector = str(get(intake, "sector"));
  return {
    org: str(get(intake, "organization_name")),
    sector,
    size,
    jurisdictions,
    euUk: euUkFlag ||
      jurisdictions.some((j) => j === "EU (GDPR)" || j === "United Kingdom (UK GDPR)"),
    dataCategories: arr(get(intake, "data_categories")),
    specialCategory: str(get(intake, "special_category")).toLowerCase() === "yes",
    specialList: arr(get(intake, "special_categories_list")),
    dpoStatus: str(get(intake, "dpo_status")),
    nature: str(get(intake, "processing_nature")),
    scope: str(get(intake, "processing_scope")),
    context: str(get(intake, "processing_context")),
    purposes: str(get(intake, "processing_purposes")),
    cadence: str(get(intake, "measures_review_cadence")),
    lastReview: str(get(intake, "measures_last_review_date")),
    under250: UNDER_250_SIZES.includes(size),
    largeScale: LARGE_SCALE_SIZES.includes(size),
    publicAuthority: PUBLIC_AUTHORITY_SECTORS.includes(sector),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Op. 2 — demonstrability findings (Art. 5(2) / Art. 24(1))
// ─────────────────────────────────────────────────────────────────────
export function buildDemonstrabilityFindings(intake: unknown): DemonstrabilityFinding[] {
  const acct = anchor("accountability", "GDPR Art. 5(2)");
  return DEMONSTRABILITY_DUTIES.map((d) => {
    const a = anchor(d.anchorKey, "GDPR Art. 24(1)");
    const value = str(get(intake, d.intake_key));
    let present: DemonstrabilityFinding["artifact_present"];
    if (unanswered(value)) present = "unknown";
    else if (d.present.includes(value)) present = "yes";
    else if (d.partial.includes(value)) present = "partial";
    else present = "no";

    const standard = acct.verbatim
      ? `${acct.verbatim} ${a.verbatim}`.trim()
      : a.verbatim;

    if (present === "unknown") {
      return {
        key: d.key,
        label: d.duty,
        duty: d.duty,
        evidencing_artifact: d.artifact,
        artifact_present: present,
        citation: `${acct.citation}; ${a.citation}`,
        standard,
        record_fact: value ? `The record answers "${value}".` : "The record does not answer this question.",
        application: "",
        verdict: "record_insufficient",
        status: "record_insufficient",
        information_needed:
          `State whether the following artifact exists and can be produced to a supervisory authority: ${d.artifact}. Article 5(2) is a duty to be able to demonstrate compliance, so an unanswered question is, on the record as it stands, an unevidenced duty.`,
      } satisfies DemonstrabilityFinding;
    }

    const application = present === "yes"
      ? `The record shows this duty is discharged and, on its face, evidenced: ${d.artifact.charAt(0).toLowerCase()}${d.artifact.slice(1)} would be the artifact produced on request. Article 5(2) is satisfied for this duty only if that artifact is current and retrievable — confirm it against the source system before relying on this finding.`
      : present === "partial"
      ? `The record shows the duty is partly discharged. ${d.artifact} would exist in incomplete form, which is enough to describe the measure but not enough to demonstrate compliance with it: an authority asking for the artifact would receive a partial answer.`
      : `The record shows the duty is not discharged. There is no ${d.artifact.charAt(0).toLowerCase()}${d.artifact.slice(1)} to produce, so this duty is currently unevidenced for the purposes of Article 5(2).`;

    return {
      key: d.key,
      label: d.duty,
      duty: d.duty,
      evidencing_artifact: d.artifact,
      artifact_present: present,
      citation: `${acct.citation}; ${a.citation}`,
      standard,
      record_fact: `The record answers "${value}".`,
      application,
      verdict: present === "yes" ? "satisfied" : present === "partial" ? "partially_satisfied" : "not_satisfied",
      status: "analysed",
    } satisfies DemonstrabilityFinding;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Op. 3 — Art. 30(1)(a)-(g) element walk (deterministic)
// ─────────────────────────────────────────────────────────────────────
export function buildArt30ElementFindings(intake: unknown): Art30ElementFinding[] {
  return ART30_ELEMENTS.map((el) => {
    const a = anchor(el.anchorKey, `GDPR Art. 30(1)(${el.element})`);
    const evidence = el.evidence_keys
      .map((k) => {
        const v = get(intake, k);
        const text = Array.isArray(v) ? arr(v).join(", ") : str(v);
        return unanswered(text) ? "" : `${k} = ${text}`;
      })
      .filter(Boolean);

    if (evidence.length === 0) {
      return {
        key: `art30_${el.element}`,
        element: el.element,
        label: el.label,
        citation: a.citation,
        standard: a.verbatim,
        record_fact: "The record carries nothing on this element.",
        application: "",
        verdict: "record_insufficient",
        status: "record_insufficient",
        information_needed:
          `Supply the Article 30(1)(${el.element}) content — ${el.label.toLowerCase()} — for each processing activity. Until it is supplied the record cannot be said to contain "all of the following information".`,
      } satisfies Art30ElementFinding;
    }

    const partial = evidence.length < el.evidence_keys.length;
    return {
      key: `art30_${el.element}`,
      element: el.element,
      label: el.label,
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record carries: ${evidence.join("; ")}.`,
      application: partial
        ? `That content addresses Article 30(1)(${el.element}) in part only. The element is drafted as a mandatory content requirement, so a partial entry leaves the record incomplete for this element.`
        : `That content addresses Article 30(1)(${el.element}) on its face. Whether it does so activity by activity — the unit Article 30(1) uses — must be confirmed against the record itself.`,
      verdict: partial ? "partially_satisfied" : "satisfied",
      status: "analysed",
    } satisfies Art30ElementFinding;
  });
}

/** Art. 30(5) — any ONE of three conditions defeats the exemption. */
export function buildArt30ExemptionDetermination(intake: unknown): Art30ExemptionDetermination {
  const f = readGovernanceFacts(intake);
  const a = anchor("art30_exemption", "GDPR Art. 30(5)");
  const size = f.size;

  const notOccasional = f.dataCategories.some((c) =>
    ["Employee records", "Customer records", "Contact details"].includes(c)
  );
  const likelyRisk = f.specialCategory ||
    f.dataCategories.some((c) =>
      ["Health or medical data", "Biometric data", "Children's data", "Financial data", "Location data"].includes(c)
    );
  const specialCat = f.specialCategory || f.specialList.length > 0;

  const conditions: Art30ExemptionDetermination["defeating_conditions"] = [
    {
      condition: "likely_risk",
      label: "the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects",
      met: f.dataCategories.length === 0 ? null : likelyRisk,
      basis: f.dataCategories.length === 0
        ? "No data categories on the record."
        : `Data categories on the record: ${f.dataCategories.join(", ")}.`,
    },
    {
      condition: "not_occasional",
      label: "the processing is not occasional",
      met: f.dataCategories.length === 0 ? null : notOccasional,
      basis: notOccasional
        ? "The record describes standing employee, customer or contact processing, which is continuous rather than occasional."
        : "The record does not establish standing processing; occasionality is unresolved.",
    },
    {
      condition: "special_category",
      label: "the processing includes special categories of data as referred to in Article 9(1)",
      met: specialCat,
      basis: specialCat
        ? `Special categories on the record: ${(f.specialList.length ? f.specialList : ["special-category processing confirmed"]).join(", ")}.`
        : "The record reports no special-category processing.",
    },
  ];

  if (!size) {
    return {
      key: "art30_5_exemption",
      label: "Article 30(5) small-enterprise exemption",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: "The record does not state the headcount band.",
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      under_250_employees: null,
      defeating_conditions: conditions,
      exemption_available: null,
      information_needed:
        "State the number of persons employed. Article 30(5) turns first on whether the enterprise employs fewer than 250 persons.",
    };
  }

  if (!f.under250) {
    return {
      key: "art30_5_exemption",
      label: "Article 30(5) small-enterprise exemption",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record puts headcount in the ${size} band.`,
      application:
        "Article 30(5) is available only to an enterprise or organisation employing fewer than 250 persons. This controller is above that threshold, so the exemption is unavailable and the paragraph 1 record duty applies in full. The three defeating conditions are not reached.",
      verdict: "not_applicable",
      status: "analysed",
      under_250_employees: false,
      defeating_conditions: conditions,
      exemption_available: false,
    };
  }

  const defeated = conditions.filter((c) => c.met === true);
  const unresolved = conditions.filter((c) => c.met === null);

  if (defeated.length > 0) {
    return {
      key: "art30_5_exemption",
      label: "Article 30(5) small-enterprise exemption",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record puts headcount in the ${size} band, below 250 persons. ${defeated.map((c) => c.basis).join(" ")}`,
      application:
        `The exemption is defeated. Any one of the three conditions removes it, and on this record ${defeated.length === 1 ? "one applies" : `${defeated.length} apply`}: ${defeated.map((c) => c.label).join("; ")}. The Article 30(1) record duty therefore applies in full notwithstanding the headcount.`,
      verdict: "not_applicable",
      status: "analysed",
      under_250_employees: true,
      defeating_conditions: conditions,
      exemption_available: false,
    };
  }

  if (unresolved.length > 0) {
    return {
      key: "art30_5_exemption",
      label: "Article 30(5) small-enterprise exemption",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record puts headcount in the ${size} band, below 250 persons, but does not resolve every defeating condition.`,
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      under_250_employees: true,
      defeating_conditions: conditions,
      exemption_available: null,
      information_needed:
        `Resolve the following before the exemption can be relied on: ${unresolved.map((c) => c.label).join("; ")}.`,
    };
  }

  return {
    key: "art30_5_exemption",
    label: "Article 30(5) small-enterprise exemption",
    citation: a.citation,
    standard: a.verbatim,
    record_fact: `The record puts headcount in the ${size} band, below 250 persons, with no special-category processing, no standing processing and no likely risk to rights and freedoms established.`,
    application:
      "On this record none of the three defeating conditions is met, so the exemption is available. It is a narrow one: it lapses the moment processing becomes other than occasional, touches Article 9(1) data, or becomes likely to result in a risk to rights and freedoms.",
    verdict: "satisfied",
    status: "analysed",
    under_250_employees: true,
    defeating_conditions: conditions,
    exemption_available: true,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Op. 4 — DPO determination (three sub-findings)
// ─────────────────────────────────────────────────────────────────────
export function buildDpoDetermination(intake: unknown): DpoDetermination {
  const f = readGovernanceFacts(intake);
  const trig = anchor("dpo_trigger", "GDPR Art. 37(1)");
  const trigA = anchor("dpo_trigger_a", "GDPR Art. 37(1)(a)");
  const trigB = anchor("dpo_trigger_b", "GDPR Art. 37(1)(b)");
  const trigC = anchor("dpo_trigger_c", "GDPR Art. 37(1)(c)");
  const indep = anchor("dpo_independence", "GDPR Art. 38(3)");
  const tasks = anchor("dpo_tasks", "GDPR Art. 39(1)");

  const hasFormal = f.dpoStatus === "Yes, formal DPO";
  const hasInformal = f.dpoStatus === "Yes, informal privacy lead";
  const none = f.dpoStatus === "No";

  const limbA = f.publicAuthority;
  const limbB = f.largeScale &&
    f.dataCategories.some((c) => ["Location data", "Communications content"].includes(c));
  const limbC = f.largeScale && (f.specialCategory || f.specialList.length > 0);
  const required = limbA || limbB || limbC;

  const triggerReasons = [
    limbA ? `(a) applies: the record puts the controller in the ${f.sector} sector, processing carried out by a public authority or body.` : "",
    limbB ? `(b) applies: the record shows core activities at the ${f.size} scale involving ${f.dataCategories.join(", ")}, which is regular and systematic monitoring of data subjects on a large scale.` : "",
    limbC ? `(c) applies: the record shows large-scale processing of special categories (${(f.specialList.length ? f.specialList : ["special-category data"]).join(", ")}).` : "",
  ].filter(Boolean);

  const designation_trigger: Finding = !f.dpoStatus || f.dpoStatus === "n/a"
    ? {
      key: "dpo_designation_trigger",
      label: "Article 37 designation trigger",
      citation: trig.citation,
      standard: [trig.verbatim, trigA.verbatim, trigB.verbatim, trigC.verbatim].filter(Boolean).join(" "),
      record_fact: "The record does not state whether a data protection officer has been designated.",
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        "State whether a data protection officer has been designated, and on what basis. The Article 37(1) trigger is tested independently of whether one happens to have been appointed.",
    }
    : {
      key: "dpo_designation_trigger",
      label: "Article 37 designation trigger",
      citation: trig.citation,
      standard: [trig.verbatim, trigA.verbatim, trigB.verbatim, trigC.verbatim].filter(Boolean).join(" "),
      record_fact: `The record answers the DPO question "${f.dpoStatus}" for a ${f.size} organisation in the ${f.sector || "unstated"} sector.`,
      application: required
        ? `Designation is mandatory here, not discretionary. ${triggerReasons.join(" ")} ${hasFormal ? "A formal DPO is designated, which meets the trigger; what remains to be tested is position and task coverage, not existence." : hasInformal ? "An informal privacy lead is not a designated data protection officer for Article 37 purposes unless the designation is formal and the contact details have been published and communicated to the supervisory authority." : "No designation is recorded, so the Article 37(1) duty is unmet on the face of the record."}`
        : `None of the three limbs of Article 37(1) is established on this record: the controller is not recorded as a public authority or body, and core activities are not shown to consist of large-scale regular and systematic monitoring or of large-scale Article 9 processing. Designation is therefore voluntary. ${hasFormal ? "A DPO has nonetheless been designated; once designated, Articles 38 and 39 apply in full — the voluntary character of the appointment does not soften them." : "Nothing in the record requires one."}`,
      verdict: required ? (hasFormal ? "satisfied" : "not_satisfied") : "not_applicable",
      status: "analysed",
    };

  const position_and_independence: Finding = hasFormal || hasInformal
    ? {
      key: "dpo_position_independence",
      label: "Article 38 position and independence",
      citation: indep.citation,
      standard: [anchor("dpo_involvement", "GDPR Art. 38(1)").verbatim, anchor("dpo_resources", "GDPR Art. 38(2)").verbatim, indep.verbatim, anchor("dpo_conflict", "GDPR Art. 38(6)").verbatim].filter(Boolean).join(" "),
      record_fact: `The record answers "${f.dpoStatus}" and says nothing about reporting line, resourcing, or other duties held by the same person.`,
      application:
        "Article 38 is not discharged by the fact of an appointment. It requires timely involvement in all data-protection issues, resources sufficient to perform the Article 39 tasks, a direct reporting line to the highest management level, freedom from instructions on the exercise of those tasks, and the absence of a conflict of interests from any other duties held. None of those five is evidenced on this record." +
        (hasInformal ? " An informal privacy lead who also owns the systems being assessed is the standard conflict-of-interests case under Article 38(6) and should be tested first." : ""),
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        "Supply the DPO's reporting line, the resources allocated, and the other roles the same individual holds, so the Article 38(1)-(3) and 38(6) requirements can be tested rather than assumed.",
    }
    : {
      key: "dpo_position_independence",
      label: "Article 38 position and independence",
      citation: indep.citation,
      standard: indep.verbatim,
      record_fact: none ? "No data protection officer or privacy lead is recorded." : "The record does not answer the DPO question.",
      application: none
        ? "Article 38 has no subject on this record: there is no designated officer whose position could be tested. If designation is required under Article 37(1), the Article 38 duties crystallise on appointment."
        : "",
      verdict: none ? "not_applicable" : "record_insufficient",
      status: none ? "analysed" : "record_insufficient",
      information_needed: none ? undefined : "State whether a data protection officer has been designated.",
    };

  const task_coverage: Finding = hasFormal || hasInformal
    ? {
      key: "dpo_task_coverage",
      label: "Article 39 task coverage",
      citation: tasks.citation,
      standard: [tasks.verbatim, anchor("dpo_task_a", "GDPR Art. 39(1)(a)").verbatim, anchor("dpo_task_b", "GDPR Art. 39(1)(b)").verbatim, anchor("dpo_task_c", "GDPR Art. 39(1)(c)").verbatim, anchor("dpo_task_d", "GDPR Art. 39(1)(d)").verbatim, anchor("dpo_task_e", "GDPR Art. 39(1)(e)").verbatim].filter(Boolean).join(" "),
      record_fact:
        `The record answers "${f.dpoStatus}". On the adjacent answers, DPIA activity is "${str(get(intake, "dpia_status")) || "unstated"}" and training is "${str(get(intake, "training_status")) || "unstated"}".`,
      application:
        "Article 39(1) sets a floor of five tasks, and two of them are visible in the adjacent answers: monitoring compliance including awareness-raising and training of staff (39(1)(b)), and advising on and monitoring the performance of data protection impact assessments (39(1)(c)). " +
        ((str(get(intake, "dpia_status")).startsWith("Yes") && str(get(intake, "training_status")).startsWith("Yes"))
          ? "Both are evidenced in substance, which is consistent with — but not proof of — the officer performing them. The remaining tasks (informing and advising, cooperating with the supervisory authority, and acting as its contact point) are not addressed by the record."
          : "At least one is not evidenced in substance, so task coverage cannot be said to be complete. The remaining tasks are not addressed by the record at all."),
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        "Confirm, task by task against Article 39(1)(a)-(e), which tasks the designated officer actually performs and how that is recorded.",
    }
    : {
      key: "dpo_task_coverage",
      label: "Article 39 task coverage",
      citation: tasks.citation,
      standard: tasks.verbatim,
      record_fact: none ? "No data protection officer is recorded." : "The record does not answer the DPO question.",
      application: none
        ? "Article 39 has no subject on this record. Where no officer is designated the tasks it lists are not extinguished — they remain controller duties under Articles 5(2) and 24(1) and must be owned by someone."
        : "",
      verdict: none ? "not_applicable" : "record_insufficient",
      status: none ? "analysed" : "record_insufficient",
      information_needed: none ? undefined : "State whether a data protection officer has been designated.",
    };

  const subs = [designation_trigger, position_and_independence, task_coverage];
  const status: DpoDetermination["status"] = subs.every((s) => s.status === "analysed")
    ? "analysed"
    : "record_insufficient";
  const verdict: Verdict = designation_trigger.verdict === "not_satisfied"
    ? "not_satisfied"
    : status === "analysed"
    ? "satisfied"
    : "record_insufficient";

  return { designation_trigger, position_and_independence, task_coverage, verdict, status };
}

// ─────────────────────────────────────────────────────────────────────
// Op. 1 — risk-calibration finding (Art. 24(1) named factors)
// ─────────────────────────────────────────────────────────────────────
export function buildRiskCalibrationFinding(intake: unknown): Finding {
  const f = readGovernanceFacts(intake);
  const a = anchor("appropriateness", "GDPR Art. 24(1)");
  const factors: Array<[string, string]> = [
    ["nature", f.nature],
    ["scope", f.scope],
    ["context", f.context],
    ["purposes", f.purposes],
  ];
  const missing = factors.filter(([, v]) => !v).map(([k]) => k);

  if (missing.length > 0) {
    return {
      key: "risk_calibration",
      label: "Article 24(1) risk calibration",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record supplies ${factors.length - missing.length} of the four factors Article 24(1) names.`,
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        `Article 24(1) makes appropriateness relative to the nature, scope, context and purposes of the processing and to the risks of varying likelihood and severity for the rights and freedoms of natural persons. Supply the missing factor${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Without them any conclusion about whether measures are "appropriate" is an absolute judgment, which is not the test the Article sets.`,
    };
  }

  const risk = f.specialCategory || f.specialList.length > 0 ||
    f.dataCategories.some((c) => ["Health or medical data", "Biometric data", "Children's data"].includes(c));
  const controls = str(get(intake, "technical_controls"));
  const controlsStrong = controls === "Yes — DLP/content filtering actively enforced";

  return {
    key: "risk_calibration",
    label: "Article 24(1) risk calibration",
    citation: a.citation,
    standard: a.verbatim,
    record_fact:
      `Nature: ${f.nature} Scope: ${f.scope} Context: ${f.context} Purposes: ${f.purposes} Data categories: ${f.dataCategories.join(", ") || "unstated"}. Technical controls: ${controls || "unstated"}.`,
    application: risk
      ? `The four named factors put this controller's processing at the higher end of the risk range: the categories on the record carry a severity that survives a low likelihood, so the measures must be calibrated to severity, not to incident frequency. ${controlsStrong ? "Enforced technical controls are consistent with that calibration; what makes them appropriate rather than merely present is evidence of their effectiveness against the specific harms these categories create." : "The recorded control set is not enforced across the estate, which is a mismatch: measures that stop at policy and training are not calibrated to processing of this severity."}`
      : `The four named factors put this controller's processing at the lower end of the risk range. Appropriateness is relative, so a lighter measure set can be appropriate here in a way it would not be for special-category or large-scale monitoring processing. ${controlsStrong ? "The recorded controls exceed what this risk profile demands, which is permissible but should not be read as a compliance surplus that offsets weaknesses elsewhere." : "The recorded control set is proportionate on its face to this profile, provided the profile itself is accurate and is re-tested when processing changes."}`,
    verdict: risk && !controlsStrong ? "not_satisfied" : "satisfied",
    status: "analysed",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Op. 5 — review-and-update finding (Art. 24(1), second sentence)
// ─────────────────────────────────────────────────────────────────────
export function buildReviewAndUpdateFinding(intake: unknown): Finding {
  const f = readGovernanceFacts(intake);
  const a = anchor("review", "GDPR Art. 24(1)");

  if (!f.cadence) {
    return {
      key: "review_and_update",
      label: "Article 24(1) review and update",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: "The record states no review cadence for the measure set.",
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        "State the review cadence for the technical and organisational measures and the date they were last reviewed. The second sentence of Article 24(1) is a standing obligation distinct from the appropriateness clause; it cannot be answered from the appropriateness evidence.",
    };
  }

  const adequate = ADEQUATE_CADENCES.includes(f.cadence);
  const noCadence = f.cadence === "No defined cadence";

  if (!f.lastReview) {
    return {
      key: "review_and_update",
      label: "Article 24(1) review and update",
      citation: a.citation,
      standard: a.verbatim,
      record_fact: `The record states a cadence of "${f.cadence}" but no date of last review.`,
      application: "",
      verdict: "record_insufficient",
      status: "record_insufficient",
      information_needed:
        "Supply the date the measures were last reviewed. A stated cadence with no executed review is a plan, and the obligation is to have reviewed and updated the measures where necessary, not to intend to.",
    };
  }

  return {
    key: "review_and_update",
    label: "Article 24(1) review and update",
    citation: a.citation,
    standard: a.verbatim,
    record_fact: `The record states a review cadence of "${f.cadence}", last executed ${f.lastReview}.`,
    application: noCadence
      ? "The second sentence of Article 24(1) is not satisfied. Measures reviewed on no defined cadence are reviewed on none: the obligation is continuing, and a controller that cannot say when the next review falls cannot show the measures are updated where necessary."
      : adequate
      ? `A cadence of "${f.cadence}" with an executed review on ${f.lastReview} answers the second sentence on its face. It answers it only on its face: the obligation is to update where necessary, so the review must be shown to have produced changes where the processing changed, not merely to have occurred.`
      : `A cadence of "${f.cadence}" is long enough that the measure set can fall out of step with the processing between reviews. The second sentence of Article 24(1) is triggered by necessity, not by the calendar, so this cadence must be paired with an event trigger — material change to processing, to vendors, or to the risk profile — to be defensible.`,
    verdict: noCadence ? "not_satisfied" : adequate ? "satisfied" : "partially_satisfied",
    status: "analysed",
  };
}

// ─────────────────────────────────────────────────────────────────────
// HEADLINE — accountability determination (Arts. 5(2) / 24(1))
// ─────────────────────────────────────────────────────────────────────
export function buildAccountabilityDetermination(
  intake: unknown,
  demonstrability: DemonstrabilityFinding[],
  riskCalibration: Finding,
  review: Finding,
): AccountabilityDetermination {
  const acct = anchor("accountability", "GDPR Art. 5(2)");
  const app = anchor("appropriateness", "GDPR Art. 24(1)");

  const unevidenced = demonstrability
    .filter((d) => d.artifact_present === "no" || d.artifact_present === "partial" || d.artifact_present === "unknown")
    .map((d) => d.duty);
  const unknownCount = demonstrability.filter((d) => d.artifact_present === "unknown").length;
  const evidenced = demonstrability.filter((d) => d.artifact_present === "yes").length;

  const demonstrability_verdict: Verdict = unknownCount > demonstrability.length / 2
    ? "record_insufficient"
    : unevidenced.length === 0
    ? "satisfied"
    : evidenced >= demonstrability.length / 2
    ? "partially_satisfied"
    : "not_satisfied";

  const appropriateness_verdict: Verdict = riskCalibration.verdict;

  const rank: Record<Verdict, number> = {
    satisfied: 0,
    partially_satisfied: 1,
    not_applicable: 0,
    not_satisfied: 2,
    record_insufficient: 3,
  };
  const worst = [demonstrability_verdict, appropriateness_verdict, review.verdict]
    .reduce((acc, v) => (rank[v] > rank[acc] ? v : acc), "satisfied" as Verdict);

  const status = worst === "record_insufficient" ? "record_insufficient" : "analysed";

  const reasoning = status === "record_insufficient"
    ? `The record does not yet support a determination. ${unknownCount} of ${demonstrability.length} accountability duties are unanswered, and the Article 24(1) factors or review evidence are incomplete. Article 5(2) places the burden on the controller to be able to demonstrate compliance, so an unanswered duty is not neutral — it is an unevidenced duty until the artifact is produced.`
    : `Demonstrability: ${evidenced} of ${demonstrability.length} accountability duties on this record are evidenced by an artifact the controller could produce to a supervisory authority; ${unevidenced.length} ${unevidenced.length === 1 ? "is" : "are"} not. Appropriateness: ${riskCalibration.verdict === "satisfied" ? "the measure set is calibrated to the nature, scope, context and purposes Article 24(1) names" : "the measure set is not calibrated to the nature, scope, context and purposes Article 24(1) names"}. Review: ${review.verdict === "satisfied" ? "the measures are reviewed and updated on a defined cadence that has actually been executed" : review.verdict === "partially_satisfied" ? "the review cadence is defined but too infrequent to carry the second sentence of Article 24(1) unaided" : "the measures are not on a defined review cadence"}. Taken together the controller ${worst === "satisfied" ? "can, on this record, demonstrate compliance with measures appropriate to its risk" : worst === "partially_satisfied" ? "can demonstrate compliance in part only; the unevidenced duties below are where an authority's first request would land" : "cannot presently demonstrate compliance to the standard Article 5(2) sets"}.`;

  return {
    standard_demonstrability: acct.verbatim,
    standard_appropriateness: app.verbatim,
    citation: `${acct.citation}; ${app.citation}`,
    demonstrability_verdict,
    appropriateness_verdict,
    verdict: worst,
    reasoning,
    unevidenced_duties: unevidenced,
    status,
    information_needed: status === "record_insufficient"
      ? "Complete the unanswered accountability duties and the Article 24(1) factors before relying on any headline conclusion."
      : undefined,
  };
}

/** DEMOTION LAW — turn a surviving maturity tier into a labelled aid. */
export function demoteMaturityTier(tier: unknown): MaturityTierAid | undefined {
  const t = str(tier);
  if (!t) return undefined;
  return {
    tier: t,
    label: "Non-statutory readability aid",
    statutory_basis: "none",
    caveat:
      "This tier is a readability aid only. No provision of the GDPR establishes maturity tiers, and no supervisory authority assesses a controller against them. The operative conclusion for this assessment is the accountability determination under Articles 5(2) and 24(1).",
    superseded_by: "accountability_determination",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Composite builder + attach
// ─────────────────────────────────────────────────────────────────────
export function buildGovernanceDeliverables(
  intake: unknown,
  maturityTier?: unknown,
): GovernanceDeliverables {
  const demonstrability_findings = buildDemonstrabilityFindings(intake);
  const risk_calibration_finding = buildRiskCalibrationFinding(intake);
  const review_and_update_finding = buildReviewAndUpdateFinding(intake);
  return {
    accountability_determination: buildAccountabilityDetermination(
      intake,
      demonstrability_findings,
      risk_calibration_finding,
      review_and_update_finding,
    ),
    demonstrability_findings,
    art30_element_findings: buildArt30ElementFindings(intake),
    art30_exemption_determination: buildArt30ExemptionDetermination(intake),
    dpo_determination: buildDpoDetermination(intake),
    risk_calibration_finding,
    review_and_update_finding,
    maturity_tier_readability_aid: demoteMaturityTier(maturityTier),
  };
}

/**
 * SINGLE-WRITER attach. Fail-open: returns telemetry, never throws.
 *
 * Behaviour change (Item 313): `overall_readiness_rating` and
 * `readiness_rationale` are REMOVED from the top level of the report and the
 * tier is re-emitted, labelled, under `maturity_tier_readability_aid`.
 */
export function attachGovernanceDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const tier = report.overall_readiness_rating;
    const built = buildGovernanceDeliverables(intake, tier);

    report.accountability_determination = built.accountability_determination;
    report.demonstrability_findings = built.demonstrability_findings;
    report.art30_element_findings = built.art30_element_findings;
    report.art30_exemption_determination = built.art30_exemption_determination;
    report.dpo_determination = built.dpo_determination;
    report.risk_calibration_finding = built.risk_calibration_finding;
    report.review_and_update_finding = built.review_and_update_finding;

    // DEMOTION LAW — the tier can no longer be the headline conclusion.
    if (built.maturity_tier_readability_aid) {
      report.maturity_tier_readability_aid = built.maturity_tier_readability_aid;
    }
    delete report.overall_readiness_rating;
    delete report.readiness_rationale;

    return {
      version: GOVERNANCE_DELIVERABLES_VERSION,
      ok: true,
      headline_verdict: built.accountability_determination.verdict,
      demonstrability_verdict: built.accountability_determination.demonstrability_verdict,
      unevidenced_duties: built.accountability_determination.unevidenced_duties.length,
      art30_elements_analysed: built.art30_element_findings.filter((e) => e.status === "analysed").length,
      art30_exemption_available: built.art30_exemption_determination.exemption_available,
      dpo_verdict: built.dpo_determination.verdict,
      risk_calibration_verdict: built.risk_calibration_finding.verdict,
      review_verdict: built.review_and_update_finding.verdict,
      tier_demoted: Boolean(built.maturity_tier_readability_aid),
    };
  } catch (e) {
    return {
      version: GOVERNANCE_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? "unknown",
    };
  }
}
