/**
 * ITEM 317 — biometric analytic deliverables (pure builder).
 *
 * SINGLE-WRITER: this module is the only producer of the biometric findings.
 * It is a pure function of the intake record plus the verbatim duty registry;
 * it performs no I/O, reads no clock, and holds no module state.
 *
 * REUSE LAW: every `standard` string on every finding is read out of
 * `_shared/registry/biometric-verified-authorities.ts`, whose rows were
 * extracted by script from the APPROVED `provision_texts` rows Item 314
 * ingested. This file contains no statutory prose of its own.
 *
 * SEPARATION GUARD: `buildDutyFindings` never mentions penalties, damages,
 * private suits, or exposure. That material is produced exclusively by
 * `buildConsequence` and a pin test scans the duty findings to prove it.
 *
 * RESERVED-FRAMING LAW: 740 ILCS 14/20 is not in corpus. The builder may say
 * BIPA is enforced by private suit; every specific degrades.
 *
 * ITEM 323 (CEO-authorized 2026-08-01): RCW 19.373 (My Health My Data Act) is
 * IN SCOPE. It is built as a SECOND, DISTINCT Washington authority alongside
 * RCW 19.375 — its own statute key, its own duty findings, its own enforcement
 * surface, cited separately. The two are never merged into one combined
 * "Washington biometric law" section: an organisation can trigger 19.375
 * (enrollment of biometric identifiers for a commercial purpose), 19.373
 * (biometric data that identifies or infers health status), or both.
 */

import {
  BIOMETRIC_DUTY_VERSION,
  BIPA_PRA_CORPUS_STATUS,
  dutyRow,
} from "../../registry/biometric-verified-authorities.ts";
import type {
  BiometricDeliverables,
  BiometricNarrative,
  ConsequenceDetermination,
  DivergenceItem,
  DutyFinding,
  EntityCharacterization,
  ExposureSurface,
  IdentifierCharacterization,
  ScopeGatedCorpusFlag,
  StatuteKey,
  StatuteRef,
} from "./types.ts";

export const BIOMETRIC_DELIVERABLES_VERSION =
  `biometric-deliverables-item317-2026-07-31 (${BIOMETRIC_DUTY_VERSION})`;

// ── Intake surface actually read by this builder ─────────────────────────────

export interface BiometricIntakeForDeliverables {
  orgName?: string | null;
  biometricTypes?: string[] | null;
  orgType?: string | null;
  purpose?: string | null;
  jurisdictions?: string[] | null;
  other_state_names?: string | null;

  // Item 317 intake extension — what the organisation DOES about the data.
  data_source_description?: string | null;
  healthcare_tpo_context?: string | null;
  entity_is_government?: string | null;
  glba_financial_institution?: string | null;

  notice_before_collection?: string | null;
  consent_artifact_type?: string | null;
  release_artifact_description?: string | null;

  retention_schedule_text?: string | null;
  retention_policy_public?: string | null;
  destruction_trigger?: string | null;

  sells_or_profits?: string | null;
  disclosure_recipients?: string | null;
  disclosure_bases?: string[] | null;

  security_measures_description?: string | null;
  protection_parity?: string | null;

  tx_destruction_within_one_year?: string | null;
  tx_longer_retention_required_by_law?: string | null;
  tx_employer_security_collection?: string | null;
  tx_ai_training_use?: string | null;

  wa_enrolls_in_database?: string | null;
  wa_commercial_purpose?: string | null;
  wa_security_purpose_only?: string | null;

  // Item 323 — RCW 19.373 (MHMDA) predicate and duty facts. Kept in their own
  // block because they belong to a different Washington statute.
  wa_mhmda_health_inference?: string | null;
  wa_mhmda_privacy_policy_published?: string | null;
  wa_mhmda_collection_consent?: string | null;
  wa_mhmda_share_consent_separate?: string | null;
  wa_mhmda_geofence_health_facility?: string | null;
}

// ── Small pure helpers ───────────────────────────────────────────────────────

type Tri = "yes" | "no" | "unknown";

function tri(v: string | null | undefined): Tri {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "yes" || s === "true") return "yes";
  if (s === "no" || s === "false") return "no";
  return "unknown";
}

function txt(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
}

function listed(v: string[] | null | undefined): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
}

const STATUTES: Record<StatuteKey, StatuteRef> = {
  us_il_bipa: {
    statute_key: "us_il_bipa",
    statute_short: "BIPA",
    statute_long: "Illinois Biometric Information Privacy Act",
    jurisdiction: "Illinois",
  },
  us_tx_cubi: {
    statute_key: "us_tx_cubi",
    statute_short: "CUBI",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    jurisdiction: "Texas",
  },
  us_wa_19375: {
    statute_key: "us_wa_19375",
    statute_short: "RCW 19.375",
    statute_long: "Washington biometric identifiers chapter",
    jurisdiction: "Washington",
  },
  us_wa_19373: {
    statute_key: "us_wa_19373",
    statute_short: "RCW 19.373 (MHMDA)",
    statute_long: "Washington My Health My Data Act",
    jurisdiction: "Washington",
  },
};

/** Which of the three statutes the record actually puts in scope. */
export function statutesInScope(
  intake: BiometricIntakeForDeliverables,
): StatuteRef[] {
  const labels = listed(intake.jurisdictions).map((j) => j.toLowerCase());
  const other = (intake.other_state_names ?? "").toLowerCase();
  const hit = (needles: string[]) =>
    needles.some((n) => labels.some((l) => l.includes(n)) || other.includes(n));
  const out: StatuteRef[] = [];
  if (hit(["illinois", "bipa"])) out.push(STATUTES.us_il_bipa);
  if (hit(["texas", "cubi"])) out.push(STATUTES.us_tx_cubi);
  // DISTINCT-AUTHORITY LAW (Item 323): naming Washington puts BOTH Washington
  // statutes on the page as separate authorities. Whether each one's duties
  // actually attach is decided by that statute's own predicate, not here.
  if (hit(["washington"])) {
    out.push(STATUTES.us_wa_19375);
    out.push(STATUTES.us_wa_19373);
  }
  return out;
}

// ── Op. 1 — identifier characterization ──────────────────────────────────────

/**
 * Each statute's OWN enumeration. BIPA and CUBI enumerate closed lists; RCW
 * 19.375 uses an open "other unique biological patterns" formula. A data type
 * can therefore be an identifier in Washington and outside the definition in
 * Illinois — that divergence is named, never smoothed.
 */
const TYPE_MATCH: Record<
  StatuteKey,
  Array<{ match: RegExp; within: boolean; why: string }>
> = {
  us_il_bipa: [
    { match: /facial/i, within: true, why: "a scan of face geometry is enumerated" },
    { match: /fingerprint|palm/i, within: true, why: "fingerprint, and a scan of hand geometry, are enumerated" },
    { match: /voice/i, within: true, why: "voiceprint is enumerated" },
    { match: /iris|retina/i, within: true, why: "a retina or iris scan is enumerated" },
    { match: /gait/i, within: false, why: "gait is not one of the five enumerated identifiers and the definition is a closed list" },
    { match: /vein/i, within: false, why: "vein pattern is not one of the five enumerated identifiers and the definition is a closed list" },
  ],
  us_tx_cubi: [
    { match: /facial/i, within: true, why: "a record of face geometry is enumerated" },
    { match: /fingerprint|palm/i, within: true, why: "fingerprint, and a record of hand geometry, are enumerated" },
    { match: /voice/i, within: true, why: "voiceprint is enumerated" },
    { match: /iris|retina/i, within: true, why: "a retina or iris scan is enumerated" },
    { match: /gait/i, within: false, why: "gait is not enumerated and CUBI's definition is a closed list" },
    { match: /vein/i, within: false, why: "vein pattern is not enumerated and CUBI's definition is a closed list" },
  ],
  us_wa_19375: [
    { match: /facial/i, within: true, why: "an automatic measurement of a biological characteristic used to identify a specific individual" },
    { match: /fingerprint|palm/i, within: true, why: "fingerprint is named in the definition" },
    { match: /voice/i, within: true, why: "voiceprint is named in the definition" },
    { match: /iris|retina/i, within: true, why: "eye retinas and irises are named in the definition" },
    { match: /gait/i, within: true, why: "the definition is open-ended — \"other unique biological patterns or characteristics\" — and gait is measured automatically to identify an individual" },
    { match: /vein/i, within: true, why: "the definition is open-ended — \"other unique biological patterns or characteristics\"" },
  ],
  us_wa_19373: [
    { match: /facial/i, within: true, why: "imagery of the face from which an identifier template can be extracted is named" },
    { match: /fingerprint|palm/i, within: true, why: "imagery of the fingerprint, hand, and palm is named" },
    { match: /voice/i, within: true, why: "voice recordings from which an identifier template can be extracted are named" },
    { match: /iris|retina/i, within: true, why: "imagery of the iris and retina is named" },
    { match: /gait/i, within: true, why: "gait patterns or rhythms that contain identifying information are named expressly" },
    { match: /vein/i, within: true, why: "vein patterns are named expressly" },
  ],
};

