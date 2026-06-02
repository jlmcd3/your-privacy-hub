// Standard RoPA flow steps for the breadcrumb component.
// Shown on: setup · activities · activity · review · documents · refresh.
// NOT shown on: /ropa (home) or /ropa-builder (landing).

import { withSession } from "@/lib/ropaSession";

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

export function getRopaSteps(
  current: RopaFlowStep,
  sessionId?: string | null
): {
  steps: { label: string; route?: string }[];
  currentIndex: number;
} {
  if (current === "refresh") {
    return {
      steps: [
        { label: "Refresh", route: undefined },
        { label: "Q&A", route: undefined },
        {
          label: "Review",
          route: sessionId ? `/ropa/review/${sessionId}` : "/ropa/review",
        },
        {
          label: "Documents",
          route: withSession("/ropa/documents", sessionId),
        },
      ],
      currentIndex: 0,
    };
  }

  // The Review step uses a path-param session id; the others use `?session=`.
  const steps = RopaFlowSteps.map((s) => {
    if (!s.route) return { label: s.label, route: undefined };
    if (s.key === "review") {
      return {
        label: s.label,
        route: sessionId ? `/ropa/review/${sessionId}` : s.route,
      };
    }
    return { label: s.label, route: withSession(s.route, sessionId) };
  });
  const currentIndex = RopaFlowSteps.findIndex((s) => s.key === current);
  return { steps, currentIndex: currentIndex === -1 ? 0 : currentIndex };
}
