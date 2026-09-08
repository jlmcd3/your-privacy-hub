// DOC 217 §4 — classify-propositions: span verification, sibling exclusivity,
// two-leg disagreement abstention, deterministic store hit.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isByteSubstring,
  mergeLegs,
  verifyLeg,
} from "../../../supabase/functions/classify-propositions/_local/merge.ts";
import {
  inventoryVersion,
  type InventoryRow,
} from "../../../supabase/functions/classify-propositions/_local/prompts.ts";
import {
  runClassify,
  type ClassifyDeps,
  type StoredDecision,
} from "../../../supabase/functions/classify-propositions/_local/classify.ts";

const INV: InventoryRow[] = [
  {
    prop_id: "f11.necessity.no_alternative",
    label: "No less intrusive alternative exists",
    definition: "The answer states that no less intrusive means achieves the purpose.",
    positive_examples: [],
    negative_examples: [],
    sibling_group: "f11.alternatives",
    version: 1,
  },
  {
    prop_id: "f11.necessity.alternative_exists",
    label: "A less intrusive alternative exists",
    definition: "The answer states a less intrusive means is available.",
    positive_examples: [],
    negative_examples: [],
    sibling_group: "f11.alternatives",
    version: 1,
  },
  {
    prop_id: "f11.purpose.fraud_detection",
    label: "The purpose is fraud detection",
    definition: "The answer states fraud detection as the purpose.",
    positive_examples: [],
    negative_examples: [],
    sibling_group: null,
    version: 1,
  },
];

const ANSWER = "We screen payments for fraud; no less intrusive method detects it.";

function leg(readings: unknown[]) {
  return { readings };
}

Deno.test("an assertion without a verbatim span abstains", () => {
  const m = verifyLeg(
    leg([{ prop_id: "f11.purpose.fraud_detection", stance: "asserted", evidence_span: "we hunt fraudsters", confidence: 0.9 }]),
    INV,
    ANSWER,
  );
  const r = m.get("f11.purpose.fraud_detection")!;
  assertEquals(r.stance, "abstain");
  assertEquals(r.span_verified, false);
  assertEquals(isByteSubstring("screen payments for fraud", ANSWER), true);
});

Deno.test("sibling exclusivity abstains the whole group", () => {
  const m = verifyLeg(
    leg([
      { prop_id: "f11.necessity.no_alternative", stance: "asserted", evidence_span: "no less intrusive method", confidence: 0.9 },
      { prop_id: "f11.necessity.alternative_exists", stance: "asserted", evidence_span: "We screen payments", confidence: 0.8 },
    ]),
    INV,
    ANSWER,
  );
  assertEquals(m.get("f11.necessity.no_alternative")!.stance, "abstain");
  assertEquals(m.get("f11.necessity.alternative_exists")!.stance, "abstain");
});

Deno.test("unknown prop_ids are dropped and every inventory item gets a reading", () => {
  const m = verifyLeg(
    leg([{ prop_id: "not.in.inventory", stance: "asserted", evidence_span: "We screen payments", confidence: 1 }]),
    INV,
    ANSWER,
  );
  assertEquals(m.size, INV.length);
  assertEquals(m.has("not.in.inventory"), false);
});

Deno.test("legs must agree: disagreement abstains", () => {
  const a = verifyLeg(
    leg([{ prop_id: "f11.purpose.fraud_detection", stance: "asserted", evidence_span: "screen payments for fraud", confidence: 0.9 }]),
    INV,
    ANSWER,
  );
  const b = verifyLeg(leg([]), INV, ANSWER);
  const merged = mergeLegs(a, b, INV);
  const r = merged.find((x) => x.prop_id === "f11.purpose.fraud_detection")!;
  assertEquals(r.stance, "abstain");
  assertEquals(r.legs_agree, false);
  assertEquals(r.label, "The purpose is fraud detection");

  const both = mergeLegs(a, a, INV).find((x) => x.prop_id === "f11.purpose.fraud_detection")!;
  assertEquals(both.stance, "asserted");
  assertEquals(both.evidence_span, "screen payments for fraud");
  assertEquals(both.legs_agree, true);
});

Deno.test("a stored decision returns without any model call", async () => {
  let calls = 0;
  const stored: StoredDecision = {
    decision_id: "",
    readings: [{
      prop_id: "f11.purpose.fraud_detection",
      label: "The purpose is fraud detection",
      stance: "asserted",
      evidence_span: "screen payments for fraud",
      confidence: 0.9,
      legs_agree: true,
      span_verified: true,
    }],
  };
  const deps: ClassifyDeps = {
    loadInventory: () => Promise.resolve(INV),
    findDecision: (id) => Promise.resolve({ ...stored, decision_id: id }),
    saveDecision: () => Promise.reject(new Error("must not save on a store hit")),
    callModel: () => {
      calls++;
      return Promise.resolve("{}");
    },
  };
  const out = await runClassify(
    { product: "lia", field_id: "necessity_details.alternatives", question_text: "q", answer: ANSWER },
    deps,
  );
  assertEquals(calls, 0);
  assertEquals(out.source, "store");
  assertEquals(out.readings[0].label, "The purpose is fraud detection");
});

Deno.test("model path is deterministic: same input yields the same decision_id", async () => {
  const saved: Record<string, unknown>[] = [];
  const raw = JSON.stringify({
    readings: [{ prop_id: "f11.purpose.fraud_detection", stance: "asserted", evidence_span: "screen payments for fraud", confidence: 0.9 }],
  });
  const deps: ClassifyDeps = {
    loadInventory: () => Promise.resolve(INV),
    findDecision: () => Promise.resolve(null),
    saveDecision: (row) => {
      saved.push(row);
      return Promise.resolve();
    },
    callModel: () => Promise.resolve(raw),
  };
  const input = { product: "lia", field_id: "purpose_details.stated_purpose", question_text: "q", answer: ANSWER };
  const a = await runClassify(input, deps);
  const b = await runClassify(input, deps);
  assertEquals(a.decision_id, b.decision_id);
  assertEquals(a.source, "model");
  assertEquals(saved.length, 2);
  assertEquals(String(saved[0].primary_raw), raw);
  assertEquals(a.readings.find((r) => r.prop_id === "f11.purpose.fraud_detection")!.stance, "asserted");
});

Deno.test("empty ratified inventory reads nothing and calls no model", async () => {
  let calls = 0;
  const out = await runClassify(
    { product: "lia", field_id: "x", question_text: "q", answer: ANSWER },
    {
      loadInventory: () => Promise.resolve([]),
      findDecision: () => Promise.resolve(null),
      saveDecision: () => Promise.resolve(),
      callModel: () => {
        calls++;
        return Promise.resolve("{}");
      },
    },
  );
  assertEquals(out.source, "empty_inventory");
  assertEquals(out.readings.length, 0);
  assertEquals(calls, 0);
  assertEquals((await inventoryVersion(INV)) === (await inventoryVersion([...INV].reverse())), true);
});