const DEFINITION_ROW: Record<StatuteKey, string> = {
  us_il_bipa: "il_bipa.def_biometric_identifier",
  us_tx_cubi: "tx_cubi.def_biometric_identifier",
  us_wa_19375: "wa_19375.def_biometric_identifier",
  us_wa_19373: "wa_19373.def_biometric_data",
};

function photographicSource(intake: BiometricIntakeForDeliverables): boolean | null {
  const s = txt(intake.data_source_description);
  if (!s) return null;
  return /photograph|photo|image|video|cctv|camera footage/i.test(s);
}

function buildIdentifierCharacterizations(
  intake: BiometricIntakeForDeliverables,
  scope: StatuteRef[],
): IdentifierCharacterization[] {
  const types = listed(intake.biometricTypes);
  const photo = photographicSource(intake);
  const tpo = tri(intake.healthcare_tpo_context);
  const glba = tri(intake.glba_financial_institution);
  const aiTraining = tri(intake.tx_ai_training_use);
  const sourceFact = txt(intake.data_source_description) ??
    "the record does not describe how the data is generated";

  return scope.map((s) => {
    const def = dutyRow(DEFINITION_ROW[s.statute_key]);
    const rules = TYPE_MATCH[s.statute_key];

    const per_type = types.map((t) => {
      const rule = rules.find((r) => r.match.test(t));
      return {
        described_type: t,
        citation: def.pinpoint,
        within_enumeration: rule ? rule.within : null,
        reasoning: rule
          ? `Under ${def.pinpoint}, ${rule.why}.`
          : `"${t}" is not resolvable against ${def.pinpoint} on this record; the record does not describe what is measured or how.`,
      };
    });

    const exclusions_engaged: IdentifierCharacterization["exclusions_engaged"] = [];

    if (s.statute_key === "us_il_bipa") {
      exclusions_engaged.push({
        exclusion: "photographs",
        citation: def.pinpoint,
        standard: def.verbatim_quote,
        record_fact: sourceFact,
        // Unresolvable only where the source IS photographic — BIPA excludes
        // photographs but not in terms a scan derived from one. Where the
        // record describes no photographic source, the exclusion is simply
        // not engaged and must not hold the characterization open.
        engaged: photo === null ? null : (photo ? null : false),
        reasoning: photo === null
          ? "The record does not say whether the template is generated from photographic or video source material, so the photographs exclusion cannot be evaluated."
          : photo
          ? "The record describes photographic or video source material. BIPA excludes photographs from the definition; it does not in terms address a geometric scan derived from one, and this record cannot resolve which side of that line the organisation's template falls on."
          : "The record does not describe photographic or video source material.",
      });
      exclusions_engaged.push({
        exclusion: "health-care treatment, payment, or operations under HIPAA",
        citation: def.pinpoint,
        standard: def.verbatim_quote,
        record_fact: tpo === "unknown"
          ? "the record does not state whether the data is collected, used, or stored for health-care treatment, payment, or operations"
          : `the record states health-care treatment, payment, or operations context: ${tpo}`,
        engaged: tpo === "unknown" ? null : tpo === "yes",
        reasoning: tpo === "yes"
          ? "BIPA excludes information collected, used, or stored for health care treatment, payment, or operations under HIPAA, so the exclusion is engaged."
          : tpo === "no"
          ? "The HIPAA treatment-payment-operations exclusion is not engaged on this record."
          : "The HIPAA treatment-payment-operations exclusion cannot be evaluated on this record.",
      });
    }

    if (s.statute_key === "us_tx_cubi") {
      const ex = dutyRow("tx_cubi.e_exceptions");
      exclusions_engaged.push({
        exclusion: "voiceprint data retained by a financial institution",
        citation: ex.pinpoint,
        standard: ex.verbatim_quote,
        record_fact: `financial-institution status: ${glba}; described types: ${types.join(", ") || "none supplied"}`,
        engaged: glba === "unknown" ? null : glba === "yes" && types.some((t) => /voice/i.test(t)),
        reasoning: glba === "unknown"
          ? "Whether the organisation is a financial institution within 15 U.S.C. § 6809 is not on the record."
          : glba === "yes" && types.some((t) => /voice/i.test(t))
          ? "The record describes voiceprint data held by a financial institution, which § 503.001(e)(1) puts outside the section."
          : "The § 503.001(e)(1) voiceprint carve-out is not engaged on this record.",
      });
      exclusions_engaged.push({
        exclusion: "AI model training, unless used to uniquely identify a specific individual",
        citation: ex.pinpoint,
        standard: ex.verbatim_quote,
        record_fact: `AI-training use: ${aiTraining}; stated purpose: ${txt(intake.purpose) ?? "not supplied"}`,
        engaged: aiTraining === "unknown"
          ? null
          : aiTraining === "yes" && !/authentication|access control|surveillance|monitoring/i.test(intake.purpose ?? ""),
        reasoning: aiTraining === "yes"
          ? "The record describes biometric identifiers used in developing or training AI. The (e)(2) carve-out is lost where a system is used or deployed for the purpose of uniquely identifying a specific individual, and § 503.001(f) re-attaches the possession and destruction provisions on subsequent commercial use."
          : aiTraining === "no"
          ? "The AI-training carve-out is not engaged on this record."
          : "AI-training use is not on the record, so the (e)(2) carve-out cannot be evaluated.",
      });
    }

    if (s.statute_key === "us_wa_19375") {
      exclusions_engaged.push({
        exclusion: "physical or digital photograph, video or audio recording, or data generated therefrom",
        citation: def.pinpoint,
        standard: def.verbatim_quote,
        record_fact: sourceFact,
        engaged: photo === null ? null : photo,
        reasoning: photo === null
          ? "The record does not describe the source material, so the photograph and recording exclusion cannot be evaluated."
          : photo
          ? "The record describes photographic or video source material. RCW 19.375.010(1) excludes such recordings and, expressly, data generated from them — the exclusion reaches derived templates in terms."
          : "The record does not describe photographic, video, or audio source material.",
      });
      const excl = dutyRow("wa_19375.040_exclusions");
      exclusions_engaged.push({
        exclusion: "GLBA and HIPAA chapter-level exclusions",
        citation: excl.pinpoint,
        standard: excl.verbatim_quote,
        record_fact: `financial-institution status: ${glba}; health-care treatment, payment, or operations: ${tpo}`,
        engaged: glba === "unknown" && tpo === "unknown"
          ? null
          : glba === "yes" || tpo === "yes",
        reasoning: glba === "yes"
          ? "RCW 19.375.040(1) puts a financial institution subject to Title V of Gramm-Leach-Bliley outside the chapter entirely."
          : tpo === "yes"
          ? "RCW 19.375.040(2) puts activities subject to the federal health-privacy title outside the chapter."
          : glba === "unknown" && tpo === "unknown"
          ? "Neither exclusion can be evaluated on this record."
          : "Neither chapter-level exclusion is engaged on this record.",
      });
    }

    const anyWithin = per_type.some((p) => p.within_enumeration === true);
    const anyUnknown = per_type.some((p) => p.within_enumeration === null);
    const hardExclusion = exclusions_engaged.some((e) => e.engaged === true);
    const openExclusion = exclusions_engaged.some((e) => e.engaged === null);

    let verdict: IdentifierCharacterization["verdict"];
    let information_needed: string | undefined;
    if (types.length === 0) {
      verdict = "record_insufficient";
      information_needed = "The data types processed are not on the record.";
    } else if (hardExclusion) {
      verdict = "outside_definition";
    } else if (anyWithin && !openExclusion) {
      verdict = "within_definition";
    } else if (anyWithin && openExclusion) {
      verdict = "record_insufficient";
      information_needed =
        `At least one described type falls within ${def.pinpoint}, but a named exclusion cannot be evaluated: ` +
        exclusions_engaged.filter((e) => e.engaged === null).map((e) => e.exclusion).join("; ") + ".";
    } else if (anyUnknown) {
      verdict = "record_insufficient";
      information_needed = "The record does not describe what is measured closely enough to apply the definition.";
    } else {
      verdict = "outside_definition";
    }

    return {
      ...s,
      definition_citation: def.pinpoint,
      definition_standard: def.verbatim_quote,
      per_type,
      exclusions_engaged,
      record_fact: `Described types: ${types.join(", ") || "none supplied"}. Source: ${sourceFact}.`,
      application: per_type.map((p) => p.reasoning).join(" "),
      verdict,
      status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
      information_needed,
    };
  });
}

