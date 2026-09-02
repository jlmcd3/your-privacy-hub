// DOC 137 (2026-09-01) — CPPA Cyber sequencing self-contradiction + register
// completeness, from a Batch 5 external PDF review.
//
// FIX 2: the Executive Summary's "Sequencing priority among the above" row
// already named § 7120 audit applicability as gating everything, including
// auditor engagement (doc 135's applicability-first fix), but Section 6's
// "Priority readiness actions" bullet (buildReadinessActions,
// cyber-factors.ts) still always named § 7122 auditor engagement as the
// thing to complete "above all" — a direct contradiction whenever
// applicability, not auditor engagement, was the actual open gate. Also:
// the Readiness Action Register (Appendix C, deriveActionRegister) never
// carried a line item for the applicability-resolution action itself, so
// the Exec Summary's own stated top-priority item was invisible in the
// register meant to enumerate priorities.
//
// FIX 3: (a) the Owner column honestly prints "Not recorded" for every row
// when remediation_owner is blank, but nothing told the Company to
// designate one; (b) the record_insufficient headline/reasoning named only
// the auditor-engagement gate even when applicability was ALSO unresolved.
//
// The ratified gating hierarchy (confirmed already in cyber-factors.ts,
// e.g. the comment above buildOverallReadinessNarrative's single_next_act):
// applicability (§ 7120) -> first-audit timing (§ 7121) -> auditor
// engagement (§ 7122) -> evidence readiness (§ 7123).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildExecutiveReadinessLines,
  buildReadinessActions,
  buildRecordCompletionExtras,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";
import type { RenderedSkeletonDocument } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

// Minimal record: no controls recorded (every component unassessable), no
// auditor-engagement status (independence record_insufficient), and no
// § 7120(a)-(b) fields recorded (applicability unresolved). Conclusion is
// "record_insufficient" via multiple independent triggers.
function unresolvedIntake(): Bag {
  return {
    profile: {
      entity_name: "Northwind Testing, Inc.",
    },
    controls: [],
  };
}

// Same record, but § 7120(a)-(b) applicability is now affirmatively
// resolved to "not required" (A1 and A2 both false), isolating the
// auditor-engagement gate as the sole open question.
function applicabilityResolvedIntake(): Bag {
  return {
    profile: {
      entity_name: "Northwind Testing, Inc.",
      q5_sell_share: "No",
      q1_revenue: "Under $25M",
    },
    controls: [],
  };
}

function appendixCRows(document: RenderedSkeletonDocument): readonly (readonly string[])[] {
  const appendix = document.sections.find((s) => s.id === "appendix_c_actions");
  const table = appendix?.paragraphs.find((p) => p.kind === "table")?.table;
  assert(table, "Appendix C table missing");
  return table!.rows;
}

// ── FIX 2 — Section 6 bullet must match the Exec Summary's stated gate ─────

Deno.test("doc137 — Cyber: Section 6 priority bullet names § 7120 applicability when it is the open gate, not § 7122 auditor engagement", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  assertEquals(d.readiness_determination.conclusion, "record_insufficient");
  const actions = buildReadinessActions(intake, [], d);
  assertEquals(actions.priority_actions.length, 1);
  const bullet = actions.priority_actions[0];
  assert(bullet.includes("§ 7120"), "priority bullet must name § 7120 applicability when it is unresolved");
  assert(bullet.includes("independent cybersecurity audit is required"), "applicability-resolution phrasing missing");
  assert(!bullet.includes("auditor-engagement description above all"), "must not still lead with the auditor-engagement gate");
});

Deno.test("doc137 — Cyber: Section 6 falls back to the § 7122 auditor-engagement bullet once applicability is resolved", () => {
  const intake = applicabilityResolvedIntake();
  const d = buildCyberDeliverables(intake);
  assertEquals(d.readiness_determination.conclusion, "record_insufficient");
  const actions = buildReadinessActions(intake, [], d);
  assertEquals(actions.priority_actions.length, 1);
  const bullet = actions.priority_actions[0];
  assert(bullet.includes("§ 7122 auditor-engagement description above all"), "must fall back to the original auditor-engagement bullet");
  assert(!bullet.includes("§ 7120"), "must not name applicability once it is resolved");
});

// ── FIX 2 — the register itself gets a ranked § 7120 line item ────────────

Deno.test("doc137 — Cyber: buildRecordCompletionExtras adds a ranked 'Audit applicability' item when § 7120 is unresolved", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  const extras = buildRecordCompletionExtras(intake, d);
  const applicabilityItem = extras.find((x) => x.label === "Audit applicability");
  assert(applicabilityItem, "Audit applicability item missing from record-completion extras");
  assertEquals(applicabilityItem!.rank, "1");
  assertEquals(applicabilityItem!.priorityTier, "Immediate");
});

