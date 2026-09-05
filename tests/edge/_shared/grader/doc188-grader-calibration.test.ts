// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), grader
// instrument items.
//
//   cal_skeleton_10  IR us-ds5: CRITICAL "omits statutory notification
//                    deadlines" against a playbook whose Notification Clocks
//                    table and Deadline Board state exactly those clocks.
//   cal_skeleton_11  US Notice us-ds3: "&#39; visible in customer text" —
//                    an HTML entity in the flattened HTML payload, not the
//                    rendered notice.
//   F4               The deterministic raw-field-token scanner flagged the
//                    customer's own words ("deletion trigger is capture_ts +
//                    90d") as a leaked field name; tokens present in the
//                    intake's own text are now excluded.
//   Instrument       Rules 10–11 registered in source, shared copy and mirror;
//                    GRADER_CONTEXT_VERSION keeps its prefix and carries the
//                    appended tags (doc-149 INSTRUMENT RULE).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySkeletonCalibration,
  matchesRule10,
  matchesRule11,
  reportCarriesNotificationClocks,
  reportIsHtmlSourced,
  SKELETON_CAL_RULE_IDS,
  SKELETON_CAL_VERSION,
} from "../../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";
import {
  applySkeletonCalibration as applyMirror,
  SKELETON_CAL_RULE_IDS as MIRROR_RULE_IDS,
} from "../../../../supabase/functions/grade-single-assessment/_local/grader/skeleton-calibration-mirror.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../../supabase/functions/_shared/grader/context.ts";
import { intakeTokenSet, runDeterministicQa } from "../../../../supabase/functions/grade-single-assessment/_local/grader/deterministic-qa.ts";

const EV_DEADLINES_IR_DS5 =
  "The playbook omits the statutory notification deadlines that apply to this incident: California requires notice within 30 days and a 15-day AG sample copy where more than 500 residents are affected, Colorado requires notice within 30 days, and Illinois requires notice in the most expedient time possible. None of these deadlines is stated.";
const EV_DEADLINE_WRONG =
  "The Deadline Board misstates the Colorado deadline as 45 days; § 6-1-716(2)(a) requires notice within 30 days.";
const EV_ENTITY_US_DS3 =
  "Internal reasoning leak: the customer text reads \"Reply to our decision email with &#39;Appeal&#39; in the subject line\" — a raw HTML entity is visible to the reader.";

const CLOCKS_REPORT = {
  skeleton_document: {
    title: "IR",
    sections: [{
      id: "clocks",
      title: "Notification Clocks",
      paragraphs: [{ kind: "table", text: "", table: { title: "Notification Clocks", columns: ["Jurisdiction", "Clock"], rows: [["California", "30 calendar days"]] } }],
    }],
  },
};
const NO_CLOCKS_REPORT = { skeleton_document: { title: "IR", sections: [{ id: "s", title: "Scope", paragraphs: [{ kind: "skeleton", text: "Scope." }] }] } };
const HTML_REPORT = { document_text: "U.S. Privacy Notice — Reply to our decision email with &#39;Appeal&#39; in the subject line." };

// ── Rule 10 ──────────────────────────────────────────────────────────────────

Deno.test("doc188 — cal_skeleton_10 filters the deadline-omission claim when the document tables its clocks", () => {
  assert(reportCarriesNotificationClocks(CLOCKS_REPORT));
  assert(!reportCarriesNotificationClocks(NO_CLOCKS_REPORT));
  assert(matchesRule10(EV_DEADLINES_IR_DS5, CLOCKS_REPORT));
  assert(!matchesRule10(EV_DEADLINES_IR_DS5, NO_CLOCKS_REPORT), "without the clocks table the omission claim stands");
  assert(!matchesRule10(EV_DEADLINE_WRONG, CLOCKS_REPORT), "an affirmative-error claim about a stated deadline passes through");
  assert(!matchesRule10("The report omits the DPO's contact details.", CLOCKS_REPORT), "an omission claim about something else passes through");
});

// ── Rule 11 ──────────────────────────────────────────────────────────────────

Deno.test("doc188 — cal_skeleton_11 filters an HTML-entity claim only for an HTML-sourced payload", () => {
  assert(reportIsHtmlSourced(HTML_REPORT));
  assert(!reportIsHtmlSourced(CLOCKS_REPORT));
  assert(matchesRule11(EV_ENTITY_US_DS3, HTML_REPORT));
  assert(!matchesRule11(EV_ENTITY_US_DS3, CLOCKS_REPORT), "a literal entity in a skeleton document would print — the rule stands down");
  assert(!matchesRule11("The notice's Section 12 leaves the supervisory authority as a bracketed prompt.", HTML_REPORT));
});

// ── Routing, source + mirror ─────────────────────────────────────────────────