// ── Op. 2 — entity characterization ──────────────────────────────────────────

function reasonRole(intake: BiometricIntakeForDeliverables): {
  role: string;
  reasoning: string;
} {
  const label = txt(intake.orgType);
  const purpose = (intake.purpose ?? "").toLowerCase();
  const gov = tri(intake.entity_is_government);
  const employmentPurpose = /time & attendance|workforce|physical access control/.test(purpose);
  const employerLabel = /employer/i.test(label ?? "");

  if (gov === "yes") {
    return {
      role: "government body",
      reasoning:
        "The record states the organisation is a State or local government body. That characterisation, not the intake's sector label, is what the actor-scope provisions turn on.",
    };
  }
  if (employerLabel || employmentPurpose) {
    return {
      role: "private-sector employer processing its own workforce's biometrics",
      reasoning: employerLabel && employmentPurpose
        ? "The record describes an employer and a workforce-facing purpose, so the organisation collects from people in an employment relationship rather than from customers."
        : employerLabel
        ? "The record describes an employer; the stated purpose does not narrow that further, so the employment relationship governs the actor analysis."
        : `The stated purpose ("${txt(intake.purpose)}") is workforce-facing, so the subjects are people in an employment relationship even though the sector label supplied was "${label ?? "not supplied"}".`,
    };
  }
  if (/consumer app|platform/i.test(label ?? "") || /customer authentication/.test(purpose)) {
    return {
      role: "private-sector controller collecting from its own customers",
      reasoning:
        "The record describes collection from customers or app users for the organisation's own purposes, so it acts on its own account rather than on another entity's instructions.",
    };
  }
  if (/security \/ access control provider|research organisation/i.test(label ?? "")) {
    return {
      role: "private-sector service provider capturing biometrics on behalf of client organisations",
      reasoning:
        "The record describes a provider capturing biometrics in the course of a service to others. Each of the three statutes reaches the entity in possession of the identifier, so provider status does not remove it from actor scope.",
    };
  }
  return {
    role: "private entity of unspecified sector",
    reasoning: label
      ? `The record supplies the sector label "${label}" and nothing further about how the organisation stands to the data subjects.`
      : "The record supplies no sector or relationship information.",
  };
}

function buildEntityCharacterization(
  intake: BiometricIntakeForDeliverables,
  scope: StatuteRef[],
): EntityCharacterization {
  const gov = tri(intake.entity_is_government);
  const glba = tri(intake.glba_financial_institution);
  const { role, reasoning } = reasonRole(intake);

  const per_statute = scope.map((s) => {
    if (s.statute_key === "us_il_bipa") {
      const row = dutyRow("il_bipa.def_private_entity");
      return {
        ...s,
        citation: row.pinpoint,
        standard: row.verbatim_quote,
        record_fact: `Reasoned role: ${role}. Government body: ${gov}.`,
        application: gov === "yes"
          ? "A State or local government agency, and an Illinois court, clerk, judge, or justice, are excluded from \"private entity\", so § 15 does not reach this organisation."
          : gov === "no"
          ? "The organisation is not a State or local government agency or an Illinois court body, so it is a private entity and § 15 reaches it."
          : "Whether the organisation is a government body is not on the record, so private-entity status cannot be settled.",
        verdict: gov === "yes"
          ? ("outside_actor_scope" as const)
          : gov === "no"
          ? ("within_actor_scope" as const)
          : ("record_insufficient" as const),
        status: gov === "unknown" ? ("record_insufficient" as const) : ("analysed" as const),
        information_needed: gov === "unknown"
          ? "State whether the organisation is a State or local government agency or an Illinois court body."
          : undefined,
      };
    }
    if (s.statute_key === "us_tx_cubi") {
      const row = dutyRow("tx_cubi.b_notice_and_consent");
      const commercial = !/research or product development/i.test(intake.purpose ?? "");
      return {
        ...s,
        citation: row.pinpoint,
        standard: row.verbatim_quote,
        record_fact: `Reasoned role: ${role}. Stated purpose: ${txt(intake.purpose) ?? "not supplied"}.`,
        application: commercial
          ? "CUBI reaches a person who captures a biometric identifier for a commercial purpose; the described purpose is an operational business use, so the section reaches this organisation."
          : "The stated purpose is research or product development. Whether that is a commercial purpose within § 503.001(b) is not settled by the record.",
        verdict: commercial ? ("within_actor_scope" as const) : ("record_insufficient" as const),
        status: commercial ? ("analysed" as const) : ("record_insufficient" as const),
        information_needed: commercial
          ? undefined
          : "State whether the research or development activity is undertaken for a commercial purpose.",
      };
    }
    const row = dutyRow("wa_19375.def_person");
    const excl = dutyRow("wa_19375.040_exclusions");
    const out = gov === "yes" || glba === "yes";
    return {
      ...s,
      citation: `${row.pinpoint}; ${excl.pinpoint}`,
      standard: `${row.verbatim_quote}\n\n${excl.verbatim_quote}`,
      record_fact: `Reasoned role: ${role}. Government body: ${gov}. GLBA financial institution: ${glba}.`,
      application: gov === "yes"
        ? "\"Person\" excludes a government agency, so the chapter does not reach this organisation."
        : glba === "yes"
        ? "RCW 19.375.040(1) puts a financial institution subject to Title V of Gramm-Leach-Bliley outside the chapter in any manner."
        : gov === "unknown" || glba === "unknown"
        ? "The record does not settle government status or Gramm-Leach-Bliley coverage, either of which would remove the organisation from the chapter."
        : "The organisation is a non-governmental legal or commercial entity and neither chapter-level exclusion applies, so the chapter reaches it.",
      verdict: out
        ? ("outside_actor_scope" as const)
        : gov === "unknown" || glba === "unknown"
        ? ("record_insufficient" as const)
        : ("within_actor_scope" as const),
      status: !out && (gov === "unknown" || glba === "unknown")
        ? ("record_insufficient" as const)
        : ("analysed" as const),
      information_needed: !out && (gov === "unknown" || glba === "unknown")
        ? "State whether the organisation is a government agency and whether it is subject to Title V of Gramm-Leach-Bliley."
        : undefined,
    };
  });

  return {
    role,
    role_reasoning: reasoning,
    intake_label: txt(intake.orgType),
    per_statute,
  };
}

// ── Op. 3 — per-duty satisfaction ────────────────────────────────────────────

