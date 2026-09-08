// DOC 217 §6 — THE INTAKE READ-BACK (dark behind VITE_LIA_V3_READBACK_ENABLED).
//
// Mounted once by src/pages/LIAssessmentIntake.tsx. For every free-text
// field (src/lib/lia/v3Fields.ts) it listens for the field's blur (a
// textarea carrying `data-v3-field="<field_id>"`), debounces 800 ms, and at
// submit (`submitSignal`) runs every field: `lia-intake-gate`, then — for a
// conforming (or stood-on) answer — `classify-propositions`. A non-
// conforming verdict renders the reason-code template(s) with Revise / Keep
// as written; each asserted reading renders the reading template with
// Confirm / Correct my answer / This is not what I meant. Dispositions are
// recorded through src/lib/lia/v3ReadBack.ts (fail-open).
//
// LAW L6: no text in this component other than the ratified templates
// (src/lib/lia/readbackTemplates.ts) with record substrings or displayed
// question text in their slots — nothing here ever says what a passing
// answer would look like. LAW L8: a reading whose span is not a byte-
// substring of the current answer is never shown.
//
// Panels render INLINE under the field they concern (a portal into the
// textarea's parent element) so the read-back sits with the answer; when no
// such element exists the panel renders where the component is mounted.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LIA_READBACK_ACTIONS,
  LIA_READBACK_READING_TEMPLATE,
  LIA_READBACK_STOOD_TEMPLATE,
  renderLiaReadbackTemplate,
  renderLiaReasonCode,
} from "@/lib/lia/readbackTemplates";
import { liaV3QuestionText } from "@/lib/lia/v3Fields";
import {
  answerHash,
  classifyField,
  insertReading,
  intakeHash,
  readingsStateOf,
  recordGateAction,
  recordSubmitState,
  runIntakeGate,
  updateReadingDisposition,
  type GateFieldResult,
  type PropositionReading,
  type ReadingDisposition,
} from "@/lib/lia/v3ReadBack";

export const V3_READBACK_DEBOUNCE_MS = 800;
export const V3_FIELD_ATTR = "data-v3-field";

export interface V3ReadBackField {
  readonly field_id: string;
  readonly question_text: string;
  readonly answer: string;
}

export interface V3ReadBackProps {
  readonly assessmentId: string;
  readonly fields: readonly V3ReadBackField[];
  /** Increment to run every field (the form's submit). */
  readonly submitSignal?: number;
  /** The closed-list answers the gate compares free text against (§4.1). */
  readonly closedAnswers?: Record<string, unknown>;
  /** Test seam: the blur debounce (default 800 ms). */
  readonly debounceMs?: number;
}

interface ReadingState {
  readonly row_id: string | null;
  readonly reading: PropositionReading;
  readonly disposition: ReadingDisposition;
}

interface FieldState {
  readonly answer_hash: string;
  readonly gate: GateFieldResult | null;
  readonly stood_on: string | null;
  readonly awaiting_revision: boolean;
  readonly readings: readonly ReadingState[];
  readonly revision_no: number;
}

type FieldStates = Readonly<Record<string, FieldState | undefined>>;

const today = (): string => new Date().toISOString().slice(0, 10);

function fieldElement(field_id: string): HTMLTextAreaElement | HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[${V3_FIELD_ATTR}="${field_id.replace(/"/g, '\\"')}"]`);
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el : null;
}

