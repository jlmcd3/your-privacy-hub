/**
 * DPIA UPGRADE (ITEM 1) — THE TWO STRUCTURAL FIELDS.
 *
 * EDPB DPIA template v1.0 (adopted 10 March 2026) accountability fields:
 *
 *   § 0.5 ¶6  — "Identify the team involved in conducting this DPIA. You can
 *               provide details of their roles, tasks, responsibilities, etc.
 *               A RACI matrix can be used."
 *   § 0.5 ¶10 — "Provide the completion date and the formal validation date:
 *               the DPIA must be formally approved by a responsible official
 *               (Managing Director, CEO, etc.) as complete and finished."
 *
 * Two deliverables answer them:
 *
 *   1. `section_0_overview.assessment_team`   — who prepared the DPIA.
 *   2. `section_6_conclusion.validation_approval` — the attestation.
 *
 * PURITY LAW: pure function of the intake object. No I/O, no clock, no env;
 * never throws.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of those two keys.
 *
 * DEGRADATION LAW (the house attestation pattern — risk / admt / lia lineage):
 * a record that does not carry the field is emitted with
 * `status: "record_insufficient"` and a specific `information_needed` string.
 * It is NEVER omitted and NEVER filled with invention.
 */

import type { DeliverableStatus } from "./types.ts";

export const DPIA_ATTESTATION_VERSION = "dpia-attestation-2026-08-05-upgrade6";

export interface DpiaTeamMember {
  readonly name: string;
  readonly role: string;
}

