/**
 * ITEM 312 — builder for the four ir-playbook analytic deliverables.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no env.
 * Nothing here computes or recomputes a notification DEADLINE — Op. 1's clock
 * arithmetic stays exactly where it is and stays deterministic.
 *
 * SINGLE-WRITER LAW: this module is the only writer of
 * `sa_notification_determination`, `data_subject_communication_determination`,
 * `art34_exemption_analysis` and `content_owner_mapping`.
 */
import {
  ANCHOR_KEYS,
  AWARENESS_ASSUMED,
  AWARENESS_CONFIRMED,
  EEA_JURISDICTIONS,
  ENCRYPTION_ALL,
  ENCRYPTION_NONE,
  ENCRYPTION_SOME,
  EXPOSURE_LEXICON,
  HIGH_RISK_DATA_TYPES,
  HOSTILE_CAUSES,
  KEYS_COMPROMISED,
  KEYS_SECURE,
  LARGE_SCALE_COUNTS,
  OWNERS,
  REGIME_AUTHORITY,
  REGIME_LABEL,
  row,
  SEVERITY_RAISING_DATA_TYPES,
  TO_BE_COMPLETED,
  UK_JURISDICTION,
} from "./elements.ts";
import type { NotificationRegime } from "./elements.ts";
import { mapContentOwnerToEdpbTemplate } from "./edpb-art33-template.ts";
// SO-FT FIX 3 (2026-08-11): US state breach clocks, parallel to the GDPR-family
// regime sets — the Part One summary previously named neither.
import { buildStateNotificationDuties } from "./us-state-duties.ts";
// IR-E Phase 3a (2026-08-29, doc 102): HIPAA's four breach-notification
// duties, parallel to the US-state clocks above — rides the same
// StateDutySet shape.
import { buildHipaaDuties } from "./hipaa-duties.ts";
// IR-E Phase 3b (2026-08-29, doc 103): PIPEDA's breach-notification duties,
// same StateDutySet shape reuse.
import { buildPipedaDuties } from "./pipeda-duties.ts";
// IR-E Phase 3d (2026-08-29, doc 104): SEC 8-K / NYDFS / DORA, same
// StateDutySet shape reuse; each trigger independent, so duties stack.
import { buildSectoralDuties } from "./sectoral-duties.ts";

import type {
  Art34ExemptionAnalysis,
  ContentElementKey,
  ContentElementMapping,
  ContentOwnerMapping,
  DataSubjectCommunicationDetermination,
  DocumentationRecord,
  ExemptionFinding,
  IrPlaybookDeliverables,
  PhasingPlan,
  RegimeDutySet,
  RiskFactor,
  SaNotificationDetermination,
  SaVerdict,
  TransferFraming,
} from "./types.ts";

export const IR_DELIVERABLES_VERSION = "ir-deliverables-doc104-phase3d-2026-08-29";

// ── record helpers ───────────────────────────────────────────────────
function get(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const seg of path.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
}

// E8973164 (2026-08-28, flagged HIGH/MEDIUM) — `responseTeamRoster` is
// contract kind "structured" (no fixed shape), and the generator has been
// observed producing at least three shapes: an ARRAY of {role, primary,
// email, phone, contact} rows; an OBJECT keyed by one specific slug
// ("dataProtectionOfficer"); and — this batch — an OBJECT keyed by
// ARBITRARY camelCase role slugs (itForensicsLead, incidentResponseLead,
// privacyCounsel, ...) whose value carries {name, title, email, phone}.
// D1D2B3B8-I2 (2026-08-28, the immediately preceding batch) fixed the
// array shape and the ONE hardcoded object key "dataProtectionOfficer",
// but this fixture's key was "privacyCounsel" — a spelling that lookup
// never anticipated, so the roster was silently treated as empty and both
// consumers below (the (b) DPO-contact element here, and the Art. 33(3)
// action-plan owner lookup in ir-skeleton-assemble.ts) fell back to
// "Outstanding" / "assign on the recorded roster" despite the record
// naming Declan Farrell, Group Data Protection Officer, in full. Rather
// than add another hardcoded key spelling, every object key is split into
// words and combined with the entry's own `title` field into one
// searchable string, so any key or title that names the role in ordinary
// English is found regardless of the exact camelCase spelling chosen.
export interface RosterRow {
  readonly searchable: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly contact: string;
  readonly roleLabel: string;
  readonly alternate: string;
}
function camelToWords(k: string): string {
  return k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
}
function titleCaseWords(words: string): string {
  return words.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
export function normalizeResponseTeamRoster(intake: unknown): RosterRow[] {
  const raw = get(intake, "responseTeamRoster");
  if (Array.isArray(raw)) {
    return raw.map((r) => {
      const role = str(get(r, "role"));
      return {
        searchable: role.toLowerCase(),
        name: str(get(r, "primary")) || str(get(r, "name")),
        email: str(get(r, "email")),
        phone: str(get(r, "phone")),
        contact: str(get(r, "contact")),
        roleLabel: role,
        alternate: str(get(r, "alternate")),
      };
    });
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, v]) => {
      const words = camelToWords(key);
      if (typeof v === "string") {
        return { searchable: words, name: v.trim(), email: "", phone: "", contact: "", roleLabel: titleCaseWords(words), alternate: "" };
      }
      const title = str(get(v, "title"));
      return {
        searchable: `${words} ${title}`.trim().toLowerCase(),
        name: str(get(v, "name")),
        email: str(get(v, "email")),
        phone: str(get(v, "phone")),
        contact: str(get(v, "contact")),
        roleLabel: title || titleCaseWords(words),
        alternate: str(get(v, "alternate")),
      };
    });
  }
  return [];
}

// E8973164 follow-up (2026-08-28, same shape-mismatch class, surfaced by the
// CEO's old-vs-new playbook PDF comparison) — `breachNoticeContracts` is
// also contract kind "structured" and arrives either as a flat ARRAY of rows
// or an OBJECT whose `obligations` array carries the rows; row fields vary
// between `deadline`/`clause`/`clauseRef`/`contractRef` and (this batch's
// fixture) `noticePeriod`/`contractReference`. The skeleton assembler's
// `contractRows` already normalised all of this after the morning fix, but
// standing-playbook.ts's contracts table used its own array-only `records()`
// read and carried the whole section as unrecorded against a record naming
// three counterparties in full. One shared normalizer, every consumer.
export interface BreachNoticeContractRow {
  readonly party: string;
  readonly deadline: string;
  readonly clause: string;
}
export function normalizeBreachNoticeContracts(intake: unknown): BreachNoticeContractRow[] {
  const raw = get(intake, "breachNoticeContracts");
  const rowsRaw = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray(get(raw, "obligations"))
    ? get(raw, "obligations") as unknown[]
    : [];
  return rowsRaw
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
    .map((c) => {
      const windowDays = c.noticeWindowDays;
      const deadline = str(c.deadline) || str(c.noticePeriod) ||
        (typeof windowDays === "number" && Number.isFinite(windowDays) ? `${windowDays} days per the contract` : "");
      return {
        party: str(c.counterparty) || str(c.party),
        deadline,
        clause: str(c.clause) || str(c.clauseRef) || str(c.contractRef) || str(c.contractReference),
      };
    })
    .filter((r) => r.party);
}