export default function V3ReadBack(props: V3ReadBackProps) {
  const { assessmentId, fields, submitSignal = 0, closedAnswers, debounceMs = V3_READBACK_DEBOUNCE_MS } = props;
  const [states, setStates] = useState<FieldStates>({});
  const [mounted, setMounted] = useState(0);
  const fieldsRef = useRef(fields);
  const statesRef = useRef<FieldStates>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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

  const classifyAndRecord = useCallback(async (args: {
    field_id: string;
    question_text: string;
    answer: string;
    hash: string;
    revision_no: number;
  }): Promise<ReadingState[]> => {
    const c = await classifyField({ field_id: args.field_id, question_text: args.question_text, answer: args.answer });
    if (c.error) console.warn("[lia-v3] classify failed (non-fatal):", c.error);
    const out: ReadingState[] = [];
    for (const r of c.readings) {
      // L8: only an asserted reading whose span is a byte-substring of the
      // answer as it stands can be shown or stored.
      if (r.stance !== "asserted" || !r.evidence_span || !args.answer.includes(r.evidence_span)) continue;
      let row_id: string | null = null;
      if (c.decision_id) {
        const ins = await insertReading({
          product: "lia",
          assessment_id: assessmentId,
          field_id: args.field_id,
          question_text: args.question_text,
          answer_hash: args.hash,
          decision_id: c.decision_id,
          prop_id: r.prop_id,
          evidence_span: r.evidence_span,
          disposition: "unconfirmed",
          disposed_at: null,
          revision_no: args.revision_no,
        });
        row_id = ins.id;
        if (ins.error) console.warn("[lia-v3] reading insert failed (non-fatal):", ins.error);
      }
      out.push({ row_id, reading: r, disposition: "unconfirmed" });
    }
    return out;
  }, [assessmentId]);

  /** Gate, then classify, one field; records the customer's revision of a
   *  prior artefact when the answer's hash changed. */
  const evaluate = useCallback(async (field_id: string, force = false): Promise<void> => {
    const field = fieldsRef.current.find((f) => f.field_id === field_id);
    if (!field) return;
    const answer = field.answer ?? "";
    const prev = statesRef.current[field_id];
    if (!answer.trim()) {
      if (prev) setField(field_id, undefined);
      return;
    }
    const hash = answerHash(answer);
    if (prev && prev.answer_hash === hash && !force) return;
    const question_text = field.question_text || liaV3QuestionText(field_id);

    if (prev && prev.answer_hash !== hash) {
      if (prev.gate?.gate_result_id && prev.gate.verdict === "non_conforming") {
        void recordGateAction({ gate_result_id: prev.gate.gate_result_id, customer_action: "revised" });
      }
      for (const r of prev.readings) {
        if (r.row_id && r.disposition !== "stood") void updateReadingDisposition({ id: r.row_id, disposition: "corrected" });
      }
    }
    const revision_no = prev ? prev.revision_no + (prev.answer_hash !== hash ? 1 : 0) : 0;

    const gate = await runIntakeGate({
      assessment_id: assessmentId,
      fields: [{ field_id, question_text, answer, closed_answers: closedRef.current }],
    });
    const gateResult = gate.results[0] ?? null;
    if (gate.error) console.warn("[lia-v3] gate failed (non-fatal):", gate.error);

    let readings: ReadingState[] = [];
    if (!gateResult || gateResult.verdict === "conforms") {
      readings = await classifyAndRecord({ field_id, question_text, answer, hash, revision_no });
    }
    setField(field_id, { answer_hash: hash, gate: gateResult, stood_on: null, awaiting_revision: false, readings, revision_no });
  }, [assessmentId, setField, classifyAndRecord]);

  // Blur → debounced evaluation of that field.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const field_id = t.getAttribute(V3_FIELD_ATTR);
      if (!field_id) return;
      if (timers.current[field_id]) clearTimeout(timers.current[field_id]);
      timers.current[field_id] = setTimeout(() => {
        delete timers.current[field_id];
        void evaluate(field_id);
      }, debounceMs);
    };
    document.addEventListener("focusout", onFocusOut, true);
    setMounted((n) => n + 1);
    return () => {
      document.removeEventListener("focusout", onFocusOut, true);
      for (const t of Object.values(timers.current)) clearTimeout(t);
      timers.current = {};
    };
  }, [evaluate, debounceMs]);

  // Submit → every field, then the submit record (intake_hash, readings_state).
  useEffect(() => {
    if (!submitSignal) return;
    let cancelled = false;
    (async () => {
      for (const t of Object.values(timers.current)) clearTimeout(t);
      timers.current = {};
      for (const f of fieldsRef.current) {
        if (cancelled) return;
        await evaluate(f.field_id);
      }
      const dispositions = Object.values(statesRef.current).flatMap((s) => (s ? s.readings.map((r) => r.disposition) : []));
      const res = await recordSubmitState({
        assessment_id: assessmentId,
        intake_hash: intakeHash(fieldsRef.current.map((f) => ({ field_id: f.field_id, answer: f.answer ?? "" }))),
        readings_state: readingsStateOf(dispositions),
      });
      if (res.error) console.warn("[lia-v3] submit state not recorded (non-fatal):", res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [submitSignal, assessmentId, evaluate]);

  const focusField = useCallback((field_id: string) => {
    fieldElement(field_id)?.focus();
  }, []);

  const onRevise = useCallback((field_id: string) => {
    const s = statesRef.current[field_id];
    if (s) setField(field_id, { ...s, awaiting_revision: true });
    focusField(field_id);
  }, [focusField, setField]);

  const onKeepAsWritten = useCallback(async (field_id: string) => {
    const s = statesRef.current[field_id];
    if (!s) return;
    if (s.gate?.gate_result_id) void recordGateAction({ gate_result_id: s.gate.gate_result_id, customer_action: "stood" });
    const stood_on = today();
    setField(field_id, { ...s, stood_on, awaiting_revision: false });
    // The answer stands as written: it is now read like a conforming one.
    const field = fieldsRef.current.find((f) => f.field_id === field_id);
    if (!field) return;
    const readings = await classifyAndRecord({
      field_id,
      question_text: field.question_text || liaV3QuestionText(field_id),
      answer: field.answer ?? "",
      hash: s.answer_hash,
      revision_no: s.revision_no,
    });
    const latest = statesRef.current[field_id];
    if (latest && latest.answer_hash === s.answer_hash) setField(field_id, { ...latest, readings });
  }, [classifyAndRecord, setField]);

  const onConfirm = useCallback((field_id: string, index: number) => {
    const s = statesRef.current[field_id];
    if (!s) return;
    const r = s.readings[index];
    if (!r) return;
    if (r.row_id) void updateReadingDisposition({ id: r.row_id, disposition: "confirmed" });
    setField(field_id, { ...s, readings: s.readings.map((x, i) => (i === index ? { ...x, disposition: "confirmed" } : x)) });
  }, [setField]);

  const onCorrect = useCallback((field_id: string) => {
    const s = statesRef.current[field_id];
    if (s) setField(field_id, { ...s, awaiting_revision: true });
    focusField(field_id);
  }, [focusField, setField]);

  const onNotWhatIMeant = useCallback((field_id: string, index: number) => {
    const s = statesRef.current[field_id];
    if (!s) return;
    const r = s.readings[index];
    if (!r) return;
    if (r.row_id) void updateReadingDisposition({ id: r.row_id, disposition: "stood" });
    // The reading is dropped and never emits an atom (§6).
    setField(field_id, { ...s, readings: s.readings.filter((_, i) => i !== index) });
  }, [setField]);

  const panels = useMemo(() => {
    const out: { field_id: string; node: JSX.Element }[] = [];
    for (const f of fields) {
      const s = states[f.field_id];
      if (!s) continue;
      const question = f.question_text || liaV3QuestionText(f.field_id);
      const gateLines: string[] = [];
      if (s.gate && s.gate.verdict === "non_conforming" && !s.stood_on) {
        for (const code of s.gate.reason_codes) {
          const line = renderLiaReasonCode(code, {
            question,
            span: s.gate.evidence_span ?? "",
            other_question: s.gate.other_limb_field ? liaV3QuestionText(s.gate.other_limb_field) : "",
          });
          if (line) gateLines.push(line);
        }
      }
      const stoodLine = s.stood_on ? renderLiaReadbackTemplate(LIA_READBACK_STOOD_TEMPLATE, { date: s.stood_on }) : null;
      const readingLines = s.readings.map((r, i) => ({
        index: i,
        disposition: r.disposition,
        text: renderLiaReadbackTemplate(LIA_READBACK_READING_TEMPLATE, {
          label: r.reading.label || r.reading.prop_id,
          span: r.reading.evidence_span ?? "",
        }),
      })).filter((r) => r.text !== null);
      if (gateLines.length === 0 && !stoodLine && readingLines.length === 0) continue;
      out.push({
        field_id: f.field_id,
        node: (
          <div data-v3-readback={f.field_id} className="mt-2 space-y-2 text-sm">
            {gateLines.map((line, i) => <p key={`g${i}`}>{line}</p>)}
            {gateLines.length > 0 && (
              <div className="flex gap-2">
                <button type="button" className="text-xs underline text-primary" onClick={() => onRevise(f.field_id)}>
                  {LIA_READBACK_ACTIONS.revise}
                </button>
                <button type="button" className="text-xs underline text-primary" onClick={() => void onKeepAsWritten(f.field_id)}>
                  {LIA_READBACK_ACTIONS.keep_as_written}
                </button>
              </div>
            )}
            {stoodLine && <p>{stoodLine}</p>}
            {readingLines.map((r) => (
              <div key={`r${r.index}`} className="space-y-1">
                <p>{r.text}</p>
                {r.disposition === "unconfirmed" && (
                  <div className="flex gap-2">
                    <button type="button" className="text-xs underline text-primary" onClick={() => onConfirm(f.field_id, r.index)}>
                      {LIA_READBACK_ACTIONS.confirm}
                    </button>
                    <button type="button" className="text-xs underline text-primary" onClick={() => onCorrect(f.field_id)}>
                      {LIA_READBACK_ACTIONS.correct}
                    </button>
                    <button type="button" className="text-xs underline text-primary" onClick={() => onNotWhatIMeant(f.field_id, r.index)}>
                      {LIA_READBACK_ACTIONS.not_what_i_meant}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }
    return out;
  }, [fields, states, onRevise, onKeepAsWritten, onConfirm, onCorrect, onNotWhatIMeant]);

  // `mounted` re-evaluates the portal targets once the form's DOM exists.
  void mounted;
  return (
    <div data-v3-readback-root="">
      {panels.map(({ field_id, node }) => {
        const target = fieldElement(field_id)?.parentElement ?? null;
        return target ? createPortal(node, target, field_id) : <div key={field_id}>{node}</div>;
      })}
    </div>
  );
}
