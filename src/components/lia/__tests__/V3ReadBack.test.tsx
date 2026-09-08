// DOC 217 §6 as amended by DOC 224 / 224A — the intake gate component against
// a mocked supabase client: NOTHING on blur; submit → ONE gate call for every
// field whose text is new → the reason-code template with Revise / Keep as
// written for a non-conforming answer; actions recorded through the function
// as data; an unchanged answer never re-runs; an edited one does; Law L6 (no
// coaching text) on the rendered output. No reading is ever rendered
// (CEO, 2026-09-08).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";

// vi.mock factories are hoisted above every import: the mock's state comes
// from vi.hoisted (the documented pattern), not plain top-level consts.
const { invoke, writes } = vi.hoisted(() => ({
  invoke: vi.fn(),
  writes: [] as { table: string; op: string; args: unknown[] }[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const api: Record<string, unknown> = {};
    for (const op of ["update", "insert", "select", "eq", "single"]) {
      api[op] = (...args: unknown[]) => {
        writes.push({ table, op, args });
        return api;
      };
    }
    api.then = (resolve: (v: unknown) => unknown) => resolve({ data: { id: `row-${writes.length}` }, error: null });
    return api;
  };
  return { supabase: { functions: { invoke }, from: (table: string) => chain(table) } };
});

import V3ReadBack, { V3_FIELD_ATTR } from "@/components/lia/V3ReadBack";
import { LIA_READBACK_ACTIONS } from "@/lib/lia/readbackTemplates";

const CONSENT = "necessity_details.why_consent_not_used";
const BENEFIT = "purpose_details.specific_benefit";
const CONSENT_Q = "Why isn't consent appropriate here?";
const BENEFIT_Q = "What specific benefit does this processing deliver?";
const COACHING = ["should", "must", "for example", "a good answer", "to pass"];
const BENEFIT_TEMPLATE = 'This answer states a conclusion, "This processing is necessary", rather than the facts on which it rests. The assessment can only weigh facts. You may add the facts, or keep the answer as written.';

interface InvokeBody {
  action?: string;
  assessment_id?: string;
  result_id?: string;
  customer_action?: string;
  intake_hash?: string;
  fields?: { field_id: string }[];
}
const bodyOf = (call: unknown[]): InvokeBody => ((call[1] as { body?: InvokeBody } | undefined)?.body ?? {});
const gateCalls = () => invoke.mock.calls.filter((c) => c[0] === "lia-intake-gate");
const actionCalls = (action: string) => invoke.mock.calls.filter((c) => c[0] === "classify-propositions" && bodyOf(c).action === action);

function Harness(props: { submitSignal?: number; initialConsent?: string; initialBenefit?: string }) {
  const [consent, setConsent] = useState(props.initialConsent ?? "Users accept our terms of service, which include consent to this processing.");
  const [benefit, setBenefit] = useState(props.initialBenefit ?? "This processing is necessary.");
  const fields = [
    { field_id: CONSENT, question_text: CONSENT_Q, answer: consent },
    { field_id: BENEFIT, question_text: BENEFIT_Q, answer: benefit },
  ];
  return (
    <div>
      <div>
        <label>{CONSENT_Q}</label>
        <textarea aria-label="consent" {...{ [V3_FIELD_ATTR]: CONSENT }} value={consent} onChange={(e) => setConsent(e.target.value)} />
      </div>
      <div>
        <label>{BENEFIT_Q}</label>
        <textarea aria-label="benefit" {...{ [V3_FIELD_ATTR]: BENEFIT }} value={benefit} onChange={(e) => setBenefit(e.target.value)} />
      </div>
      <V3ReadBack assessmentId="a-1" fields={fields} submitSignal={props.submitSignal ?? 0} />
    </div>
  );
}

function mockFunctions() {
  invoke.mockImplementation(async (fn: string, opts: { body: InvokeBody }) => {
    const b = opts.body;
    if (fn === "lia-intake-gate") {
      const results = (b.fields ?? []).map((f) =>
        f.field_id === BENEFIT
          ? { field_id: BENEFIT, verdict: "non_conforming", reason_codes: ["legal_conclusion_not_fact"], other_limb_field: null, evidence_span: "This processing is necessary", id: "gate-benefit" }
          : { field_id: f.field_id, verdict: "conforms", reason_codes: [], other_limb_field: null, evidence_span: null, id: `gate-${f.field_id}` }
      );
      return { data: { results }, error: null };
    }
    if (fn === "classify-propositions") return { data: { ok: true }, error: null };
    return { data: null, error: { message: `unknown function ${fn}` } };
  });
}

beforeEach(() => {
  invoke.mockReset();
  writes.length = 0;
  mockFunctions();
});

describe("doc224 — V3ReadBack (the intake gate)", () => {
  it("renders nothing and calls nothing on blur; nothing at mount", async () => {
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("consent"));
    fireEvent.focusOut(screen.getByLabelText("benefit"));
    await new Promise((r) => setTimeout(r, 10));
    expect(invoke).not.toHaveBeenCalled();
    expect(document.querySelector("[data-v3-readback]")).toBeNull();
  });

  it("submit → ONE gate call for both fields; the non-conforming one shows its template inline with Revise / Keep as written; nothing for the conforming one", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await screen.findByText(BENEFIT_TEMPLATE);
    expect(gateCalls()).toHaveLength(1);
    expect(bodyOf(gateCalls()[0])).toMatchObject({ action: "gate", assessment_id: "a-1" });
    expect((bodyOf(gateCalls()[0]).fields ?? []).map((f) => f.field_id)).toEqual([CONSENT, BENEFIT]);
    // Inline: the panel is a sibling of the textarea (portal into its parent).
    expect(screen.getByLabelText("benefit").parentElement!.querySelector(`[data-v3-readback="${BENEFIT}"]`)).toBeTruthy();
    expect(document.querySelector(`[data-v3-readback="${CONSENT}"]`)).toBeNull();
    expect(screen.getByText(LIA_READBACK_ACTIONS.revise)).toBeTruthy();
    expect(screen.getByText(LIA_READBACK_ACTIONS.keep_as_written)).toBeTruthy();
    // No reading, no classification, ever — the engine does that at paid generation.
    expect(actionCalls("classify")).toHaveLength(0);
    expect(screen.queryByText(/We read this answer/)).toBeNull();
    // The submit record carries the intake hash, through the function.
    await waitFor(() => expect(actionCalls("submit_state")).toHaveLength(1));
    expect(bodyOf(actionCalls("submit_state")[0])).toMatchObject({ assessment_id: "a-1" });
    expect(String(bodyOf(actionCalls("submit_state")[0]).intake_hash)).toMatch(/^[0-9a-f]{64}$/);
    // Nothing was written from the browser client.
    expect(writes).toEqual([]);
  });

  it("Keep as written records `stood` on the gate row through the function and drops the panel", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await screen.findByText(BENEFIT_TEMPLATE);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.keep_as_written));
    await waitFor(() => expect(actionCalls("gate_action")).toHaveLength(1));
    expect(bodyOf(actionCalls("gate_action")[0])).toMatchObject({ assessment_id: "a-1", result_id: "gate-benefit", customer_action: "stood" });
    expect(screen.queryByText(BENEFIT_TEMPLATE)).toBeNull();
    expect(screen.queryByText(LIA_READBACK_ACTIONS.revise)).toBeNull();
  });

  it("Revise focuses the field; a second submit with unchanged text makes NO gate call (224A D3)", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await screen.findByText(BENEFIT_TEMPLATE);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.revise));
    expect(document.activeElement).toBe(screen.getByLabelText("benefit"));
    rerender(<Harness submitSignal={2} />);
    await waitFor(() => expect(actionCalls("submit_state")).toHaveLength(2));
    expect(gateCalls()).toHaveLength(1);
    expect(actionCalls("gate_action")).toHaveLength(0);
  });

  it("an edited answer is gated again on the next submit — for that field only — and the old gate row is marked `revised`", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await screen.findByText(BENEFIT_TEMPLATE);
    fireEvent.change(screen.getByLabelText("benefit"), { target: { value: "Chargebacks fell from 4% to 1% in the pilot." } });
    rerender(<Harness submitSignal={2} />);
    await waitFor(() => expect(gateCalls()).toHaveLength(2));
    expect((bodyOf(gateCalls()[1]).fields ?? []).map((f) => f.field_id)).toEqual([BENEFIT]);
    await waitFor(() => expect(actionCalls("gate_action")).toHaveLength(1));
    expect(bodyOf(actionCalls("gate_action")[0])).toMatchObject({ result_id: "gate-benefit", customer_action: "revised" });
  });

  it("an empty answer is never gated", async () => {
    const { rerender } = render(<Harness submitSignal={0} initialBenefit="   " />);
    rerender(<Harness submitSignal={1} initialBenefit="   " />);
    await waitFor(() => expect(actionCalls("submit_state")).toHaveLength(1));
    expect((bodyOf(gateCalls()[0]).fields ?? []).map((f) => f.field_id)).toEqual([CONSENT]);
  });

  it("L6 — nothing rendered carries coaching language; every visible line is a ratified template", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await screen.findByText(BENEFIT_TEMPLATE);
    const text = Array.from(document.querySelectorAll("[data-v3-readback]")).map((n) => n.textContent ?? "").join("\n");
    expect(text.length).toBeGreaterThan(0);
    for (const marker of COACHING) {
      expect(new RegExp(`\\b${marker.replace(/ /g, "\\s+")}\\b`, "i").test(text)).toBe(false);
    }
  });

  it("fails open: a failing function renders nothing and throws nothing", async () => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: null, error: { message: "Function not found" } });
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(document.querySelector("[data-v3-readback]")).toBeNull();
  });
});
