// src/components/intake/RailEntry.ts
// Shared statutory-rail entry shape consumed by <StatuteRail />.

/**
 * goodAnswer — CONTEXT, never advice, and only on tools whose edge function feeds
 * intake into an AI generation prompt (see intakePolicy.ts). Must be EITHER
 * (a) a worked example in an unrelated/illustrative domain showing the required
 * FORM/specificity, OR (b) a restatement of the legal standard. MUST NOT instruct
 * the user's answer on THIS form (no "tick/select/choose/enter X", "tick none").
 * commonMistake — describes a MISREADING of the legal standard or a process error.
 * MUST NOT prescribe the user's specific answer.
 */
export type RailEntry = {
  fieldLabel: string;
  citation: string;
  citationUrl?: string;
  plainSummary: string;
  regulationText: string;
  fscrContext?: string;
  enforcementNote?: string;
  goodAnswer?: string;
  commonMistake?: string;
  relatedCitations?: { citation: string; label: string }[];
  templateGuidance?: {
    sectionRef: string;
    sectionTitle: string;
    guidance: string;
    paraRefs?: number[];
    sourceLabel: string;
    sourceUrl: string;
  };
};