Deno.test("doc188 — applySkeletonCalibration routes the batch's two findings to rules 10 and 11 and keeps a genuine finding", () => {
  const irFindings = [
    { check_id: "rubric_actionability", dimension: "intelligence", severity: "critical", passed: false, evidence: EV_DEADLINES_IR_DS5 },
    { check_id: "rubric_unsupported_business_claim", dimension: "hallucination", severity: "medium", passed: false, evidence: "The playbook states the processor is Nordisk WMS Hosting ApS; no processor is named in the intake." },
  ];
  for (const apply of [applySkeletonCalibration, applyMirror]) {
    const { kept, filtered, counts } = apply(irFindings, { report: CLOCKS_REPORT, payloadComplete: true });
    assertEquals(counts.cal_skeleton_10, 1);
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].rule, "cal_skeleton_10");
    assertEquals(kept.length, 1);
    assertEquals(kept[0].check_id, "rubric_unsupported_business_claim");
  }
  const noticeFindings = [
    { check_id: "rubric_internal_reasoning_leak", dimension: "formatting", severity: "high", passed: false, evidence: EV_ENTITY_US_DS3 },
  ];
  for (const apply of [applySkeletonCalibration, applyMirror]) {
    const { kept, counts } = apply(noticeFindings, { report: HTML_REPORT });
    assertEquals(counts.cal_skeleton_11, 1);
    assertEquals(kept.length, 0);
  }
});

Deno.test("doc188 — rules 10–11 are registered in source and mirror and stamped under the kept prefix", () => {
  for (const id of ["cal_skeleton_10", "cal_skeleton_11"]) {
    assert(SKELETON_CAL_RULE_IDS.includes(id as never));
    assert(MIRROR_RULE_IDS.includes(id as never));
  }
  assertEquals(SKELETON_CAL_VERSION, "gc-2026-08-28-skeleton-cal-3-item204", "the epoch prefix is kept; rules are appended");
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION));
  for (const id of SKELETON_CAL_RULE_IDS) assert(GRADER_CONTEXT_VERSION.includes(id));
  assertStringIncludes(GRADER_CONTEXT_VERSION, "+skeleton-cal-5-doc188[cal_skeleton_10|cal_skeleton_11]");
  assertStringIncludes(GRADER_CONTEXT_VERSION, "+batch-e38460-cal-2026-09-05");
  assert(GRADER_CONTEXT_VERSION.indexOf("+batch14-cal-2026-09-04") < GRADER_CONTEXT_VERSION.indexOf("+skeleton-cal-5-doc188"), "tags append in order");
});

Deno.test("doc188 — the prose calibration carries the six batch-e38460 classes", () => {
  assertStringIncludes(SHARED_GRADER_CONTEXT, "DOC 188 (batch-e38460 triage, 2026-09-05)");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "ICO DATA-PROTECTION FEE TIER 3 ATTACHES ON STAFF ALONE");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "REGISTRATION QUOTES ARE CORPUS TEXT");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "WP243 ON A VOLUNTARY DPO");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "NESTED INTAKE OBJECTS ARE INTAKE");
});

// ── F4 — the customer's own code-like words ──────────────────────────────────

function docWithText(text: string) {
  return { skeleton_document: { title: "T", sections: [{ id: "s", title: "S", paragraphs: [{ kind: "skeleton", text }] }] } };
}

const MINIMISATION =
  "On data minimisation, the company has stated: \"Location data — 90 days from the capture timestamp, deletion trigger is capture_ts + 90d enforced by an automated job; aggregate metrics — deletion trigger is computation_ts + 12m\".";

Deno.test("doc188 F4 — intakeTokenSet collects the camel/snake tokens in the intake's string values, at any depth", () => {
  const tokens = intakeTokenSet({
    necessity_details: { data_minimised: "deletion trigger is capture_ts + 90d and computation_ts + 12m" },
    balancing_details: { safeguards: ["Pseudonymised dashboards", "retentionPolicy applied"] },
    scale: 480,
  });
  assert(tokens.has("capture_ts"));
  assert(tokens.has("computation_ts"));
  assert(tokens.has("retentionPolicy"));
  // Field NAMES are not collected — a key appearing in the document is the leak the scanner exists for.
  assert(!tokens.has("data_minimised"));
  assert(!tokens.has("necessity_details"));
});

Deno.test("doc188 F4 — a token the customer wrote is not a leaked field name; a token they did not write still is", () => {
  const intake = { necessity_details: { data_minimised: "deletion trigger is capture_ts + 90d; aggregate deletion trigger is computation_ts + 12m" } };
  const quoted = runDeterministicQa(docWithText(MINIMISATION), intake);
  assert(
    !quoted.some((f) => f.check_id === "deterministic_raw_field_token"),
    `the customer's own tokens were flagged: ${JSON.stringify(quoted)}`,
  );
  // Without the intake the scanner keeps its former behaviour.
  const unaided = runDeterministicQa(docWithText(MINIMISATION));
  assert(unaided.some((f) => f.check_id === "deterministic_raw_field_token"));
  // A genuine leak beside the quoted words still fires.
  const leaked = runDeterministicQa(docWithText(`${MINIMISATION} The value of some_leaking_field remains unresolved.`), intake);
  const hit = leaked.find((f) => f.check_id === "deterministic_raw_field_token");
  assert(hit && hit.evidence.includes("some_leaking_field"), JSON.stringify(leaked));
});