Deno.test("doc137 — Cyber: buildRecordCompletionExtras omits the applicability item once § 7120 is resolved", () => {
  const intake = applicabilityResolvedIntake();
  const d = buildCyberDeliverables(intake);
  const extras = buildRecordCompletionExtras(intake, d);
  assert(!extras.some((x) => x.label === "Audit applicability"), "applicability item should not appear once resolved");
});

Deno.test("doc137 — Cyber: Appendix C Readiness Action Register lists 'Audit applicability' FIRST, with Rank 1", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-08-30");
  const rows = appendixCRows(out.document);
  assert(rows.length > 0, "register must not be empty");
  const [rank, component] = rows[0];
  assertEquals(component, "Audit applicability");
  assertEquals(rank, "1");
});

Deno.test("doc137 — Cyber: Appendix C register has no 'Audit applicability' row once § 7120 is resolved", () => {
  const intake = applicabilityResolvedIntake();
  const d = buildCyberDeliverables(intake);
  const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-08-30");
  const rows = appendixCRows(out.document);
  assert(!rows.some((r) => r[1] === "Audit applicability"), "applicability row should not appear once resolved");
});

// ── FIX 3(a) — Owner-designation summary sentence ──────────────────────────

Deno.test("doc137 — Cyber: Executive Summary tells the Company to designate an owner when remediation_owner is blank and the register has rows", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  const lines = buildExecutiveReadinessLines({
    intake,
    deliverables: d,
    recommendations: [],
    nextSteps: [],
    corpusCommentaryBySlug: new Map(),
  });
  assert(
    lines.includes("The Company will need to designate an owner for the items in the Readiness Action Register; none is currently recorded."),
    "owner-designation sentence missing",
  );
});

Deno.test("doc137 — Cyber: the owner-designation sentence does not fire once an owner is recorded", () => {
  const intake = unresolvedIntake();
  (intake.profile as Bag).remediation_owner = "Jane Doe, CISO";
  const d = buildCyberDeliverables(intake);
  const lines = buildExecutiveReadinessLines({
    intake,
    deliverables: d,
    recommendations: [],
    nextSteps: [],
    corpusCommentaryBySlug: new Map(),
  });
  assert(!lines.includes("will need to designate an owner"), "sentence must not fire once an owner is recorded");
});

Deno.test("doc137 — Cyber: the owner-designation sentence never fires when the register has zero rows", () => {
  // Every component fully implemented and evidenced, auditor engagement
  // resolved, applicability resolved -> zero recommendations, zero
  // record-completion extras -> nothing to own yet.
  const intake: Bag = {
    profile: {
      entity_name: "Northwind Testing, Inc.",
      q5_sell_share: "No",
      q1_revenue: "Under $25M",
      auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
      last_audit: "Within 12 months",
      prior_audit_scope: "Full scope covering the SOC 2 boundary.",
    },
    controls: CYBER_7123_COMPONENTS.map((c) => ({
      key: c.slug,
      label: c.label,
      maturity: "Implemented across organization",
      notes: `Documented ${c.label} controls operated by the security team.`,
      evidence: ["Screenshot / config export", "SOC 2 or auditor letter"],
    })),
  };
  const d = buildCyberDeliverables(intake);
  const extras = buildRecordCompletionExtras(intake, d);
  assertEquals(extras.length, 0, "fixture must have zero record-completion extras for this test to be meaningful");
  const lines = buildExecutiveReadinessLines({
    intake,
    deliverables: d,
    recommendations: [],
    nextSteps: [],
    corpusCommentaryBySlug: new Map(),
  });
  assert(!lines.includes("will need to designate an owner"), "sentence must not fire when the register has no rows");
});

// ── FIX 3(b) — both-gates wording polish on the record_insufficient headline ──

Deno.test("doc137 — Cyber: record_insufficient headline names BOTH open gates (applicability and auditor engagement)", () => {
  const intake = unresolvedIntake();
  const d = buildCyberDeliverables(intake);
  assertEquals(d.readiness_determination.conclusion, "record_insufficient");
  const headline = d.readiness_determination.headline;
  assert(headline.includes("audit applicability under § 7120 remains unresolved"), "applicability gate missing from headline");
  assert(headline.includes("the auditor engagement is not described"), "auditor-engagement gate missing from headline");
  assert(headline.startsWith("No readiness conclusion can be reached on the current record:"), "lead sentence wording not updated");
});

Deno.test("doc137 — Cyber: record_insufficient headline names only the auditor-engagement gate once applicability is resolved", () => {
  const intake = applicabilityResolvedIntake();
  const d = buildCyberDeliverables(intake);
  assertEquals(d.readiness_determination.conclusion, "record_insufficient");
  const headline = d.readiness_determination.headline;
  assert(!headline.includes("audit applicability under § 7120 remains unresolved"), "applicability gate must not appear once resolved");
  assert(headline.includes("the auditor engagement is not described"), "auditor-engagement gate still expected");
});
