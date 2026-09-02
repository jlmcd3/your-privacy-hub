// S-P2 (doc 80, 2026-08-27) — the Article 30(5) small-organisation
// derogation, rendered as an INFORMATIONAL note (PN-P6's cheap-correct
// form). The gate never suppresses or shortens the register: an exempt
// customer who maintains a RoPA anyway is doing best practice and is told
// exactly that. Where the recorded activities themselves establish a
// derogation exception (special-category processing), the note says so
// determinately; otherwise it states honestly which facts the register
// does not record (headcount, regularity) rather than guessing.
//
// Detection reads the per-activity `special_category_basis` answer — the
// register's own Art. 9 signal — never free-text category parsing.
//
// DOC 142 (2026-09-02) — ONE STATE, MANY SURFACES. The old exact-match
// negation test (`^(—|-|none|not applicable|n\/a)$`) counted an activity
// whose recorded answer LEADS with a disclaimer but carries an explanatory
// clause — "Not applicable — ICO Children's Code (DPA 2018 s.123) …" — as
// having a special-category basis, so the 30(5) note contradicted that same
// activity's own rendered "Special category basis: Not applicable — …" row.
// `specialCategoryBasisRecorded` below is now the single negation-aware
// normalizer of the per-activity special-category state; any surface that
// needs the boolean must consume it rather than re-deriving its own.

type Bag = Record<string, unknown>;

/**
 * THE per-activity normalized special-category state: true only when the
 * recorded `special_category_basis` answer affirms a basis. Negation-aware
 * (doc 138 lesson): an answer whose LEADING clause disclaims a basis is a
 * negative answer even when an explanatory clause follows it.
 */
export function specialCategoryBasisRecorded(v: unknown): boolean {
  if (v == null) return false;
  const s = (Array.isArray(v) ? v.map(String).join(", ") : String(v)).trim();
  if (s === "" || /^(?:—|–|-+)$/.test(s)) return false;
  const lead = s.toLowerCase();
  if (
    /^n\/a\b/.test(lead) ||
    /^none\b/.test(lead) ||
    /^not applicable\b/.test(lead) ||
    /^not required\b/.test(lead) ||
    /^not recorded\b/.test(lead) ||
    /^no special\b/.test(lead) ||
    /^no[.,;:\s]*$/.test(lead)
  ) {
    return false;
  }
  return true;
}

/** Names of activities whose record carries a special-category basis. */
export function specialCategoryActivities(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
): string[] {
  return activities
    .filter((a) => specialCategoryBasisRecorded((answersByActivity[a.id] ?? {})["special_category_basis"]))
    .map((a) => a.display_name);
}

export interface Art305Note {
  heading: string;
  body: string;
}

export function buildArt305Note(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
): Art305Note {
  const special = specialCategoryActivities(activities, answersByActivity);
  const heading = "Article 30(5) note";
  if (special.length > 0) {
    const list = special.join(", ");
    return {
      heading,
      body:
        `The Article 30(5) derogation for organisations employing fewer than 250 persons does not turn on headcount alone: it is unavailable where the processing includes special categories of data under Article 9(1). ` +
        `This register records a special-category basis for ${special.length === 1 ? "the activity" : `${special.length} activities`} ${list}, so the Article 30 record-keeping obligation applies to the company regardless of its size.`,
    };
  }
  return {
    heading,
    body:
      "Organisations employing fewer than 250 persons are exempt from Article 30 record-keeping unless the processing is likely to result in a risk to rights and freedoms, is other than occasional, or includes special categories of data or criminal-conviction data. " +
      "On the recorded activities, no special-category exception is engaged; whether the derogation could apply turns on the company's headcount and the regularity of its processing, which this register does not record. " +
      "Maintaining the register is good practice and accountability evidence in either case.",
  };
}

export function art305NoteHtml(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
  escapeHtml: (s: unknown) => string,
): string {
  const note = buildArt305Note(activities, answersByActivity);
  return `<section class="art305-note" style="background:#edf2f5;border:1px solid #dde5ea;border-radius:0.375rem;padding:0.9rem 1.1rem;margin:1.25rem 0;">
    <h3 style="margin:0 0 0.4rem 0;font-size:0.95rem;">${escapeHtml(note.heading)}</h3>
    <p style="margin:0;font-size:0.85rem;">${escapeHtml(note.body)}</p>
  </section>`;
}
