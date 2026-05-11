// Computes a card-surface severity label from the AI summary's
// urgency + legal_weight. Visible to ALL tiers including anonymous.
// Spec: see Version 6 prompts (Batch 3B).

export type SeverityLabel = {
  label: string;
  /** Tailwind classes for badge background + text + border. */
  className: string;
  /** Tone hint used by callers that want their own styling. */
  tone: "red" | "amber" | "blue";
};

export function getSeverityLabel(aiSummary: any): SeverityLabel | null {
  if (!aiSummary) return null;
  const urgency = String(aiSummary.urgency ?? "").toLowerCase();
  const legalWeight = String(aiSummary.legal_weight ?? "").toLowerCase();

  if (
    urgency === "immediate" ||
    legalWeight === "binding" ||
    legalWeight.includes("binding") ||
    legalWeight === "enforcement" ||
    legalWeight.includes("enforcement")
  ) {
    return {
      label: "Immediate action",
      tone: "red",
      className: "bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (urgency === "this quarter" || urgency === "this-quarter" || legalWeight === "guidance" || legalWeight.includes("guidance")) {
    return {
      label: "Watch closely",
      tone: "amber",
      className: "bg-amber-50 text-amber-800 border border-amber-200",
    };
  }
  if (urgency === "monitor" || legalWeight === "commentary") {
    return {
      label: "Monitor",
      tone: "blue",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    };
  }
  return null;
}
