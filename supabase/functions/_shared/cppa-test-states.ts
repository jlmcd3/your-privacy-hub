// Shared TEST-STATES computations for the CPPA generators.
// PURE MOVE (R1d/A1): the risk (`computeTestStates` + `formatTestStatesBlock`)
// and cyber (`computeCyberTestStates` + `renderCyberTestStatesBlock`) helpers
// were relocated here verbatim so run-quality-batch can import them without
// duplicating semantics. The generators re-export the same symbols so every
// existing caller is byte-identically preserved.
//
// No behaviour change. No prompt-version bump.

// ---------------------------------------------------------------------------
// Types shared by both tools. Kept structurally identical to the originals.
// ---------------------------------------------------------------------------
export type TestState = {
  state: "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate";
  basis: string;
  source_fields: string[];
  note?: string;
};

// Risk-assessment intake shape. Copied verbatim from
// supabase/functions/run-cppa-risk-assessment/index.ts.
export type ExceptionEntry = {
  claimed: boolean;
  scope: string;
  safeguards: string;
  documented: boolean;
  authority_basis: string;
  retention_period: string;
};

export type FiveStageIntake = {
  triggers: Record<string, boolean>;
  exceptions: Record<string, ExceptionEntry>;
  activity_details: any[];
  impact: Record<string, any>;
  org_context: Record<string, any>;
  annual_consumer_volume?: string;
  content_detail?: Record<string, any>;
};

// Revenue-band classifier — single source of truth (copied verbatim).
// BAND-REALIGNMENT-T2A (2026-07-26): V2 cases added; V1 cases retained for
// stored-row back-compat. Legacy-ambiguous band "$25M–$100M" continues to
// map to key='legacy_25_100m' with audit_cohort='indeterminate'.
export type RevenueBand = {
  key: "under_25m" | "25_50m" | "50_100m" | "over_100m" | "legacy_25_100m" | "100_500m" | "over_500m" | "unspecified";
  label: string;
  audit_cohort: "2028-04-01" | "2029-04-01" | "2030-04-01" | "indeterminate";
  over_25m: boolean | "indeterminate";
  over_100m: boolean | "indeterminate";
};
export function classifyRevenueBand(q1: unknown): RevenueBand {
  const v = String(q1 ?? "").trim();
  switch (v) {
    // V2 labels (BAND-REALIGNMENT-T2A)
    case "Under $25M":                return { key: "under_25m",      label: v, audit_cohort: "2030-04-01",     over_25m: false,           over_100m: false };
    case "$25M to under $50M":        return { key: "25_50m",         label: v, audit_cohort: "2030-04-01",     over_25m: true,            over_100m: false };
    case "$50M to $100M":             return { key: "50_100m",        label: v, audit_cohort: "2029-04-01",     over_25m: true,            over_100m: false };
    case "Over $100M":                return { key: "over_100m",      label: v, audit_cohort: "2028-04-01",     over_25m: true,            over_100m: true  };
    // Legacy V1 labels (retained for stored-row back-compat)
    case "$25M–$50M":   return { key: "25_50m",         label: v, audit_cohort: "2030-04-01",     over_25m: true,            over_100m: false };
    case "$50M–$100M":  return { key: "50_100m",        label: v, audit_cohort: "2029-04-01",     over_25m: true,            over_100m: false };
    case "$25M–$100M":  return { key: "legacy_25_100m", label: v, audit_cohort: "indeterminate",  over_25m: true,            over_100m: false };
    case "$100M–$500M": return { key: "100_500m",       label: v, audit_cohort: "2028-04-01",     over_25m: true,            over_100m: true };
    case "Over $500M":  return { key: "over_500m",      label: v, audit_cohort: "2028-04-01",     over_25m: true,            over_100m: true };
    default:            return { key: "unspecified",    label: v || "not specified", audit_cohort: "indeterminate", over_25m: "indeterminate", over_100m: "indeterminate" };
  }
}

