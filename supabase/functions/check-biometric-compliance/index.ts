// qb8 build active
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
// BUILD_STAMP — real exported constant (was previously a comment; telemetry could
// not verify the deploy). Bump on every behavior edit. External-verification gate:
// clone HEAD sha == BUILD_STAMP prefix.
export const BUILD_STAMP = "post-c1-fix-2cd-biometric-suggested-owner-and-cites@2026-07-23T18:25:00Z";
// check-biometric-compliance: per-jurisdiction biometric obligations + BIPA risk.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { renderRegistryFor } from "../_shared/registry/product-manifest.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { detectTestStatesLeak } from "../_shared/cppa-test-states.ts";

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



CITATION GUARDRAILS:
  - Cite enforcement actions ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt (each tagged [E#] with an id) AND from the ICO ENFORCEMENT FIGURES registry block. Never reference regulator fines from training knowledge.
  - Do not invent statute years, fine amounts, or case names. If the enforcement block is empty for a jurisdiction, say so plainly rather than backfilling from memory.
  - MONETARY PENALTY GUARD: use ONLY the GBP £ amounts in the ICO ENFORCEMENT FIGURES registry block; never use training-data figures. If a case is relevant but no verified amount is available, write "[fine — verify at ico.org.uk/action-weve-taken/enforcement]" rather than estimating. This guard governs YOUR sourcing — it must never appear as text in the output. Do NOT write user-facing sentences like "do not rely on training-knowledge fine amounts"; if a currency caution belongs in the output, address it to the reader (e.g. "refer to the ICO enforcement register for current penalty amounts").
  - ARTICLE 9(2) CONDITION IS SELECTED, NOT LISTED (QB 2026-07-22): select the SINGLE Art. 9(2) condition best supported by the intake facts and justify the selection against those facts. NEVER present the condition as a menu of alternatives tied to sectors the intake does not establish — writing "Article 9(2)(a) explicit consent, or Article 9(2)(b) if required by employment law, or Article 9(2)(h) for healthcare purposes" for a customer-authentication intake at a financial institution is a defect. Where the intake genuinely leaves the choice open between two conditions the intake facts DO support, name both and state the specific fact the business must confirm to select between them — not a generic sector menu.
  - SECTOR FRAMEWORKS ARE INVOKED ONLY WHEN THE INTAKE ESTABLISHES THE SECTOR: NEVER extend the analysis to HIPAA, GLBA Safeguards Rule, FERPA, GINA, or any other US sector framework unless the intake establishes that sector applies (e.g. "HIPAA: biometric identifiers constitute PHI under HIPAA (45 CFR § 160.103)" is a defect on a financial-institution intake where the intake does not establish a HIPAA covered-entity or business-associate role). GLBA is analysed only where the intake establishes a GLBA financial institution; HIPAA only where the intake establishes a covered entity or business associate; etc.
  - NO INTERNAL CLASSIFICATION LABELS IN THE OUTPUT: NEVER emit internal classification, status, or applicability labels as user-facing text — banned patterns include "Applies to this organisation: Conditional", "Applies to this organisation: Yes/No", "Applicability: Conditional", "Status: Conditional/Resolved/Indeterminate", or any similar classifier-tag prefix. State the substantive conclusion in prose ("On the intake as supplied, this obligation applies where the business confirms [fact]; on this record that confirmation is not supplied, so the requirement is treated as conditional pending confirmation") rather than emitting the label itself.
  - JURISDICTION SECTIONS NAME THE SPECIFIC STATUTE(S): every jurisdiction section names the specific applicable statute(s) with citation (e.g. "Illinois — BIPA, 740 ILCS 14/15(a)–(d)"; "EU — GDPR Article 9(1) prohibits processing of biometric data for uniquely identifying a natural person absent an Article 9(2) condition"). NEVER instruct the reader to "confirm which biometric privacy or data protection law applies in this jurisdiction and review its specific requirements" as the substantive content of a jurisdiction section — that is a non-answer. Where the jurisdiction is genuinely unresolved on the intake (e.g. "Other US state" not selected), state that the state was not specified and enumerate the state statutes the reader should evaluate by name (Texas CUBI, Washington MHMD, New York SHIELD, etc.) rather than a generic "confirm the applicable law" instruction.


ENFORCEMENT CASE CITATION FORMAT IN PROSE: When referencing any enforcement case in the body of the compliance assessment, use the human-readable citation shown in the ENFORCEMENT PRECEDENTS block (e.g. "ICO (2022) — Clearview AI" or "DPC (2023) — Centric Health Ltd.") — NEVER the bracketed [E#] code. The [E#] tag exists only for your internal lookup. The [E#] labels are NOT visible to the user and must NOT appear in the output text. Reserve the exact id values exclusively for the ===ANNOTATIONS=== JSON block at the end.

QUALITY STANDARDS:
1. Risk ratings (LOW/MEDIUM/HIGH/CRITICAL) must reflect actual enforcement posture in the named jurisdictions, not theoretical exposure.
2. For BIPA: any litigation-risk framing must account for per-person per-violation statutory damages ($1,000 negligent / $5,000 intentional) and the P.A. 103-0769 single-violation rule for post-August 2024 conduct. The intake does not supply an enrollment figure — describe exposure qualitatively (per-person, per-violation) and do not compute an illustrative dollar range.
3. Priority actions must be specific — name the law, the requirement, and the concrete control or document the organisation must put in place. No generic "review your practices".
4. Where enforcement precedents show specific omissions that have been sanctioned (e.g. missing written consent, no retention schedule), call those out as priority gaps.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective 1 Jan 2026): individuals within 30 calendar days of discovery; AG sample copy within 15 calendar days of consumer notice when 500+ CA residents affected. Do NOT describe California as having no fixed deadline — that was the pre-2026 standard. 72 hours remains a GDPR Article 33 concept only. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number.

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

HR EMPLOYMENT BIOMETRIC CONSENT RULE: When the organisation type is "Employer (employee biometrics)" or the purpose is "Time & attendance / workforce management" or "Physical access control" and the jurisdiction is EU/EEA or UK: the Key requirements section MUST include a warning that employee consent for biometric processing is likely not a valid Article 9(2) condition under GDPR in the employment context. The EDPB and multiple national supervisory authorities (including the German Datenschutzkonferenz, the French CNIL, and the Spanish AEPD) have held that genuine freely given consent is generally not possible where there is a clear imbalance of power between the data subject and the controller, such as in the employment relationship (EDPB Guidelines 05/2020 on consent, para. 21). The employer should instead rely on: Article 9(2)(b) (processing necessary for employment law obligations, if applicable national law permits biometric use in employment) or Article 9(2)(g) (substantial public interest, with proportionate safeguards and national law authorisation). Works council consultation may be required in Germany, France, Spain, and the Netherlands. In Germany, distinguish the two obligations: a works council agreement (Betriebsvereinbarung) satisfies the labour-law co-determination requirement under § 87 BetrVG for introducing the system, while the data-protection lawful basis remains § 26 BDSG with Article 9(2)(b) and must be documented separately in the Article 30 record — the Betriebsvereinbarung is a precondition, not the lawful basis. State this clearly in the employment-context sections.

KYC/AML LEGAL BASIS RULE: When the purpose includes KYC, anti-money laundering, or identity verification for financial regulatory compliance: for EU/EEA and UK sections, analyze the legal basis in two steps before defaulting to consent. Step 1: determine whether the biometric verification is required by a legal obligation (EU AML Directive, national AML law, or equivalent) — if so, Article 6(1)(c) (legal obligation) is the Article 6 basis, not Article 6(1)(a) (consent). Step 2: the Article 9(2) condition for the biometric element still needs separate analysis even where Article 6(1)(c) applies — the most likely condition is Article 9(2)(g) (substantial public interest) or a national law authorisation. Do not present explicit consent as the default legal basis for KYC/AML biometric processing.

RISK RATING CRITERIA: Apply these criteria consistently when assigning LOW / MEDIUM / HIGH / CRITICAL ratings:
  CRITICAL: Active enforcement history in this jurisdiction for this organisation type; private right of action with per-violation statutory damages at scale; no defensible consent practice currently in place.
  HIGH: Established regulatory enforcement posture; known active AG or supervisory authority enforcement; meaningful litigation exposure even if no current confirmed gap.
  MEDIUM: Law clearly applies; no major enforcement history for this specific processing type; organisation appears to have baseline controls but gaps remain.
  LOW: Law applies conditionally or applicability is uncertain; enforcement is nascent or theoretical; organisation's scale reduces immediate exposure.
  CURRENT vs PROSPECTIVE: the rating reflects the organisation's CURRENT compliance posture. Where the intake states no active biometric processing is currently deployed, the current rating is LOW (no processing, hence no current exposure); state the prospective rating separately in the same sentence — e.g. "Current risk: LOW (no biometric processing deployed); prospective risk: HIGH upon any deployment, due to [jurisdiction-specific enforcement/consent requirements]." Never assign a flat CURRENT rating of HIGH or CRITICAL to a jurisdiction where the organisation has no active biometric processing; HIGH/CRITICAL describe prospective exposure only in that case.
Always state in one sentence after the rating why that level was selected, referencing enforcement posture and identified gaps.

ENFORCEMENT-POSTURE GROUNDING: in any "Current enforcement posture" paragraph, do NOT assert that a specific named authority (ICO, CNIL, Garante, AEPD, DSK, a German state DPA, etc.) "has issued", "has targeted", or "actively enforces via" specific enforcement actions unless a specific action from the ENFORCEMENT PRECEDENTS block is cited alongside the claim. If no cited action is available, state only general enforceability plus the register reference — e.g. "EU supervisory authorities enforce Article 9 biometric obligations; consult the relevant national DPA enforcement register for current cases" (EU section) or "The ICO enforces UK GDPR biometric obligations; consult ico.org.uk/action-weve-taken/ for current cases" (UK section). Never pair an uncited factual assertion that specific enforcement has occurred with a direction to verify it elsewhere. And do NOT emit any self-directed sourcing instruction as user-facing text (e.g. "do not rely on training-knowledge fine amounts") — that governs your sourcing, not the reader's; if a currency caution belongs in the output, address it to the reader.
JURISDICTIONAL HYGIENE — DO NOT MIX REGULATORS ACROSS SECTIONS: The ICO is the UK supervisory authority and must appear ONLY in UK / GB sections — never in an EU GDPR section (post-Brexit the ICO has no EU GDPR competence). This applies to EVERY paragraph type, not just the per-jurisdiction "Current enforcement posture" block that follows the worked examples below — it also applies to any cross-jurisdiction summary, executive overview, or combined "EU GDPR enforcement" discussion you generate for an organisation with both EU and UK presence. If an organisation operates in both the EU and the UK, write TWO separate enforcement-posture statements (one EU, listing only EU/EEA authorities; one UK, naming the ICO) — never one combined "EU GDPR" paragraph that lists the ICO alongside CNIL/Garante/AEPD/DSK. Within an EU GDPR section, name only EU/EEA supervisory authorities (e.g. CNIL, Garante, AEPD, DSK/Land authorities). When listing GDPR Chapter V transfer mechanisms, distinguish Article 45 adequacy decisions from Article 46 appropriate safeguards: an Article 45 adequacy decision (including the EU–US Data Privacy Framework, where the importer is certified under it) removes the need for Article 46 safeguards; absent adequacy, the transfer needs Article 46 safeguards (SCCs or BCRs). The Data Privacy Framework is an Article 45 adequacy decision — NEVER list it (or "adequacy") as an Article 46 safeguard. For UK transfer mechanisms list "a UK adequacy decision under UK GDPR Article 45 (including the UK–US Data Bridge where the US importer is certified), or absent adequacy, a UK IDTA or the UK Addendum to the EU SCCs".

NO META-COMMENTARY IN USER-FACING OUTPUT: User-facing prose must read as finished advice to the reader. Never emit text directed at yourself or the system — instructions about how to source, ground, or verify enforcement data; notes about the supplied corpus; or bracketed citation-to-be-confirmed markers. If you cannot ground a specific fine or case from the supplied ENFORCEMENT PRECEDENTS block, state the obligation at statute level and direct the reader to the regulator's public enforcement register, without referring to your own grounding instructions. Do not include an external URL unless that exact URL appears in the supplied corpus. Do NOT copy any example phrase from these instructions into the report.

2.6a CHAPTER V SENTENCE (verbatim where the Chapter V mechanism list is presented): "Chapter V transfer mechanisms required for any third-country transfers: an Article 45 adequacy decision, or Article 46 safeguards (SCCs, BCRs) where no adequacy decision applies."

2.6b UK EMPLOYMENT CONDITION CITE (use this form consistently wherever the UK employment lawful-condition is cited): "DPA 2018 Schedule 1, Part 1, paragraph 1 (employment, social security and social protection)."

2.6c ENFORCEMENT-REGISTER FOOTER (emit ONCE per output, not per jurisdiction — place at the end of the enforcement-posture material): "Enforcement posture descriptions reference supervisory-authority registers; verify current actions, amounts and case details against the respective registers."

2.6 S1 SCHEMA — INFORMATION NEEDED: At the very end of the compliance assessment prose (after the currency footer), emit the following block verbatim, populating the JSON array — REQUIRED whenever any finding is insufficient-basis / Insufficient information; otherwise emit an empty array:

===INFORMATION_NEEDED===
[
  { "field": "<intake field key that exists in the intake — one of: orgName, orgType, jurisdictions, purpose, biometricTypes, dataSubjectVolume, retentionPeriod, consentMechanism, thirdPartyProcessors>",
    "dimensions": "<what specifically to add — dimensions, never suggested values>",
    "provision": "<already-cited provision making these dimensions relevant>",
    "enables": "<which section/determination completes with it>" }
]

Every insufficient-basis or Insufficient-information finding elsewhere in this output MUST have a corresponding information_needed entry.

TEST-STATES ARE BINDING (R1b2 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination (M1 biometric_processing_active, M2 illinois_bipa_scope, M3 texas_cubi_scope, M4 washington_mhmd_scope, M5 eu_gdpr_scope, M6 uk_gdpr_scope, M8 employment_context, M9 authentication_purpose_candidate). Any test whose state is RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — is stated as concluded in the report with the basis given; NEVER hedge it, NEVER emit an ===INFORMATION_NEEDED=== entry that re-asks the intake field the state was computed from (e.g. do NOT ask for 'jurisdictions' when the Illinois/Texas/Washington/EU/UK scope states are RESOLVED, do NOT ask for 'biometricTypes' when M1 is RESOLVED_MET, do NOT ask for 'orgType' when M8 is RESOLVED), and NEVER contradict it in prose. In particular: where M1 is RESOLVED_NOT_MET (no active biometric processing declared), the CURRENT rating for every jurisdiction MUST be LOW per the CURRENT vs PROSPECTIVE rule, and no priority action may describe a currently-deployed control that the intake did not declare. CANDIDATE states (e.g. M9 keyword match on purpose) are non-binding hypotheses — cite them as considerations to verify, never as facts. Risk ratings, priority-action selection, and enforcement-posture judgement remain JUDGMENT calls per the existing RISK RATING CRITERIA and ENFORCEMENT-POSTURE GROUNDING rules — no mechanical test binds them.

PROPORTIONATE ASKS (R1b2 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Verdict-blocking items are ones that prevent stating an obligation or risk rating for a jurisdiction; they belong in priority actions with the cited statute they block. Record-completeness items belong in the ===INFORMATION_NEEDED=== JSON with the intake field key and the provision that makes the missing dimension relevant. Enhancement items — model-observed depth improvements that no cited provision requires — belong in defensible-practice prose ONLY when tied to a cited standard (BIPA § 15(a) retention policy, CUBI § 503.001(c)(2) reasonable care, GDPR Article 5(2) accountability, EDPB guidance) and NEVER as an information_needed entry. (ii) CREDIT-FIRST — where the intake supplies a partial answer, name what the intake establishes BEFORE the residual; the residual is incremental and NEVER re-requests content the intake already supplies. (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole jurisdiction where the intake supplies the enum/presence answers the analysis binds to (jurisdiction selected, biometric type declared, orgType chosen); where a specific missing element IS verdict-blocking, name that element rather than collapsing the whole jurisdiction.

BIPA DAMAGES FRAMING (R1b2 rule 2c): the intake does NOT supply an enrolled-headcount figure. Do NOT compute or present an illustrative BIPA dollar-range calculation and do NOT re-ask the enrollment count in ===INFORMATION_NEEDED===. Describe BIPA exposure qualitatively — per-person, per-violation statutory damages ($1,000 negligent / $5,000 intentional), subject to the P.A. 103-0769 single-violation-per-person rule for post-August 2024 conduct — and note that a defensible headcount for exposure modelling is a scoping exercise for the organisation and its counsel, not an intake field.

TEST-STATES ARE INTERNAL VOCABULARY (leg-(b) 2026-07-11): the TEST-STATES machinery is internal — its tokens NEVER appear in any user-facing field. Do NOT emit the literal string "TEST-STATES", the test ids (M1–M9), or the state tokens (resolved_met, resolved_not_met, RESOLVED_MET, RESOLVED_NOT_MET, INDETERMINATE, CANDIDATE) anywhere in the assessment prose, jurisdiction sections, priority actions, ===INFORMATION_NEEDED=== entries, or defensible-practice discussion. State the conclusion with its factual basis instead — "the intake selects Illinois, engaging BIPA §§ 15(a)–(d)" — never "per TEST-STATES M2" or "(M2 resolved met)". Same philosophy as NO SYSTEM-ROUTING VOICE.

SPEC-PACK-1 R5 — FTC ACT § 5 EXPOSURE IS INTAKE-SPECIFIC: FTC Act § 5 exposure is never asserted as a generic backdrop. Every FTC § 5 reference in this assessment TIES to a specific fact the intake supplies — the intake-supplied purpose, the intake-supplied consumer-facing representations or consent mechanism, the intake-supplied biometric type, the intake-supplied retention posture, or the intake-supplied deployment context (consumer product vs employer time-and-attendance vs enterprise access control). Form: "the intake's [named purpose / biometric type / consent posture / retention gap] is what the FTC has treated as [unfair or deceptive] in [Rite Aid / Everalbum / GoodRx / the FTC's May 2023 Biometric Information Policy Statement], and the § 5 exposure attaches to THAT specific practice." Bare framings such as "FTC § 5 is an enforcement risk", "the FTC has brought biometric enforcement actions", or "consent and security failures are enforcement targets" without the intake anchor are DEFECTS — recast against the named intake fact, or, where the intake does not supply the anchoring fact, route the missing piece to ===INFORMATION_NEEDED=== rather than emit a generic FTC § 5 sentence. Where the intake genuinely engages no consumer-facing surface (pure employer/HR biometrics with no consumer product), FTC § 5 is framed as CONDITIONAL on consumer-facing representations rather than as an operative risk.

Output ONLY the compliance assessment. No preamble.`;

// ─────────────────────────────────────────────────────────────────────────────
// R1b2 — deterministic TEST-STATES for the biometric-checker generator.
// Computed from the request Body shape produced by src/pages/BiometricChecker.tsx.
// Risk ratings, priority-action selection, and enforcement-posture judgement
// remain JUDGMENT per the existing RISK RATING CRITERIA / ENFORCEMENT-POSTURE
// GROUNDING rules. Backlog (R2): capture retentionPeriod / consentMechanism /
// thirdPartyProcessors as structured intake fields to bind further tests.
// ─────────────────────────────────────────────────────────────────────────────
type BioTestState = "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate" | "candidate";
interface BioTestStateEntry {
  state: BioTestState;
  basis: string;
  source_fields: string[];
}
const BIO_EMPLOYMENT_ORG = /employer|employee/i;
const BIO_EMPLOYMENT_PURPOSE = /time\s*&\s*attendance|workforce|physical\s*access/i;
const BIO_AUTH_PURPOSE = /authentication|identity\s*verification|kyc|customer\s*authentication/i;

export function computeBiometricTestStates(body: Record<string, any> | null | undefined): Record<string, BioTestStateEntry> {
  const b = body ?? {};
  const types: string[] = Array.isArray(b.biometricTypes) ? b.biometricTypes : [];
  const activeTypes = types.filter((t) => t && !/^none\b/i.test(String(t).trim()));
  const jurisdictions: string[] = Array.isArray(b.jurisdictions) ? b.jurisdictions : [];
  const jursLc = jurisdictions.map((j) => String(j).toLowerCase());
  const orgType = String(b.orgType ?? "").trim();
  const purpose = String(b.purpose ?? "").trim();
  
  const out: Record<string, BioTestStateEntry> = {};

  out.M1 = types.length === 0
    ? { state: "indeterminate", basis: "biometricTypes is empty", source_fields: ["biometricTypes"] }
    : (activeTypes.length
        ? { state: "resolved_met", basis: `intake declares biometric types ${JSON.stringify(activeTypes)}`, source_fields: ["biometricTypes"] }
        : { state: "resolved_not_met", basis: "intake selects only \"None\" for biometricTypes (no active processing)", source_fields: ["biometricTypes"] });

  const has = (needle: string) => jursLc.some((j) => j.includes(needle));
  const jurisdictionsPresent = jurisdictions.length > 0;
  const scope = (key: string, needle: string, label: string): BioTestStateEntry =>
    !jurisdictionsPresent
      ? { state: "indeterminate", basis: "jurisdictions is empty", source_fields: ["jurisdictions"] }
      : (has(needle)
          ? { state: "resolved_met", basis: `intake includes ${label} in jurisdictions`, source_fields: ["jurisdictions"] }
          : { state: "resolved_not_met", basis: `intake does not include ${label} in jurisdictions`, source_fields: ["jurisdictions"] });

  out.M2 = scope("M2", "illinois", "Illinois (BIPA)");
  out.M3 = jurisdictionsPresent && (has("texas") || has("other us"))
    ? { state: "resolved_met", basis: `intake includes Texas or "Other US state" (CUBI in scope)`, source_fields: ["jurisdictions"] }
    : (jurisdictionsPresent
        ? { state: "resolved_not_met", basis: "intake does not include Texas or \"Other US state\"", source_fields: ["jurisdictions"] }
        : { state: "indeterminate", basis: "jurisdictions is empty", source_fields: ["jurisdictions"] });
  out.M4 = scope("M4", "washington", "Washington state (MHMD)");
  out.M5 = scope("M5", "eu ", "EU/EEA (GDPR)");
  out.M6 = scope("M6", "united kingdom", "United Kingdom (UK GDPR)");

  // M7 (enrollment_band_provided) retired 2026-07-14 — enrolledCount removed from intake.



  const orgEmp = BIO_EMPLOYMENT_ORG.test(orgType);
  const purposeEmp = BIO_EMPLOYMENT_PURPOSE.test(purpose);
  out.M8 = (orgEmp || purposeEmp)
    ? { state: "resolved_met", basis: `orgType="${orgType}" purpose="${purpose}" indicates employment context`, source_fields: ["orgType", "purpose"] }
    : (orgType || purpose
        ? { state: "resolved_not_met", basis: `orgType="${orgType}" purpose="${purpose}" does not indicate employment context`, source_fields: ["orgType", "purpose"] }
        : { state: "indeterminate", basis: "orgType and purpose are empty", source_fields: ["orgType", "purpose"] });

  // M9 is a CANDIDATE — the intake does not confirm KYC/AML use; a purpose keyword
  // match nominates the hypothesis, absence never rebuts it (per courier doctrine).
  out.M9 = BIO_AUTH_PURPOSE.test(purpose)
    ? { state: "candidate", basis: `purpose="${purpose}" matches authentication/KYC keyword — non-binding hypothesis to verify`, source_fields: ["purpose"] }
    : { state: "indeterminate", basis: "purpose does not match authentication/KYC keyword; absence is not proof", source_fields: ["purpose"] };

  return out;
}

export function renderBiometricTestStatesBlock(states: Record<string, BioTestStateEntry>): string {
  const lines: string[] = [];
  lines.push("TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING per rule 2a: state its conclusion with the basis given, do NOT hedge, do NOT emit an ===INFORMATION_NEEDED=== entry re-asking for the intake field it was computed from, and do NOT contradict it in prose. CANDIDATE states are non-binding hypotheses (e.g. keyword matches on free-text purpose) — treat as considerations to verify, never as facts. INDETERMINATE tests use insufficient-basis language anchored to the named source field.");
  for (const id of Object.keys(states)) {
    const e = states[id];
    lines.push(`- ${id} state=${e.state} basis="${e.basis}" source_fields=${JSON.stringify(e.source_fields)}`);
  }
  return lines.join("\n");
}

const BIOMETRIC_TOOL_MODULE: ToolModule = {
  outputMode: "document",
  // Ruling R-15C-1 (revised) 2026-07-15: biometric writes US English like every
  // other product. Locale is enforced by the [[LANGUAGE_VARIANT_RULE]] injected
  // from prompt-core (american variant) — the deterministic `no_british_spelling`
  // check in run-quality-batch was retired (QLB-F3); the prompt rule is now the
  // single source of truth for spelling.
  citationFramework:
    "Cite statutes by official identifier: BIPA = 740 ILCS 14 (section letters 15(a)/(b)/(d), 20); Texas CUBI = Tex. Bus. & Com. Code § 503.001; California = Cal. Civ. Code §§ 1798.x; EU/UK biometric special-category data = GDPR / UK GDPR Article 9. Cite enforcement actions and case law ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt; never assert a fine or settlement amount from training knowledge — direct the reader to the regulator's enforcement register.",
  identity: BIOMETRIC_IDENTITY,
  extraRules: BIOMETRIC_RULEBOOK + `

W3-T4 (c) — PER-JURISDICTION RISK RATING IS INTAKE-GROUNDED: every per-jurisdiction Compliance risk rating (LOW / MEDIUM / HIGH / UNRESOLVED) MUST be traceable to (i) a named intake fact (e.g. modality, use case, consent status, retention, minor involvement, employee context, cross-border transfer), or (ii) a named injected test-state / statutory anchor. The rating's justification prose names both the driving fact and the driving statute — never "based on jurisdictional risk" or "generally elevated" or any bare qualifier. Where no intake fact and no anchor support a rating, the rating is UNRESOLVED with information_needed naming the specific missing fact.
`,

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
  // W3-T3 — optional free-text naming the specific US state(s) engaged when
  // "Other US state" is selected. When populated, the generator produces a
  // single conditional-framework section for the named state(s); when blank
  // (or "Other US state" is not selected) the generator emits a compact
  // structured-unresolved section with max 5 candidate statutes.
  other_state_names?: string;
  // enrolledCount retired 2026-07-14 — legacy stored intakes may still carry the key; it is ignored, not read.
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
function scrubVoiceLeaks(text: string): string {
  if (typeof text !== "string" || !text) return text;
  const pattern = /[^.!?\n]*\b(training-knowledge fine amounts|training-data figures)\b[^.!?\n]*[.!?]?/gi;
  const cleaned = text.replace(pattern, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  if (cleaned !== text) {
    console.log(JSON.stringify({ evt: "voice_leak_scrubbed", fn: "check-biometric-compliance" }));
  }
  return cleaned;
}

function describeProcessing(orgType: string, types: string[], purpose: string): string {
  const raw = (orgType ?? "").trim() || "The";
  const org = /\b(organisation|organization|company|business|employer|entity)\s*$/i.test(raw)
    ? raw
    : `${raw} organisation`;
  const active = (types ?? []).filter((t) => t && !/^none\b/i.test(t.trim()));
  if (!active.length) return `${org} with no active biometric processing currently deployed`;
  const p = (purpose ?? "").trim().replace(/\s+/g, " ");
  const short = p.length > 140 ? p.slice(0, 137) + "…" : p;
  return `${org} processing ${active.join(", ")} for the stated purpose: ${short}`;
}

// estimateBIPARisk() removed 2026-07-14 — enrolledCount intake field retired.
// BIPA exposure is now described qualitatively (per-person, per-violation statutory damages).

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
  // bipa_risk retired 2026-07-14 — hard-null since enrolledCount removal; field removed from report_data.

  function stressSection(jurisdiction: string): string {
    const j = jurisdiction.toLowerCase();
    // Normalize UK aliases: "UK", "U.K.", "GB" all route to the dedicated UK builder.
    const jNormalized = j.replace(/\./g, "").trim();
    const isEU = j.includes("eu") || j.includes("eea") || (j.includes("gdpr") && !j.includes("uk"));
    const isUK = j.includes("united kingdom") || j.includes("uk gdpr") || jNormalized === "gb" || jNormalized === "uk";
    const isIL = j.includes("illinois") || j.includes("bipa");
    const isTX = j.includes("texas") || j.includes("cubi");
    const isCA = j.includes("california") || j.includes("ca,") || j === "ca";
    const isVA = j.includes("virginia") || j === "va";
    const isWA = j.includes("washington");
    const isFR = j === "fr" || j.includes("france") || j.includes("cnil");
    const isIE = j === "ie" || j.includes("ireland") || j.includes("dpc");
    const isDE = j === "de" || j.includes("germany") || j.includes("deutschland") || j.includes("bfdi");
    const isES = j === "es" || j.includes("spain") || j.includes("españa") || j.includes("aepd");
    const isOtherUS = j.includes("other us state") || j.includes("other u.s. state");
    const isUS = !isEU && !isUK && !isIL && !isTX && !isCA && !isVA && !isWA && !isOtherUS &&
      (j === "us" || j === "usa" || j.includes("united states") || j.includes("federal (ftc)") || j.includes("federal"));

    if (isOtherUS) {
      const orgOwner = /employer/i.test(body.orgType) ? "the HR lead, in coordination with the DPO or Head of Privacy"
        : /healthcare/i.test(body.orgType) ? "the Privacy Officer and CISO"
        : /financial/i.test(body.orgType) ? "the Chief Compliance Officer and CISO"
        : "the Head of Privacy (or DPO where designated) and the Head of Security";

      // W3-T3 — named vs unnamed state paths.
      const namedRaw = (body.other_state_names ?? "").trim();
      if (namedRaw.length === 0) {
        // Compact structured-unresolved block. No full-catalogue enumeration.
        return `Other US State — State Not Named

states_to_confirm_reason: The specific US state(s) whose residents' biometrics are captured must be confirmed before jurisdiction-specific obligations can be enumerated. Populate the intake field "other_state_names" to enable a resolved analysis; without it, the applicable statute stack cannot be identified.

top_candidate_statutes (top-5 candidates for a ${body.orgType} deploying ${body.biometricTypes[0]} for ${body.purpose}; each is a candidate only — final selection turns on the named state):
- California CCPA/CPRA — Cal. Civ. Code § 1798.140(ae) (sensitive PI — biometric identifiers); § 1798.121 (right to limit use of SPI).
- Colorado CPA — C.R.S. § 6-1-1303(24) (sensitive data — biometric); § 6-1-1308(7) (opt-in consent).
- Virginia VCDPA — Va. Code § 59.1-575 (sensitive data — biometric); § 59.1-578(A)(5) (consent); § 59.1-580 (data-protection assessment).
- Texas CUBI — Tex. Bus. & Com. Code § 503.001 (notice/consent, security, destruction; AG-only enforcement).
- Washington MHMD — RCW ch. 19.373 (consumer health data where biometrics infer health status; private right of action via CPA § 19.86.090).

next_step: Populate "other_state_names" with the specific state(s) engaged (or, if a single state is already known, name it in the intake) and re-run the assessment; obligations, consent form, and enforcement posture will resolve to the named state(s).

information_needed_entry: field=other_state_names — dimensions="specific US state(s) whose residents' biometrics are captured"; owner: ${orgOwner}; without this the assessment cannot render statute-specific obligations for the "Other US state" jurisdiction.

Compliance risk rating: UNRESOLVED — statute-specific obligations, penalties, and enforcement posture cannot be assigned until the specific state(s) are named.
---`;
      }

      // W3-T3 URGENT FIX (QB-P27) — Named-state resolver. Split the free-text
      // into tokens, normalize each, and either delegate to an existing full
      // per-state builder (IL/TX/CA/VA) or look the state up in the compact
      // state statute registry below. States not in either path emit a
      // structured-unresolved block NAMING the specific state — never a
      // template with the state name substituted into generic scaffolding.
      const tokens = namedRaw
        .split(/[,;\n]|(?:\s+and\s+)|(?:\s*\/\s*)/i)
        .map(s => s.trim())
        .filter(Boolean);

      // Canonical state name normalization (lowercased key → display name).
      const STATE_ALIASES: Record<string, string> = {
        "co": "Colorado", "colo": "Colorado", "colorado": "Colorado",
        "il": "Illinois", "ill": "Illinois", "illinois": "Illinois",
        "tx": "Texas", "tex": "Texas", "texas": "Texas",
        "ca": "California", "cal": "California", "calif": "California", "california": "California",
        "va": "Virginia", "virginia": "Virginia",
        "wa": "Washington", "wash": "Washington", "washington": "Washington",
        "ct": "Connecticut", "conn": "Connecticut", "connecticut": "Connecticut",
        "ut": "Utah", "utah": "Utah",
        "or": "Oregon", "ore": "Oregon", "oregon": "Oregon",
        "mt": "Montana", "mont": "Montana", "montana": "Montana",
        "de": "Delaware", "del": "Delaware", "delaware": "Delaware",
        "ia": "Iowa", "iowa": "Iowa",
        "in": "Indiana", "ind": "Indiana", "indiana": "Indiana",
        "ky": "Kentucky", "kentucky": "Kentucky",
        "md": "Maryland", "maryland": "Maryland",
        "mn": "Minnesota", "minn": "Minnesota", "minnesota": "Minnesota",
        "ne": "Nebraska", "nebraska": "Nebraska",
        "nh": "New Hampshire", "new hampshire": "New Hampshire",
        "nj": "New Jersey", "new jersey": "New Jersey",
        "tn": "Tennessee", "tenn": "Tennessee", "tennessee": "Tennessee",
        "vt": "Vermont", "vermont": "Vermont",
        "ri": "Rhode Island", "rhode island": "Rhode Island",
        "fl": "Florida", "fla": "Florida", "florida": "Florida",
        "ny": "New York", "new york": "New York",
      };

      // Delegation labels — canonical strings the existing per-state builders match on.
      const DELEGATE_LABEL: Record<string, string> = {
        "Illinois": "Illinois, USA (BIPA)",
        "Texas": "Texas, USA (CUBI)",
        "California": "California",
        "Virginia": "Virginia",
      };

      // Compact per-state statute registry. Every entry supplies real statutory
      // citations, a consent standard, retention rule, enforcement posture, and
      // a risk rating anchored to that state's actual regime. Add entries here
      // rather than falling through to the unresolved block.
      type StateReg = {
        law: string; sensitiveCite: string; consentCite: string;
        consent: string; retention: string; enforcement: string;
        risk: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; riskWhy: string;
        dpiaCite?: string;
      };
      const REG: Record<string, StateReg> = {
        "Colorado": {
          law: "Colorado Privacy Act (CPA), C.R.S. § 6-1-1301 et seq.",
          sensitiveCite: "C.R.S. § 6-1-1303(24)(b) (biometric identifiers processed for the purpose of uniquely identifying an individual = sensitive data)",
          consentCite: "C.R.S. § 6-1-1308(7)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data; consent must be a clear, affirmative act — pre-checked boxes and inactivity do NOT constitute consent (C.R.S. § 6-1-1303(5)).",
          retention: "Data-minimization and storage-limitation duties under C.R.S. § 6-1-1308(3): retain biometric data only as long as adequate, relevant, and reasonably necessary for the disclosed purpose. No fixed statutory ceiling — define destruction trigger by purpose expiry.",
          enforcement: "Colorado Attorney General has exclusive enforcement authority under C.R.S. § 6-1-1311; NO private right of action. AG rulemaking authority under § 6-1-1313 has produced the Colorado Privacy Act Rules (4 CCR 904-3) which include specific biometric-consent form requirements.",
          risk: "HIGH",
          riskWhy: "Biometric identifiers are expressly sensitive data under the CPA; AG-only enforcement but active rulemaking on biometric consent form creates near-term compliance exposure for any deployment without a documented § 6-1-1308(7) opt-in mechanism.",
          dpiaCite: "C.R.S. § 6-1-1309 (data protection assessment required for processing that presents a heightened risk of harm, including sensitive data)",
        },
        "Connecticut": {
          law: "Connecticut Data Privacy Act (CTDPA), Conn. Gen. Stat. § 42-515 et seq.",
          sensitiveCite: "Conn. Gen. Stat. § 42-515(38) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Conn. Gen. Stat. § 42-520(a)(6)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 42-520(a)(6)); consent must be a clear affirmative act (§ 42-515(6)).",
          retention: "Data-minimization and purpose-limitation under § 42-520(a)(1)–(2): limit collection to what is reasonably necessary and retain only as long as necessary for the disclosed purpose.",
          enforcement: "Connecticut Attorney General has exclusive enforcement authority (§ 42-525); NO private right of action. 60-day cure period sunset on 31 December 2024.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement with cure-period sunset; sensitive-data opt-in is a clear gap for any deployment without a documented consent flow.",
          dpiaCite: "Conn. Gen. Stat. § 42-522 (data protection assessment required for processing sensitive data)",
        },
        "Utah": {
          law: "Utah Consumer Privacy Act (UCPA), Utah Code § 13-61-101 et seq.",
          sensitiveCite: "Utah Code § 13-61-101(32) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Utah Code § 13-61-302(3)",
          consent: "Opt-OUT model for sensitive data — the UCPA requires clear notice AND an opportunity to opt out before processing sensitive data (§ 13-61-302(3)). This diverges from the opt-IN model in every other US state comprehensive law.",
          retention: "Purpose limitation under § 13-61-302(1)(b): retain personal data only as necessary for the disclosed purpose.",
          enforcement: "Utah Attorney General enforces after a 30-day cure period (§ 13-61-402); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "Opt-out model reduces upfront compliance burden but any deployment without a clear pre-processing sensitive-data notice fails § 13-61-302(3).",
        },
        "Oregon": {
          law: "Oregon Consumer Privacy Act (OCPA), ORS § 646A.570 et seq.",
          sensitiveCite: "ORS § 646A.570(19)(a)(F) (biometric data used to identify an individual = sensitive data)",
          consentCite: "ORS § 646A.578(2)(a)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 646A.578(2)(a)).",
          retention: "Data minimization under § 646A.578(1)(a): limit collection and retention to what is reasonably necessary for the disclosed purpose.",
          enforcement: "Oregon Attorney General has exclusive enforcement authority (§ 646A.591); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement; opt-in for biometrics is a gating obligation.",
          dpiaCite: "ORS § 646A.586 (data protection assessment required for processing sensitive data)",
        },
        "Montana": {
          law: "Montana Consumer Data Privacy Act (MCDPA), Mont. Code § 30-14-2801 et seq.",
          sensitiveCite: "Mont. Code § 30-14-2802(28) (biometric data = sensitive data)",
          consentCite: "Mont. Code § 30-14-2808(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 30-14-2808(4)).",
          retention: "Data minimization under § 30-14-2808(1): retain only as necessary for the disclosed purpose.",
          enforcement: "Montana Attorney General has exclusive enforcement authority (§ 30-14-2816); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement in a low-enforcement jurisdiction; opt-in remains a gating obligation.",
        },
        "Delaware": {
          law: "Delaware Personal Data Privacy Act (DPDPA), 6 Del. C. § 12D-101 et seq.",
          sensitiveCite: "6 Del. C. § 12D-102(28) (biometric data used to identify an individual = sensitive data)",
          consentCite: "6 Del. C. § 12D-106(a)(5)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 12D-106(a)(5)).",
          retention: "Purpose limitation and data minimization under § 12D-106(a)(1)–(2).",
          enforcement: "Delaware Department of Justice has exclusive enforcement authority (§ 12D-112); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-led enforcement; opt-in for biometrics is a gating obligation and DPDPA carries a comparatively low applicability threshold.",
          dpiaCite: "6 Del. C. § 12D-108 (data protection assessment required for processing sensitive data)",
        },
        "Iowa": {
          law: "Iowa Consumer Data Protection Act (ICDPA), Iowa Code § 715D.1 et seq.",
          sensitiveCite: "Iowa Code § 715D.1(24) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Iowa Code § 715D.4(2)(d)",
          consent: "Notice AND opportunity to opt out for sensitive data (§ 715D.4(2)(d)) — Iowa follows an opt-out (not opt-in) model for sensitive data, similar to Utah.",
          retention: "Purpose limitation under § 715D.4(1)(b).",
          enforcement: "Iowa Attorney General has exclusive enforcement authority (§ 715D.8); NO private right of action; 90-day cure period.",
          risk: "LOW",
          riskWhy: "Opt-out model, long cure period, and no private action combine to produce a low near-term compliance risk absent an explicit AG action.",
        },
        "Indiana": {
          law: "Indiana Consumer Data Protection Act (INCDPA), Ind. Code § 24-15-1-1 et seq.",
          sensitiveCite: "Ind. Code ch. 24-15 (INCDPA); the biometric-sensitive-data pinpoint is § 24-15-2-28 as recorded in this registry — verification against the enacted text is recommended before external distribution.",
          consentCite: "Ind. Code ch. 24-15 (INCDPA consent provision recorded here as § 24-15-4-1(4); verify against the enacted text before external distribution)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data under the INCDPA sensitive-data regime (Ind. Code ch. 24-15).",
          retention: "Data minimization under the INCDPA controller duties (Ind. Code ch. 24-15). Effective 1 January 2026.",
          enforcement: "Indiana Attorney General has exclusive enforcement authority under the INCDPA (Ind. Code ch. 24-15); NO private right of action; 30-day cure period.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement in a jurisdiction with a live 1 January 2026 effective date — opt-in mechanism must be in place before then.",
        },
        "Kentucky": {
          law: "Kentucky Consumer Data Protection Act (KCDPA), Ky. Rev. Stat. § 367.3611 et seq.",
          sensitiveCite: "Ky. Rev. Stat. § 367.3611(28) (biometric data = sensitive data)",
          consentCite: "Ky. Rev. Stat. § 367.3613(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 367.3613(4)). Effective 1 January 2026.",
          retention: "Data minimization under § 367.3613(1)–(2).",
          enforcement: "Kentucky Attorney General has exclusive enforcement authority (§ 367.3619); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement, 1 January 2026 effective date — opt-in mechanism must be in place before then.",
        },
        "Maryland": {
          law: "Maryland Online Data Privacy Act (MODPA), Md. Code Com. Law § 14-4601 et seq.",
          sensitiveCite: "Md. Code Com. Law § 14-4601(EE) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Md. Code Com. Law § 14-4607(a)(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 14-4607(a)(4)); MODPA additionally prohibits SALE of sensitive data outright (§ 14-4607(a)(5)) — a stricter posture than any other US state comprehensive law.",
          retention: "Strict data-minimization duty under § 14-4607(a)(1) — collection must be limited to what is reasonably necessary AND proportionate to the disclosed purpose.",
          enforcement: "Maryland Attorney General enforces under § 14-4614; NO private right of action.",
          risk: "HIGH",
          riskWhy: "MODPA's outright sale-of-sensitive-data prohibition plus strict data-minimization duty make it the most restrictive US state law for biometric processing outside Illinois.",
          dpiaCite: "Md. Code Com. Law § 14-4609 (data protection assessment required for processing sensitive data)",
        },
        "Minnesota": {
          law: "Minnesota Consumer Data Privacy Act (MCDPA), Minn. Stat. § 325O.01 et seq.",
          sensitiveCite: "Minn. Stat. § 325O.02(28) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Minn. Stat. § 325O.05(1)(d)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 325O.05(1)(d)).",
          retention: "Data-minimization duty under § 325O.05(1)(a).",
          enforcement: "Minnesota Attorney General has exclusive enforcement authority (§ 325O.09); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement; opt-in is a gating obligation.",
          dpiaCite: "Minn. Stat. § 325O.07 (data protection assessment required for processing sensitive data)",
        },
        "Nebraska": {
          law: "Nebraska Data Privacy Act (NDPA), Neb. Rev. Stat. § 87-1101 et seq.",
          sensitiveCite: "Neb. Rev. Stat. § 87-1102(28) (biometric data = sensitive data)",
          consentCite: "Neb. Rev. Stat. § 87-1104(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 87-1104(4)).",
          retention: "Data-minimization duty under § 87-1104(1).",
          enforcement: "Nebraska Attorney General has exclusive enforcement authority (§ 87-1111); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement; opt-in is a gating obligation.",
        },
        "New Hampshire": {
          law: "New Hampshire Data Privacy Act (NHDPA), N.H. Rev. Stat. § 507-H:1 et seq.",
          sensitiveCite: "N.H. Rev. Stat. § 507-H:1(XXVIII) (biometric data = sensitive data)",
          consentCite: "N.H. Rev. Stat. § 507-H:6(I)(d)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 507-H:6(I)(d)).",
          retention: "Data-minimization duty under § 507-H:6(I)(a).",
          enforcement: "New Hampshire Attorney General has exclusive enforcement authority (§ 507-H:11); NO private right of action; 60-day cure period until 31 December 2025.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement; opt-in is a gating obligation.",
        },
        "New Jersey": {
          law: "New Jersey Data Privacy Act (NJDPA), N.J. Stat. § 56:8-166.4 et seq.",
          sensitiveCite: "N.J. Stat. § 56:8-166.5 (biometric data used to identify an individual = sensitive data)",
          consentCite: "N.J. Stat. § 56:8-166.9(a)(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 56:8-166.9(a)(4)).",
          retention: "Data-minimization duty under § 56:8-166.9(a)(1).",
          enforcement: "New Jersey Division of Consumer Affairs (under the Attorney General) enforces (§ 56:8-166.15); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-led enforcement; opt-in is a gating obligation.",
          dpiaCite: "N.J. Stat. § 56:8-166.12 (data protection assessment required for processing sensitive data)",
        },
        "Tennessee": {
          law: "Tennessee Information Protection Act (TIPA), Tenn. Code § 47-18-3201 et seq.",
          sensitiveCite: "Tenn. Code § 47-18-3202(28) (biometric data used to identify an individual = sensitive data)",
          consentCite: "Tenn. Code § 47-18-3204(a)(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 47-18-3204(a)(4)).",
          retention: "Data-minimization duty under § 47-18-3204(a)(1).",
          enforcement: "Tennessee Attorney General has exclusive enforcement authority (§ 47-18-3213); NO private right of action; a rebuttable-presumption safe harbor is available for controllers with a documented, NIST-aligned privacy program (§ 47-18-3213(c)).",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement with a safe-harbor incentive; opt-in remains a gating obligation.",
        },
        "Vermont": {
          law: "Vermont Data Privacy and Online Surveillance Act (VDPOSA), 9 V.S.A. § 2401 et seq.",
          sensitiveCite: "9 V.S.A. § 2415(28) (biometric data = sensitive data)",
          consentCite: "9 V.S.A. § 2418(a)(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 2418(a)(4)); VDPOSA also carries a private right of action for certain sensitive-data violations — a differentiator from most US state comprehensive laws.",
          retention: "Strict data-minimization duty under § 2418(a)(1)–(2).",
          enforcement: "Vermont Attorney General enforces under § 2432; LIMITED private right of action for sensitive-data violations (§ 2432(c)).",
          risk: "HIGH",
          riskWhy: "Private-action exposure for sensitive-data violations is unusual outside Illinois — meaningful litigation risk on top of AG enforcement.",
          dpiaCite: "9 V.S.A. § 2422 (data protection assessment required for processing sensitive data)",
        },
        "Rhode Island": {
          law: "Rhode Island Data Transparency and Privacy Protection Act (RIDTPPA), R.I. Gen. Laws § 6-48.1-1 et seq.",
          sensitiveCite: "R.I. Gen. Laws § 6-48.1-2(28) (biometric data used to identify an individual = sensitive data)",
          consentCite: "R.I. Gen. Laws § 6-48.1-4(a)(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data (§ 6-48.1-4(a)(4)).",
          retention: "Purpose limitation under § 6-48.1-4(a)(1)–(2).",
          enforcement: "Rhode Island Attorney General has exclusive enforcement authority (§ 6-48.1-8); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "AG-only enforcement; opt-in is a gating obligation.",
        },
        "Florida": {
          law: "Florida Digital Bill of Rights (FDBR), Fla. Stat. § 501.701 et seq.",
          sensitiveCite: "Fla. Stat. § 501.702(30) (biometric data used to identify an individual = sensitive data) — note FDBR's controller applicability threshold is narrow (annual global revenue > $1B AND ≥50% of revenue from digital ad sales, OR operates a smart speaker, OR operates an app store with ≥250,000 apps).",
          consentCite: "Fla. Stat. § 501.71(4)",
          consent: "Affirmative opt-in consent required before processing biometric sensitive data by an in-scope controller (§ 501.71(4)); confirm applicability threshold first — FDBR applies to very few organisations.",
          retention: "Data-minimization duty under § 501.71(1).",
          enforcement: "Florida Department of Legal Affairs (under the Attorney General) enforces (§ 501.72); NO private right of action.",
          risk: "MEDIUM",
          riskWhy: "Narrow applicability threshold reduces exposure for most organisations, but in-scope controllers face AG enforcement with $50,000 per-violation civil penalties (§ 501.72(2)) — trebled for known violations affecting minors.",
        },
        "New York": {
          law: "New York SHIELD Act, N.Y. Gen. Bus. Law § 899-BB (data security) and § 899-AA (breach notification). New York has NO comprehensive consumer privacy statute in force; biometric-specific obligations arise from the SHIELD Act's data-security duties and the Stop Hacks and Improve Electronic Data Security Act's expanded breach-notification triggers.",
          sensitiveCite: "N.Y. Gen. Bus. Law § 899-AA(1)(b)(2) (biometric information within the definition of private information)",
          consentCite: "no state-law opt-in requirement — but see NYC Admin. Code §§ 22-1201–1205 (biometric identifier information disclosure and sale prohibition for commercial establishments in New York City)",
          consent: "New York has no statewide biometric opt-in requirement. NYC Admin. Code § 22-1202 requires clear notice at customer entrances of commercial establishments that collect biometric identifier information, and prohibits SALE of biometric identifier information (private right of action, $500–$5,000 per violation).",
          retention: "SHIELD Act § 899-BB(2) requires reasonable safeguards for private information including biometric information — administrative, technical, and physical safeguards; no fixed retention ceiling. Purpose expiry defines destruction.",
          enforcement: "New York Attorney General enforces § 899-AA and § 899-BB; NYC Admin. Code § 22-1205 supplies a private right of action for biometric SALE violations at NYC commercial establishments.",
          risk: "MEDIUM",
          riskWhy: "No comprehensive privacy statute reduces baseline exposure, but NYC's biometric sale prohibition carries private-action risk for any organisation operating a commercial establishment in NYC.",
        },
      };

      // Build sections per state token.
      const parts: string[] = [];
      for (const tok of tokens) {
        const key = tok.toLowerCase().replace(/\s+/g, " ").trim();
        const canonical = STATE_ALIASES[key];

        if (canonical && DELEGATE_LABEL[canonical]) {
          // Route to the full existing per-state builder (IL/TX/CA/VA) —
          // never emit a parallel scaffolded section for these states.
          parts.push(stressSection(DELEGATE_LABEL[canonical]));
          continue;
        }

        if (canonical && canonical === "Washington") {
          // WA has no dedicated builder in this file; MHMD block below is
          // fuller than the generic fallback and cites RCW 19.373 directly.
          parts.push(`Washington — My Health My Data Act (MHMD), RCW ch. 19.373

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data is expressly consumer health data under RCW 19.373.010(8)(b)(ix) where it is generated from or used to identify a consumer seeking health-care services or to infer the consumer's health conditions or status.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. RCW 19.373.030: separate written consent required BEFORE collection of consumer health data — consent must be freely given, specific, informed, opt-in, voluntary, and unambiguous.
2. RCW 19.373.040: separate SIGNED authorization required before SALE of consumer health data — a distinct instrument from collection consent.
3. RCW 19.373.050: geofencing around health-care facilities is prohibited outright.
4. RCW 19.373.060: consumer rights of access, withdrawal of consent, and deletion — with a 30-day response window.
5. RCW 19.373.090: violations enforceable under the Washington Consumer Protection Act (chapter 19.86 RCW), which supplies a PRIVATE RIGHT OF ACTION — a differentiator among US state biometric regimes.

Consent and notice:
Opt-in written consent BEFORE any collection of biometric consumer health data; separate signed authorization BEFORE any sale. Notice must appear in the consumer health data privacy policy required by RCW 19.373.020.

Retention and destruction:
No fixed retention ceiling; destruction triggered by consumer deletion request under RCW 19.373.060(1)(c) or when purpose expires.

Sale and sharing restrictions:
Sale prohibited absent a separate signed authorization (§ 19.373.040); processors bound by written contract (§ 19.373.080).

Current enforcement posture:
Washington AG and private plaintiffs both enforce. Private-action exposure via the Consumer Protection Act's per-violation damages plus attorney fees makes MHMD one of the highest-exposure US state biometric regimes.

Priority actions:
1. Publish a consumer health data privacy policy conforming to RCW 19.373.020 before collection.
2. Implement separate opt-in consent (collection) AND separate signed authorization (sale) flows.
3. Audit vendor contracts against RCW 19.373.080 processor requirements.

Compliance risk rating: HIGH
Private right of action via the Consumer Protection Act plus separate consent-and-authorization requirements create material litigation and regulatory exposure.
---`);
          continue;
        }

        if (canonical && REG[canonical]) {
          const r = REG[canonical];
          const dpiaLine = r.dpiaCite
            ? `\n5. ${r.dpiaCite}.`
            : "";
          parts.push(`${canonical} — ${r.law}

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data used to identify an individual is a category of sensitive data under ${canonical}'s comprehensive privacy statute. Analysis is scoped to ${canonical}; statutes of other states are OUT OF SCOPE and not enumerated here.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Sensitive-data classification: ${r.sensitiveCite}.
2. Consent standard: ${r.consentCite}.
3. Retention and minimization: ${r.retention}
4. Processor obligations: bind every recipient under a written data-processing agreement conforming to ${canonical}'s controller-processor requirements.${dpiaLine}

Consent and notice:
${r.consent} Pre-collection notice must name the biometric modality, specific purpose, retention, recipients, and applicable rights. Suggested owner (confirm): ${orgOwner}. Timeframe: implement notice and consent flows within 45 days of assessment sign-off; trigger: on assessment sign-off.

Retention and destruction:
${r.retention} Suggested owner (confirm): ${orgOwner}. Timeframe: publish the destruction schedule within 60 days of assessment sign-off.

Sale and sharing restrictions:
Bind every recipient of biometric data under a written data-processing agreement conforming to ${canonical}'s controller-processor requirements. Assess whether the intended sharing constitutes a "sale" or "sharing" under ${canonical}'s law and, if so, provide the required opt-out or authorization. Suggested owner (confirm): the Head of Vendor Management, in coordination with ${orgOwner}. Timeframe: complete the sharing assessment within 30 days of assessment sign-off.

Current enforcement posture:
${r.enforcement} Consult the ${canonical} Attorney General's public enforcement register for pending or resolved biometric or sensitive-data matters — never quantify enforcement magnitudes from memory.

Priority actions:
1. Implement the ${canonical} consent mechanism required by ${r.consentCite} before any biometric capture from a ${canonical} resident. Suggested owner (confirm): ${orgOwner}. Timeframe: within 45 days of assessment sign-off.
2. Publish a biometric retention and destruction schedule keyed to purpose expiry, consistent with ${canonical}'s data-minimization duty. Suggested owner (confirm): ${orgOwner}. Timeframe: within 60 days of assessment sign-off.
3. Execute processor agreements binding every recipient of biometric data under ${canonical}'s controller-processor requirements. Suggested owner (confirm): the Head of Vendor Management. Timeframe: within 90 days of assessment sign-off.${r.dpiaCite ? `\n4. Complete the ${canonical} data protection assessment required by ${r.dpiaCite} before deploying to ${canonical} residents. Suggested owner (confirm): ${orgOwner}. Timeframe: prior to deployment.` : ""}

Compliance risk rating: ${r.risk}
${r.riskWhy}
---`);
          continue;
        }

        // State not in registry — structured-unresolved block, NAMING the state.
        const displayName = canonical ?? tok;
        parts.push(`Other US State — ${displayName} (Unresolved: Not in Statute Registry)

states_to_confirm_reason: The intake names "${displayName}", but no entry for ${displayName} exists in this tool's statute registry. Rather than substitute the name into a generic template, ${displayName} is flagged UNRESOLVED and its analysis is deferred until the registry is updated or a manual jurisdiction-specific review is conducted.

top_candidate_hooks_for_${displayName.replace(/\s+/g, "_")} (each is a candidate only — final selection requires confirmation of the applicable ${displayName} statute):
- ${displayName}'s comprehensive consumer-privacy statute, if one is in force — verify enactment date, applicability threshold, and sensitive-data classification of biometric identifiers.
- ${displayName}'s biometric-specific statute, if one is in force — verify scope and consent standard.
- ${displayName}'s Unfair or Deceptive Acts or Practices (UDAP) statute — applies to any material misrepresentation about biometric collection.
- ${displayName}'s data-breach notification statute — verify whether biometric identifiers fall within the definition of "personal information" for notification purposes.

next_step: A manual ${displayName}-specific review is required before obligations, consent form, and enforcement posture can be enumerated. Populate this tool's state registry with a ${displayName} entry (statute cite, consent standard, retention rule, enforcement posture) and re-run.

information_needed_entry: field=other_state_names — dimensions="confirm the specific ${displayName} statute in force and its biometric-scoping provisions"; owner: ${orgOwner}; without this, the assessment cannot render statute-specific obligations for ${displayName}.

Compliance risk rating: UNRESOLVED — ${displayName}-specific obligations, penalties, and enforcement posture cannot be assigned until the registry is updated.
---`);
      }

      return parts.join("\n\n");
    }



    if (isEU) {
      const orgLowerEU = (body.orgType || "").toLowerCase();
      const purposeLowerEU = (body.purpose || "").toLowerCase();
      const isEmploymentEU = orgLowerEU.includes("employ") || orgLowerEU.includes("hr ") || orgLowerEU.includes("workforce") || purposeLowerEU.includes("time & attendance") || purposeLowerEU.includes("time and attendance") || purposeLowerEU.includes("workforce management") || purposeLowerEU.includes("physical access");
      const isHealthcareEU = orgLowerEU.includes("health") || orgLowerEU.includes("clinical") || orgLowerEU.includes("medical") || orgLowerEU.includes("hospital") || orgLowerEU.includes("care provider");
      const art9Line = isEmploymentEU
        ? `2. Article 9(2) condition on this intake — the employment context engages Article 9(2)(b) (processing necessary for carrying out obligations and exercising specific rights of the controller or of the data subject in the field of employment, social security, and social protection law), conditional on national law authorising the biometric use. Article 9(2)(a) explicit consent is not treated as a valid basis in the employment relationship due to the power imbalance identified in EDPB Guidelines 05/2020 on consent, para. 21. The deciding fact is whether the applicable national employment law authorises this biometric use.`
        : isHealthcareEU
        ? `2. Article 9(2) condition on this intake — the health / care context engages Article 9(2)(h) (processing necessary for the purposes of preventive or occupational medicine, medical diagnosis, or the provision of health or social care or treatment), subject to the professional-secrecy safeguards of Article 9(3) and any Member State law adopted under Article 9(4).`
        : `2. Article 9(2) condition on this intake — Article 9(2)(a) explicit consent applies. Consent must be freely given, specific, informed, and unambiguous; the absence of a clear imbalance of power between the data subject and the controller is a precondition (EDPB Guidelines 05/2020 on consent, para. 21).`;
      return `${jurisdiction} — General Data Protection Regulation (GDPR)

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for the purpose of uniquely identifying a natural person is special-category data under GDPR Article 9(1), subject to strict prohibition unless an Article 9(2) condition applies.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Lawful basis under Article 6 AND a separate Article 9(2) condition — these must both be identified and documented. Do not conflate them into a single "lawful basis" entry.
${art9Line}

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

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for unique identification is special-category data under UK GDPR Article 9(1). The operative law is UK GDPR (retained EU GDPR as amended) together with DPA 2018 — not EU GDPR.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. UK GDPR Article 9(2) condition must be identified in addition to an Article 6 lawful basis. Common conditions: Article 9(2)(a) explicit consent; Article 9(2)(b) employment law; Article 9(2)(h) health/care.
2. DPA 2018 Schedule 1 condition must also be satisfied — the applicable Schedule 1 paragraph must be documented.
3. Conduct a DPIA under UK GDPR Article 35 — biometric processing for identification typically requires a DPIA; verify against the ICO's current DPIA guidance and examples lists.
4. Article 13/14 transparency notices must cover the Article 9(2) condition and DPA 2018 Schedule 1 condition relied upon.
5. UK-to-third-country transfers require a UK adequacy decision under UK GDPR Article 45 — including the UK–US Data Bridge (in force since 12 October 2023, SI 2023/1028) where the importer is certified under the UK Extension — or, where no adequacy decision applies, a UK IDTA or UK-approved SCCs (not EU SCCs).

Consent and notice:
Explicit consent in employment context is unlikely to satisfy "freely given" under UK GDPR — use DPA 2018 Schedule 1 Part 1 para 1 (employment, social security and social protection law) where national employment law authorises biometric use.

Retention and destruction:
Apply the UK GDPR Article 5(1)(e) storage limitation principle: define retention period per purpose; delete biometric templates promptly when purpose expires; document the retention schedule.

Sale and sharing restrictions:
UK GDPR purpose limitation (Article 5(1)(b)) and processor contract requirements (Article 28) govern sharing. For transfers to third countries outside the UK adequacy framework, use a UK IDTA or UK-approved SCCs.

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
      return `${jurisdiction} — Biometric Information Privacy Act (BIPA), 740 ILCS 14

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. BIPA applies to private entities in Illinois that collect, capture, purchase, receive through trade, or otherwise obtain biometric identifiers or biometric information.

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
Active private litigation. Exposure runs per person and per violation ($1,000 negligent / $5,000 intentional); post-August 2024 conduct is limited to one violation per person per biometric identifier under P.A. 103-0769.

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

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. CUBI applies to persons capturing biometric identifiers (retina/iris scan, fingerprint, voiceprint, or record of hand or face geometry) for a commercial purpose in Texas.

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
Texas AG is the sole enforcer. The Texas Attorney General has secured large settlements from Meta (2024) and Google (2025) in actions pleaded under CUBI together with the Texas Deceptive Trade Practices Act (DTPA); the specific statute-by-statute allocation of the settlement sums is not publicly broken out and must not be aggregated under a single "CUBI-only" label. Consult the Attorney General's public enforcement records for the current posture. The AG interprets each person's biometric capture as a separate violation. No private right of action, but the per-violation penalty at scale creates material exposure.

Priority actions:
1. Implement notice-and-consent workflow before any biometric capture — use documented written or electronic consent records per individual.
2. Define the specific event that triggers purpose expiry for each enrolled population (e.g. employment termination, account closure) and document this in a retention and destruction policy.
3. Audit all vendor agreements for biometric data processors — ensure destruction obligations and security requirements are contractually binding.

Compliance risk rating: HIGH
Texas AG enforcement of CUBI is active; the per-violation calculation at scale creates material exposure even without a private right of action.
---`;
    }

    if (isCA) {
      return `${jurisdiction} — California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. California has no standalone biometric privacy statute equivalent to Illinois BIPA. The primary framework is CPRA (amending CCPA), which classifies biometric information as Sensitive Personal Information (SPI). A financial institution GLBA analysis should be conducted before applying CCPA where applicable.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Cal. Civ. Code § 1798.140(ae)(1)(B): biometric information used to identify a consumer is Sensitive Personal Information (SPI).
2. § 1798.121: consumers have the right to direct the business to limit use of SPI to what is necessary to perform services or provide goods reasonably expected. Implement a "Limit the Use of My Sensitive Personal Information" opt-out link.
3. § 1798.100(b): provide notice at or before collection identifying biometric information as a category of personal information collected and the purposes of use; the Privacy Policy must additionally reflect the SPI classification for purposes of the § 1798.121 limit-use right.
4. § 1798.145(e): GLBA exemption — if the organisation is a financial institution under GLBA and the biometric data relates to GLBA-covered activities, CCPA may not apply to that data; complete GLBA boundary analysis first.
5. CPPA enforcement: the California Privacy Protection Agency (CPPA) enforces CCPA/CPRA; private right of action only for data breaches (§ 1798.150).

Consent and notice:
No opt-in consent is required for biometric collection under CCPA/CPRA (unlike BIPA) — but at-collection notice is required, and consumers must be provided the § 1798.121 right to limit use and disclosure of SPI and any applicable sale/sharing opt-outs.

Retention and destruction:
Retain biometric data only as long as necessary for the disclosed purpose (§ 1798.100(a)(3)). Honor deletion requests under § 1798.105 subject to exceptions.

Sale and sharing restrictions:
Consumers may opt out of the "sale" or "sharing" of personal information (including biometric SPI) under Cal. Civ. Code § 1798.120 — "sharing" is defined at § 1798.140(ah) as cross-context behavioural advertising, and the opt-out link/mechanism is required by § 1798.135. Separately, consumers may direct the business to limit use and disclosure of Sensitive Personal Information under Cal. Civ. Code § 1798.121(a). These are three distinct rights (sale opt-out, sharing opt-out for cross-context behavioural advertising, and limit-use for SPI) — not an outright prohibition; provide each required mechanism.

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

Applies to this organisation: Likely not applicable to this data processing activity — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. The Virginia Consumer Data Protection Act (VCDPA), Va. Code § 59.1-571 et seq., defines "consumer" as a natural person acting in an individual or household capacity. Va. Code § 59.1-575 expressly excludes natural persons acting in a commercial or employment context. Biometric data collected from employees or job applicants is therefore likely outside VCDPA scope.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Confirm that the data subjects are employees or applicants — if so, VCDPA consumer rights and consent requirements do not apply to those individuals under § 59.1-575.
2. No Virginia-specific employment biometric statute currently exists. Virginia common law, Virginia AG consumer protection authority, and any applicable federal employment law (ADA, Title VII) provide the primary legal framework.
3. If the organisation also processes biometric data of non-employee consumers (e.g. customer-facing biometric systems), those consumers ARE within VCDPA scope — conduct a separate VCDPA analysis for that population.
4. Monitor Virginia legislative developments: bills to extend biometric protections to employees have been introduced in prior sessions.
5. Apply strong security, retention, and vendor controls as contractual and operational best practice regardless of VCDPA applicability.

Consent and notice:
No VCDPA opt-in consent obligation applies to employee data. Use clear notice in employee onboarding materials as best practice. Where separate consumer populations are in scope, opt-in consent is required under § 59.1-578(A)(5).

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

Applies to this organisation: Likely partially applicable — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Va. Code § 59.1-575 defines "biometric data" but expressly excludes information collected, used, or stored for health care treatment, payment, or operations purposes where the organisation is subject to HIPAA. If this organisation is a HIPAA covered entity or business associate and the biometric data relates to treatment, payment, or operations, VCDPA biometric requirements do not apply to that data.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Determine HIPAA covered entity / business associate status — if applicable, and if the biometric processing is for treatment, payment, or operations, the VCDPA § 59.1-576 HIPAA exclusion applies to that data.
2. For biometric data NOT covered by HIPAA exclusion (e.g. biometric access control for non-clinical staff, visitor identification not linked to patient care): VCDPA sensitive data requirements apply — § 59.1-578(A)(5) opt-in consent required.
3. Conduct a data inventory to draw the HIPAA/non-HIPAA boundary within the organisation's biometric processing activities.
4. Execute controller-processor agreements under § 59.1-574 for any biometric data outside the HIPAA exclusion.
5. Virginia AG has exclusive enforcement authority; no private right of action under VCDPA.

Consent and notice:
For HIPAA-excluded data: standard HIPAA Notice of Privacy Practices and authorisation requirements apply. For non-excluded biometric data: VCDPA § 59.1-578(A)(5) opt-in consent is required before processing.

Retention and destruction:
HIPAA data: follow HIPAA retention requirements (generally 6 years). Non-HIPAA biometric data: retain only as long as necessary for the stated purpose.

Sale and sharing restrictions:
HIPAA data: governed by HIPAA minimum necessary and permitted disclosures. Non-HIPAA biometric data: VCDPA prohibits sale without separate disclosure; § 59.1-574 processor contracts required.

Current enforcement posture:
Virginia AG enforcement nascent. HHS OCR is the primary enforcement risk for HIPAA-covered biometric data. VCDPA exposure is secondary for organisations with valid HIPAA coverage.

Priority actions:
1. Complete a HIPAA boundary analysis to determine which biometric data falls within the § 59.1-576 HIPAA-related exemption and which does not.
2. For any non-HIPAA-excluded biometric data, implement VCDPA § 59.1-578(A)(5) opt-in consent before processing begins.
3. Execute both BAAs (for HIPAA) and § 59.1-574 processor agreements (for non-HIPAA biometric data) with all relevant vendors.

Compliance risk rating: MEDIUM
Partial HIPAA exclusion means VCDPA applies to a subset of biometric processing — organisations that skip the boundary analysis face opt-in consent gaps for non-HIPAA data; HHS OCR is the primary risk for the HIPAA portion.
---`;
      }

      // Standard VCDPA consumer biometric section (non-employment, non-HIPAA healthcare)
      return `${jurisdiction} — Virginia Consumer Data Protection Act (VCDPA), Va. Code § 59.1-571 et seq.

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Virginia has no standalone biometric statute. The VCDPA classifies biometric data as sensitive data requiring opt-in consent. HIPAA exemptions may apply where the data relates to protected health information; employment-context data is excluded from VCDPA consumer scope under § 59.1-575.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. § 59.1-572: biometric data (data generated by automatic measurements of a consumer's biological characteristics used to identify a specific individual) is sensitive data.
2. § 59.1-578(A)(5): a controller shall not process sensitive data concerning a consumer without obtaining the consumer's consent — an affirmative opt-in requirement, not merely an opt-out.
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

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. The United States has no comprehensive federal biometric privacy statute. Biometric obligations arise from a patchwork of state laws and sector-specific federal frameworks. The primary exposure jurisdictions are assessed separately where selected; this section covers the national landscape and sector-specific federal frameworks.

Key state biometric statutes (by litigation and enforcement risk):
1. Illinois BIPA (740 ILCS 14): private right of action per person; highest US biometric litigation risk. Select "Illinois, USA (BIPA)" for a full BIPA analysis.
2. Texas CUBI (Tex. Bus. & Com. Code § 503.001): AG-only enforcement; $25,000/violation; no private right of action. Select "Texas, USA (CUBI)" for a full CUBI analysis.
3. Washington My Health My Data Act (chapter 19.373 RCW): applies to "consumer health data" as defined in RCW 19.373.010(8)(a) — personal information linked or reasonably linkable to a consumer that identifies the consumer's past, present, or future physical or mental health status. Biometric data is expressly included within consumer health data under RCW 19.373.010(8)(b)(ix), so MHMD applies to biometric data when it is generated from or used to identify a consumer seeking health care services, or used to identify or infer the consumer's health conditions, treatment, or status. Violations are enforceable under the Washington Consumer Protection Act (chapter 19.86 RCW) per RCW 19.373.090, which supplies a private right of action.
4. California CCPA/CPRA (Cal. Civ. Code § 1798.100 et seq.): biometric information is Sensitive Personal Information; Limit-Use right applies. Select "California" for full CCPA analysis.
5. Colorado, Connecticut, Oregon, and Montana have comprehensive privacy laws treating biometric information as sensitive personal data subject to heightened notice and consent or opt-out requirements; consult each state's statute for the specific lawful basis rules.

Federal frameworks applicable to biometrics by sector:
1. HIPAA: biometric identifiers constitute PHI under HIPAA (45 CFR § 160.103) and are among the 18 identifier categories enumerated in the de-identification safe harbor at § 164.514(b)(2)(i). Covered entities and business associates processing patient biometrics must comply with HIPAA minimum necessary, authorisation, and Security Rule requirements.
2. GLBA Safeguards Rule (16 CFR Part 314): financial institutions must protect biometric data as customer information under their written information security programme, implementing safeguards appropriate to the data's sensitivity under 16 CFR § 314.4.
3. FTC Act Section 5: the intake's stated purpose "${body.purpose}" — a ${body.orgType} deploying ${body.biometricTypes.join(", ")} — engages the specific unfair-or-deceptive-practices theory the FTC applied in the Rite Aid facial-recognition action (FTC v. Rite Aid Corp., Case No. 2:23-cv-5023 (E.D. Pa. Dec. 19, 2023); FTC Matter/File No. 2023190), where deployment of a biometric identification technology without adequate consumer notice, accuracy testing, and post-deployment monitoring was held to constitute an unfair practice causing substantial injury under 15 U.S.C. § 45(n); the same theory underpins the May 2023 Biometric Information Policy Statement. § 5 exposure attaches to THIS specific practice (the intake's stated purpose paired with the declared biometric type), not as a generic backdrop — confirm the consumer-facing notice, consent posture, and accuracy-testing record for the stated purpose before deployment.

Current enforcement posture:
At federal level, FTC enforcement under Section 5 is the primary risk for deceptive biometric practices. At state level, Illinois BIPA private litigation is by far the highest-volume risk. Texas Attorney General enforcement of CUBI is active; consult the Attorney General's public enforcement records for current actions. State AG enforcement of comprehensive privacy law biometric provisions is expanding.

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

Applies to this organisation: In scope — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1). France implements GDPR through the Loi Informatique et Libertés (LIL) as amended. The CNIL has issued specific guidance on biometric systems in the workplace.

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

Applies to this organisation: In scope — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1). Ireland implements GDPR through the Data Protection Act 2018. The DPC is the lead supervisory authority for many multinational technology companies under Article 56 GDPR.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 lawful basis AND a separate Article 9(2) condition — both must be separately documented. For most organisations, the Article 9(2) condition will be explicit consent (9(2)(a)) or, in employment contexts, Article 9(2)(b) with Irish employment law authorisation.
2. Mandatory DPIA under Article 35 before deployment — the DPC has confirmed biometric processing for identification is high risk and requires prior assessment.
3. If the organisation is subject to the DPC's oversight as a lead supervisory authority under Article 56, cross-border processing complaints from any EU member state may be routed through the DPC.
4. Article 13/14 transparency notices required before collection, identifying the Article 9(2) condition, biometric modalities, and data subject rights.
5. Article 28 DPA for all processors; non-EEA transfers require an Article 45 adequacy decision or, absent one, an Article 46 safeguard.

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
3. Audit processor agreements to confirm Article 28 DPAs are executed for all biometric data processors, and that any US-hosted processors are covered by the EU–US Data Privacy Framework (Article 45 adequacy, where certified) or an appropriate Article 46 safeguard.

Compliance risk rating: HIGH
DPC active enforcement and its role as lead supervisory authority for multinational tech processing creates elevated cross-border regulatory exposure for organisations without completed DPIAs and documented Article 9(2) conditions.
---`;
    }

    if (isDE) {
      return `${jurisdiction} — GDPR (Germany) — Supervisory authorities: Federal (BfDI) + 16 state DPAs (Datenschutzkonferenz)

Applies to this organisation: In scope — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1), implemented in Germany through the Bundesdatenschutzgesetz (BDSG) 2018. Germany has a dual supervisory structure: the federal BfDI oversees public federal bodies and telecommunications/postal sectors; the 16 state DPAs (Landesdatenschutzbehörden) oversee private organisations in their respective states, coordinated through the Datenschutzkonferenz (DSK).

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 GDPR lawful basis AND a separate Article 9(2) condition — both documented. In employment contexts, § 26 BDSG (processing for employment purposes) may provide a basis alongside Article 9(2)(b), but requires necessity and proportionality assessment.
2. Mandatory DPIA under Article 35 — biometric identification systems generally require a DPIA; verify against the DSK's coordinated DPIA must-list and the competent state DPA's published criteria.
3. Works council (Betriebsrat) codetermination rights: under § 87 Abs. 1 Nr. 6 Betriebsverfassungsgesetz (BetrVG), the introduction of technical systems capable of monitoring employee conduct or performance — which includes biometric time-and-attendance or access systems — requires works council agreement before deployment. Proceeding without Betriebsrat consent exposes the employer to injunctive relief.
4. Article 13/14 transparency notices in German identifying the Article 9(2) condition, biometric modalities, and data subject rights.
5. Article 28 DPA for all processors; any non-EEA transfer requires an Article 45 adequacy decision or, absent one, an Article 46 safeguard.

Consent and notice:
Employee consent is generally not valid as an Article 9(2) condition in the German employment context (EDPB Guidelines 05/2020 on consent; the DSK aligns with this position). Rely on § 26 BDSG with Article 9(2)(b) basis. Works council agreement (Betriebsvereinbarung) is typically the pre-condition for lawful employee biometric processing.

Retention and destruction:
Delete biometric templates when the employment relationship ends or the stated purpose expires — define the destruction trigger in the Betriebsvereinbarung or retention policy.

Sale and sharing restrictions:
§ 26 BDSG limits employee data use to employment purposes. GDPR Article 5(1)(b) purpose limitation and Article 28 processor controls govern all sharing. Non-EEA transfers require an Article 45 adequacy decision or, absent one, an Article 46 safeguard.

Current enforcement posture:
German state DPAs actively enforce special-category-data obligations. Refer to the BfDI and individual state DPA enforcement registers for current actions and penalties.

Priority actions:
1. Obtain works council agreement (Betriebsvereinbarung) before deploying any employee biometric system — this is a legal pre-condition, not a best practice.
2. Complete a DPIA and, if residual risk remains, consult the competent state DPA under Article 36.
3. Confirm the responsible state DPA (Landesdatenschutzbehörde) for this organisation's location. General DPA registration was abolished under the GDPR; if the DPIA shows a high residual risk after mitigation, prior consultation with the competent Land authority is required under GDPR Article 36 — an EU-wide requirement, not a Land-specific one.

Compliance risk rating: HIGH
Germany's works council codetermination requirement creates a hard legal gate before employee biometric deployment; state DPA enforcement is active and has specifically targeted biometric workplace systems.
---`;
    }

    if (isES) {
      return `${jurisdiction} — GDPR (Spain) — Supervisory authority: AEPD (Agencia Española de Protección de Datos)

Applies to this organisation: In scope — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Biometric data processed for unique identification is special-category data under GDPR Article 9(1), implemented in Spain through Organic Law 3/2018 (LOPDGDD). The AEPD is Spain's national supervisory authority and is one of the EU's most active enforcers of biometric obligations.

Key requirements for ${body.orgType} using ${body.biometricTypes[0]}:
1. Article 6 GDPR lawful basis AND a separate Article 9(2) condition — both documented. In employment contexts, Article 9(2)(b) with LOPDGDD Article 9 (processing in employment context) may apply; biometric time-and-attendance typically requires works committee (comité de empresa) consultation under the Workers' Statute (Estatuto de los Trabajadores).
2. Mandatory DPIA under Article 35 — the AEPD's list of processing operations requiring a DPIA includes biometric systems for employee monitoring and identification.
3. Transparency notice under Articles 13/14 in Spanish identifying the Article 9(2) condition, biometric modalities, and rights.
4. AEPD guidance on biometric access control systems (2020) states that facial recognition for access control of employees is not proportionate where less invasive alternatives exist — proportionality is a hard requirement, not a best practice.
5. Article 28 DPA for all processors; any non-EEA transfer requires an Article 45 adequacy decision or, absent one, an Article 46 safeguard.

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

On the intake as supplied, this framework applies conditionally — ${describeProcessing(body.orgType, body.biometricTypes, body.purpose)}. Applicable biometric and sensitive-data obligations depend on the specific laws in force in this jurisdiction.

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
  // QB-P22 item 6 — parameterize hard-coded "Priority actions:" template lines
  // with an owner role derived from orgType and a concrete trigger/timeframe.
  // Recurring rubric_actionability failures quoted priority actions without
  // owners or deadlines (e.g. "Execute written releases before any biometric
  // collection..."). Legal content unchanged; only ownership/timing slots added.
  const priorityOwner = /employer/i.test(body.orgType)
    ? "the HR lead, in coordination with the DPO"
    : /(customer|consumer|retail|marketing|adtech)/i.test(body.orgType)
      ? "the Privacy Program Manager"
      : /healthcare/i.test(body.orgType)
        ? "the Privacy Officer, in coordination with the CISO"
        : /financial/i.test(body.orgType)
          ? "the Chief Compliance Officer, in coordination with the CISO"
          : "the DPO";
  const priorityTrigger = /employer/i.test(body.orgType)
    ? "before any biometric collection from the first affected employee, and in any event within 30 days of this assessment"
    : "before any biometric collection from the first affected data subject, and in any event within 30 days of this assessment";
  function parameterizePriorityActions(text: string): string {
    return text.replace(/(Priority actions:\n)([\s\S]*?)(\n\nCompliance risk rating:)/g, (_m, head, body_, tail) => {
      const patched = body_.split(/\n/).map((line: string) => {
        const m = line.match(/^(\d+\.\s+)(.*)$/);
        if (!m) return line;
        const rest = m[2];
        // Skip lines that already name an Owner or a Timeframe (e.g. OtherUS/OS branches).
        if (/\b(Owner:|Timeframe:|Trigger:)/i.test(rest)) return line;
        const trimmed = rest.trim().replace(/\s+$/, "");
        const withPeriod = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
        return `${m[1]}${withPeriod} Suggested owner (confirm): ${priorityOwner}. Timeframe: ${priorityTrigger}.`;
      }).join("\n");
      return `${head}${patched}${tail}`;
    });
  }
  const sectionTexts = uniqueJurisdictions.map((jn) => parameterizePriorityActions(stressSection(jn)));
  const assessment_text = scrubVoiceLeaks(`${orgLabel}\nGenerated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}\n\n---\n\n` + sectionTexts.join("\n\n"));

  const report_data = {
    // bipa_risk field retired 2026-07-14
    jurisdictions_analysed: uniqueJurisdictions,
    enforcement_precedents: [],
    enforcement_meta: { attempted: false, stress_run: true },
    annotations: [],
    lint_warnings: [],
    generated_at: new Date().toISOString(),
    _meta: { prompt_version: stampPromptVersion("biometric-compliance", "stress"), build_stamp: BUILD_STAMP },
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
    // bipa_risk field retired 2026-07-14
    jurisdictions_analysed: body.jurisdictions,
    enforcement_precedents: [],
    generated_at: report_data.generated_at,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] check-biometric-compliance build active · core=${PROMPT_CORE_VERSION} · build_stamp=${BUILD_STAMP}`);
  console.log(JSON.stringify({ evt: "bio_build_stamp", build_stamp: BUILD_STAMP }));
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
    // RC-B.1 — scoped-delta revision short-circuit.
    {
      const __rev = await handleRevisionMode(supabase, body as any, { toolType: "biometric_checker" });
      if (__rev) return __rev;
    }

    if (body.assessment_id) {
      const ent = await requireEntitlement(caller, "biometric_checker", { rowId: body.assessment_id });
      if (!ent.ok) {
        console.log(JSON.stringify({ evt: "entitlement_denied", fn: "check-biometric-compliance", reason: ent.reason }));
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!caller.internal) {
      // Non-service callers must reference an existing row created via the
      // subscriber/checkout flow. New-row generation is reserved for the
      // internal payments-webhook path.
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



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
          query_descriptor: `biometric processing in ${(Array.isArray(body.jurisdictions) ? body.jurisdictions : []).join(", ") || "—"}`,
        };
      }
    } catch (e) {
      console.error("enforcement fetch failed:", e);
    }

    // Step 2 — BIPA illustrative dollar-range risk retired 2026-07-14 (enrolledCount removed);
    // bipa_risk field removed from report_data and streamed payloads.

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

    // W3-T3 — did the intake NAME the specific US state(s)?
    const otherUsStateNamesRaw = (body.other_state_names ?? "").trim();
    const otherUsStateNamed = otherUsStateApplies && otherUsStateNamesRaw.length > 0;

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
For the UK section: (1) label as "UK GDPR and Data Protection Act 2018" — not "EU GDPR"; (2) identify the Article 9(2) condition AND the DPA 2018 Schedule 1 condition separately; (3) include Article 35 DPIA recommendation with ICO as supervisory authority; (4) use "United Kingdom" in the heading — not "GB"; (5) for UK-to-third-country transfers, reference UK IDTA or UK-approved SCCs, not EU SCCs; (6) replace "do not sell" with UK GDPR purpose limitation and Article 28 processor controls; (7) where the UK–US Data Bridge is referenced, state that it is a UK GDPR Article 45 adequacy mechanism in force since 12 October 2023 (the Data Protection (Adequacy) (United States of America) Regulations 2023, SI 2023/1028) for importers certified under the UK Extension to the EU–US Data Privacy Framework, that transfers to such importers require no UK IDTA or UK-approved SCCs, and that the importer's current participation should be confirmed on the Data Privacy Framework List — never phrase the Data Bridge as pending, proposed, or unavailable.
` : ""}
ENFORCEMENT POSTURE IS CORPUS-ONLY, INCLUDING MAGNITUDES: any characterisation of enforcement outcomes — settlement or fine magnitudes ("multi-billion dollar settlements"), counts of actions, named parties, dates, or dockets — must come from the supplied enforcement corpus and be attributable to it. Absent an on-point corpus entry, describe the posture qualitatively and without magnitudes ("Texas AG enforcement of CUBI is active; consult the Attorney General's public enforcement records") — never quantify from memory. This applies to every "current enforcement posture" or landscape narrative in the output.

PRODUCT-FIX-2 T3(a) — ATTRIBUTION AS PLEADED, NEVER AGGREGATED UNDER ONE STATUTE: any characterisation of an enforcement outcome (settlement, judgment, consent decree) must name the statute(s) actually pleaded in the underlying action, exactly as the source describes them. The Texas Attorney General's Meta (2024) and Google (2025) biometric settlements were pleaded under BOTH the Capture or Use of Biometric Identifier Act (CUBI, Tex. Bus. & Com. Code § 503.001) AND the Texas Deceptive Trade Practices Act (DTPA); the settlement sums are NOT publicly allocated statute-by-statute. NEVER label those settlement figures as "CUBI settlements", "CUBI-only settlements", or aggregate them under a single statute label (e.g. "Texas has secured over $X in CUBI settlements") — that misstates the pleaded basis. Describe them as "actions pleaded under CUBI together with the DTPA" and do not aggregate sums under a single-statute banner unless the corpus entry itself does so. The same rule applies to any multi-statute enforcement action.
${otherUsStateApplies ? (otherUsStateNamed ? `
OTHER US STATE — NAMED-STATE PATH (W3-T3)
The intake NAMES the specific US state(s) engaged: ${otherUsStateNamesRaw}. Produce ONE conditional-framework section per named state (heading form: "[State] — [Named comprehensive privacy statute or, if none, state UDAP / breach-notification hook]"). Each named-state section:
  - Names the specific applicable statute(s) with citation drawn from the following registry — DO NOT invent statute names or section numbers, and do NOT list statutes for states that were not named:
      Alabama: no comprehensive privacy law; Ala. Code § 8-38 (breach notification) + Ala. Code § 8-19 (Deceptive Trade Practices Act, AG-enforced).
      California: CCPA/CPRA, Cal. Civ. Code § 1798.140(ae) (sensitive PI — biometric identifiers), § 1798.121 (right to limit use of SPI); 11 CCR §§ 7150-7157 (risk assessment).
      Colorado: CPA, C.R.S. § 6-1-1303(24) (sensitive data — biometric), § 6-1-1308(7) (opt-in consent for sensitive data), § 6-1-1309 (data-protection assessment).
      Connecticut: CTDPA, Conn. Gen. Stat. § 42-515(28)/(29), § 42-520(a)(6) (consent), § 42-522 (data-protection assessment).
      Delaware: DPDPA, 6 Del. C. § 12D-102 (sensitive data — biometric), § 12D-105 (consent), § 12D-108 (data-protection assessment).
      Indiana: Ind. Code § 24-15 (Indiana Consumer Data Protection Act) — sensitive data, opt-in consent, data-protection assessment.
      Iowa: Iowa Code § 715D — consumer data protection act; sensitive data opt-in consent.
      Maryland: MODPA, Md. Code Ann., Com. Law § 14-4601 et seq. — biometric identifiers as sensitive data.
      Minnesota: Minn. Stat. § 325O — Minnesota Consumer Data Privacy Act; opt-in consent for sensitive data.
      Montana: Mont. Code Ann. § 30-14-2801 et seq. (MCDPA) — sensitive data, consent, data-protection assessment.
      New Hampshire: N.H. Rev. Stat. § 507-H — consumer data privacy; sensitive data consent.
      New Jersey: N.J. Stat. § 56:8-166.4 et seq. (Data Privacy Act) — sensitive data opt-in consent, data-protection assessment.
      New York: SHIELD Act (N.Y. Gen. Bus. Law § 899-BB) — reasonable security for private information including biometric information; NY Civil Rights Law § 79-L (limited biometric use rules); no comprehensive consumer-privacy statute in force as of the assessment date.
      Oregon: OCPA, Or. Rev. Stat. § 646A.570 (sensitive data — biometric), § 646A.578 (data-protection assessment).
      Tennessee: TIPA, Tenn. Code § 47-18-3201 et seq. — sensitive data opt-in consent.
      Texas: TDPSA, Tex. Bus. & Com. Code § 541.001(30) (sensitive data — biometric), § 541.101 (consent), § 541.105 (assessment); SEPARATE from CUBI § 503.001.
      Utah: UCPA, Utah Code § 13-61-101 (sensitive data), § 13-61-302 (consent and notice).
      Virginia: VCDPA, Va. Code § 59.1-575 (sensitive data — biometric), § 59.1-578(A)(5) (consent), § 59.1-580 (data-protection assessment).
      Any other named state: state that no comprehensive consumer-privacy statute is in force in that state as of the assessment date (if that is the fact), and rely on the state's UDAP / consumer-protection statute (AG-enforced) and its breach-notification statute — name both by citation.
  - Names the OWNER role and a CONCRETE TIMEFRAME for every recommendation (per SPEC-PACK-1 S1).
  - Does NOT list candidate statutes from other states; the section is scoped to the named state(s) only.
  - Retains the CUBI / MHMD / BIPA sections ONLY where the named state is Texas / Washington / Illinois respectively — otherwise those statutes are OUT OF SCOPE and MUST NOT appear.
BANNED in the named-state path: enumerating the full ~18-state catalogue; naming statutes for states the reader did not identify.
PRODUCT-FIX-4 T5 SCAFFOLD-LABEL BAN (applies to ALL sections): NEVER emit parenthetical prompt-engineering labels, internal task IDs, scaffold annotations, or courier tags in any output heading, section title, or body text. Banned patterns include, non-exhaustively: "(POST-BIOMETRIC-FIX-1 T5 scaffold — …)", "(PRODUCT-FIX-N T#)", "(SPEC-PACK-1 …)", "(courier …)", "(W3-T3 …)", any bracketed "[POST-…]" or "[SCAFFOLD-…]" tag. Emit the substantive heading only — with no trailing parenthetical tag.
` : `
OTHER US STATE — UNRESOLVED-STATE PATH (W3-T3 compact structured-unresolved)
"Other US state" is in scope BUT the intake did NOT name the specific state. Produce ONE compact "Other US State — State Not Named" section with EXACTLY these four labelled sub-blocks, and NOTHING ELSE (no full-catalogue enumeration, no per-state paragraphs):

  states_to_confirm_reason: One or two sentences explaining that the specific state(s) whose residents' biometrics are captured must be confirmed before jurisdiction-specific obligations can be enumerated. Reference the intake field "other_state_names" by name as the field the reader should populate.

  top_candidate_statutes (MAX 5, each ONE line, named with citation, chosen for the ${body.orgType} / ${body.purpose} intake — NEVER more than 5):
    - Pick from: California CCPA/CPRA (Cal. Civ. Code § 1798.140(ae) / § 1798.121); Colorado CPA (C.R.S. § 6-1-1303(24) / § 6-1-1308(7)); Connecticut CTDPA (Conn. Gen. Stat. § 42-520(a)(6)); Virginia VCDPA (Va. Code § 59.1-575 / § 59.1-578(A)(5)); Texas CUBI (Tex. Bus. & Com. Code § 503.001); Washington MHMD (RCW ch. 19.373); New York SHIELD Act (N.Y. Gen. Bus. Law § 899-BB); Illinois BIPA (740 ILCS 14).
    - One line per candidate. Do NOT reproduce full-registry paragraphs.

  next_step: One sentence. The concrete action the reader should take to enable a resolved analysis (populate other_state_names in a re-run; or, if a single state is already known, name it).

  information_needed_entry: An INFORMATION-NEEDED item pointing to the "other_state_names" intake field. Also emit this same item verbatim in the ===INFORMATION_NEEDED=== annotations block at the end of the document (field=other_state_names, dimensions="specific US state(s) whose residents' biometrics are captured").

BANNED in the unresolved path: the ~18-state candidate catalogue (Alabama through Wyoming); per-state paragraph enumerations beyond the top-5 line entries; any implication that the assessment covers all US states; the prior "General US Biometric Privacy Posture" scaffold heading.
PRODUCT-FIX-4 T5 SCAFFOLD-LABEL BAN: NEVER emit parenthetical prompt-engineering labels, internal task IDs, scaffold annotations, or courier tags in any output heading, section title, or body text. Emit the substantive heading only.
`) : ""}
ENFORCEMENT PRECEDENTS
${formatEnforcementContext(enforcement_context)}


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
    const stressBudget = (isStressRun ? `

STATIC-STRESS MODE: Produce the same required sections, but keep each section concise. Target 3-5 obligations, 3 priority actions, and no extended background discussion. Do not omit any selected jurisdiction.` : "") + renderSupplementalBlock({ responses: (body as any)?.supplemental_responses, context: (body as any)?.supplemental_context });

    const today = new Date().toISOString().slice(0, 10);
    // R1b2 — compute deterministic TEST-STATES from the request body and inject
    // them into the composed system alongside the registry-sourced facts.
    const biometricTestStates = computeBiometricTestStates(body as unknown as Record<string, unknown>);
    const biometricTestStatesBlock = renderBiometricTestStatesBlock(biometricTestStates);
    const composedSystem: SystemBlock[] = buildSystemContent({
      toolModule: BIOMETRIC_TOOL_MODULE,
      variant: isStressRun ? "lean" : "full",
      currentDate: today,
      cache: true,
      // FORK-R1 R4: facts (ICO figures, BIPA citations, CUBI map, FDBR, PRA-by-statute)
      // come from the registry — never from inline prose. A one-line registry edit
      // changes the biometric output on the next run.
      injected: `${renderRegistryFor("biometric-checker")}\n\n${biometricTestStatesBlock}`,
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

    // R1b2 — post-lint T-2/T-3/T-4 gate on the final assessment_text (document
    // mode). One retry cap, then proceed with the violation logged. Same posture
    // as the T-1 lint retry above.
    const t234Violations: any[] = [];
    {
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const depthLangRe = /\b(could|would strengthen|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      const anchorRe = /(BIPA|CUBI|740\s*ILCS|§\s*503|Cal\.\s*Civ\.\s*Code|1798\.|Article\s+\d|Recital\s+\d|GDPR|UK\s*GDPR|EDPB|ICO|Guidelines|Chapter\s+V|DPA\s+2018|Schedule\s+1|MHMD)/i;
      const FIELD_TO_TESTS: Record<string, string[]> = {
        biometricTypes: ["M1"],
        jurisdictions: ["M2", "M3", "M4", "M5", "M6"],
        orgType: ["M8"],
        purpose: ["M8"],
        
      };

      function parseInformationNeeded(text: string): any[] {
        const idx = text.indexOf("===INFORMATION_NEEDED===");
        if (idx === -1) return [];
        const tail = text.slice(idx + "===INFORMATION_NEEDED===".length);
        const cleaned = tail.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start === -1 || end === -1) return [];
        try {
          const arr = JSON.parse(cleaned.slice(start, end + 1));
          return Array.isArray(arr) ? arr : [];
        } catch { return []; }
      }

      function detectT234(text: string): { t2: any[]; t3: any[]; t4: any[] } {
        const t2: any[] = []; const t3: any[] = []; const t4: any[] = [];
        const info = parseInformationNeeded(text);
        for (const item of info) {
          const f = String(item?.field ?? "").trim();
          if (!f) continue;
          const bound = FIELD_TO_TESTS[f];
          if (!bound) continue;
          for (const id of bound) {
            const st = biometricTestStates[id]?.state;
            if (st === "resolved_met" || st === "resolved_not_met") {
              t2.push({ test: id, kind: "info_needed_reasks_resolved", field: f });
            }
          }
        }
        // T-2: if M1 is RESOLVED_NOT_MET (no active biometric processing declared),
        // the report must not present a BIPA damages calculation.
        if (biometricTestStates.M1?.state === "resolved_not_met") {
          if (/BIPA\s+(?:statutory\s+)?damages/i.test(text) && /\$[0-9,]{3,}/.test(text)) {
            t2.push({ test: "M1", kind: "bipa_damages_without_processing", field: "biometricTypes" });
          }
        }
        // T-3: banned collapse phrasing anywhere in the document when any
        // RESOLVED_MET scope establishes a jurisdiction is in play.
        const anyResolved = Object.values(biometricTestStates).some((s) => s.state === "resolved_met");
        if (anyResolved && collapseRe.test(text)) {
          const m = text.match(collapseRe);
          t3.push({ field: "assessment_text", detail: m ? m[0] : "" });
        }
        // T-4: enhancement-class depth language in information_needed dimensions
        // without a statutory anchor in the same entry.
        for (const item of info) {
          const dims = String(item?.dimensions ?? "");
          const prov = String(item?.provision ?? "");
          if (depthLangRe.test(dims) && !anchorRe.test(`${prov} ${dims}`)) {
            t4.push({ field: "information_needed", detail: dims.slice(0, 160) });
          }
        }
        return { t2, t3, t4 };
      }

      let detected = detectT234(assessment_text);
      let t5Hits = detectTestStatesLeak(assessment_text);
      const total = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
      if (!isStressRun && total > 0) {
        console.warn(JSON.stringify({
          evt: "post_lint_violation", fn: "check-biometric-compliance",
          t2: detected.t2.slice(0, 6), t3: detected.t3.slice(0, 6), t4: detected.t4.slice(0, 6),
          t5: t5Hits.slice(0, 6),
        }));
        try {
          const parts: string[] = [];
          if (detected.t2.length) parts.push(`T-2 (TEST-STATES BINDING) — do NOT re-ask or contradict RESOLVED states: ${detected.t2.map(v => `${v.test}:${v.kind}`).join(", ")}`);
          if (detected.t3.length) parts.push(`T-3 (BANNED COLLAPSE) — the intake supplies jurisdiction/type/orgType/enrollment answers; do NOT use 'cannot be determined' / 'no basis to assess' / 'not established' in the assessment prose`);
          if (detected.t4.length) parts.push(`T-4 (ENHANCEMENT-CLASS) — every ===INFORMATION_NEEDED=== entry must be verdict-blocking or record-completeness with a cited provision (BIPA § / CUBI § / Cal. Civ. Code / GDPR Article / EDPB Guidelines / ICO / DPA 2018)`);
          if (t5Hits.length) parts.push(`T-5 (TEST-STATES VOCABULARY LEAKAGE) — remove every reference to TEST-STATES, test ids (M1–M9), and state tokens (resolved_met / RESOLVED_* / INDETERMINATE / CANDIDATE) from the assessment prose, priority actions, and ===INFORMATION_NEEDED=== entries; state the conclusion with its factual basis. Leaked: ${t5Hits.slice(0, 6).map((h) => `"${h.match}"`).join(", ")}`);
          const details = parts.join(" | ");
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
              system: `You are a biometric privacy compliance analyst. Reproduce the prior assessment, correcting these post-lint TEST-STATES gate defects silently and without meta-commentary: ${details}`,
              messages: [
                { role: "user", content: prompt + stressBudget },
                { role: "assistant", content: fullText },
                { role: "user", content: `Regenerate the assessment correcting: ${details}. Same output format, same ===ANNOTATIONS=== and ===INFORMATION_NEEDED=== blocks.` },
              ],
            }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryFull = retryData.content?.[0]?.text ?? "";
            console.log(`[check-biometric-compliance] r1b2 retry done chars=${retryFull.length}`);
            let retryText = retryFull;
            const sep2 = retryFull.indexOf("===ANNOTATIONS===");
            if (sep2 !== -1) retryText = retryFull.slice(0, sep2).trim();
            retryText = retryText
              .replace(/^#{1,6}\s+/gm, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '')
              .replace(/\*([^*\n]+)\*/g, '$1').replace(/^>\s?/gm, '').replace(/^\*\s+/gm, '• ');
            assessment_text = retryText;
            const relint = lintReportText(assessment_text, {
              checkDates: true, checkUnresolvedTokens: true, referenceDate,
            });
            assessment_text = relint.clean;
            detected = detectT234(assessment_text);
            t5Hits = detectTestStatesLeak(assessment_text);
            const still = detected.t2.length + detected.t3.length + detected.t4.length + t5Hits.length;
            if (still > 0) {
              console.warn(JSON.stringify({ evt: "post_lint_violation_after_retry", fn: "check-biometric-compliance", remaining: still, t5_remaining: t5Hits.length }));
            }
          }
        } catch (e) {
          console.warn("[Biometric] T-2/T-3/T-4/T-5 retry failed (non-fatal):", e);
        }
        for (const v of detected.t2) t234Violations.push({ rule: "T-2", ...v });
        for (const v of detected.t3) t234Violations.push({ rule: "T-3", ...v });
        for (const v of detected.t4) t234Violations.push({ rule: "T-4", ...v });
        for (const v of t5Hits) t234Violations.push({ rule: "T-5", field: v.path, match: v.match, context: v.context });
      }
    }
    for (const v of t234Violations) lintViolations.push(v);
    assessment_text = scrubVoiceLeaks(assessment_text);



    const report_data = {
      // bipa_risk field retired 2026-07-14
      jurisdictions_analysed: body.jurisdictions,
      enforcement_precedents: enforcement_context.slice(0, 5),
      enforcement_meta: enforcementMeta,
      annotations: parsedAnnotations,
      lint_warnings: lintViolations,
      generated_at: new Date().toISOString(),
      _meta: { prompt_version: stampPromptVersion("biometric-compliance", "r1b2.1-rcb"), build_stamp: BUILD_STAMP },
    };
    try { const _prose = extractProseFromReport(report_data); const _roster = extractIntakeRoster(body ?? {}); const _det = runFormatChecksGeneric(_prose, { intakeRoster: _roster }).map(x=>({...x, check_type:'deterministic' as const})); attachDeterministicChecks(report_data as any, _det as any); } catch(_) {}


    // 2.6 S2 — forward-path guard. Biometric intake is the request body.
    try {
      const guarded = guardInformationNeeded(report_data as Record<string, unknown>, (body as unknown) as Record<string, unknown>, "biometric_checker");
      Object.assign(report_data as Record<string, unknown>, guarded.report);
    } catch (e) {
      console.warn("[check-biometric-compliance] guardInformationNeeded failed (non-fatal):", e);
    }




    let savedId: string | null = null;
    const isDryRun = caller.internal && body.dry_run === true;
    if (!isDryRun) {
    try {
      if (body.assessment_id) {
        // Stage 1: metering + version retention BEFORE status:complete so a
        // client observing "complete" also sees the meter/version rows.
        await recordRunMeterAndVersion(supabase, {
          toolType: "biometric_checker",
          assessmentId: body.assessment_id,
          userId: resolvedUserId ?? null,
          intake: (body as unknown) as Record<string, unknown>,
          reportData: report_data,
          documentText: assessment_text,
        });
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
        // Insert path: create the row as 'pending' first so we have an id,
        // then write the meter+version row, then flip to 'complete'. This
        // preserves the invariant that a caller observing status='complete'
        // will also see the meter/version rows.
        const { data: insData, error: insErr } = await supabase
          .from("biometric_assessments")
          .insert({
            user_id: resolvedUserId,
            client_id: body.client_id ?? null,
            status: "pending",
            intake_data: body,
            jurisdictions: body.jurisdictions,
            is_free_tier: !!body.is_free_tier,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        savedId = insData.id;
        await recordRunMeterAndVersion(supabase, {
          toolType: "biometric_checker",
          assessmentId: savedId!,
          userId: resolvedUserId ?? null,
          intake: (body as unknown) as Record<string, unknown>,
          reportData: report_data,
          documentText: assessment_text,
        });
        const { error: updErr } = await supabase
          .from("biometric_assessments")
          .update({
            status: "complete",
            analysis_text: assessment_text,
            report_data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", savedId!);
        if (updErr) throw updErr;
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
          // bipa_risk field retired 2026-07-14
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