/** Disclosure bases the record may assert, and which statute's limbs accept them. */
const BASIS_LIMBS: Record<string, { il: boolean; tx: boolean; wa: boolean }> = {
  "No disclosures are made": { il: true, tx: true, wa: true },
  "Subject consent to the disclosure": { il: true, tx: false, wa: true },
  "Subject consent for identification on disappearance or death": { il: true, tx: true, wa: true },
  "Completes a financial transaction the subject requested or authorised": { il: true, tx: true, wa: true },
  "Required by law": { il: true, tx: true, wa: true },
  "Warrant or subpoena": { il: true, tx: true, wa: false },
  "Necessary to provide a product or service the subject requested": { il: false, tx: false, wa: true },
  "Third party contractually promises no further disclosure": { il: false, tx: false, wa: true },
  "To prepare for or respond to litigation": { il: false, tx: false, wa: true },
};

function disclosureVerdict(
  bases: string[],
  limb: "il" | "tx" | "wa",
): { verdict: "satisfied" | "not_satisfied" | "record_insufficient"; offending: string[] } {
  if (bases.length === 0) return { verdict: "record_insufficient", offending: [] };
  if (bases.length === 1 && bases[0] === "No disclosures are made") {
    return { verdict: "satisfied", offending: [] };
  }
  const offending = bases.filter((b) => {
    const row = BASIS_LIMBS[b];
    return !row || !row[limb];
  });
  return { verdict: offending.length > 0 ? "not_satisfied" : "satisfied", offending };
}

function mk(
  statute: StatuteRef,
  rowId: string,
  label: string,
  record_fact: string,
  application: string,
  verdict: DutyFinding["verdict"],
  information_needed?: string,
  qualifiers_applied: DutyFinding["qualifiers_applied"] = [],
): DutyFinding {
  const row = dutyRow(rowId);
  return {
    key: rowId,
    label,
    citation: row.pinpoint,
    standard: row.verbatim_quote,
    statute_key: statute.statute_key,
    statute_short: statute.statute_short,
    record_fact,
    application,
    verdict,
    status: verdict === "record_insufficient" ? "record_insufficient" : "analysed",
    information_needed,
    qualifiers_applied,
  };
}

function buildIlDuties(
  intake: BiometricIntakeForDeliverables,
): DutyFinding[] {
  const s = STATUTES.us_il_bipa;
  const schedule = txt(intake.retention_schedule_text);
  const isPublic = tri(intake.retention_policy_public);
  const trigger = txt(intake.destruction_trigger);
  const notice = txt(intake.notice_before_collection);
  const consent = txt(intake.consent_artifact_type);
  const profits = tri(intake.sells_or_profits);
  const bases = listed(intake.disclosure_bases);
  const recipients = txt(intake.disclosure_recipients);
  const security = txt(intake.security_measures_description);
  const parity = tri(intake.protection_parity);
  const out: DutyFinding[] = [];

  out.push(mk(
    s,
    "il_bipa.15a_written_policy",
    "Public written retention-and-destruction policy",
    schedule
      ? `The record supplies a retention schedule: "${schedule}". Made available to the public: ${isPublic}.`
      : `The record supplies no retention schedule text. Made available to the public: ${isPublic}.`,
    schedule && isPublic === "yes"
      ? "The record describes a written retention schedule with destruction guidelines and states it is available to the public, which is what § 15(a) requires."
      : isPublic === "no"
      ? "§ 15(a) requires the policy to be made available to the public. The record states it is not."
      : schedule
      ? "The record describes a schedule but does not establish that it is made available to the public, which § 15(a) requires in terms."
      : "§ 15(a) requires a written policy establishing a retention schedule and destruction guidelines. The record does not describe one.",
    schedule && isPublic === "yes"
      ? "satisfied"
      : isPublic === "no"
      ? "not_satisfied"
      : "record_insufficient",
    schedule && isPublic === "yes"
      ? undefined
      : "Supply the written retention schedule and destruction guidelines, and state where the policy is made available to the public.",
  ));

  out.push(mk(
    s,
    "il_bipa.15a_comply_with_schedule",
    "Compliance with the established retention schedule",
    trigger
      ? `Destruction trigger described: "${trigger}".`
      : "The record describes no destruction trigger.",
    !schedule
      ? "The duty to comply with an established schedule presupposes one. The record establishes no schedule, so compliance cannot be shown."
      : trigger
      ? `The record describes an operative destruction trigger, which is what compliance with the established schedule consists of on these facts. § 15(a) qualifies the duty only by a valid warrant or subpoena.`
      : "The record establishes a schedule but describes no trigger on which destruction actually occurs, so compliance cannot be assessed.",
    !schedule ? "not_satisfied" : trigger ? "satisfied" : "record_insufficient",
    !schedule || trigger
      ? undefined
      : "State the event on which biometric identifiers are actually destroyed and how that is evidenced.",
  ));

  const writtenNotice = /writing|written/i.test(notice ?? "");
  const noNotice = /^no notice/i.test(notice ?? "");
  const releaseOk = /standalone written release|electronic signature|condition of employment|onboarding/i.test(consent ?? "");
  const noConsent = /none|no consent/i.test(consent ?? "");
  out.push(mk(
    s,
    "il_bipa.15b_notice_and_written_release",
    "Written notice and written release before collection",
    `Notice before collection: ${notice ?? "not supplied"}. Consent artifact: ${consent ?? "not supplied"}. Release description: ${txt(intake.release_artifact_description) ?? "not supplied"}.`,
    noNotice || noConsent
      ? "§ 15(b) permits collection only where the entity first informs the subject in writing of the fact and of the specific purpose and length of term, and receives a written release. The record does not describe both."
      : writtenNotice && releaseOk
      ? `The record describes notice given in writing before collection and a release within the § 15(a)-(e) definition of "written release" — informed written consent, an electronic signature, or, in employment, a release executed as a condition of employment. Whether the notice states the specific purpose AND the length of term is the point on which § 15(b)(2) turns.`
      : writtenNotice
      ? "Notice is described in writing, but the record does not describe a release that answers the definition of \"written release\"."
      : "§ 15(b)(1) and (2) require the information to be given in writing. The record does not establish that it was.",
    noNotice || noConsent
      ? "not_satisfied"
      : writtenNotice && releaseOk
      ? "satisfied"
      : "record_insufficient",
    (noNotice || noConsent) || (writtenNotice && releaseOk)
      ? undefined
      : "Supply the written notice text (fact of collection, specific purpose, and length of term) and describe the release instrument the subject executes.",
  ));

  out.push(mk(
    s,
    "il_bipa.15c_no_profit",
    "No sale, lease, trade, or other profit",
    `The record states sale, lease, trade, or other profit from biometric data: ${profits}.`,
    profits === "yes"
      ? "§ 15(c) is an unqualified prohibition — it admits no consent exception. The record describes conduct within it."
      : profits === "no"
      ? "The record describes no sale, lease, trade, or other profit from the biometric data."
      : "Whether the organisation profits from the biometric data is not on the record.",
    profits === "yes" ? "not_satisfied" : profits === "no" ? "satisfied" : "record_insufficient",
    profits === "unknown"
      ? "State whether biometric identifiers or information are sold, leased, traded, or otherwise turned to profit."
      : undefined,
  ));

  const il = disclosureVerdict(bases, "il");
  out.push(mk(
    s,
    "il_bipa.15d_disclosure_limits",
    "Disclosure and redisclosure limits",
    `Recipients: ${recipients ?? "not supplied"}. Bases asserted: ${bases.join("; ") || "none supplied"}.`,
    il.verdict === "not_satisfied"
      ? `§ 15(d) admits four bases only: subject consent, completion of a financial transaction the subject requested or authorised, a State, federal, or municipal law requirement, and a valid warrant or subpoena. The record asserts ${il.offending.map((o) => `"${o}"`).join(", ")}, which ${il.offending.length === 1 ? "is not one of them" : "are not among them"}.`
      : il.verdict === "satisfied"
      ? "Each basis the record asserts falls within one of the four limbs § 15(d) allows."
      : "The record does not state on what basis biometric data is disclosed.",
    il.verdict,
    il.verdict === "record_insufficient"
      ? "State the recipients of any disclosure and the basis relied on for each."
      : undefined,
  ));

  out.push(mk(
    s,
    "il_bipa.15e_reasonable_care",
    "Reasonable standard of care in storage and transmission",
    `Security measures: ${security ?? "not supplied"}. Parity with other confidential and sensitive information: ${parity}.`,
    parity === "no"
      ? "§ 15(e)(2) requires protection at least as protective as the manner in which the entity protects other confidential and sensitive information. The record states it is not."
      : security && parity === "yes"
      ? "The record describes protective measures and states parity with the treatment of other confidential and sensitive information, which is the second limb of § 15(e)."
      : "The record does not establish both limbs of § 15(e) — industry-standard care, and parity with the entity's treatment of other confidential and sensitive information.",
    parity === "no" ? "not_satisfied" : security && parity === "yes" ? "satisfied" : "record_insufficient",
    parity === "no" || (security && parity === "yes")
      ? undefined
      : "Describe the storage and transmission controls and state how they compare with the controls applied to other confidential and sensitive information.",
  ));

  return out;
}