// ---------------------------------------------------------------------------
// Risk-assessment TEST-STATES (R1b1). Copied verbatim.
// ---------------------------------------------------------------------------
export function computeTestStates(
  fiveStage: FiveStageIntake,
  rawIntake: Record<string, any>,
): Record<string, TestState> {
  const map: Record<string, TestState> = {};
  const q1 = rawIntake.q1_revenue;
  const band = classifyRevenueBand(q1);
  const q2 = String(rawIntake.q2_consumers ?? "").trim();
  const q5 = String(rawIntake.q5_sell_share ?? "").trim();
  const q5c = String(rawIntake.q5c_share_revenue_50pct ?? "").trim();
  const q15 = String(rawIntake.q15_sensitive_pi ?? "").trim();
  const q15c = String(rawIntake.q15c_spi_volume ?? "").trim();

  // M1 — §1798.140(d)(1)(A) $25M revenue threshold
  if (band.over_25m === "indeterminate") {
    map.M1 = { state: "indeterminate", basis: "revenue band not specified", source_fields: ["q1_revenue"] };
  } else {
    map.M1 = { state: band.over_25m ? "resolved_met" : "resolved_not_met", basis: `revenue band ${band.label}`, source_fields: ["q1_revenue"] };
  }

  // M2/M3 — consumer-band determinations
  // BAND-REALIGNMENT-T2A (2026-07-26): V2 keys added; V1 keys retained
  // for stored-row back-compat.
  const CB: Record<string, { over_100k: boolean; over_250k: boolean }> = {
    // V2 labels
    "Under 100,000":                { over_100k: false, over_250k: false },
    "100,000 to under 250,000":     { over_100k: true,  over_250k: false },
    "250,000 to under 1,000,000":   { over_100k: true,  over_250k: true },
    "1,000,000 or more":            { over_100k: true,  over_250k: true },
    // Legacy V1 labels
    "Fewer than 100,000":    { over_100k: false, over_250k: false },
    "100,000–249,999":       { over_100k: true,  over_250k: false },
    "250,000–1 million":     { over_100k: true,  over_250k: true },
    "1–10 million":          { over_100k: true,  over_250k: true },
    "Over 10 million":       { over_100k: true,  over_250k: true },
  };
  const cb = CB[q2];
  if (cb) {
    map.M2 = { state: cb.over_100k ? "resolved_met" : "resolved_not_met", basis: `consumer band ${q2}`, source_fields: ["q2_consumers"] };
    map.M3 = { state: cb.over_250k ? "resolved_met" : "resolved_not_met", basis: `consumer band ${q2}`, source_fields: ["q2_consumers"] };
  } else {
    const reason = q2 ? `recorded band ${q2} does not resolve the threshold` : "consumer band not specified";
    map.M2 = { state: "indeterminate", basis: reason, source_fields: ["q2_consumers"] };
    map.M3 = { state: "indeterminate", basis: reason, source_fields: ["q2_consumers"] };
  }

  // M4 — §7120(b)(2)(B) 50,000-SPI volume threshold
  if (q15 === "No") {
    map.M4 = { state: "resolved_not_applicable", basis: "q15_sensitive_pi = No — no SPI processing, prong inapplicable", source_fields: ["q15_sensitive_pi"] };
  } else if (q15c === "50,000 or more") {
    map.M4 = { state: "resolved_met", basis: "q15c_spi_volume = 50,000 or more", source_fields: ["q15c_spi_volume"] };
  } else if (q15c === "Fewer than 50,000") {
    map.M4 = { state: "resolved_not_met", basis: "q15c_spi_volume = Fewer than 50,000", source_fields: ["q15c_spi_volume"] };
  } else {
    map.M4 = { state: "indeterminate", basis: q15c ? `q15c_spi_volume = ${q15c} does not resolve` : "q15c_spi_volume not provided", source_fields: ["q15c_spi_volume", "q15_sensitive_pi"] };
  }

  // M5 — §7120(b)(1) 50%-of-revenue-from-sale/share prong
  if (q5 === "No") {
    map.M5 = { state: "resolved_not_met", basis: "q5_sell_share = No — no sale/share, prong inapplicable", source_fields: ["q5_sell_share"] };
  } else if (q5c === "Yes") {
    map.M5 = { state: "resolved_met", basis: "q5c_share_revenue_50pct = Yes", source_fields: ["q5c_share_revenue_50pct"] };
  } else if (q5c === "No") {
    map.M5 = { state: "resolved_not_met", basis: "q5c_share_revenue_50pct = No", source_fields: ["q5c_share_revenue_50pct"] };
  } else {
    map.M5 = { state: "indeterminate", basis: q5c ? `q5c_share_revenue_50pct = ${q5c} does not resolve` : "q5c_share_revenue_50pct not provided", source_fields: ["q5c_share_revenue_50pct", "q5_sell_share"] };
  }

  // M6 — §7121(a) cyber-audit cohort date
  if (band.audit_cohort === "indeterminate") {
    map.M6 = {
      state: "indeterminate",
      basis: band.key === "legacy_25_100m"
        ? `legacy revenue band ${band.label} straddles the $50M line — cohort is 2029-04-01 or 2030-04-01 depending on split`
        : "revenue band not specified — cohort cannot be resolved",
      source_fields: ["q1_revenue"],
    };
  } else {
    map.M6 = {
      state: "resolved_met",
      basis: `revenue band ${band.label} → §7121(a) cohort ${band.audit_cohort}`,
      source_fields: ["q1_revenue"],
      note: `cohort_date=${band.audit_cohort}`,
    };
  }

  // M7 — §7150(b) trigger CLAIMED-states (which triggers the intake claims are engaged)
  const t7 = {
    sells_or_shares_pi: !!q5 && q5 !== "No",
    profiling_observation: /yes|both/i.test(String(rawIntake.q5b_profiling_observation ?? "")),
    sensitive_pi: q15 === "Yes",
    under16_actual_knowledge: /^yes/i.test(String(rawIntake.q15b_under16_knowledge ?? "")),
    admt_use: rawIntake.q18_admt_use === "Yes" || rawIntake.q18_admt_use === "In evaluation",
    admt_training: /^yes/i.test(String(rawIntake.q18b_admt_training ?? "")),
  };
  const engaged = Object.entries(t7).filter(([, v]) => v).map(([k]) => k);
  map.M7 = {
    state: engaged.length ? "resolved_met" : "resolved_not_met",
    basis: `claimed § 7150(b) triggers: ${engaged.join(", ") || "none"}`,
    source_fields: ["q5_sell_share", "q5b_profiling_observation", "q15_sensitive_pi", "q15b_under16_knowledge", "q18_admt_use", "q18b_admt_training"],
  };

  // M8 — § 7152 exception CLAIMED-set + pinned cite per claimed key
  // EXCEPTION_PIN — statute-verified 2026-07-16/17 against primary text:
  //   • leginfo.legislature.ca.gov current text of Cal. Civ. Code § 1798.140
  //   • Justia 2025 CA Code §§ 1798.145 and 1798.105 (Stats. 2023 currency)
  // Frame-labeled cites: § 1798.140(e) enumerates "business purposes"; § 1798.105(d)
  // enumerates deletion-request exceptions; § 1798.145(a)(1)(A)–(G) is ONE paragraph
  // with sub-letters (compliance with law, investigations, cooperation with law
  // enforcement, government emergency access, legal claims, deidentified/aggregate,
  // wholly-outside-California conduct). There are no § 1798.145(a)(2)–(a)(6)
  // exemption entries of the shape previously pinned here — that mapping cribbed the
  // § 1798.140(e) letter pattern onto § 1798.145 and is superseded by this pin.
  // § 1798.145(m) (employment) is INOPERATIVE since 2023-01-01; § 1798.145(o) is
  // commercial-credit-reporting, NOT employment — the employment_context key now
  // carries a counsel-review flag rather than a statutory cite.
  const EXCEPTION_PIN: Record<string, string> = {
    fraud_detection: "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
    security_integrity: "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
    debugging: "Cal. Civ. Code § 1798.140(e)(3); deletion requests: § 1798.105(d)(3)",
    transient_use: "Cal. Civ. Code § 1798.140(e)(4)",
    internal_research: "Cal. Civ. Code § 1798.140(e)(7); deletion requests: § 1798.105(d)(6) (informed consent) or (d)(7)",
    legal_compliance: "Cal. Civ. Code § 1798.145(a)(1)(A)–(B); deletion requests: § 1798.105(d)(8)",
    consumer_request: "Cal. Civ. Code § 1798.105(d)(1) (complete the transaction / provide the requested good or service)",
    employment_context: "NO CURRENT STATUTORY EXEMPTION — § 1798.145(m) inoperative since 2023-01-01; flag for counsel review",
  };
  const exceptionsIntake = (rawIntake.exceptions_intake ?? {}) as Record<string, any>;
  const claimed = Object.entries(exceptionsIntake).filter(([, v]: any) => v?.claimed).map(([k]) => k);
  map.M8 = {
    state: claimed.length ? "resolved_met" : "resolved_not_applicable",
    basis: claimed.length
      ? `claimed exceptions: ${claimed.map((k) => `${k} (pinned cite ${EXCEPTION_PIN[k] ?? "§ 1798.145"})`).join("; ")}`
      : "no § 7152 exceptions claimed",
    source_fields: ["exceptions_intake"],
  };

  // M9 — § 7152(a)(1),(2),(4),(8) element presence (non-empty checks)
  const hasPurpose      = String(rawIntake.i1_processing_purpose ?? "").trim().length > 0;
  const hasMinPi        = String(rawIntake.i1b_min_pi ?? "").trim().length > 0;
  const hasRetention    = String(rawIntake.i2_retention_period ?? "").trim().length > 0 || String(rawIntake.i2_retention_criteria ?? "").trim().length > 0;
  const hasBenefits     = String(rawIntake.impact_intake?.businessBenefits ?? "").trim().length > 0 || String(rawIntake.impact_intake?.consumerBenefits ?? "").trim().length > 0;
  const hasContributors = String(rawIntake.i7_internal_contributors ?? "").trim().length > 0;
  const hasCertifier    = String(rawIntake.i8_certifying_exec_name ?? "").trim().length > 0;
  const allPresent = hasPurpose && hasMinPi && hasRetention && hasBenefits && hasContributors && hasCertifier;
  map.M9 = {
    state: allPresent ? "resolved_met" : "resolved_not_met",
    basis: `§ 7152(a) element presence — (a)(1) purpose=${hasPurpose}; (a)(3) min-PI=${hasMinPi}, retention=${hasRetention}; (a)(4) benefits=${hasBenefits}; (a)(8) contributors=${hasContributors}, certifier=${hasCertifier}`,
    source_fields: ["i1_processing_purpose", "i1b_min_pi", "i2_retention_period", "i2_retention_criteria", "impact_intake", "i7_internal_contributors", "i8_certifying_exec_name"],
  };

  // M10 — § 7155(b) / § 7157 canonical dates (already computed elsewhere; folded in)
  map.M10 = {
    state: "resolved_met",
    basis: "§ 7155(b) existing-activity compliance deadline: 2027-12-31; § 7157(a)(1) submission deadline for 2026/2027 assessments: 2028-04-01",
    source_fields: [],
    note: "assessment_compliance=2027-12-31; submission=2028-04-01",
  };

  void fiveStage; // (kept in signature for future use; M-tests currently read raw intake)
  return map;
}

