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
  /**
   * LIA/DPIA/Governance master reviews (2026-09-15): what `regulationText`
   * IS. Default is inferred: an unbroken quotation is "verbatim", text with
   * an ellipsis is an "excerpt", text beginning "Summary of" is a "summary".
   * Set explicitly for guidance quotations ("guidance", e.g. WP248) and for
   * product paraphrases ("paraphrase"), which must never be labelled as law.
   * A bare placeholder ("…") is suppressed by the rail whatever the kind.
   */
  regulationTextKind?: "verbatim" | "excerpt" | "summary" | "guidance" | "paraphrase";
  /** Overrides the heading shown above `regulationText` (e.g. "EDPB WP248 rev.01 (verbatim)"). */
  regulationTextHeading?: string;
  fscrContext?: string;
  /**
   * Heading for `fscrContext`. Defaults to "Agency reasoning (FSOR)" for the
   * CPPA products; the GDPR hook sets "GDPR recital (context)" so a recital is
   * never presented as an agency's final statement of reasons.
   */
  fscrContextHeading?: string;
  enforcementNote?: string;
  goodAnswer?: string;
  /**
   * ADMT/Cyber master reviews (2026-09-15, F15): a goodAnswer is EITHER a
   * fictional worked example of form (the default) OR an explanation of the
   * legal standard. The coaching panel labels the two differently so an
   * explanation is never presented as "a worked example (fictional)".
   */
  goodAnswerKind?: "example" | "explanation";
  commonMistake?: string;
  /**
   * coachLead — ONE imperative line a seasoned professional can act on instantly
   * (serif, shown always). coachBody — 1–2 sentences of elaboration (shown always).
   * Both obey the same discipline as goodAnswer: they describe the SHAPE of a
   * complete answer (dimensions, specificity, separateness), never the content
   * of a compliant one.
   */
  coachLead?: string;
  coachBody?: string;
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
