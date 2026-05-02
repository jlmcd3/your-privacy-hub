// Single source of truth for the EU & Global Notice Builder flow.
// Shown on: mode · frameworks · questions · review · documents (and refresh).
// NOT shown on: /eu-notices (home) or /eu-global-notice-builder (landing).

export type EUNoticeFlowStep =
  | "mode"
  | "frameworks"
  | "questions"
  | "review"
  | "documents"
  | "refresh";

export interface EUNoticeStep {
  key: EUNoticeFlowStep;
  label: string;
}

export const EU_NOTICE_FLOW_STEPS: EUNoticeStep[] = [
  { key: "mode", label: "Mode" },
  { key: "frameworks", label: "Frameworks" },
  { key: "questions", label: "Questions" },
  { key: "review", label: "Review" },
  { key: "documents", label: "Documents" },
];

export function getEUNoticeSteps(
  current: EUNoticeFlowStep,
  sessionId?: string,
): { steps: { label: string; route?: string }[]; currentIndex: number } {
  if (current === "refresh") {
    return {
      steps: [
        { label: "Refresh", route: undefined },
        { label: "Questions", route: undefined },
        { label: "Review", route: undefined },
        { label: "Documents", route: "/eu-notices/documents" },
      ],
      currentIndex: 0,
    };
  }
  const currentIndex = EU_NOTICE_FLOW_STEPS.findIndex((s) => s.key === current);
  const idx = currentIndex === -1 ? 0 : currentIndex;
  const steps = EU_NOTICE_FLOW_STEPS.map((s, i) => {
    // mode is its own URL (no sessionId in path); documents is global.
    let route: string | undefined;
    if (i < idx) {
      if (s.key === "mode") route = "/eu-notices/mode";
      else if (s.key === "documents") route = "/eu-notices/documents";
      else if (sessionId) route = `/eu-notices/${s.key}/${sessionId}`;
    }
    return { label: s.label, route };
  });
  return { steps, currentIndex: idx };
}
