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
  ADEQUACY_MECHANISMS,
  ADEQUATE_CADENCES,
  anchor,
  ART30_CONTROL_QUESTIONS,
  ART30_ELEMENTS,
  CONTROL_QUESTIONS,
  DEFAULT_VALIDATION_METHOD,
  DEMONSTRABILITY_DUTIES,
  DOMAIN_LABELS,
  DOMAIN_TRACKER,
  DUTY_CONTROL_QUESTIONS,
  EU_JURISDICTION,
  LARGE_SCALE_SIZES,
  MECHANISM_REGIME,
  PUBLIC_AUTHORITY_SECTORS,
  REMEDIATION_PRIORITIES,
  SAFEGUARD_MECHANISMS,
  TRANSFER_NOT_OCCURRING,
  TRANSFER_OCCURRING,
  UK_JURISDICTION,
  UNDER_250_SIZES,
} from "./elements.ts";
import type {
  AccountabilityDetermination,
  Art30ElementFinding,
  Art30ExemptionDetermination,
  DemonstrabilityFinding,
  DomainElementFinding,
  DpoDetermination,
  Finding,
  GovernanceDeliverables,
  GovernanceDomain,
  MaturityTierAid,
  RemediationPriority,
  RemediationRecord,
  TransferAnalysis,
  Verdict,
} from "./types.ts";

export const GOVERNANCE_DELIVERABLES_VERSION =
  "governance-deliverables-item327-2026-08-01";

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


// ─────────────────────────────────────────────────────────────────────
// Op. 8 — Chapter V international transfers — ITEM 327
//
// DISTINCT-RAIL LAW: UK Chapter V is not the EU chapter re-branded.
//   * UK Art. 44 is OMITTED (DUAA 2025, s. 142(1), Sch. 7 para. 2(1);
//     S.I. 2026/82). The UK general principle is Art. 44A. A UK leg cited
//     to Art. 44 is an accuracy defect, not a stylistic one.
//   * UK adequacy is made by the Secretary of State under Art. 45A and
//     tested under Art. 45B — "not materially lower" than the UK
//     Regulation and the 2018 Act — not the EU essential-equivalence test.
//   * UK Art. 46 clause sets are those specified by the Secretary of State
//     (Art. 47A(1)) or issued by the Commissioner under s. 119A DPA 2018
//     (the IDTA and the Addendum), and the exporter must itself judge the
//     Art. 46(6) test reasonably and proportionately (Art. 46(7)).
//
// Branches off the RECORDED `jurisdictions` array and the RECORDED
// `transfer_mechanism` / `transfer_status` values only — closed lexicons,
// no semantic defaults. Unrecognised or absent values degrade under the
// MANDATORY DEGRADATION LAW; they never pick a regime by guesswork.
// ─────────────────────────────────────────────────────────────────────
export function readTransferFacts(intake: unknown): {
  jurisdictions: string[];
  eu: boolean;
  uk: boolean;
  regime: TransferAnalysis["regime"];
  transferStatus: string;
  mechanism: string;
  occurring: boolean | null;
  mechanismRegime: TransferAnalysis["mechanism_regime"];
} {
  const jurisdictions = arr(get(intake, "jurisdictions"));
  const eu = jurisdictions.includes(EU_JURISDICTION);
  const uk = jurisdictions.includes(UK_JURISDICTION);
  const regime: TransferAnalysis["regime"] = eu && uk
    ? "dual"
    : uk
    ? "uk"
    : eu
    ? "eu"
    : "not_engaged";
  const transferStatus = str(get(intake, "transfer_status"));
  const mechanismRaw = str(get(intake, "transfer_mechanism"));
  const mechanism = mechanismRaw === "n/a" ? "" : mechanismRaw;
  const occurring = TRANSFER_OCCURRING.includes(transferStatus)
    ? true
    : TRANSFER_NOT_OCCURRING.includes(transferStatus)
    ? false
    : null;
  const mechanismRegime: TransferAnalysis["mechanism_regime"] = mechanism
    ? (MECHANISM_REGIME[mechanism] ?? "unrecorded")
    : "unrecorded";
  return {
    jurisdictions,
    eu,
    uk,
    regime,
    transferStatus,
    mechanism,
    occurring,
    mechanismRegime,
  };
}

