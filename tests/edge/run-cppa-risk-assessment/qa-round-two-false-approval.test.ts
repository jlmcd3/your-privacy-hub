// QA round two (RA-A-08 / RA-B-02 / B Suite, High, 2026-09-06) — "Pending
// approval is labelled Approved".
//
// Two independent inferences of approval from a NON-EMPTY NAME, both in
// risk-skeleton-assemble.ts:
//
//  1. deriveReviewApprovalTable's role mapping. The form's role select offers
//     "Reviewed" / "Approved" / "Both" and DEFAULTS TO A BLANK option
//     ("Role…"). Everything that was not "Reviewed" or "Approved" fell through
//     to "Reviewed and approved by", so a row whose role was left unselected
//     printed as an approval the customer never gave. Customer B recorded
//     "Priya Shah — Reviewed only, no approval authority" and the PDF still
//     carried an "Approved by" row.
//
//  2. The a9_approver_name fallback, in the table and in the § 5 narrative.
//     Customer A's approver field read "Not yet approved — Elena Brooks is the
//     proposed reviewer and COO — approval pending deletion, necessity and
//     physical-harm review" (there being no pending option to select), and the
//     report published that negative with "(Approved)" bolted onto the end and
//     an "Approved by" table label above it.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveReviewApprovalTable } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

type Bag = Record<string, unknown>;
const roleOf = (t: { rows: readonly (readonly string[])[] }) => t.rows.map((r) => r[0]);

Deno.test("RA-B-02 — a reviewer whose role is 'Reviewed' is never labelled an approver", () => {
  const intake: Bag = {
    assessment_reviewers_approvers: [{ name: "Priya Shah", position: "DPO", role: "Reviewed" }],
  };
  assertEquals(roleOf(deriveReviewApprovalTable(intake)), ["Reviewed by"]);
});

Deno.test("RA-B-02 — an unselected role is reported as unrecorded, not as approval", () => {
  // The select's own default. This is the row that printed "Reviewed and
  // approved by" for a customer who had approved nothing.
  const intake: Bag = {
    assessment_reviewers_approvers: [{ name: "Priya Shah", position: "DPO", role: "" }],
  };
  const roles = roleOf(deriveReviewApprovalTable(intake));
  assertEquals(roles, ["Role not recorded"]);
  assert(!roles.some((r) => /approved/i.test(r)), "an unrecorded role still asserts approval");
});

Deno.test("RA-B-02 — the explicit roles keep their existing labels", () => {
  const intake: Bag = {
    assessment_reviewers_approvers: [
      { name: "A", position: "COO", role: "Approved" },
      { name: "B", position: "CISO", role: "Both" },
    ],
  };
  assertEquals(roleOf(deriveReviewApprovalTable(intake)), ["Approved by", "Reviewed and approved by"]);
});

Deno.test("RA-A-08 — a named approver with no approval date is not labelled approved", () => {
  const intake: Bag = {
    a9_approver_name: "Not yet approved — Elena Brooks is the proposed reviewer and COO — approval pending",
    a9_approver_position: "COO",
    // No a9_approval_date: customer A left it blank because nothing was approved.
  };
  const roles = roleOf(deriveReviewApprovalTable(intake, "2026-09-06"));
  assertEquals(roles, ["Named as approver — approval not recorded"]);
  assert(!roles.some((r) => /^Approved by/.test(r)), "still claims approval from a name alone");
});

Deno.test("RA-A-08 — a named approver WITH a current approval date is still labelled approved", () => {
  const intake: Bag = {
    a9_approver_name: "Elena Brooks",
    a9_approver_position: "COO",
    a9_approval_date: "2026-09-01",
  };
  assertEquals(roleOf(deriveReviewApprovalTable(intake, "2026-09-06")), ["Approved by"]);
});

Deno.test("RA-A-08 — a stale approval date does not resurrect the approval label", () => {
  // The doc-152 365-day currency rule: a prior review's date is not this
  // assessment's approval, and must not relabel the row.
  const intake: Bag = {
    a9_approver_name: "Elena Brooks",
    a9_approver_position: "COO",
    a9_approval_date: "2019-01-01",
  };
  const roles = roleOf(deriveReviewApprovalTable(intake, "2026-09-06"));
  assert(!roles.some((r) => /^Approved by/.test(r)), `stale date still labelled approved: ${roles}`);
});

Deno.test("RA-A-08 — an empty record still renders the blank signature row", () => {
  assertEquals(roleOf(deriveReviewApprovalTable({})), ["Reviewed and approved by"]);
});
