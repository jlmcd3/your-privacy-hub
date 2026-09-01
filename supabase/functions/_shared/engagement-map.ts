// C1-d (2026-07-23T23:55:00Z) — ENGAGEMENT MAP v1 (LIA + DPIA only)
//
// Additive output metadata. For each rule/section the tool considered, this
// records whether it was engaged/skipped/conditional based on the intake
// facts, with a short rationale and the intake fields that drove the
// determination. Purely deterministic; no LLM.
//
// User-facing document structure is unchanged; consumers see this only as
// an additional `engagement_map` key on `report_data`.
//
// v1 covers LIA and DPIA. Other tools wait for v2.

export type EngagementStatus =
  | "engaged"
  | "not_engaged"
  | "conditional"
  | "not_applicable";

export interface EngagementEntry {
  rule_id: string;                // stable id, e.g. "R_UK_ART_6_11_DIRECT_MARKETING"
  name: string;                   // short human label
  status: EngagementStatus;
  rationale: string;              // one sentence
  intake_signals: string[];       // intake field paths inspected
  section_ref?: string;           // where in the report this determination surfaces
}

export interface EngagementMap {
  version: "v1";
  tool: "li_assessment" | "dpia_framework";
  generated_at: string;
  entries: EngagementEntry[];
}

// ---------- helpers -----------------------------------------------------

const asStr = (v: unknown): string => (v == null ? "" : String(v));
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const nonEmpty = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

const jurisdictionsContain = (jur: unknown, needles: RegExp): boolean => {
  const arr = Array.isArray(jur) ? jur : jur ? [jur] : [];
  return arr.some((j) => needles.test(String(j)));
};

// ---------- LIA ----------------------------------------------------------

