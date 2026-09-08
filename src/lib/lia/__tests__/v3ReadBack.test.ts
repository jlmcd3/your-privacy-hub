// DOC 217 §6 — the read-back client module: hashing (a known SHA-256 vector,
// so `answer_hash` is one value in every runtime), the canonical intake
// hash, readings_state, and the four transports against a mocked supabase
// client (the gate, the classifier, the store writes) — every failure path
// fails open with a typed error, never a throw.

import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above every import, so the mock's state is
// created with vi.hoisted (the documented pattern) rather than as plain
// top-level consts.
const { invoke, fromCalls, store } = vi.hoisted(() => ({
  invoke: vi.fn(),
  fromCalls: [] as { table: string; op: string; args: unknown[] }[],
  store: { nextError: null as unknown },
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const api: Record<string, unknown> = {};
    for (const op of ["update", "insert", "select", "eq", "single"]) {
      api[op] = (...args: unknown[]) => {
        fromCalls.push({ table, op, args });
        return api;
      };
    }
    api.then = (resolve: (v: unknown) => unknown) => resolve({ data: { id: "row-1" }, error: store.nextError });
    return api;
  };
  return { supabase: { functions: { invoke }, from: (table: string) => chain(table) } };
});

import {
  answerHash,
  canonicalJson,
  classifyField,
  insertReading,
  intakeHash,
  readingsStateOf,
  recordGateAction,
  recordSubmitState,
  rekeyReadings,
  runIntakeGate,
  sha256Hex,
  updateReadingDisposition,
} from "@/lib/lia/v3ReadBack";

beforeEach(() => {
  invoke.mockReset();
  fromCalls.length = 0;
  store.nextError = null;
});

describe("doc217 §6 — hashing", () => {
  it("sha256Hex matches the standard vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
    // A multi-block, non-ASCII answer hashes deterministically.
    const long = "Users accept our terms — which include consent — ".repeat(20);
    expect(sha256Hex(long)).toBe(sha256Hex(long));
    expect(sha256Hex(long)).toHaveLength(64);
    expect(answerHash("abc")).toBe(sha256Hex("abc"));
  });

  it("intakeHash is canonical: field order does not change it; an answer edit does", () => {
    const a = intakeHash([{ field_id: "x", answer: "1" }, { field_id: "y", answer: "2" }]);
    const b = intakeHash([{ field_id: "y", answer: "2" }, { field_id: "x", answer: "1" }]);
    expect(a).toBe(b);
    expect(intakeHash([{ field_id: "x", answer: "1" }, { field_id: "y", answer: "3" }])).not.toBe(a);
    expect(canonicalJson({ b: 1, a: [{ d: null, c: "x" }] })).toBe('{"a":[{"c":"x","d":null}],"b":1}');
  });

  it("readingsStateOf: none / pending / complete", () => {
    expect(readingsStateOf([])).toBe("none");
    expect(readingsStateOf(["confirmed", "unconfirmed"])).toBe("pending");
    expect(readingsStateOf(["confirmed", "stood"])).toBe("complete");
  });
});

describe("doc217 §4.1 — runIntakeGate", () => {
  it("posts the §4.1 body and parses the per-field structured output (unknown reason codes dropped)", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        results: [{
          field_id: "necessity_details.why_consent_not_used",
          verdict: "non_conforming",
          reason_codes: ["legal_conclusion_not_fact", "other_limb_field", "bogus"],
          other_limb_field: null,
          evidence_span: "it is necessary",
          id: "gate-1",
        }],
      },
      error: null,
    });
    const r = await runIntakeGate({
      assessment_id: "a1",
      fields: [{ field_id: "necessity_details.why_consent_not_used", question_text: "Why isn't consent appropriate here?", answer: "it is necessary" }],
    });
    expect(r.error).toBeNull();
    expect(invoke).toHaveBeenCalledWith("lia-intake-gate", expect.objectContaining({
      body: expect.objectContaining({ action: "gate", product: "lia", assessment_id: "a1" }),
    }));
    expect(r.results[0]).toEqual({
      field_id: "necessity_details.why_consent_not_used",
      verdict: "non_conforming",
      reason_codes: ["legal_conclusion_not_fact"],
      other_limb_field: null,
      evidence_span: "it is necessary",
      gate_result_id: "gate-1",
    });
  });

  it("fails open on an invoke error or a throw", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "Function not found" } });
    const r = await runIntakeGate({ fields: [{ field_id: "f", question_text: "q", answer: "a" }] });
    expect(r.results).toEqual([]);
    expect(r.error).toBe("Function not found");
    invoke.mockRejectedValueOnce(new Error("network"));
    const t = await runIntakeGate({ fields: [{ field_id: "f", question_text: "q", answer: "a" }] });
    expect(t.error).toBe("network");
  });
});

