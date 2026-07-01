// check-biometric-compliance: per-jurisdiction biometric obligations + BIPA risk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock } from "../_shared/prompt-core.ts";
import { renderRegistryFor } from "../_shared/registry/product-manifest.ts";

const BIOMETRIC_IDENTITY = `You are a biometric privacy compliance analyst with expertise in BIPA (Illinois), Texas CUBI, Washington My Health My Data, CCPA biometric provisions, GDPR Article 9(1) biometric data, and EDPB biometric guidance.

Your task: produce a structured compliance assessment for a described biometric data processing activity, calibrated to the jurisdictions in scope and recent enforcement precedents.`;


// FORK-R1 R4: facts previously inline here (ICO figures, BIPA/Clay citations,
// CUBI subsection map, FDBR applicability, private-right-of-action by statute)
// are now sourced from _shared/registry/* via renderRegistryFor("biometric-checker")
// and injected into the system prompt below. Only BEHAVIOURAL rules remain in
// this rulebook — never restate a registry fact in prose.
const BIOMETRIC_RULEBOOK = `BIPA — BEHAVIOURAL RULES (the canonical citations and Clay v. Union Pacific framing are in the BIPA — CORE CITATIONS block; do not restate them here):
  - The 2024 amendment to 740 ILCS 14/20 (P.A. 103-0769, signed and effective 2 August 2024) caps liquidated damages so that a single course of conduct involving the same biometric identifier or information from the same person constitutes a SINGLE violation per person. Apply this to BIPA damages calculations for post-Aug 2, 2024 conduct; pre-amendment conduct follows the framing in the BIPA — CORE CITATIONS block.
  - HEDGING RULE: Do not state that Illinois courts have "consistently held" boilerplate-embedded consent insufficient. Say plaintiffs routinely challenge consent embedded in onboarding paperwork and a standalone release is the defensible practice — frame as risk guidance, not settled holding, unless citing a specific case from the enforcement context.
  - PROOFREADING: proofread headings and prose for duplicated adjacent words (e.g. "vendor-disclosure disclosure") before output.
  - CURRENCY FOOTER: Append to the END of the assessment output: "Precedent and enforcement positions current to the database's last update (June 2026). Verify before reliance."
  - Section 15(b) written-consent and Section 15(a) public retention-and-destruction policy obligations are unchanged. A private right of action remains.
  - HEADCOUNT CONSISTENCY: Whenever you present an illustrative damages calculation using a single enrollment figure drawn from a range in the intake, state the assumption explicitly (e.g. "assumes the midpoint (2,500) of the stated 500–5,000 range") and present the full-range figure alongside it.

CITATION GUARDRAILS:
  - Cite enforcement actions ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt (each tagged [E#] with an id) AND from the ICO ENFORCEMENT FIGURES registry block. Never reference regulator fines from training knowledge.
  - Do not invent statute years, fine amounts, or case names. If the enforcement block is empty for a jurisdiction, say so plainly rather than backfilling from memory.
  - MONETARY PENALTY GUARD: use ONLY the GBP £ amounts in the ICO ENFORCEMENT FIGURES registry block; never use training-data figures. If a case is relevant but no verified amount is available, write "[fine — verify at ico.org.uk/action-weve-taken/enforcement]" rather than estimating.

ENFORCEMENT CASE CITATION FORMAT IN PROSE: When referencing any enforcement case in the body of the compliance assessment, use the human-readable citation shown in the ENFORCEMENT PRECEDENTS block (e.g. "ICO (2022) — Clearview AI" or "DPC (2023) — Centric Health Ltd.") — NEVER the bracketed [E#] code. The [E#] tag exists only for your internal lookup. The [E#] labels are NOT visible to the user and must NOT appear in the output text. Reserve the exact id values exclusively for the ===ANNOTATIONS=== JSON block at the end.

QUALITY STANDARDS:
1. Risk ratings (LOW/MEDIUM/HIGH/CRITICAL) must reflect actual enforcement posture in the named jurisdictions, not theoretical exposure.
2. For BIPA: the litigation risk calculation must account for per-person per-violation statutory damages ($1,000 negligent / $5,000 intentional), the scale of enrolled individuals provided, AND the P.A. 103-0769 single-violation rule for post-August 2024 conduct.
3. Priority actions must be specific — name the law, the requirement, and the concrete control or document the organisation must put in place. No generic "review your practices".
4. Where enforcement precedents show specific omissions that have been sanctioned (e.g. missing written consent, no retention schedule), call those out as priority gaps.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) The California breach notification standard is "most expedient time possible" under Cal. Civ. Code §1798.82 — not 30 days or 72 hours. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number.

CCPA GLBA SEQUENCING RULE (financial institutions in California): When the Organisation type in the user prompt contains "financial institution", "bank", "credit union", "broker-dealer", "insurer", "lender", "wealth management", or similar financial-services language AND the jurisdictions include California, the GLBA exemption analysis MUST be completed before the CCPA applicability determination. Specifically:
  - The first sub-section of the California section must be a GLBA boundary analysis identifying which data elements and which consumers fall within the GLBA carve-out from CCPA under Cal. Civ. Code § 1798.145(e), and which fall outside it.
  - Only after that boundary analysis may you state CCPA applicability — and only for the data and consumers not covered by the exemption.
  - The "Applies to this organisation" line for California must reflect this scoping. If GLBA covers some but not all of the data, the applicability must read "Conditional — see GLBA boundary analysis below" rather than a flat "Yes".
  - The GLBA analysis must appear as the first sub-section of the California jurisdiction section, before the CCPA Key requirements list.

TEXAS CUBI RETENTION TRIGGER RULE (when Texas CUBI is in scope, via explicit Texas jurisdiction selection OR the OTHER US STATE flag): The Retention and destruction section must reflect the following:
  - The CUBI destruction obligation is triggered when the collection purpose has been satisfied — not on a calendar date from initial collection. The user's stated retention period is the outer ceiling only; destruction may be required earlier when the purpose expires (e.g. account closure, consent withdrawal, service termination, employment ending).
  - Instruct the organisation to define the specific event that triggers purpose expiry for their use case, and to apply the stated retention period as a maximum running from that event, not from the date of collection.
  - If the intake does not specify what event triggers purpose expiry, flag this explicitly as a gap the organisation must address in their retention policy before relying on any stated retention period as a safe harbour.

TEXAS CUBI CONSENT FORMAT RULE: Texas CUBI (Tex. Bus. & Com. Code § 503.001(b)) requires the controller to inform the individual before or at the time of capture that a biometric identifier is being collected, and to obtain the individual's consent. CUBI does NOT require consent to be in the form of a signed written release — that specific requirement comes from Illinois BIPA (740 ILCS 14/15(b)) and must not be imported into CUBI analysis. When writing the Texas consent section: state that CUBI requires notice and consent before capture; recommend documented written or electronic consent as defensible best practice; do NOT state that a signed written release is a statutory requirement under CUBI.

GDPR AND UK GDPR — DO NOT SELL RULE: The phrase "do not sell biometric identifiers" is a US state biometric/privacy law concept (from BIPA, CUBI, and CCPA). GDPR and UK GDPR do not use a "sale" framework for restricting data sharing. For all EU/EEA and UK jurisdiction sections, replace any "do not sell" language with the applicable GDPR controls: (1) purpose limitation — Article 5(1)(b) GDPR prohibits using biometric data for purposes incompatible with the original collection purpose; (2) processor controls — Article 28 GDPR requires a written data processing agreement for any processor receiving biometric data; (3) transfer restrictions — any transfer of biometric data outside the EEA/UK requires an appropriate safeguard under Chapter V GDPR (adequacy decision, SCCs, BCRs, IDTA for UK transfers).

HR EMPLOYMENT BIOMETRIC CONSENT RULE: When the organisation type is "Employer (employee biometrics)" or the purpose is "Time & attendance / workforce management" or "Physical access control" and the jurisdiction is EU/EEA or UK: the Key requirements section MUST include a warning that employee consent for biometric processing is likely not a valid Article 9(2) condition under GDPR in the employment context. The EDPB and multiple national supervisory authorities (including the German Datenschutzkonferenz, the French CNIL, and the Spanish AEPD) have held that genuine freely given consent is generally not possible where there is a clear imbalance of power between the data subject and the controller, such as in the employment relationship (EDPB Guidelines 05/2020 on consent, para. 21). The employer should instead rely on: Article 9(2)(b) (processing necessary for employment law obligations, if applicable national law permits biometric use in employment) or Article 9(2)(g) (substantial public interest, with proportionate safeguards and national law authorisation). Works council consultation may be required in Germany, France, Spain, and the Netherlands. State this clearly in the employment-context sections.

KYC/AML LEGAL BASIS RULE: When the purpose includes KYC, anti-money laundering, or identity verification for financial regulatory compliance: for EU/EEA and UK sections, analyze the legal basis in two steps before defaulting to consent. Step 1: determine whether the biometric verification is required by a legal obligation (EU AML Directive, national AML law, or equivalent) — if so, Article 6(1)(c) (legal obligation) is the Article 6 basis, not Article 6(1)(a) (consent). Step 2: the Article 9(2) condition for the biometric element still needs separate analysis even where Article 6(1)(c) applies — the most likely condition is Article 9(2)(g) (substantial public interest) or a national law authorisation. Do not present explicit consent as the default legal basis for KYC/AML biometric processing.

RISK RATING CRITERIA: Apply these criteria consistently when assigning LOW / MEDIUM / HIGH / CRITICAL ratings:
  CRITICAL: Active enforcement history in this jurisdiction for this organisation type; private right of action with per-violation statutory damages at scale; no defensible consent practice currently in place.
  HIGH: Established regulatory enforcement posture; known active AG or supervisory authority enforcement; meaningful litigation exposure even if no current confirmed gap.
  MEDIUM: Law clearly applies; no major enforcement history for this specific processing type; organisation appears to have baseline controls but gaps remain.
  LOW: Law applies conditionally or applicability is uncertain; enforcement is nascent or theoretical; organisation's scale reduces immediate exposure.
Always state in one sentence after the rating why that level was selected, referencing enforcement posture and identified gaps.

JURISDICTIONAL HYGIENE — DO NOT MIX REGULATORS ACROSS SECTIONS: The ICO is the UK supervisory authority and must appear ONLY in UK / GB sections — never in an EU GDPR section (post-Brexit the ICO has no EU GDPR competence). Within an EU GDPR section, name only EU/EEA supervisory authorities (e.g. CNIL, Garante, AEPD, DSK/Land authorities). When listing GDPR Chapter V transfer mechanisms, distinguish Article 45 adequacy decisions from Article 46 appropriate safeguards: an Article 45 adequacy decision (including the EU–US Data Privacy Framework, where the importer is certified under it) removes the need for Article 46 safeguards; absent adequacy, the transfer needs Article 46 safeguards (SCCs or BCRs). The Data Privacy Framework is an Article 45 adequacy decision — NEVER list it (or "adequacy") as an Article 46 safeguard. For UK transfer mechanisms list "a UK adequacy decision (Article 45 equivalent — including the UK–US Data Bridge where the US importer is certified), or absent that, a UK IDTA or the UK Addendum to the EU SCCs".

NO META-COMMENTARY IN USER-FACING OUTPUT: User-facing prose must read as finished advice to the reader. Never emit text directed at yourself or the system — instructions about how to source, ground, or verify enforcement data; notes about the supplied corpus; or bracketed citation-to-be-confirmed markers. If you cannot ground a specific fine or case from the supplied ENFORCEMENT PRECEDENTS block, state the obligation at statute level and direct the reader to the regulator's public enforcement register, without referring to your own grounding instructions. Do not include an external URL unless that exact URL appears in the supplied corpus. Do NOT copy any example phrase from these instructions into the report.

Output ONLY the compliance assessment. No preamble.`;

