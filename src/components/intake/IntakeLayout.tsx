// src/components/intake/IntakeLayout.tsx
// Shared two-column intake layout. Renders the StatuteRail column iff the
// per-tool policy in intakePolicy.ts has `rail: true`. New/refactored tools
// (Phase 1.b) consume this. Existing rail pages are NOT retrofitted here.

import type { ReactNode } from "react";
import StatuteRail from "./StatuteRail";
import type { RailEntry } from "./RailEntry";
import { INTAKE_POLICY } from "./intakePolicy";

interface IntakeLayoutProps {
  toolType: keyof typeof INTAKE_POLICY | string;
  railEntry?: RailEntry | null;
  defaultSourceUrl?: string;
  children: ReactNode;
  className?: string;
}

export default function IntakeLayout({
  toolType,
  railEntry = null,
  defaultSourceUrl,
  children,
  className = "",
}: IntakeLayoutProps) {
  const policy = INTAKE_POLICY[toolType as string];
  const showRail = policy?.rail === true;

  return (
    <div className={`flex gap-6 items-start ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {showRail && <StatuteRail entry={railEntry ?? null} defaultSourceUrl={defaultSourceUrl} />}
    </div>
  );
}
