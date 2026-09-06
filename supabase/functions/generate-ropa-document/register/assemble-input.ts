// DOC 168 (2026-09-04) — the pure answers → register mapping, moved out of
// index.ts. index.ts calls Deno.serve at module scope, so nothing in it can
// be imported by a test; keeping the mapping here lets the whole pipeline —
// raw answer bag → RopaAssembleInput → byte-pinned register — be exercised
// end to end. The moved helpers behave exactly as before except where a
// DOC 168 comment says otherwise.
//
// DOC 168 behaviour changes, all driven by the CEO options-not-free-text rule
// (doc 168 §1): the structured `recipient_categories`, `transfers_third_country`,
// `transfer_destination` (country list + international-organisation marker),
// `transfer_international_org`, `transfer_mechanism` codes and
// `processing_regularity` answers are read through ONE resolver each, and a
// recorded "no transfer" is carried as a fact (`transfersDeclaredNone`) rather
// than as an empty cell.

import type { RopaActivityInput, RopaAssembleInput } from "./ropa-skeleton-assemble.ts";
import { countryProse, displayAnswer, INTERNATIONAL_ORGANISATION_VALUE, labelsFor } from "./answer-labels.ts";

export type AnswerBag = Record<string, unknown>;

/** The slice of the generator's assembled data the mapping reads. */
export interface RopaAnswerData {
  client: any;
  profile: any;
  jurisdictions: string[];
  activities: any[];
  /** activity_id -> { question_key -> answer_value } */
  answersByActivity: Record<string, AnswerBag>;
}