interface Anchor {
  citation: string;
  verbatim: string;
}
function anchor(key: keyof typeof ANCHOR_KEYS, fallbackCitation: string): Anchor {
  const r = row(ANCHOR_KEYS[key]);
  return {
    citation: r?.subsection || r?.citation || fallbackCitation,
    verbatim: r?.verbatim_quote ?? "",
  };
}

/** SEPARATION LAW — split exposure sentences out of obligation reasoning. */
export function separateExposure(text: string): { why: string; exposure: string; repairs: number } {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  const keep: string[] = [];
  const moved: string[] = [];
  for (const s of sentences) {
    if (EXPOSURE_LEXICON.some((re) => re.test(s))) moved.push(s.trim());
    else keep.push(s.trim());
  }
  return { why: keep.join(" "), exposure: moved.join(" "), repairs: moved.length };
}

// ── shared fact extraction ───────────────────────────────────────────
interface IncidentFacts {
  org: string;
  cause: string;
  dataTypes: string[];
  affectedCount: string;
  recordCount: string;
  subjectCount: string;
  contained: string;
  encryption: string;
  keyStatus: string;
  awareness: string;
  jurisdictions: string[];
  processorInvolved: boolean;
  processorName: string;
  ukOnly: boolean;
  gdprInScope: boolean;
  /**
   * ITEM 328 PARALLEL-DUTY LAW: every GDPR-family regime the record engages,
   * in render order. A breach touching both an EEA country and the United
   * Kingdom engages BOTH — there is no mutual recognition post-Brexit, so
   * neither leg may be dropped in favour of the other.
   */
  regimes: NotificationRegime[];
  mixed: boolean;
}

export function readIncidentFacts(intake: unknown): IncidentFacts {
  const jurisdictions = arr(get(intake, "jurisdictions"));
  const eea = jurisdictions.filter((j) => EEA_JURISDICTIONS.includes(j));
  const uk = jurisdictions.includes(UK_JURISDICTION);
  const regimes: NotificationRegime[] = [];
  if (eea.length > 0) regimes.push("eu");
  if (uk) regimes.push("uk");
  return {
    org: str(get(intake, "organizationName")) || str(get(intake, "organization_name")),
    cause: str(get(intake, "cause")),
    dataTypes: arr(get(intake, "dataTypes")),
    affectedCount: str(get(intake, "affectedCount")),
    recordCount: str(get(intake, "affectedRecordCount")),
    subjectCount: str(get(intake, "affectedDataSubjectCount")),
    contained: str(get(intake, "contained")),
    encryption: str(get(intake, "encryptionStatus")),
    keyStatus: str(get(intake, "encryptionKeyStatus")),
    awareness: str(get(intake, "awarenessConfirmed")),
    jurisdictions,
    processorInvolved: get(intake, "processorInvolved") === true,
    processorName: str(get(intake, "processorName")),
    ukOnly: uk && eea.length === 0,
    gdprInScope: uk || eea.length > 0,
    regimes,
    mixed: regimes.length > 1,
  };
}

/** The regime the scalar (legacy) deliverable fields are stated under. */
export function primaryRegime(f: IncidentFacts): NotificationRegime {
  return f.regimes[0] ?? "eu";
}

function unintelligible(f: IncidentFacts): "yes" | "no" | "partial" | "unknown" {
  if (f.encryption === ENCRYPTION_ALL) return f.keyStatus === KEYS_SECURE ? "yes" : f.keyStatus === KEYS_COMPROMISED ? "no" : "unknown";
  if (f.encryption === ENCRYPTION_SOME) return f.keyStatus === KEYS_COMPROMISED ? "no" : "partial";
  if (f.encryption === ENCRYPTION_NONE) return "no";
  return "unknown";
}

