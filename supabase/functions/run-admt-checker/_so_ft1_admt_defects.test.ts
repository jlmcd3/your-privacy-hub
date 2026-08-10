// SO-FT-1 — regression battery for the four defects the first so-final-test
// batch (27eb6f66 / run 78a7885a / doc 7fef6efd) surfaced in cppa-admt.
//
//   1. pinpoints assigned to the wrong action (secure transmission, denial
//      basis, aggregate response);
//   2. blanket §§ 7200–7222 range on duty-bearing action records the grader's
//      sentence-scoped check could not see;
//   3. registry-coverage failures mislabelled as intake-sufficiency failures;
//   4. (prompt-only, not unit-testable here).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "./_local/registry/admt-verified-authorities.ts";
import { CITATION_REGISTRY } from "../_shared/admt-citation-registry.ts";
import {
  validatePropositionAssignment,
  rekeyPropositionAssignment,
} from "./_local/ltp/admt-proposition-anchors.ts";
import {
  resolveActionCitation,
  ADMT_SUBCHAPTER_FALLBACK,
} from "./_local/ltp/admt-action-citations.ts";
import { checkH7BlanketAdmtRange } from "../_shared/grader/cppa-hf1-checks.ts";

const NEW_KEYS = [
  "access_antiretal", "access_antiretal_link", "access_verify",
  "access_denial", "access_secure_tx", "access_aggregate",
  "optout_preinit", "optout_cease15", "optout_notify_sp",
];

Deno.test("defect 1/3 — every newly covered proposition has a verified row", () => {
  for (const k of NEW_KEYS) {
    const row = (ADMT_VERIFIED_AUTHORITIES as Record<string, any>)[k];
    assert(row, `missing verified row: ${k}`);
    assert(row.verbatim_quote.length > 40, `thin quote: ${k}`);
    assertEquals(
      row.subsection,
      (CITATION_REGISTRY as Record<string, any>)[k].section,
      `pinpoint disagrees with CITATION_REGISTRY: ${k}`,
    );
  }
});

