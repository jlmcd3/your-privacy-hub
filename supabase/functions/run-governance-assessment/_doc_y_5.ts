// Doc Y-5 Defect 2 backstop — illustrative-frequency stripper.
// Isolated from index.ts so unit tests can import without pulling in
// supabase-js and unrelated type-check surface.
//
// Removes illustrative frequency/period parentheticals (or unpaired em-dash
// clauses) from recommendation-class fields where the frequency is for the
// organisation to determine.
// STATUTE-TOKEN EXCEPTION (Amendment 2, symmetry with the prompt rule's
// statutory-period exception): if the matched span also contains a statute
// token, do NOT strip; emit a STATUTE-ADJACENT FLAG console line instead.
// Whitelisted fields: recommended_action, immediate_actions[*], gap_description,
// action, actions (any nested path segment).

export const DOC_Y5_LEAD = /(?:^|[\s(—-])(?:e\.g\.|for example|for instance|such as)(?=[\s,:;-]|$)/i;
export const DOC_Y5_PERIOD = /\b(?:quarterly|bi[- ]?annual(?:ly)?|semi[- ]?annual(?:ly)?|annual(?:ly)?|monthly|weekly|daily|every\s+\d+\s+(?:day|week|month|year)s?|\d+[- ](?:day|week|month|year))\b/i;
export const DOC_Y5_STATUTE = /\b(?:Art\.|§|CCR|Civ\.\s*Code|GDPR|UK GDPR|DPA 2018|U\.?S\.?C\.|Cal\.|1798\.)/;
export const DOC_Y5_FIELD_RE = /(?:^|\.)(?:recommended_action|immediate_actions|gap_description|action|actions)(?:\[|\.|$)/;

export function docY5StripIllustrativeFrequency(s: string, fieldPath: string): string {
  if (!s || typeof s !== "string") return s;
  if (!DOC_Y5_FIELD_RE.test(fieldPath)) return s;
  let out = s;

  // 1) Paired parenthetical: ( ... )
  out = out.replace(/\s*\(([^()]{1,400})\)/g, (match, inner) => {
    const head = inner.slice(0, 40);
    if (!DOC_Y5_LEAD.test(head)) return match;
    if (!DOC_Y5_PERIOD.test(inner)) return match;
    if (DOC_Y5_STATUTE.test(inner)) {
      console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency STATUTE-ADJACENT FLAG (not stripped) field=${fieldPath} match="${match.trim().slice(0,240)}"`);
      return match;
    }
    console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency stripped field=${fieldPath} match="${match.trim().slice(0,240)}"`);
    return "";
  });

  // 2) Paired em-dash clause: — ... —
  out = out.replace(/\s*—\s*([^—]{1,400})\s*—/g, (match, inner) => {
    const head = inner.slice(0, 40);
    if (!DOC_Y5_LEAD.test(head)) return match;
    if (!DOC_Y5_PERIOD.test(inner)) return match;
    if (DOC_Y5_STATUTE.test(inner)) {
      console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency STATUTE-ADJACENT FLAG (not stripped) field=${fieldPath} match="${match.trim().slice(0,240)}"`);
      return match;
    }
    console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency stripped field=${fieldPath} match="${match.trim().slice(0,240)}"`);
    return "";
  });

  // 3) Unpaired em-dash lead: — ... <sentence terminator or end>
  out = out.replace(/\s*—\s*((?:e\.g\.|i\.e\.|\.(?=\S)|[^—.;!?]){1,400})(?=[.;!?](?:\s|$)|$)/gi, (match, inner) => {
    const head = inner.slice(0, 40);
    if (!DOC_Y5_LEAD.test(head)) return match;
    if (!DOC_Y5_PERIOD.test(inner)) return match;
    if (DOC_Y5_STATUTE.test(inner)) {
      console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency STATUTE-ADJACENT FLAG (not stripped) field=${fieldPath} match="${match.trim().slice(0,240)}"`);
      return match;
    }
    console.warn(`[run-governance-assessment] doc-y-5 illustrative-frequency stripped field=${fieldPath} match="${match.trim().slice(0,240)}"`);
    return "";
  });

  // Tighten whitespace and comma seams left by strips.
  out = out.replace(/\s+([.,;])/g, "$1").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
  return out;
}
