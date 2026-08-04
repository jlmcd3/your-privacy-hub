/**
 * ITEM 369-IR LEG 2 — EDPB ARTICLE 33 NOTIFICATION TEMPLATE FIELD MAPPING.
 *
 * WHAT THIS IS
 *   A MAPPING LAYER over `content_owner_mapping`. It re-keys the Art. 33(3)(a)-(d)
 *   element analysis that module already produces onto the field structure of the
 *   EDPB Article 33 breach-notification template (draft adopted 8 June 2026) —
 *   the same template the intake rail already relies on for this section.
 *
 * WHAT THIS IS NOT
 *   It is NOT a second analysis and NOT a parallel structure. Every populated
 *   value is carried across from an element the deliverables builder already
 *   determined; nothing is re-derived, re-worded or re-argued here. The
 *   phasing / owner data generalised into the first-24-hours checklist is
 *   untouched and stays where it is.
 *
 * BLANK LAW
 *   The template has fields the generator has no content for. Those render as
 *   an EXPLICITLY BLANK LABELLED FIELD (`status: "blank"`, `value: ""`), never
 *   as invented, inferred or plausible-looking content. A blank field on a
 *   regulator's form is a correct answer; a fabricated one is not.
 *
 * TEMPLATE GUIDANCE, NOT AUTHORITY
 *   The EDPB template fixes the field names and their order. It is never quoted
 *   and no obligation asserted anywhere in this product rests on it — the
 *   obligations rest on GDPR Arts. 33-34, which the determinations cite
 *   directly.
 */

import type { ContentElementKey, ContentElementMapping } from "./types.ts";

export const EDPB_ART33_TEMPLATE_VERSION = "edpb-art33-template-item369-leg2-2026-08-04";

export const EDPB_ART33_TEMPLATE_LABEL =
  "EDPB Article 33 breach-notification template (draft adopted 8 June 2026)";

export type EdpbFieldStatus = "mapped" | "blank";

export interface EdpbTemplateField {
  /** Stable field key on the template form. */
  readonly field_id: string;
  /** The template's own field label, rendered verbatim as the form label. */
  readonly label: string;
  /** The template section the field sits in. */
  readonly template_section: string;
  /**
   * The `content_owner_mapping` element this field is fed from, where one
   * exists. Null for template fields outside the Art. 33(3)(a)-(d) elements.
   */
  readonly source_element: ContentElementKey | null;
  /** Role accountable for the field, carried across from the element mapping. */
  readonly owner: string;
  /** Empty string where the record supplies nothing. Never a placeholder guess. */
  readonly value: string;
  readonly status: EdpbFieldStatus;
}

export interface EdpbTemplateSection {
  readonly id: string;
  readonly heading: string;
  readonly fields: readonly EdpbTemplateField[];
}

export interface EdpbArt33TemplateMapping {
  readonly version: string;
  readonly template_label: string;
  readonly note: string;
  readonly sections: readonly EdpbTemplateSection[];
  readonly mapped_count: number;
  readonly blank_count: number;
}

const NOTE =
  "The Article 33(3) element analysis re-keyed onto the fields of the EDPB Article 33 notification template. " +
  "A field shown blank is one this record does not answer; it is left blank deliberately so it is completed from the " +
  "organisation's own record rather than from a generated approximation.";

/** Facts the mapper is allowed to read. Supplied by the deliverables builder. */
export interface EdpbTemplateFacts {
  readonly org: string;
  readonly cause: string;
  readonly dataTypes: readonly string[];
  readonly affectedCount: string;
  readonly recordCount: string;
  readonly subjectCount: string;
  readonly awareness: string;
  readonly jurisdictions: readonly string[];
  readonly processorInvolved: boolean;
  readonly processorName: string;
}

interface FieldSpec {
  readonly field_id: string;
  readonly label: string;
  readonly source_element: ContentElementKey | null;
}

interface SectionSpec {
  readonly id: string;
  readonly heading: string;
  readonly fields: readonly FieldSpec[];
}

