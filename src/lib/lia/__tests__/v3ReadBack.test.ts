// DOC 217 §6 as amended by DOC 224 / 224A — the intake-gate client module:
// hashing (a known SHA-256 vector, so `answer_hash` is one value in every
// runtime; canonical answer text per 224A §8 D2), the canonical intake hash,
// and the transports against a mocked supabase client (the gate, the two
// function-mediated writes, the re-key) — every failure path fails open with
// a typed error, never a throw. Readings are the ENGINE's (doc 224 §2): this
// module has no classify / reading / disposition surface any more.

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
  canonicalAnswerText,
  canonicalJson,
  intakeHash,
  recordGateAction,
  recordSubmitState,
  rekeyReadings,
  runIntakeGate,
  sha256Hex,
} from "@/lib/lia/v3ReadBack";

beforeEach(() => {
  invoke.mockReset();
  fromCalls.length = 0;
  store.nextError = null;
});

describe("doc217 §6 / doc224A D2 — hashing", () => {
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
  });

  it("answerHash is over the CANONICAL text: whitespace and NFC form never change it; a word does", () => {
    expect(canonicalAnswerText("  We  process\n\tdata ")).toBe("We process data");
    expect(canonicalAnswerText("é")).toBe("é");
    expect(answerHash("abc")).toBe(sha256Hex("abc"));
    expect(answerHash("  abc\n")).toBe(answerHash("abc"));
    expect(answerHash("café")).toBe(answerHash("café"));
    expect(answerHash("abc")).not.toBe(answerHash("abd"));
  });

  it("intakeHash is canonical: field order does not change it; an answer edit does", () => {
    const a = intakeHash([{ field_id: "x", answer: "1" }, { field_id: "y", answer: "2" }]);
    const b = intakeHash([{ field_id: "y", answer: "2" }, { field_id: "x", answer: " 1 " }]);
    expect(a).toBe(b);
    expect(intakeHash([{ field_id: "x", answer: "1" }, { field_id: "y", answer: "3" }])).not.toBe(a);
    expect(canonicalJson({ b: 1, a: [{ d: null, c: "x" }] })).toBe('{"a":[{"c":"x","d":null}],"b":1}');
  });
});

describe("doc217 §4.1 — runIntakeGate", () => {
  it("posts the §4.1 body ONCE for every field and parses the per-field output (unknown reason codes dropped)", async () => {
    invoke.mockResolvedValueOnce({
      data: {
        results: [
          {
            field_id: "necessity_details.why_consent_not_used",
            verdict: "non_conforming",
            reason_codes: ["legal_conclusion_not_fact", "other_limb_field", "bogus"],
            other_limb_field: null,
            evidence_span: "it is necessary",
            id: "gate-1",
          },
          { field_id: "purpose_details.specific_benefit", verdict: "conforms", reason_codes: [], other_limb_field: null, evidence_span: null, id: "gate-2" },
        ],
      },
      error: null,
    });
    const r = await runIntakeGate({
      assessment_id: "a1",
      fields: [
        { field_id: "necessity_details.why_consent_not_used", question_text: "Why isn't consent appropriate here?", answer: "it is necessary" },
        { field_id: "purpose_details.specific_benefit", question_text: "What specific benefit does this processing deliver?", answer: "Fraud losses fall by a measured amount." },
      ],
    });
    expect(r.error).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("lia-intake-gate", expect.objectContaining({
      body: expect.objectContaining({ action: "gate", product: "lia", assessment_id: "a1" }),
    }));
    const body = (invoke.mock.calls[0][1] as { body: { fields: unknown[] } }).body;
    expect(body.fields).toHaveLength(2);
    expect(r.results[0]).toEqual({
      field_id: "necessity_details.why_consent_not_used",
      verdict: "non_conforming",
      reason_codes: ["legal_conclusion_not_fact"],
      other_limb_field: null,
      evidence_span: "it is necessary",
      gate_result_id: "gate-1",
    });
    expect(r.results[1].verdict).toBe("conforms");
  });

  it("makes no call for an empty field list", async () => {
    const r = await runIntakeGate({ fields: [] });
    expect(r).toEqual({ results: [], error: null });
    expect(invoke).not.toHaveBeenCalled();
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

describe("doc217 §3 / doc224 — the writes go through the function, never the browser client", () => {
  it("recordGateAction posts gate_action (with the preview token when the row has no owner yet)", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    expect((await recordGateAction({ assessment_id: "a1", gate_result_id: "g1", customer_action: "stood" })).ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith("classify-propositions", {
      body: { action: "gate_action", assessment_id: "a1", result_id: "g1", customer_action: "stood" },
    });
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await recordGateAction({ assessment_id: "a1", gate_result_id: "g1", customer_action: "revised", preview_token: "tok" });
    expect((invoke.mock.calls[1][1] as { body: Record<string, unknown> }).body).toMatchObject({ customer_action: "revised", preview_token: "tok" });
    expect(fromCalls).toEqual([]);
  });

  it("recordSubmitState posts submit_state with the intake hash; an error fails open", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    expect((await recordSubmitState({ assessment_id: "a1", intake_hash: "h" })).ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith("classify-propositions", { body: { action: "submit_state", assessment_id: "a1", intake_hash: "h" } });
    invoke.mockResolvedValueOnce({ data: null, error: { message: "forbidden" } });
    const bad = await recordSubmitState({ assessment_id: "a1", intake_hash: "h" });
    expect(bad).toEqual({ ok: false, error: "forbidden" });
    invoke.mockRejectedValueOnce(new Error("network"));
    expect((await recordGateAction({ assessment_id: "a1", gate_result_id: "g1", customer_action: "stood" })).error).toBe("network");
  });

  it("rekeyReadings re-keys ONLY intake_gate_results (readings and selections are the engine's, under the paid id)", async () => {
    expect((await rekeyReadings({ from_assessment_id: "p", to_assessment_id: "a" })).ok).toBe(true);
    expect(fromCalls.map((c) => c.table)).toEqual(["intake_gate_results", "intake_gate_results"]);
    expect(fromCalls[0]).toMatchObject({ op: "update", args: [{ assessment_id: "a" }] });
    expect(fromCalls[1]).toMatchObject({ op: "eq", args: ["assessment_id", "p"] });
    fromCalls.length = 0;
    expect((await rekeyReadings({ from_assessment_id: "a", to_assessment_id: "a" })).ok).toBe(true);
    expect(fromCalls).toEqual([]);
    store.nextError = { message: "permission denied" };
    const bad = await rekeyReadings({ from_assessment_id: "p", to_assessment_id: "a" });
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("permission denied");
  });
});