function buildTxDuties(intake: BiometricIntakeForDeliverables): DutyFinding[] {
  const s = STATUTES.us_tx_cubi;
  const notice = txt(intake.notice_before_collection);
  const consent = txt(intake.consent_artifact_type);
  const bases = listed(intake.disclosure_bases);
  const recipients = txt(intake.disclosure_recipients);
  const security = txt(intake.security_measures_description);
  const parity = tri(intake.protection_parity);
  const withinYear = tri(intake.tx_destruction_within_one_year);
  const longerLaw = tri(intake.tx_longer_retention_required_by_law);
  const employerSecurity = tri(intake.tx_employer_security_collection);
  const photo = photographicSource(intake);
  const out: DutyFinding[] = [];

  const noNotice = /^no notice/i.test(notice ?? "");
  const noConsent = /none|no consent/i.test(consent ?? "");
  const b1 = dutyRow("tx_cubi.b1_public_media_qualifier");
  out.push(mk(
    s,
    "tx_cubi.b_notice_and_consent",
    "Notice and consent before capture for a commercial purpose",
    `Notice before capture: ${notice ?? "not supplied"}. Consent artifact: ${consent ?? "not supplied"}.`,
    noNotice || noConsent
      ? "§ 503.001(b) permits capture only where the person informs the individual before capture and receives consent. The record does not describe both."
      : notice && consent
      ? "The record describes notice before capture and consent to the capture. CUBI, unlike BIPA, does not require the notice or the consent to be in writing, so the described practice answers the subsection."
      : "The record does not establish both limbs of § 503.001(b).",
    noNotice || noConsent ? "not_satisfied" : notice && consent ? "satisfied" : "record_insufficient",
    (noNotice || noConsent) || (notice && consent)
      ? undefined
      : "State whether the individual is informed before capture and how consent is obtained.",
    photo
      ? [{
        citation: b1.pinpoint,
        standard: b1.verbatim_quote,
        record_fact: `Source material described as photographic or video: ${txt(intake.data_source_description)}.`,
        effect:
          "Because the record describes imagery, (b-1) is engaged: the existence of an image containing the identifier on the internet or another publicly available source does not itself supply notice or consent unless the individual made it publicly available.",
      }]
      : [],
  ));

  const tx = disclosureVerdict(bases, "tx");
  out.push(mk(
    s,
    "tx_cubi.c1_disclosure_limits",
    "No sale, lease, or other disclosure except as listed",
    `Recipients: ${recipients ?? "not supplied"}. Bases asserted: ${bases.join("; ") || "none supplied"}.`,
    tx.verdict === "not_satisfied"
      ? `§ 503.001(c)(1) allows disclosure on four bases only, and its consent limb is narrow: consent "to the disclosure for identification purposes in the event of the individual's disappearance or death". The record asserts ${tx.offending.map((o) => `"${o}"`).join(", ")}, which ${tx.offending.length === 1 ? "does not fall" : "do not fall"} within any of them.`
      : tx.verdict === "satisfied"
      ? "Each basis the record asserts falls within one of the four limbs § 503.001(c)(1) allows."
      : "The record does not state on what basis biometric identifiers are disclosed.",
    tx.verdict,
    tx.verdict === "record_insufficient"
      ? "State the recipients of any disclosure and the basis relied on for each."
      : undefined,
  ));

  out.push(mk(
    s,
    "tx_cubi.c2_reasonable_care",
    "Reasonable care in storage and transmission",
    `Security measures: ${security ?? "not supplied"}. Parity with other confidential information: ${parity}.`,
    parity === "no"
      ? "§ 503.001(c)(2) requires protection at least as protective as the manner in which the person protects any other confidential information it possesses. The record states it is not."
      : security && parity === "yes"
      ? "The record describes reasonable care and parity with the treatment of other confidential information, which is what (c)(2) requires."
      : "The record does not establish both limbs of § 503.001(c)(2).",
    parity === "no" ? "not_satisfied" : security && parity === "yes" ? "satisfied" : "record_insufficient",
    parity === "no" || (security && parity === "yes")
      ? undefined
      : "Describe the storage and transmission controls and how they compare with controls on other confidential information.",
  ));

  const quals: DutyFinding["qualifiers_applied"] = [];
  if (longerLaw === "yes") {
    const q = dutyRow("tx_cubi.c1_qualifier_other_law");
    quals.push({
      citation: q.pinpoint,
      standard: q.verbatim_quote,
      record_fact: "The record states another law requires the associated instrument or document to be maintained for longer than the (c)(3) period.",
      effect: "The clock runs instead from the date the instrument or document is no longer required by law to be maintained, so the (c)(3) anniversary is displaced.",
    });
  }
  if (employerSecurity === "yes") {
    const q = dutyRow("tx_cubi.c2_qualifier_employer");
    quals.push({
      citation: q.pinpoint,
      standard: q.verbatim_quote,
      record_fact: "The record states the identifiers were collected for security purposes by an employer.",
      effect: "The purpose for collecting is presumed to expire on termination of the employment relationship, which is the event that starts the (c)(3) period.",
    });
  }
  out.push(mk(
    s,
    "tx_cubi.c3_one_year_destruction",
    "Destruction within one year of expiry of the collection purpose",
    `Destruction within one year of purpose expiry: ${withinYear}. Longer retention required by other law: ${longerLaw}. Employer security collection: ${employerSecurity}.`,
    withinYear === "yes"
      ? "The record describes destruction within a reasonable time and no later than the first anniversary of the date the collection purpose expires, which is the (c)(3) standard."
      : withinYear === "no" && longerLaw === "yes"
      ? "The record describes retention past the (c)(3) anniversary and also states another law requires the associated document to be kept longer. (c-1) may displace the clock, but the record does not supply the date that document ceases to be required, so the position cannot be resolved."
      : withinYear === "no"
      ? "The record describes retention past the first anniversary of the date the collection purpose expires, and no (c-1) qualifier is asserted."
      : "Whether destruction occurs within the (c)(3) period is not on the record.",
    withinYear === "yes"
      ? "satisfied"
      : withinYear === "no" && longerLaw === "yes"
      ? "record_insufficient"
      : withinYear === "no"
      ? "not_satisfied"
      : "record_insufficient",
    withinYear === "yes" || (withinYear === "no" && longerLaw !== "yes")
      ? undefined
      : withinYear === "no"
      ? "Identify the instrument or document, the other law requiring its retention, and the date it ceases to be required."
      : "State when the collection purpose expires and when identifiers are destroyed relative to that date.",
    quals,
  ));

  return out;
}

