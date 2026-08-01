// ITEM 273 — STEP 0(b) tests. Deterministic; no network.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  sanitizeRoleTitleSegments,
  stripParentheticals,
  hasNameBigram,
} from "../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import {
  evaluateOwnerSlotPii,
  evaluateCrossSectionDuplication,
  evaluateActivityCountContradiction,
} from "../../../supabase/functions/_shared/ltp/replay/substance-gates.ts";
import {
  renderSubmissionAndRetention,
  CYBER_AUDIT_SEPARATE_LEAD_IN,
  SUBMISSION_RETENTION_MARKER,
} from "../../../supabase/functions/_shared/ltp/submission-retention.ts";
import { renderCyberAuditSchedule } from "../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";
import { BALANCE_DIRECTION_CLAUSES } from "../../../supabase/functions/_shared/ltp/content/pass2-templates.ts";
import { lookupMateriality, GTM_MATERIALITY_REGISTER_VERSION } from "../../../supabase/functions/replay-cppa-risk-harness/_local/ltp/replay/gtm-materiality-register.ts";

// ── FIX 1 — owner-slot PII hardening (CEO-read fixtures, verbatim) ──

Deno.test("FIX1: parenthesised name is stripped", () => {
  assertEquals(
    sanitizeRoleTitleSegments("Chief Compliance Officer (Marcus Trent)"),
    ["Chief Compliance Officer"],
  );
});

Deno.test("FIX1: multi-segment parenthesised names → titles only", () => {
  assertEquals(
    sanitizeRoleTitleSegments(
      "General Counsel (Patricia Solis), Head of Data Engineering (Soren Beck), Customer Success Lead (Amara Diallo)",
    ),
    ["General Counsel", "Head of Data Engineering", "Customer Success Lead"],
  );
});

Deno.test("FIX1: unbalanced parentheses leak is stripped", () => {
  const out = sanitizeRoleTitleSegments(
    "Privacy Counsel (Sarah Nguyen, Chief Data Officer (Marcus Teel), Security Lead",
  );
  assertEquals(out.includes("Privacy Counsel"), true);
  assertEquals(out.some((s) => /Nguyen|Marcus|Teel/.test(s)), false);
});

Deno.test("FIX1: narrative segment is rejected", () => {
  assertEquals(
    sanitizeRoleTitleSegments(
      "General Counsel, and a junior privacy analyst. The CPO role has been vacant since February 2024.",
    ),
    ["General Counsel"],
  );
});

Deno.test("FIX1: no trailing periods and deduped", () => {
  assertEquals(
    sanitizeRoleTitleSegments("Privacy Counsel., Privacy Counsel"),
    ["Privacy Counsel"],
  );
});

Deno.test("FIX1: helpers behave", () => {
  assertEquals(stripParentheticals("Chief Officer (X Y)"), "Chief Officer");
  assertEquals(hasNameBigram("Marcus Trent"), true);
  assertEquals(hasNameBigram("Chief Officer"), false);
});

// ── FIX 1(e) — harness detector ──

Deno.test("FIX1e: detector trips on parenthesised name in Owner slot", () => {
  const r = evaluateOwnerSlotPii({
    priority_actions: ["Do the thing. Owner: Chief Compliance Officer (Marcus Trent)"],
  });
  assertEquals(r.failures.length, 1);
  assert(r.failures[0].startsWith("pii_owner_name:paren_name:"));
});

Deno.test("FIX1e: detector trips on narrative in Owner slot", () => {
  const r = evaluateOwnerSlotPii({
    priority_actions: [
      { text: "Do the thing. Owner: The CPO role has been vacant since February 2024" },
    ],
  });
  assert(r.failures.some((f) => f.startsWith("pii_owner_name:narrative:")));
});

Deno.test("FIX1e: clean titles-only owner slot passes", () => {
  const r = evaluateOwnerSlotPii({
    priority_actions: ["Do the thing. Owner: General Counsel, Privacy Counsel"],
  });
  assertEquals(r.failures, []);
});

// ── FIX 2 — submission / retention content ──

