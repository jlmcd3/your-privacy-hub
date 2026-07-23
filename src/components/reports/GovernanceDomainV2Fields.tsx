// QB-P25 Turn B2 — renderer for governance v2 fields
// (recommended_action_v2 + regulatory_basis_v2). Prefer v2 when structurally
// valid; otherwise the parent falls back to the legacy strings. The timeline
// sentence is composed here from deadline — no wrapper is applied.
//
// Kept as a small presentational component so both the primary and fallback
// Domain Findings accordions in GovernanceAssessmentResult use identical
// v2 rendering logic.

type StatutoryDeadline = { kind: "statutory"; citation: string; illustrative_default?: string };
type OrgSetDeadline = { kind: "org_set"; illustrative_default: string };
type Deadline = StatutoryDeadline | OrgSetDeadline;

export type RecommendedActionV2 = {
  action: string;
  owner: { role: string; intake_field: string };
  trigger: string;
  deadline: Deadline;
};

export type RegulatoryBasisV2Entry = { citation: string; engaged_because: string };

export function isRecommendedActionV2Valid(v: unknown): v is RecommendedActionV2 {
  if (!v || typeof v !== "object") return false;
  const o = v as any;
  if (typeof o.action !== "string" || !o.action.trim()) return false;
  if (!o.owner || typeof o.owner !== "object") return false;
  if (typeof o.owner.role !== "string" || !o.owner.role.trim()) return false;
  if (typeof o.owner.intake_field !== "string" || !o.owner.intake_field.trim()) return false;
  if (typeof o.trigger !== "string" || !o.trigger.trim()) return false;
  const d = o.deadline;
  if (!d || typeof d !== "object") return false;
  if (d.kind === "statutory") return typeof d.citation === "string" && !!d.citation.trim();
  if (d.kind === "org_set") return typeof d.illustrative_default === "string" && !!d.illustrative_default.trim();
  return false;
}

export function isRegulatoryBasisV2Valid(v: unknown): v is RegulatoryBasisV2Entry[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (e) =>
      e && typeof e === "object" &&
      typeof (e as any).citation === "string" && !!(e as any).citation.trim() &&
      typeof (e as any).engaged_because === "string" && !!(e as any).engaged_because.trim(),
  );
}

export function composeTimelineSentence(deadline: Deadline | undefined | null): string {
  if (!deadline) return "";
  if (deadline.kind === "statutory") {
    const base = `Statutory deadline: ${deadline.citation}`;
    return deadline.illustrative_default
      ? `${base} (illustrative cadence — ${deadline.illustrative_default})`
      : base;
  }
  if (deadline.kind === "org_set") {
    return `Timeline to be set by the organisation (e.g. ${deadline.illustrative_default})`;
  }
  return "";
}

interface Props {
  recommendedActionV2?: unknown;
  regulatoryBasisV2?: unknown;
  legacyRecommendedAction?: string | null;
  legacyRegulatoryBasis?: string | null;
}

export default function GovernanceDomainV2Fields({
  recommendedActionV2,
  regulatoryBasisV2,
  legacyRecommendedAction,
  legacyRegulatoryBasis,
}: Props) {
  const recValid = isRecommendedActionV2Valid(recommendedActionV2);
  const basValid = isRegulatoryBasisV2Valid(regulatoryBasisV2);

  return (
    <>
      {basValid ? (
        <div className="text-sm mb-2">
          <p className="font-medium">Regulatory basis:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {(regulatoryBasisV2 as RegulatoryBasisV2Entry[]).map((e, i) => (
              <li key={i}>
                <span className="font-mono text-xs">{e.citation}</span>
                <span className="text-muted-foreground"> — engaged because {e.engaged_because}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : legacyRegulatoryBasis ? (
        <p className="text-sm mb-2"><strong>Regulatory basis:</strong> {legacyRegulatoryBasis}</p>
      ) : null}

      {recValid ? (
        (() => {
          const v2 = recommendedActionV2 as RecommendedActionV2;
          return (
            <div className="text-sm mb-2 rounded border border-muted p-3 bg-muted/30">
              <p className="mb-1"><strong>Recommended action:</strong> {v2.action}</p>
              <p className="text-xs text-muted-foreground">
                Owner: {v2.owner.role} <span className="italic">(from {v2.owner.intake_field})</span>
              </p>
              <p className="text-xs text-muted-foreground">Trigger: {v2.trigger}</p>
              <p className="text-xs text-muted-foreground">{composeTimelineSentence(v2.deadline)}</p>
            </div>
          );
        })()
      ) : legacyRecommendedAction ? (
        <p className="text-sm mb-2"><strong>Recommended action:</strong> {legacyRecommendedAction}</p>
      ) : null}
    </>
  );
}