// ---------------------------------------------------------------------
// 1. Art. 33(1) — supervisory-authority notification determination
// ---------------------------------------------------------------------
export function buildSaNotificationDetermination(
  intake: unknown,
  regimeArg?: NotificationRegime,
): SaNotificationDetermination {
  const f = readIncidentFacts(intake);
  const regime = regimeArg ?? primaryRegime(f);
  const authority = REGIME_AUTHORITY[regime];
  const std = regime === "uk"
    ? anchor("uk_sa_72h", "UK GDPR Art. 33(1)")
    : anchor("sa_72h", "GDPR Art. 33(1)");
  const parallel_duty_note = f.mixed
    ? `The incident engages ${f.regimes.length} GDPR-family regimes on the recorded jurisdictions. This determination states the ${REGIME_LABEL[regime]} duty only. The ${f.regimes.filter((r) => r !== regime).map((r) => REGIME_LABEL[r]).join(" and ")} duty applies independently and is determined separately: the two regimes do not recognise each other's notifications, so notifying one does not discharge the other.`
    : undefined;

  const factors: RiskFactor[] = [];
  const severe = f.dataTypes.filter((d) => SEVERITY_RAISING_DATA_TYPES.includes(d));
  for (const d of severe) {
    factors.push({ factor: `Category of personal data affected: ${d}`, record_basis: `dataTypes includes "${d}"`, direction: "aggravating" });
  }
  if (HOSTILE_CAUSES.includes(f.cause)) {
    factors.push({ factor: "The record describes a hostile actor rather than an internal error", record_basis: `cause = "${f.cause}"`, direction: "aggravating" });
  }
  if (LARGE_SCALE_COUNTS.includes(f.affectedCount)) {
    factors.push({ factor: "Scale of exposure", record_basis: `affectedCount = "${f.affectedCount}"`, direction: "aggravating" });
  }
  const uni = unintelligible(f);
  if (uni === "yes") {
    factors.push({ factor: "The affected data were rendered unintelligible to an unauthorised person and the keys are recorded as uncompromised", record_basis: `encryptionStatus = "${f.encryption}"; encryptionKeyStatus = "${f.keyStatus}"`, direction: "mitigating" });
  } else if (uni === "no" && f.encryption) {
    factors.push({ factor: "The affected data were not rendered unintelligible", record_basis: `encryptionStatus = "${f.encryption}"; encryptionKeyStatus = "${f.keyStatus || "not stated"}"`, direction: "aggravating" });
  }
  if (f.contained === "Yes") {
    factors.push({ factor: "The incident is recorded as contained", record_basis: 'contained = "Yes"', direction: "mitigating" });
  } else if (f.contained === "No" || f.contained === "Unknown") {
    factors.push({ factor: "The incident is not recorded as contained", record_basis: `contained = "${f.contained}"`, direction: "aggravating" });
  }

  const factParts: string[] = [];
  factParts.push(
    f.dataTypes.length
      ? `The record states the affected categories as ${JSON.stringify(f.dataTypes)}.`
      : "The record does not state which categories of personal data were affected.",
  );
  factParts.push(f.cause ? `It records the apparent cause as "${f.cause}".` : "It records no apparent cause.");
  factParts.push(
    f.affectedCount ? `It puts the number of affected individuals in the band "${f.affectedCount}".` : "It gives no band for the number of affected individuals.",
  );
  factParts.push(
    f.encryption
      ? `On technical protection it states "${f.encryption}"${f.keyStatus ? ` with key status "${f.keyStatus}"` : ""}.`
      : "It does not state whether the affected data were encrypted or otherwise rendered unintelligible.",
  );
  factParts.push(f.contained ? `Containment is recorded as "${f.contained}".` : "Containment status is not recorded.");
  if (f.awareness === AWARENESS_ASSUMED) {
    factParts.push("Awareness is recorded as ASSUMED: the detection timestamp is being treated as the moment of awareness pending confirmation.");
  } else if (f.awareness === AWARENESS_CONFIRMED) {
    factParts.push("Awareness is recorded as CONFIRMED against the discovery timestamp.");
  }
  const record_fact = factParts.join(" ");

  const aggravating = factors.filter((x) => x.direction === "aggravating");
  const mitigating = factors.filter((x) => x.direction === "mitigating");

  let verdict: SaVerdict;
  let unlikely = false;
  let status: SaNotificationDetermination["status"] = "analysed";
  let information_needed: string | undefined;
  let application: string;
  let whyRaw: string;

  if (!f.dataTypes.length || !f.encryption) {
    verdict = "undetermined_on_the_record";
    status = "record_insufficient";
    application =
      `Article 33(1) makes notification the rule and lifts it only where the breach is "unlikely to result in a risk to the rights and freedoms of natural persons". Running that negative condition requires knowing what was exposed and whether it was intelligible to whoever obtained it. The record ${!f.dataTypes.length ? "does not state the categories affected" : "does not state whether the affected data were rendered unintelligible"}, so the exception cannot be established. The duty is therefore treated as engaged on a precautionary basis and the determination is left open rather than assumed either way.`;
    whyRaw =
      "Notification is prepared on the footing that the Article 33(1) duty is engaged, because the negative condition that would lift it has not been established on this record.";
    information_needed = !f.dataTypes.length
      ? "dataTypes — the categories of personal data actually affected by the incident."
      : "encryptionStatus and encryptionKeyStatus — whether the affected data were encrypted or otherwise rendered unintelligible to an unauthorised person, and whether the keys were compromised.";
  } else if (uni === "yes" && aggravating.length === 0 && f.contained === "Yes") {
    verdict = "notification_not_required_unlikely_risk";
    unlikely = true;
    application =
      `Article 33(1) lifts the notification duty only where the breach is "unlikely to result in a risk to the rights and freedoms of natural persons". On this record the affected data were rendered unintelligible to any unauthorised person and the keys are recorded as uncompromised, the incident is contained, and no severity-raising category, hostile actor or large-scale exposure is recorded. Run over those facts the negative condition is satisfied: there is no route by which the data can be read, used or acted on by the person who obtained them.`;
    whyRaw =
      `The Article 33(1) negative condition is established on the facts recorded, so no notification to ${authority} is required for this incident. That conclusion is bound to the encryption and containment facts as recorded: if the key status changes, or further affected data are identified, the test must be re-run before the position is relied on. The Article 33(5) documentation duty applies regardless of this outcome, and the reasoning above is the record that discharges it.`;
  } else {
    verdict = "notification_required";
    const drivers = aggravating.map((x) => x.factor.toLowerCase()).slice(0, 4);
    application =
      `Article 33(1) requires notification unless the breach is "unlikely to result in a risk to the rights and freedoms of natural persons". That is a negative condition the controller must establish, not a presumption in its favour. On this record it is not established: ${drivers.length ? drivers.join("; ") : "the mitigating facts recorded do not remove the possibility of a risk to the affected individuals"}.${mitigating.length ? ` The mitigating facts the record does supply — ${mitigating.map((m) => m.factor.toLowerCase()).join("; ")} — reduce the severity but do not make a risk unlikely.` : ""} The duty therefore stands.`;
    // SO-FT2 FIX 3 (2026-08-11): the old deferral sentence pointed the reader
    // at "the awareness and deadline analysis", which no section of the
    // rendered document contained. The awareness moment and the computed
    // outer limit are now stated in Part Two next to each duty determination
    // (ir-skeleton-assemble.ts), so the deferral is dropped rather than left
    // pointing at nothing.
    whyRaw =
      `Notification to ${authority} is required, because the Article 33(1) exception is not made out on these facts.${f.processorInvolved ? ` A processor is involved${f.processorName ? ` (${f.processorName})` : ""}, so the Article 33(2) notification from processor to controller is part of the same record.` : ""}`;

  }

  const sep = separateExposure(whyRaw);
  return {
    regime,
    regime_label: REGIME_LABEL[regime],
    ...(parallel_duty_note ? { parallel_duty_note } : {}),
    standard: std.verbatim,
    standard_citation: std.citation,
    record_fact,
    application,
    verdict,
    risk_factors: factors,
    unlikely_risk_established: unlikely,
    why: sep.why,
    exposure_note: sep.exposure,
    separation_repairs: sep.repairs,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// 2. Art. 34(1) — communication to data subjects (SEPARATE, HIGHER test)
// ---------------------------------------------------------------------
export function buildDataSubjectCommunicationDetermination(
  intake: unknown,
  saVerdict: SaVerdict,
  exemptionAvailable: boolean,
  regimeArg?: NotificationRegime,
): DataSubjectCommunicationDetermination {
  const f = readIncidentFacts(intake);
  const regime = regimeArg ?? primaryRegime(f);
  const std = regime === "uk"
    ? anchor("uk_ds_high_risk", "UK GDPR Art. 34(1)")
    : anchor("ds_high_risk", "GDPR Art. 34(1)");
  const parallel_duty_note = f.mixed
    ? `The Article 34(1) communication duty is determined separately under each regime the record engages. This determination is the ${REGIME_LABEL[regime]} one; the ${f.regimes.filter((r) => r !== regime).map((r) => REGIME_LABEL[r]).join(" and ")} determination stands alongside it.`
    : undefined;
  const plain = anchor("ds_plain_language", "GDPR Art. 34(2)");

  const factors: RiskFactor[] = [];
  const highCats = f.dataTypes.filter((d) => HIGH_RISK_DATA_TYPES.includes(d));
  for (const d of highCats) {
    factors.push({ factor: `Category capable of producing serious consequences for the individual: ${d}`, record_basis: `dataTypes includes "${d}"`, direction: "aggravating" });
  }
  if (f.dataTypes.includes("Passwords / credentials") && HOSTILE_CAUSES.includes(f.cause)) {
    factors.push({ factor: "Credentials in the hands of a hostile actor create a live account-takeover route for the individual", record_basis: `dataTypes includes credentials; cause = "${f.cause}"`, direction: "aggravating" });
  }
  if (LARGE_SCALE_COUNTS.includes(f.affectedCount)) {
    factors.push({ factor: "Scale of exposure", record_basis: `affectedCount = "${f.affectedCount}"`, direction: "aggravating" });
  }
  const uni = unintelligible(f);
  if (uni === "yes") {
    factors.push({ factor: "The data are unintelligible to the person who obtained them", record_basis: `encryptionStatus = "${f.encryption}"; encryptionKeyStatus = "${f.keyStatus}"`, direction: "mitigating" });
  }

  const record_fact = [
    f.dataTypes.length ? `The categories the record puts in issue are ${JSON.stringify(f.dataTypes)}.` : "The record does not state which categories of personal data were affected.",
    highCats.length ? `Of those, ${JSON.stringify(highCats)} bear directly on the severity of consequences for the individual.` : "None of the recorded categories is one whose exposure ordinarily produces severe consequences for the individual.",
    f.subjectCount ? `It puts the number of affected data subjects at ${f.subjectCount}.` : "It does not state the number of affected data subjects.",
    f.cause ? `The apparent cause is "${f.cause}".` : "It records no apparent cause.",
  ].join(" ");

  const threshold_separation_note =
    "Article 34(1) is a separate and higher test from Article 33(1). Article 33 asks whether a risk is unlikely; Article 34 asks whether a HIGH risk is likely. A breach can be notifiable to the supervisory authority and still not require communication to the data subject, and this determination is reached on its own facts, not inherited from the Article 33 outcome.";

  let verdict: DataSubjectCommunicationDetermination["verdict"];
  let established = false;
  let status: DataSubjectCommunicationDetermination["status"] = "analysed";
  let information_needed: string | undefined;
  let application: string;
  let whyRaw: string;

  const aggravating = factors.filter((x) => x.direction === "aggravating");
  const scale = LARGE_SCALE_COUNTS.includes(f.affectedCount);
  const highRisk = (highCats.length > 0 && (HOSTILE_CAUSES.includes(f.cause) || scale)) || (highCats.length >= 2);

  if (!f.dataTypes.length) {
    verdict = "undetermined_on_the_record";
    status = "record_insufficient";
    application =
      "Article 34(1) turns on whether the breach is likely to result in a HIGH risk to the rights and freedoms of natural persons. That question is asked of the consequences for the individual, which cannot be assessed without knowing what was exposed. The record does not state the affected categories, so the higher threshold can be neither reached nor ruled out.";
    whyRaw = "Communication to data subjects is held open pending the categories affected; it is not ruled out and must not be treated as discharged.";
    information_needed = "dataTypes and affectedDataSubjectCount — the categories affected and how many individuals they concern, which are the facts the high-risk test runs over.";
  } else if (uni === "yes" && exemptionAvailable) {
    verdict = "communication_excused_by_exemption";
    established = highRisk;
    application =
      `Run on its own facts, ${highRisk ? "the breach would reach the Article 34(1) high-risk threshold" : "the breach does not reach the Article 34(1) high-risk threshold"}. Article 34(3) is reached separately: the affected data were rendered unintelligible to any unauthorised person and the keys are recorded as uncompromised, so limb (a) is available and the communication duty in paragraph 1 does not bite. The exemption analysis records that finding and the Article 34(4) reservation that attaches to it.`;
    whyRaw =
      "No communication to data subjects is required, on the basis of the Article 34(3)(a) exemption rather than on the basis that no high risk exists. If the key status is revised, the exemption falls away and paragraph 1 applies on the facts above.";
  } else if (highRisk) {
    verdict = "communication_required";
    established = true;
    // 3E9AD759-I2 (2026-08-27, live batch 3e9ad759) — where encryption exists
    // but the keys are recorded as compromised, the reader is told WHY the
    // Article 34(3)(a) exemption fails, not just that no limb removes the
    // duty: compromised keys negate the unintelligibility encryption would
    // otherwise provide. The clause states the record's own basis.
    const exemptionClause = f.encryption && f.keyStatus && f.keyStatus !== KEYS_SECURE && uni !== "yes"
      ? `The Article 34(3)(a) exemption does not remove the duty: it applies only where the affected data were rendered unintelligible to any unauthorised person, and the record puts the encryption keys at "${f.keyStatus}" — a compromised or unconfirmed key defeats the unintelligibility the exemption turns on. No other Article 34(3) limb removes the duty on this record.`
      : "No Article 34(3) limb removes the duty on this record.";
    application =
      `Article 34(1) asks whether the breach is likely to result in a HIGH risk to the rights and freedoms of natural persons — a materially higher bar than Article 33(1)'s "a risk". On these facts the bar is reached: ${aggravating.map((x) => x.factor.toLowerCase()).join("; ")}. The consequences those facts point to fall on the individual directly. ${exemptionClause} Communication is therefore required without undue delay, and under Article 34(2) it must describe in clear and plain language the nature of the breach and carry the Article 33(3)(b), (c) and (d) content.`;
    whyRaw =
      `Communication to the affected data subjects is required. ${plain.verbatim}`;
  } else {
    verdict = "communication_not_required_no_high_risk";
    application =
      `Article 34(1) is a higher threshold than Article 33(1): it requires a HIGH risk to be likely, not merely a risk to be possible. ${highCats.length ? `The record puts ${JSON.stringify(highCats)} in issue, but without a hostile actor or exposure at scale the consequences it points to are not of the severity Article 34 addresses.` : "The categories recorded are not ones whose exposure ordinarily produces severe consequences for the individual, and neither scale nor a hostile actor is recorded."} The higher threshold is therefore not reached${saVerdict === "notification_required" ? ", notwithstanding that the Article 33(1) duty to notify the supervisory authority is engaged — the two tests are different standards on different questions" : ""}.`;
    whyRaw =
      "No communication to data subjects is required on the facts as recorded. This position must be re-run if the investigation identifies further categories, further affected individuals, or misuse of the data.";
  }

  const sep = separateExposure(whyRaw);
  return {
    regime,
    regime_label: REGIME_LABEL[regime],
    ...(parallel_duty_note ? { parallel_duty_note } : {}),
    standard: std.verbatim,
    standard_citation: std.citation,
    record_fact,
    application,
    verdict,
    high_risk_factors: factors,
    high_risk_established: established,
    sa_verdict_for_contrast: saVerdict,
    threshold_separation_note,
    why: sep.why,
    exposure_note: sep.exposure,
    separation_repairs: sep.repairs,
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// 3. Art. 34(3) — all three exemption limbs on the record
// ---------------------------------------------------------------------
export function buildArt34ExemptionAnalysis(intake: unknown): Art34ExemptionAnalysis {
  const f = readIncidentFacts(intake);
  const a = anchor("exemption_a", "GDPR Art. 34(3)(a)");
  const b = anchor("exemption_b", "GDPR Art. 34(3)(b)");
  const c = anchor("exemption_c", "GDPR Art. 34(3)(c)");
  const override = anchor("sa_override", "GDPR Art. 34(4)");
  const uni = unintelligible(f);

  // (a) unintelligibility / encryption
  const aFact = f.encryption
    ? `The record states technical protection as "${f.encryption}"${f.keyStatus ? ` and key status as "${f.keyStatus}"` : " and gives no key status"}.`
    : "The record does not state whether protection measures were applied to the affected data.";
  let aVerdict: ExemptionFinding["verdict"];
  let aStatus: ExemptionFinding["status"] = "analysed";
  let aApplication: string;
  let aNeeded: string | undefined;
  if (uni === "yes") {
    aVerdict = "available";
    aApplication =
      "Limb (a) requires that appropriate technical and organisational protection measures were implemented AND applied to the personal data affected by this breach, in particular measures such as encryption that render the data unintelligible to an unauthorised person. Both elements are satisfied on the record: the measures were applied to the affected data, and the keys are recorded as uncompromised, so the data remain unintelligible to whoever obtained them.";
  } else if (uni === "no") {
    aVerdict = "not_available";
    aApplication = f.keyStatus === KEYS_COMPROMISED
      ? "Limb (a) fails on the key status. Encryption only renders data unintelligible while the keys remain outside the unauthorised person's reach; the record states the keys are compromised or possibly compromised, so the protection the limb depends on did not survive the incident."
      : "Limb (a) fails at its second element: the record does not show protection measures applied to the personal data affected by this breach such that the data are unintelligible to an unauthorised person.";
  } else if (uni === "partial") {
    aVerdict = "not_available";
    aApplication =
      "Limb (a) is written of the personal data affected by the breach, not of the estate generally. The record states that only some of the affected data were encrypted, so for the remainder the data are not unintelligible and the limb cannot excuse communication to the individuals whose data fall in that remainder.";
  } else {
    aVerdict = "undetermined_on_the_record";
    aStatus = "record_insufficient";
    aApplication =
      "Limb (a) cannot be run: the record does not state whether protection measures were applied to the affected data, or whether the keys remained secure. The limb is therefore neither available nor ruled out.";
    aNeeded = "encryptionStatus and encryptionKeyStatus — whether the affected data were encrypted or otherwise rendered unintelligible, and whether the keys were compromised.";
  }

  // (b) subsequent measures
  const bFact = f.contained
    ? `The record states containment as "${f.contained}"${f.cause ? ` following a cause recorded as "${f.cause}"` : ""}. It records no subsequent measures directed at the residual high risk to the affected individuals.`
    : "The record states neither containment nor any subsequent measures.";
  let bVerdict: ExemptionFinding["verdict"] = "undetermined_on_the_record";
  let bStatus: ExemptionFinding["status"] = "record_insufficient";
  let bApplication: string;
  let bNeeded: string | undefined;
  if (f.contained === "No" || f.contained === "Unknown") {
    bVerdict = "not_available";
    bStatus = "analysed";
    bApplication =
      `Limb (b) requires subsequent measures which ensure that the high risk is no longer likely to materialise. The incident is recorded as ${f.contained === "No" ? "not contained" : "of unknown containment"}, so on the record there are no measures capable of ensuring that outcome, and the limb is not available.`;
  } else {
    bApplication =
      "Limb (b) asks a narrower question than containment. Containment stops the incident continuing; limb (b) requires measures that ensure the high risk to the affected individuals is no longer LIKELY TO MATERIALISE — for example forced credential resets that void the exposed credentials, or card reissue that voids the exposed numbers. The record states containment but does not identify any such measure directed at the individuals' residual risk, so the limb is recorded as unresolved rather than treated as satisfied by containment.";
    bNeeded =
      "Subsequent measures taken after containment that are directed at the affected individuals' residual risk (for example forced password reset, card reissue, monitoring), and the evidence that each one removes the likelihood of the high risk materialising.";
  }

  // (c) disproportionate effort
  const cFact = f.subjectCount || f.affectedCount
    ? `The record puts the affected population at ${f.subjectCount || f.affectedCount}${f.subjectCount && f.affectedCount ? ` (band "${f.affectedCount}")` : ""}. It records no fact about whether the controller holds contact details for those individuals.`
    : "The record states neither the number of affected data subjects nor whether contact details are held for them.";
  const cApplication =
    "Limb (c) is not about population size on its own; it asks whether individual communication would involve disproportionate effort, which turns on whether the controller can reach the individuals at all and at what cost. The record supplies no fact on contactability, so the limb cannot be resolved. The provision supplies its own substitute where the limb is made out, and that substitute is recorded below rather than left implicit.";

  const limbs: ExemptionFinding[] = [
    {
      limb: "a_unintelligible",
      standard: a.verbatim,
      standard_citation: a.citation,
      record_fact: aFact,
      application: aApplication,
      verdict: aVerdict,
      status: aStatus,
      ...(aNeeded ? { information_needed: aNeeded } : {}),
    },
    {
      limb: "b_subsequent_measures",
      standard: b.verbatim,
      standard_citation: b.citation,
      record_fact: bFact,
      application: bApplication,
      verdict: bVerdict,
      status: bStatus,
      ...(bNeeded ? { information_needed: bNeeded } : {}),
    },
    {
      limb: "c_disproportionate_effort",
      standard: c.verbatim,
      standard_citation: c.citation,
      record_fact: cFact,
      application: cApplication,
      verdict: "undetermined_on_the_record",
      substitute_measure:
        "there shall instead be a public communication or similar measure whereby the data subjects are informed in an equally effective manner",
      status: "record_insufficient",
      information_needed:
        "Whether the controller holds current contact details for the affected data subjects, and the cost or practical obstacle relied on if individual communication is said to be disproportionate.",
    },
  ];

  return {
    limbs,
    any_exemption_available: limbs.some((l) => l.verdict === "available"),
    sa_override_citation: override.citation,
    sa_override_verbatim: override.verbatim,
    status: limbs.every((l) => l.status === "analysed") ? "analysed" : "record_insufficient",
  };
}


// ---------------------------------------------------------------------
// 3b. Chapter V transfer framing — ITEM 328 (Item 302 residual watch item 2)
// ---------------------------------------------------------------------
/**
 * The EU and UK Chapter V rails are DIFFERENT rails, not the same rail under
 * two names. EU Art. 44 states the general principle; in UK law Art. 44 is
 * OMITTED and the general principle is Art. 44A, with the Art. 45B / 46(6)
 * "not materially lower" data protection test in place of the EU benchmark.
 * Citing Art. 44 in a UK leg cites a repealed article — which is what this
 * product did before this item.
 *
 * DEGRADATION LAW: the ir_playbook intake contract carries no field stating
 * whether the affected data were transferred to or held in a third country, so
 * the limb is emitted as `record_insufficient` with that named ask. It is not
 * assumed either way and it is not omitted.
 */
export function buildTransferFraming(
  intake: unknown,
  regimeArg?: NotificationRegime,
): TransferFraming {
  const f = readIncidentFacts(intake);
  const regime = regimeArg ?? primaryRegime(f);
  const gen = regime === "uk"
    ? anchor("uk_transfers_general", "UK GDPR Art. 44A(1)")
    : anchor("eu_transfers_general", "GDPR Art. 44");
  const safeguards = regime === "uk"
    ? anchor("uk_transfers_safeguards", "UK GDPR Art. 46(1A)")
    : anchor("eu_transfers_safeguards", "GDPR Art. 46(1)");
  const test = regime === "uk" ? anchor("uk_transfers_test", "UK GDPR Art. 46(6)") : null;
  const omitted = regime === "uk" ? anchor("uk_art_44_omitted", "UK GDPR Art. 44 (omitted)") : null;

  const record_fact =
    `The record puts the following jurisdictions in scope: ${JSON.stringify(f.jurisdictions)}. It states no fact about whether the personal data affected by this incident were transferred to, or held in, a third country or by an international organisation, and no fact about the mechanism relied on for any such transfer.`;

  const application = regime === "uk"
    ? `Where the incident touches personal data that were transferred outside the United Kingdom, the transfer stands or falls on the UK rail, not the EU one: the general principle is Article 44A(1), the adequacy route is regulations under Article 45A tested against the Article 45B standard, and the safeguards route under Article 46 turns on clause sets specified by the Secretary of State under Article 47A(1) or issued by the Commissioner under section 119A of the 2018 Act, with the exporter's own Article 46(6) data protection test. ${test ? "The test asks whether protection would be \"not materially lower\" than the UK standard — a different benchmark from the EU one, applied by a different decision-maker. " : ""}The record does not state whether any affected data were transferred outside the United Kingdom, so whether Chapter V is engaged at all is left open rather than asserted.`
    : `Where the incident touches personal data that were transferred outside the EU/EEA, Article 44 requires that the conditions of Chapter V were complied with for that transfer and for any onward transfer, and in the absence of an adequacy decision the transfer must rest on appropriate safeguards under Article 46. Whether that condition was satisfied bears directly on the breach record, because a breach of data already transferred on a defective basis is two failures, not one. The record does not state whether any affected data were transferred outside the EU/EEA, so the question is left open rather than assumed.`;

  return {
    regime,
    citation: gen.citation,
    standard: gen.verbatim,
    ...(omitted ? { omitted_article_note: omitted.verbatim } : {}),
    record_fact,
    application: `${application} Safeguards standard relied on where the limb is reached: ${safeguards.citation}.`,
    status: "record_insufficient",
    information_needed:
      "Whether the personal data affected by this incident were transferred to, or held in, a third country or by an international organisation, and if so the transfer mechanism relied on. The ir_playbook intake contract carries no field for this today; the field must be added before the limb can be closed.",
  };
}

// ---------------------------------------------------------------------
// 4. Art. 33(3)(a)-(d) content / owner mapping + 33(4) phasing + 33(5) record
// ---------------------------------------------------------------------
export function buildContentOwnerMapping(intake: unknown): ContentOwnerMapping {
  const f = readIncidentFacts(intake);
  const A = anchor("content_a", "GDPR Art. 33(3)(a)");
  const B = anchor("content_b", "GDPR Art. 33(3)(b)");
  const C = anchor("content_c", "GDPR Art. 33(3)(c)");
  const D = anchor("content_d", "GDPR Art. 33(3)(d)");
  const P = anchor("phasing", "GDPR Art. 33(4)");
  const DOC = anchor("documentation", "GDPR Art. 33(5)");

  const aParts: string[] = [];
  if (f.cause) aParts.push(`nature: ${f.cause}`);
  if (f.dataTypes.length) aParts.push(`categories of personal data: ${f.dataTypes.join(", ")}`);
  if (f.subjectCount) aParts.push(`approximate number of data subjects: ${f.subjectCount}`);
  else if (f.affectedCount) aParts.push(`approximate number of data subjects: band "${f.affectedCount}" only`);
  if (f.recordCount) aParts.push(`approximate number of personal data records: ${f.recordCount}`);
  const aComplete = !!(f.cause && f.dataTypes.length && f.subjectCount && f.recordCount);

  const elements: ContentElementMapping[] = [
    {
      element: "a_nature",
      citation: A.citation,
      requirement_verbatim: A.verbatim,
      owner: OWNERS.forensics,
      source_of_truth:
        "Forensic investigation record, reconciled against the intake fields `cause`, `dataTypes`, `affectedDataSubjectCount` and `affectedRecordCount`.",
      record_value: aParts.length ? aParts.join("; ") : TO_BE_COMPLETED,
      status: aComplete ? "analysed" : "record_insufficient",
      ...(aComplete
        ? {}
        : {
            information_needed: `Article 33(3)(a) asks for the categories AND the approximate numbers of both data subjects and records. Missing: ${[
              !f.cause ? "cause" : null,
              !f.dataTypes.length ? "dataTypes" : null,
              !f.subjectCount ? "affectedDataSubjectCount" : null,
              !f.recordCount ? "affectedRecordCount" : null,
            ].filter(Boolean).join(", ")}.`,
          }),
    },
    // D1D2B3B8-I2 (2026-08-28) — the (b) element reads the RECORDED roster
    // before declaring itself outstanding. Two live batch records carried the
    // DPO's name, email and phone (array-row and object shapes both occur)
    // while the rendered plan said the contact was "Outstanding". E8973164
    // (2026-08-28, next batch) — the object-shape branch only recognised the
    // literal key "dataProtectionOfficer"; this fixture's key was
    // "privacyCounsel". Now uses the shared `normalizeResponseTeamRoster`,
    // which searches every object key's own words plus its `title` field
    // rather than one hardcoded spelling.
    ...(() => {
      const dpoRow = normalizeResponseTeamRoster(intake).find((r) =>
        /\bdpo\b|data protection/i.test(r.searchable));
      const dpoParts = dpoRow ? [dpoRow.name, dpoRow.email, dpoRow.phone, dpoRow.contact] : [];
      const dpoValue = dpoParts.filter(Boolean).join(", ");
      return [{
        element: "b_dpo_contact" as const,
        citation: B.citation,
        requirement_verbatim: B.verbatim,
        owner: OWNERS.dpo,
        source_of_truth:
          "The controller's data protection officer appointment record, or where no DPO is appointed, the nominated breach contact point named in the incident response plan.",
        record_value: dpoValue || TO_BE_COMPLETED,
        status: dpoValue ? "analysed" as const : "record_insufficient" as const,
        ...(dpoValue ? {} : {
          information_needed:
            "The name and contact details of the data protection officer or other contact point from which the supervisory authority can obtain more information.",
        }),
      }];
    })(),
    {
      element: "c_likely_consequences",
      citation: C.citation,
      requirement_verbatim: C.verbatim,
      owner: OWNERS.incident_lead,
      source_of_truth:
        "The Article 34(1) high-risk analysis in this playbook, which states the consequences for the individual on the recorded categories — the same facts, stated to the supervisory authority.",
      record_value: f.dataTypes.length
        ? `Consequences assessed on the categories ${f.dataTypes.join(", ")}${f.cause ? ` exposed via ${f.cause.toLowerCase()}` : ""}; see the Article 34(1) determination for the reasoning.`
        : TO_BE_COMPLETED,
      status: f.dataTypes.length ? "analysed" : "record_insufficient",
      ...(f.dataTypes.length ? {} : { information_needed: "dataTypes — the consequences cannot be described without the categories affected." }),
    },
    {
      element: "d_measures",
      citation: D.citation,
      requirement_verbatim: D.verbatim,
      owner: OWNERS.remediation,
      source_of_truth:
        "The remediation log, reconciled against the intake field `contained` and the subsequent measures relied on in the Article 34(3)(b) analysis.",
      record_value: f.contained
        ? `Containment recorded as "${f.contained}"${f.encryption ? `; technical protection recorded as "${f.encryption}"` : ""}. Measures proposed to mitigate adverse effects: ${TO_BE_COMPLETED}.`
        : TO_BE_COMPLETED,
      status: "record_insufficient",
      information_needed:
        "The measures taken or proposed to address the breach, and separately the measures to mitigate its possible adverse effects on the affected individuals — Article 33(3)(d) asks for both.",
    },
  ];

  const first: ContentElementKey[] = [];
  const phased: { element: ContentElementKey; reason: string }[] = [];
  for (const el of elements) {
    if (el.status === "analysed") first.push(el.element);
    else {
      phased.push({
        element: el.element,
        reason: el.information_needed ?? "The record does not yet carry this element.",
      });
    }
  }

  const phasing: PhasingPlan = {
    citation: P.citation,
    authority_verbatim: P.verbatim,
    first_tranche: first,
    phased,
    status: phased.length ? "record_insufficient" : "analysed",
  };

  const documentation: DocumentationRecord = {
    citation: DOC.citation,
    authority_verbatim: DOC.verbatim,
    facts: aParts.length
      ? `${aParts.join("; ")}${f.awareness === AWARENESS_CONFIRMED ? "; awareness confirmed against the discovery timestamp" : f.awareness === AWARENESS_ASSUMED ? "; awareness assumed from the detection timestamp pending confirmation" : ""}.`
      : TO_BE_COMPLETED,
    effects: f.dataTypes.length
      ? `Effects assessed under Article 34(1) on the recorded categories (${f.dataTypes.join(", ")}); the determination and its reasoning form part of this record.`
      : TO_BE_COMPLETED,
    remedial_action: f.contained
      ? `Containment recorded as "${f.contained}". Remedial actions and their completion evidence: ${TO_BE_COMPLETED}.`
      : TO_BE_COMPLETED,
    owner: OWNERS.incident_lead,
    status: "record_insufficient",
    information_needed:
      "The Article 33(5) record must carry the facts, the effects and the remedial action taken. The remedial-action limb is not closed by containment alone and must be completed with the actions and their evidence before the record can be said to enable the supervisory authority to verify compliance.",
  };

  // ITEM 369-IR LEG 2 — re-key the SAME element analysis onto the EDPB
  // Art. 33 template's field structure. Mapping layer only: no value is
  // re-derived here, and any template field the record does not answer is
  // carried through as an explicitly blank labelled field.
  const edpb_template = mapContentOwnerToEdpbTemplate(
    elements,
    {
      org: f.org,
      cause: f.cause,
      dataTypes: f.dataTypes,
      affectedCount: f.affectedCount,
      recordCount: f.recordCount,
      subjectCount: f.subjectCount,
      awareness: f.awareness,
      jurisdictions: f.jurisdictions,
      processorInvolved: f.processorInvolved,
      processorName: f.processorName,
    },
    phased.map((p) => p.element),
  );

  return {
    elements,
    phasing,
    documentation,
    edpb_template,
    status: elements.every((e) => e.status === "analysed") && phasing.status === "analysed" && documentation.status === "analysed"
      ? "analysed"
      : "record_insufficient",
  };
}


// ---------------------------------------------------------------------
// Composite builder + attach
// ---------------------------------------------------------------------
/**
 * D1D2B3B8-I1 — the honest not-engaged scalar. Rendered where the record
 * names NO GDPR-family jurisdiction, replacing the retired "EU rail as the
 * default frame" behaviour that ran the full Art. 33/34 apparatus (72-hour
 * clock, Art. 33(3) content plan, Art. 34 communication conclusion) on
 * records the GDPR does not govern (live batch d1d2b3b8, US-only HIPAA/CA/
 * TX/FL record, five HIGH misapplied-citation findings).
 */
function buildNotEngagedSa(f: IncidentFacts): SaNotificationDetermination {
  const juris = f.jurisdictions.length ? f.jurisdictions.join(", ") : "none recorded";
  return {
    regime: "eu",
    regime_label: "GDPR-family (not engaged)",
    verdict: "framework_not_engaged",
    risk_factors: [],
    unlikely_risk_established: false,
    standard: "",
    standard_citation: "",
    record_fact: `The recorded jurisdictions are: ${juris}.`,
    application:
      "No EU or UK jurisdiction is recorded, so the GDPR-family supervisory-authority notification framework (Art. 33) is not engaged on this record. The recorded jurisdictions' own notification duties and the recorded contractual clocks are the operative obligations, and they are set out in this playbook's standing sections and contractual-clock analysis.",
    why:
      "The Article 33 duty attaches only where the GDPR or UK GDPR governs the processing; the recorded jurisdictions do not put either instrument in scope.",
    exposure_note: "",
    separation_repairs: 0,
    status: "analysed",
  };
}

function buildNotEngagedDs(f: IncidentFacts): DataSubjectCommunicationDetermination {
  const juris = f.jurisdictions.length ? f.jurisdictions.join(", ") : "none recorded";
  return {
    regime: "eu",
    regime_label: "GDPR-family (not engaged)",
    verdict: "framework_not_engaged",
    high_risk_factors: [],
    high_risk_established: false,
    sa_verdict_for_contrast: "framework_not_engaged",
    threshold_separation_note: "",
    standard: "",
    standard_citation: "",
    record_fact: `The recorded jurisdictions are: ${juris}.`,
    application:
      "No EU or UK jurisdiction is recorded, so the Article 34 communication framework is not engaged on this record. Whether and when affected individuals must be notified is governed by the recorded jurisdictions' own statutes, set out in the standing sections.",
    why:
      "The Article 34 duty attaches only where the GDPR or UK GDPR governs the processing; the recorded jurisdictions do not put either instrument in scope.",
    exposure_note: "",
    separation_repairs: 0,
    status: "analysed",
  };
}

export function buildIrPlaybookDeliverables(intake: unknown): IrPlaybookDeliverables {
  const f = readIncidentFacts(intake);
  const exemptions = buildArt34ExemptionAnalysis(intake);

  // ITEM 328 PARALLEL-DUTY LAW: one complete duty set per engaged regime.
  // A mixed EU + UK incident yields two, stated side by side.
  // D1D2B3B8-I1 (2026-08-28): the "EU rail as the default frame" fallback is
  // RETIRED — where no GDPR-family jurisdiction is recorded the duty-set
  // array is EMPTY and the scalar determinations state, honestly, that the
  // framework is not engaged. The deliverable is still never empty: the
  // state duties, contractual clocks and standing sections carry the
  // operative obligations for such records.
  const notification_duties: RegimeDutySet[] = f.regimes.map((regime) => {
    const rsa = buildSaNotificationDetermination(intake, regime);
    return {
      regime,
      regime_label: REGIME_LABEL[regime],
      supervisory_authority: REGIME_AUTHORITY[regime],
      sa_notification_determination: rsa,
      data_subject_communication_determination: buildDataSubjectCommunicationDetermination(
        intake,
        rsa.verdict,
        exemptions.any_exemption_available,
        regime,
      ),
      transfer_framing: buildTransferFraming(intake, regime),
    };
  });

  // SO-FT FIX 3: the recorded US-state jurisdictions carry their OWN statutory
  // clocks. They are stated in parallel with the GDPR-family duties, never
  // folded into them and never given the Art. 33 72-hour phrasing.
  const stateDuties = buildStateNotificationDuties(
    f.jurisdictions,
    str(get(intake, "incidentDateTime")) || str(get(intake, "discoveryDateTime")),
  );
  // IR-E Phase 3a (2026-08-29, doc 102): HIPAA's duties ride the SAME
  // StateDutySet shape and are appended to the same array, so every existing
  // consumer (composeJurisdictionActionPlan, the standing playbook, the
  // schema allow-list) renders them with zero additional wiring. Independent
  // of the jurisdictions array — gated on organisationType, not a recorded
  // state/country.
  const hipaa = buildHipaaDuties(
    str(get(intake, "organisationType")),
    f.jurisdictions,
    f.affectedCount,
    f.processorInvolved,
    f.processorName,
  );
  // IR-E Phase 3b (2026-08-29, doc 103): PIPEDA duties + the four Canadian
  // provinces, appended the same way.
  const pipedaDuties = buildPipedaDuties(f.jurisdictions);
  // IR-E Phase 3d (2026-08-29, doc 104): SEC 8-K / NYDFS / DORA.
  const sectoral = buildSectoralDuties(f.jurisdictions, str(get(intake, "organisationType")));
  const state_notification_duties = [...stateDuties, ...hipaa.duties, ...pipedaDuties, ...sectoral.duties];

  const sa = notification_duties[0]?.sa_notification_determination ?? buildNotEngagedSa(f);
  const ds = notification_duties[0]?.data_subject_communication_determination ?? buildNotEngagedDs(f);
  const mapping = buildContentOwnerMapping(intake);
  return {
    notification_duties,
    state_notification_duties,
    sa_notification_determination: sa,
    data_subject_communication_determination: ds,
    art34_exemption_analysis: exemptions,
    content_owner_mapping: mapping,
  };
}

/** SINGLE-WRITER attach. Fail-open: returns telemetry, never throws. */
export function attachIrPlaybookDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildIrPlaybookDeliverables(intake);
    report.notification_duties = built.notification_duties;
    report.state_notification_duties = built.state_notification_duties;
    report.sa_notification_determination = built.sa_notification_determination;
    report.data_subject_communication_determination = built.data_subject_communication_determination;
    report.art34_exemption_analysis = built.art34_exemption_analysis;
    report.content_owner_mapping = built.content_owner_mapping;
    return {
      version: IR_DELIVERABLES_VERSION,
      ok: true,
      regimes: built.notification_duties.map((d) => d.regime),
      mixed_regime: built.notification_duties.length > 1,
      state_duties: built.state_notification_duties.map((d) => `${d.jurisdiction}:${d.verified ? "verified" : "to_be_confirmed"}`),
      regime_verdicts: built.notification_duties.map(
        (d) => `${d.regime}:${d.sa_notification_determination.verdict}/${d.data_subject_communication_determination.verdict}`,
      ),
      transfer_citations: built.notification_duties.map((d) => `${d.regime}:${d.transfer_framing.citation}`),
      sa_verdict: built.sa_notification_determination.verdict,
      ds_verdict: built.data_subject_communication_determination.verdict,
      high_risk: built.data_subject_communication_determination.high_risk_established,
      exemption_available: built.art34_exemption_analysis.any_exemption_available,
      exemption_verdicts: built.art34_exemption_analysis.limbs.map((l) => `${l.limb}:${l.verdict}`),
      content_elements_complete: built.content_owner_mapping.elements.filter((e) => e.status === "analysed").length,
      separation_repairs: built.notification_duties.reduce(
        (n, d) =>
          n + d.sa_notification_determination.separation_repairs +
          d.data_subject_communication_determination.separation_repairs,
        0,
      ),
    };
  } catch (e) {
    return { version: IR_DELIVERABLES_VERSION, ok: false, error: (e as Error)?.message ?? "unknown" };
  }
}