function buildWaDuties(intake: BiometricIntakeForDeliverables): DutyFinding[] {
  const s = STATUTES.us_wa_19375;
  const enrolls = tri(intake.wa_enrolls_in_database);
  const commercial = tri(intake.wa_commercial_purpose);
  const securityOnly = tri(intake.wa_security_purpose_only);
  const notice = txt(intake.notice_before_collection);
  const consent = txt(intake.consent_artifact_type);
  const bases = listed(intake.disclosure_bases);
  const security = txt(intake.security_measures_description);
  const trigger = txt(intake.destruction_trigger);
  const out: DutyFinding[] = [];

  const enrollRow = dutyRow("wa_19375.def_enroll");
  const cpRow = dutyRow("wa_19375.def_commercial_purpose");
  const carveOut = dutyRow("wa_19375.020_7_security_purpose_carveout");
  const gate = enrolls === "no" || commercial === "no"
    ? "outside"
    : enrolls === "unknown" || commercial === "unknown"
    ? "unknown"
    : "inside";

  const gateQualifier = [{
    citation: `${enrollRow.pinpoint}; ${cpRow.pinpoint}`,
    standard: `${enrollRow.verbatim_quote}\n\n${cpRow.verbatim_quote}`,
    record_fact: `Enrolls in a database: ${enrolls}. Commercial purpose as defined: ${commercial}.`,
    effect: gate === "outside"
      ? "The chapter's operative duties attach to enrollment for a commercial purpose. On this record one of those two elements is absent, so the duties do not attach."
      : gate === "unknown"
      ? "Both elements must be established before the operative duties attach, and the record settles neither."
      : "Both elements are established, so the operative duties attach.",
  }];

  const notApplicableFor = (rowId: string, label: string) =>
    mk(
      s,
      rowId,
      label,
      `Enrolls in a database: ${enrolls}. Commercial purpose: ${commercial}.`,
      "The duty attaches only to enrollment of a biometric identifier for a commercial purpose as those terms are defined in RCW 19.375.010. That predicate is not met on this record.",
      "not_applicable",
      undefined,
      gateQualifier,
    );
  const insufficientFor = (rowId: string, label: string) =>
    mk(
      s,
      rowId,
      label,
      `Enrolls in a database: ${enrolls}. Commercial purpose: ${commercial}.`,
      "Whether the duty attaches turns on enrollment for a commercial purpose, and the record settles neither element.",
      "record_insufficient",
      "State whether biometric identifiers are converted to reference templates and stored in a matching database, and whether that is done for a commercial purpose as RCW 19.375.010(4) defines it.",
      gateQualifier,
    );

  const duties: Array<[string, string]> = [
    ["wa_19375.020_1_enrollment_notice_consent", "Notice, consent, or opt-out mechanism before commercial enrollment"],
    ["wa_19375.020_3_disclosure_limits", "Disclosure limits absent consent"],
    ["wa_19375.020_4_care_and_retention", "Reasonable care and retention limit"],
    ["wa_19375.020_5_material_inconsistency", "No materially inconsistent use or disclosure without new consent"],
  ];
  if (gate !== "inside") {
    return duties.map(([id, label]) =>
      gate === "outside" ? notApplicableFor(id, label) : insufficientFor(id, label)
    );
  }

  const noticeRow = dutyRow("wa_19375.020_2_notice_standard");
  const hasNotice = !!notice && !/^no notice/i.test(notice);
  const hasConsent = !!consent && !/none|no consent/i.test(consent);
  out.push(mk(
    s,
    "wa_19375.020_1_enrollment_notice_consent",
    "Notice, consent, or opt-out mechanism before commercial enrollment",
    `Notice: ${notice ?? "not supplied"}. Consent artifact: ${consent ?? "not supplied"}. Security purpose only: ${securityOnly}.`,
    securityOnly === "yes"
      ? "RCW 19.375.020(7) provides that nothing in the section requires notice and consent where enrollment is in furtherance of a security purpose, and the record describes only a security purpose."
      : hasNotice || hasConsent
      ? "Subsection (1) is satisfied by any one of three routes — notice, consent, or a mechanism preventing subsequent commercial use. The record describes at least one, which is why Washington can be satisfied on facts that leave BIPA § 15(b) unsatisfied."
      : "The record describes none of the three routes the subsection allows.",
    securityOnly === "yes"
      ? "not_applicable"
      : hasNotice || hasConsent
      ? "satisfied"
      : notice === null && consent === null
      ? "record_insufficient"
      : "not_satisfied",
    !securityOnly && !hasNotice && !hasConsent && notice === null && consent === null
      ? "State which of notice, consent, or an opt-out mechanism is provided before enrollment."
      : undefined,
    securityOnly === "yes"
      ? [{
        citation: carveOut.pinpoint,
        standard: carveOut.verbatim_quote,
        record_fact: "The record states enrollment is in furtherance of a security purpose only.",
        effect: "The notice-and-consent requirement does not attach on those facts.",
      }]
      : [{
        citation: noticeRow.pinpoint,
        standard: noticeRow.verbatim_quote,
        record_fact: `Notice described: ${notice ?? "not supplied"}.`,
        effect: "Notice must be given through a procedure reasonably designed to be readily available to affected individuals; the exact notice and type of consent is context-dependent.",
      }],
  ));

  const wa = disclosureVerdict(bases, "wa");
  out.push(mk(
    s,
    "wa_19375.020_3_disclosure_limits",
    "Disclosure limits absent consent",
    `Bases asserted: ${bases.join("; ") || "none supplied"}.`,
    wa.verdict === "not_satisfied"
      ? `RCW 19.375.020(3) permits disclosure without consent on six listed bases. The record asserts ${wa.offending.map((o) => `"${o}"`).join(", ")}, which ${wa.offending.length === 1 ? "is not among them" : "are not among them"}.`
      : wa.verdict === "satisfied"
      ? "Each basis the record asserts is either consent or one of the six bases subsection (3) lists."
      : "The record does not state on what basis enrolled identifiers are disclosed.",
    wa.verdict,
    wa.verdict === "record_insufficient"
      ? "State the recipients of any disclosure and the basis relied on for each."
      : undefined,
  ));

  out.push(mk(
    s,
    "wa_19375.020_4_care_and_retention",
    "Reasonable care and retention limit",
    `Security measures: ${security ?? "not supplied"}. Destruction trigger: ${trigger ?? "not supplied"}.`,
    security && trigger
      ? "The record describes measures guarding against unauthorised access and a retention practice tied to the services for which the identifier was enrolled. Subsection (4)(b) measures retention by reasonable necessity, not by a fixed period, so no anniversary applies here."
      : "Subsection (4) has two limbs — reasonable care, and retention no longer than reasonably necessary for the three listed ends. The record does not establish both.",
    security && trigger ? "satisfied" : "record_insufficient",
    security && trigger
      ? undefined
      : "Describe the safeguards against unauthorised access and the point at which enrolled identifiers cease to be retained.",
  ));

  out.push(mk(
    s,
    "wa_19375.020_5_material_inconsistency",
    "No materially inconsistent use or disclosure without new consent",
    `Original terms of provision: ${txt(intake.release_artifact_description) ?? "not supplied"}. Current stated purpose: ${txt(intake.purpose) ?? "not supplied"}.`,
    "Subsection (5) is measured against the terms under which the identifier was originally provided. The record does not set out those original terms alongside current use, so material inconsistency cannot be assessed either way.",
    "record_insufficient",
    "Supply the terms under which identifiers were originally provided and state whether current use or disclosure departs from them.",
  ));

  return out;
}

// ── Op. 4 — divergence ───────────────────────────────────────────────────────