export function buildLiaEngagementMap(
  intake: Record<string, unknown>,
  testStates: Record<string, { state?: string; basis?: string; source_fields?: string[] }> | undefined,
  engagedFrameworks: string[] | undefined,
): EngagementMap {
  const balancing = (intake?.balancing_details ?? {}) as Record<string, unknown>;
  const jurisdictions = asArr(intake?.jurisdictions);
  const dataCats = asArr(intake?.data_categories);
  const relationship = asStr(intake?.relationship_type);
  const scd = balancing?.special_category_data;
  const vulnerable = balancing?.vulnerable_subjects;
  const safeguards = balancing?.safeguards;
  const optOut = asStr(balancing?.opt_out_mechanism);
  const stated = asStr(intake?.stated_purpose ?? intake?.purpose);
  const description = asStr(intake?.processing_description ?? intake?.description);
  const isUk = jurisdictionsContain(jurisdictions, /UK|United Kingdom/i);
  const isEu = jurisdictionsContain(jurisdictions, /EU|European|EEA/i);
  const engaged = (engagedFrameworks ?? []).map((s) => String(s).toLowerCase());
  const scdTrue = scd === true || String(scd).toLowerCase() === "true";
  const scdFalse = scd === false || String(scd).toLowerCase() === "false";
  const ts = testStates ?? {};

  const entries: EngagementEntry[] = [];

  entries.push({
    rule_id: "R_ART_6_1_F",
    name: "Article 6(1)(f) legitimate-interests basis",
    status: "engaged",
    rationale: "This tool assesses reliance on Article 6(1)(f); the balancing test is always applied when the tool runs.",
    intake_signals: ["stated_purpose", "processing_description"],
    section_ref: "section_3_balancing_test",
  });

  entries.push({
    rule_id: "R_ART_9_SPECIAL_CATEGORIES",
    name: "Article 9 special-category condition",
    status: scdTrue
      ? "engaged"
      : scdFalse
        ? "not_engaged"
        : "conditional",
    rationale: scdTrue
      ? "The record flags special-category data; an Article 9 condition must be identified in addition to Article 6(1)(f)."
      : scdFalse
        ? "The record indicates no special-category data; Article 9 is not engaged for this processing."
        : "Special-category status is not resolved on the record; Article 9 engagement is conditional on that determination.",
    intake_signals: ["balancing_details.special_category_data", "data_categories"],
    section_ref: "section_1_scope",
  });

  entries.push({
    rule_id: "R_ART_21_OBJECTION",
    name: "Article 21 right to object",
    status: "engaged",
    rationale: "Article 21(1) is engaged for every Article 6(1)(f) processing; the record's opt-out mechanism is assessed accordingly.",
    intake_signals: ["balancing_details.opt_out_mechanism"],
    section_ref: "section_4_rights",
  });

  // UK GDPR Art. 6(11) DUAA 2025 examples — parameterised on stated purpose
  const uk611Sig = ["jurisdictions", "stated_purpose", "processing_description"];
  const looksLikeDM = /(direct marketing|marketing (funnel|attribution|efficiency)|marketing analytics)/i;
  const looksLikeIntraGroup = /(intra[- ]group|group compan|internal administrative)/i;
  const looksLikeNetSec = /(network security|information security|fraud (scoring|detection|prevention)|security monitor|abuse detection)/i;
  const stmt = `${stated} ${description}`;
  entries.push({
    rule_id: "R_UK_ART_6_11_DIRECT_MARKETING",
    name: "UK GDPR Art. 6(11) — direct marketing (DUAA 2025)",
    status: isUk
      ? (looksLikeDM.test(stmt) ? "engaged" : "not_engaged")
      : "not_applicable",
    rationale: isUk
      ? (looksLikeDM.test(stmt)
        ? "UK jurisdiction and the record describes marketing analytics; the DUAA 2025 recognised-interests example for direct marketing may be argued (LIA still required)."
        : "UK jurisdiction, but the record does not describe direct marketing.")
      : "UK GDPR is not in scope; Art. 6(11) does not apply.",
    intake_signals: uk611Sig,
    section_ref: "section_2_necessity",
  });
  entries.push({
    rule_id: "R_UK_ART_6_11_INTRA_GROUP",
    name: "UK GDPR Art. 6(11) — intra-group transmission (DUAA 2025)",
    status: isUk
      ? (looksLikeIntraGroup.test(stmt) ? "engaged" : "not_engaged")
      : "not_applicable",
    rationale: isUk
      ? (looksLikeIntraGroup.test(stmt)
        ? "UK jurisdiction and the record describes intra-group transmission; the DUAA 2025 recognised-interests example applies (LIA still required)."
        : "UK jurisdiction, but the record does not describe intra-group transmission.")
      : "UK GDPR is not in scope; Art. 6(11) does not apply.",
    intake_signals: uk611Sig,
    section_ref: "section_2_necessity",
  });
  entries.push({
    rule_id: "R_UK_ART_6_11_NETWORK_SECURITY",
    name: "UK GDPR Art. 6(11) — network and information security (DUAA 2025)",
    status: isUk
      ? (looksLikeNetSec.test(stmt) ? "engaged" : "not_engaged")
      : "not_applicable",
    rationale: isUk
      ? (looksLikeNetSec.test(stmt)
        ? "UK jurisdiction and the record describes security/fraud processing; the DUAA 2025 recognised-interests example applies (LIA still required)."
        : "UK jurisdiction, but the record does not describe network/information-security processing.")
      : "UK GDPR is not in scope; Art. 6(11) does not apply.",
    intake_signals: uk611Sig,
    section_ref: "section_2_necessity",
  });

  entries.push({
    rule_id: "R_VULNERABLE_SUBJECTS",
    name: "Vulnerable data subjects (heightened balancing)",
    status: (() => {
      const va = Array.isArray(vulnerable) ? vulnerable.filter((x) => String(x).toLowerCase() !== "none") : [];
      if (va.length > 0) return "engaged";
      if (Array.isArray(vulnerable) && vulnerable.length > 0) return "not_engaged";
      return "conditional";
    })(),
    rationale: (() => {
      const va = Array.isArray(vulnerable) ? vulnerable.filter((x) => String(x).toLowerCase() !== "none") : [];
      if (va.length > 0) return `The record identifies vulnerable groups (${JSON.stringify(va)}); the balancing test is heightened.`;
      if (Array.isArray(vulnerable) && vulnerable.length > 0) return "The record indicates no vulnerable groups; standard balancing applies.";
      return "Vulnerable-subjects status is not answered; the balancing test flags this as an open determination.";
    })(),
    intake_signals: ["balancing_details.vulnerable_subjects", "subject_anchor", "relationship_type"],
    section_ref: "section_3_balancing_test",
  });

  entries.push({
    rule_id: "R_EMPLOYMENT_CONTEXT",
    name: "Employment context (Art. 88 / power imbalance)",
    status: /employee|worker|staff|workforce|hr\b/i.test(`${relationship} ${description}`)
      ? "engaged"
      : "not_engaged",
    rationale: /employee|worker|staff|workforce|hr\b/i.test(`${relationship} ${description}`)
      ? "The record describes an employment relationship; power-imbalance considerations tighten the balancing test."
      : "The record does not describe an employment relationship.",
    intake_signals: ["relationship_type", "processing_description"],
    section_ref: "section_3_balancing_test",
  });

  entries.push({
    rule_id: "R_EPRIVACY_PECR",
    name: "ePrivacy / PECR device-storage overlay",
    status: /cookie|pixel|sdk|device (id|identifier)|gaid|idfa|fingerprint|local storage/i.test(`${description} ${stmt}`)
      ? "engaged"
      : "conditional",
    rationale: "Any storage of or access to information on a user's device requires a separate consent or exemption under the ePrivacy Directive / PECR 2003 in addition to the LI basis.",
    intake_signals: ["processing_description", "stated_purpose", "data_categories"],
    section_ref: "section_5_recommendations",
  });

  entries.push({
    rule_id: "R_ALTERNATIVES_CONSIDERED",
    name: "Necessity — less-intrusive alternatives review",
    status: nonEmpty(intake?.alternatives_considered) || nonEmpty((intake?.necessity_details as any)?.alternatives)
      ? "engaged"
      : "conditional",
    rationale: nonEmpty(intake?.alternatives_considered) || nonEmpty((intake?.necessity_details as any)?.alternatives)
      ? "The record documents alternatives considered; the necessity test can be resolved on the record."
      : "The record does not document alternatives considered; the necessity test flags this as an open determination.",
    intake_signals: ["alternatives_considered", "necessity_details.alternatives"],
    section_ref: "section_2_necessity",
  });

  entries.push({
    rule_id: "R_SAFEGUARDS_REVIEW",
    name: "Balancing — safeguards review",
    status: nonEmpty(safeguards) || nonEmpty(optOut) ? "engaged" : "conditional",
    rationale: nonEmpty(safeguards) || nonEmpty(optOut)
      ? "The record supplies safeguards and/or an opt-out mechanism; the balancing test consumes them."
      : "The record does not supply safeguards or an opt-out mechanism; the balancing test flags this as an open determination (R-TURN-3 absence convention applies).",
    intake_signals: ["balancing_details.safeguards", "balancing_details.opt_out_mechanism"],
    section_ref: "section_3_balancing_test",
  });

  // Framework engagement pass-through (informational only)
  entries.push({
    rule_id: "R_FRAMEWORKS_ENGAGED",
    name: "Frameworks actually engaged",
    status: engaged.length > 0 ? "engaged" : "conditional",
    rationale: engaged.length > 0
      ? `The intake-recorded jurisdictions resolve to: ${engaged.join(", ")}. Non-engaged frameworks are cited only as labelled comparatives.`
      : "No framework resolved from the jurisdictions on the record; the LI three-part test cannot be anchored to a governing framework.",
    intake_signals: ["jurisdictions"],
    section_ref: "section_1_scope",
  });

  // Deterministic test-state pass-through (M4 / M5 / M7 / M8) — status echoes
  // the mechanical state so the map matches the report's stated conclusions.
  const stateToStatus = (s: string | undefined): EngagementStatus =>
    s === "resolved_met" ? "engaged"
      : s === "resolved_not_met" ? "not_engaged"
        : s === "resolved_not_applicable" ? "not_applicable"
          : "conditional";
  entries.push({
    rule_id: "R_TEST_M4_SPECIAL_CATEGORY_FLAG",
    name: "Test M4 — special-category flag",
    status: stateToStatus(ts?.M4?.state),
    rationale: ts?.M4?.basis ?? "M4 basis not available.",
    intake_signals: ts?.M4?.source_fields ?? ["balancing_details.special_category_data"],
    section_ref: "section_1_scope",
  });
  entries.push({
    rule_id: "R_TEST_M7_SAFEGUARDS",
    name: "Test M7 — safeguards",
    status: stateToStatus(ts?.M7?.state),
    rationale: ts?.M7?.basis ?? "M7 basis not available.",
    intake_signals: ts?.M7?.source_fields ?? ["balancing_details.safeguards"],
    section_ref: "section_3_balancing_test",
  });
  entries.push({
    rule_id: "R_TEST_M8_OPT_OUT",
    name: "Test M8 — opt-out mechanism",
    status: stateToStatus(ts?.M8?.state),
    rationale: ts?.M8?.basis ?? "M8 basis not available.",
    intake_signals: ts?.M8?.source_fields ?? ["balancing_details.opt_out_mechanism"],
    section_ref: "section_4_rights",
  });

  // Silence unused-signal lints in strict builds.
  void isEu; void dataCats;

  return {
    version: "v1",
    tool: "li_assessment",
    generated_at: new Date().toISOString(),
    entries,
  };
}

