/**
 * ITEM 369-IR (Master Spec §4.2) — ARTIFACT B: THE INCIDENT WORKSHEET.
 *
 * BLANK BY DESIGN. This artifact carries no analytic content and must never be
 * pre-filled: it is the set of forms a response team writes INTO during a live
 * incident, and a form arriving with plausible-looking specimen entries is
 * worse than no form at all — it invites a responder to leave the specimen in
 * place. Every cell ships empty; only the column headers and the instruction
 * line are authored.
 *
 * Shapes follow the ICO breach-management tracker (incident log, decision log)
 * and the NIST SP 800-61r3 after-action review. Those are TEMPLATE GUIDANCE for
 * the column set only; nothing here is asserted on their authority.
 *
 * The remediation tracker uses the fleet's shared remediation component shape
 * (action / owner / deadline / status).
 */

export const INCIDENT_WORKSHEET_VERSION = "ir-incident-worksheet-doc101-phase2-2026-08-29";

export interface WorksheetForm {
  readonly id: string;
  readonly heading: string;
  /** How the form is used. Never an example entry. */
  readonly instruction: string;
  readonly columns: readonly string[];
  /** Number of empty rows to render. Cells are always blank. */
  readonly blank_rows: number;
  /** Free-text prompts for narrative forms; each renders as an empty field. */
  readonly prompts?: readonly string[];
}

export interface IncidentWorksheet {
  readonly version: string;
  readonly artifact: "incident_worksheet";
  readonly title: string;
  readonly blank_by_design: true;
  readonly forms: readonly WorksheetForm[];
}

export const WORKSHEET_FORM_ORDER: readonly string[] = [
  "incident_log",
  "decision_log",
  "breach_register",
  "incident_metrics",
  "after_action_review",
  "remediation_tracker",
];

export function buildIncidentWorksheet(orgName?: string): IncidentWorksheet {
  const org = String(orgName ?? "").trim();
  return {
    version: INCIDENT_WORKSHEET_VERSION,
    artifact: "incident_worksheet",
    title: org ? `Incident Worksheet — ${org}` : "Incident Worksheet",
    blank_by_design: true,
    forms: [
      {
        id: "incident_log",
        heading: "Incident log",
        instruction:
          "One row per observation, contemporaneously. Record what was observed and where it was observed, not what it is believed to mean. All timestamps in UTC.",
        columns: ["Timestamp (UTC)", "Event observed", "Source", "Logged by"],
        blank_rows: 12,
      },
      {
        id: "decision_log",
        heading: "Decision log",
        instruction:
          "One row per decision taken, recorded when it is taken. The rationale column records what was known at the time, so that the decision can later be assessed on the information then available.",
        columns: ["Timestamp (UTC)", "Decision", "Decided by", "Rationale at the time"],
        blank_rows: 12,
      },
      // IR-H 4a (2026-08-29, doc 101 §4, CEO-approved) — the ICO's own
      // breach-register audit expectation: every incident assessed under
      // this playbook is documented, including one assessed as NOT
      // notifiable, with the rationale for that assessment. The underlying
      // documentation duty is stated as authority in the standing playbook
      // (statutory_notification_determinations); this operational form
      // never cites it — the worksheet's own register bars a statutory
      // citation here, matching every other worksheet form.
      {
        id: "breach_register",
        heading: "Breach register",
        instruction:
          "One row per incident assessed under this playbook, including one assessed as not notifiable. Record every breach regardless of whether it was notified, with the reasoning behind that assessment.",
        columns: ["Date discovered", "Brief description", "Notifiable? (Y/N)", "Rationale if N", "Notification date if Y", "Recorded by"],
        blank_rows: 12,
      },
      // IR-H 4c (2026-08-29, doc 101 §4, CEO-approved) — the fixed metric
      // definitions live in the instruction text, never as pre-filled row
      // cells: the worksheet's own BLANK BY DESIGN law authors only column
      // headers and the instruction line, no row content.
      {
        id: "incident_metrics",
        heading: "Incident metrics",
        instruction:
          "Record the actual timestamps against each metric as the incident unfolds. Time to Detect (TTD) runs from occurrence to detection. Time to Activate (TTA) runs from detection to response-team activation. Time to Contain (TTC) runs from activation to containment confirmed. Time to Notify runs from awareness to each notification duty's actual filing, measured against that duty's own statutory clock — add a further row per notification duty where more than one clock is in play.",
        columns: ["Metric", "Start event and time (UTC)", "End event and time (UTC)", "Elapsed", "Notes"],
        blank_rows: 6,
      },
      {
        id: "after_action_review",
        heading: "After-action review",
        instruction:
          "Completed after the incident is closed. Each answer is written in full sentences and each identified shortfall is carried onto the remediation tracker rather than left in this form.",
        columns: [],
        blank_rows: 0,
        prompts: [
          "What happened, in chronological order?",
          "What was detected, when, and by which control?",
          "What did the response do well?",
          "Where did the response depart from this playbook, and why?",
          "Which decisions would be taken differently, and on what information?",
          "Which controls, contracts or contacts require change?",
          "Which remediation items arise, and who owns each?",
          // IR-I 5a (2026-08-29, doc 101 §5, CEO-approved).
          "Have any facts emerged since the original notification that would require a supplemental notice — additional affected individuals, additional data categories, or a materially different scope than first reported? If so, record that determination separately, with its own basis.",
        ],
      },
      {
        id: "remediation_tracker",
        heading: "Remediation tracker",
        instruction:
          "One row per remediation action arising from the incident or the after-action review. An action with no named owner and no deadline is not tracked, it is merely noted.",
        columns: ["Action", "Owner", "Deadline", "Status"],
        blank_rows: 12,
      },
    ],
  };
}