export function answerToString(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((v) => answerToString(v)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (value === "") return "—";
  return String(value);
}

/** answerToString with the em-dash placeholder collapsed to "". */
export function answerText(value: unknown): string {
  const t = answerToString(value);
  return t === "—" ? "" : t;
}

export const LAW_NAMES_SHORT: Record<string, string> = {
  EU_GDPR: "EU GDPR", UK_GDPR: "UK GDPR", CH_FADP: "Swiss FADP",
  US_CCPA: "CCPA/CPRA", US_VA: "VCDPA", US_CO: "CPA", US_CT: "CTDPA", US_TX: "TDPSA",
  BR_LGPD: "LGPD", CA_PIPEDA: "PIPEDA", AU_PRIVACY: "AU Privacy Act",
  SG_PDPA: "SG PDPA", IN_DPDP: "DPDP", JP_APPI: "APPI", KR_PIPA: "PIPA",
};

export function humanize(token: string): string {
  if (!token) return "—";
  return token.replace(/_/g, " ");
}

export function lawLabelShort(j: string): string {
  return LAW_NAMES_SHORT[j] ?? humanize(j);
}

export const LAWFUL_BASIS_LABELS: Record<string, string> = {
  consent: "Consent — Art. 6(1)(a)",
  contract: "Contract — Art. 6(1)(b)",
  legal_obligation: "Legal obligation — Art. 6(1)(c)",
  vital_interests: "Vital interests — Art. 6(1)(d)",
  public_task: "Public task — Art. 6(1)(e)",
  legitimate_interests: "Legitimate interests — Art. 6(1)(f)",
};

export function lawfulBasisLabel(value: unknown): string {
  const v = answerToString(value);
  return LAWFUL_BASIS_LABELS[v] ?? v;
}

// Art. 4(2) GDPR operations taxonomy — value → register label. Mirrors
// PROCESSING_OPERATION_OPTIONS in src/data/ropa-questions/index.ts.
export const PROCESSING_OPERATION_LABELS: Record<string, string> = {
  collection: "Collection",
  recording: "Recording",
  organisation: "Organisation",
  structuring: "Structuring",
  storage: "Storage",
  adaptation: "Adaptation or alteration",
  retrieval: "Retrieval",
  consultation: "Consultation",
  use: "Use",
  disclosure_transmission: "Disclosure by transmission",
  dissemination: "Dissemination",
  combination: "Combination",
  restriction: "Restriction",
  erasure: "Erasure or destruction",
};

export function processingOperationsLabel(value: unknown): string {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  if (list.length === 0) return "—";
  return list
    .map((v) => PROCESSING_OPERATION_LABELS[String(v)] ?? answerToString(v))
    .join(", ");
}

/**
 * QA round two (ROPA-A-01, Medium, 2026-09-06) — the retention question offers
 * a "Custom" option that had no input behind it, on all three customers, so the
 * register would print the bare token "custom" as its Art. 30(1)(f) time limit.
 * The follow-up question (retention_period_custom) now supplies the period.
 * Where "Custom" is selected this returns that text; where it is selected and
 * still blank, it says so rather than printing a token the reader cannot
 * interpret. Every other selection is byte-unchanged.
 */
export function retentionDisplay(ans: AnswerBag): string {
  const selected = answerToString(ans.retention_period);
  if (selected.trim().toLowerCase() !== "custom") return selected;
  const custom = answerText(ans.retention_period_custom).trim();
  return custom || "A custom retention period was selected but has not been stated.";
}

// Optional retention-by-category breakdown: renders only when the
// "retention varies by category" follow-up has actually been answered.
export function retentionByCategory(ans: AnswerBag): string | null {
  const varies = answerToString(ans.retention_varies_by_category).toLowerCase();
  if (varies !== "yes") return null;
  const detail = answerToString(ans.retention_by_category);
  return detail === "—" ? null : detail;
}

function proseJoin(xs: readonly string[]): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/** Keys whose answers are option codes with a reader label (answer-labels.ts). */
const CODED_KEYS = new Set([
  "special_category_basis",
  "recipient_categories",
  "processing_regularity",
  "transfer_mechanism",
]);

/**
 * DOC 168 — THE per-answer display rule shared by the per-activity tables and
 * the "Company-Provided Processing Record" appendix in all three formats:
 * lawful basis and Art. 4(2) operations keep their existing label maps, coded
 * answers render as reader labels, the transfer-destination marker renders as
 * prose, and everything else renders as recorded. "—" when empty.
 */
export function answerDisplayFor(key: string, value: unknown): string {
  if (key === "lawful_basis") return lawfulBasisLabel(value);
  if (key === "processing_operations") return processingOperationsLabel(value);
  if (key === "transfer_destination") {
    return proseJoin(
      labelsFor(key, value).map((v) =>
        v === INTERNATIONAL_ORGANISATION_VALUE ? "an international organisation (named separately)" : countryProse(v)
      ),
    ) || "—";
  }
  if (CODED_KEYS.has(key)) return displayAnswer(key, value) || "—";
  return answerToString(value);
}

/**
 * DOC 168 — recipients as ONE fact: the structured recipient categories as
 * prose, with any named processor or platform in parentheses; a legacy
 * record with only the free-text answer renders that answer unchanged.
 */
export function recipientsDisplay(ans: AnswerBag): string {
  const categories = displayAnswer("recipient_categories", ans.recipient_categories);
  const named = answerText(ans.processor_platform ?? ans.recipients);
  if (!categories) return named;
  return named ? `${categories} (${named})` : categories;
}

export interface ResolvedTransfer {
  /** The Company recorded that no transfer to a third country or international organisation takes place. */
  declaredNone: boolean;
  /** Destination prose ("Canada", "Japan and the United States", "X (international organisation)"); "" when unrecorded. */
  destination: string;
  /** Mechanism as a reader label; "" when unrecorded. */
  mechanism: string;
  /** True when the recorded mechanism answer is the "none" option. */
  mechanismUndocumented: boolean;
  /** Explicit transfer basis text, if the record carries one. */
  basis: string;
}

const LEGACY_NO_TRANSFER_RE = /no\s+third[- ]country\s+transfer/i;

/**
 * DOC 168 — THE transfer resolver. Every surface that renders the transfer
 * facts (register cell (e), the per-activity table row, the cross-border
 * transfer table in all three formats) reads this, never the raw keys.
 */
export function resolveTransfer(ans: AnswerBag): ResolvedTransfer {
  const gate = answerText(ans.transfers_third_country).toLowerCase();
  const raw = ans.transfer_destination ?? ans.transfer_country ?? ans.cross_border_destination;
  const intlName = answerText(ans.transfer_international_org);
  const parts = labelsFor("transfer_destination", raw).map((v) =>
    v === INTERNATIONAL_ORGANISATION_VALUE
      ? (intlName ? `${intlName} (international organisation)` : "an international organisation (not named)")
      : countryProse(v)
  );
  let destination = proseJoin(parts);
  let declaredNone = gate === "no";
  // Legacy free-text negatives ("None", "No third-country transfer") are a
  // recorded "no", not an unrecorded destination.
  if (!declaredNone && destination && (LEGACY_NO_TRANSFER_RE.test(destination) || /^none$/i.test(destination.trim()))) {
    declaredNone = true;
  }
  if (declaredNone) destination = "";
  const mechRaw = ans.transfer_mechanism ?? ans.transfer_safeguard;
  const mechanismUndocumented = answerText(mechRaw).trim().toLowerCase() === "none";
  const mechanism = declaredNone ? "" : displayAnswer("transfer_mechanism", mechRaw);
  const basis = declaredNone ? "" : answerText(ans.transfer_basis ?? ans.transfer_lawful_basis);
  return { declaredNone, destination, mechanism, mechanismUndocumented, basis };
}

export interface CrossBorderTransfer {
  activity: string;
  data: string;
  destination: string;
  mechanism: string;
  basis: string;
}

export function collectTransfers(d: RopaAnswerData): CrossBorderTransfer[] {
  const out: CrossBorderTransfer[] = [];
  for (const a of d.activities) {
    const ans = d.answersByActivity[a.id] ?? {};
    const t = resolveTransfer(ans);
    if (t.declaredNone || !t.destination) continue;
    const mechanismStr = t.mechanism || "Not specified";
    const basisStr = t.basis
      ? t.basis
      : (t.mechanism && !t.mechanismUndocumented
          ? t.mechanism
          : "Not recorded — complete before relying on this register");
    const data = ans["data_categories"] ?? ans["personal_data_types"] ?? "—";
    out.push({
      activity: a.display_name,
      data: answerToString(data),
      destination: t.destination,
      mechanism: mechanismStr,
      basis: basisStr,
    });
  }
  return out;
}

export function buildRopaAssembleInput(d: RopaAnswerData): RopaAssembleInput {
  const p = d.profile ?? {};
  const activities: RopaActivityInput[] = (d.activities ?? []).map((a: any) => {
    const ans = d.answersByActivity[a.id] ?? {};
    const str = answerText;
    const related = Array.isArray(ans.related_assessments)
      ? (ans.related_assessments as unknown[]).map((v) => answerToString(v)).filter((v) => v && v !== "—")
      : str(ans.related_assessments)
        ? [str(ans.related_assessments)]
        : [];
    const transfer = resolveTransfer(ans);
    return {
      id: String(a.id),
      name: String(a.display_name ?? ""),
      // DOC 166 (2026-09-04) — lets the completeness composer know which
      // per-template questions this activity's own form could ever surface
      // (see NOTICES_DISPLAYED_TEMPLATES / INCIDENT_LOG_TEMPLATES in
      // ropa-skeleton-assemble.ts). Not used for any legal determination.
      templateKey: String(a.template_key ?? ""),
      owner: str(ans.activity_owner),
      purpose: str(ans.purpose),
      // S-P1 (doc 80, 2026-08-27) — per-activity role. An explicit answer
      // wins; legacy records fall back to the org-level flags (processor
      // only when the profile is processor-and-not-controller, matching the
      // pre-S-P1 footer logic exactly).
      activityRole: str(ans.activity_role) ||
        (p?.is_processor === true && p?.is_controller !== true ? "processor" : "controller"),
      actingFor: str(ans.acting_for_controller),
      lawfulBasis: ans.lawful_basis ? lawfulBasisLabel(ans.lawful_basis) : "",
      dataSubjects: str(ans.data_subjects),
      dataCategories: str(ans.data_categories ?? ans.personal_data_types),
      collectionSources: str(ans.collection_sources),
      processingOperations: ans.processing_operations
        ? processingOperationsLabel(ans.processing_operations)
        : "",
      // DOC 168 — structured recipient categories (+ named processor).
      recipients: recipientsDisplay(ans),
      // ROPA-A-01 — resolves the "Custom" selection to the period actually given.
      retention: retentionDisplay(ans),
      retentionByCategory: retentionByCategory(ans),
      security: str(ans.security_measures),
      // INTAKE-2 rule: the two-part access-controls question is ONE recorded
      // answer and renders as one fact, never as two.
      accessControls: str(ans.access_controls),
      // DOC 168 — one resolver for the transfer facts.
      transferDestination: transfer.destination,
      transferMechanism: transfer.mechanism,
      transferBasis: transfer.basis,
      transfersDeclaredNone: transfer.declaredNone,
      transferMechanismUndocumented: transfer.mechanismUndocumented,
      rightsHandling: str(p?.rights_handling_process),
      rightsOverride: str(ans.rights_handling_override),
      relatedAssessments: related,
      noticesDisplayed: str(ans.notices_displayed),
      incidentLog: str(ans.incident_log),
    };
  });

  return {
    organisationName: String(d.client?.name ?? ""),
    legalEntityType: String(p?.legal_entity_type ?? ""),
    incorporationJurisdiction: String(p?.incorporation_jurisdiction ?? ""),
    registrationNumber: String(p?.registration_number ?? ""),
    registeredAddress: String(p?.registered_address ?? ""),
    isController: p?.is_controller === true,
    isProcessor: p?.is_processor === true,
    dpoName: String(p?.dpo_name ?? ""),
    dpoEmail: String(p?.dpo_email ?? ""),
    dpoPhone: String(p?.dpo_phone ?? ""),
    euRepName: String(p?.eu_rep_name ?? ""),
    euRepEmail: String(p?.eu_rep_email ?? ""),
    ukRepName: String(p?.uk_rep_name ?? ""),
    ukRepEmail: String(p?.uk_rep_email ?? ""),
    homeBase: String(p?.home_base ?? ""),
    employeeBand: String(p?.employee_band ?? ""),
    jurisdictionCodes: d.jurisdictions,
    jurisdictionLabels: d.jurisdictions.map((j) => lawLabelShort(j)),
    activities,
  };
}
