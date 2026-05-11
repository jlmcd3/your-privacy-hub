// Standard RoPA flow steps for the breadcrumb component.
// Shown on: setup · activities · activity · review · documents · refresh.
// NOT shown on: /ropa (home) or /ropa-builder (landing).

export type RopaFlowStep =
  | "setup"
  | "activities"
  | "activity"
  | "review"
  | "documents"
  | "refresh";

export const RopaFlowSteps = [
  { key: "setup", label: "Setup", route: "/ropa/setup" },
  { key: "activities", label: "Activities", route: "/ropa/activities" },
  { key: "activity", label: "Q&A", route: undefined },
  { key: "review", label: "Review", route: "/ropa/review" },
  { key: "documents", label: "Documents", route: "/ropa/documents" },
] as const;

export function getRopaSteps(current: RopaFlowStep): {
  steps: { label: string; route?: string }[];
  currentIndex: number;
} {
  if (current === "refresh") {
    return {
      steps: [
        { label: "Refresh", route: undefined },
        { label: "Q&A", route: undefined },
        { label: "Review", route: "/ropa/review" },
        { label: "Documents", route: "/ropa/documents" },
      ],
      currentIndex: 0,
    };
  }
  const steps = RopaFlowSteps.map((s) => ({ label: s.label, route: s.route }));
  const currentIndex = RopaFlowSteps.findIndex((s) => s.key === current);
  return { steps, currentIndex: currentIndex === -1 ? 0 : currentIndex };
}
