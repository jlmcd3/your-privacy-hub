// BATCH 18b (Wave C1 — doc 111 queue, doc 109 §2.10 items 1–4, doc 113
// Session-2 seam rulings). The IR playbook restructure:
//   S2.1  "table" blocks join the spine; IR_SKELETON_PARAGRAPHS untouched
//         (hash recompute pinned here).
//   S2.2  Standing Sections slot values are pointers to the tables.
//   S2.3  Escalation roster / external support / notification clocks tables.
//   S2.4  Standing-gap ledger dedupe (the doubled "Contractual notification
//         obligations" pair) with agreeing counts.
//   S2.5  Readiness banner — "Readiness. " prefix on the Part One lead.
//   S2.6  One amber "Deadline." callout; never on a no-GDPR record.
//   S2.7  US de-tripling: state clocks live in tables, not prose sentences;
//         the action plan is a table.
//   S2.8  Deadline board in clock order.
//   S2.9  Mega-block splits (four-gate list; grouped paragraphs).
//   S2.10 Incident facts strip (hideHeader).

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_SKELETON_CONTENT_HASH,
  IR_SKELETON_PARAGRAPHS,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/plans/ir-playbook.spine.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument, standingGapLedger } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function usIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Busted Sled Solutions, Inc.",
    organisationType: "Company",
    discoveryDateTime: "2026-08-20T10:00",
    cause: "Ransomware or malware",
    dataTypes: ["Government IDs / SSN", "Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["California", "Texas"],
    contained: "No",
    responseTeamRoster: [
      { role: "Incident Lead", name: "J. Ortiz", alternate: "P. Chen" },
    ],
    outsideCounselName: "Vance & Arden LLP",
    breachNoticeContracts: [
      { party: "Acme Fulfilment", deadline: "48 hours from confirmation", clause: "cl. 11.4" },
    ],
    ...over,
  };
}

function euIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Nordkyst Cold Chain A/S",
    organisationType: "Logistics operator",
    discoveryDateTime: "2026-08-29T14:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details", "Biometric data"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["Denmark"],
    contained: "Yes",
    processorInvolved: true,
    processorName: "Nordisk WMS ApS",
    ...over,
  };
}

function assemble(intake: Bag, standingOver?: Bag) {
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  if (standingOver) report.standing_playbook = standingOver;
  return assembleIRSkeletonDocument(report, intake);
}

function tablesOf(out: ReturnType<typeof assembleIRSkeletonDocument>, sectionId: string) {
  const sec = out.document.sections.find((s) => s.id === sectionId);
  return (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
}

Deno.test("C1/S2.1: IR_SKELETON_PARAGRAPHS hash is byte-unchanged by the table blocks", async () => {
  const joined = IR_SKELETON_PARAGRAPHS.join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(joined));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(hex, IR_SKELETON_CONTENT_HASH);
});

Deno.test("C1/S2.2+S2.3: Standing Sections carry pointer slots and the three tables", () => {
  const out = assemble(usIntake());
  assertEquals(out.conformance, []);
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "The escalation path the company has recorded: the roles and named holders set out in the escalation table below.");
  assertStringIncludes(text, "External support: the supporting parties set out in the external support table below.");
  assertStringIncludes(text, "Notification obligations and their clocks: each set out in the notification clocks table below with its statutory basis.");
  const tables = tablesOf(out, "standing_sections");
  assertEquals(tables.map((t) => t.title), ["Escalation roster", "External support", "Notification clocks"]);
  assertEquals(tables[0].columns, ["Role", "Primary", "Alternate"]);
  assertEquals(tables[0].rows[0], ["Incident Lead", "J. Ortiz", "P. Chen"]);
  assertEquals(tables[2].columns, ["Jurisdiction", "Notify individuals", "Notify regulator", "Citation"]);
  assert(tables[2].rows.some((r) => r[0] === "California"));
});

Deno.test("C1/S2.2: absent roster and support keep null slots — no pointer to a missing table", () => {
  const out = assemble({
    organizationName: "Bare Co",
    organisationType: "Company",
    jurisdictions: ["California"],
  });
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("escalation table below"), "pointer printed with no roster");
  assert(!text.includes("external support table below"), "pointer printed with no support");
  assertEquals(tablesOf(assemble({ organizationName: "Bare Co", organisationType: "Company", jurisdictions: ["California"] }), "standing_sections").filter((t) => t.title === "Escalation roster"), []);
});