describe("doc217 §4.2 — classifyField", () => {
  it("posts the §4.2 body and parses decision_id, inventory_version and readings", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        decision_id: "d-1",
        inventory_version: "inv-1",
        readings: [
          { prop_id: "lia/consent.bundled_in_terms", stance: "asserted", evidence_span: "in our terms", span_verified: true, legs_agree: true, confidence: 0.9, label: "Consent held through terms" },
          { prop_id: "lia/consent.mechanism_unclear", stance: "abstain", evidence_span: null, span_verified: false, legs_agree: false, confidence: 0.2 },
          { nope: true },
        ],
      },
      error: null,
    });
    const r = await classifyField({ field_id: "f", question_text: "q", answer: "consent is in our terms" });
    expect(invoke).toHaveBeenCalledWith("classify-propositions", expect.objectContaining({
      body: expect.objectContaining({ action: "classify", product: "lia", field_id: "f" }),
    }));
    expect(r.decision_id).toBe("d-1");
    expect(r.inventory_version).toBe("inv-1");
    expect(r.readings).toHaveLength(2);
    expect(r.readings[0].label).toBe("Consent held through terms");
    expect(r.readings[1].stance).toBe("abstain");
  });

  it("a field with no ratified inventory yields no readings, no error", async () => {
    invoke.mockResolvedValueOnce({ data: { readings: [] }, error: null });
    const r = await classifyField({ field_id: "f", question_text: "q", answer: "a" });
    expect(r.readings).toEqual([]);
    expect(r.decision_id).toBeNull();
    expect(r.error).toBeNull();
  });
});

describe("doc217 §3 — the store writes", () => {
  it("recordGateAction / updateReadingDisposition / recordSubmitState / rekeyReadings hit the §3 tables", async () => {
    expect((await recordGateAction({ gate_result_id: "g1", customer_action: "stood" })).ok).toBe(true);
    expect(fromCalls[0]).toMatchObject({ table: "intake_gate_results", op: "update", args: [{ customer_action: "stood" }] });
    fromCalls.length = 0;
    expect((await updateReadingDisposition({ id: "r1", disposition: "confirmed", disposed_at: "2026-09-07T00:00:00Z" })).ok).toBe(true);
    expect(fromCalls[0]).toMatchObject({ table: "intake_readings", op: "update", args: [{ disposition: "confirmed", disposed_at: "2026-09-07T00:00:00Z" }] });
    fromCalls.length = 0;
    expect((await recordSubmitState({ assessment_id: "a1", intake_hash: "h", readings_state: "pending" })).ok).toBe(true);
    expect(fromCalls[0]).toMatchObject({ table: "li_assessments", op: "update", args: [{ intake_hash: "h", readings_state: "pending" }] });
    fromCalls.length = 0;
    expect((await rekeyReadings({ from_assessment_id: "p", to_assessment_id: "a" })).ok).toBe(true);
    expect(fromCalls.map((c) => c.table)).toEqual(["intake_readings", "intake_readings", "intake_gate_results", "intake_gate_results"]);
    expect((await rekeyReadings({ from_assessment_id: "a", to_assessment_id: "a" })).ok).toBe(true);
  });

  it("insertReading inserts the §3.4 row as unconfirmed and returns the id; a store error fails open", async () => {
    const row = {
      product: "lia", assessment_id: "a1", field_id: "f", question_text: "q", answer_hash: "h",
      decision_id: "d1", prop_id: "lia/x", evidence_span: "s", disposition: "unconfirmed" as const, disposed_at: null, revision_no: 0,
    };
    const ok = await insertReading(row);
    expect(ok).toEqual({ id: "row-1", error: null });
    expect(fromCalls[0]).toMatchObject({ table: "intake_readings", op: "insert", args: [row] });
    store.nextError = { message: 'relation "intake_readings" does not exist' };
    const bad = await insertReading(row);
    expect(bad.id).toBeNull();
    expect(bad.error).toContain("intake_readings");
  });
});
