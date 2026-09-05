/**
 * QA batch 2026-09-05 (REG 03) — the jurisdiction_requirements.notes row for
 * the UK (seeded by migration 20260616162811) says "Exemptions: sole traders,
 * charities, small occupational pension schemes, maintained schools." The
 * ICO's own guidance contradicts that: the data-protection-fee exemptions are
 * ACTIVITY-based (an organisation, sole traders included, pays unless every
 * purpose it processes personal data for is an exempt purpose), and charities
 * and small occupational pension schemes that are not otherwise exempt pay the
 * Tier 1 fee regardless of size or turnover — a fee exception, not an
 * exemption. The row is DB content (proposed SQL correction in the doc-187
 * spec); this guard rewrites the sentence on the way out so the customer never
 * sees the blanket category list whatever the row says.
 *
 * Verified 2026-09-05 against
 * https://ico.org.uk/for-organisations/data-protection-fee/ (pay-your-fee and
 * guide pages).
 */
export const ICO_FEE_EXEMPTION_NOTE =
  "Exemptions are activity-based, not organisation-based: an organisation (including a sole trader) pays the fee unless every purpose it processes personal data for is an exempt purpose (for example staff administration; advertising, marketing and public relations for its own business; accounts and records; not-for-profit purposes; personal, family or household affairs; maintaining a public register; or judicial functions). Charities and small occupational pension schemes that are not otherwise exempt pay the Tier 1 fee regardless of size or turnover.";

const BLANKET_EXEMPTION_SENTENCE =
  /Exemptions:\s*sole traders,\s*charities,\s*small occupational pension schemes(?:,\s*maintained schools)?\.?/i;

export function correctIcoExemptionNote(notes: string | null, jurisdictionCode: string): string | null {
  if (!notes || jurisdictionCode !== "UK") return notes;
  return notes.replace(BLANKET_EXEMPTION_SENTENCE, ICO_FEE_EXEMPTION_NOTE);
}
