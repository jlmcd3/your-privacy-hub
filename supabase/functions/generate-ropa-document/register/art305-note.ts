// S-P2 (doc 80, 2026-08-27) — the Article 30(5) small-organisation
// derogation, rendered as an INFORMATIONAL note (PN-P6's cheap-correct
// form). The gate never suppresses or shortens the register: an exempt
// customer who maintains a RoPA anyway is doing best practice and is told
// exactly that. Where the recorded activities themselves establish a
// derogation exception (special-category processing), the note says so
// determinately; otherwise it states honestly which facts the register
// does not record rather than guessing.
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
//
// DOC 167 (2026-09-04) — the note reads the recorded employee band (it used
// to claim headcount "is not recorded" while the setup wizard collects it).
//
// DOC 168 (2026-09-04, CEO options rule) — `special_category_basis` is now a
// closed-list multi-select (Art. 9(2)(a)–(j) + Art. 10 + "none"), and a new
// per-activity `processing_regularity` answer closes the "not occasional"
// limb doc 167 had to leave unrecorded. Every limb of Art. 30(5) the record
// CAN answer is now answered; the one it cannot — "likely to result in a
// risk to the rights and freedoms of data subjects" — is named as not
// assessed rather than guessed. Legacy free-text answers keep the doc-142
// negation-aware reading.

import { selectionAffirms, SPECIAL_CATEGORY_NONE } from "./answer-labels.ts";

type Bag = Record<string, unknown>;

/**
 * THE per-activity normalized special-category state: true only when the
 * recorded `special_category_basis` answer affirms a basis. A structured
 * answer affirms when any option other than "none" is selected; a legacy
 * free-text answer is read negation-aware (doc 138 lesson): an answer whose
 * LEADING clause disclaims a basis is a negative answer even when an
 * explanatory clause follows it.
 */
export function specialCategoryBasisRecorded(v: unknown): boolean {
  if (v == null) return false;
  const structured = selectionAffirms(v, SPECIAL_CATEGORY_NONE);
  if (structured !== null) return structured;
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

/** DOC 168 — the per-activity regularity answer, normalized. */
export function processingRegularity(v: unknown): "regular" | "occasional" | "unknown" {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "regular") return "regular";
  if (s === "occasional") return "occasional";
  return "unknown";
}

/** Names of activities recorded as regular or ongoing processing. */
export function regularActivities(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
): string[] {
  return activities
    .filter((a) => processingRegularity((answersByActivity[a.id] ?? {})["processing_regularity"]) === "regular")
    .map((a) => a.display_name);
}

/** True when every recorded activity is recorded as occasional (and there is at least one). */
export function allActivitiesOccasional(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
): boolean {
  return activities.length > 0 &&
    activities.every((a) => processingRegularity((answersByActivity[a.id] ?? {})["processing_regularity"]) === "occasional");
}

export interface Art305Note {
  heading: string;
  body: string;
}

// Bands mirror the DB CHECK constraint on ropa_client_profiles.employee_band
// (migration 20260501221552, values '<50','50-249','250-999','1000+').
const UNDER_250_BANDS = new Set(["<50", "50-249"]);
const AT_LEAST_250_BANDS = new Set(["250-999", "1000+"]);
const EMPLOYEE_BAND_PHRASE: Record<string, string> = {
  "<50": "fewer than fifty people",
  "50-249": "between fifty and two hundred and forty-nine people",
  "250-999": "between two hundred and fifty and nine hundred and ninety-nine people",
  "1000+": "one thousand people or more",
};

// Tracks Art. 30(5) GDPR / UK GDPR (provision_texts gdpr-art-30 and
// ukgdpr-art-30, both approved; limbs in the Article's own order).
const OPENING =
  "Article 30(5) exempts an enterprise or organisation employing fewer than 250 persons from the Article 30 record-keeping obligation unless the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects, the processing is not occasional, or the processing includes special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10.";
