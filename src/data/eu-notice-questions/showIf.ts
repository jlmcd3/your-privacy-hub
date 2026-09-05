// QA batch 2026-09-05 (EU 02) — ONE showIf evaluator for the EU notice flow.
// The Questions page had its own copy and the Review page had none, so the
// Review page counted every question in the framework as "not provided" —
// including questions the customer was never shown ("14 optional answers not
// provided" on a route that presented only the required ones).
import type { Question } from "@/data/ropa-questions/types";

export type EuAnswerValue = string | string[] | null;

export function evaluateShowIf(q: Question, answers: Record<string, EuAnswerValue | undefined>): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.questionKey];
  switch (q.showIf.operator) {
    case "equals":
      return v === q.showIf.value;
    case "not_equals":
      return v !== q.showIf.value;
    case "contains": {
      const targets = Array.isArray(q.showIf.value) ? q.showIf.value : [q.showIf.value];
      if (Array.isArray(v)) return targets.some((t) => v.includes(t));
      return false;
    }
    default:
      return true;
  }
}