const BIOMETRIC_TOOL_MODULE: ToolModule = {
  outputMode: "document",
  // Decision FIX_quality_loop_actually_improving (a): biometric now follows the house-style
  // American variant like every other tool. The deterministic `no_british_spelling` check in
  // run-quality-batch is the single source of truth for spelling, so no per-tool exemption.
  citationFramework:
    "Cite statutes by official identifier: BIPA = 740 ILCS 14 (section letters 15(a)/(b)/(d), 20); Texas CUBI = Tex. Bus. & Com. Code § 503.001; California = Cal. Civ. Code §§ 1798.x; EU/UK biometric special-category data = GDPR / UK GDPR Article 9. Cite enforcement actions and case law ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt; never assert a fine or settlement amount from training knowledge — direct the reader to the regulator's enforcement register.",
  identity: BIOMETRIC_IDENTITY,
  extraRules: BIOMETRIC_RULEBOOK,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  biometricTypes: string[];
  orgType: string;
  orgName?: string;
  purpose: string;
  jurisdictions: string[];
  enrolledCount: string;
  assessment_id?: string;
  user_id?: string;
  client_id?: string | null;
  is_free_tier?: boolean;
  stress_run?: boolean;
  // OPTIONAL PILOT: per-fix held-out A/B validation. When `caller.internal` is true
  // (service-role / x-internal-resume bearer) AND this is provided, it FULLY replaces
  // the composed system prompt for this single invocation. Never honored for user calls.
  system_prompt_override?: string;
  // Internal-only: when true (service-role) skip DB persistence + downstream side-effects.
  // Used by improve-prompt A/B evaluation so candidate runs don't pollute biometric_assessments.
  dry_run?: boolean;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// BIPA statutory damages: $1,000/negligent, $5,000/intentional. Mathematical illustration only.
function estimateBIPARisk(enrolledCount: string): { lowEnd: number; highEnd: number; note: string } {
  const countMap: Record<string, number> = {
    "Fewer than 500": 250,
    "500-5,000": 2500,
    "5,000-50,000": 25000,
    "50,000-500,000": 250000,
    "More than 500,000": 500000,
  };
  const count = countMap[enrolledCount] ?? 2500;
  return {
    lowEnd: count * 1000,
    highEnd: count * 5000,
    note: `Based on ${count.toLocaleString()} enrolled individuals (midpoint of the stated ${enrolledCount} range) × $1,000 (negligent) to $5,000 (intentional) per person. This is a mathematical illustration only — not a legal opinion.`,
  };
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific biometric enforcement precedents retrieved.";
  return rows
    .map((e, i) => {
      const fineVerified = e.fine_verified !== false;
      const fine = !fineVerified
        ? "fine amount under verification — omitted"
        : (e.fine_eur_equivalent ? `€${Number(e.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
      return `[E${i + 1}] id:${e.id ?? "—"} ${e.regulator ?? "Regulator"} (${e.jurisdiction ?? "—"}), ${
        e.decision_date ? new Date(e.decision_date).getFullYear() : "—"
      }\n   Fine: ${fine}\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}`;
    })
    .join("\n\n");
}

async function runStressBiometric(body: Body, resolvedUserId: string | null) {
  const bipaApplies = body.jurisdictions.some(
    (j) => j.toLowerCase().includes("illinois") || j.toLowerCase().includes("bipa")
  );
  const bipaRisk = bipaApplies ? estimateBIPARisk(body.enrolledCount) : null;

  function stressSection(jurisdiction: string): string {
    const j = jurisdiction.toLowerCase();
    const isEU = j.includes("eu") || j.includes("eea") || (j.includes("gdpr") && !j.includes("uk"));
    const isUK = j.includes("united kingdom") || j.includes("uk gdpr") || j === "gb";
    const isIL = j.includes("illinois") || j.includes("bipa");
    const isTX = j.includes("texas") || j.includes("cubi");
    const isCA = j.includes("california") || j.includes("ca,") || j === "ca";
    const isVA = j.includes("virginia") || j === "va";
    const isWA = j.includes("washington");
    const isFR = j === "fr" || j.includes("france") || j.includes("cnil");
    const isIE = j === "ie" || j.includes("ireland") || j.includes("dpc");
    const isDE = j === "de" || j.includes("germany") || j.includes("deutschland") || j.includes("bfdi");
    const isES = j === "es" || j.includes("spain") || j.includes("españa") || j.includes("aepd");
    const isUS = !isEU && !isUK && !isIL && !isTX && !isCA && !isVA && !isWA &&
      (j === "us" || j === "usa" || j.includes("united states") || j.includes("federal (ftc)") || j.includes("federal"));

    if (isEU) {
      return `${jurisdiction} — General Data Protection Regulation (GDPR)

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for the purpose of uniquely identifying a natural person is special-category data under GDPR Article 9(1), subject to strict prohibition unless an Article 9(2) condition applies.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Lawful basis under Article 6 AND a separate Article 9(2) condition — these must both be identified and documented. Do not conflate them into a single "lawful basis" entry.
2. Most likely Article 9(2) condition: Article 9(2)(a) explicit consent, or Article 9(2)(b) if required by employment law, or Article 9(2)(h) for health/care providers.
3. Conduct a Data Protection Impact Assessment (GDPR Article 35) before deployment — biometric processing for identification is widely treated as high-risk requiring a DPIA; confirm against the lead supervisory authority's published Article 35(4) DPIA criteria.
4. Provide pre-collection notice under Articles 13/14 covering biometric modalities, Article 9(2) condition relied upon, retention periods, and data subject rights.
5. Any processor receiving biometric data must have a written DPA under Article 28. Any transfer outside the EEA requires a Chapter V transfer mechanism — either an Article 45 adequacy decision (including the EU–US Data Privacy Framework where the importer is certified) or, absent adequacy, Article 46 appropriate safeguards (SCCs or BCRs).

Consent and notice:
Explicit consent (Article 9(2)(a)) must be freely given, specific, informed, and unambiguous — and genuinely free. In employment contexts, employee consent is unlikely to be "freely given" due to power imbalance (EDPB Guidelines 05/2020); use Article 9(2)(b) employment law basis instead where national law permits.

Retention and destruction:
Apply storage limitation (Article 5(1)(e)): retain biometric templates only as long as necessary for the stated purpose. Define retention periods per purpose and per data category. Delete promptly when the purpose expires.

Sale and sharing restrictions:
Purpose limitation (Article 5(1)(b)) prohibits using biometric data for purposes incompatible with original collection. Processor agreements (Article 28) must restrict vendor use. Chapter V transfer safeguards required for any third-country transfers.

Current enforcement posture:
EU supervisory authorities actively enforce Article 9 biometric obligations. Consult the relevant national DPA's published enforcement register for current cases and penalties.

Priority actions:
1. Document both the Article 6 lawful basis and the Article 9(2) condition separately in a processing record before any biometric data is collected.
2. Complete a DPIA under Article 35 — engage the DPO where designated; consult the lead supervisory authority under Article 36 if residual risk remains high after mitigation.
3. Audit all processor agreements to confirm Article 28 DPAs are executed for biometric data processors and any sub-processors are approved in writing.

Compliance risk rating: HIGH
Active supervisory authority enforcement of Article 9 biometric obligations across multiple EU member states creates material regulatory exposure for any organisation without documented lawful basis, DPIA, and processor controls.
---`;
    }

    if (isUK) {
      return `${jurisdiction} — UK GDPR and Data Protection Act 2018

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under UK GDPR Article 9(1). The operative law is UK GDPR (retained EU GDPR as amended) together with DPA 2018 — not EU GDPR.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. UK GDPR Article 9(2) condition must be identified in addition to an Article 6 lawful basis. Common conditions: Article 9(2)(a) explicit consent; Article 9(2)(b) employment law; Article 9(2)(h) health/care.
2. DPA 2018 Schedule 1 condition must also be satisfied — the applicable Schedule 1 paragraph must be documented.
3. Conduct a DPIA under UK GDPR Article 35 — biometric processing for identification typically requires a DPIA; verify against the ICO's current DPIA guidance and examples lists.
4. Article 13/14 transparency notices must cover the Article 9(2) condition and DPA 2018 Schedule 1 condition relied upon.
5. UK-to-third-country transfers require a UK IDTA or UK-approved SCCs (not EU SCCs).

Consent and notice:
Explicit consent in employment context is unlikely to satisfy "freely given" under UK GDPR — use DPA 2018 Schedule 1 para 1 (employment, social security, social protection law) where national employment law authorises biometric use.

Retention and destruction:
Apply UK GDPR storage limitation principle: define retention period per purpose; delete biometric templates promptly when purpose expires; document the retention schedule.

Sale and sharing restrictions:
UK GDPR purpose limitation (Article 5(1)(b)) and processor contract requirements (Article 28) govern sharing. Use UK IDTA for any transfers to third countries outside the UK adequacy framework.

Current enforcement posture:
The ICO actively enforces UK GDPR biometric obligations. Consult the ICO's published enforcement register for current cases and penalties.

Priority actions:
1. Identify and document the Article 9(2) condition AND the applicable DPA 2018 Schedule 1 condition before any biometric processing begins.
2. Complete a DPIA and, where residual risk remains high, consult the ICO under Article 36.
3. Review all processor agreements: confirm Article 28 DPAs cover biometric data; replace any EU SCCs in UK-to-third-country arrangements with UK IDTA or UK-approved transfer mechanism.

Compliance risk rating: HIGH
ICO enforcement posture on biometric data is active; failure to satisfy both the Article 9(2) condition and the DPA 2018 Schedule 1 condition simultaneously creates material regulatory exposure.
---`;
    }

    if (isIL) {
      const risk = estimateBIPARisk(body.enrolledCount);
      return `${jurisdiction} — Biometric Information Privacy Act (BIPA), 740 ILCS 14

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. BIPA applies to private entities in Illinois that collect, capture, purchase, receive through trade, or otherwise obtain biometric identifiers or biometric information.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Section 15(a): written, publicly available retention and destruction policy before or at the time of collection.
2. Section 15(b): inform the subject in writing of the specific purpose and duration of collection; obtain a written release before collection.
3. Section 15(c): prohibition on sale, lease, trade, or profit from biometric data.
4. Section 15(d): prohibition on disclosure except with consent, to complete financial transaction, or as required by law.
5. Section 15(e): reasonable standard of care for storage; protection at least as protective as other confidential/sensitive data.
6. P.A. 103-0769 (effective Aug 2, 2024): one violation per person per biometric identifier for a single course of conduct (not per scan). Pre-August 2024 conduct may face per-scan exposure in Illinois state court (federal courts apply the Seventh Circuit's retroactivity ruling in Clay v. Union Pacific, No. 25-2185 (7th Cir. Apr. 1, 2026)).

Consent and notice:
Written release (signed by individual or legally authorised representative) required before collection. Standalone biometric-specific release is the defensible practice — embedding in onboarding paperwork is routinely challenged by plaintiffs.

Retention and destruction:
Written retention policy must be publicly available before collection. Destroy biometric data when purpose expires or within 3 years of collection, whichever is first.

Sale and sharing restrictions:
Absolute prohibition on sale, lease, trade, or profit. Disclosure limited to consent, financial transaction completion, or legal compulsion.

Current enforcement posture:
Active private litigation. Illustrative exposure for ${body.enrolledCount} enrolled (using midpoint): $${risk.lowEnd.toLocaleString()} – $${risk.highEnd.toLocaleString()} (negligent to intentional per-person damages). Post-Aug 2024 conduct limited to one violation per person in federal court.

Priority actions:
1. Execute written releases before any biometric collection — use standalone documents not embedded in general onboarding.
2. Publish a written retention and destruction policy on the organisation's website or internal policy portal before collection begins.
3. Audit vendor contracts to confirm no biometric data is shared with entities that would profit from or retain it beyond stated purposes.

Compliance risk rating: CRITICAL
BIPA private right of action with per-person statutory damages creates the highest litigation exposure of any US biometric law; the Illinois plaintiff's bar is highly active.
---`;
    }

    if (isTX) {
      return `${jurisdiction} — Capture or Use of Biometric Identifier Act (CUBI), Tex. Bus. & Com. Code § 503.001

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. CUBI applies to persons capturing biometric identifiers (retina/iris scan, fingerprint, voiceprint, or record of hand or face geometry) for a commercial purpose in Texas.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. § 503.001(b): inform each individual before or at the time of capture that a biometric identifier is being collected; obtain consent. Notice and consent are required — CUBI does not prescribe a signed written release (unlike Illinois BIPA); documented written or electronic consent is recommended as best practice.
2. § 503.001(c)(1): prohibition on sale, lease, or disclosure to third parties except with consent, to complete a requested financial transaction, or as required by law.
3. § 503.001(c)(2): store, transmit, and protect biometric identifiers using security measures that meet or exceed those applied to other sensitive and confidential information.
4. § 503.001(c)(3): destroy biometric identifiers within a reasonable time, no later than one year after the PURPOSE FOR COLLECTION EXPIRES — not one year from last interaction. Define the specific event that triggers purpose expiry for each use case.
5. § 503.001(d): civil penalty up to $25,000 per violation; Texas AG has exclusive enforcement authority — no private right of action.
6. § 503.001(e) [effective Jan 1, 2026, added by HB 149/TRAIGA]: exemption for AI development — CUBI does not apply to biometric data used solely to develop, train, evaluate, or offer AI models, unless the AI is used to uniquely identify a specific individual.

Consent and notice:
Notice and consent before capture. Documented consent (written or electronic) is defensible best practice. Do not rely on general terms of service or bundled onboarding consent.

Retention and destruction:
Destruction trigger: purpose expiry — not a fixed anniversary. Define the event that ends each biometric collection purpose (employment termination, account closure, contract end). The one-year ceiling runs from purpose expiry, not from the initial collection date.

Sale and sharing restrictions:
No sale, lease, or disclosure except with consent, financial transaction completion, or legal requirement. Vendor processing agreements must restrict vendor use to stated purposes.

Current enforcement posture:
Texas AG is the sole enforcer. Texas has secured over $2.7 billion in CUBI settlements (Meta $1.4B, 2024; Google $1.375B, 2025). The AG interprets each person's biometric capture as a separate violation. No private right of action, but the per-violation penalty at scale creates material exposure.

Priority actions:
1. Implement notice-and-consent workflow before any biometric capture — use documented written or electronic consent records per individual.
2. Define the specific event that triggers purpose expiry for each enrolled population (e.g. employment termination, account closure) and document this in a retention and destruction policy.
3. Audit all vendor agreements for biometric data processors — ensure destruction obligations and security requirements are contractually binding.

Compliance risk rating: HIGH
Texas AG enforcement of CUBI is active and has produced multi-billion dollar settlements; the per-violation calculation at scale creates material exposure even without a private right of action.
---`;
    }

    if (isCA) {
      return `${jurisdiction} — California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. California has no standalone biometric privacy statute equivalent to Illinois BIPA. The primary framework is CPRA (amending CCPA), which classifies biometric information as Sensitive Personal Information (SPI). A financial institution GLBA analysis should be conducted before applying CCPA where applicable.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Cal. Civ. Code § 1798.140(ae)(1)(B): biometric information used to identify a consumer is Sensitive Personal Information (SPI).
2. § 1798.121: consumers have the right to direct the business to limit use of SPI to what is necessary to perform services or provide goods reasonably expected. Implement a "Limit the Use of My Sensitive Personal Information" opt-out link.
3. § 1798.100 et seq.: provide notice at or before collection (Privacy Policy and at-collection notice must identify biometric information and SPI status).
4. § 1798.145(e): GLBA exemption — if the organisation is a financial institution under GLBA and the biometric data relates to GLBA-covered activities, CCPA may not apply to that data; complete GLBA boundary analysis first.
5. CPPA enforcement: the California Privacy Protection Agency (CPPA) enforces CCPA/CPRA; private right of action only for data breaches (§ 1798.150).

Consent and notice:
No opt-in consent required for biometric collection under CCPA/CPRA (unlike BIPA). Provide clear at-collection notice and update Privacy Policy to reflect SPI categories and processing purposes. Honor Limit SPI Use requests.

Retention and destruction:
Retain biometric data only as long as necessary for the disclosed purpose (§ 1798.100(a)(3)). Honor deletion requests under § 1798.105 subject to exceptions.

Sale and sharing restrictions:
Prohibition on "sale" and "sharing" of SPI for cross-context behavioral advertising (§ 1798.121). Provide opt-out if SPI is sold or shared. Service providers receiving biometric data must be under written contract restricting further use.

Current enforcement posture:
CPPA enforcement is active; limited private litigation (breach-only). Enforcement focus includes missing SPI notices, inadequate at-collection disclosures, and failure to honor consumer rights.

Priority actions:
1. Update Privacy Policy and at-collection notices to identify biometric information as SPI under § 1798.140(ae)(1)(B).
2. Implement "Limit the Use of My Sensitive Personal Information" mechanism under § 1798.121.
3. Execute CCPA-compliant service provider contracts for all vendors receiving biometric data, restricting further use.

Compliance risk rating: MEDIUM
California has no BIPA-equivalent private litigation; CPPA enforcement is active but concentrated on notice and consumer rights — creating moderate exposure absent a data breach.
---`;
    }

    if (isVA) {
      const orgLower = (body.orgType || "").toLowerCase();
      const isEmploymentContext = orgLower.includes("employ") || orgLower.includes("hr ") || orgLower.includes("workforce") || orgLower.includes("time and attend");
      const isHealthcareContext = orgLower.includes("health") || orgLower.includes("clinical") || orgLower.includes("medical") || orgLower.includes("hospital") || orgLower.includes("patient");

      if (isEmploymentContext) {
        return `${jurisdiction} — Virginia CDPA — Employment context applicability gate

Applies to this organisation: Likely not applicable to this data processing activity — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. The Virginia Consumer Data Protection Act (VCDPA), Va. Code § 59.1-571 et seq., defines "consumer" as a natural person acting in an individual or household capacity. Va. Code § 59.1-575 expressly excludes natural persons acting in a commercial or employment context. Biometric data collected from employees or job applicants is therefore likely outside VCDPA scope.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Confirm that the data subjects are employees or applicants — if so, VCDPA consumer rights and consent requirements do not apply to those individuals under § 59.1-575.
2. No Virginia-specific employment biometric statute currently exists. Virginia common law, Virginia AG consumer protection authority, and any applicable federal employment law (ADA, Title VII) provide the primary legal framework.
3. If the organisation also processes biometric data of non-employee consumers (e.g. customer-facing biometric systems), those consumers ARE within VCDPA scope — conduct a separate VCDPA analysis for that population.
4. Monitor Virginia legislative developments: bills to extend biometric protections to employees have been introduced in prior sessions.
5. Apply strong security, retention, and vendor controls as contractual and operational best practice regardless of VCDPA applicability.

Consent and notice:
No VCDPA opt-in consent obligation applies to employee data. Use clear notice in employee onboarding materials as best practice. Where separate consumer populations are in scope, opt-in consent is required under § 59.1-577(B).

Retention and destruction:
Establish a written retention and destruction policy as best practice — no Virginia statute prescribes a specific period for employee biometric data, but proportionality and data minimisation principles apply.

Sale and sharing restrictions:
No Virginia biometric sale prohibition applies to employee data. Vendor contracts should restrict use to the contracted purpose as standard security practice.

Current enforcement posture:
Virginia AG has not announced enforcement actions targeting employment biometrics. Primary risk is federal (EEOC, NLRB) and common law rather than VCDPA.

Priority actions:
1. Document in your data inventory that the biometric data subjects are employees/applicants and therefore outside VCDPA consumer scope under § 59.1-575.
2. Implement clear employee notice of biometric collection as part of onboarding documentation.
3. Execute vendor agreements restricting biometric data use to the stated access control or attendance purpose, with defined deletion obligations on employment end.

Compliance risk rating: LOW
VCDPA does not apply to employee biometric data; Virginia has no employee biometric statute. Primary exposure is federal employment law and common law duty of care.
---`;
      }

      if (isHealthcareContext) {
        return `${jurisdiction} — Virginia CDPA — Healthcare context applicability gate

Applies to this organisation: Likely partially applicable — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. Va. Code § 59.1-575 defines "biometric data" but expressly excludes information collected, used, or stored for health care treatment, payment, or operations purposes where the organisation is subject to HIPAA. If this organisation is a HIPAA covered entity or business associate and the biometric data relates to treatment, payment, or operations, VCDPA biometric requirements do not apply to that data.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Determine HIPAA covered entity / business associate status — if applicable, and if the biometric processing is for treatment, payment, or operations, the VCDPA § 59.1-575 HIPAA exclusion applies to that data.
2. For biometric data NOT covered by HIPAA exclusion (e.g. biometric access control for non-clinical staff, visitor identification not linked to patient care): VCDPA sensitive data requirements apply — § 59.1-577(B) opt-in consent required.
3. Conduct a data inventory to draw the HIPAA/non-HIPAA boundary within the organisation's biometric processing activities.
4. Execute controller-processor agreements under § 59.1-574 for any biometric data outside the HIPAA exclusion.
5. Virginia AG has exclusive enforcement authority; no private right of action under VCDPA.

Consent and notice:
For HIPAA-excluded data: standard HIPAA Notice of Privacy Practices and authorisation requirements apply. For non-excluded biometric data: VCDPA § 59.1-577(B) opt-in consent is required before processing.

Retention and destruction:
HIPAA data: follow HIPAA retention requirements (generally 6 years). Non-HIPAA biometric data: retain only as long as necessary for the stated purpose.

Sale and sharing restrictions:
HIPAA data: governed by HIPAA minimum necessary and permitted disclosures. Non-HIPAA biometric data: VCDPA prohibits sale without separate disclosure; § 59.1-574 processor contracts required.

Current enforcement posture:
Virginia AG enforcement nascent. HHS OCR is the primary enforcement risk for HIPAA-covered biometric data. VCDPA exposure is secondary for organisations with valid HIPAA coverage.

Priority actions:
1. Complete a HIPAA boundary analysis to determine which biometric data falls within the § 59.1-575 HIPAA exclusion and which does not.
2. For any non-HIPAA-excluded biometric data, implement VCDPA § 59.1-577(B) opt-in consent before processing begins.
3. Execute both BAAs (for HIPAA) and § 59.1-574 processor agreements (for non-HIPAA biometric data) with all relevant vendors.

Compliance risk rating: MEDIUM
Partial HIPAA exclusion means VCDPA applies to a subset of biometric processing — organisations that skip the boundary analysis face opt-in consent gaps for non-HIPAA data; HHS OCR is the primary risk for the HIPAA portion.
---`;
      }

      // Standard VCDPA consumer biometric section (non-employment, non-HIPAA healthcare)
      return `${jurisdiction} — Virginia Consumer Data Protection Act (VCDPA), Va. Code § 59.1-571 et seq.

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Virginia has no standalone biometric statute. The VCDPA classifies biometric data as sensitive data requiring opt-in consent. HIPAA exemptions may apply where the data relates to protected health information; employment-context data is excluded from VCDPA consumer scope under § 59.1-575.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. § 59.1-572: biometric data (data generated by automatic measurements of a consumer's biological characteristics used to identify a specific individual) is sensitive data.
2. § 59.1-577(B): processing sensitive data requires obtaining consumer opt-in consent before processing. This is an affirmative consent requirement — not merely an opt-out.
3. § 59.1-575: data minimization — collect only what is adequate, relevant, and reasonably necessary for the disclosed purpose.
4. § 59.1-579: conduct a data protection assessment for processing presenting heightened risk, including processing sensitive data.
5. Virginia AG has exclusive enforcement authority — there is NO private right of action under the VCDPA.

Consent and notice:
Opt-in consent required before processing biometric data. Consent must be a clear affirmative act; pre-checked boxes and inactivity do not constitute consent. Maintain records of consent.

Retention and destruction:
Retain biometric data only as long as necessary and proportionate to the stated purpose. Honor consumer deletion requests under § 59.1-576.

Sale and sharing restrictions:
Selling biometric data or processing it for targeted advertising requires separate consent or disclosure as required by §§ 59.1-577 and 59.1-578. Processors must be under written contract under § 59.1-574.

Current enforcement posture:
Virginia AG enforcement is nascent. No private right of action. Exposure is primarily regulatory — meaningful where the AG targets large-scale sensitive-data processors.

Priority actions:
1. Implement opt-in consent mechanism for biometric data collection — affirmative, specific, and documented.
2. Conduct a VCDPA data protection assessment for biometric processing under § 59.1-579 before deployment.
3. Execute controller-processor contracts under § 59.1-574 with all vendors processing biometric data on the organisation's behalf.

Compliance risk rating: MEDIUM
Virginia AG-only enforcement and nascent enforcement history reduce immediate exposure, but the opt-in consent requirement creates a clear compliance gap for any organisation without a documented consent mechanism.
---`;
    }

    if (isUS) {
      return `${jurisdiction} — United States: No federal biometric statute; state law landscape

Applies to this organisation: Conditional — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. The United States has no comprehensive federal biometric privacy statute. Biometric obligations arise from a patchwork of state laws and sector-specific federal frameworks. The primary exposure jurisdictions are assessed separately where selected; this section covers the national landscape and sector-specific federal frameworks.

Key state biometric statutes (by litigation and enforcement risk):
1. Illinois BIPA (740 ILCS 14): private right of action per person; highest US biometric litigation risk. Select "Illinois, USA (BIPA)" for a full BIPA analysis.
2. Texas CUBI (Tex. Bus. & Com. Code § 503.001): AG-only enforcement; $25,000/violation; no private right of action. Select "Texas, USA (CUBI)" for a full CUBI analysis.
3. Washington MHMD (RCW 70.372): applies where biometrics are used to infer health status; private right of action via WA Consumer Protection Act.
4. California CCPA/CPRA (Cal. Civ. Code § 1798.100 et seq.): biometric information is Sensitive Personal Information; Limit-Use right applies. Select "California" for full CCPA analysis.
5. Several additional states (Colorado, Connecticut, Oregon, Montana) have comprehensive privacy laws treating biometrics as sensitive data requiring opt-in consent and data protection assessments.

Federal frameworks applicable to biometrics by sector:
1. HIPAA (45 CFR Parts 160 and 164): biometric identifiers are listed PHI identifiers under the Privacy Rule (§ 164.514(b)(2)(i)). Covered entities and business associates processing patient biometrics must comply with HIPAA minimum necessary, authorisation, and Security Rule requirements.
2. GLBA Safeguards Rule (16 CFR Part 314): financial institutions must protect biometric data under their written information security programme.
3. FTC Act Section 5: the FTC has brought unfair or deceptive practice actions relating to biometric data misuse; consent and security failures are enforcement targets.

Current enforcement posture:
At federal level, FTC enforcement under Section 5 is the primary risk for deceptive biometric practices. At state level, Illinois BIPA private litigation is by far the highest-volume risk. Texas AG enforcement has produced multi-billion dollar settlements against large companies. State AG enforcement of comprehensive privacy law biometric provisions is expanding.

Priority actions:
1. Map each operational jurisdiction where the organisation collects biometric data and assess applicable state law — at minimum confirm Illinois, Texas, Washington, and California applicability.
2. Confirm HIPAA and GLBA sector status and ensure biometric data is covered in the relevant security programme and vendor agreements.
3. Implement a baseline consent, notice, and retention programme that satisfies the most stringent applicable state law (currently Illinois BIPA) for any biometric collection where state law is unconfirmed.

Compliance risk rating: HIGH
Multi-state biometric exposure with active private litigation (Illinois) and AG enforcement (Texas) creates material risk; absence of a federal framework means every operational state must be individually assessed.
---`;
    }

    if (isFR) {
      return `${jurisdiction} — GDPR (France) — Supervisory authority: CNIL

Applies to this organisation: In scope — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1). France implements GDPR through the Loi Informatique et Libertés (LIL) as amended. The CNIL has issued specific guidance on biometric systems in the workplace.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 lawful basis AND a separate Article 9(2) condition — both must be documented before any biometric processing begins.
2. CNIL authorisation is no longer required for most biometric systems post-GDPR, but a mandatory DPIA under Article 35 applies — biometric processing for identification is on the CNIL's published list of processing operations requiring a DPIA.
3. In the employment context: CNIL guidance holds that employee consent is generally not valid as an Article 9(2) condition due to power imbalance. Rely on Article 9(2)(b) (employment law basis) supported by a collective agreement or works council consultation (comité social et économique) where applicable.
4. Pre-collection notice under Articles 13/14 must identify the Article 9(2) condition, biometric modalities, retention periods, and data subject rights in French.
5. Article 28 DPA required for all processors receiving biometric data; any transfer outside the EEA requires an Article 45 adequacy decision (including the EU–US Data Privacy Framework where the importer is certified) or, absent adequacy, an Article 46 safeguard (SCCs or BCRs).

Consent and notice:
A standalone, biometric-specific notice must be provided before any collection. In workplace contexts, use Article 9(2)(b) basis and consult the comité social et économique before deployment.

Retention and destruction:
CNIL guidance on biometric access control specifies that biometric templates should not be retained longer than necessary for the authentication purpose. Define a destruction trigger event (employment end, contract termination) and a maximum ceiling.

Sale and sharing restrictions:
GDPR purpose limitation (Article 5(1)(b)) prohibits secondary use of biometric data. Processor agreements (Article 28) must prohibit vendor use for any purpose other than the contracted service.

Current enforcement posture:
The CNIL is one of Europe's most active supervisory authorities on biometric processing. Refer to cnil.fr/fr/les-sanctions for current enforcement actions and figures.

Priority actions:
1. Complete a DPIA before deployment and submit to the CNIL for prior consultation if residual risk remains high after mitigation.
2. Obtain works council (CSE) consultation prior to any employee biometric deployment under French employment law (Code du travail L.2312-38).
3. Execute Article 28 DPAs with all biometric data processors and confirm any non-EEA transfers either rely on an Article 45 adequacy decision or use an approved Article 46 safeguard.

Compliance risk rating: HIGH
CNIL enforcement is active and has targeted biometric workplace systems specifically; the mandatory DPIA and works council consultation requirements create clear procedural gaps for organisations that skip them.
---`;
    }

    if (isIE) {
      return `${jurisdiction} — GDPR (Ireland) — Supervisory authority: Data Protection Commission (DPC)

Applies to this organisation: In scope — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1). Ireland implements GDPR through the Data Protection Act 2018. The DPC is the lead supervisory authority for many multinational technology companies under Article 56 GDPR.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 lawful basis AND a separate Article 9(2) condition — both must be separately documented. For most organisations, the Article 9(2) condition will be explicit consent (9(2)(a)) or, in employment contexts, Article 9(2)(b) with Irish employment law authorisation.
2. Mandatory DPIA under Article 35 before deployment — the DPC has confirmed biometric processing for identification is high risk and requires prior assessment.
3. If the organisation is subject to the DPC's oversight as a lead supervisory authority under Article 56, cross-border processing complaints from any EU member state may be routed through the DPC.
4. Article 13/14 transparency notices required before collection, identifying the Article 9(2) condition, biometric modalities, and data subject rights.
5. Article 28 DPA for all processors; Article 46 safeguard for non-EEA transfers.

Consent and notice:
Explicit consent under Article 9(2)(a) must be freely given. In employment contexts, the DPC's guidance aligns with EDPB position: employee consent is generally not valid due to power imbalance. Use Article 9(2)(b) with Irish employment law basis instead.

Retention and destruction:
Biometric templates must be deleted when the purpose expires. Define the destruction trigger event and a maximum retention ceiling per GDPR storage limitation (Article 5(1)(e)).

Sale and sharing restrictions:
GDPR purpose limitation (Article 5(1)(b)) and Article 28 processor controls govern sharing. Any transfer to the US or other third countries requires an adequacy decision, SCCs, or BCRs under Chapter V.

Current enforcement posture:
The DPC is active in cross-border special-category enforcement. Refer to dataprotection.ie/en/dpc-guidance/enforcement for current enforcement actions.

Priority actions:
1. Complete a DPIA and submit for DPC prior consultation under Article 36 if residual high risk remains after mitigation.
2. Establish which jurisdiction is the DPC's lead supervisory authority remit for this organisation's cross-border processing, and document it.
3. Audit processor agreements to confirm Article 28 DPAs are executed for all biometric data processors, with appropriate Article 46 transfer mechanisms for any US-hosted processors.

Compliance risk rating: HIGH
DPC active enforcement and its role as lead supervisory authority for multinational tech processing creates elevated cross-border regulatory exposure for organisations without completed DPIAs and documented Article 9(2) conditions.
---`;
    }

    if (isDE) {
      return `${jurisdiction} — GDPR (Germany) — Supervisory authorities: Federal (BfDI) + 16 state DPAs (Datenschutzkonferenz)

Applies to this organisation: In scope — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1), implemented in Germany through the Bundesdatenschutzgesetz (BDSG) 2018. Germany has a dual supervisory structure: the federal BfDI oversees public federal bodies and telecommunications/postal sectors; the 16 state DPAs (Landesdatenschutzbehörden) oversee private organisations in their respective states, coordinated through the Datenschutzkonferenz (DSK).

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 GDPR lawful basis AND a separate Article 9(2) condition — both documented. In employment contexts, § 26 BDSG (processing for employment purposes) may provide a basis alongside Article 9(2)(b), but requires necessity and proportionality assessment.
2. Mandatory DPIA under Article 35 — biometric identification systems generally require a DPIA; verify against the DSK's coordinated DPIA must-list and the competent state DPA's published criteria.
3. Works council (Betriebsrat) codetermination rights: under § 87(1) no. 6 Betriebsverfassungsgesetz (BetrVG), the introduction of technical systems capable of monitoring employee conduct or performance — which includes biometric time-and-attendance or access systems — requires works council agreement before deployment. Proceeding without Betriebsrat consent exposes the employer to injunctive relief.
4. Article 13/14 transparency notices in German identifying the Article 9(2) condition, biometric modalities, and data subject rights.
5. Article 28 DPA for all processors; Article 46 safeguard for any non-EEA transfer.

Consent and notice:
Employee consent is generally not valid as an Article 9(2) condition in the German employment context (DSK and EDPB alignment on power imbalance). Rely on § 26 BDSG with Article 9(2)(b) basis. Works council agreement (Betriebsvereinbarung) is typically the pre-condition for lawful employee biometric processing.

Retention and destruction:
Delete biometric templates when the employment relationship ends or the stated purpose expires — define the destruction trigger in the Betriebsvereinbarung or retention policy.

Sale and sharing restrictions:
§ 26 BDSG limits employee data use to employment purposes. GDPR Article 5(1)(b) purpose limitation and Article 28 processor controls govern all sharing. Non-EEA transfers require an Article 46 safeguard.

Current enforcement posture:
German state DPAs actively enforce special-category-data obligations. Refer to the BfDI and individual state DPA enforcement registers for current actions and penalties.

Priority actions:
1. Obtain works council agreement (Betriebsvereinbarung) before deploying any employee biometric system — this is a legal pre-condition, not a best practice.
2. Complete a DPIA and, if residual risk remains, consult the competent state DPA under Article 36.
3. Confirm the responsible state DPA (Landesdatenschutzbehörde) for this organisation's location and register the processing where required by state law.

Compliance risk rating: HIGH
Germany's works council codetermination requirement creates a hard legal gate before employee biometric deployment; state DPA enforcement is active and has specifically targeted biometric workplace systems.
---`;
    }

    if (isES) {
      return `${jurisdiction} — GDPR (Spain) — Supervisory authority: AEPD (Agencia Española de Protección de Datos)

Applies to this organisation: In scope — ${body.orgType} using ${body.biometricTypes.join(", ")} for ${body.purpose}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1), implemented in Spain through Organic Law 3/2018 (LOPDGDD). The AEPD is Spain's national supervisory authority and is one of the EU's most active enforcers of biometric obligations.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 GDPR lawful basis AND a separate Article 9(2) condition — both documented. In employment contexts, Article 9(2)(b) with LOPDGDD Article 9 (processing in employment context) may apply; biometric time-and-attendance typically requires works committee (comité de empresa) consultation under the Workers' Statute (Estatuto de los Trabajadores).
2. Mandatory DPIA under Article 35 — the AEPD's list of processing operations requiring a DPIA includes biometric systems for employee monitoring and identification.
3. Transparency notice under Articles 13/14 in Spanish identifying the Article 9(2) condition, biometric modalities, and rights.
4. AEPD guidance on biometric access control systems (2020) states that facial recognition for access control of employees is not proportionate where less invasive alternatives exist — proportionality is a hard requirement, not a best practice.
5. Article 28 DPA for all processors; Article 46 safeguard for any non-EEA transfer.

Consent and notice:
AEPD guidance aligns with EDPB: employee consent is not valid as an Article 9(2) condition due to power imbalance. Use Article 9(2)(b) with Spanish employment law authorisation. Works committee consultation (comité de empresa or delegados de personal) is required for technical monitoring systems under Article 64 Estatuto de los Trabajadores.

Retention and destruction:
Delete biometric templates when purpose expires. Define the destruction trigger (employment end, contract termination) and maximum retention period in the relevant HR policy.

Sale and sharing restrictions:
LOPDGDD Article 9 and GDPR Article 5(1)(b) purpose limitation prohibit secondary use. Processor agreements (Article 28 DPA) must restrict vendor use to contracted services only.

Current enforcement posture:
The AEPD is among the most active EU authorities on biometric enforcement. Refer to aepd.es/es/resoluciones for current enforcement actions and figures.

Priority actions:
1. Complete a proportionality analysis before deploying any biometric system — demonstrate why less invasive alternatives (PIN, card, mobile) are insufficient for the stated purpose.
2. Complete a DPIA and submit for AEPD prior consultation under Article 36 if residual high risk remains.
3. Conduct works committee consultation before deploying employee biometrics under Article 64 Estatuto de los Trabajadores and document the outcome.

Compliance risk rating: HIGH
The AEPD actively enforces biometric obligations, and its proportionality requirement creates an additional substantive hurdle that many deployments fail without documented analysis.
---`;
    }

    // Generic fallback for other jurisdictions
    return `${jurisdiction} — biometric privacy assessment

Applies to this organisation: Conditional — ${body.orgType} uses ${body.biometricTypes.join(", ")} for ${body.purpose}. Applicable biometric and sensitive-data obligations depend on the specific laws in force in this jurisdiction.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Identify the applicable biometric or sensitive-data law in this jurisdiction and confirm whether biometric identifiers fall within its scope.
2. Obtain required consent or satisfy the applicable lawful basis before any biometric collection.
3. Provide pre-collection notice describing biometric types, purpose, retention, and data subject rights.
4. Store and transmit biometric templates with security measures commensurate with their sensitivity.
5. Bind all processors of biometric data under written agreements restricting use and requiring deletion.

Consent and notice:
Obtain consent or satisfy the applicable lawful basis before collection. Use a standalone notice that is specific to biometric collection — do not bury it in general terms.

Retention and destruction:
Destroy biometric templates when the collection purpose expires. Define the specific event that triggers purpose expiry and document it in a retention policy.

Sale and sharing restrictions:
Limit disclosure to processors with a legitimate need. Apply the sharing restrictions mandated by the applicable law for this jurisdiction.

Current enforcement posture:
Consult the applicable supervisory authority or attorney general's enforcement register for this jurisdiction — enforcement posture varies and is not captured in this assessment.

Priority actions:
1. Confirm which biometric privacy or data protection law applies in this jurisdiction and review its specific requirements.
2. Implement jurisdiction-appropriate consent and notice procedures before any biometric collection.
3. Execute processor agreements covering biometric security, sub-processors, and deletion.

Compliance risk rating: HIGH
Biometric data carries elevated regulatory risk in most jurisdictions; this assessment should be supplemented with jurisdiction-specific legal advice.
---`;
  }

  const uniqueJurisdictions = [...new Set(body.jurisdictions)];
  const orgLabel = body.orgName ? `Prepared for: ${body.orgName} (${body.orgType})` : `Organisation type: ${body.orgType}`;
  const sectionTexts = uniqueJurisdictions.map(stressSection);
  const assessment_text = `${orgLabel}\nGenerated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n\n---\n\n` + sectionTexts.join("\n\n");

  const report_data = {
    bipa_risk: bipaRisk,
    jurisdictions_analysed: uniqueJurisdictions,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, stress_run: true },
    annotations: [],
    lint_warnings: [],
    generated_at: new Date().toISOString(),
  };

  let savedId: string | null = null;
  if (body.assessment_id) {
    const { data, error } = await supabase.from("biometric_assessments").update({
      client_id: body.client_id ?? null,
      status: "complete",
      intake_data: body,
      jurisdictions: body.jurisdictions,
      analysis_text: assessment_text,
      report_data,
      updated_at: new Date().toISOString(),
    }).eq("id", body.assessment_id).select("id").maybeSingle();
    if (error) throw error;
    savedId = data?.id ?? body.assessment_id;
  } else {
    const { data, error } = await supabase.from("biometric_assessments").insert({
      user_id: resolvedUserId,
      client_id: body.client_id ?? null,
      status: "complete",
      intake_data: body,
      jurisdictions: body.jurisdictions,
      analysis_text: assessment_text,
      report_data,
      is_free_tier: !!body.is_free_tier,
    }).select("id").single();
    if (error) throw error;
    savedId = data.id;
  }

  return new Response(JSON.stringify({
    id: savedId,
    assessment_text,
    bipa_risk: bipaRisk,
    jurisdictions_analysed: body.jurisdictions,
    enforcement_precedents: [],
    generated_at: report_data.generated_at,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req, "user");
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = (await req.json()) as Body;
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;


    if (!Array.isArray(body.jurisdictions) || body.jurisdictions.length === 0) {
      return new Response(JSON.stringify({ error: "At least one jurisdiction required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(body.biometricTypes) || body.biometricTypes.length === 0) {
      return new Response(JSON.stringify({ error: "At least one biometric type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.stress_run === true) {
      return await runStressBiometric(body, resolvedUserId);
    }

    const fnRun = await startFunctionRun(supabase, "check-biometric-compliance", {
      archetype: "streaming",
      trustClass: "user",
      userId: resolvedUserId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { jurisdictions: body.jurisdictions, biometricTypes: body.biometricTypes },
    });

    // Wrap heavy work in a streaming response so the edge runtime's 150s
    // request-idle timeout never trips — we write a single whitespace byte
    // every 10s as a keep-alive, then the final JSON. JSON.parse() ignores
    // leading whitespace so the caller's `await r.json()` still works.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamClosed = false;
        let finished = false;
        const writer = {
          write: async (chunk: Uint8Array) => {
            if (streamClosed) return;
            try { controller.enqueue(chunk); } catch { streamClosed = true; }
          },
          close: async () => {
            if (streamClosed) return;
            streamClosed = true;
            try { controller.close(); } catch { /* already closed */ }
          },
        };
        const keepAlive = setInterval(() => {
          if (streamClosed) return;
          writer.write(encoder.encode(" ")).catch(() => {});
        }, 10000);

        try {


    // Step 1 — enforcement context
    let enforcement_context: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const er = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-enforcement-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          tool: "biometric-checker",
          jurisdictions: body.jurisdictions,
          data_categories: ["biometric"],
          biometric: true,
          limit: 12,
        }),
      });
      if (er.ok) {
        const j = await er.json();
        enforcement_context = j.results || j.enforcement_context || [];
        enforcementMeta = {
          attempted: true,
          total_matched: typeof j?.total_matched === "number" ? j.total_matched : null,
          query_descriptor: `biometric processing in ${(body.jurisdictions || []).join(", ") || "—"}`,
        };
      }
    } catch (e) {
      console.error("enforcement fetch failed:", e);
    }

    // Step 2 — BIPA risk
    const bipaApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("illinois") || j.toLowerCase().includes("bipa")
    );
    const bipaRisk = bipaApplies ? estimateBIPARisk(body.enrolledCount) : null;

    // Washington My Health My Data Act applies broadly to "consumer health data"
    // including biometric data tied to health inferences. Private right of action
    // under WA Consumer Protection Act creates litigation exposure.
    const wamhmdApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("washington") || j.toLowerCase().includes("mhmd")
    );

    // "Other US state" is a generic catch-all selection — flag explicitly so the
    // model produces a section covering Texas CUBI + WA MHMD + general state-law
    // posture rather than silently dropping the jurisdiction from output.
    const otherUsStateApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("other us"));

    // Explicit Texas CUBI selection — triggers CUBI-specific context injection
    // (distinct from "Other US state" which has its own broader catch-all block).
    const texasApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("texas"));

    // EU/EEA GDPR — triggers Article 9 and DPIA context injection.
    const euGdprApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("eu") || j.toLowerCase().includes("eea") ||
             (j.toLowerCase().includes("gdpr") && !j.toLowerCase().includes("uk")));

    // UK GDPR — triggers UK DPA 2018 and ICO context injection.
    const ukGdprApplies = body.jurisdictions.some(
      (j) => j.toLowerCase().includes("united kingdom") || j.toLowerCase().includes("uk gdpr"));

    // Step 3 — Haiku
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      await writer.write(encoder.encode(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" })));
      return;
    }


    const isStressRun = body.stress_run === true;
    const model = isStressRun ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
    const maxTokens = isStressRun ? 6500 : PRODUCT_MAX_OUTPUT_TOKENS;

    const prompt = `You are a biometric privacy compliance analyst. Analyse the biometric data processing described below and produce a structured compliance assessment for each jurisdiction.

PROCESSING DETAILS
Organisation name: ${(body as any).orgName || (body as any).organizationName || "Not specified"}
Biometric data types: ${body.biometricTypes.join(", ")}
Organisation type: ${body.orgType}
Primary purpose: ${body.purpose}
Individuals enrolled: ${body.enrolledCount}
Jurisdictions: ${body.jurisdictions.join(", ")}
${wamhmdApplies ? `
WASHINGTON MY HEALTH MY DATA ACT (MHMD) — APPLICABILITY FLAG
Washington is in scope. If the biometric data is used to identify health status,
diagnosis, treatment, or to infer any consumer health condition, MHMD applies in
addition to general WA consumer protection law. MHMD requires:
  - separate, opt-in consent (distinct from any biometric consent),
  - a published "consumer health data privacy policy" with specific contents,
  - heightened restrictions on sale and on geofencing around health facilities.
MHMD has a private right of action via the WA Consumer Protection Act.
Address MHMD obligations explicitly in the Washington section.
` : ""}${texasApplies && !otherUsStateApplies ? `
TEXAS CUBI — EXPLICIT SELECTION
Texas, USA (CUBI) is in scope. The Texas section MUST cite subsections using the correct map:
§ 503.001(b) = consent and notice; § 503.001(c)(1) = disclosure prohibition; § 503.001(c)(2) = security; § 503.001(c)(3) = destruction (purpose expiry, NOT "last interaction"); § 503.001(d) = penalty ($25,000/violation, AG-only, no private right of action); § 503.001(e) [from Jan 1, 2026] = AI development exemption.
CUBI does NOT require a signed written release — do not import BIPA's written release requirement. State consent as: notice and consent before capture; recommend documented written/electronic consent as best practice.
` : ""}${euGdprApplies ? `
EU/EEA GDPR — BIOMETRIC REQUIREMENTS
For each EU/EEA section: (1) cite GDPR Article 9(1) as the source of the special-category prohibition; (2) identify the applicable Article 9(2) condition separately from the Article 6 basis; (3) include a DPIA screening recommendation under Article 35; (4) replace "do not sell" with purpose limitation (Article 5(1)(b)) and processor contract (Article 28) language; (5) identify the lead supervisory authority under Article 56 for cross-border processing.
` : ""}${ukGdprApplies ? `
UK GDPR AND DPA 2018 — BIOMETRIC REQUIREMENTS
For the UK section: (1) label as "UK GDPR and Data Protection Act 2018" — not "EU GDPR"; (2) identify the Article 9(2) condition AND the DPA 2018 Schedule 1 condition separately; (3) include Article 35 DPIA recommendation with ICO as supervisory authority; (4) use "United Kingdom" in the heading — not "GB"; (5) for UK-to-third-country transfers, reference UK IDTA or UK-approved SCCs, not EU SCCs; (6) replace "do not sell" with UK GDPR purpose limitation and Article 28 processor controls.
` : ""}${otherUsStateApplies ? `
OTHER US STATE — APPLICABILITY FLAG
"Other US state" is in scope. Produce a dedicated "Other US State — General US Biometric Privacy Posture" section that:
  - notes Texas Capture or Use of Biometric Identifier Act (CUBI) requirements: § 503.001(b) notice and consent before capture (no signed written release required — that is Illinois BIPA); § 503.001(c)(2) reasonable security; § 503.001(c)(3) destruction within reasonable time no later than one year after PURPOSE expiry (not "last interaction"); § 503.001(d) civil penalty up to $25,000/violation, Texas AG enforcement only — no private right of action; § 503.001(e) [effective Jan 2026] AI development exemption,
  - notes Washington My Health My Data Act exposure where biometrics infer health status,
  - covers the broader pattern across CA/CO/CT/VA/UT/OR comprehensive privacy laws treating biometrics as sensitive data requiring opt-in consent and DPIAs,
  - identifies the most likely applicable state regime based on the organisation type and purpose described.
Do NOT skip this section even though no specific state was named.
` : ""}ENFORCEMENT PRECEDENTS
${formatEnforcementContext(enforcement_context)}
${bipaRisk ? `
BIPA LITIGATION RISK ESTIMATE (Illinois) — USE ONLY IF BIPA APPLIES
Use these figures only inside the Illinois section, and only after you have determined that BIPA applies (Applies = Yes or Conditional). Do not surface these numbers before the applicability determination.
Based on ${body.enrolledCount} enrolled individuals:
Low end (negligent violations): $${bipaRisk.lowEnd.toLocaleString()}
High end (intentional violations): $${bipaRisk.highEnd.toLocaleString()}
${bipaRisk.note}
` : ""}
For each jurisdiction, structure your output EXACTLY as follows:

[JURISDICTION] — [LAW NAME]

Applies to this organisation: [Yes / Conditional / No] — [one sentence reason]

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
[Numbered list of specific obligations relevant to this org type and purpose]

Consent and notice:
[Specific format, timing, and language requirements]

Retention and destruction:
[Specific rules including any mandatory destruction timelines or schedules]

Sale and sharing restrictions:
[Specific prohibitions]

Current enforcement posture:
[Based on enforcement context: what regulators are actively targeting]

Priority actions:
[3–5 numbered actions specific to this organisation type and purpose]

Compliance risk rating: [LOW / MEDIUM / HIGH / CRITICAL]
[One sentence explaining the rating based on enforcement activity and likely gap]
---

After all jurisdiction sections, add:
===ANNOTATIONS===
followed by a JSON array citing enforcement actions that directly supported a priority action, risk rating, or enforcement posture assessment above. Use the exact id values from the enforcement context above (the value after 'id:'). Only cite cases from the ENFORCEMENT PRECEDENTS above — never from training knowledge. Each annotation object has this shape:
{
  "enforcement_action_id": "exact id string",
  "regulator": "regulator name",
  "jurisdiction": "jurisdiction",
  "decision_date": "YYYY-MM-DD or null",
  "summary": "one sentence what the case involved, max 25 words, plain English",
  "outcome": "rejected | accepted | penalised | required",
  "relevance": "one sentence why this case is relevant to this assessment"
}
If no cases informed the assessment, output an empty array [].

Output ONLY the compliance assessment (then the ===ANNOTATIONS=== block). No preamble.`;
    const stressBudget = isStressRun ? `

STATIC-STRESS MODE: Produce the same required sections, but keep each section concise. Target 3-5 obligations, 3 priority actions, and no extended background discussion. Do not omit any selected jurisdiction.` : "";

    const today = new Date().toISOString().slice(0, 10);
    const composedSystem: SystemBlock[] = buildSystemContent({
      toolModule: BIOMETRIC_TOOL_MODULE,
      variant: isStressRun ? "lean" : "full",
      currentDate: today,
      cache: true,
      // FORK-R1 R4: facts (ICO figures, BIPA citations, CUBI map, FDBR, PRA-by-statute)
      // come from the registry — never from inline prose. A one-line registry edit
      // changes the biometric output on the next run.
      injected: renderRegistryFor("biometric-checker"),
    });
    // Pilot override: service-role callers can fully replace the system prompt to
    // A/B-test a candidate fix on the held-out scenarios (see validate-fix function).
    const overrideText = (caller.internal && typeof body.system_prompt_override === "string"
      && body.system_prompt_override.trim().length > 0)
      ? body.system_prompt_override : null;
    const biometricSystem: SystemBlock[] = overrideText
      ? [{ type: "text", text: overrideText }]
      : composedSystem;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: biometricSystem,
        messages: [{ role: "user", content: prompt + stressBudget }],
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const errText = aiRes.body ? await aiRes.text() : "no body";
      console.error("Claude error:", errText);
      await writer.write(encoder.encode(JSON.stringify({ error: "AI generation failed" })));
      return;
    }


    // Stream Anthropic SSE so the edge runtime's 150s idle timeout never
    // trips on long Sonnet generations.
    let fullText = "";
    let stopReason: string | null = null;
    {
      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              fullText += evt.delta.text ?? "";
            } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
              stopReason = evt.delta.stop_reason;
            }
          } catch { /* ignore malformed line */ }
        }
      }
    }
    const aiData: any = { stop_reason: stopReason };
    console.log(`[check-biometric-compliance] gen done stop=${aiData.stop_reason ?? null} chars=${fullText.length}`);
    let assessment_text = fullText
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^\*\s+/gm, '• ');
    let parsedAnnotations: any[] = [];
    try {
      const sepIdx = fullText.indexOf("===ANNOTATIONS===");
      if (sepIdx !== -1) {
        assessment_text = fullText.slice(0, sepIdx).trim()
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*\*/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*([^*\n]+)\*/g, '$1')
          .replace(/^>\s?/gm, '')
          .replace(/^\*\s+/gm, '• ');
        const annotationsRaw = fullText.slice(sepIdx + "===ANNOTATIONS===".length).trim();
        const cleaned = annotationsRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start !== -1 && end !== -1) {
          const arr = JSON.parse(cleaned.slice(start, end + 1));
          if (Array.isArray(arr)) parsedAnnotations = arr;
        }
      }
    } catch (e) {
      console.warn("[Biometric] annotation parse failed (non-fatal):", e);
      parsedAnnotations = [];
    }

    // ── R0 PART 3: Output lint on final narrative. Apply auto-fixes;
    // retry once on hard violations; persist lint summary.
    const referenceDate = new Date().toISOString();
    const lintViolations: any[] = [];
    {
      let lint = lintReportText(assessment_text, {
        checkDates: true, checkUnresolvedTokens: true, referenceDate,
      });
      if (lint.clean !== assessment_text) assessment_text = lint.clean;
      if (!isStressRun && hasHardViolations(lint)) {
        try {
          const details = lint.violations.filter((v) => v.severity === "hard")
            .map((v) => `${v.code}: ${v.detail}`).join("; ");
          const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: PRODUCT_MAX_OUTPUT_TOKENS,
              system: "You are a biometric privacy compliance analyst. Reproduce the prior assessment, correcting these automated-lint defects silently and without meta-commentary: " + details,
              messages: [
                { role: "user", content: prompt + stressBudget },
                { role: "assistant", content: fullText },
                { role: "user", content: `Regenerate the assessment correcting: ${details}. Same output format, same ===ANNOTATIONS=== block.` },
              ],
            }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryFull = retryData.content?.[0]?.text ?? "";
            console.log(`[check-biometric-compliance] gen done stop=${retryData.stop_reason ?? null} chars=${retryFull.length}`);
            let retryText = retryFull;
            const sep2 = retryFull.indexOf("===ANNOTATIONS===");
            if (sep2 !== -1) retryText = retryFull.slice(0, sep2).trim();
            retryText = retryText
              .replace(/^#{1,6}\s+/gm, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '')
              .replace(/\*([^*\n]+)\*/g, '$1').replace(/^>\s?/gm, '').replace(/^\*\s+/gm, '• ');
            assessment_text = retryText;
            lint = lintReportText(assessment_text, {
              checkDates: true, checkUnresolvedTokens: true, referenceDate,
            });
            assessment_text = lint.clean;
          }
        } catch (e) {
          console.warn("[Biometric] lint retry failed (non-fatal):", e);
        }
      }
      for (const v of lint.violations) lintViolations.push(v);
    }

    const report_data = {
      bipa_risk: bipaRisk,
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      annotations: parsedAnnotations,
      lint_warnings: lintViolations,
      generated_at: new Date().toISOString(),
    };


    let savedId: string | null = null;
    const isDryRun = caller.internal && body.dry_run === true;
    if (!isDryRun) {
    try {
      if (body.assessment_id) {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .update({
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.assessment_id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        savedId = data?.id ?? body.assessment_id;
      } else {
        const { data, error } = await supabase
          .from("biometric_assessments")
          .insert({
            user_id: resolvedUserId,
            client_id: body.client_id ?? null,
            status: "complete",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            analysis_text: assessment_text,
            report_data,
            is_free_tier: !!body.is_free_tier,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }
    } catch (persistErr) {
      console.error("biometric_assessments persist failed:", persistErr);
    }
    }

    await finishFunctionRun(supabase, fnRun, {
      status: isDryRun ? "success" : (savedId ? "success" : "partial"),
      sourceTable: "biometric_assessments",
      sourceRowId: savedId,
    });
    finished = true;

    // C4 RoPA accumulator: biometric processing is always RoPA-relevant & high-risk
    if (!isDryRun && savedId && body.client_id) {
      const useCase = (body as any).use_case || (body as any).biometric_use_case || "Biometric processing";
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: body.client_id,
          source_tool: "biometric_checker",
          source_assessment_id: savedId,
          display_name: `Biometric: ${String(useCase).slice(0, 80)}`,
          source_summary: String(useCase),
          is_high_risk: true,
          category: "technology",
        },
      }).catch((e: Error) => console.error("[biometric] accumulate-ropa failed (non-fatal):", e.message));
    }

        clearInterval(keepAlive);
        await writer.write(encoder.encode(JSON.stringify({
          id: savedId,
          assessment_text,
          bipa_risk: bipaRisk,
          jurisdictions_analysed: body.jurisdictions,
          enforcement_precedents: report_data.enforcement_precedents,
          generated_at: report_data.generated_at,
        })));
      } catch (e) {
        clearInterval(keepAlive);
        if (!finished) {
          await failFunctionRun(supabase, fnRun, e);
        } else {
          console.error("[biometric] post-success stream delivery failed (non-fatal):", e);
        }
        console.error("check-biometric-compliance error:", e);
        try {
          await writer.write(encoder.encode(JSON.stringify({ error: "An internal error occurred" })));
        } catch { /* ignore */ }
      } finally {
        clearInterval(keepAlive);
        try { await writer.close(); } catch { /* ignore */ }
      }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-biometric-compliance error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