const REQUIRED_CLOSER = "Maintaining the register is required, not merely good practice, on this record.";
const PRACTICE_CLOSER = "Maintaining the register is good practice and accountability evidence in either case.";
const RISK_LIMB =
  "whether the processing is likely to result in a risk to the rights and freedoms of data subjects, which this register does not assess";

function nameActivities(names: readonly string[]): string {
  return names.length === 1 ? `the activity ${names[0]}` : `${names.length} activities ${names.join(", ")}`;
}

export function buildArt305Note(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
  employeeBand?: string | null,
): Art305Note {
  const heading = "Article 30(5) note";

  // Limb 3 — special categories / criminal-offence data (Art. 9(1), Art. 10).
  const special = specialCategoryActivities(activities, answersByActivity);
  if (special.length > 0) {
    return {
      heading,
      body:
        `${OPENING} The derogation does not turn on headcount alone: this register records special-category or criminal-offence data processing for ${nameActivities(special)}, so the Article 30 record-keeping obligation applies to the company regardless of its size.`,
    };
  }

  // Limb 2 — "the processing is not occasional".
  const regular = regularActivities(activities, answersByActivity);
  if (regular.length > 0) {
    return {
      heading,
      body:
        `${OPENING} On the recorded activities, no special-category exception is engaged, but the derogation is unavailable regardless of headcount: the Company records ${nameActivities(regular)} as regular or ongoing processing, so the processing is not occasional. ${REQUIRED_CLOSER}`,
    };
  }

  // Headcount — the "fewer than 250 persons" threshold.
  const band = (employeeBand ?? "").trim();
  if (AT_LEAST_250_BANDS.has(band)) {
    return {
      heading,
      body:
        `${OPENING} On the recorded activities, no special-category exception is engaged, but the derogation is unavailable regardless: the Company reports a workforce of ${EMPLOYEE_BAND_PHRASE[band]}, which is not fewer than 250 persons. ${REQUIRED_CLOSER}`,
    };
  }

  const occasional = allActivitiesOccasional(activities, answersByActivity);
  if (UNDER_250_BANDS.has(band)) {
    return {
      heading,
      body: occasional
        ? `${OPENING} On the recorded activities, no special-category exception is engaged; the Company reports a workforce of ${EMPLOYEE_BAND_PHRASE[band]}, which is fewer than 250 persons, and records every activity as occasional. Whether the derogation applies therefore turns on ${RISK_LIMB}. ${PRACTICE_CLOSER}`
        : `${OPENING} On the recorded activities, no special-category exception is engaged, and the Company reports a workforce of ${EMPLOYEE_BAND_PHRASE[band]}, which is fewer than 250 persons; whether the derogation could apply therefore turns on the regularity of the Company's processing, which this register does not record for every activity, and on ${RISK_LIMB}. ${PRACTICE_CLOSER}`,
    };
  }

  // Headcount unrecorded.
  return {
    heading,
    body: occasional
      ? `${OPENING} On the recorded activities, no special-category exception is engaged, and the Company records every activity as occasional; whether the derogation could apply turns on the company's headcount, which this register does not record, and on ${RISK_LIMB}. ${PRACTICE_CLOSER}`
      : `${OPENING} On the recorded activities, no special-category exception is engaged; whether the derogation could apply turns on the company's headcount and the regularity of its processing, which this register does not record. ${PRACTICE_CLOSER}`,
  };
}

export function art305NoteHtml(
  activities: ReadonlyArray<{ id: string; display_name: string }>,
  answersByActivity: Record<string, Bag>,
  escapeHtml: (s: unknown) => string,
  employeeBand?: string | null,
): string {
  const note = buildArt305Note(activities, answersByActivity, employeeBand);
  return `<section class="art305-note" style="background:#edf2f5;border:1px solid #dde5ea;border-radius:0.375rem;padding:0.9rem 1.1rem;margin:1.25rem 0;">
    <h3 style="margin:0 0 0.4rem 0;font-size:0.95rem;">${escapeHtml(note.heading)}</h3>
    <p style="margin:0;font-size:0.85rem;">${escapeHtml(note.body)}</p>
  </section>`;
}