export interface DpiaAssessmentTeam {
  readonly text: string;
  readonly members: readonly DpiaTeamMember[];
  readonly raci_recorded: boolean;
  readonly citation: string;
  readonly template_ref: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface DpiaValidationApproval {
  readonly text: string;
  readonly attested: boolean;
  readonly approved_by_name: string;
  readonly approved_by_title: string;
  readonly approval_date: string;
  readonly basis_for_sign_off: string;
  readonly citation: string;
  readonly template_ref: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface DpiaAttestationDeliverables {
  readonly assessment_team: DpiaAssessmentTeam;
  readonly validation_approval: DpiaValidationApproval;
}

const TEMPLATE_REF_TEAM = "EDPB DPIA template v1.0 (adopted 10 March 2026) § 0.5 ¶6";
const TEMPLATE_REF_VALIDATION = "EDPB DPIA template v1.0 (adopted 10 March 2026) § 0.5 ¶10";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * Split a free-text roster into { name, role } records. Deterministic and
 * conservative: it never invents a role, and an entry it cannot split is kept
 * whole as the name with an empty role.
 */
export function parseTeamRoster(text: string): DpiaTeamMember[] {
  const raw = str(text);
  if (!raw) return [];
  return raw
    .split(/\r?\n|;|(?<!\w)\u2022/g)
    .map((s) => s.replace(/^[\s\-*\u2022]+/, "").trim())
    .filter((s) => s.length > 0)
    .map((line) => {
      // ITEM 374 DEFECT 3 — the old pattern ended `(.+?)\)?$`, so a role that
      // legitimately ENDS in a parenthetical ("Privacy Counsel (Responsible)")
      // lost its closing bracket and rendered unbalanced. The trailing bracket
      // is now stripped only when the delimiter that opened the role WAS "(",
      // i.e. when the role carries one more ")" than it has "(".
      const m = line.match(/^(.*?)\s*(\u2014|--|\u2013|\s-\s|:|\()\s*(.+)$/);
      if (m && m[1].trim() && m[3].trim()) {
        let role = m[3].trim().replace(/[.,;]$/, "");
        const opens = (role.match(/\(/g) ?? []).length;
        const closes = (role.match(/\)/g) ?? []).length;
        if (m[2] === "(" && closes === opens + 1 && role.endsWith(")")) {
          role = role.slice(0, -1).trim();
        }
        return { name: m[1].trim(), role };
      }

      return { name: line.replace(/[.,;]$/, ""), role: "" };
    });
}

/**
 * § 0.5 ¶6 — who prepared the DPIA. Reads the dedicated
 * `dpia_prepared_by` field first and falls back to the RACI roster already
 * carried on legacy records as `dpia_team`.
 */
export function buildDpiaAssessmentTeam(intake: unknown): DpiaAssessmentTeam {
  const preparedBy = str(get(intake, "dpia_prepared_by"));
  const raci = str(get(intake, "dpia_team"));
  const source = preparedBy || raci;
  const members = parseTeamRoster(source);
  const named = members.filter((m) => m.name.length > 0);

  if (named.length === 0) {
    return {
      text:
        "The team that prepared this assessment is not identified on the present record. An assessment relied on as the controller's accountability record should name the people who conducted it and the role each held.",
      members: [],
      raci_recorded: false,
      citation: "GDPR Art. 35(7)",
      template_ref: TEMPLATE_REF_TEAM,
      status: "record_insufficient",
      information_needed:
        "dpia_prepared_by \u2014 the names and roles of the people who prepared this assessment. Where responsibilities are allocated on a RACI basis, record who is Responsible, Accountable, Consulted and Informed.",
    };
  }

  const rolesKnown = named.filter((m) => m.role.length > 0);
  const roster = named
    .map((m) => (m.role ? `${m.name} (${m.role})` : m.name))
    .join("; ");
  const raci_recorded = /\braci\b|responsible|accountable|consulted|informed/i.test(source);

  const text = rolesKnown.length === named.length
    ? `This assessment was prepared by ${roster}.`
    : `This assessment was prepared by ${roster}. The role held by ${
      named.filter((m) => !m.role).map((m) => m.name).join(", ")
    } is not recorded.`;

  return {
    text,
    members: named,
    raci_recorded,
    citation: "GDPR Art. 35(7)",
    template_ref: TEMPLATE_REF_TEAM,
    status: rolesKnown.length === named.length ? "analysed" : "record_insufficient",
    ...(rolesKnown.length === named.length ? {} : {
      information_needed:
        "dpia_prepared_by \u2014 the role held by each named contributor to this assessment.",
    }),
  };
}

/**
 * § 0.5 ¶10 — validation and approval attestation, emitted in
 * `section_6_conclusion`. House attestation pattern: attested only when the
 * approver, their title and the approval date are all on the record.
 */
export function buildDpiaValidationApproval(intake: unknown): DpiaValidationApproval {
  const name = str(get(intake, "dpia_approved_by_name"));
  const title = str(get(intake, "dpia_approved_by_title"));
  const date = str(get(intake, "dpia_approval_date"));
  const basis = str(get(intake, "dpia_signoff_basis"));

  const attested = !!name && !!title && !!date;

  const missing: string[] = [];
  if (!name) {
    missing.push(
      "dpia_approved_by_name \u2014 the responsible official who formally approved this assessment as complete",
    );
  }
  if (!title) {
    missing.push(
      "dpia_approved_by_title \u2014 that official's title and the authority under which they approve",
    );
  }
  if (!date) missing.push("dpia_approval_date \u2014 the date formal approval was given");
  if (!basis) {
    missing.push(
      "dpia_signoff_basis \u2014 what the approval rests on: the sections reviewed, the residual-risk position accepted, and any condition attached",
    );
  }

  const text = attested
    ? `This assessment was formally approved as complete by ${name}, ${title}, on ${date}.${
      basis ? ` The approval rests on ${basis}` + (/[.!?]$/.test(basis) ? "" : ".") : ""
    } It records the assessment the controller carried out before the processing described in it was carried out, and it is to be performed anew where the processing or its risk profile changes.`
    : "This assessment is not formally validated on the present record. A DPIA is approved as complete by a responsible official, and the record should name that person, their title, and the date of approval. The items outstanding are listed below.";

  return {
    text,
    attested,
    approved_by_name: name,
    approved_by_title: title,
    approval_date: date,
    basis_for_sign_off: basis,
    citation: "GDPR Art. 35(7)",
    template_ref: TEMPLATE_REF_VALIDATION,
    status: attested && basis ? "analysed" : "record_insufficient",
    ...(attested && basis ? {} : { information_needed: missing.join("; ") + "." }),
  };
}

export function buildDpiaAttestation(intake: unknown): DpiaAttestationDeliverables {
  return {
    assessment_team: buildDpiaAssessmentTeam(intake),
    validation_approval: buildDpiaValidationApproval(intake),
  };
}

/**
 * Attach both structures to the report. `assessment_team` rides
 * `section_0_overview` (the EDPB technical sheet lives there); the attestation
 * rides `section_6_conclusion` beside the decision it validates. Fail-open.
 */
export function attachDpiaAttestation(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildDpiaAttestation(intake);

    const overview = (report.section_0_overview ??= {}) as Record<string, unknown>;
    if (overview && typeof overview === "object" && !Array.isArray(overview)) {
      overview.assessment_team = built.assessment_team;
    }

    const conclusion = (report.section_6_conclusion ??= {}) as Record<string, unknown>;
    if (conclusion && typeof conclusion === "object" && !Array.isArray(conclusion)) {
      conclusion.validation_approval = built.validation_approval;
    }

    return {
      version: DPIA_ATTESTATION_VERSION,
      ok: true,
      team_status: built.assessment_team.status,
      team_members: built.assessment_team.members.length,
      attested: built.validation_approval.attested,
      validation_status: built.validation_approval.status,
    };
  } catch (e) {
    return {
      version: DPIA_ATTESTATION_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}
