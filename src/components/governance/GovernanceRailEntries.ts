// GOVERNANCE UPGRADE (ITEM 4) — ICO Data Protection Audit Framework
// (Oct 2024) template guidance for the governance intake rail.
//
// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer, and it never directs the answer on THIS form. Worked
// examples are clearly fictional and illustrate FORM only.
//
// ICO DISCIPLINE — the ICO Audit Framework toolkits and trackers are drafting
// guidance for the organisation's own accountability record. They are not
// authority: nothing here is cited as a legal basis, and the corpus resolver
// (governance-corpus.ts) never accepts an ICO reference as a pinned citation.
// Statutory text reaches the rail byte-exact through useGdprRailEntry.

import type { RailEntry } from "@/components/intake/RailEntry";

const ICO_SOURCE_LABEL = "ICO Data Protection Audit Framework (Oct 2024)";
const ICO_SOURCE_URL =
  "https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/";

/**
 * Keyed by governance intake step (1–5) plus the remediation-default fields
 * added by this upgrade. Merged over the live Art.-resolved rail entry in
 * GovernanceAssessment.tsx, which supplies the verbatim statutory text.
 */
export const GOVERNANCE_RAIL: Record<string, RailEntry> = {
  step1_scope: {
    fieldLabel: "Territorial scope and processing footprint",
    citation: "GDPR Art. 3 · Art. 5(2)",
    plainSummary:
      "Scope answers set the perimeter every later finding is measured inside. The accountability standard runs across everything inside that perimeter.",
    regulationText: "…",
    coachLead: "Describe the footprint by where the people are, not where the company sits.",
    coachBody:
      "Give jurisdictions, categories of individuals, and the systems that touch them as separate dimensions. A perimeter stated at one level of detail cannot be tested at another.",
    goodAnswer:
      "A fictional courier with no EU entity records EU consignee data across three member states and one monitoring platform — three dimensions, each stated separately.",
    commonMistake:
      "Recording a head-office country as if it were the processing footprint. The two answer different questions.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Accountability toolkit — scope of the privacy programme",
      guidance:
        "The ICO accountability toolkit opens by fixing the scope of the programme: which entities, jurisdictions and processing operations the record covers. Record each as its own line so the tracker can be reviewed operation by operation.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step2_records: {
    fieldLabel: "Data categories, special categories and the record of processing",
    citation: "GDPR Art. 30 · Art. 9",
    plainSummary:
      "The record of processing is the evidence base. Categories recorded loosely produce findings that cannot be tested against Art. 30(1)(a)–(g).",
    regulationText: "…",
    coachLead: "List categories as they exist in the systems, including derived ones.",
    coachBody:
      "Separate the categories held from the categories inferred, and keep special categories distinct from ordinary ones. The Art. 30 element walk reads each dimension separately.",
    goodAnswer:
      "A fictional retailer records order history and support transcripts, and separately records a derived 'mobility-aid buyer' segment as a health-revealing inference.",
    commonMistake:
      "Recording only the fields on an intake form. Inferences and enrichment data are processing too, and they belong in the same record.",
    templateGuidance: {
      sectionRef: "Records management and security",
      sectionTitle: "Records of processing tracker — Art. 30 element coverage",
      guidance:
        "The ICO records tracker walks the record element by element: purposes, categories of individuals, categories of data, recipients, transfers, retention and security measures. An element left blank is reported as an unmet element rather than inferred from another.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step3_dpo: {
    fieldLabel: "DPO designation, position and tasks",
    citation: "GDPR Arts. 37–39",
    plainSummary:
      "Designation, position and tasks are three separate duties. A record that answers only the first cannot demonstrate the other two.",
    regulationText: "…",
    coachLead: "Answer designation, independence and tasks as three separate facts.",
    coachBody:
      "Say who holds the role, who they report to, what other duties they hold, and what resources they have. Each of those is a different question in the Art. 38 analysis.",
    goodAnswer:
      "A fictional insurer records a named DPO reporting to the board, with a second role in claims operations flagged for conflict review — designation and position answered separately.",
    commonMistake:
      "Treating a job title as the whole answer. Arts. 38–39 test reporting lines, resourcing and conflicting duties, not nomenclature.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "DPO tracker — designation, independence, resourcing, tasks",
      guidance:
        "The ICO accountability tracker records the DPO across four dimensions: appointment, reporting line, resources, and the tasks actually performed. Recording them separately is what lets the position be reviewed rather than assumed.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step4_measures: {
    fieldLabel: "Technical and organisational measures, training and review",
    citation: "GDPR Art. 24 · Art. 32",
    plainSummary:
      "Art. 24 asks whether measures are calibrated to the nature, scope, context and purposes of the processing — and whether they are reviewed and updated.",
    regulationText: "…",
    coachLead: "Record what is running today, and when it was last reviewed.",
    coachBody:
      "State the measure, its coverage, and the date of last review as three separate facts. A measure with no review date cannot support the review-and-update limb.",
    goodAnswer:
      "A fictional lab records endpoint encryption across all managed devices, annual role-based training with tracked completion, and a last review date — coverage and currency both stated.",
    commonMistake:
      "Recording an approved policy as an implemented measure. Art. 24 tests what is in operation and kept current.",
    templateGuidance: {
      sectionRef: "Training and awareness",
      sectionTitle: "Training and measures tracker — coverage, currency, evidence",
      guidance:
        "The ICO training and awareness toolkit records coverage (who receives it), currency (when it was last delivered or reviewed) and evidence (how completion is demonstrated). The tracker treats these as three columns, not one narrative.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step5_processors: {
    fieldLabel: "Processor contracts and international transfers",
    citation: "GDPR Art. 28 · Chapter V",
    plainSummary:
      "Each processor and each transfer route is a separate duty. Coverage is counted, not generalised from the largest vendor.",
    regulationText: "…",
    coachLead: "Answer from a counted vendor list, not from the main supplier.",
    coachBody:
      "Give the number of processors, how many hold contracts, and the transfer routes with their mechanisms. Counting is what turns an impression into a record.",
    goodAnswer:
      "A fictional publisher records eleven processors, nine with signed contracts, and two transfer routes each mapped to a named mechanism — counted, then attributed.",
    commonMistake:
      "Generalising from the primary cloud provider. The duty attaches per processor and per transfer route.",
    templateGuidance: {
      sectionRef: "Records management and security",
      sectionTitle: "Processor and transfer tracker — per-vendor coverage",
      guidance:
        "The ICO tracker records processors one row per vendor, with contract status and transfer route on the same row. Per-row recording is what allows a partial-coverage finding instead of a single programme-level verdict.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  // ── Remediation defaults (new intake fields on this upgrade) ────────────
  remediation_default_owner: {
    fieldLabel: "Who is accountable for remediation?",
    citation: "GDPR Art. 5(2) · Art. 24(1)",
    plainSummary:
      "An action with no named owner cannot be tracked, and an untracked action cannot demonstrate accountability.",
    regulationText: "…",
    coachLead: "Name a role that exists on the org chart, not a committee.",
    coachBody:
      "One accountable role per default, stated the way it appears internally. A shared owner in the record becomes an unowned action in practice.",
    goodAnswer:
      "A fictional charity records 'Head of Information Governance' — a single standing role a reviewer can locate months later.",
    commonMistake:
      "Recording a department. Accountability lands on a role that can be asked for the update.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — accountable owner column",
      guidance:
        "Every ICO tracker row carries an accountable owner. The framework treats an owner-less action as an open risk rather than a plan.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_target_date: {
    fieldLabel: "Default target date for remediation",
    citation: "GDPR Art. 24(1)",
    plainSummary:
      "A default date gives every generated action a review horizon; individual actions can still carry their own.",
    regulationText: "…",
    coachLead: "Give a real calendar date, not a duration.",
    coachBody:
      "A date the organisation can be held to, aligned to an existing planning cycle. Durations drift; dates are testable.",
    goodAnswer:
      "A fictional co-operative records the end of its next audit cycle as the default horizon — one fixed date, applied consistently.",
    commonMistake:
      "Recording an open-ended horizon. Without a date the review-and-update limb of Art. 24 has nothing to test.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — target date column",
      guidance:
        "The ICO tracker pairs each action with a target date so progress can be reviewed at a set point rather than on discovery.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_priority: {
    fieldLabel: "Default remediation priority",
    citation: "GDPR Art. 24(1)",
    plainSummary:
      "Priority is a sequencing aid for the organisation's own plan. It is a management label, never a statutory severity.",
    regulationText: "…",
    coachLead: "Set the default that reflects normal cadence, not the worst case.",
    coachBody:
      "The default applies to every generated action; individual findings can be raised above it. A default set at the extreme flattens the ordering it is meant to create.",
    goodAnswer:
      "A fictional manufacturer records a middle default and reserves the top band for actions its risk committee escalates — the ordering stays usable.",
    commonMistake:
      "Reading a priority label as a legal severity. It orders work; it does not grade compliance.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — priority column",
      guidance:
        "The ICO tracker records priority purely to sequence work. The framework keeps it distinct from any assessment of whether a requirement is met.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_validation_method: {
    fieldLabel: "How will remediation be validated?",
    citation: "GDPR Art. 5(2) · Art. 24(1)",
    plainSummary:
      "Validation is the evidence step: how completion will be demonstrated, distinct from the action itself.",
    regulationText: "…",
    coachLead: "Say what artefact will prove the action was done.",
    coachBody:
      "Name the evidence and who reviews it. 'Completed' asserts; an artefact and a reviewer demonstrate.",
    goodAnswer:
      "A fictional university records that its internal audit team samples the tracker each quarter and retains the sampling note — evidence plus reviewer.",
    commonMistake:
      "Recording self-attestation as validation. Art. 5(2) turns on demonstrability, which needs something a reviewer can inspect.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — validation and assurance column",
      guidance:
        "The ICO tracker closes each row with how completion is assured — the artefact retained and the function that checks it.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },
};

/** Step-indexed view used by the governance intake rail. */
export const GOVERNANCE_RAIL_BY_STEP: Record<number, RailEntry> = {
  1: GOVERNANCE_RAIL.step1_scope,
  2: GOVERNANCE_RAIL.step2_records,
  3: GOVERNANCE_RAIL.step3_dpo,
  4: GOVERNANCE_RAIL.step4_measures,
  5: GOVERNANCE_RAIL.step5_processors,
};
