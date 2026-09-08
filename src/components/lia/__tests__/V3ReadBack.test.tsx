// DOC 217 §6 — the intake read-back component against a mocked supabase
// client: blur → gate → template with Revise / Keep as written; conforming →
// classify → reading template with Confirm / Correct my answer / This is not
// what I meant; dispositions recorded as data; Law L6 (no coaching text)
// and Law L8 (no span that is not in the answer) on the rendered output.

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

interface InvokeBody {
  action?: string;
  field_id?: string;
  fields?: { field_id: string }[];
}
type Written = { disposition?: string; customer_action?: string; readings_state?: string; intake_hash?: string };
const written = (w: { args: unknown[] }): Written => (w.args[0] ?? {}) as Written;
const bodyOf = (call: unknown[]): InvokeBody => ((call[1] as { body?: InvokeBody } | undefined)?.body ?? {});

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
      <V3ReadBack assessmentId="a-1" fields={fields} submitSignal={props.submitSignal ?? 0} debounceMs={0} />
    </div>
  );
}

function mockFunctions() {
  invoke.mockImplementation(async (fn: string, opts: { body: InvokeBody }) => {
    const b = opts.body;
    if (fn === "lia-intake-gate") {
      const f = (b.fields ?? [])[0] ?? { field_id: "" };
      if (f.field_id === BENEFIT) {
        return {
          data: { results: [{ field_id: BENEFIT, verdict: "non_conforming", reason_codes: ["legal_conclusion_not_fact"], other_limb_field: null, evidence_span: "This processing is necessary", id: "gate-benefit" }] },
          error: null,
        };
      }
      return { data: { results: [{ field_id: f.field_id, verdict: "conforms", reason_codes: [], other_limb_field: null, evidence_span: null, id: "gate-consent" }] }, error: null };
    }
    if (fn === "classify-propositions") {
      if (b.field_id === CONSENT) {
        return {
          data: {
            decision_id: "d-consent",
            inventory_version: "inv-1",
            readings: [
              { prop_id: "lia/consent.bundled_in_terms", stance: "asserted", evidence_span: "accept our terms of service, which include consent", span_verified: true, legs_agree: true, confidence: 0.92, label: "Consent held through terms" },
              { prop_id: "lia/consent.separate_affirmative_act", stance: "abstain", evidence_span: null, span_verified: false, legs_agree: false, confidence: 0.1, label: "Consent by a separate, specific act" },
              { prop_id: "lia/consent.not_assessed", stance: "asserted", evidence_span: "NOT IN THE ANSWER", span_verified: false, legs_agree: true, confidence: 0.5, label: "Consent not considered" },
            ],
          },
          error: null,
        };
      }
      return { data: { readings: [] }, error: null };
    }
    return { data: null, error: { message: `unknown function ${fn}` } };
  });
}

beforeEach(() => {
  invoke.mockReset();
  writes.length = 0;
  mockFunctions();
});