function buildDivergence(
  scope: StatuteRef[],
  identifiers: IdentifierCharacterization[],
  duties: DutyFinding[],
): DivergenceItem[] {
  const keys = new Set(scope.map((s) => s.statute_key));
  const has = (k: StatuteKey) => keys.has(k);
  const items: DivergenceItem[] = [];
  const find = (id: string) => duties.find((d) => d.key === id);
  const verdictOf = (id: string) => find(id)?.verdict ?? "record_insufficient";

  // (a) definitional divergence — emitted only where the verdicts actually differ.
  const verdicts = new Map(identifiers.map((i) => [i.statute_key, i.verdict]));
  if (identifiers.length > 1 && new Set(identifiers.map((i) => i.verdict)).size > 1) {
    items.push({
      key: "definitional_reach",
      topic: "Whether the described data is a biometric identifier at all",
      statutes: identifiers.map((i) => i.statute_key),
      positions: identifiers.map((i) => ({
        statute_short: i.statute_short,
        citation: i.definition_citation,
        standard: i.definition_standard,
        position: i.verdict === "within_definition"
          ? "the described data falls within this statute's definition"
          : i.verdict === "outside_definition"
          ? "the described data falls outside this statute's definition"
          : "this statute's definition cannot be applied on the record as supplied",
      })),
      no_analogue_in: [],
      record_consequence:
        "The three definitions are not interchangeable. " +
        identifiers.map((i) => `${i.statute_short}: ${verdicts.get(i.statute_key)}`).join("; ") +
        ". A single data type can be regulated in one of these states and untouched in another, so a control designed to the narrowest definition will not discharge the broadest.",
    });
  }

  // (b) the one-year clock — CUBI only.
  if (has("us_tx_cubi") && (has("us_il_bipa") || has("us_wa_19375"))) {
    const positions: DivergenceItem["positions"] = [{
      statute_short: "CUBI",
      citation: dutyRow("tx_cubi.c3_one_year_destruction").pinpoint,
      standard: dutyRow("tx_cubi.c3_one_year_destruction").verbatim_quote,
      position: "a fixed outer limit: destruction no later than the first anniversary of the date the collection purpose expires, qualified by (c-1) where another law requires longer retention and by (c-2) where an employer collected for security purposes",
    }];
    const noAnalogue: string[] = [];
    if (has("us_il_bipa")) {
      positions.push({
        statute_short: "BIPA",
        citation: dutyRow("il_bipa.15a_written_policy").pinpoint,
        standard: dutyRow("il_bipa.15a_written_policy").verbatim_quote,
        position: "no fixed destruction anniversary — a written public policy establishing a schedule, running to the earlier of purpose satisfaction or three years from last interaction",
      });
      noAnalogue.push("BIPA");
    }
    if (has("us_wa_19375")) {
      positions.push({
        statute_short: "RCW 19.375",
        citation: dutyRow("wa_19375.020_4_care_and_retention").pinpoint,
        standard: dutyRow("wa_19375.020_4_care_and_retention").verbatim_quote,
        position: "no fixed period at all — retention no longer than reasonably necessary for the three listed ends",
      });
      noAnalogue.push("RCW 19.375");
    }
    items.push({
      key: "destruction_clock",
      topic: "The destruction clock and its qualifiers",
      statutes: scope.map((s) => s.statute_key).filter((k) => k === "us_tx_cubi" || has(k)),
      positions,
      no_analogue_in: noAnalogue,
      record_consequence: `CUBI's one-year rule, and its (c-1) and (c-2) qualifiers, have no analogue in ${noAnalogue.join(" or ")}. On this record CUBI § 503.001(c)(3) is ${verdictOf("tx_cubi.c3_one_year_destruction")}` +
        (has("us_il_bipa") ? `, while BIPA § 15(a) is ${verdictOf("il_bipa.15a_written_policy")}` : "") +
        (has("us_wa_19375") ? `, and RCW 19.375.020(4) is ${verdictOf("wa_19375.020_4_care_and_retention")}` : "") +
        ". A retention rule written to satisfy the Illinois policy duty does not by itself meet the Texas anniversary.",
    });
  }

  // (c) consent form — BIPA writing requirement vs CUBI vs WA's three routes.
  if (keys.size > 1) {
    const positions: DivergenceItem["positions"] = [];
    if (has("us_il_bipa")) {
      const r = dutyRow("il_bipa.15b_notice_and_written_release");
      positions.push({
        statute_short: "BIPA",
        citation: r.pinpoint,
        standard: r.verbatim_quote,
        position: "notice in writing AND a written release — consent must take a documentary form",
      });
    }
    if (has("us_tx_cubi")) {
      const r = dutyRow("tx_cubi.b_notice_and_consent");
      positions.push({
        statute_short: "CUBI",
        citation: r.pinpoint,
        standard: r.verbatim_quote,
        position: "inform before capture and receive consent — no writing requirement stated",
      });
    }
    if (has("us_wa_19375")) {
      const r = dutyRow("wa_19375.020_1_enrollment_notice_consent");
      positions.push({
        statute_short: "RCW 19.375",
        citation: r.pinpoint,
        standard: r.verbatim_quote,
        position: "notice, OR consent, OR a mechanism preventing subsequent commercial use — consent is not always required",
      });
    }
    if (positions.length > 1) {
      items.push({
        key: "consent_form",
        topic: "What the permission to collect must look like",
        statutes: scope.map((s) => s.statute_key),
        positions,
        no_analogue_in: [],
        record_consequence: `On this record: ` +
          [
            has("us_il_bipa") ? `BIPA § 15(b) ${verdictOf("il_bipa.15b_notice_and_written_release")}` : null,
            has("us_tx_cubi") ? `CUBI § 503.001(b) ${verdictOf("tx_cubi.b_notice_and_consent")}` : null,
            has("us_wa_19375") ? `RCW 19.375.020(1) ${verdictOf("wa_19375.020_1_enrollment_notice_consent")}` : null,
          ].filter(Boolean).join("; ") +
          ". Because Illinois is the only one of the three that requires a documentary release, an oral or interface-level consent practice can clear Texas and Washington and still fail Illinois.",
      });
    }
  }

  // (d) disclosure limbs — the consent limbs are not the same limb.
  if (has("us_il_bipa") && has("us_tx_cubi")) {
    items.push({
      key: "disclosure_consent_limb",
      topic: "Whether subject consent is a general disclosure basis",
      statutes: ["us_il_bipa", "us_tx_cubi"],
      positions: [
        {
          statute_short: "BIPA",
          citation: dutyRow("il_bipa.15d_disclosure_limits").pinpoint,
          standard: dutyRow("il_bipa.15d_disclosure_limits").verbatim_quote,
          position: "consent to the disclosure or redisclosure is a general basis",
        },
        {
          statute_short: "CUBI",
          citation: dutyRow("tx_cubi.c1_disclosure_limits").pinpoint,
          standard: dutyRow("tx_cubi.c1_disclosure_limits").verbatim_quote,
          position: "consent is a basis only for identification in the event of the individual's disappearance or death",
        },
      ],
      no_analogue_in: [],
      record_consequence: `On this record BIPA § 15(d) is ${verdictOf("il_bipa.15d_disclosure_limits")} and CUBI § 503.001(c)(1) is ${verdictOf("tx_cubi.c1_disclosure_limits")}. A consent-based disclosure programme built for Illinois does not transfer to Texas, where consent reaches only the disappearance-or-death case.`,
    });
  }

  // (e) no-profit ban — BIPA only.
  if (has("us_il_bipa") && keys.size > 1) {
    items.push({
      key: "no_profit_ban",
      topic: "An absolute bar on profiting from biometric data",
      statutes: scope.map((s) => s.statute_key),
      positions: [{
        statute_short: "BIPA",
        citation: dutyRow("il_bipa.15c_no_profit").pinpoint,
        standard: dutyRow("il_bipa.15c_no_profit").verbatim_quote,
        position: "an unqualified prohibition on selling, leasing, trading, or otherwise profiting, admitting no consent exception",
      }],
      no_analogue_in: [
        has("us_tx_cubi") ? "CUBI" : null,
        has("us_wa_19375") ? "RCW 19.375" : null,
      ].filter((x): x is string => !!x),
      record_consequence: `Texas and Washington regulate disclosure and permit some of it on listed bases; Illinois additionally bars profit outright. On this record BIPA § 15(c) is ${verdictOf("il_bipa.15c_no_profit")}.`,
    });
  }

  // (f) security-purpose carve-out — Washington only.
  if (has("us_wa_19375") && keys.size > 1) {
    items.push({
      key: "security_purpose_carveout",
      topic: "A security-purpose carve-out from notice and consent",
      statutes: scope.map((s) => s.statute_key),
      positions: [{
        statute_short: "RCW 19.375",
        citation: dutyRow("wa_19375.020_7_security_purpose_carveout").pinpoint,
        standard: dutyRow("wa_19375.020_7_security_purpose_carveout").verbatim_quote,
        position: "notice and consent are not required where enrollment is in furtherance of a security purpose",
      }],
      no_analogue_in: [
        has("us_il_bipa") ? "BIPA" : null,
        has("us_tx_cubi") ? "CUBI" : null,
      ].filter((x): x is string => !!x),
      record_consequence:
        "Washington's carve-out is a genuine exemption from the permission duty. Illinois has none: an access-control deployment that needs no Washington consent still needs an Illinois written release. Texas has no security carve-out either, though (c-2) uses employer security collection to fix when the destruction clock starts.",
    });
  }

  return items;
}

