// ITEM SO-10 WIRE-IN — RoPA: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// This module assembles the register the CUSTOMER actually receives. It is the
// ONE assembly point for this product: `generate-ropa-document` calls it once
// per generation and renders the SAME assembled object into the PDF (HTML),
// the DOCX and the XLSX, so the three formats can never drift apart.
//
// DETERMINISTIC. There is no model call anywhere in this file. Every
// [DETERMINATION LEAD], [GENERATED] and [CONDITIONAL] block is composed from
// the persisted RoPA intake (`ropa_client_profiles`, `ropa_sessions`,
// `ropa_processing_activities`, `ropa_answers`, `ropa_jurisdiction_selections`)
// and every {slot} is filled per the SO-10 slot map. Typed inputs are never
// mutated.
//
// FLEET EXEMPTION: no gate machinery, no CSC, no coverage, no refinement.
//
// ATTRIBUTION RULE: every factual clause traces to an intake answer. Where an
// answer is absent the register says so honestly; it never invents a fact and
// never stretches a region answer into a country.
//
// PROTECTION: the fixed prose reaches the renderers only through
// `renderFixed`/`renderSkeletonDocument`; nothing in this module rewrites a
// literal span, and `verifySkeletonConformance` re-checks every literal
// against the assembled document before it is persisted.

