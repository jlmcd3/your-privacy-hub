// Batch b83ea3c4 (2026-09-05) — the RoPA harness arm's row builders.
//
// Two harness defects on the first batch after doc 168: the per-activity
// answer map stopped at the ten pre-doc-168 keys (so every register read
// "owned by an owner it has not named" / "collected from sources it has not
// recorded" on fully answered fixtures), and the client-profile upsert never
// wrote rights_handling_process, so a sample fixture's sentence
// ("privacy@northpolemanualmining.example …") left on the shared stress
// client rendered as every company's own.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ROPA_ACTIVITY_ANSWER_KEYS,
  ropaAnswerRows,
  ropaProfileRow,
} from "../../../supabase/functions/run-stress-job/_local/ropa-rows.ts";

const ACTIVITY: Record<string, unknown> = {
  activity_name: "User Account Registration and Management",
  category: "Customer Account Management",
  purpose: "To create and maintain user accounts.",
  lawful_basis: "Contract (Art. 6(1)(b))",
  special_category_basis: null,
  data_subjects: "Registered platform users",
  data_categories: ["Contact details", "Customer records"],
  recipients: "Internal engineering and support teams; AWS EU",
  transfer_destination: "EU (Ireland — AWS)",
  transfer_mechanism: "Standard Contractual Clauses",
  retention_period: "Duration of account plus 2 years",
  security_measures: "Salted hashes; TLS; RBAC",
  activity_owner: "Head of Engineering",
  collection_sources: "Directly from the data subject at registration",
  processing_operations: ["collection", "recording", "storage", "use", "erasure"],
  access_controls: "Role-based permissions in the identity management system.",
  notices_displayed: "Platform Privacy Notice at registration.",
  incident_log: "Internal security incident register.",
  related_assessments: ["LIA-VDL-2024-001"],
};

Deno.test("batch b83ea3c4 — every doc-168 structured element the generator writes reaches the answer rows", () => {
  const rows = ropaAnswerRows([ACTIVITY], [{ id: "act-1", display_order: 0 }], "sess-1");
  const keys = rows.map((r) => r.question_key);
  for (const k of ["activity_owner", "collection_sources", "processing_operations", "access_controls", "notices_displayed", "incident_log", "related_assessments"]) {
    assert(keys.includes(k), `${k} must be written as an answer row`);
  }
  assert(!keys.includes("special_category_basis"), "a null answer is not a row (batch 4ed05f22)");
  assert(!keys.includes("activity_name") && !keys.includes("category"), "activity columns are not answers");
  assertEquals(rows.find((r) => r.question_key === "activity_owner")?.answer_value, "Head of Engineering");
  for (const r of rows) {
    assertEquals(r.activity_id, "act-1");
    assertEquals(r.session_id, "sess-1");
  }
  assertEquals(keys.length, ROPA_ACTIVITY_ANSWER_KEYS.length - 1);
});

Deno.test("batch b83ea3c4 — the profile row writes every owned column; a silent persona writes null, never a leftover", () => {
  const row = ropaProfileRow({
    legal_entity_type: "Private Limited Company",
    employee_band: "100–500",
    dpo_name: "Clara Voss",
    dpo_email: "dpo@velorixdigital.com",
  }, "client-1");
  assertEquals(row.client_id, "client-1");
  assertEquals(row.dpo_name, "Clara Voss");
  assertEquals(row.rights_handling_process, null);
  assertEquals(row.registered_address, null);
  assertEquals(row.eu_rep_email, null);
  assertEquals(row.is_controller, true);
  assertEquals(row.is_processor, false);
  assert("rights_handling_process" in row, "the column must be present so the upsert overwrites a stale value");

  const withRights = ropaProfileRow({ rights_handling_process: "Requests reach privacy@velorixdigital.com …" }, "client-1");
  assertEquals(withRights.rights_handling_process, "Requests reach privacy@velorixdigital.com …");
});