export function formatTestStatesBlock(map: Record<string, TestState>): string {
  const header =
    "TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING: state its conclusion with the basis given, do NOT hedge, do NOT emit an information_needed entry for it, and do NOT ask the user to confirm/verify it. For INDETERMINATE tests, do NOT use verdict language against the record. Instead, state what the recorded facts DO establish, then add one sentence of the form \"the record does not yet resolve [the specific threshold]; recording [the named intake field / fact] completes the determination.\" Still emit exactly ONE information_needed entry per indeterminate test anchored to the producing field(s).";
  const rows = Object.entries(map).map(([k, v]) => {
    const src = v.source_fields.length ? v.source_fields.join(", ") : "(computed)";
    return `- ${k} [${v.state.toUpperCase()}] — ${v.basis} [source: ${src}]${v.note ? ` {${v.note}}` : ""}`;
  });
  return `${header}\n${rows.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Cybersecurity TEST-STATES (R1b2). Copied verbatim.
//
// Local re-declaration of the cyber-flavoured TestState + TestStateEntry types
// preserves the original narrower union used inside the cyber generator
// (`TestState = "resolved_met" | ...`, i.e. a string literal union rather than
// the risk generator's object type). Renamed to `CyberTestStateValue` here to
// avoid shadowing the risk `TestState` export.
// ---------------------------------------------------------------------------
type CyberTestStateValue = "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate";
export interface TestStateEntry {
  state: CyberTestStateValue;
  basis: string;
  source_fields: string[];
}
const NAMED_FRAMEWORKS = new Set(["SOC 2", "ISO 27001", "NIST CSF 2.0", "CIS Controls"]);
const NON_INCIDENT_VALUES = new Set(["", "none", "0", "no", "n/a", "na", "not applicable"]);

export function computeCyberTestStates(intake: Record<string, any> | null | undefined): Record<string, TestStateEntry> {
  const it = intake ?? {};
  const profile = (it.profile ?? {}) as Record<string, any>;
  const controls: any[] = Array.isArray(it.controls) ? it.controls : [];
  const out: Record<string, TestStateEntry> = {};

  const framework = String(profile.framework ?? "").trim();
  out.M1 = framework
    ? (NAMED_FRAMEWORKS.has(framework)
        ? { state: "resolved_met", basis: `intake declares primary framework "${framework}"`, source_fields: ["profile.framework"] }
        : { state: "resolved_not_met", basis: `intake declares framework "${framework}" outside the named set; default to NIST CSF 2.0 per FRAMEWORK rule`, source_fields: ["profile.framework"] })
    : { state: "indeterminate", basis: "profile.framework is empty", source_fields: ["profile.framework"] };

  const incidents = String(profile.incidents_12mo ?? "").trim();
  const incidentsLc = incidents.toLowerCase();
  out.M2 = !incidents
    ? { state: "indeterminate", basis: "profile.incidents_12mo is empty", source_fields: ["profile.incidents_12mo"] }
    : NON_INCIDENT_VALUES.has(incidentsLc)
      ? { state: "resolved_not_met", basis: `intake reports no incidents in the last 12 months ("${incidents}")`, source_fields: ["profile.incidents_12mo"] }
      : { state: "resolved_met", basis: `intake reports incidents in the last 12 months ("${incidents.slice(0, 80)}")`, source_fields: ["profile.incidents_12mo"] };

  const lastAudit = String(profile.last_audit ?? "").trim();
  out.M3 = lastAudit
    ? { state: "resolved_met", basis: `intake documents last audit as "${lastAudit.slice(0, 80)}"`, source_fields: ["profile.last_audit"] }
    : { state: "indeterminate", basis: "profile.last_audit is empty", source_fields: ["profile.last_audit"] };

  // M4..M21 — per-control ANSWERED states. Index by control key (c1_auth..c18_continuity).
  const byKey = new Map<string, any>();
  for (const c of controls) if (c && typeof c.key === "string") byKey.set(c.key, c);
  const CONTROL_KEYS = [
    "c1_auth", "c2_encryption", "c3_account_access", "c4_inventory", "c5_secure_config",
    "c6_vuln_mgmt", "c7_audit_logs", "c8_network_mon", "c9_anti_malware", "c10_segmentation",
    "c11_port_protocol", "c12_awareness", "c13_training", "c14_secure_dev", "c15_third_party",
    "c16_retention", "c17_incident", "c18_continuity",
  ];
  CONTROL_KEYS.forEach((key, idx) => {
    const id = `M${4 + idx}`;
    const row = byKey.get(key);
    const maturity = String(row?.maturity ?? "").trim();
    out[id] = maturity
      ? { state: "resolved_met", basis: `controls[${key}].maturity = "${maturity.slice(0, 60)}"`, source_fields: [`controls.${key}.maturity`] }
      : { state: "indeterminate", basis: `controls[${key}].maturity is empty`, source_fields: [`controls.${key}.maturity`] };
  });

  return out;
}

export function renderCyberTestStatesBlock(states: Record<string, TestStateEntry>): string {
  const lines: string[] = [];
  lines.push("TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING per rule 2a: state its conclusion with the basis given, do NOT hedge, do NOT emit a next_steps entry re-asking for it, and do NOT contradict it in per-control finding prose. INDETERMINATE tests use insufficient-basis language anchored to the producing field.");
  for (const id of Object.keys(states)) {
    const e = states[id];
    lines.push(`- ${id} state=${e.state} basis="${e.basis}" source_fields=${JSON.stringify(e.source_fields)}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// T-5 — TEST-STATES VOCABULARY LEAKAGE detector (2026-07-11 leg-(b) remediation).
// Detects internal-machinery vocabulary bleeding into user-facing prose:
//   - the literal token "TEST-STATES"
//   - test ids adjacent to "resolved"/"state" (e.g. "M1 resolved", "M-CA state")
//   - state tokens (resolved_met / resolved_not_met / RESOLVED_*)
// Same philosophy as NO SYSTEM-ROUTING VOICE and no-raw-slugs.
// The regex is authoritative per the leg-(b) ratification.
// ---------------------------------------------------------------------------

// GRADER-1 Task 6(a) extension: also catches the space-form RESOLVED
// tokens ("RESOLVED MET" / "RESOLVED NOT MET" / "RESOLVED NOT APPLICABLE"),
// bare test ids in prose (\bM1..M10\b, \bM-CA\b, \bM-GDPR\b), and the
// "M\d+ is RESOLVED" word order that evaded the original regex.
const TEST_STATES_LEAK_RE =
  /\bTEST-STATES\b|\bM-?[A-Z0-9]{1,4}\s+(?:resolved|state)\b|\bresolved_(?:met|not_met|not_applicable)\b|\bRESOLVED_[A-Z_]+\b|\bRESOLVED\s+(?:MET|NOT\s+MET|NOT\s+APPLICABLE)\b|\bM(?:10|[1-9])\b|\bM-(?:CA|GDPR)\b|\bM\d+\s+is\s+RESOLVED\b/gi;

export type TestStatesLeakHit = { path: string; match: string; context: string };

function walkStrings(value: unknown, path: string, out: Array<{ path: string; text: string }>): void {
  if (value == null) return;
  if (typeof value === "string") {
    if (value.length > 0) out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walkStrings(value[i], `${path}[${i}]`, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/**
 * Detect TEST-STATES vocabulary leakage in a user-facing payload.
 * Accepts either a string (flattened text) or any object; walks every string leaf.
 * Returns match hits (deduped by path+match). Empty array = clean.
 */
export function detectTestStatesLeak(input: unknown): TestStatesLeakHit[] {
  const strings: Array<{ path: string; text: string }> = [];
  if (typeof input === "string") strings.push({ path: "$", text: input });
  else walkStrings(input, "", strings);
  const seen = new Set<string>();
  const out: TestStatesLeakHit[] = [];
  for (const { path, text } of strings) {
    // Reset lastIndex because /g regexes are stateful.
    TEST_STATES_LEAK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TEST_STATES_LEAK_RE.exec(text)) !== null) {
      const key = `${path}::${m[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + m[0].length + 30);
      out.push({ path, match: m[0], context: text.slice(start, end) });
      if (out.length > 200) return out; // safety cap
    }
  }
  return out;
}

