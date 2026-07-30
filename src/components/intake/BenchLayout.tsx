import type { ReactNode } from "react";
import StatuteRail from "./StatuteRail";
import CoachingPanel from "./CoachingPanel";
import type { RailEntry } from "./RailEntry";
import { INTAKE_POLICY } from "./intakePolicy";

function ColHeader({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "coach" | "answers" | "law";
}) {
  const border =
    tone === "coach"
      ? "border-teal-action"
      : tone === "law"
      ? "border-brand-ocean"
      : "border-brand-navy";
  return (
    <div
      className={`mb-4 border-b-2 pb-2.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-brand-steel ${border}`}
    >
      {children}
    </div>
  );
}

export default function BenchLayout({
  toolType,
  railEntry = null,
  defaultSourceUrl,
  corpusBlock,
  coachingOpenByDefault = false,
  children,
}: {
  toolType: keyof typeof INTAKE_POLICY | string;
  railEntry?: RailEntry | null;
  defaultSourceUrl?: string;
  corpusBlock?: ReactNode; // descriptive enforcement-corpus context (optional)
  coachingOpenByDefault?: boolean;
  children: ReactNode;
}) {
  const policy = INTAKE_POLICY[toolType as string];
  const showRail = policy?.rail === true;
  const entryHasCoaching = !!(railEntry?.coachLead || railEntry?.goodAnswer);
  const showCoach = policy?.goodAnswer === true && entryHasCoaching;
  return (
    <div
      className="rounded-b-2xl border border-t-0 border-rule bg-card xl:grid"
      style={{
        gridTemplateColumns:
          showCoach && showRail
            ? "280px minmax(0, 1fr) 300px"
            : showRail
            ? "minmax(0, 1fr) 300px"
            : "1fr",
      }}
    >
      {showCoach && (
        <div className="border-b border-rule p-6 xl:border-b-0 xl:border-r">
          <div className="xl:sticky xl:top-[var(--sticky-offset)] xl:max-h-[calc(100vh-var(--sticky-offset)-1.5rem)] xl:overflow-y-auto">
            <ColHeader tone="coach">How to answer well</ColHeader>
            <CoachingPanel entry={railEntry} openByDefault={coachingOpenByDefault} />
          </div>
        </div>
      )}
      <div className="p-6">
        <ColHeader tone="answers">Your answers</ColHeader>
        {children}
      </div>
      {showRail && (
        <div className="border-t border-rule p-6 xl:border-l xl:border-t-0">
          <div className="xl:sticky xl:top-[var(--sticky-offset)] xl:max-h-[calc(100vh-var(--sticky-offset)-1.5rem)] xl:overflow-y-auto">
            <ColHeader tone="law">The law</ColHeader>
            <StatuteRail
              entry={railEntry}
              defaultSourceUrl={defaultSourceUrl}
              showCoachingFields={false}
              fluid
            />
            {corpusBlock && (
              <div className="mt-5 border-t border-rule pt-4">
                <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-teal-action">
                  From the enforcement corpus
                </p>
                {corpusBlock}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
