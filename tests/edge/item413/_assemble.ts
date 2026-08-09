// ITEM 413 — the in-test assembly of a registration document.
//
// `run-registration-assessment/index.ts` cannot be imported (it calls
// Deno.serve at module scope), so this module reproduces the SAME sequence the
// function performs at its finalize seam: engine → deliverables → narrative →
// finalize battery. The seam test asserts that this sequence matches the
// function's own, so the two cannot silently diverge.

import {
  runRegistrationAssessment,
  type IntakeData,
} from "../../../supabase/functions/run-registration-assessment/_local/registration-engine.ts";
import {
  buildRegistrationDeliverables,
  REGISTRATION_DELIVERABLES_VERSION,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { REGISTRATION_DUTY_AUTHORITIES } from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";
import { runRegistrationFinalizeBattery } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-finalize.ts";

/**
 * A PERFECT-SHAPED REGISTRATION RECORD. Every key the form
 * (`src/pages/RegistrationAssessment.tsx`) collects is answered, so a coverage
 * orphan on this record is a real emission defect and never honest silence.
 */
export const PERFECT_INTAKE: Record<string, unknown> = {
  organization_name: "Halden Data Services, Inc.",
  is_public_authority: false,
  organization_country: "US",
  organization_size: "medium",
  industry: "AdTech / MarTech",
  email: "privacy@haldendata.example",
  employee_count: 240,
  annual_revenue_usd: 42000000,
  data_subjects_count: 3800000,
  role: "controller",
  processes_personal_data: true,
  processes_special_categories: true,
  processes_children_data: false,
  large_scale_monitoring: true,
  uses_ai_systems: true,
  ai_high_risk: false,
  ai_general_purpose_provider: false,
  cross_border_transfers: true,
  acts_as_data_broker: true,
  sells_or_shares_personal_info: true,
  processes_biometrics_for_id: false,
  collects_data_not_directly_from_individuals: true,
  has_direct_relationship_with_data_subjects: false,
  sells_or_licenses_brokered_data: true,
  brokered_data_individual_count: 3800000,
  brokered_data_revenue_share_pct: 61,
  data_broker_exemption_claimed: "none",
  filing_contact_details_ready: true,
  filing_opt_out_mechanism_documented: true,
  filing_minors_data_practices_documented: true,
  filing_metrics_documented: true,
  filing_rights_instructions_documented: true,
  approved_by_name: "Ingrid Halden",
  approved_by_title: "General Counsel",
  approval_date: "2026-08-08",
  next_review_due: "2027-08-08",
  has_eu_establishment: false,
  has_uk_establishment: false,
  eu_lead_member_state: "",
  markets_served: ["US", "US-CA", "US-OR", "US-TX", "US-VT", "DE", "FR", "GB"],
};

export interface AssembledRegistration {
  report: Record<string, unknown>;
  coverage: ReturnType<typeof runRegistrationFinalizeBattery>["coverage"];
  lint: ReturnType<typeof runRegistrationFinalizeBattery>["prose_lint"];
}

export function assembleRegistrationReport(
  intake: Record<string, unknown>,
): AssembledRegistration {
  const engineOutput = runRegistrationAssessment(intake as IntakeData);
  const report: Record<string, unknown> = { ...engineOutput };
  const deliverables = buildRegistrationDeliverables(intake as never);
  report.registration_deliverables = deliverables;
  report.narrative = deliverables.narrative;
  report.deliverables_version = REGISTRATION_DELIVERABLES_VERSION;

  const battery = runRegistrationFinalizeBattery(
    report,
    intake,
    REGISTRATION_DUTY_AUTHORITIES,
  );
  return { report: battery.report, coverage: battery.coverage, lint: battery.prose_lint };
}