/** The template's locked field structure and order. */
export const EDPB_ART33_TEMPLATE_STRUCTURE: readonly SectionSpec[] = [
  {
    id: "controller",
    heading: "1. Identity of the controller",
    fields: [
      { field_id: "controller_name", label: "Name of the controller", source_element: null },
      { field_id: "controller_contact_details", label: "Contact details of the controller", source_element: null },
      { field_id: "establishments_concerned", label: "Establishment(s) and Member State(s) concerned", source_element: null },
      { field_id: "lead_supervisory_authority", label: "Lead supervisory authority (where cross-border)", source_element: null },
    ],
  },
  {
    id: "contact_point",
    heading: "2. Contact point — Article 33(3)(b)",
    fields: [
      { field_id: "dpo_contact_name", label: "Name of the data protection officer or other contact point", source_element: "b_dpo_contact" },
      { field_id: "dpo_contact_details", label: "Contact details from which more information can be obtained", source_element: "b_dpo_contact" },
    ],
  },
  {
    id: "nature",
    heading: "3. Nature of the personal data breach — Article 33(3)(a)",
    fields: [
      { field_id: "date_time_of_breach", label: "Date and time of the breach", source_element: "a_nature" },
      { field_id: "date_time_of_awareness", label: "Date and time the controller became aware", source_element: "a_nature" },
      { field_id: "nature_description", label: "Description of the nature of the breach", source_element: "a_nature" },
      { field_id: "breach_type", label: "Type of breach (confidentiality / integrity / availability)", source_element: "a_nature" },
      { field_id: "categories_of_data_subjects", label: "Categories of data subjects concerned", source_element: "a_nature" },
      { field_id: "approx_number_of_data_subjects", label: "Approximate number of data subjects concerned", source_element: "a_nature" },
      { field_id: "categories_of_personal_data", label: "Categories of personal data records concerned", source_element: "a_nature" },
      { field_id: "approx_number_of_records", label: "Approximate number of personal data records concerned", source_element: "a_nature" },
      { field_id: "processor_involvement", label: "Processor involvement, where applicable", source_element: "a_nature" },
    ],
  },
  {
    id: "consequences",
    heading: "4. Likely consequences of the breach — Article 33(3)(c)",
    fields: [
      { field_id: "likely_consequences", label: "Description of the likely consequences of the breach", source_element: "c_likely_consequences" },
    ],
  },
  {
    id: "measures",
    heading: "5. Measures taken or proposed — Article 33(3)(d)",
    fields: [
      { field_id: "measures_taken", label: "Measures taken or proposed to address the breach", source_element: "d_measures" },
      { field_id: "measures_to_mitigate", label: "Measures taken or proposed to mitigate possible adverse effects", source_element: "d_measures" },
    ],
  },
  {
    id: "data_subjects",
    heading: "6. Communication to data subjects — Article 34",
    fields: [
      { field_id: "data_subjects_informed", label: "Have the data subjects been informed?", source_element: null },
      { field_id: "reason_not_informed", label: "If not, the reason communication has not been made", source_element: null },
    ],
  },
  {
    id: "procedural",
    heading: "7. Cross-border and procedural information",
    fields: [
      { field_id: "cross_border_processing", label: "Does the breach concern cross-border processing?", source_element: null },
      { field_id: "other_authorities_notified", label: "Other supervisory authorities notified", source_element: null },
      { field_id: "phased_notification", label: "Is this a phased notification under Article 33(4)?", source_element: null },
      { field_id: "reason_for_delay", label: "Where notified later than 72 hours, the reasons for the delay", source_element: null },
    ],
  },
];

function elementOwner(elements: readonly ContentElementMapping[], key: ContentElementKey | null): string {
  if (!key) return "";
  return elements.find((e) => e.element === key)?.owner ?? "";
}

/**
 * Re-keys the existing element analysis onto the template's field structure.
 * Pure: reads only the mapping the deliverables builder already produced and
 * the incident facts it already read.
 */
export function mapContentOwnerToEdpbTemplate(
  elements: readonly ContentElementMapping[],
  facts: EdpbTemplateFacts,
  phasedElements: readonly ContentElementKey[],
): EdpbArt33TemplateMapping {
  const el = (k: ContentElementKey) => elements.find((e) => e.element === k);
  const b = el("b_dpo_contact");
  const c = el("c_likely_consequences");
  const d = el("d_measures");

  // Only carry across an element value the builder actually determined.
  const carried = (m: ContentElementMapping | undefined): string =>
    m && m.status === "analysed" ? m.record_value : "";

  const subjects = facts.subjectCount
    ? facts.subjectCount
    : facts.affectedCount
      ? `Band recorded on the intake only: ${facts.affectedCount}`
      : "";

  const values: Record<string, string> = {
    controller_name: facts.org,
    controller_contact_details: "",
    establishments_concerned: facts.jurisdictions.length ? facts.jurisdictions.join(", ") : "",
    lead_supervisory_authority: "",
    dpo_contact_name: carried(b),
    dpo_contact_details: "",
    date_time_of_breach: "",
    date_time_of_awareness: facts.awareness ? `Awareness basis recorded as: ${facts.awareness}` : "",
    nature_description: facts.cause,
    breach_type: "",
    categories_of_data_subjects: "",
    approx_number_of_data_subjects: subjects,
    categories_of_personal_data: facts.dataTypes.length ? facts.dataTypes.join(", ") : "",
    approx_number_of_records: facts.recordCount,
    processor_involvement: facts.processorInvolved
      ? (facts.processorName ? `Processor involved: ${facts.processorName}` : "Processor involved; processor not named on the record")
      : "",
    likely_consequences: carried(c),
    measures_taken: carried(d),
    measures_to_mitigate: "",
    data_subjects_informed: "",
    reason_not_informed: "",
    cross_border_processing: "",
    other_authorities_notified: "",
    phased_notification: phasedElements.length
      ? `Yes — Article 33(4) phasing applies to: ${phasedElements.join(", ")}`
      : "",
    reason_for_delay: "",
  };

  let mapped = 0;
  let blank = 0;
  const sections: EdpbTemplateSection[] = EDPB_ART33_TEMPLATE_STRUCTURE.map((spec) => ({
    id: spec.id,
    heading: spec.heading,
    fields: spec.fields.map((f) => {
      const raw = (values[f.field_id] ?? "").trim();
      const status: EdpbFieldStatus = raw ? "mapped" : "blank";
      if (raw) mapped++;
      else blank++;
      return {
        field_id: f.field_id,
        label: f.label,
        template_section: spec.heading,
        source_element: f.source_element,
        owner: elementOwner(elements, f.source_element),
        value: raw,
        status,
      };
    }),
  }));

  return {
    version: EDPB_ART33_TEMPLATE_VERSION,
    template_label: EDPB_ART33_TEMPLATE_LABEL,
    note: NOTE,
    sections,
    mapped_count: mapped,
    blank_count: blank,
  };
}