Deno.test("FIX2: section states § 7157 and § 7155(c) before the § 7121 block", () => {
  const text = `${renderSubmissionAndRetention()}\n\n${CYBER_AUDIT_SEPARATE_LEAD_IN}\n\n${renderCyberAuditSchedule()}`;
  assert(text.includes(SUBMISSION_RETENTION_MARKER));
  assert(text.includes("April 1, 2028"));
  assert(text.includes(
    "for as long as the processing continues or for five years after the completion of the risk assessment, whichever is later",
  ));
  assert(text.includes("45 calendar days"));
  assert(text.includes("§ 7155(a)(2)-(3)"));
  assert(text.indexOf("§ 7157(a)(1)") < text.indexOf(CYBER_AUDIT_SEPARATE_LEAD_IN));
  assert(text.indexOf(CYBER_AUDIT_SEPARATE_LEAD_IN) < text.indexOf("§ 7121(a)", text.indexOf(CYBER_AUDIT_SEPARATE_LEAD_IN) + 1));
});

// ── FIX 3 — affirmative outweigh clause unreachable ──

Deno.test("FIX3: affirmative outweigh clause is not emitted on a 7-negative/3-benefit record", async () => {
  const { composeSection } = await import("../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts");
  const mk = (id: string, kind: string) => ({
    factor_id: id,
    kind,
    present_in_intake: true,
    display_label: id,
    weight_note: `documented ${id}`,
    intake_ledger_refs: ["l1"],
    anchor: { pinpoint: "11 CCR § 7152(a)(5)" },
  });
  const plan = {
    intake: {},
    intake_ledger: [{ intake_field: "i1", value: "x" }],
    factor_table: [
      ...Array.from({ length: 7 }, (_, i) => mk(`neg${i}`, "negative_impact")),
      ...Array.from({ length: 3 }, (_, i) => mk(`ben${i}`, "benefit")),
    ],
    propositions: [],
    gate_outcomes: [],
    weighing_frame: [],
    // deno-lint-ignore no-explicit-any
  } as any;
  const out = JSON.stringify(composeSection("assessment_summary", plan) ?? []);
  assertEquals(out.includes(BALANCE_DIRECTION_CLAUSES[1]), false);
});

// ── FIX 4 — new detectors + register v1.2 ──

Deno.test("FIX4: cross-section duplication of a >=200-char passage flags", () => {
  const p = "A".repeat(120) + " balance paragraph " + "B".repeat(120);
  const r = evaluateCrossSectionDuplication({
    executive_summary: p,
    assessment_summary: [p],
  });
  assertEquals(r.failures.length, 1);
  assert(r.failures[0].startsWith("section_cross_duplication:"));
});

Deno.test("FIX4: short repeated passages do not flag cross-section", () => {
  const r = evaluateCrossSectionDuplication({ a: "short", b: "short" });
  assertEquals(r.failures, []);
});

Deno.test("FIX4: activity-count contradiction flags exec vs scope", () => {
  const r = evaluateActivityCountContradiction({
    executive_summary: "This assessment covers three processing activities.",
    scope: [
      "11 CCR § 7150(b)(1) engaged",
      "11 CCR § 7150(b)(2) engaged",
      "11 CCR § 7150(b)(3) engaged",
      "11 CCR § 7150(b)(4) engaged",
    ],
  });
  assertEquals(r.failures, ["activity_count_contradiction:exec=3:scope=4"]);
});

Deno.test("FIX4: matching counts do not flag", () => {
  const r = evaluateActivityCountContradiction({
    executive_summary: "This assessment covers two processing activities.",
    scope: ["11 CCR § 7150(b)(1)", "11 CCR § 7150(b)(3)"],
  });
  assertEquals(r.failures, []);
});

Deno.test("FIX4: register v1.2 classifies the four new classes as material", () => {
  assertEquals(GTM_MATERIALITY_REGISTER_VERSION, "gtm-materiality-v1.2-2026-07-30");
  for (const c of [
    "pii_owner_name:paren_name:Marcus Trent",
    "registry_corpus_drift:7150(b)(5)",
    "section_cross_duplication:executive_summary=assessment_summary",
    "activity_count_contradiction:exec=3:scope=4",
  ]) {
    assertEquals(lookupMateriality(c)?.materiality, "material", c);
  }
  // section_duplication remains non-material (Item 266/267 ratification).
  assertEquals(lookupMateriality("section_duplication:x:0=1")?.materiality, "non_material");
});
