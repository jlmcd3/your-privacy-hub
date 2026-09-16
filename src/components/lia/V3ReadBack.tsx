// DOC 217 §6 as amended by DOC 224 / 224A (2026-09-08) — THE INTAKE GATE
// (dark behind VITE_LIA_V3_READBACK_ENABLED).
//
// THE CONSTRUCT (CEO, 2026-09-08): readings are NEVER shown to a customer.
// This component no longer classifies anything and never renders a reading.
// It runs the conformance gate ONCE, at submit (`submitSignal`), in ONE call
// for every free-text field whose text is new since the last gate (224A §8
// D3 — nothing runs on blur; the gate stores by answer hash, so an unchanged
// answer costs nothing). A non-conforming verdict renders the reason-code
// template(s) inline under the field with Revise / Keep as written; the
// submit also records the intake hash the engine's replay keys on.
//
// LAW L6: no text in this component other than the ratified templates
// (src/lib/lia/readbackTemplates.ts) with record substrings or displayed
// question text in their slots — nothing here ever says what a passing
// answer would look like.
//
// Panels render INLINE under the field they concern (a portal into the
// textarea's parent element) so the message sits with the answer; when no
// such element exists the panel renders where the component is mounted.
//
// LIA F21 (2026-09-15): the page passes `closedAnswers` (the closed-list
// answers the gate compares free text against) and receives `onGateSettled`
// once the submit-time gate has finished, so checkout can wait for it. The
// gate runs ONLY at submit — never on blur.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LIA_READBACK_ACTIONS, renderLiaReasonCode } from "@/lib/lia/readbackTemplates";
import { liaV3QuestionText } from "@/lib/lia/v3Fields";
import {
  answerHash,
  intakeHash,
  recordGateAction,
  recordSubmitState,
  runIntakeGate,
  type GateFieldResult,
} from "@/lib/lia/v3ReadBack";

export const V3_FIELD_ATTR = "data-v3-field";

export interface V3ReadBackField {
  readonly field_id: string;
  readonly question_text: string;
  readonly answer: string;
}

export interface V3ReadBackProps {
  readonly assessmentId: string;
  readonly fields: readonly V3ReadBackField[];
  /** Increment to run the gate over every field (the form's submit). */
  readonly submitSignal?: number;
  /** The closed-list answers the gate compares free text against (§4.1). */
  readonly closedAnswers?: Record<string, unknown>;
  /** The anonymous preview token, when the row has no owner yet. */
  readonly previewToken?: string | null;
  /**
   * Called once per submit signal after the gate has run (or was not
   * needed), with the field ids that are non-conforming and not yet kept as
   * written. The page holds checkout while any remain.
   */
  readonly onGateSettled?: (result: { nonConforming: string[] }) => void;
}

interface FieldState {
  readonly answer_hash: string;
  readonly gate: GateFieldResult | null;
  readonly stood_on: string | null;
  readonly awaiting_revision: boolean;
}

type FieldStates = Readonly<Record<string, FieldState | undefined>>;

const today = (): string => new Date().toISOString().slice(0, 10);

function fieldElement(field_id: string): HTMLTextAreaElement | HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[${V3_FIELD_ATTR}="${field_id.replace(/"/g, '\\"')}"]`);
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el : null;
}