import {
  ART30_SUBITEMS,
  ROPA_ACTIVITY_SENTENCE_TEMPLATE,
  ROPA_SKELETON_CONTENT_HASH,
  ROPA_SKELETON_PROVENANCE,
  ROPA_SKELETON_SECTIONS,
  ROPA_SKELETON_SUBTITLE,
  ROPA_SKELETON_TITLE,
  ROPA_SKELETON_VERSION,
  ROPA_V3_BANNED_REGISTER,
} from "./ropa.spine.ts";
import {
  renderFixed,
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type ConformanceFinding,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../../_shared/prose/skeleton-render.ts";
// DOC 178 (2026-09-04) — Syllabus & Record (doc 151); RoPA is the ninth and
// final product migrated onto the fleet presentation system.
import { dispositionTone, type SyllabusProjection } from "../../_shared/prose/syllabus.ts";

/** SO-10 pipeline stamp. Survives serialization on the persisted document. */
export const ROPA_PIPELINE_STAMP = "ropa-pipeline@item-so10-2026-08-10";
export const ROPA_SKELETON_ASSEMBLER_STAMP =
  "ropa-skeleton-assembler@so10-wire-in-2026-08-10";

// ── Reader labels ───────────────────────────────────────────────────────────

/**
 * `home_base` is a REGION enum captured at the "Home base" step of the RoPA
 * setup wizard, not a country. It renders as a region-level reader label; the
 * register never invents a specific country the company did not give.
 */
export const ROPA_HOME_BASE_LABELS: Record<string, string> = {
  EU_EEA: "the EU / EEA",
  UK: "the United Kingdom",
  US: "the United States",
  BR: "Brazil",
  APAC: "the Asia-Pacific region",
  OTHER: "a region it has recorded only as \u201Cother\u201D",
};

// DOC 166 (2026-09-04) — this map's keys never matched what the setup wizard
// (RopaSetup.tsx ENTITY_TYPES) actually writes to `legal_entity_type`: the
// form stores the option's own display text ("Limited company", "LLC",
// "Sole trader", …), not a snake_case code. Every real record missed this
// lookup and fell through to the old fallback
// `s(input.legalEntityType).replace(/_/g, " ")`, which for these values is a
// no-op — so the byte-pinned sentence "is a {legal_entity_type} incorporated
// in …" rendered the option text's original capitalisation verbatim ("is a
// Limited company incorporated in …"). Keyed to the form's real vocabulary
// and phrased for the fixed lead-in "is a {slot}" (never "is an {slot}" —
// the article is part of the protected leaf and cannot be changed per
// value), so "LLC" is spelled out rather than left as a bare acronym after
// "a". `other: "Other"` is included since the form's literal value is
// "Other"; the OLD fallback fires unchanged for any value this map still
// misses (e.g. UNRECORDED_ENTITY_TYPE, or a future option added to the form
// before this map is updated to match).
const LEGAL_ENTITY_LABELS: Record<string, string> = {
  "Limited company": "limited company",
  "LLC": "limited liability company (LLC)",
  "Partnership": "partnership",
  "Sole trader": "sole trader",
  "Charity": "registered charity",
  "Public body": "public body",
  "Other": "legal entity of another form",
};

// DOC 166 (2026-09-04) — this map's keys never matched the DB-constrained
// vocabulary RopaSetup.tsx actually writes (`employee_band CHECK (... IN
// ('<50','50-249','250-999','1000+'))`, migration
// 20260501221552_c634bf83-0266-4fd1-af41-dcf75fc6d499.sql): "1-9" and
// "10-49" have never been a real value, and "<50" — the band most small
// businesses select — had NO entry at all, so it fell through to the old
// fallback `s(input.employeeBand)` and rendered the literal comparison
// operator "<50" inside the flowing sentence ("... with a workforce of
// <50."). Keyed to the real four-band vocabulary; the fallback stays for
// any value this map still misses.
const EMPLOYEE_BAND_LABELS: Record<string, string> = {
  "<50": "fewer than fifty people",
  "50-249": "between fifty and two hundred and forty-nine people",
  "250-999": "between two hundred and fifty and nine hundred and ninety-nine people",
  "1000+": "one thousand people or more",
};

const UNRECORDED_ENTITY_TYPE = "legal entity whose form it has not recorded";
const UNRECORDED_JURISDICTION = "a jurisdiction it has not recorded";
const UNRECORDED_ADDRESS = "an address it has not recorded";
const UNRECORDED_BAND = "a size it has not recorded";
// DOC 141 (2026-09-02) — UNRECORDED_ANSWER ("a matter it has not recorded")
// retired: its only consumer was the access-controls slot, whose fixed
// lead-in ("access is controlled as the company describes:") presupposed a
// recorded answer, rendering the self-contradictory "...as the company
// describes: a matter it has not recorded". That seam is now the composed
// conditional {ACCESS_CLAUSE} (see buildActivitySlots).

// ── Input contract ──────────────────────────────────────────────────────────

export interface RopaActivityInput {
  readonly id: string;
  readonly name: string;
  /**
   * DOC 166 (2026-09-04) — the activity's template key (e.g. "ops_facilities",
   * "tech_security"), or "" for a custom activity. Used ONLY to know which
   * completeness-gap sentences are honest to compose: some intake questions
   * (notices_displayed, incident_log) are surfaced by only a subset of
   * templates, per ASKABLE_ONLY_BY in this module — mirrors
   * src/data/ropa-questions/index.ts, which this edge function cannot import
   * (browser module, different runtime). Never used for any legal
   * determination, only to avoid inviting the customer to record an answer
   * the product never lets them give.
   */
  readonly templateKey?: string;
  readonly owner: string;
  readonly purpose: string;
  // S-P1 (doc 80, 2026-08-27) — per-activity role: "controller" | "processor"
  // (resolved by the caller; legacy records default from the org profile).
  readonly activityRole?: string;
  /** Art. 30(2)(a) — the controller a processor activity acts for. */
  readonly actingFor?: string;
  readonly lawfulBasis: string;
  readonly dataSubjects: string;
  readonly dataCategories: string;
  readonly collectionSources: string;
  readonly processingOperations: string;
  readonly recipients: string;
  readonly retention: string;
  readonly retentionByCategory: string | null;
  readonly security: string;
  /** INTAKE-2 rule: the two-part access-controls question is ONE recorded answer. */
  readonly accessControls: string;
  readonly transferDestination: string;
  readonly transferMechanism: string;
  readonly transferBasis: string;
  /** DOC 168 — the Company recorded that NO transfer to a third country or
   *  international organisation takes place (a fact, distinct from an
   *  unrecorded destination). */
  readonly transfersDeclaredNone?: boolean;
  /** DOC 168 — the Company chose the "none" mechanism option: a transfer it
   *  records with no documented mechanism (its own fact, not a gap). */
  readonly transferMechanismUndocumented?: boolean;
  readonly rightsHandling: string;
  readonly rightsOverride: string;
  /** References to the company's OWN completed assessments (LIA / DPIA). */
  readonly relatedAssessments: readonly string[];
  readonly noticesDisplayed: string;
  readonly incidentLog: string;
}

export interface RopaAssembleInput {
  readonly organisationName: string;
  readonly legalEntityType: string;
  readonly incorporationJurisdiction: string;
  readonly registrationNumber: string;
  readonly registeredAddress: string;
  readonly isController: boolean;
  readonly isProcessor: boolean;
  readonly dpoName: string;
  readonly dpoEmail: string;
  readonly dpoPhone: string;
  readonly euRepName: string;
  readonly euRepEmail: string;
  readonly ukRepName: string;
  readonly ukRepEmail: string;
  /** Region enum from the setup wizard ("EU_EEA" | "UK" | "US" | "BR" | "APAC" | "OTHER"). */
  readonly homeBase: string;
  readonly employeeBand: string;
  readonly jurisdictionCodes: readonly string[];
  readonly jurisdictionLabels: readonly string[];
  readonly activities: readonly RopaActivityInput[];
}

// ── Output contract ─────────────────────────────────────────────────────────

export interface Art30Cell {
  readonly key: string;
  readonly pinpoint: string;
  readonly label: string;
  readonly value: string;
  readonly recorded: boolean;
}

export interface RopaActivityRecord {
  readonly activity_id: string;
  readonly activity_name: string;
  /** The activity rendered through the byte-pinned repeating-record prose. */
  readonly sentence: string;
  /** One row of the Art. 30(1)(a)-(g) register table. */
  readonly art30: readonly Art30Cell[];
  readonly missing: readonly string[];
}

export interface RopaCompleteness {
  readonly complete: boolean;
  readonly activities_total: number;
  readonly activities_incomplete: number;
  readonly missing_by_activity: ReadonlyArray<{ activity: string; missing: readonly string[] }>;
}

export interface RopaRegisterDocument {
  readonly _typed: "ropa-register-document@so10";
  readonly stamp: string;
  readonly assembler: string;
  readonly spine_version: string;
  readonly skeleton_hash: string;
  readonly provenance: string;
  readonly document: RenderedSkeletonDocument;
  readonly activity_records: readonly RopaActivityRecord[];
  readonly table_of_authorities: string;
  readonly citation_ledger: readonly string[];
  readonly completeness: RopaCompleteness;
  readonly conformance: { readonly ok: boolean; readonly findings: readonly ConformanceFinding[] };
  readonly register_findings: readonly string[];
  readonly text: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

/** An intake placeholder ("—", "", "n/a") is NOT a recorded answer. */
export function recorded(v: unknown): boolean {
  const t = s(v).toLowerCase();
  return t.length > 0 && t !== "\u2014" && t !== "-" && t !== "n/a" && t !== "none recorded";
}

function asProse(items: readonly string[]): string {
  const xs = items.map(s).filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

function orUnrecorded(v: unknown, fallback: string): string {
  return recorded(v) ? s(v) : fallback;
}

// ── Slot values (SO-10 slot map) ────────────────────────────────────────────

export function buildSlotValues(input: RopaAssembleInput): SlotValues {
  const roles = [input.isController ? "a controller" : "", input.isProcessor ? "a processor" : ""]
    .filter(Boolean);

  const regClause = recorded(input.registrationNumber)
    ? `, registration ${s(input.registrationNumber)}`
    : "";

  const dpoBlock = recorded(input.dpoName)
    ? noStop(
        `Its data protection officer is ${s(input.dpoName)}` +
          (recorded(input.dpoEmail) || recorded(input.dpoPhone)
            ? `, reachable at ${[s(input.dpoEmail), s(input.dpoPhone)].filter(Boolean).join(" / ")}`
            : ""),
      )
    : "The company has indicated that it has not designated a data protection officer";

  // Article 27 representative. Suppressed where the intake echoes the
  // controller's own organisation name, which indicates establishment rather
  // than a designated representative.
  const orgKey = s(input.organisationName).toLowerCase();
  const euRep = s(input.euRepName);
  const ukRep = s(input.ukRepName);
  const repParts: string[] = [];
  if (euRep && euRep.toLowerCase() !== orgKey) {
    repParts.push(
      `${euRep} as its representative in the Union under Art. 27 GDPR` +
        (recorded(input.euRepEmail) ? ` (${s(input.euRepEmail)})` : ""),
    );
  }
  if (ukRep && ukRep.toLowerCase() !== orgKey) {
    repParts.push(
      `${ukRep} as its representative in the United Kingdom under Art. 27 UK GDPR` +
        (recorded(input.ukRepEmail) ? ` (${s(input.ukRepEmail)})` : ""),
    );
  }
  const euRepSentence = repParts.length
    ? `The company has indicated that it has designated ${asProse(repParts)}`
    : "";

  const homeBase = recorded(input.homeBase)
    ? (ROPA_HOME_BASE_LABELS[s(input.homeBase)] ?? null)
    : null;

  return {
    organisation_name: s(input.organisationName) || "the company",
    legal_entity_type: recorded(input.legalEntityType)
      ? (LEGAL_ENTITY_LABELS[s(input.legalEntityType)] ?? s(input.legalEntityType).replace(/_/g, " "))
      : UNRECORDED_ENTITY_TYPE,
    incorporation_jurisdiction: orUnrecorded(input.incorporationJurisdiction, UNRECORDED_JURISDICTION),
    REG_CLAUSE: regClause,
    registered_address: orUnrecorded(input.registeredAddress, UNRECORDED_ADDRESS),
    // No role recorded at all: the sentence drops rather than asserting one.
    roles: roles.length ? asProse(roles) : null,
    DPO_BLOCK: dpoBlock,
    // Absent representative: the sentence drops entirely, never announced.
    EU_REP_SENTENCE: euRepSentence || null,
    // Absent home base: the whole operating sentence drops and the honest
    // alternate is composed as the conditional block.
    home_base: homeBase,
    // DOC 133 (all-products batch review, 2026-09-01) — every other slot in
    // this block degrades to null/an honest alternate when unrecorded; this
    // one had no such branch, so a session whose intake never captured
    // jurisdictions could never render "not established on the record" —
    // the composed sentence below could only ever assert a (possibly
    // stale — see the ropa_jurisdiction_selections client_id-vs-session_id
    // chase item) list. Flagged separately: the deeper fix is scoping that
    // table's read to the session/intake, not the client.
    jurisdictions: input.jurisdictionLabels.length ? asProse([...input.jurisdictionLabels]) : null,
    employee_band: recorded(input.employeeBand)
      ? (EMPLOYEE_BAND_LABELS[s(input.employeeBand)] ?? s(input.employeeBand))
      : UNRECORDED_BAND,
  };
}

// ── The repeating record (Article 30(1)(a)-(g)) ─────────────────────────────

function retentionPhrase(a: RopaActivityInput): string {
  if (recorded(a.retentionByCategory)) {
    return `for the periods it has recorded by data category: ${noStop(s(a.retentionByCategory))}`;
  }
  if (recorded(a.retention)) return `for ${noStop(s(a.retention))}`;
  return "for a period it has not recorded";
}

function transferClause(a: RopaActivityInput): string {
  // DOC 168 — a recorded "no transfer" is stated as the Company's own fact.
  if (a.transfersDeclaredNone === true) {
    return "The company has indicated that no personal data are transferred to a third country or an international organisation";
  }
  const dest = s(a.transferDestination);
  if (!recorded(dest) || /^no\b|^none\b|no third[- ]country/i.test(dest)) return "";
  // DOC 168 — the "none" mechanism option is the Company's own statement,
  // distinct from a mechanism it simply did not record.
  if (a.transferMechanismUndocumented === true) {
    return `The company has indicated that personal data are transferred to ${noStop(dest)} and records no transfer mechanism for that transfer`;
  }
  const mech = recorded(a.transferMechanism) ? s(a.transferMechanism) : "";
  const basis = recorded(a.transferBasis) ? s(a.transferBasis) : "";
  const named = mech || basis;
  return named
    ? `The company has indicated that personal data are transferred to ${noStop(dest)} under ${noStop(named)}`
    : `The company has indicated that personal data are transferred to ${noStop(dest)}, without a transfer mechanism recorded`;
}

const s2 = (v: unknown): string => (typeof v === "string" ? v : String(v ?? ""));

// DOC 168 (2026-09-04, CEO wording) — the rights-handling sentence composes
// WHOLE (the TRANSFER_CLAUSE pattern). The old fixed lead-in "Rights requests
// are handled {answer}" read the customer's free-text process straight after
// a verb, so an answer written as a sentence rendered "handled Requests
// handled by ...". Four honest branches; the activity-specific override
// folds into the same sentence.
function rightsSentence(a: RopaActivityInput): string {
  const base = recorded(a.rightsHandling) ? noStop(s(a.rightsHandling)) : "";
  const over = recorded(a.rightsOverride) ? noStop(s(a.rightsOverride)) : "";
  if (base && over) {
    return `The company has indicated that rights requests are handled as follows: ${base}, subject to the activity-specific process the company has described: ${over}`;
  }
  if (base) return `The company has indicated that rights requests are handled as follows: ${base}`;
  if (over) {
    return `The company has not recorded a general process for handling rights requests; for this activity it has indicated that they are handled as follows: ${over}`;
  }
  return "How rights requests are handled is not recorded";
}

export function buildActivitySlots(a: RopaActivityInput): SlotValues {
  return {
    // DOC 141 (2026-09-02) — under the fixed lead-in "The activity {slot}",
    // the old fallback "an activity it has not named" doubled the noun
    // ("The activity an activity it has not named"). The relative clause
    // composes: "The activity it has not named, owned by ...".
    activity_name: s(a.name) || "it has not named",
    activity_owner: orUnrecorded(a.owner, "an owner it has not named"),
    purpose: orUnrecorded(a.purpose, "a purpose it has not recorded"),
    // S-P1 — a processor states no basis of its own (Art. 30(2)); the
    // ratified template's basis slot carries the documented-instructions
    // footing, naming the controller where recorded. Value-plane only.
    lawful_basis: a.activityRole === "processor"
      ? (recorded(a.actingFor)
        ? `the documented instructions of ${noStop(s2(a.actingFor))} (Article 30(2))`
        : "the documented instructions of the controller it acts for (Article 30(2))")
      : orUnrecorded(a.lawfulBasis, "a basis it has not recorded"),
    data_subjects: orUnrecorded(a.dataSubjects, "categories of data subjects it has not recorded"),
    // DOC 141 (2026-09-02) — under the fixed lead-in "and the categories
    // {slot}", the old fallback "categories of personal data it has not
    // recorded" doubled "categories". The trimmed fallback composes: "and the
    // categories of personal data it has not recorded".
    data_categories: orUnrecorded(a.dataCategories, "of personal data it has not recorded"),
    collection_sources: orUnrecorded(a.collectionSources, "sources it has not recorded"),
    // DOC 141 (2026-09-02) — conditional clause (the TRANSFER_CLAUSE
    // pattern): the old fixed lead-in "The operations performed:" presupposed
    // a recorded answer, rendering "The operations performed: operations it
    // has not recorded". The clause now composes whole in each branch.
    OPERATIONS_SENTENCE: recorded(a.processingOperations)
      ? `The operations performed: ${noStop(s(a.processingOperations))}`
      : "The operations performed are not recorded",
    processor_platform: orUnrecorded(a.recipients, "recipients it has not recorded"),
    RETENTION_PHRASE: retentionPhrase(a),
    security_measures: orUnrecorded(a.security, "measures it has not recorded"),
    // DOC 141 (2026-09-02) — conditional clause: the old fixed lead-in
    // "; access is controlled as the company describes:" presupposed a
    // recorded answer, rendering "...as the company describes: a matter it
    // has not recorded". The clause now composes whole in each branch.
    ACCESS_CLAUSE: recorded(a.accessControls)
      ? `; access is controlled as the company describes: ${noStop(s(a.accessControls))}`
      : "; how access is controlled is not recorded",
    TRANSFER_CLAUSE: transferClause(a) || null,
    RIGHTS_SENTENCE: rightsSentence(a),
  };
}

const REQUIRED_ART30: ReadonlyArray<{ key: string; label: string; get: (a: RopaActivityInput) => unknown }> = [
  { key: "b", label: "the purpose of the processing", get: (a) => a.purpose },
  // S-P1 — role-aware: a processor activity is complete WITHOUT an own
  // lawful basis (Art. 30(2) does not require one) but requires the
  // controller it acts for (Art. 30(2)(a)).
  { key: "b", label: "the lawful basis", get: (a) => a.activityRole === "processor" ? "n/a-processor" : a.lawfulBasis },
  { key: "a", label: "the controller the activity is performed for", get: (a) => a.activityRole === "processor" ? a.actingFor : "n/a-controller" },
  { key: "c", label: "the categories of data subjects", get: (a) => a.dataSubjects },
  { key: "c", label: "the categories of personal data", get: (a) => a.dataCategories },
  { key: "d", label: "the categories of recipients", get: (a) => a.recipients },
  { key: "f", label: "the retention period", get: (a) => a.retention },
  { key: "g", label: "the security measures", get: (a) => a.security },
];

function contactCell(input: RopaAssembleInput, a: RopaActivityInput): string {
  const parts = [
    s(input.organisationName),
    recorded(input.registeredAddress) ? s(input.registeredAddress) : "",
    recorded(input.dpoName) ? `DPO: ${s(input.dpoName)}` : "No DPO designated",
    recorded(input.euRepName) && s(input.euRepName).toLowerCase() !== s(input.organisationName).toLowerCase()
      ? `EU representative: ${s(input.euRepName)}`
      : "",
    recorded(a.owner) ? `Activity owner: ${s(a.owner)}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

export function buildActivityRecord(
  input: RopaAssembleInput,
  a: RopaActivityInput,
): RopaActivityRecord {
  const values = buildActivitySlots(a);
  const sentence = renderFixed(ROPA_ACTIVITY_SENTENCE_TEMPLATE, values);

  // DOC 168 \u2014 three honest states for Art. 30(1)(e): a recorded "no
  // transfer" (the Company's fact), a recorded destination (with the
  // mechanism when recorded), or nothing recorded either way.
  const transferValue = a.transfersDeclaredNone === true
    ? "No transfer to a third country or international organisation (recorded by the Company)"
    : recorded(a.transferDestination)
      ? [s(a.transferDestination), recorded(a.transferMechanism) ? s(a.transferMechanism) : ""]
          .filter(Boolean)
          .join(" \u2014 ")
      : "No third-country transfer recorded";

  const cellFor: Record<string, { value: string; recorded: boolean }> = {
    a: { value: contactCell(input, a), recorded: recorded(input.organisationName) },
    b: {
      value: [s(a.purpose), recorded(a.lawfulBasis) ? `Lawful basis: ${s(a.lawfulBasis)}` : ""]
        .filter(Boolean)
        .join(" \u2014 ") || "Not recorded",
      recorded: recorded(a.purpose) && recorded(a.lawfulBasis),
    },
    c: {
      value: [recorded(a.dataSubjects) ? s(a.dataSubjects) : "", recorded(a.dataCategories) ? s(a.dataCategories) : ""]
        .filter(Boolean)
        .join(" \u2014 ") || "Not recorded",
      recorded: recorded(a.dataSubjects) && recorded(a.dataCategories),
    },
    d: { value: recorded(a.recipients) ? s(a.recipients) : "Not recorded", recorded: recorded(a.recipients) },
    e: { value: transferValue, recorded: true },
    f: {
      value: recorded(a.retentionByCategory)
        ? s(a.retentionByCategory)
        : recorded(a.retention)
          ? s(a.retention)
          : "Not recorded",
      recorded: recorded(a.retention) || recorded(a.retentionByCategory),
    },
    g: {
      value: [recorded(a.security) ? s(a.security) : "", recorded(a.accessControls) ? `Access controls: ${s(a.accessControls)}` : ""]
        .filter(Boolean)
        .join(" \u2014 ") || "Not recorded",
      recorded: recorded(a.security),
    },
  };

  const art30: Art30Cell[] = ART30_SUBITEMS.map((sub) => ({
    key: sub.key,
    pinpoint: sub.pinpoint,
    label: sub.label,
    value: cellFor[sub.key].value,
    recorded: cellFor[sub.key].recorded,
  }));

  const missing = REQUIRED_ART30.filter((r) => !recorded(r.get(a))).map((r) => r.label);

  return {
    activity_id: a.id,
    activity_name: s(a.name) || "Unnamed activity",
    sentence,
    art30,
    missing,
  };
}

// ── Completeness (the [DETERMINATION LEAD] is computed FROM this) ───────────

export function computeCompleteness(records: readonly RopaActivityRecord[]): RopaCompleteness {
  const incomplete = records.filter((r) => r.missing.length > 0);
  return {
    complete: records.length > 0 && incomplete.length === 0,
    activities_total: records.length,
    activities_incomplete: incomplete.length,
    missing_by_activity: incomplete.map((r) => ({ activity: r.activity_name, missing: r.missing })),
  };
}

function composeCompletenessLead(c: RopaCompleteness): string {
  if (c.activities_total === 0) {
    return "The register is not complete on its face against Article 30: no processing activity has yet been recorded, so there is nothing for the register to describe.";
  }
  if (c.complete) {
    return `The register is complete on its face against Article 30 for all ${c.activities_total} recorded processing ${c.activities_total === 1 ? "activity" : "activities"}: each carries a purpose and lawful basis, the categories of data subjects and personal data, its recipients, a retention period and its security measures.`;
  }
  const named = c.missing_by_activity
    .slice(0, 3)
    .map((m) => `${m.activity} (${asProse(m.missing)})`);
  const tail = c.missing_by_activity.length > 3
    ? `, and ${c.missing_by_activity.length - 3} further ${c.missing_by_activity.length - 3 === 1 ? "activity" : "activities"} with entries outstanding`
    : "";
  return `The register is not complete on its face against Article 30: ${c.activities_incomplete} of ${c.activities_total} recorded ${c.activities_total === 1 ? "activity is" : "activities are"} missing required entries \u2014 ${named.join("; ")}${tail}.`;
}

// DOC 166 (2026-09-04) — the ONLY activity templates whose intake surfaces
// each of these questions (src/data/ropa-questions/index.ts: OPS_FACILITIES
// carries `notices_displayed`, TECH_SECURITY carries `incident_log`; no
// other template's extras include either key). This edge function cannot
// import that frontend module (different runtime, browser-only path), so the
// two keys are mirrored here — same pattern as PROCESSING_OPERATION_LABELS
// in generate-ropa-document/index.ts. Keep in sync with that file.
const NOTICES_DISPLAYED_TEMPLATES = new Set(["ops_facilities"]);
const INCIDENT_LOG_TEMPLATES = new Set(["tech_security"]);

function composeCompletenessFindings(
  input: RopaAssembleInput,
  records: readonly RopaActivityRecord[],
  c: RopaCompleteness,
): string {
  const sentences: string[] = [];

  // Positive facts are asserted from whatever is actually recorded,
  // regardless of the owning activity's current template (a legacy record
  // may carry an answer its activity was later re-templated away from). The
  // template allow-list gates ONLY whether the negative "not stated" gap
  // sentence is fair to compose.
  const noticesAskable = input.activities.filter((a) => NOTICES_DISPLAYED_TEMPLATES.has(s(a.templateKey)));
  const notices = input.activities.filter((a) => recorded(a.noticesDisplayed));
  if (notices.length) {
    sentences.push(
      `On notices, the company has indicated ${asProse(notices.map((a) => `${s(a.name)}: ${noStop(s(a.noticesDisplayed))}`))}`,
    );
  } else if (noticesAskable.length) {
    // DOC 135 (Batch 4 A-Team review, 2026-09-01) — customer-facing
    // vocabulary filter: "intake" is an internal term.
    // DOC 166 — only composed when a recorded activity's own template can
    // actually be asked this question; otherwise the invitation to "record"
    // it is one the product cannot fulfil, so the point is omitted rather
    // than asserted as an open gap.
    sentences.push(
      "The information supplied by the Company does not state whether processing notices are displayed; recording that answer for each activity would close the point",
    );
  }

  const logsAskable = input.activities.filter((a) => INCIDENT_LOG_TEMPLATES.has(s(a.templateKey)));
  const logs = input.activities.filter((a) => recorded(a.incidentLog));
  if (logs.length) {
    sentences.push(
      `On the incident log, the company has described ${asProse(logs.map((a) => noStop(s(a.incidentLog))))}`,
    );
  } else if (logsAskable.length) {
    sentences.push(
      "No breach or incident register has been described; naming the register and the person who maintains it would close the point",
    );
  }

  const cited = input.activities.flatMap((a) =>
    a.relatedAssessments.filter(recorded).map((r) => `${s(a.name)}: ${noStop(s(r))}`),
  );
  if (cited.length) {
    sentences.push(
      `The company's own assessments are cited alongside the activities they support \u2014 ${asProse(cited)}`,
    );
  } else {
    sentences.push(
      "No legitimate interests assessment or data protection impact assessment of the company's own is cited against any activity; completing and citing those assessments where the processing calls for them would close the point",
    );
  }

  if (!c.complete && c.missing_by_activity.length) {
    sentences.push(
      `Each outstanding entry named above is filled by returning to the activity in the builder and recording the answer \u2014 ${asProse(c.missing_by_activity.map((m) => `${m.activity} requires ${asProse(m.missing)}`))}`,
    );
  }

  return sentences.map(stop).join(" ");
}

// ── Table of Authorities (deterministic, iff-cited) ─────────────────────────

export function buildCitationLedger(
  input: RopaAssembleInput,
  records: readonly RopaActivityRecord[],
): string[] {
  const ledger = new Set<string>();
  if (records.length) for (const sub of ART30_SUBITEMS) ledger.add(sub.pinpoint);
  const orgKey = s(input.organisationName).toLowerCase();
  if (s(input.euRepName) && s(input.euRepName).toLowerCase() !== orgKey) ledger.add("Art. 27 GDPR");
  if (s(input.ukRepName) && s(input.ukRepName).toLowerCase() !== orgKey) ledger.add("Art. 27 UK GDPR");
  ledger.add("Art. 30 GDPR");
  return [...ledger];
}

/** GDPR pinpoints are Regulations in brief order; everything else is guidance. */
export function renderRopaToa(ledger: readonly string[], body: string): string {
  const cited = [...new Set(ledger.filter((p) => p && body.includes(p)))];
  if (cited.length === 0) return "";
  const regulations = cited.filter((p) => /GDPR/.test(p)).sort();
  const other = cited.filter((p) => !/GDPR/.test(p)).sort();
  const lines: string[] = [];
  if (regulations.length) {
    lines.push("Regulations");
    for (const p of regulations) lines.push(`    ${p}`);
  }
  if (other.length) {
    lines.push("Guidance and Persuasive Authority (persuasive)");
    for (const p of other) lines.push(`    ${p}`);
  }
  return lines.join("\n");
}

// ── Register battery ────────────────────────────────────────────────────────

export function checkRegister(body: string): string[] {
  const lower = body.toLowerCase();
  return ROPA_V3_BANNED_REGISTER.filter((phrase) => lower.includes(phrase)).map(
    (phrase) => `banned register phrase: "${phrase}"`,
  );
}

// ── Assembly ────────────────────────────────────────────────────────────────

// DOC 178 (2026-09-04) — THE DETERMINATION SYLLABUS (Syllabus & Record p.1).
// Every value below is a PROJECTION of a determination this assembler
// already made (doc 127 §28 law): the disposition is a three-bucket read of
// the SAME `completeness` object `composeCompletenessLead()` already reads
// (no activities recorded → no determination; some required entries missing
// → incomplete; otherwise complete — reusing "Complete", already in the
// shared lexicon from Cyber's own record-sufficiency vocabulary); the
// paragraph is `composeCompletenessLead()`'s own text, verbatim — the SAME
// string composed into `completeness_review:0`'s `kind: "lead"` block
// (RoPA's own section name for this block, a fourth hardcoded id alongside
// "executive_summary"/"standing_playbook"); the conditions are
// `completeness.missing_by_activity` verbatim — RoPA's genuine typed
// "what's missing, per activity" surface. RoPA has no lettered appendices,
// so `record_map` is honestly empty, same precedent as LIA/Governance/
// Registration/IR Playbook.
function ropaDispositionLabel(c: RopaCompleteness): string {
  if (c.activities_total === 0) return "No Determination Recorded";
  if (!c.complete) return "Incomplete";
  return "Complete";
}

function buildRopaSyllabus(
  completeness: RopaCompleteness,
  leadText: string,
  entity: string,
): SyllabusProjection {
  const disposition = ropaDispositionLabel(completeness);

  const rows: Array<readonly [string, string]> = [];
  if (completeness.activities_total > 0) {
    rows.push(["Processing activities recorded", String(completeness.activities_total)]);
    rows.push([
      "Complete against Article 30",
      completeness.activities_incomplete > 0
        ? `${completeness.activities_total - completeness.activities_incomplete} of ${completeness.activities_total} activities`
        : `All ${completeness.activities_total} activities`,
    ]);
  }

  const conditions = completeness.missing_by_activity.map((m) => ({
    name: m.activity,
    text: `Missing: ${m.missing.join(", ")}`,
  }));

  return {
    _typed: "syllabus@sr-2026-09-04",
    instrument_line: "RECORD OF PROCESSING ACTIVITIES · Article 30 GDPR",
    prepared_for: entity,
    activity: "Article 30 Processing Register",
    subtitle: "Record of processing activities under Article 30 GDPR",
    disposition_label: "COMPLETENESS",
    disposition,
    disposition_tone: dispositionTone(disposition),
    paragraph: leadText,
    rows,
    conditions_heading: conditions.length ? "MISSING ENTRIES — what would complete the register" : "",
    conditions,
    key_dates: [],
    record_map: [],
    running_head: `RECORD OF PROCESSING ACTIVITIES · ${entity.toUpperCase()}`,
  };
}

export function assembleRopaRegister(input: RopaAssembleInput): RopaRegisterDocument {
  const values = buildSlotValues(input);
  const records = input.activities.map((a) => buildActivityRecord(input, a));
  const completeness = computeCompleteness(records);

  const composed: ComposedBlocks = {};

  // Controller and Accountability — honest alternate when no home base was
  // captured (the byte-pinned operating sentence drops in that branch).
  if (values.home_base === null) {
    // DOC 135 — "intake" replaced with customer-facing phrasing.
    composed["controller_and_accountability:1"] = values.jurisdictions
      ? `It operates across ${values.jurisdictions}, with a workforce of ${values.employee_band}. The information supplied by the Company does not identify a home base for the company, so this register does not state one.`
      : `The information supplied by the Company does not identify a home base or jurisdictions for the company, so this register does not state either. Workforce: ${values.employee_band}.`;
  }

  // ROPA-1 (2026-08-29) — Art. 30(2) scope statement, composed only where a
  // processor role is recorded. The intake captures the processor role as a
  // boolean but not the controllers on whose behalf the company processes,
  // and Art. 30(2)(a) makes each such controller's name and contact details
  // a required column of the processor-format register — so the correct
  // document states the boundary rather than rendering an incomplete
  // Art. 30(2) register or staying silent.
  if (input.isProcessor === true) {
    composed["controller_and_accountability:2"] =
      `The company has indicated that it ${input.isController ? "also acts" : "acts"} as a processor for other organisations. This register is prepared in the controller format of Article 30(1) GDPR; Article 30(2) prescribes a separate register format for a processor's activities carried out on behalf of each controller, including each controller's name and contact details, and this document does not contain that register because the intake does not capture the controllers on whose behalf the company processes.`;
  }

  // Processing Activities — the repeating record, one rendered row per activity.
  composed["processing_activities:0"] = records.length
    ? records.map((r) => r.sentence).join("\n\n")
    : "The company has not yet recorded a processing activity, so this register carries no entries to describe.";

  // Completeness Review.
  composed["completeness_review:0"] = composeCompletenessLead(completeness);
  composed["completeness_review:1"] = composeCompletenessFindings(input, records, completeness);

  const document = renderSkeletonDocument({
    sections: ROPA_SKELETON_SECTIONS,
    title: ROPA_SKELETON_TITLE,
    subtitle: ROPA_SKELETON_SUBTITLE,
    spineVersion: ROPA_SKELETON_VERSION,
    values,
    composed,
  });

  const bodyForToa = [
    skeletonDocumentToText(document),
    ...records.flatMap((r) => r.art30.map((c) => c.pinpoint)),
    "Art. 30 GDPR",
  ].join("\n");
  const ledger = buildCitationLedger(input, records);
  const toa = renderRopaToa(ledger, bodyForToa);

  const withToa = toa
    ? renderSkeletonDocument({
        sections: ROPA_SKELETON_SECTIONS,
        title: ROPA_SKELETON_TITLE,
        subtitle: ROPA_SKELETON_SUBTITLE,
        spineVersion: ROPA_SKELETON_VERSION,
        values,
        composed: { ...composed, "table_of_authorities:0": toa },
      })
    : document;

  const findings = verifySkeletonConformance(withToa, ROPA_SKELETON_SECTIONS);
  const text = skeletonDocumentToText(withToa);
  // DOC 178 (2026-09-04) — the Determination Syllabus (page 1 of the
  // Syllabus & Record presentation) attached as a projection of the
  // determinations above. Additive: sections, hash and conformance are
  // untouched; a renderer that does not know the field ignores it (this
  // includes the DOCX/XLSX renderers this same assembled object feeds).
  const documentWithSyllabus: RenderedSkeletonDocument = {
    ...withToa,
    syllabus: buildRopaSyllabus(completeness, composed["completeness_review:0"] as string, input.organisationName || "the company"),
  };

  return {
    _typed: "ropa-register-document@so10",
    stamp: ROPA_PIPELINE_STAMP,
    assembler: ROPA_SKELETON_ASSEMBLER_STAMP,
    spine_version: ROPA_SKELETON_VERSION,
    skeleton_hash: ROPA_SKELETON_CONTENT_HASH,
    provenance: ROPA_SKELETON_PROVENANCE,
    document: documentWithSyllabus,
    activity_records: records,
    table_of_authorities: toa,
    citation_ledger: ledger,
    completeness,
    conformance: { ok: findings.length === 0, findings },
    register_findings: checkRegister(text),
    text,
  };
}