// ── Op. 5 — consequence ──────────────────────────────────────────────────────

function buildConsequence(
  scope: StatuteRef[],
  duties: DutyFinding[],
): ConsequenceDetermination {
  const unlawful_now = duties
    .filter((d) => d.verdict === "not_satisfied")
    .map((d) => ({
      statute_short: d.statute_short,
      citation: d.citation,
      duty: d.label,
      why: d.application,
    }));

  const unresolved_on_record = duties
    .filter((d) => d.verdict === "record_insufficient")
    .map((d) => ({
      statute_short: d.statute_short,
      citation: d.citation,
      duty: d.label,
      information_needed: d.information_needed ?? "The record does not supply the facts this duty turns on.",
    }));

  const exposure_surfaces: ExposureSurface[] = [];
  for (const s of scope) {
    if (s.statute_key === "us_il_bipa") {
      exposure_surfaces.push({
        ...s,
        citation: BIPA_PRA_CORPUS_STATUS.citation,
        standard: null,
        mechanism: BIPA_PRA_CORPUS_STATUS.permitted_characterisation,
        reserved: BIPA_PRA_CORPUS_STATUS.reserved,
        corpus_status: "not_ingested",
      });
    }
    if (s.statute_key === "us_tx_cubi") {
      const row = dutyRow("tx_cubi.d_enforcement");
      exposure_surfaces.push({
        ...s,
        citation: row.pinpoint,
        standard: row.verbatim_quote,
        mechanism: "Enforcement is by the attorney general, by action to recover a civil penalty. CUBI's operative text creates no private suit.",
        reserved: null,
        corpus_status: "in_corpus",
      });
    }
    if (s.statute_key === "us_wa_19375") {
      const row = dutyRow("wa_19375.030_enforcement");
      exposure_surfaces.push({
        ...s,
        citation: row.pinpoint,
        standard: row.verbatim_quote,
        mechanism: "A violation is an unfair or deceptive act under the consumer protection act, and the chapter may be enforced solely by the attorney general.",
        reserved: null,
        corpus_status: "in_corpus",
      });
    }
  }

  return {
    unlawful_now,
    unresolved_on_record,
    exposure_surfaces,
    separation_note:
      "The two lists above state what the record shows about compliance with the duties themselves. The exposure surfaces state who may enforce and by what route. They are kept apart deliberately: a duty is satisfied or not on its own terms, and who can sue on a breach does not change that answer.",
  };
}

// ── Narrative ────────────────────────────────────────────────────────────────

function buildNarrative(
  intake: BiometricIntakeForDeliverables,
  scope: StatuteRef[],
  identifiers: IdentifierCharacterization[],
  entity: EntityCharacterization,
  duties: DutyFinding[],
  divergence: DivergenceItem[],
  consequence: ConsequenceDetermination,
): BiometricNarrative {
  const org = txt(intake.orgName) ?? "The organisation";
  const statuteList = scope.map((s) => `${s.statute_short} (${s.jurisdiction})`).join(", ");
  const inDef = identifiers.filter((i) => i.verdict === "within_definition").map((i) => i.statute_short);
  const outDef = identifiers.filter((i) => i.verdict === "outside_definition").map((i) => i.statute_short);
  const openDef = identifiers.filter((i) => i.verdict === "record_insufficient").map((i) => i.statute_short);

  const part1 = scope.length === 0
    ? `${org} did not name Illinois, Texas, or Washington, so none of the three biometric-identifier statutes this assessment covers is engaged and no duty analysis follows.`
    : [
      `${org} is assessed against ${statuteList}.`,
      `It is characterised as ${entity.role}: ${entity.role_reasoning}`,
      inDef.length > 0
        ? `The data it describes falls within the biometric-identifier definition used by ${inDef.join(" and ")}.`
        : "",
      outDef.length > 0
        ? `It falls outside the definition used by ${outDef.join(" and ")}, which matters: the three definitions are drafted differently and do not move together.`
        : "",
      openDef.length > 0
        ? `Under ${openDef.join(" and ")} the definition cannot be applied on the record as supplied.`
        : "",
      `The analysis that follows measures the practices the record actually describes against each duty in turn, one statutory subsection at a time.`,
    ].filter(Boolean).join(" ");

  const nUnlawful = consequence.unlawful_now.length;
  const nOpen = consequence.unresolved_on_record.length;
  const nSat = duties.filter((d) => d.verdict === "satisfied").length;

  const part4 = scope.length === 0
    ? "No determination is made: no covered jurisdiction was named."
    : [
      nUnlawful > 0
        ? `On the record as supplied, ${nUnlawful} ${nUnlawful === 1 ? "duty is" : "duties are"} not satisfied: ${consequence.unlawful_now.map((u) => `${u.statute_short} ${u.citation}`).join(", ")}.`
        : "On the record as supplied, no duty analysed is affirmatively unsatisfied.",
      nSat > 0 ? `${nSat} ${nSat === 1 ? "duty is" : "duties are"} satisfied on the facts described.` : "",
      nOpen > 0
        ? `${nOpen} ${nOpen === 1 ? "duty cannot" : "duties cannot"} be resolved either way because the record does not carry the facts they turn on; each names what is missing rather than assuming an answer.`
        : "",
      divergence.length > 0
        ? `${divergence.length} point${divergence.length === 1 ? "" : "s"} of divergence between the statutes in scope ${divergence.length === 1 ? "is" : "are"} identified, the sharpest being ${divergence[0].topic.toLowerCase()}.`
        : "",
      consequence.exposure_surfaces.length > 0
        ? `Enforcement routes differ by state and are set out separately from the duty findings.`
        : "",
    ].filter(Boolean).join(" ");

  return { part1_overview: part1, part4_determination: part4 };
}

// ── Entry point ──────────────────────────────────────────────────────────────

const SCOPE_GATED: ScopeGatedCorpusFlag[] = [{
  citation: "RCW 19.373 (Washington My Health My Data Act)",
  status: "scope_gated_pending",
  note:
    "Ingested for provenance at status='pending' and deliberately not activated. Item 314 adjudicated RCW 19.375 as the biometric-identifiers chapter; RCW 19.373 reaches biometric data only derivatively as a species of consumer health data. Bringing it into product scope is a business decision reserved to the CEO. Nothing in this assessment reads or applies it.",
}];

export function buildBiometricDeliverables(
  intake: BiometricIntakeForDeliverables,
): BiometricDeliverables {
  const scope = statutesInScope(intake);
  const identifier_characterizations = buildIdentifierCharacterizations(intake, scope);
  const entity_characterization = buildEntityCharacterization(intake, scope);

  const duty_findings: DutyFinding[] = [];
  for (const s of scope) {
    if (s.statute_key === "us_il_bipa") duty_findings.push(...buildIlDuties(intake));
    if (s.statute_key === "us_tx_cubi") duty_findings.push(...buildTxDuties(intake));
    if (s.statute_key === "us_wa_19375") duty_findings.push(...buildWaDuties(intake));
  }

  const divergence_analysis = buildDivergence(scope, identifier_characterizations, duty_findings);
  const consequence_determination = buildConsequence(scope, duty_findings);
  const narrative = buildNarrative(
    intake,
    scope,
    identifier_characterizations,
    entity_characterization,
    duty_findings,
    divergence_analysis,
    consequence_determination,
  );

  return {
    version: BIOMETRIC_DELIVERABLES_VERSION,
    statutes_in_scope: scope,
    identifier_characterizations,
    entity_characterization,
    duty_findings,
    divergence_analysis,
    consequence_determination,
    narrative,
    scope_gated: SCOPE_GATED,
  };
}