Deno.test("defect 1 — secure-transmission action re-keys to § 7222(g)", () => {
  const entry: Record<string, unknown> = {
    action: "Implement encrypted, secure transmission of the access response so the requested information reaches the consumer over a protected channel.",
    proposition_key: "access_logic",
    citation: "11 CCR § 7222(b)(2)",
  };
  const outcome = resolveActionCitation(entry, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(entry.citation, "11 CCR § 7222(g)");
  assertEquals(entry.proposition_key, "access_secure_tx");
  assertEquals(outcome, "resolved_by_key");
});

Deno.test("defect 1 — denial/partial-denial action re-keys to § 7222(f)", () => {
  const entry: Record<string, unknown> = {
    action: "Adopt a documented denial procedure: when a verified access request is denied in whole or in part, inform the requestor, explain the basis for the denial, and disclose the other information sought.",
    proposition_key: "access_provide",
    citation: "11 CCR § 7222(a)",
  };
  resolveActionCitation(entry, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(entry.citation, "11 CCR § 7222(f)");
  assertEquals(entry.proposition_key, "access_denial");
});

Deno.test("defect 1 — aggregate-response action re-keys to § 7222(j)", () => {
  const entry: Record<string, unknown> = {
    action: "Where the ADMT was applied to a consumer more than four times within a 12-month period, provide an aggregate-level response summarising the outputs and the parameters that on average affected them.",
    proposition_key: "access_outcome",
    citation: "11 CCR § 7222(b)(3)",
  };
  resolveActionCitation(entry, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(entry.citation, "11 CCR § 7222(j)");
  assertEquals(entry.proposition_key, "access_aggregate");
});

Deno.test("defect 1 — a correct assignment is never disturbed", () => {
  const entry: Record<string, unknown> = {
    action: "Disclose information about the logic of the ADMT, including the parameters that generated the output with respect to the consumer.",
    proposition_key: "access_logic",
    citation: "11 CCR § 7222(b)(2)",
  };
  resolveActionCitation(entry, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(entry.citation, "11 CCR § 7222(b)(2)");
  assertEquals(entry.proposition_key, "access_logic");
});

Deno.test("defect 1 — thin rival support still takes the honest downgrade", () => {
  const v = {
    verdict: "mismatch" as const,
    contradicting_key: "access_secure_tx",
    contradicting_support: 1,
    assigned_support: 1,
  };
  assertEquals(rekeyPropositionAssignment(v), null);
});

Deno.test("defect 1 — a definitional § 7001 rival is never promoted", () => {
  const v = {
    verdict: "mismatch" as const,
    contradicting_key: "human_involvement",
    contradicting_support: 4,
    assigned_support: 0,
  };
  assertEquals(rekeyPropositionAssignment(v), null);
});

Deno.test("defect 1 — validator reports support counts", () => {
  const v = validatePropositionAssignment(
    { action: "secure transmission of the requested information to the consumer" },
    "access_logic",
  );
  assert(typeof v.assigned_support === "number" || v.verdict === "mismatch");
});

Deno.test("defect 2 — blanket range in a labelled citation line is caught", () => {
  const text = [
    "- Cease ADMT processing under the leasing SOP within the 15-business-day window and document the cessation date.",
    "  Citation: 11 CCR §§ 7200–7222",
    "  Responsible: Privacy Officer",
  ].join("\n");
  const f = checkH7BlanketAdmtRange(text);
  assertEquals(f.filter((x) => x.check_id === "h7_admt_blanket_range" && x.passed === false).length, 1);
});

Deno.test("defect 2 — duty and range in different sentences of one record", () => {
  const text =
    "The business must log every aggregate-use response it provides to a consumer. The governing authority is 11 CCR §§ 7200–7222.";
  const f = checkH7BlanketAdmtRange(text);
  assertEquals(f.filter((x) => x.check_id === "h7_admt_blanket_range" && x.passed === false).length, 1);
});

Deno.test("defect 2 — scope framing in a long narrative still passes", () => {
  const text =
    "This assessment considers whether the 11 CCR §§ 7200–7222 ADMT obligations attach on this record. " +
    "The analysis below sets out the scope determination and the basis on which it rests, working through each " +
    "element of the deployment in turn so that the reader can follow how the conclusion was reached, including " +
    "the significant-decision analysis, the human-involvement analysis, and the downstream consequences for the " +
    "consequences that follow if the determination is confirmed on the record as supplied.";
  const f = checkH7BlanketAdmtRange(text);
  assertEquals(f.filter((x) => x.check_id === "h7_admt_blanket_range" && x.passed === false).length, 0);
});

Deno.test("defect 2 — clean record passes", () => {
  const text = [
    "- Cease ADMT processing within 15 business days of the request.",
    "  Citation: 11 CCR § 7221(n)(1)",
  ].join("\n");
  const f = checkH7BlanketAdmtRange(text);
  assertEquals(f.filter((x) => x.check_id === "h7_admt_blanket_range" && x.passed === false).length, 0);
});

Deno.test("defect 3 — the four boilerplate-stamped elements now resolve", () => {
  // element_id → the pack member that must now carry a verified pinpoint.
  const expected: Record<string, string> = {
    access_antiretaliation: "11 CCR § 7222(b)(4)",
    access_secure_transmission: "11 CCR § 7222(g)",
    access_denial_basis: "11 CCR § 7222(f)",
    optout_processing: "11 CCR § 7221(n)(1)",
  };
  const packs: Record<string, string[]> = {
    access_antiretaliation: ["access_antiretal", "access_antiretal_link"],
    access_secure_transmission: ["access_secure_tx"],
    access_denial_basis: ["access_denial", "access_verify"],
    optout_processing: ["optout_cease15", "optout_notify_sp", "optout_preinit"],
  };
  for (const [eid, want] of Object.entries(expected)) {
    const first = packs[eid]
      .map((k) => (ADMT_VERIFIED_AUTHORITIES as Record<string, any>)[k])
      .find(Boolean);
    assert(first, `no verified row reachable for ${eid}`);
    assertEquals(first.subsection, want, eid);
  }
});

Deno.test("defect 3 — fallback constant unchanged (no new customer prose)", () => {
  assertEquals(ADMT_SUBCHAPTER_FALLBACK, "the applicable ADMT-subchapter provision");
});
