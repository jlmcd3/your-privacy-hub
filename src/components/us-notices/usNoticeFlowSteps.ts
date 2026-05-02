// Single source of truth for the US Notice Builder flow.
// Shown on: mode · states · questions · review · documents (and refresh).
// NOT shown on: /us-notices (home) or /us-notice-builder (landing).

export type USNoticeFlowStep =
  | "mode"
  | "states"
  | "questions"
  | "review"
  | "documents"
  | "refresh";

export interface USNoticeStep {
  key: USNoticeFlowStep;
  label: string;
}

export const US_NOTICE_FLOW_STEPS: USNoticeStep[] = [
  { key: "mode", label: "Mode" },
  { key: "states", label: "States" },
  { key: "questions", label: "Questions" },
  { key: "review", label: "Review" },
  { key: "documents", label: "Documents" },
];

export function getUSNoticeSteps(
  current: USNoticeFlowStep,
  sessionId?: string,
): { steps: { label: string; route?: string }[]; currentIndex: number } {
  if (current === "refresh") {
    return {
      steps: [
        { label: "Refresh", route: undefined },
        { label: "Questions", route: undefined },
        {
          label: "Review",
          route: sessionId ? `/us-notices/${sessionId}/review` : undefined,
        },
        {
          label: "Documents",
          route: sessionId ? `/us-notices/${sessionId}/documents` : undefined,
        },
      ],
      currentIndex: 0,
    };
  }
  const currentIndex = US_NOTICE_FLOW_STEPS.findIndex((s) => s.key === current);
  const idx = currentIndex === -1 ? 0 : currentIndex;
  const steps = US_NOTICE_FLOW_STEPS.map((s, i) => ({
    label: s.label,
    // Only past steps are linkable; current/future render as plain text.
    route:
      i < idx && sessionId ? `/us-notices/${sessionId}/${s.key}` : undefined,
  }));
  return { steps, currentIndex: idx };
}