export function buildTransferAnalysis(intake: unknown): TransferAnalysis {
  const f = readTransferFacts(intake);

  const euPrinciple = anchor("eu_transfers_principle", "GDPR Art. 44");
  const euSafeguards = anchor("eu_transfers_safeguards", "GDPR Art. 46(1)");
  const euSccs = anchor("eu_transfers_sccs", "GDPR Art. 46(2)(c)");
  const euBcrs = anchor("eu_transfers_bcrs", "GDPR Art. 46(2)(b)");

  const ukOmitted = anchor("uk_art44_omitted", "UK GDPR Art. 44 (omitted)");
  const ukPrinciple = anchor("uk_transfers_principle", "UK GDPR Art. 44A(1)");
  const ukAdequacyRoute = anchor("uk_transfers_adequacy_route", "UK GDPR Art. 44A(2)(a)");
  const ukSafeguardsRoute = anchor("uk_transfers_safeguards_route", "UK GDPR Art. 44A(2)(b)");
  const ukAdequacyPower = anchor("uk_adequacy_power", "UK GDPR Art. 45A(2)");
  const ukAdequacyTest = anchor("uk_adequacy_test", "UK GDPR Art. 45B(1)");
  const ukSafeguards = anchor("uk_transfers_safeguards", "UK GDPR Art. 46(1A)");
  const ukOwnAssessment = anchor("uk_transfers_own_assessment", "UK GDPR Art. 46(1A)(a)(ii)");
  const ukSosClauses = anchor("uk_transfers_sos_clauses", "UK GDPR Art. 46(2)(c)");
  const ukIcoClauses = anchor("uk_transfers_ico_clauses", "UK GDPR Art. 46(2)(d)");
  const ukBcrs = anchor("uk_transfers_bcrs", "UK GDPR Art. 46(2)(b)");
  const ukTest = anchor("uk_transfers_test", "UK GDPR Art. 46(6)");
  const ukProportionate = anchor("uk_transfers_proportionate", "UK GDPR Art. 46(7)");
  const ukSosPower = anchor("uk_sos_clauses_power", "UK GDPR Art. 47A(1)");

  const citations_used: string[] = [];
  const cite = (c: string) => {
    if (c && !citations_used.includes(c)) citations_used.push(c);
  };

  // ── record fact ────────────────────────────────────────────────────
  const factParts: string[] = [];
  factParts.push(
    f.jurisdictions.length
      ? `The record states the jurisdictions in scope as ${f.jurisdictions.map((j) => `"${j}"`).join(", ")}.`
      : "The record does not state which jurisdictions are in scope.",
  );
  factParts.push(
    f.transferStatus && f.transferStatus !== "n/a"
      ? `It records cross-border transfer status as "${f.transferStatus}".`
      : "It does not record whether personal data is transferred outside the EEA or the United Kingdom.",
  );
  factParts.push(
    f.mechanism
      ? `It records the transfer mechanism in place as "${f.mechanism}".`
      : "It records no transfer mechanism.",
  );
  const record_fact = factParts.join(" ");

  // ── standard, per engaged rail ─────────────────────────────────────
  let standard = "";
  let citation = "";
  let benchmark_citation = "";
  let benchmark_verbatim = "";
  const parts: string[] = [];

  const euRail = () => {
    cite(euPrinciple.citation);
    parts.push(
      `Under the EU chapter the general principle in Article 44 governs: "${euPrinciple.verbatim}" A transfer to a third country is lawful only on an adequacy decision, on Article 46 appropriate safeguards, or on an Article 49 derogation.`,
    );
    if (f.mechanism && SAFEGUARD_MECHANISMS.includes(f.mechanism)) {
      cite(euSafeguards.citation);
      parts.push(`Article 46(1) sets the safeguards route: "${euSafeguards.verbatim}"`);
      if (/SCC/i.test(f.mechanism)) {
        cite(euSccs.citation);
        parts.push(`The recorded mechanism is the Commission clause set — Article 46(2)(c): "${euSccs.verbatim}"`);
      }
      if (/Binding Corporate Rules/i.test(f.mechanism)) {
        cite(euBcrs.citation);
        parts.push(`Binding corporate rules are an Article 46(2)(b) safeguard: "${euBcrs.verbatim}"`);
      }
    }
  };

  const ukRail = () => {
    cite(ukPrinciple.citation);
    cite(ukOmitted.citation);
    parts.push(
      `The UK chapter is a different body of law, not the EU chapter under another name. ${ukOmitted.verbatim} The operative UK general principle is Article 44A(1): "${ukPrinciple.verbatim}", and the condition is met only where the transfer is approved by adequacy regulations, is made subject to appropriate safeguards, or relies on a derogation — Article 44A(2)(a): "${ukAdequacyRoute.verbatim}"; Article 44A(2)(b): "${ukSafeguardsRoute.verbatim}"`,
    );
    if (f.mechanism && ADEQUACY_MECHANISMS.includes(f.mechanism)) {
      cite(ukAdequacyPower.citation);
      cite(ukAdequacyTest.citation);
      parts.push(
        `The recorded mechanism is an adequacy route, so the governing UK instrument is regulations made by the Secretary of State under Article 45A, not a Commission adequacy decision: "${ukAdequacyPower.verbatim}" The benchmark those regulations must satisfy is the Article 45B data protection test, which is not the EU essential-equivalence standard: "${ukAdequacyTest.verbatim}" this Regulation, Part 2 of the 2018 Act, and Parts 5 to 7 of that Act so far as relevant to general processing.`,
      );
      benchmark_citation = ukAdequacyTest.citation || "UK GDPR Art. 45B(1)";
      benchmark_verbatim = ukAdequacyTest.verbatim;
    }
    if (f.mechanism && SAFEGUARD_MECHANISMS.includes(f.mechanism)) {
      cite(ukSafeguards.citation);
      cite(ukSosClauses.citation);
      cite(ukIcoClauses.citation);
      cite(ukSosPower.citation);
      parts.push(
        `The recorded mechanism is a safeguards route. Under Article 46(1A) a UK transfer "${ukSafeguards.verbatim}" where the listed safeguards are provided and the exporter itself judges the data protection test met. The UK clause sets are not Commission standard contractual clauses: they are those specified by the Secretary of State under Article 47A(1) — Article 46(2)(c): "${ukSosClauses.verbatim}" — and those issued by the Commissioner under section 119A of the Data Protection Act 2018 — Article 46(2)(d): "${ukIcoClauses.verbatim}" The Secretary of State's power reads: "${ukSosPower.verbatim}"`,
      );
      if (/Binding Corporate Rules/i.test(f.mechanism)) {
        cite(ukBcrs.citation);
        parts.push(`Binding corporate rules take effect in UK law through Article 46(2)(b) — "${ukBcrs.verbatim}" — and are approved by the Commissioner, not by an EU supervisory authority.`);
      }
      cite(ukTest.citation);
      cite(ukOwnAssessment.citation);
      cite(ukProportionate.citation);
      parts.push(
        `The exporter carries its own assessment duty: Article 46(1A)(a)(ii) requires that "${ukOwnAssessment.verbatim}" and Article 46(6) fixes that test as whether, after the transfer, "${ukTest.verbatim}" this Regulation, Part 2 of the 2018 Act, and Parts 5 to 7 of that Act. Article 46(7) sets the standard of that judgement: "${ukProportionate.verbatim}"`,
      );
      if (!benchmark_citation) {
        benchmark_citation = ukTest.citation || "UK GDPR Art. 46(6)";
        benchmark_verbatim = ukTest.verbatim;
      }
    }
  };

  if (f.regime === "uk") {
    standard = ukPrinciple.verbatim;
    citation = ukPrinciple.citation || "UK GDPR Art. 44A(1)";
    ukRail();
  } else if (f.regime === "eu") {
    standard = euPrinciple.verbatim;
    citation = euPrinciple.citation || "GDPR Art. 44";
    euRail();
    if (!benchmark_citation) {
      benchmark_citation = euSafeguards.citation || "GDPR Art. 46(1)";
      benchmark_verbatim = euSafeguards.verbatim;
    }
  } else if (f.regime === "dual") {
    standard = euPrinciple.verbatim;
    citation = euPrinciple.citation || "GDPR Art. 44";
    parts.push(
      "The record puts both the EU and the UK chapter in scope. Each transfer leg is analysed under its own chapter; neither chapter's mechanism, benchmark or article numbering is carried across to the other.",
    );
    euRail();
    ukRail();
  } else {
    parts.push(
      "The record engages neither the EU nor the UK regime, so no Chapter V transfer analysis is performed here. US state privacy laws impose no Article 45/46-style transfer-mechanism requirement; any transfer exposure under another recorded framework is assessed under that framework's own provisions.",
    );
  }

  // ── mechanism / regime coherence ───────────────────────────────────
  let mechanism_regime_mismatch = false;
  if (f.regime !== "not_engaged" && f.mechanism && f.mechanismRegime !== "unrecorded") {
    if (f.mechanismRegime === "uk" && !f.uk) mechanism_regime_mismatch = true;
    if (f.mechanismRegime === "eu" && !f.eu) mechanism_regime_mismatch = true;
    if (mechanism_regime_mismatch) {
      parts.push(
        `The recorded mechanism "${f.mechanism}" belongs to the ${f.mechanismRegime === "uk" ? "UK" : "EU"} chapter, but the record does not put that chapter in scope. Either the jurisdictions or the mechanism is mis-recorded; the mechanism is not treated as validating a leg under the chapter that is in scope.`,
      );
    }
  }

  // ── verdict + degradation ──────────────────────────────────────────
  let verdict: Verdict;
  let status: TransferAnalysis["status"] = "analysed";
  let information_needed: string | undefined;

  if (f.regime === "not_engaged") {
    verdict = f.jurisdictions.length ? "not_applicable" : "record_insufficient";
    if (!f.jurisdictions.length) {
      status = "record_insufficient";
      information_needed =
        "The jurisdictions in scope. Without them no Chapter V rail — EU or UK — can be identified, and no transfer mechanism can be assessed against the right benchmark.";
    }
  } else if (f.occurring === false) {
    verdict = "not_applicable";
    parts.push(
      "The record states that all tools store data in the EEA or the United Kingdom, so on the record as it stands no restricted transfer is made and the mechanism question does not arise.",
    );
  } else if (f.occurring === null) {
    verdict = "record_insufficient";
    status = "record_insufficient";
    information_needed =
      "Whether personal data is transferred to, or accessible from, a third country, and if so which countries. Record that and the Chapter V analysis can be closed rather than stated as a rail.";
  } else if (!f.mechanism) {
    verdict = "not_satisfied";
    parts.push(
      "The record states that a restricted transfer is made but records no mechanism for it. On the record as it stands the transfer has no lawful route under the chapter identified above.",
    );
  } else if (mechanism_regime_mismatch) {
    verdict = "partially_satisfied";
    information_needed =
      "Confirmation of which chapter each transfer leg runs under, and the mechanism actually executed for that leg — the recorded mechanism and the recorded jurisdictions belong to different chapters.";
  } else {
    verdict = "partially_satisfied";
    information_needed =
      "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment; for an EU leg, the Commission clause set and its transfer impact assessment. The record names the mechanism type but not the executed document, so the leg cannot be closed as satisfied.";
  }

  return {
    key: "chapter_v_transfers",
    label: "International transfers — Chapter V",
    citation,
    standard,
    record_fact,
    application: parts.join(" "),
    verdict,
    status,
    regime: f.regime,
    transfer_status: f.transferStatus,
    mechanism: f.mechanism,
    mechanism_regime: f.mechanismRegime,
    mechanism_regime_mismatch,
    benchmark_citation,
    benchmark_verbatim,
    citations_used,
    ...(information_needed ? { information_needed } : {}),
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
// GOVERNANCE UPGRADE ITEM 2 — remediation records.
//
// A remediation record attaches to EVERY adverse finding. It is read from the
// record, never invented: a missing owner, date or priority produces a
// `record_insufficient` remediation record naming exactly what is missing.
// The validation method is the one field that may fall back to the standard
// menu, and when it does the fallback is disclosed on the record itself.
// ─────────────────────────────────────────────────────────────────────
const ADVERSE_VERDICTS: readonly Verdict[] = [
  "not_satisfied",
  "partially_satisfied",
  "record_insufficient",
];

export function isAdverse(verdict: Verdict): boolean {
  return ADVERSE_VERDICTS.includes(verdict);
}

interface RemediationInput {
  accountable_owner: string;
  target_date: string;
  priority: string;
  validation_method: string;
}

function readRemediationEntry(v: unknown): Partial<RemediationInput> & { finding_key?: string; domain?: string } {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  return {
    finding_key: str(o.finding_key),
    domain: str(o.domain),
    accountable_owner: str(o.accountable_owner),
    target_date: str(o.target_date),
    priority: str(o.priority),
    validation_method: str(o.validation_method),
  };
}

export function readRemediationIntake(intake: unknown): {
  defaults: Partial<RemediationInput>;
  byKey: Record<string, Partial<RemediationInput>>;
  byDomain: Record<string, Partial<RemediationInput>>;
} {
  const nested = readRemediationEntry(get(intake, "remediation_defaults"));
  // Flat intake keys are the form's own shape; the nested object wins when both
  // are present, because it is what a caller supplying a plan sends.
  const defaults: Partial<RemediationInput> = {
    accountable_owner: nested.accountable_owner || str(get(intake, "remediation_default_owner")),
    target_date: nested.target_date || str(get(intake, "remediation_default_target_date")),
    priority: nested.priority || str(get(intake, "remediation_default_priority")),
    validation_method: nested.validation_method || str(get(intake, "remediation_default_validation_method")),
  };
  const byKey: Record<string, Partial<RemediationInput>> = {};
  const byDomain: Record<string, Partial<RemediationInput>> = {};
  const rows = get(intake, "remediation_plan");
  if (Array.isArray(rows)) {
    for (const raw of rows) {
      const e = readRemediationEntry(raw);
      if (e.finding_key) byKey[e.finding_key] = e;
      else if (e.domain) byDomain[e.domain] = e;
    }
  }
  return { defaults, byKey, byDomain };
}

function normalisePriority(v: string): RemediationPriority {
  return (REMEDIATION_PRIORITIES as readonly string[]).includes(v)
    ? (v as RemediationPriority)
    : "unspecified";
}

export function buildRemediationRecord(
  findingKey: string,
  domain: GovernanceDomain,
  intake: unknown,
): RemediationRecord {
  const { defaults, byKey, byDomain } = readRemediationIntake(intake);
  const src = byKey[findingKey] ?? byDomain[domain] ?? {};

  const accountable_owner = src.accountable_owner || defaults.accountable_owner || "";
  const target_date = src.target_date || defaults.target_date || "";
  const priorityRaw = src.priority || defaults.priority || "";
  const priority = normalisePriority(priorityRaw);
  const recordedMethod = src.validation_method || defaults.validation_method || "";

  const missing: string[] = [];
  if (!accountable_owner) missing.push("the accountable owner (name or role)");
  if (!target_date) missing.push("the target date");
  if (priority === "unspecified") missing.push("the remediation priority");

  return {
    finding_key: findingKey,
    domain,
    accountable_owner,
    target_date,
    priority,
    validation_method: recordedMethod || DEFAULT_VALIDATION_METHOD,
    validation_method_source: recordedMethod ? "recorded" : "default",
    status: missing.length > 0 ? "record_insufficient" : "analysed",
    ...(missing.length > 0
      ? {
        information_needed:
          `Supply ${missing.join(", ")} for this finding. A remediation entry without an owner and a date is not a plan, and cannot be tested at the next review.`,
      }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────
// GOVERNANCE UPGRADE ITEM 1 — the generalised domain element findings.
//
// Every deliverable is projected into the same tracker record across every
// assessed domain. SINGLE-WRITER: this projection reads the findings the
// builders above already produced; it never re-decides a verdict.
// ─────────────────────────────────────────────────────────────────────
function answerFor(intake: unknown, keys: readonly string[]): string {
  const parts = keys
    .map((k) => {
      const v = get(intake, k);
      const text = Array.isArray(v) ? arr(v).join(", ") : str(v);
      return unanswered(text) ? "" : `${k} = ${text}`;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "The record does not answer this control question.";
}

function evidenceFor(intake: unknown, keys: readonly string[]): string {
  const present = keys.filter((k) => {
    const v = get(intake, k);
    const text = Array.isArray(v) ? arr(v).join(", ") : str(v);
    return !unanswered(text);
  });
  return present.length > 0
    ? `Record fields reviewed: ${present.join(", ")}.`
    : "No record content addresses this control.";
}

/** Intake keys consulted for each non-duty, non-Art. 30 finding. */
const FINDING_ANSWER_KEYS: Record<string, readonly string[]> = {
  accountability_determination: ["privacy_policy", "inventory_audit", "dpia_status", "training_status", "dpa_status", "technical_controls", "incident_response", "dsr_capability"],
  art30_5_exemption: ["org_size", "data_categories", "special_category", "special_categories_list"],
  dpo_designation_trigger: ["dpo_status", "sector", "org_size", "data_categories"],
  dpo_position_independence: ["dpo_status", "additional_context"],
  dpo_task_coverage: ["dpo_status", "dpia_status", "training_status"],
  risk_calibration: ["processing_nature", "processing_scope", "processing_context", "processing_purposes", "technical_controls"],
  review_and_update: ["measures_review_cadence", "measures_last_review_date"],
  chapter_v_transfers: ["jurisdictions", "transfer_status", "transfer_mechanism"],
};

function toDomainFinding(
  base: Finding,
  domain: GovernanceDomain,
  control_question: string,
  answerKeys: readonly string[],
  intake: unknown,
): DomainElementFinding {
  const tracker = DOMAIN_TRACKER[domain];
  // SHAPE LAW — a projected finding always carries all four parts. Where the
  // source builder left the application empty (record_insufficient), the
  // projection states the honest reason rather than leaving a blank part.
  const application = base.application ||
    `The record carries nothing that can be applied to this standard, so no conclusion is reached on the merits. ${
      base.information_needed ?? "The missing content must be supplied before this control can be tested."
    }`;
  const finding: DomainElementFinding = {
    ...base,
    application,
    domain,
    domain_label: DOMAIN_LABELS[domain],
    regulator_expectation: tracker.regulator_expectation,
    control_question,
    customer_answer: answerFor(intake, answerKeys),
    evidence_reviewed: evidenceFor(intake, answerKeys),
  };
  if (isAdverse(base.verdict)) {
    finding.remediation = buildRemediationRecord(base.key, domain, intake);
  }
  return finding;
}

export function buildDomainElementFindings(
  intake: unknown,
  parts: {
    accountability: AccountabilityDetermination;
    demonstrability: DemonstrabilityFinding[];
    art30: Art30ElementFinding[];
    art30Exemption: Art30ExemptionDetermination;
    dpo: DpoDetermination;
    riskCalibration: Finding;
    review: Finding;
    transfers: TransferAnalysis;
  },
): DomainElementFinding[] {
  const out: DomainElementFinding[] = [];

  // Headline accountability determination, expressed as a tracker row.
  out.push(toDomainFinding(
    {
      key: "accountability_determination",
      label: "Accountability — demonstrability and appropriateness",
      citation: parts.accountability.citation,
      standard: [parts.accountability.standard_demonstrability, parts.accountability.standard_appropriateness]
        .filter(Boolean).join(" "),
      record_fact: parts.accountability.unevidenced_duties.length > 0
        ? `The record leaves ${parts.accountability.unevidenced_duties.length} accountability ${parts.accountability.unevidenced_duties.length === 1 ? "duty" : "duties"} unevidenced: ${parts.accountability.unevidenced_duties.join("; ")}.`
        : "Every accountability duty on the record is evidenced by a named artifact.",
      application: parts.accountability.reasoning,
      verdict: parts.accountability.verdict,
      status: parts.accountability.status,
      ...(parts.accountability.information_needed
        ? { information_needed: parts.accountability.information_needed }
        : {}),
    },
    "accountability",
    CONTROL_QUESTIONS.accountability_determination,
    FINDING_ANSWER_KEYS.accountability_determination,
    intake,
  ));

  // Evidence-of-compliance duties.
  for (const d of parts.demonstrability) {
    const duty = DEMONSTRABILITY_DUTIES.find((x) => x.key === d.key);
    out.push(toDomainFinding(
      d,
      "demonstrability",
      DUTY_CONTROL_QUESTIONS[d.key] ??
        `Can the organisation produce the artifact that evidences this duty: ${d.evidencing_artifact}?`,
      duty ? [duty.intake_key] : [],
      intake,
    ));
  }

  // Records of processing — element walk plus the exemption determination.
  for (const el of parts.art30) {
    const def = ART30_ELEMENTS.find((x) => x.element === el.element);
    out.push(toDomainFinding(
      el,
      "records_of_processing",
      ART30_CONTROL_QUESTIONS[el.element] ?? `Does the record cover ${el.label.toLowerCase()}?`,
      def?.evidence_keys ?? [],
      intake,
    ));
  }
  out.push(toDomainFinding(
    parts.art30Exemption,
    "records_of_processing",
    CONTROL_QUESTIONS.art30_5_exemption,
    FINDING_ANSWER_KEYS.art30_5_exemption,
    intake,
  ));

  // Data protection officer — three sub-findings, never a boolean.
  for (const sub of [parts.dpo.designation_trigger, parts.dpo.position_and_independence, parts.dpo.task_coverage]) {
    out.push(toDomainFinding(
      sub,
      "dpo",
      CONTROL_QUESTIONS[sub.key] ?? sub.label,
      FINDING_ANSWER_KEYS[sub.key] ?? ["dpo_status"],
      intake,
    ));
  }

  out.push(toDomainFinding(
    parts.riskCalibration,
    "risk_calibration",
    CONTROL_QUESTIONS.risk_calibration,
    FINDING_ANSWER_KEYS.risk_calibration,
    intake,
  ));

  out.push(toDomainFinding(
    parts.review,
    "review_and_update",
    CONTROL_QUESTIONS.review_and_update,
    FINDING_ANSWER_KEYS.review_and_update,
    intake,
  ));

  out.push(toDomainFinding(
    parts.transfers,
    "international_transfers",
    CONTROL_QUESTIONS.chapter_v_transfers,
    FINDING_ANSWER_KEYS.chapter_v_transfers,
    intake,
  ));

  return out;
}

/** The remediation table that closes each domain section, in walk order. */
export function buildRemediationPlan(findings: DomainElementFinding[]): RemediationRecord[] {
  return findings
    .map((f) => f.remediation)
    .filter((r): r is RemediationRecord => Boolean(r));
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
  const accountability_determination = buildAccountabilityDetermination(
    intake,
    demonstrability_findings,
    risk_calibration_finding,
    review_and_update_finding,
  );
  const art30_element_findings = buildArt30ElementFindings(intake);
  const art30_exemption_determination = buildArt30ExemptionDetermination(intake);
  const dpo_determination = buildDpoDetermination(intake);
  const transfer_analysis = buildTransferAnalysis(intake);
  const domain_element_findings = buildDomainElementFindings(intake, {
    accountability: accountability_determination,
    demonstrability: demonstrability_findings,
    art30: art30_element_findings,
    art30Exemption: art30_exemption_determination,
    dpo: dpo_determination,
    riskCalibration: risk_calibration_finding,
    review: review_and_update_finding,
    transfers: transfer_analysis,
  });
  return {
    accountability_determination,
    demonstrability_findings,
    art30_element_findings,
    art30_exemption_determination,
    dpo_determination,
    risk_calibration_finding,
    review_and_update_finding,
    transfer_analysis,
    domain_element_findings,
    remediation_plan: buildRemediationPlan(domain_element_findings),
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
    report.transfer_analysis = built.transfer_analysis;
    // GOVERNANCE UPGRADE — generalised tracker walk + remediation component.
    report.domain_element_findings = built.domain_element_findings;
    report.remediation_plan = built.remediation_plan;

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
      transfer_regime: built.transfer_analysis.regime,
      transfer_verdict: built.transfer_analysis.verdict,
      transfer_mechanism_mismatch: built.transfer_analysis.mechanism_regime_mismatch,
      domain_findings_total: built.domain_element_findings.length,
      domain_findings_analysed: built.domain_element_findings.filter((f) => f.status === "analysed").length,
      remediation_records: built.remediation_plan.length,
      remediation_incomplete: built.remediation_plan.filter((r) => r.status === "record_insufficient").length,
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
