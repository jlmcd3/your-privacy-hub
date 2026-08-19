// ITEM SO-4 — CYBER SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned v3 skeleton, bound to a
// LIVE source: either an intake key on the live contract
// (`_shared/intake-contracts/cppa-cybersecurity.ts`, as persisted under
// `intake_data.profile`) or a leaf of a typed surface on the LIVE persisted
// report shape (items 404–407). A slot without a live source is a STOP
// condition. Every slot below resolves — verified against the persisted
// `cppa_assessments` rows for module `cybersecurity`.

export type CyberSlotSourceKind = "intake" | "typed-surface" | "composed";

export type CyberSlotRender =
  | "label-map"          // stored option value → reader label, woven into prose
  | "adverbial"          // rendered as its own clause inside the fixed sentence
  | "quoted-attributed"  // the company's words, attributed to the company
  | "list-as-prose"      // array rendered as an English list
  | "verbatim"
  | "conditional-sentence";

export interface CyberSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: CyberSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: CyberSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const CYBER_SLOT_MAP: readonly CyberSlotBinding[] = [
  // Subtitle
  { slot: "profile.entity_name", kind: "intake", source: "profile.entity_name",
    render: "verbatim", absent: "required — the document may not issue without it" },

  // I. Audit Scope and the Auditor
  { slot: "profile.framework", kind: "intake", source: "profile.framework",
    render: "verbatim", absent: "required (form gates submit on every profile leaf)" },
  { slot: "profile.in_scope_frameworks", kind: "intake", source: "profile.in_scope_frameworks",
    render: "list-as-prose", absent: "falls back to the single framework the company named" },
  { slot: "profile.audit_scope_rationale", kind: "intake", source: "profile.audit_scope_rationale",
    render: "quoted-attributed", absent: "the sentence is dropped, never padded" },
  { slot: "AUDITOR_PHRASE", kind: "intake", source: "profile.auditor_engagement_status",
    render: "label-map", absent: "the honest sentence that no auditor engagement was recorded" },
  { slot: "PRIOR_AUDIT_SENTENCE", kind: "composed", source: "profile.prior_audit_scope",
    render: "conditional-sentence",
    absent: "the honest sentence that no prior audit coverage was recorded" },
  { slot: "profile.incidents_12mo", kind: "intake", source: "profile.incidents_12mo",
    render: "label-map", absent: "the sentence is dropped" },
  { slot: "profile.last_audit", kind: "intake", source: "profile.last_audit",
    render: "adverbial", absent: "the clause is dropped" },
];

/**
 * The typed surfaces the skeleton's [DETERMINATION LEAD] and [GENERATED] blocks
 * consume, per items 404–407. Named here so the slot-map test can assert the
 * reverse direction: every surface listed is consumed by a section.
 */
export const CYBER_TYPED_SURFACES: readonly { surface: string; section_id: string }[] = [
  { surface: "readiness_determination", section_id: "executive_summary" },
  { surface: "control_status_counts", section_id: "executive_summary" },
  { surface: "independence_determination", section_id: "audit_scope" },
  { surface: "controls", section_id: "required_components" },
  { surface: "top_risks", section_id: "findings_remediation" },
  { surface: "next_steps", section_id: "findings_remediation" },
  { surface: "authority_exhibit", section_id: "table_of_authorities" },
];

/** § 7122 auditor-engagement status → the reader label woven into fixed prose. */
export const CYBER_AUDITOR_PHRASE_MAP: Readonly<Record<string, string>> = {
  "No auditor engaged yet":
    "that it has not yet engaged an auditor",
  "Internal auditor identified, reporting line not yet settled":
    "that it has identified an internal auditor but has not yet settled that auditor's reporting line",
  "Internal auditor engaged, reporting line not yet settled":
    "that it has engaged an internal auditor but has not yet settled that auditor's reporting line",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility":
    "that it has engaged an internal auditor who reports to an executive without responsibility for the cybersecurity program",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program":
    "that it has engaged an internal auditor who reports to the executive responsible for the cybersecurity program",
  "External auditor engaged":
    "that it has engaged an external auditor",
  "External auditor engaged, independence confirmed in writing":
    "that it has engaged an external auditor whose independence is confirmed in writing",
};

/** Incident count → prose, so the fixed sentence reads as English. */
export const CYBER_INCIDENTS_PHRASE_MAP: Readonly<Record<string, string>> = {
  "None": "no security incidents",
  "1": "one security incident",
  "2–5": "between two and five security incidents",
  "2-5": "between two and five security incidents",
  "More than 5": "more than five security incidents",
};

/** Last-audit option → the adverbial phrase the fixed sentence expects. */
export const CYBER_LAST_AUDIT_PHRASE_MAP: Readonly<Record<string, string>> = {
  "Within 12 months": "within the last twelve months",
  "12–24 months ago": "between twelve and twenty-four months ago",
  "12-24 months ago": "between twelve and twenty-four months ago",
  "Over 24 months ago": "more than twenty-four months ago",
  "Never": "never",
};