export default function V3ReadBack(props: V3ReadBackProps) {
  const { assessmentId, fields, submitSignal = 0, closedAnswers, previewToken = null, onGateSettled } = props;
  const settledRef = useRef(onGateSettled);
  settledRef.current = onGateSettled;
  const [states, setStates] = useState<FieldStates>({});
  const fieldsRef = useRef(fields);
  const statesRef = useRef<FieldStates>({});
  const closedRef = useRef(closedAnswers);
  fieldsRef.current = fields;
  closedRef.current = closedAnswers;
  statesRef.current = states;

  const setField = useCallback((field_id: string, next: FieldState | undefined) => {
    setStates((prev) => {
      const out: Record<string, FieldState | undefined> = { ...prev };
      if (next) out[field_id] = next;
      else delete out[field_id];
      statesRef.current = out;
      return out;
    });
  }, []);

  /** Submit → ONE gate call for every field whose text is new; then the
   *  submit record (intake_hash). Nothing runs on blur. */
  useEffect(() => {
    if (!submitSignal) return;
    let cancelled = false;
    (async () => {
      const toGate: { field_id: string; question_text: string; answer: string; hash: string }[] = [];
      for (const f of fieldsRef.current) {
        const answer = f.answer ?? "";
        const prev = statesRef.current[f.field_id];
        if (!answer.trim()) {
          if (prev) setField(f.field_id, undefined);
          continue;
        }
        const hash = answerHash(answer);
        if (prev && prev.answer_hash === hash) continue; // unchanged: no call
        if (prev && prev.gate?.gate_result_id && prev.gate.verdict === "non_conforming") {
          void recordGateAction({ assessment_id: assessmentId, gate_result_id: prev.gate.gate_result_id, customer_action: "revised", preview_token: previewToken });
        }
        toGate.push({ field_id: f.field_id, question_text: f.question_text || liaV3QuestionText(f.field_id), answer, hash });
      }
      if (toGate.length > 0) {
        const gate = await runIntakeGate({
          assessment_id: assessmentId,
          fields: toGate.map((g) => ({ field_id: g.field_id, question_text: g.question_text, answer: g.answer, closed_answers: closedRef.current })),
        });
        if (cancelled) return;
        if (gate.error) console.warn("[lia-v3] gate failed (non-fatal):", gate.error);
        const byField = new Map(gate.results.map((r) => [r.field_id, r] as const));
        for (const g of toGate) {
          setField(g.field_id, { answer_hash: g.hash, gate: byField.get(g.field_id) ?? null, stood_on: null, awaiting_revision: false });
        }
      }
      const res = await recordSubmitState({
        assessment_id: assessmentId,
        intake_hash: intakeHash(fieldsRef.current.map((f) => ({ field_id: f.field_id, answer: f.answer ?? "" }))),
        preview_token: previewToken,
      });
      if (res.error) console.warn("[lia-v3] submit state not recorded (non-fatal):", res.error);
      if (cancelled) return;
      // F21 — report the settled state: flagged answers not yet kept as written.
      const nonConforming = Object.entries(statesRef.current)
        .filter(([, s]) => s && s.gate?.verdict === "non_conforming" && !s.stood_on)
        .map(([field_id]) => field_id);
      settledRef.current?.({ nonConforming });
    })();
    return () => {
      cancelled = true;
    };
  }, [submitSignal, assessmentId, previewToken, setField]);

  const onRevise = useCallback((field_id: string) => {
    const s = statesRef.current[field_id];
    if (s) setField(field_id, { ...s, awaiting_revision: true });
    fieldElement(field_id)?.focus();
  }, [setField]);

  const onKeepAsWritten = useCallback((field_id: string) => {
    const s = statesRef.current[field_id];
    if (!s) return;
    if (s.gate?.gate_result_id) {
      void recordGateAction({ assessment_id: assessmentId, gate_result_id: s.gate.gate_result_id, customer_action: "stood", preview_token: previewToken });
    }
    setField(field_id, { ...s, stood_on: today(), awaiting_revision: false });
  }, [assessmentId, previewToken, setField]);

  const panels = useMemo(() => {
    const out: { field_id: string; node: JSX.Element }[] = [];
    for (const f of fields) {
      const s = states[f.field_id];
      if (!s || !s.gate || s.gate.verdict !== "non_conforming" || s.stood_on) continue;
      const question = f.question_text || liaV3QuestionText(f.field_id);
      const lines: string[] = [];
      for (const code of s.gate.reason_codes) {
        const line = renderLiaReasonCode(code, {
          question,
          span: s.gate.evidence_span ?? "",
          other_question: s.gate.other_limb_field ? liaV3QuestionText(s.gate.other_limb_field) : "",
          // F21 — the contradiction template renders only when the gate names the closed question and answer.
          closed_question: s.gate.closed_field ? liaV3QuestionText(s.gate.closed_field) : "",
          closed_answer: s.gate.closed_answer ?? "",
        });
        if (line) lines.push(line);
      }
      if (lines.length === 0) continue;
      out.push({
        field_id: f.field_id,
        node: (
          <div data-v3-readback={f.field_id} className="mt-2 space-y-2 text-sm">
            {lines.map((line, i) => <p key={`g${i}`}>{line}</p>)}
            <div className="flex gap-2">
              <button type="button" className="text-xs underline text-primary" onClick={() => onRevise(f.field_id)}>
                {LIA_READBACK_ACTIONS.revise}
              </button>
              <button type="button" className="text-xs underline text-primary" onClick={() => onKeepAsWritten(f.field_id)}>
                {LIA_READBACK_ACTIONS.keep_as_written}
              </button>
            </div>
          </div>
        ),
      });
    }
    return out;
  }, [fields, states, onRevise, onKeepAsWritten]);

  return (
    <div data-v3-readback-root="">
      {panels.map(({ field_id, node }) => {
        const target = fieldElement(field_id)?.parentElement ?? null;
        return target ? createPortal(node, target, field_id) : <div key={field_id}>{node}</div>;
      })}
    </div>
  );
}