Deno.test("C1/S2.4: the doubled contractual pair dedupes to one ledger row and the counts agree", () => {
  const dupSections = {
    status: "record_insufficient",
    sections: [
      { heading: "Activation criteria", status: "record_insufficient", information_needed: "Record the activation criteria; that completes this section." },
      { heading: "Severity matrix", status: "recorded" },
      { heading: "Contractual notification obligations — determination", status: "record_insufficient", information_needed: "Record each agreement carrying a breach-notice clause, with its counterparty, notice deadline and clause reference; that completes this section." },
      { heading: "Contractual notification obligations", status: "record_insufficient", information_needed: "Record each agreement carrying a breach-notice clause, with its counterparty, notice deadline and clause reference; that completes this section." },
      { heading: "Testing and training", status: "recorded" },
    ],
  };
  const ledger = standingGapLedger({ standing_playbook: dupSections });
  assertEquals(ledger.length, 2);
  assertEquals(ledger.map((g) => g.heading), ["Activation criteria", "Contractual notification obligations"]);

  const out = assemble(usIntake(), dupSections);
  const text = skeletonDocumentToText(out.document);
  // Lead and posture both count the DEDUPED ledger; totals sum for the reader.
  assertStringIncludes(text, "2 standing sections are not settled");
  assertStringIncludes(text, "recorded the arrangements behind 2 of the 4 standing sections");
  assertStringIncludes(text, "The ledger carries 2 standing sections as unrecorded, and the preparedness gaps table below states what would fill each.");
  const gaps = tablesOf(out, "standing_playbook").find((t) => t.title === "Preparedness gaps");
  assertExists(gaps);
  assertEquals(gaps.columns, ["Standing section", "What completes it"]);
  assertEquals(gaps.rows.length, 2);
  assertEquals(gaps.rows[1][0], "Contractual notification obligations");
});

Deno.test("C1/S2.4: the all-recorded state takes the single count sentence and no gaps table", () => {
  const out = assemble(usIntake(), {
    status: "complete",
    sections: [
      { heading: "Activation criteria", status: "recorded" },
      { heading: "Severity matrix", status: "recorded" },
    ],
  });
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "All 2 standing sections are recorded, and each is set out below as the company gave it.");
  assert(!text.includes("preparedness gaps table"), "gaps pointer printed with no gaps");
  assertEquals(tablesOf(out, "standing_playbook"), []);
});

Deno.test("C1/S2.5: the Part One lead is the readiness banner in both states", () => {
  const negative = assemble(usIntake(), {
    status: "record_insufficient",
    sections: [{ heading: "Activation criteria", status: "record_insufficient", information_needed: "Record it." }],
  });
  assertStringIncludes(skeletonDocumentToText(negative.document), "Readiness. On the company's answers, Busted Sled Solutions, Inc.'s standing preparedness would not carry it through a notifiable incident unaided");
  const positive = assemble(usIntake(), {
    status: "complete",
    sections: [{ heading: "Activation criteria", status: "recorded" }],
  });
  assertStringIncludes(skeletonDocumentToText(positive.document), "Readiness. On the company's answers, Busted Sled Solutions, Inc.'s standing preparedness would carry it through a notifiable incident");
});

Deno.test("C1/S2.6: exactly one Deadline. callout on a GDPR record; none on a no-GDPR record", () => {
  const eu = skeletonDocumentToText(assemble(euIntake()).document);
  assertEquals(eu.split("Deadline. The company records discovery at").length - 1, 1);
  assertStringIncludes(eu, "so the 72-hour outer limit runs to 2026-09-01 at 18:00 UTC");
  const us = skeletonDocumentToText(assemble(usIntake()).document);
  assert(!us.includes("Deadline. The company records discovery"), "72-hour callout printed on a record the GDPR does not govern");
  assert(!us.includes("72-hour outer limit"), "GDPR outer limit printed on a no-GDPR record");
});

