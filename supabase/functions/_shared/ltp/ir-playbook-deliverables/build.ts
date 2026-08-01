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

export const IR_DELIVERABLES_VERSION = "ir-deliverables-item328-2026-08-01";

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
    whyRaw =
      `Notification to ${authority} is required, because the Article 33(1) exception is not made out on these facts. The clock and the filing deadline are computed separately in the awareness and deadline analysis and are not restated here.${f.processorInvolved ? ` A processor is involved${f.processorName ? ` (${f.processorName})` : ""}, so the Article 33(2) notification from processor to controller is part of the same record.` : ""}`;
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
    application =
      `Article 34(1) asks whether the breach is likely to result in a HIGH risk to the rights and freedoms of natural persons — a materially higher bar than Article 33(1)'s "a risk". On these facts the bar is reached: ${aggravating.map((x) => x.factor.toLowerCase()).join("; ")}. The consequences those facts point to fall on the individual directly, and no Article 34(3) limb removes them on this record. Communication is therefore required without undue delay, and under Article 34(2) it must describe in clear and plain language the nature of the breach and carry the Article 33(3)(b), (c) and (d) content.`;
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
    {
      element: "b_dpo_contact",
      citation: B.citation,
      requirement_verbatim: B.verbatim,
      owner: OWNERS.dpo,
      source_of_truth:
        "The controller's data protection officer appointment record, or where no DPO is appointed, the nominated breach contact point named in the incident response plan.",
      record_value: TO_BE_COMPLETED,
      status: "record_insufficient",
      information_needed:
        "The name and contact details of the data protection officer or other contact point from which the supervisory authority can obtain more information.",
    },
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

  return {
    elements,
    phasing,
    documentation,
    status: elements.every((e) => e.status === "analysed") && phasing.status === "analysed" && documentation.status === "analysed"
      ? "analysed"
      : "record_insufficient",
  };
}

// ---------------------------------------------------------------------
// Composite builder + attach
// ---------------------------------------------------------------------
export function buildIrPlaybookDeliverables(intake: unknown): IrPlaybookDeliverables {
  const sa = buildSaNotificationDetermination(intake);
  const exemptions = buildArt34ExemptionAnalysis(intake);
  const ds = buildDataSubjectCommunicationDetermination(intake, sa.verdict, exemptions.any_exemption_available);
  const mapping = buildContentOwnerMapping(intake);
  return {
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
    report.sa_notification_determination = built.sa_notification_determination;
    report.data_subject_communication_determination = built.data_subject_communication_determination;
    report.art34_exemption_analysis = built.art34_exemption_analysis;
    report.content_owner_mapping = built.content_owner_mapping;
    return {
      version: IR_DELIVERABLES_VERSION,
      ok: true,
      sa_verdict: built.sa_notification_determination.verdict,
      ds_verdict: built.data_subject_communication_determination.verdict,
      high_risk: built.data_subject_communication_determination.high_risk_established,
      exemption_available: built.art34_exemption_analysis.any_exemption_available,
      exemption_verdicts: built.art34_exemption_analysis.limbs.map((l) => `${l.limb}:${l.verdict}`),
      content_elements_complete: built.content_owner_mapping.elements.filter((e) => e.status === "analysed").length,
      separation_repairs:
        built.sa_notification_determination.separation_repairs +
        built.data_subject_communication_determination.separation_repairs,
    };
  } catch (e) {
    return { version: IR_DELIVERABLES_VERSION, ok: false, error: (e as Error)?.message ?? "unknown" };
  }
}