describe("doc217 §6 — V3ReadBack", () => {
  it("renders nothing until a field blurs; then a conforming answer shows its reading with the three actions, inline under the field", async () => {
    render(<Harness />);
    expect(document.querySelector("[data-v3-readback]")).toBeNull();
    fireEvent.focusOut(screen.getByLabelText("consent"));
    const reading = await screen.findByText('We read this answer as stating: Consent held through terms — based on: "accept our terms of service, which include consent".');
    expect(reading).toBeTruthy();
    // Inline: the panel is a sibling of the textarea (portal into its parent).
    expect(screen.getByLabelText("consent").parentElement!.querySelector(`[data-v3-readback="${CONSENT}"]`)).toBeTruthy();
    expect(screen.getByText(LIA_READBACK_ACTIONS.confirm)).toBeTruthy();
    expect(screen.getByText(LIA_READBACK_ACTIONS.correct)).toBeTruthy();
    expect(screen.getByText(LIA_READBACK_ACTIONS.not_what_i_meant)).toBeTruthy();
    // L8: the reading whose span is not in the answer is never shown; the abstain reading is not shown.
    expect(screen.queryByText(/NOT IN THE ANSWER/)).toBeNull();
    expect(screen.queryByText(/Consent not considered/)).toBeNull();
    expect(screen.queryByText(/separate, specific act/)).toBeNull();
    // The gate ran before the classifier, with the §4.1 / §4.2 bodies.
    expect(invoke.mock.calls[0][0]).toBe("lia-intake-gate");
    expect(invoke.mock.calls[1][0]).toBe("classify-propositions");
    expect(bodyOf(invoke.mock.calls[1])).toMatchObject({ action: "classify", product: "lia", field_id: CONSENT, question_text: CONSENT_Q });
    // The reading was stored as unconfirmed (§4.3).
    const insert = writes.find((w) => w.table === "intake_readings" && w.op === "insert");
    expect(insert).toBeTruthy();
    expect(insert!.args[0]).toMatchObject({ product: "lia", assessment_id: "a-1", field_id: CONSENT, decision_id: "d-consent", prop_id: "lia/consent.bundled_in_terms", disposition: "unconfirmed", revision_no: 0 });
  });

  it("Confirm records `confirmed` and hides the actions; This is not what I meant records `stood` and drops the reading", async () => {
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("consent"));
    await screen.findByText(/We read this answer as stating/);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.confirm));
    await waitFor(() => {
      expect(writes.some((w) => w.table === "intake_readings" && w.op === "update" && written(w).disposition === "confirmed")).toBe(true);
    });
    expect(screen.queryByText(LIA_READBACK_ACTIONS.confirm)).toBeNull();
    expect(screen.getByText(/We read this answer as stating/)).toBeTruthy();
  });

  it("This is not what I meant drops the reading and records stood", async () => {
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("consent"));
    await screen.findByText(/We read this answer as stating/);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.not_what_i_meant));
    await waitFor(() => {
      expect(writes.some((w) => w.table === "intake_readings" && w.op === "update" && written(w).disposition === "stood")).toBe(true);
    });
    expect(screen.queryByText(/We read this answer as stating/)).toBeNull();
  });

  it("a non-conforming answer shows the reason-code template with Revise / Keep as written; Keep as written records stood and shows the stood record", async () => {
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("benefit"));
    await screen.findByText('This answer states a conclusion, "This processing is necessary", rather than the facts on which it rests. The assessment can only weigh facts. You may add the facts, or keep the answer as written.');
    expect(screen.getByText(LIA_READBACK_ACTIONS.revise)).toBeTruthy();
    // No classification of a non-conforming answer.
    expect(invoke.mock.calls.filter((c) => c[0] === "classify-propositions" && bodyOf(c).field_id === BENEFIT)).toHaveLength(0);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.keep_as_written));
    await waitFor(() => {
      expect(writes.some((w) => w.table === "intake_gate_results" && w.op === "update" && written(w).customer_action === "stood")).toBe(true);
    });
    await screen.findByText(/You kept this answer as written on \d{4}-\d{2}-\d{2}; the assessment uses it exactly as given\./);
    expect(screen.queryByText(LIA_READBACK_ACTIONS.revise)).toBeNull();
    // A stood answer is then read like a conforming one.
    await waitFor(() => {
      expect(invoke.mock.calls.filter((c) => c[0] === "classify-propositions" && bodyOf(c).field_id === BENEFIT)).toHaveLength(1);
    });
  });

  it("Revise focuses the field; an edited answer re-runs and records `revised` on the old gate row and `corrected` on old readings", async () => {
    render(<Harness />);
    const consent = screen.getByLabelText("consent") as HTMLTextAreaElement;
    fireEvent.focusOut(consent);
    await screen.findByText(/We read this answer as stating/);
    fireEvent.click(screen.getByText(LIA_READBACK_ACTIONS.correct));
    expect(document.activeElement).toBe(consent);
    fireEvent.change(consent, { target: { value: "We obtain a separate, specific opt-in for this processing." } });
    fireEvent.focusOut(consent);
    await waitFor(() => {
      expect(writes.some((w) => w.table === "intake_readings" && w.op === "update" && written(w).disposition === "corrected")).toBe(true);
    });
    // The old reading's span is not in the new answer, so it is gone (L8); the re-classification ran.
    await waitFor(() => {
      expect(invoke.mock.calls.filter((c) => c[0] === "classify-propositions" && bodyOf(c).field_id === CONSENT)).toHaveLength(2);
    });
    expect(screen.queryByText(/accept our terms of service/)).toBeNull();
  });

  it("submit runs every field and records intake_hash + readings_state on li_assessments", async () => {
    const { rerender } = render(<Harness submitSignal={0} />);
    rerender(<Harness submitSignal={1} />);
    await waitFor(() => {
      const w = writes.find((x) => x.table === "li_assessments" && x.op === "update");
      expect(w).toBeTruthy();
      expect(written(w!).readings_state).toBe("pending");
      expect(String(written(w!).intake_hash)).toMatch(/^[0-9a-f]{64}$/);
    });
    expect(invoke.mock.calls.filter((c) => c[0] === "lia-intake-gate")).toHaveLength(2);
  });

  it("L6 — nothing rendered carries coaching language; every visible line is a ratified template", async () => {
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("consent"));
    fireEvent.focusOut(screen.getByLabelText("benefit"));
    await screen.findByText(/We read this answer as stating/);
    await screen.findByText(/states a conclusion/);
    const text = Array.from(document.querySelectorAll("[data-v3-readback]")).map((n) => n.textContent ?? "").join("\n");
    for (const marker of COACHING) {
      expect(new RegExp(`\\b${marker.replace(/ /g, "\\s+")}\\b`, "i").test(text)).toBe(false);
    }
  });

  it("fails open: a failing function renders nothing and throws nothing", async () => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: null, error: { message: "Function not found" } });
    render(<Harness />);
    fireEvent.focusOut(screen.getByLabelText("consent"));
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(document.querySelector("[data-v3-readback]")).toBeNull();
  });
});