Deno.test("C1/S2.7: the US state clocks live in tables, not repeated prose sentences", () => {
  const out = assemble(usIntake());
  const text = skeletonDocumentToText(out.document);
  // The clock text appears exactly three times: notification-clocks table,
  // deadline board, action plan — never as a body sentence (the old
  // "California: notification to affected California residents…" block).
  const CA_CLOCK = "within 30 calendar days of discovery";
  assertEquals(text.split(CA_CLOCK).length - 1, 3, "state clock count moved from prose to its three tabular homes");
  assert(!text.includes("California: Notification to affected California residents"), "retired per-state prose sentence resurfaced");
  assert(!text.includes("The action plan, in the order the clocks run:"), "US action plan still prose");
  const plan = tablesOf(out, "incident_worksheet").find((t) => t.title === "Action plan");
  assertExists(plan);
  assertEquals(plan.columns, ["Order", "Duty", "Deadline", "Citation"]);
  // Clock order: the 48-hour contractual clock outruns the 30-day statute.
  assertEquals(plan.rows[0][0], "1");
  assertEquals(plan.rows[0][1], "Notify Acme Fulfilment");
  assert(plan.rows.some((r) => r[1] === "Notify under the law of California"));
});

Deno.test("C1/S2.7: the EU record keeps its Art. 33(3) element plan as prose and gets no plan table", () => {
  const out = assemble(euIntake());
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "The action plan, in the order the clocks run:");
  assertEquals(tablesOf(out, "incident_worksheet").filter((t) => t.title === "Action plan"), []);
});

Deno.test("C1/S2.8: the deadline board sorts by clock and statuses map from real determinations", () => {
  const us = assemble(usIntake());
  const board = tablesOf(us, "incident_worksheet").find((t) => t.title === "Deadline board");
  assertExists(board);
  assertEquals(board.columns, ["Clock", "Runs to / limit", "Source", "Status"]);
  assertEquals(board.rows[0][0], "Acme Fulfilment — contractual notice"); // 48h first
  assertEquals(board.rows[0][3], "Triggered");
  assert(board.rows.some((r) => r[0].startsWith("California") && r[3] === "Recorded duty"));

  const eu = assemble(euIntake());
  const euBoard = tablesOf(eu, "incident_worksheet").find((t) => t.title === "Deadline board");
  assertExists(euBoard);
  assert(euBoard.rows[0][0].includes("supervisory authority"));
  assertStringIncludes(euBoard.rows[0][1], "runs to 2026-09-01 at 18:00 UTC");
});

Deno.test("C1/S2.9: the four-gate walk renders as one lead line plus four gate lines", () => {
  const out = assemble(usIntake());
  const sec = out.document.sections.find((s) => s.id === "incident_worksheet");
  const walk = sec?.paragraphs.find((p) => p.text.includes("four things are reviewed"));
  assertExists(walk);
  const lines = walk.text.split("\n").filter(Boolean);
  assertEquals(lines.length, 5);
  assert(lines[1].startsWith("First, whether it counts as a breach"));
  assert(lines[4].startsWith("Fourth, whether encryption changes the outcome"));
});

Deno.test("C1/S2.10: the incident facts strip is a hideHeader table of recorded facts only", () => {
  const eu = assemble(euIntake());
  const strip = tablesOf(eu, "incident_worksheet").find((t) => t.title === "Incident facts");
  assertExists(strip);
  assert(strip.hideHeader === true);
  assert(strip.rows.some((r) => r[0] === "Processor" && r[1] === "Nordisk WMS ApS"));
  // Blank worksheet => no strip, no board (blank by design).
  const blank = assemble({ organizationName: "Bare Co", organisationType: "Company", jurisdictions: ["California"] });
  const blankTables = tablesOf(blank, "incident_worksheet").map((t) => t.title);
  assert(!blankTables.includes("Incident facts"));
  assert(!blankTables.includes("Deadline board"));
});

Deno.test("C1: conformance and banned register stay clean on both paths", () => {
  for (const out of [assemble(usIntake()), assemble(euIntake())]) {
    assertEquals(out.conformance, []);
    assertEquals(out.register_findings, []);
  }
});