// ---------- DPIA ---------------------------------------------------------

// Minimal duck-typed shape for the DpiaJurisdiction resolver output, to
// avoid importing the interface (and pulling its full transitive graph)
// into this shared helper.
type ResolvedLike = {
  oss?: { ossAvailable?: boolean };
  transfers?: Array<{ flow?: unknown; resolved?: unknown }>;
  specialCategoryHooks?: Array<{ country?: string; hook?: unknown }>;
} | null | undefined;

export function buildDpiaEngagementMap(
  intake: Record<string, unknown>,
  resolved: ResolvedLike,
): EngagementMap {
  const jurisdictions = asArr(intake?.jurisdictions);
  const isUk = jurisdictionsContain(jurisdictions, /UK|United Kingdom/i);
  const isEu = jurisdictionsContain(jurisdictions, /EU|European|EEA|GDPR/i);
  const art9 = asStr(intake?.article_9_condition);
  const dataCats = asArr(intake?.data_categories).map((x) => String(x).toLowerCase()).join(" | ");
  // Mirrors DPIA_SPECIAL_CAT_LABELS in run-dpia-framework/index.ts — the canonical M1 set.
  // Text-pattern fallbacks (looksHealth, looksBiometric) are kept for description-only signals
  // but the direct label check is the authoritative gate (catches "Genetic data" which patterns miss).
  const SPECIAL_CAT_LC = new Set(["health / medical data", "health or medical data", "biometric data", "genetic data"]);
  const hasSpecialCat = asArr(intake?.data_categories).some((x) => SPECIAL_CAT_LC.has(String(x).toLowerCase()));
  const description = asStr(intake?.description);
  const purpose = asStr(intake?.purpose);
  const volume = asStr(intake?.volume_frequency);
  const subjects = asStr(intake?.data_subjects);
  const transfers = Array.isArray(resolved?.transfers) ? resolved!.transfers! : asArr(intake?.transfer_flows);
  const controllerCountry = asStr(intake?.controller_country).toUpperCase();
  const centralAdmin = asStr(intake?.central_administration_country).toUpperCase();
  const stmt = `${description} ${purpose} ${dataCats} ${subjects}`.toLowerCase();

  const isLargeScale = /(large[- ]scale|large scale|\bm(illion)?\b|>\s*\d{5}|nationwide|country[- ]wide|cross[- ]border)/i.test(`${volume} ${description}`);
  const looksProfiling = /(profil|scor|automated (decision|evaluation)|adm[t]?\b|recommend)/i.test(stmt);
  const looksHealth = /(health|medical|patient|clinical|nhs|ehr|emr)/i.test(stmt) || /health/i.test(art9);
  const looksChildren = /(child|minor|under[- ]18|student|learner|pupil)/i.test(stmt);
  const looksPublicMonitoring = /(cctv|public (space|area)|wi-?fi tracking|kerbside|street|shopping mall|drone|aerial|overflight|airborne|unmanned aerial|uav\b)/i.test(stmt);
  const looksBiometric = /(biometric|face|fingerprint|iris|voiceprint|gait)/i.test(stmt);
  // A-TEAM DELTA (2026-08-31, DPIA batch finding) — the bare "ai" alternative
  // had no word boundary and matched inside unrelated words ("obtain",
  // "certain", "training", "maintain", "detail"...); word-bounded now. The
  // matched-term list also drives the rationale below, so a deep-learning
  // computer-vision model (YOLOv8) is no longer characterised as
  // "generative technology" just because SOME innovative-tech keyword hit —
  // the rationale now names only what actually matched.
  const INNOVATIVE_TERMS: ReadonlyArray<[RegExp, string]> = [
    [/\bartificial intelligence\b/i, "artificial intelligence"],
    [/\bai\b/i, "AI"],
    [/\bmachine learning\b/i, "machine learning"],
    [/\bgenerative\b/i, "generative technology"],
    [/\bllm\b/i, "an LLM"],
    [/\bdeep learning\b/i, "deep learning"],
    [/\bedge inference\b/i, "edge inference"],
  ];
  const innovativeMatchesRaw = [...new Set(INNOVATIVE_TERMS.filter(([re]) => re.test(stmt)).map(([, label]) => label))];
  const looksInnovative = innovativeMatchesRaw.length > 0;
  const asProseList = (items: readonly string[]): string =>
    items.length <= 1
      ? items[0] ?? ""
      : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  const hasTransfers = Array.isArray(transfers) && transfers.length > 0;
  const multiEstablishment = !!(controllerCountry && centralAdmin && controllerCountry !== centralAdmin);
  const ossAvailable = !!resolved?.oss?.ossAvailable;

  const entries: EngagementEntry[] = [];

  entries.push({
    rule_id: "R_ART_35_1",
    name: "Article 35(1) DPIA obligation",
    status: "engaged",
    rationale: "This tool assembles a DPIA; the Article 35(1) obligation is engaged by definition of the output.",
    intake_signals: ["processing_activity_name", "description", "purpose"],
    section_ref: "section_0_overview",
  });

  entries.push({
    rule_id: "R_ART_35_3_A_AUTOMATED_DECISIONS",
    name: "Article 35(3)(a) — automated decisions with legal/similarly significant effects",
    status: looksProfiling ? "conditional" : "not_engaged",
    rationale: looksProfiling
      ? "The record describes profiling or scoring; Art. 35(3)(a) is engaged IF the outputs produce legal or similarly significant effects — this must be confirmed."
      : "The record does not describe automated decisions with legal or similarly significant effects.",
    intake_signals: ["description", "purpose", "processing_activity_name"],
    section_ref: "section_1_description",
  });

  entries.push({
    rule_id: "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES",
    name: "Article 35(3)(b) — large-scale processing of special categories",
    status: (isLargeScale && (hasSpecialCat || nonEmpty(art9) || looksHealth || looksBiometric)) ? "engaged" : "not_engaged",
    rationale: (isLargeScale && (hasSpecialCat || nonEmpty(art9) || looksHealth || looksBiometric))
      ? "The record indicates large-scale processing of special-category data; Art. 35(3)(b) is engaged."
      : "The record does not indicate both large scale and special categories.",
    intake_signals: ["volume_frequency", "data_categories", "article_9_condition"],
    section_ref: "section_1_description",
  });

  // DOC 131 (DPIA batch; doc 130 B2 fact-walk RATIFIED as drafted,
  // 2026-09-01) — where the imagery-capture typed facts are answered, the
  // Art. 35(3)(c) determination runs the ratified four-branch fact-walk on
  // them, replacing the description lexicon; a record without the new facts
  // keeps the pre-existing lexicon behavior byte-identical (legacy rows'
  // determinations are unchanged). The optional detail narrative is quoted
  // verbatim as supporting context and never decides a branch.
  entries.push((() => {
    const imageryCapture = asStr(intake?.imagery_capture);
    const imagerySpaces = asStr(intake?.imagery_capture_spaces);
    const imageryDetail = asStr(intake?.imagery_capture_detail);
    const CAP_NONE = "No imagery or video of identifiable individuals";
    const CAP_SUBJECTS = "Imagery or video in which identifiable individuals are the subjects";
    const CAP_INCIDENTAL = "Imagery or video in which identifiable individuals appear incidentally";
    const base = {
      rule_id: "R_ART_35_3_C_PUBLIC_MONITORING",
      name: "Article 35(3)(c) — systematic monitoring of publicly accessible areas",
      intake_signals: ["imagery_capture", "imagery_capture_spaces", "description", "purpose"],
      section_ref: "section_1_description",
    };
    if (!imageryCapture) {
      // Legacy path — pre-DOC-131 lexicon behavior, unchanged.
      return {
        ...base,
        intake_signals: ["description", "purpose"],
        status: looksPublicMonitoring ? "engaged" as const : "not_engaged" as const,
        rationale: looksPublicMonitoring
          ? "The record describes monitoring of a publicly accessible physical area (CCTV / public-space monitoring); Art. 35(3)(c) is engaged."
          : "The record does not describe physical-space public monitoring; per the rule, online platform monitoring engages Art. 35(1) with WP248 criterion 3, not Art. 35(3)(c).",
      };
    }
    const lead = `Article 35(3)(c) requires an assessment where there is "a systematic monitoring of a publicly accessible area on a large scale." The record states: "${imageryCapture}"${imagerySpaces ? `; "${imagerySpaces}"` : ""}${volume ? `; volume and frequency: "${volume}"` : ""}.`;
    const detailNote = imageryDetail ? ` The Company adds: "${imageryDetail}".` : "";
    const publicSpaces = imagerySpaces === "Publicly accessible spaces" || imagerySpaces === "Both";
    if (imageryCapture === CAP_NONE) {
      return {
        ...base,
        status: "not_engaged" as const,
        rationale: `${lead} No imagery or video of identifiable individuals is captured, so Article 35(3)(c) is not engaged on the record as described.${detailNote}`,
      };
    }
    if (imageryCapture === CAP_INCIDENTAL) {
      const subjectMatter = asStr(intake?.processing_activity_name);
      return {
        ...base,
        status: "not_engaged" as const,
        rationale: `${lead} On those facts the recording of individuals is incidental to ${subjectMatter ? `"${subjectMatter}"` : "the recorded subject-matter of the capture"} and is not directed at observing persons; Article 35(3)(c) is therefore not engaged on the record as described, and the general Article 35(1) test — which this assessment applies in any event — governs. This determination is bound to the incidental character as recorded: if capture becomes directed at persons, the trigger must be re-run.${detailNote}`,
      };
    }
    if (imageryCapture === CAP_SUBJECTS && publicSpaces) {
      return {
        ...base,
        status: "engaged" as const,
        rationale: `${lead} Those facts describe observation of publicly accessible areas that is systematic and large-scale, so Article 35(3)(c) is engaged and this assessment is required on that ground.${detailNote}`,
      };
    }
    if (imageryCapture === CAP_SUBJECTS && imagerySpaces === "Private or controlled premises") {
      return {
        ...base,
        status: "not_engaged" as const,
        rationale: `${lead} On those facts the spaces recorded are not publicly accessible areas, so Article 35(3)(c) is not engaged on the record as described, and the general Article 35(1) test — which this assessment applies in any event — governs.${detailNote}`,
      };
    }
    // Subjects captured, spaces unanswered — the ratified undetermined branch.
    return {
      ...base,
      status: "conditional" as const,
      rationale: `${lead} The record does not state whether the spaces recorded are publicly accessible, so the trigger cannot be resolved; the assessment proceeds on the more protective footing that an assessment is required — which this document itself satisfies — and the open fact is recorded among the follow-ups.${detailNote}`,
    };
  })());

  entries.push({
    rule_id: "R_ART_9_SPECIAL_CATEGORIES",
    name: "Article 9 special-category condition",
    status: nonEmpty(art9) ? "engaged" : (looksHealth || looksBiometric ? "conditional" : "not_engaged"),
    rationale: nonEmpty(art9)
      ? `The record supplies an Art. 9(2) condition ("${art9.slice(0, 80)}").`
      : (looksHealth || looksBiometric
        ? "The record describes data categories that likely engage Art. 9; the specific 9(2) condition must be confirmed."
        : "The record does not indicate special-category data."),
    intake_signals: ["article_9_condition", "data_categories"],
    section_ref: "section_2_analysis",
  });

  entries.push({
    rule_id: "R_ART_45_ADEQUACY",
    name: "Article 45 adequacy (for restricted transfers)",
    status: hasTransfers ? "conditional" : "not_engaged",
    rationale: hasTransfers
      ? "The record lists cross-border transfers; the adequacy analysis is engaged for each destination and evaluated against the settled Art. 45 destinations."
      : "The record does not list cross-border transfers.",
    intake_signals: ["transfer_flows"],
    section_ref: "section_5_transfers",
  });

  entries.push({
    rule_id: "R_ART_46_SAFEGUARDS",
    name: "Article 46 appropriate safeguards (for restricted transfers)",
    status: hasTransfers ? "conditional" : "not_engaged",
    rationale: hasTransfers
      ? "Where adequacy does not cover a leg of the transfer, Art. 46 safeguards (EU SCCs / UK IDTA or Addendum / BCRs) are enumerated with correct directionality."
      : "No cross-border transfers on the record; Art. 46 not engaged.",
    intake_signals: ["transfer_flows"],
    section_ref: "section_5_transfers",
  });

  entries.push({
    rule_id: "R_ART_56_OSS_ONE_STOP_SHOP",
    name: "Article 56 one-stop-shop / main establishment",
    status: !isEu
      ? "not_applicable"
      : (multiEstablishment ? (ossAvailable ? "engaged" : "conditional") : "not_engaged"),
    rationale: !isEu
      ? "EU GDPR is not in scope; OSS does not apply."
      : (multiEstablishment
        ? (ossAvailable
          ? "Multi-establishment intake resolved to an EU main establishment with decision authority; OSS is available under Art. 56(1)."
          : "Multi-establishment intake, but no EU main establishment has been identified; OSS availability for this controller is unresolved on the record.")
        : "Single-country establishment on the record; OSS analysis is not required."),
    intake_signals: ["controller_country", "central_administration_country", "eu_decision_establishment_country"],
    section_ref: "section_6_conclusion",
  });

  entries.push({
    rule_id: "R_ART_36_PRIOR_CONSULTATION",
    name: "Article 36 prior consultation with the supervisory authority",
    status: "conditional",
    rationale: "Prior consultation is triggered where residual high risks remain after Art. 32/25 measures; the section 6 conclusion evaluates this against the final residual profile.",
    intake_signals: ["description", "purpose"],
    section_ref: "section_6_conclusion",
  });

  entries.push({
    rule_id: "R_UK_ART_6_11",
    name: "UK GDPR Art. 6(11) recognised legitimate interests (DUAA 2025)",
    status: isUk ? "conditional" : "not_applicable",
    rationale: isUk
      ? "UK jurisdiction: DUAA 2025 recognised-interests examples (direct marketing, intra-group transmission, network and information security) may be argued where they match the processing (LIA still required)."
      : "UK GDPR is not in scope; Art. 6(11) does not apply.",
    intake_signals: ["jurisdictions", "purpose", "description"],
    section_ref: "section_2_analysis",
  });

  entries.push({
    rule_id: "R_WP248_CHILDREN",
    name: "WP248 criterion 7 — vulnerable subjects (children)",
    status: looksChildren ? "engaged" : "not_engaged",
    rationale: looksChildren
      ? "The record describes processing of children or students; WP248 criterion 7 (vulnerable subjects) is engaged."
      : "The record does not describe processing of children or other vulnerable subjects.",
    intake_signals: ["data_subjects", "description", "purpose"],
    section_ref: "section_1_description",
  });

  entries.push({
    rule_id: "R_WP248_INNOVATIVE_TECH",
    name: "WP248 criterion 8 — innovative use of technology",
    status: looksInnovative ? "engaged" : "not_engaged",
    rationale: looksInnovative
      ? `The record describes ${asProseList(innovativeMatchesRaw)}; WP248 criterion 8 is engaged.`
      : "The record does not describe innovative technology use.",
    intake_signals: ["description", "purpose"],
    section_ref: "section_1_description",
  });

  entries.push({
    rule_id: "R_SPECIAL_CATEGORY_HOOKS",
    name: "National Art. 9(4) / DPA special-category hooks",
    status: Array.isArray(resolved?.specialCategoryHooks) && resolved!.specialCategoryHooks!.length > 0
      ? "engaged"
      : "not_engaged",
    rationale: Array.isArray(resolved?.specialCategoryHooks) && resolved!.specialCategoryHooks!.length > 0
      ? "The resolver identified national special-category hooks for the record's controller countries; these are cited alongside the Art. 9(2) condition."
      : "No national special-category hooks were resolved for the record's controller countries.",
    intake_signals: ["controller_country", "article_9_condition"],
    section_ref: "section_2_analysis",
  });

  return {
    version: "v1",
    tool: "dpia_framework",
    generated_at: new Date().toISOString(),
    entries,
  };
}
