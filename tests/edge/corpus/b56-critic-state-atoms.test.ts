// LEDGER B5-6 item 4 — `state:` atoms describe the customer record, not the
// authority's text, so source-presence objections against them are discarded.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyCritique } from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import { CRITIQUE_SYSTEM } from "../../../supabase/functions/generate-corpus-hooks/_local/prompts.ts";

const EXCERPT = "The controller processed special category data without an Article 9 condition.";
const ATOMS = [
  "flag:special_category",
  "class:employee_monitoring",
  "state:intake.balancing_details.special_category_data=true",
];

function critique(objs: unknown[]) {
  return JSON.stringify({ hook_id: "h1", verdict: "objections", objections: objs });
}

Deno.test("fact_atom_not_in_source against a state: atom is discarded", () => {
  const r = verifyCritique(
    critique([{ code: "fact_atom_not_in_source", target: "fact_atoms", index: 2, source_span: null, severity: "block" }]),
    "h1",
    EXCERPT,
    ATOMS,
  );
  assertEquals(r.objections.length, 0);
  assertEquals(r.verdict, "no_objection");
  assertEquals(r.discarded.length, 1);
});

Deno.test("the same objection against a flag: atom survives", () => {
  const r = verifyCritique(
    critique([{ code: "fact_atom_not_in_source", target: "fact_atoms", index: 0, source_span: null, severity: "block" }]),
    "h1",
    EXCERPT,
    ATOMS,
  );
  assertEquals(r.objections.length, 1);
  assertEquals(r.objections[0].severity, "block");
});

Deno.test("other objection codes against a state: atom are untouched", () => {
  const r = verifyCritique(
    critique([{ code: "fact_atom_is_legal_conclusion", target: "fact_atoms", index: 2, source_span: null, severity: "warn" }]),
    "h1",
    EXCERPT,
    ATOMS,
  );
  assertEquals(r.objections.length, 1);
});

Deno.test("the critic prompt states the state: atom rule", () => {
  assertEquals(CRITIQUE_SYSTEM.includes("NEVER raise fact_atom_not_in_source"), true);
  assertEquals(CRITIQUE_SYSTEM.includes("CUSTOMER RECORD"), true);
});
