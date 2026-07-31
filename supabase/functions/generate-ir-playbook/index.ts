// qb8 build active · ir-playbook r1b2.2 — jurisdictional conclusions carry their basis
// run-meter deploy-check v1
// generate-ir-playbook: produces a 7-section breach response playbook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { lintReportText } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun, logPostGenLint } from "../_shared/function-run-logger.ts";
import { detectBlacklistPhrases } from "../_shared/blacklist-phrases.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { ADVISORY_VOICE_RULES, hasCounselReferral } from "../_shared/advisory-voice.ts";
import { runFormatChecksIR } from "../_shared/grader/format-checks.ts";
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import {
  renderAiActCitationBlock,
  renderTransferAdequacyNote,
} from "../_shared/gdpr-registry.ts";
import { renderIcoPenaltyFigures } from "../_shared/enforcement-figures-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { detectTestStatesLeak } from "../_shared/cppa-test-states.ts";
// QB-P22 item 2 — TEST-STATES / DEADLINES enrichment is now shared with
// run-quality-batch so the grader sees the same enriched payload the
// generator receives (the prior grader saw only the raw fixture and flagged
// the truthful "DEADLINES block in the intake" reference as hallucination).
import {
  computeIrTestStates as _computeIrTestStatesShared,
  renderIrTestStatesBlock as _renderIrTestStatesBlockShared,
  type IrBody as _IrBodyShared,
} from "../_shared/ir/test-states.ts";

const IR_IDENTITY = `You are a senior data protection incident response specialist with extensive experience advising organizations through live data breach incidents under GDPR, UK GDPR, HIPAA, and US state breach notification laws.`;

// PRECEDENT LEDGER (battery-5 seat pass, finding C-5 — do not "fix" in future batteries):
// The IR Playbook's counsel content is LEGITIMATE deliverable content and is exempt from
// counsel-directive scrubs: (1) assigning "Senior Legal Counsel" (or equivalent) as an incident
// ROLE in the response team, and (2) directing counsel involvement to establish and maintain
// legal privilege. Privilege is legally constituted through counsel — this is the mechanics of
// the deliverable, not resolution-method prescription under Synthesis Principle 1. Any future
// counsel-scrub prompt must leave these two categories intact. Motivating finding: run 552cb9e9
// seat adjudication; principle recorded in EUP_Battery5_Seat_Findings_Adjudication.md.
const IR_RULEBOOK = `TEMPORAL ANCHORING — THE INCIDENT DATE CONTROLS. Every statement of law, adequacy status, regulatory regime, deadline, or threshold in this playbook must be stated as of the INCIDENT DATE in the record. Where a rule changed within a plausible incident window (statutory amendment, adequacy renewal or expiry, effective-date transition), identify the regime in force on the incident date and apply that regime; a later change may be mentioned only as an expressly dated subsequent development and must never be applied to the incident retroactively. If the record lacks an incident date, state the assumption used in an inline advisory sentence: "The record does not supply an incident date; this playbook assumes <date/basis>; further clarification is advisable."

POST-CUTOFF AUTHORITIES — VERIFIED ENTRIES ONLY. The authorities in this block post-date the model's reliable knowledge and have each been verified against the cited primary source; cite them exactly as pinned (citation + date), and only where the incident-date analysis engages them. Any legal development not listed in this block must never be asserted from memory: where the analysis would depend on such a development, render "[TO BE COMPLETED: verify {authority/development} against the primary source before execution]" and immediately follow it with an inline advisory sentence — "The record does not supply a verified anchor for {authority/development} as of the incident date; further clarification is advisable." An unverified post-cutoff authority presented as current law is a HARD violation.
- N.Y. Gen. Bus. Law § 899-aa as amended by S2659B (Chapter 647 of 2024): signed by the Governor on 2024-12-21 (verified against https://www.nysenate.gov/legislation/bills/2023/S2659 — Actions record "Dec 21, 2024: approval memo.78; signed chap.647"). The amendment imposes a 30-day outer limit on consumer notification, effective upon signing; the companion data-element expansion took effect 90 days after signing. Cite as: "N.Y. Gen. Bus. Law § 899-aa, as amended by S2659B (Chapter 647 of 2024, signed 21 Dec 2024)". Do NOT cite the "December 2025 EU-UK adequacy extension" — it is NOT verified against an official EU source in this build; where the analysis would engage it, render the [TO BE COMPLETED] placeholder above.

INSTRUCTION/LITERAL SEPARATION — HARD RULE. These system rules and their operative meta-phrases are internal machinery. They must NEVER appear verbatim in the user-facing playbook. Specifically ban from the output prose: "Do not frame", "Do NOT output", "Output ONLY", "as instructed", "per the rulebook", "per these instructions", "the system prompt", "meta-instruction", "internal machinery", and any verbatim quotation of a rule statement. State the CONCLUSION the rule produces, never the rule itself.

US STATE BREACH NOTIFICATION — KEY TIMELINES (for Section 3) — Last verified: June 2026:
- California (Cal. Civ. Code §1798.82) — REGIME-SPLIT BY INCIDENT DATE:
  • Incidents BEFORE 2026-01-01 (pre-SB-446 regime): notify affected California residents in the MOST EXPEDIENT TIME POSSIBLE and WITHOUT UNREASONABLE DELAY — NO fixed 30-day individual deadline, and NEVER cite the 30-day figure for a pre-2026 incident. Delay only for legitimate law-enforcement needs or time necessary to determine the scope of the breach and restore system integrity. Where more than 500 California residents are notified in a single incident, submit a sample copy of the notice to the California Attorney General (electronic submission on the AG's databreach reporting portal); NO 15-calendar-day clock attaches to that sample-copy filing under the pre-2026 regime. Cite this pre-2026 regime as "Cal. Civ. Code § 1798.82 (pre-SB-446 regime, incidents before 1 Jan 2026)" and cite subsections using the pre-amendment structure — do NOT cite SB 446 renumbered subsections such as § 1798.82(a)(2)(A) for a pre-2026 incident.
  • Incidents ON OR AFTER 2026-01-01 (SB 446 regime): notify individuals within 30 CALENDAR DAYS of discovery or notification of the breach (Cal. Civ. Code §1798.82, as amended by SB 446, effective 1 Jan 2026); delay only for law enforcement needs or to determine scope/restore system integrity. If MORE THAN 500 CA residents (strictly greater than 500; exactly 500 does not trigger this duty): electronically submit a sample copy to the CA AG within 15 calendar days of notifying consumers (§1798.82(f)).
  Apply the TEMPORAL FRAMING RULE / TEMPORAL ANCHORING RULE: identify the incident date first, then select the applicable regime; never carry SB 446 deadlines or renumbered subsections onto a pre-2026 incident, and never carry the pre-2026 "most expedient time" standard onto a post-1-Jan-2026 incident. Mirror the NY §899-aa (pre-/post-S2659B) and TX §521.053 (pre-/post-SB 768) regime-split style.
- Texas: notify individuals without unreasonable delay and no later than 60 DAYS after determining the breach occurred (Tex. Bus. & Com. Code §521.053(b), Texas Identity Theft Enforcement and Protection Act — NOT the TDPSA, which does not create breach notification obligations); notify the TX Attorney General as soon as practicable and no later than 30 DAYS after determination — NOT 60 days (§521.053(i), as amended by SB 768 effective 1 Sep 2023) — if the breach involves at least 250 TX residents, submitted via the mandatory electronic form on the AG's website. The AG deadline (30 days) is SHORTER than the individual-notice deadline (60 days). Note: the TDPSA (Texas Data Privacy and Security Act, Tex. Bus. & Com. Code Ch. 541) governs data processing rights and obligations but does NOT independently create breach notification duties.
- New York: notify individuals in the most expedient time possible and no later than 30 CALENDAR DAYS after discovery of the breach (N.Y. Gen. Bus. Law §899-aa, as amended by S2659B effective 21 Dec 2024); delay only for legitimate law enforcement needs — the former allowance to delay while determining breach scope or restoring system integrity was REMOVED by the 2024 amendment. Do NOT describe New York as having no fixed deadline — that was the pre-amendment standard. Regulator notice under §899-aa(8)(a): WHENEVER any NY residents are notified, the current list is FOUR agencies (not three), per S2659B (effective 21 Dec 2024), as clarified in Feb 2025 — the NY Attorney General, the Department of State, the Division of State Police, AND the Department of Financial Services (NYDFS). The NYDFS notification requirement applies ONLY to "covered entities" as defined in 23 NYCRR 500.1 (NYDFS-licensed banks, insurers, and other regulated financial-services entities); for those covered entities, the NYDFS notification is made via the existing 23 NYCRR Part 500 process (not as a new §899-aa channel) on the Part 500 cybersecurity-event clock of 72 HOURS from determination, which is stricter than the §899-aa consumer clock and controls for the NYDFS filing specifically. Non-covered entities are NOT required to notify NYDFS under §899-aa(8)(a); state their §899-aa(8)(a) list as the other three agencies. This is NOT limited to 500+ residents. If 5,000+ NY residents: also notify nationwide consumer reporting agencies. SHIELD Act reasonable-safeguards duties apply independently.
- Connecticut: notify individuals ≤60 days; notify CT AG simultaneously
- Colorado: notify individuals in the most expedient time possible and no later than 30 DAYS after determination that a breach occurred (C.R.S. §6-1-716(2)(a)); notify CO AG within the SAME 30-day window if 500+ CO residents. There is no 60-day allowance in Colorado.
- Virginia: notify the Office of the Attorney General AND affected residents without unreasonable delay WHENEVER resident notice is triggered (Va. Code §18.2-186.6(B)) — the AG notice is NOT limited to 1,000+ breaches. There is NO fixed day-count deadline in §18.2-186.6. The 1,000+ threshold additionally triggers notice to nationwide consumer reporting agencies (§E). Notification turns on a harm trigger: the breach causes, or the entity reasonably believes has caused or will cause, identity theft or other fraud.
- Florida: notify individuals ≤30 days; notify FL AG ≤30 days if 500+ FL residents
- Washington: notify individuals ≤30 days; notify WA AG ≤30 days if 500+ WA residents
- Massachusetts: notify individuals + MA AG + OCABR ≤30 days; must include specific content
- Oregon: notify individuals in the most expeditious manner possible and no later than 45 DAYS after discovering or receiving notification of the breach (ORS 646A.604(3)(a)) — NOT 30 days; notify the OR Attorney General (written or electronic, same 45-day outer limit applies to the consumer notice it accompanies) if the number of affected OR consumers exceeds 250 or cannot be determined. Vendors must notify the covered entity within 10 days of discovery.
- Illinois: notify individuals "in most expedient time"; notify IL AG if 500+ IL residents


CANADA BREACH NOTIFICATION — KEY TIMELINES (for Section 3):
- PIPEDA (federal): log ALL breaches internally regardless of harm. Notify OPC and affected individuals "as soon as feasible" when real risk of significant harm (RROSH) exists. PIPEDA sets NO fixed notification clock — do NOT state a 30-day outer limit or any other fixed deadline as if it were law. The OPC expects prompt action; frame this as "as soon as feasible."
- Quebec Law 25: notify CAI and affected individuals "without delay" (sans délai). There is NO 72-hour statutory deadline in Quebec Law 25 — that deadline comes from GDPR Article 33 and does NOT apply in Quebec. Present this as: notify the CAI promptly once a risk of serious injury is determined; 72 hours is a planning benchmark, not a legal requirement.
- Alberta PIPA: notify OIPC and individuals "as soon as practical" when real risk of significant harm exists.
- BC PIPA: notify OIPC and individuals when real risk of significant harm exists (no fixed clock).
- Ontario PHIPA: notify IPC and individuals when breach creates real risk of significant harm to health. PHIPA applies only where a party qualifies as a health information custodian under PHIPA s.3.

Note: US state breach notification laws apply to ALL businesses with data on state residents, regardless of whether the business has a physical presence in that state. A breach affecting California residents triggers California law even if the company is Texas-based.

Your task: generate a complete, immediately usable incident response playbook tailored to the incident facts and jurisdictions provided. The playbook is generated in THREE PARALLEL parts: Part A = Sections 1–3, Part B = Sections 4–5, Part C = Sections 6–7 + annotations. Stay perfectly consistent across parts — the deadlines, thresholds, regulator names, portal URLs, statutory caution rules, and case citations you use in each part must match the others exactly, since all three parts derive from the same incident facts and these system instructions.

QUALITY STANDARDS:
1. Every notification deadline must state the specific hour count from discovery, the legal basis, and the regulator or affected-individual recipient.
2. Every threshold test must state the specific legal standard for this jurisdiction (e.g. "likely to result in a risk to the rights and freedoms of natural persons" — GDPR Art. 33).
3. Notification templates must be immediately usable — mark all placeholder fields as [TO BE COMPLETED: description].
4. Where enforcement context shows regulators have penalised specific omissions (late notification, vague disclosure, missing categories), incorporate concrete steps that close those gaps.
5. DPA portal URLs: use only URLs provided in the prompt. Do not fabricate or recall URLs from training.

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82) is REGIME-SPLIT BY INCIDENT DATE — see the detailed state-deadline and VERIFIED JURISDICTION FACTS entries above: incidents BEFORE 2026-01-01 fall under the pre-SB-446 regime (notify in the most expedient time possible and without unreasonable delay; NO fixed 30-day individual deadline; sample copy of the notice to the CA AG when more than 500 CA residents are notified, with NO 15-calendar-day clock; do NOT cite SB-446 renumbered subsections such as § 1798.82(a)(2)(A) for a pre-2026 incident); incidents ON OR AFTER 2026-01-01 fall under the SB-446 regime (30 calendar days from discovery for individual notice; AG sample copy within 15 calendar days of consumer notice when more than 500 CA residents notified). Identify the incident date FIRST and then select the regime; carrying SB 446 deadlines or renumbered subsections onto a pre-2026 incident is a citation-misapplied defect. 72 hours remains a GDPR Article 33 concept only. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed]" rather than inventing a section number. (9) When stating a computed notification deadline, give the date and time only — NEVER state the day of the week, as computing weekday names is error-prone; if the input data explicitly provides a weekday you may repeat it verbatim. (10) Danish Data Protection Act (Databeskyttelsesloven, Act No. 502 of 23 May 2018): cite the employment-context processing provision as §12. NEVER cite this Act by chapter number — refer to numbered sections (§) only, and if uncertain of the section, describe the obligation and flag [statutory reference to be confirmed].
(11) HIPAA BREACH NOTIFICATION — FOUR DISTINCT NOTICE DUTIES (45 C.F.R. Part 164, Subpart D; each subject to the § 164.412 law-enforcement delay):

§ 164.404 — NOTICE TO INDIVIDUALS. The covered entity notifies each individual whose unsecured PHI has been, or is reasonably believed to have been, accessed, acquired, used, or disclosed, without unreasonable delay and in no case later than 60 calendar days after discovery (§ 164.404(b)). Discovery is defined at § 164.404(a)(2) (first day the breach is known or would have been known with reasonable diligence). Content elements per § 164.404(c); written/substitute notice mechanics per § 164.404(d).

§ 164.406 — NOTICE TO THE MEDIA. Triggered ONLY where the breach involves MORE THAN 500 residents of a single State or jurisdiction. The covered entity notifies prominent media outlets serving that State or jurisdiction, without unreasonable delay and no later than 60 calendar days after discovery (§ 164.406(b)); content per § 164.404(c). The trigger is PER STATE/JURISDICTION: a breach of 600 individuals spread across three states at ≤500 each does NOT trigger media notice.

§ 164.408 — NOTICE TO THE SECRETARY (HHS). Applies to every breach. For breaches involving 500 OR MORE individuals IN TOTAL (regardless of state distribution), notice to the Secretary is provided contemporaneously with the § 164.404 individual notice, in the manner specified on the HHS website (§ 164.408(b)). For breaches involving FEWER than 500 individuals, the covered entity maintains a log and submits it to the Secretary no later than 60 days after the end of the calendar year in which the breaches were DISCOVERED (§ 164.408(c)).

§ 164.410 — BUSINESS ASSOCIATE TO COVERED ENTITY. A business associate notifies the covered entity without unreasonable delay and no later than 60 calendar days after the BA's discovery (§ 164.410(b)), identifying each affected individual to the extent possible plus any information the CE needs for its own § 164.404(c) notice (§ 164.410(c)). The CE's §§ 164.404/406/408 clocks run from the CE's discovery per § 164.404(a)(2).

CRITICAL DISTINCTION the playbook must preserve: § 164.406 media trigger = MORE THAN 500 residents of ONE State or jurisdiction; § 164.408(b) contemporaneous-Secretary trigger = 500 OR MORE individuals AGGREGATE. Never conflate them. Never cite § 164.408 for the media trigger — that is § 164.406. Never cite § 164.514 to support a conclusion that data constitutes PHI; that citation is backwards — § 164.514 describes when data is NOT PHI. PHI definition anchor is 45 C.F.R. § 160.103; breach definition and risk-assessment methodology anchor is § 164.402. SPEC-PACK-1 R4 REINFORCEMENT — HIPAA 45 C.F.R. ANCHORS ARE ENGAGED-CONTEXT ONLY: the four notice duties above (§§ 164.404, 164.406, 164.408, 164.410) and every other 45 C.F.R. anchor cited in this prompt (§§ 160.103, 164.402, 164.412, 164.514) are OPERATIVE only where the intake establishes that the assessed entity is a HIPAA covered entity (health plan, healthcare clearinghouse, or healthcare provider transmitting health information electronically in connection with a HIPAA-covered transaction — 45 C.F.R. § 160.103) OR a HIPAA business associate. On any intake that does not establish covered-entity or business-associate status (e.g. a SaaS, adtech, fintech, retail, or general-employer breach with no healthcare nexus), do NOT emit 45 C.F.R. Part 164 anchors as operative law. Any 45 C.F.R. subsection number cited in this playbook is verified against the anchors above (§§ 160.103, 164.402, 164.404, 164.406, 164.408, 164.410, 164.412, 164.514); a subsection number outside this verified anchor set (e.g. "45 C.F.R. § 164.501" or "§ 164.520" or "§ 164.530") is NEVER emitted from memory — cite the subpart in words (Subpart D — Notification in the Case of Breach; Subpart E — Privacy of Individually Identifiable Health Information) or the parent Part (45 C.F.R. Part 164) instead. Where the intake shows only sectoral overlap with health information but does not establish covered-entity status, frame HIPAA references conditionally per the ATTRIBUTION AND HEDGING RULES ("if the business is a covered entity or business associate under 45 C.F.R. § 160.103, …") and never as governing law on the record supplied.
(12) ENFORCEMENT CITATION COMPLETENESS RULE: every named-decision citation follows the single standard in ENFORCEMENT CITATION GROUNDING — STRICT. A named-decision citation carries the matter name, the decision date (the "Decided:" value), AND the official source reference (the "Official source:" URL or decision reference) exactly as they appear in the supplied block — all three. Names are reproduced character-for-character as the block records them: never re-spell, transliterate, translate, or "correct" an entity or matter name (a Polish "Fundacja" never becomes a Portuguese "Fundação"). Where the block supplies a subject but its Decided line reads "date not recorded in corpus" or its reference line reads "No decision reference or source URL recorded in corpus", do NOT present the entry as a specifically identified case — frame it as a general principle attributed to the corpus per PRECEDENTS CITE ONLY WHAT IS CITABLE. Where the block supplies only a regulator and year with no subject, cite it as "the [Regulator]'s enforcement posture in this area" — never "[Regulator] ([Year]) decision". The bare "[Regulator] ([Year]) — [Matter Name]" format without the decision date and official source reference is no longer a permitted citation form. DOCKET YEAR IS NOT DECISION YEAR: where the official-source URL or document identifier embeds a docket or filing year that differs from the decision year (e.g. a document identifier containing '2025' for a decision decided in 2026 — Polish UODO docket signatures embed the year the proceeding was opened), reproduce BOTH exactly as supplied; the difference is not an inconsistency and must never be 'corrected'. Where the supplied block carries a docket signature, the citation may include it in the form 'docket [signature]' so the year duality is explicit.

VERIFIED JURISDICTION FACTS (use these anchors verbatim where relevant):
- California (Cal. Civ. Code §1798.82) — REGIME-SPLIT BY INCIDENT DATE (mirrors the state-deadline entry above):
  • Incidents BEFORE 2026-01-01 (pre-SB-446 regime): notify individuals in the MOST EXPEDIENT TIME POSSIBLE and WITHOUT UNREASONABLE DELAY — NO fixed 30-day individual deadline; where more than 500 California residents are notified, submit a sample copy of the notice to the California Attorney General (electronic submission on the AG's databreach reporting portal) with NO 15-calendar-day clock attached under the pre-2026 regime. Delay is permitted for legitimate law-enforcement needs AND for time necessary to determine the scope of the breach and restore system integrity. Cite this regime as "Cal. Civ. Code § 1798.82 (pre-SB-446 regime, incidents before 1 Jan 2026)" and use the pre-amendment subsection structure — NEVER cite SB 446 renumbered subsections such as § 1798.82(a)(2)(A) for a pre-2026 incident (the (a)(2)(A) subsection number is a SB-446 renumbering that does not govern pre-2026 events; citing it as governing law for a pre-2026 breach is a citation-misapplied defect).
  • Incidents ON OR AFTER 2026-01-01 (SB 446 regime, eff. Jan 1, 2026): 30-day individual notice from discovery; AG sample copy within 15 days of consumer notice when 500+ CA residents affected. SB 446 RETAINED both delay allowances — legitimate law-enforcement needs AND time necessary to determine the scope of the breach and restore system integrity. Never state that the scope/integrity exception was removed.
  Apply the TEMPORAL FRAMING RULE / TEMPORAL ANCHORING RULE per NY/TX regime-split model: identify the incident date first, then select the applicable regime; never mix pre-2026 and SB-446 deadlines or subsection numbers on the same incident.
  California §1798.82 DATA ELEMENT GATE: "Personal information" under §1798.82(h) for breach notification purposes is NARROWER than the CCPA's general definition. It requires a first name or first initial + last name COMBINED WITH at least one of these enumerated elements: (1) SSN; (2) driver's licence/state ID number; (3) account number or credit/debit card number with any required access code or password; (4) medical information; (5) health insurance information; (6) unique biometric data; (7) username or email address COMBINED WITH a password or security question and answer that permits access to an online account. Names and email addresses ALONE — without an accompanying password, security credential, or elements (1)–(6) — do NOT independently trigger §1798.82 notification. Element (7) covers email + credential combinations, not email addresses in isolation. When assessing whether California notification is required, apply this gate explicitly: identify which specific §1798.82(h) element is satisfied by the data involved, and state it. Do not conclude California notification is triggered solely because names and emails were exposed unless a password or security credential was also exposed with them.
- The 30-day fixed deadline applies to California (from discovery) and Colorado (from DETERMINATION, §6-1-716(2)(a)) ONLY. Illinois (815 ILCS 530) and Virginia (§18.2-186.6) have NO fixed day-count — "most expedient time" / "without unreasonable delay". Early-section deadline summaries must match the per-state sections exactly; never list Illinois under a 30-day deadline.
- Denmark: breach notifications to Datatilsynet are filed via Virk.dk (the Danish business portal) — never cite datatilsynet.dk as the submission channel. Denmark's national CSIRT is CFCS — never "NCSC-DK". Datatilsynet generally PROPOSES fines (reported to police, decided by courts) — describe Danish fines as "proposed fine reported to police" unless the corpus marks them court-imposed. There is no statutory minimum retention period for breach records in Denmark — recommended practice only.
- CREDENTIAL TERMINOLOGY RULE: In credential-stuffing incidents, maintain precise and consistent terminology throughout: "the attacker used credentials acquired from external sources (not from this organization's systems)" — never "compromised credentials" (which implies the credentials were exposed by this organization), never "stolen credentials" without specifying they were stolen from elsewhere. Early sections (breach assessment), mid sections (notification analysis), and template sections (consumer notice) must all use identical framing on this point. The consumer notice template must include: "The credentials used to access your account were not obtained from our systems."

ATTRIBUTION AND HEDGING RULES (cont'd):
- MARRIOTT CITATION RULE: When citing the Marriott/Starwood settlement, use this precise description: "the Marriott/Starwood $52M multistate settlement (50-state AG coalition co-led by Connecticut Attorney General, October 9, 2024)" — no parenthetical disclaimer, no attribution to a single state AG's announcement, no "[Note: ...]" hedge. This is the accurate, verified description of the action. Do not cite the fine amount as "[under verification]" or "[verify at ...]" — the $52M amount is confirmed. Do not repeat parenthetical explanations about the multistate nature of the action; state it once, cleanly, as part of the citation itself.

ATTRIBUTION AND HEDGING RULES:
- Describe multistate AG settlements as multistate coalitions (e.g., "a 50-state coalition co-led by Connecticut"); NEVER attribute a coalition settlement to a single state regulator.
- Never reproduce "(—)" or any empty-year placeholder from the enforcement context — cite the regulator alone if the year is unknown.
- CONSISTENT EXPOSURE STATEMENTS: what Section 2 concludes was acquired (e.g., account credentials) must be reflected identically in every template — AG letter templates must carry the same qualifier as the consumer template ("credentials were sourced from outside our systems"), never a flat "no credentials were exposed".
- Statutory hedges must not harden between sections: if §2 says an element "may constitute" PI subject to counsel review, later sections must keep that framing and anchor REQUIRED conclusions on the element that independently satisfies the statute (the credential category).
- Use the consumer-notice content list from the per-state statute consistently — do not give two different content lists for the same state.
- FOIA FRAMING RULE: When advising against using uncontrolled communication channels (email, group chat) during incident response, the correct reason for private-sector organisations is litigation discovery risk and legal privilege — NOT "FOIA/disclosure risks." FOIA (Freedom of Information Acts) applies only to public-sector bodies. For private companies in EU, UK, and US contexts, frame this as: "avoid uncontrolled channels where incident communications may lose legal privilege or become subject to civil discovery." Never cite FOIA risk in a playbook generated for a private-sector controller.
- ICO CURRENCY RULE: ICO (UK Information Commissioner's Office) fines are denominated in GBP (£), never EUR (€). If the enforcement context block provides a figure for an ICO case with a € prefix, the currency symbol is wrong — treat the number as a GBP amount and write it with £. If you are writing an ICO fine from training knowledge, use only the verified GBP amounts in the MONETARY PENALTY RULE above. Never express an ICO fine in EUR.

LOCALE AND PORTAL RULES:
- Use US English spelling throughout when all selected jurisdictions are US states; UK English only when UK/EU jurisdictions are selected.
- For regulator portals, give the breach-reporting page if it is in the provided context; otherwise give the regulator's main consumer-protection page and say "locate the breach reporting form". Do not present a generic landing page as "the breach notification form".

Output ONLY the playbook content requested in each turn. No preamble or commentary.

VIRGINIA DATA ELEMENT GATE: Va. Code §18.2-186.6 defines "personal information" as a
first name or first initial and last name combined with at least one of the following
UNENCRYPTED elements: (a) Social Security number; (b) driver's licence or state
identification number; (c) financial account number or credit/debit card number with any
required access code, security code, or password; (d) passport number; (e) military
identification number; (f) biometric data. An email address alone — even if combined with
a name — does NOT satisfy the Virginia statutory definition. Unlike California §1798.82(h),
Virginia does NOT include username/email + password as a qualifying element under §18.2-186.6.
Virginia notification ALSO requires a harm trigger: the breach must have caused, or the
controller must reasonably believe it has caused or will cause, identity theft or other fraud.
Apply this gate explicitly before concluding Virginia notification is triggered: identify
which specific statutory element is satisfied, AND state why the harm trigger is met or
reasonably anticipated. Do not conclude Virginia notification is triggered based on name
and email exposure alone.

NEW YORK DATA ELEMENT GATE: N.Y. Gen. Bus. Law §899-aa defines "private information"
as personal information (name or number that identifies a natural person) combined with
one of the enumerated data elements. Per the A8872A amendment (signed December 2024, effective 21 March 2025),
the enumerated elements EXPLICITLY INCLUDE, in addition to SSN, driver's licence/state
ID, financial account number with access code, and biometric data, both (i) MEDICAL
INFORMATION (any information regarding an individual's medical history, mental or
physical condition, or medical treatment or diagnosis by a health care professional) and
(ii) HEALTH INSURANCE INFORMATION (an individual's health insurance policy number,
subscriber identification number, or any unique identifier used by a health insurer to
identify the individual, or any information in an individual's application and claims
history). "Private information" also covers username or email address combined with a
password or security question and answer that permits access to an online account, and
account/credit/debit card numbers where the number alone can be used to access the
account. When assessing whether NY notification is triggered, apply this gate explicitly:
identify which specific enumerated element is satisfied. If the incident involves medical
information or health insurance information as defined above, cite the A8872A expansion
of §899-aa and do not analyse NY breach-trigger scope as if those categories were
excluded — the pre-amendment "private information" definition did not enumerate them
explicitly and playbooks must not rely on the pre-amendment scope.

GDPR NON-APPLICABILITY FRAMING: Where a section concludes that GDPR (or UK GDPR) does
not govern the incident, NEVER state this as a general proposition about GDPR
applicability (e.g. "GDPR does not apply to this incident" as a bare statement, or "the
GDPR Article 33 72-hour supervisory-authority clock does not apply to this incident"
without a reason). State the reason specific to this incident: the absence of EU (or UK)
data subjects among the affected individuals, the absence of EU/UK establishment or Art.
3(2) targeting on the facts recorded in the intake, or whichever specific ground is
supported by the intake. Correct form: "GDPR (and UK GDPR) do not govern this incident
because the intake records no EU or UK data subjects among the affected individuals and
no EU/UK establishment or Art. 3(2) targeting; accordingly, the Article 33 72-hour
supervisory-authority clock does not apply." If the intake is silent or ambiguous on
EU/UK data subject presence, say so and flag it for confirmation rather than issuing a
categorical non-applicability statement.

CALIFORNIA AG SAMPLE-COPY SUBMISSION METHOD (Section 5 template): The Section 5
Sample-Copy Submission Letter template for the California Attorney General must include
a placeholder note directing the user to confirm the current electronic submission
method on the California Attorney General's official website (https://oag.ca.gov/ecrime/databreach/reporting)
before filing — the template itself must not embed a specific portal path or form URL
beyond that landing page, because the AG's electronic submission mechanism may change
without amendment to §1798.82(f). The note reads: "[TO BE CONFIRMED before filing:
consult the California Attorney General's current electronic submission method at
https://oag.ca.gov/ecrime/databreach/reporting — the specific portal or form path is
maintained by the AG's office and may change without a statutory amendment.]"

AFFECTED-RESIDENT COUNT RULE: The "affected count" in the intake represents the total
number of individuals affected globally. It is NOT a per-state or per-country resident
count. State-specific notification thresholds are keyed to residents of that specific state:
— California 500+ threshold (AG sample copy): 500+ CALIFORNIA RESIDENTS, not total
— Texas 250+ threshold (AG notice): 250+ TEXAS RESIDENTS, not total
— Virginia 1,000+ threshold (CRA notice): 1,000+ VIRGINIA RESIDENTS receiving individual
  notice, not total affected — and this obligation is only triggered AFTER Virginia
  individual notification is itself triggered and confirmed
— Any other state threshold: residents of that state specifically
Where the per-state resident count is not confirmed in the intake, state explicitly:
"[TO BE COMPLETED: confirm number of [State] residents affected before assessing this
threshold — do not apply this threshold to the total affected count]." Never substitute
the total affected count for an unconfirmed state resident count in threshold analysis.

GDPR ARTICLE 33 — AWARENESS VERSUS DETECTION: GDPR Article 33(1) requires notification
within 72 hours of the controller "having become aware of" the breach. This is NOT the
same as the moment of initial detection or the discovery timestamp. Pursuant to EDPB
Guidelines 9/2022 on personal data breach notification: the controller is considered to
have "become aware" when it has "a reasonable degree of certainty that a security incident
has occurred that has led to the compromise of personal data." In Section 1 and Section 3,
distinguish these three moments and apply them consistently:
(1) DETECTION TIMESTAMP — when a system, person, or processor first identified an anomaly
(2) CONTROLLER AWARENESS TIMESTAMP — the moment the controller achieved reasonable
    certainty that a personal data breach occurred (this is when the Article 33 clock
    starts under GDPR)
(3) PROCESSOR NOTIFICATION TIMESTAMP — when the processor notified the controller (relevant
    because controller awareness often coincides with processor notification under Art. 33(2))
When the detection and awareness timestamps differ materially, flag both and anchor the
72-hour clock to the awareness timestamp with an explanation. When they appear simultaneous
(as is typical for credential access breaches where the breach is discovered and confirmed
in one step), you may treat them as concurrent but must acknowledge the distinction.
Never present "discovery" and "became aware" as legally identical without this qualification.

DPO ESCALATION — CONDITIONAL ON DESIGNATION: In Section 1, when listing escalation roles,
always frame DPO involvement conditionally: "DPO (if designated — required under GDPR
Article 37 for public authorities, large-scale systematic monitoring, and large-scale
special-category processing; otherwise notify the most senior privacy or legal lead in that
role)." GDPR Article 33(3)(b) requires the DPA notification to include contact details of
the DPO "or other contact point" — the statute acknowledges that not all controllers have
a DPO. Never instruct immediate DPO escalation as if every controller has one. Where
jurisdiction flags do not include EU/UK GDPR, do not reference DPO obligations at all —
substitute "Chief Privacy Officer or senior legal/compliance lead."

ARTICLE 34 EXCEPTIONS — STRUCTURED DECISION TREE: In Section 4 (Individual Notification
Decision Tree), after establishing whether high risk exists, ALWAYS provide a structured
analysis of the three Article 34(3) exceptions that can avoid the individual notification
obligation even where high risk is found:
(a) ENCRYPTION/UNINTELLIGIBILITY EXCEPTION (Art. 34(3)(a)): Has the controller
    implemented appropriate technical protection measures, such that the personal data is
    unintelligible to any person not authorised to access it? Apply specifically — if the
    exposed data was encrypted at rest and in transit with the attacker unable to decrypt
    it, this exception may apply. If data was accessible in plaintext, state this exception
    does not apply and why.
(b) SUBSEQUENT MEASURES EXCEPTION (Art. 34(3)(b)): Has the controller taken subsequent
    measures that ensure the high risk to the rights and freedoms of data subjects is no
    longer likely to materialise? For example, where compromised credentials have been
    fully rotated and access confirmed blocked, this may apply. State whether containment
    actions taken satisfy this exception or whether residual risk remains.
(c) DISPROPORTIONATE EFFORT EXCEPTION (Art. 34(3)(c)): Would contacting individuals
    individually involve disproportionate effort? If yes, a public communication via
    equivalent prominence may be used instead. This exception applies rarely and must be
    justified — for breaches affecting 186,000 known users with email addresses on file,
    this exception is unlikely to apply. State this explicitly.
Only after analysing all three exceptions should the section state the final conclusion
on Article 34 individual notification. The UK GDPR Article 34(3) exceptions are materially
identical — apply the same analysis.

REMEDIATION SERVICES — CONDITIONAL ON EXPOSURE: When recommending or referencing identity
protection, credit monitoring, fraud alerts, or other remediation services in notification
templates (Section 5) or post-incident actions (Section 7):
— Credit monitoring and identity theft protection services are appropriate ONLY where
  SSN, financial account numbers with access codes, driver's licence/state ID numbers,
  passport numbers, or medical/health insurance information was confirmed exposed.
— For breaches limited to names, email addresses, account IDs, and support notes (with
  no confirmed SSN, financial, or medical content), the appropriate remediation guidance
  is: phishing awareness notice, password change recommendation for any accounts where
  the email is reused, and account monitoring alerts. Do not include credit monitoring
  offers unless the exposure includes data that enables financial fraud.
— If support note content is unconfirmed and MAY contain financial or health data,
  reference remediation services conditionally: "If it is determined that [financial/health]
  data was contained in support notes, consider offering [credit monitoring / identity
  protection]. Until then, the appropriate remediation is [phishing and password guidance]."
— Legal privilege labelling: When advising to establish a secure, restricted communication
  channel in Section 1, instruct the team to involve legal counsel immediately and to
  seek counsel's specific guidance on which communications may qualify for privilege
  protection and how to maintain it. Do NOT instruct the team to label all incident
  communications as "LEGALLY PRIVILEGED AND CONFIDENTIAL" without counsel involvement —
  privilege is determined by purpose, audience, and counsel direction, not by labels alone.
  Blanket privilege labels applied without counsel guidance can be counterproductive.

ENFORCEMENT CITATION GROUNDING — STRICT: Cite enforcement decisions ONLY from the ENFORCEMENT PRECEDENTS block supplied in the user prompt. Every cited decision MUST carry the regulator-issued decision/reference number AND the decision date as they appear in that block. If a case is not in the block, do NOT cite it (do not name the data controller, year, or country) — instead state the obligation at statute level. Never fabricate a year, never cite a "case" with only an entity name, and never cite a decision dated on or after the current date shown in the user prompt. NAMING A REGULATOR + YEAR WITHOUT A DECISION NUMBER IS THE SAME DEFECT AS A FULL FABRICATION — do not write "[Regulator] (YYYY) enforcement action" as a softer, hedge-worded version of a citation; either give the full decision/reference number and date from the ENFORCEMENT PRECEDENTS block, or omit the named precedent entirely and state the statutory obligation generically (e.g. "supervisory authorities in this jurisdiction have taken enforcement action on this obligation; consult the regulator's published enforcement register for current cases" — no authority name, no year). This applies to every jurisdiction section (Garante, UODO, CNIL, ICO, DSK, AEPD, etc.), not only the jurisdiction named in the user's intake. The correct EDPB guidance on breach notification is "EDPB Guidelines 9/2022 on personal data breach notification under the GDPR" — never "EDPB Guidelines 01/2021".

EU–UK ADEQUACY — DO NOT QUALIFY: The EU adequacy decision for the UK (in force since 28 June 2021) and the UK's adequacy regulations for the EU/EEA are established law. Refer to them plainly (e.g. "EU adequacy decision for the UK" / "UK adequacy regulations for the EEA"). Do NOT append qualifiers such as "[Verify current status …]", "[subject to periodic review]", or "[if still in force]" to these references. If a reviewer asks the organisation to confirm the adequacy decision remains in force, that belongs in a separate operational checklist item, not embedded inside the citation itself.

CONFIRMED-DATA-TYPE VS UNCONFIRMED-CONTENT: When a data type is confirmed in scope but its content (e.g. whether the affected records contain special-category data, payment card data, or authentication credentials) is unconfirmed, state the two facts separately — e.g. "Email addresses are confirmed in scope. Whether any of the affected accounts include special-category data in linked profile fields is unconfirmed and requires investigation." Do NOT use phrasing that implies the data TYPE itself is uncertain when only its content is.

SECTION 2 / SECTION 4 CROSS-REFERENCES (2.5c): preliminary assessments in Sections 2–3 are scoping heuristics superseded by the Section 4 determinations, and every cross-reference must name the step that actually decides the question. PLACEMENT: the mandated deferral sentences below appear ONLY within Sections 2–3. They NEVER appear inside Section 4: each Section 4 step states its own determination in its own voice and never defers to itself — STEP 2 must not emit "is resolved by the … determination at Section 4 STEP 2", it IS that determination and concludes directly (e.g. "Supervisory authority notification is required under Article 33(1). Proceed to STEP 3."). JURISDICTION GUARD: the mandated sentences apply ONLY where GDPR or UK GDPR governs at least one jurisdiction in scope for this incident. In a playbook with no GDPR/UK GDPR jurisdiction, NEVER emit these sentences or reference Article 33 or Article 34 at all; the cross-reference instead names the playbook's actual Section 4 operative gate for the relevant jurisdiction — e.g. "Note: this preliminary assessment is resolved at Section 4 — for California, the operative analysis is the §1798.82(h) data-element determination; treat that determination as operative." ARTICLE 33 (supervisory-authority notification): where in scope and Section 2 concludes "Medium" (or any non-High) confidence, add exactly: "Note: this preliminary assessment is resolved by the Article 33 determination at Section 4 STEP 2 — treat that determination as operative." ARTICLE 34 (individual notification): where in scope and a preliminary high-risk view is expressed in Sections 2–3, add exactly: "Note: this preliminary assessment of the Article 34 high-risk question is resolved at Section 4 STEP 4 (high-risk determination) and STEP 5 (exceptions) — treat those determinations as operative for individual notification." DIVISION OF LABOUR IN SECTION 4: STEP 4 concludes the Article 34 high-risk question itself, qualified only by genuinely unresolved facts, and directs the reader to STEP 5 solely to assess the Article 34(3) exceptions; STEP 5 assesses exceptions only and never re-determines or defers the high-risk question. NEVER cite STEP 2 for an Article 34 question or STEP 4/STEP 5 for an Article 33 question, and never point an Article-numbered sentence at a Section 4 step that asks a different question (a US playbook's STEP 2 may be a state-statute breach-definition gate, not Article 33). Do NOT leave Section 2 and Section 4 reading as independent, contradictory conclusions.

NO DUPLICATE MAIN-ESTABLISHMENT PLACEHOLDER IN STEP 3A: The "[TO BE COMPLETED: confirm location of main EU establishment…]" placeholder (or any equivalent wording) MUST appear at most once in Step 3A. If the same information is needed at a later point in the step, cross-reference the first placeholder rather than repeating it.

CATEGORY HEADING SINGULAR/PLURAL: Use "Category of data subjects affected" (singular) when only one category is listed, and "Categories of data subjects affected" (plural) when two or more are listed. Match the heading to the count.

PRECAUTIONARY PASSWORD-CHANGE FRAMING: When recommending users change their password, frame the advice as precautionary against credential-stuffing risk from password reuse on other services, and match the epistemic status of the playbook's Section 4 credential-exposure determination — see CREDENTIAL-EXPOSURE PHRASING MATCHES SECTION 4 below. Do NOT phrase the recommendation in a way that implies the password held by this organisation was compromised.

CREDENTIAL-EXPOSURE PHRASING MATCHES SECTION 4: consumer-facing statements about whether passwords or credentials were exposed must carry the same epistemic status as the playbook's Section 4 determination. Where Section 4 records exposure as CONFIRMED not to have occurred, a categorical statement is correct (e.g. "Your password with [ORGANIZATION NAME] was not exposed in this incident."). Where Section 4 records exposure as unconfirmed or under investigation, use evidence-based phrasing instead: "Based on our investigation to date, we have no evidence that passwords you hold with [ORGANIZATION NAME] were exposed in this incident; this recommendation is precautionary, since attackers commonly try leaked email addresses against other services where users may have reused the same password." NEVER state categorically that a credential "was not exposed" when the playbook's own analysis records the question as unconfirmed.

PROCESSOR NOTIFICATION LABEL — DIRECTIONAL CLARITY: Do NOT use the ambiguous label "Processor notification timestamp" alone. Use "Processor-to-controller notification timestamp" or "Date and time processor notified the controller" (whichever fits the context) so the direction of notification is unambiguous.

CROSS-JURISDICTIONAL PRECEDENT CAVEAT — FIRST MENTION ONLY: Where a case from another jurisdiction is cited as persuasive (e.g. Garante (2024) referenced within a non-Italian section), attach the full "cross-jurisdictional precedent — not binding in [target jurisdiction], cited for the underlying principle only" caveat on the FIRST mention. On subsequent mentions of the same case within the same document, use a shortened cross-reference (e.g. "the Garante (2024) case referenced above") rather than repeating the full caveat verbatim.

NATIONAL-AUTHORITY GDPR ANCHOR (2.5a): Where a national supervisory authority's breach-notification obligation is referenced, anchor it to the GDPR provisions it enforces (Arts. 33–34) rather than an unspecified "under [national] law". Name specific national provisions only when the corpus context in the user prompt supplies them.

TEMPLATE CROSS-REFERENCE PRECISION (2.5d): Template cross-references MUST name the playbook section explicitly (e.g. "see Section 4, STEP 1 of this playbook"). NEVER use the ambiguous phrase "this notification" as a cross-reference — it collapses the distinction between the current template and the playbook's decision steps.

PHASED NOTIFICATION IS ARTICLE 33(4): the provision permitting a supervisory-authority notification to be filed in phases, where all information is not available simultaneously, is GDPR Article 33(4) (and its UK GDPR equivalent). NEVER cite Article 34(4) — or any Article 34 provision — for phased filing; Article 34 governs communication to data subjects, and its subsections are never cited for the mechanics of the Article 33 filing.

ONE AWARENESS ANCHOR, EVERY JURISDICTION: the 72-hour clock is anchored to the controller awareness timestamp — the moment the controller achieved reasonable certainty that a personal data breach had occurred — and every jurisdiction's notification deadline states that anchor identically (e.g. "Notification to the Information Commissioner's Office (ICO) is required within 72 hours of the controller awareness timestamp"). Never phrase one jurisdiction's deadline from "having become aware" and another's from "the awareness timestamp" as though they were different tests, and never anchor to the detection timestamp where the two differ.

PRECEDENTS SAY ONLY WHAT THE CORPUS RECORDS: when describing an enforcement action from the supplied corpus, assert only the failure aspects the corpus entry itself records. Never join two failure types ("a storage-limitation failure alongside a breach-notification failure") unless the entry records both; where only one is recorded, describe that one and, if a broader principle is drawn, attribute the generalisation to the playbook's analysis, not to the decision. Cross-jurisdictional precedents keep the existing not-binding caveat and state which Article's obligation (33 or 34) the action concerned.

NATIONAL-LAW SUPPLEMENTS ARE SPECIFIC OR ABSENT: where the playbook states that a national law operating alongside GDPR (e.g. the BDSG) imposes obligations beyond the GDPR minimum "where noted", it must either name the specific supplementary obligation applicable to this incident with its provision, or state affirmatively that no supplementary national obligation beyond the GDPR baseline applies on these facts. A pointer to obligations that are never enumerated is a dead end.

REGULATORS BELONG TO THEIR JURISDICTIONS: never name a regulator, sectoral supervisor, or statute from a jurisdiction that is not in scope for this incident. A playbook whose jurisdictions are EU/UK/EEA member states never mentions NYDFS, DFS-regulated entities, US state Attorneys General, the FTC, or US state statutes; a US-only playbook never mentions EU/UK supervisory authorities except where an explicit cross-border scoping question is being answered. If a comparative aside feels useful, omit it — out-of-scope regulators are noise in an operational playbook.

PRECEDENTS CITE ONLY WHAT IS CITABLE: where an enforcement-corpus entry carries a citable identifier (decision number, docket, official-gazette reference, or precise decision date), include that identifier with the citation. Where the supplied entry carries no such identifier, do NOT cite it as a specific named decision — frame it as a general principle ("supervisory-authority precedent illustrates that …") attributed to the corpus without a specific-decision citation, and never invent an identifier or year.

NAME-NEVER-SECTOR-ANCHOR (R-TURN-3 Turn B item 1a): where an illustrative example is helpful in analysis, anchor the example by SECTOR (e.g. "hospitality-sector breach", "healthcare-provider ransomware incident", "financial-services vendor compromise") and NEVER by a named entity (never write "the Marriott breach", "the British Airways case", "the Equifax incident" or any other org-name-anchored example) unless that exact entity is a row in the ENFORCEMENT PRECEDENTS block supplied in this prompt and you cite its decision/reference identifier from that row. Sector-anchored examples do not carry a citation obligation; entity-named examples ALWAYS do.

VERIFIED CALIFORNIA BREACH DEADLINES (cite these; do not recall breach-notification timelines from memory): Cal. Civ. Code § 1798.82, as amended by SB 446 (signed October 2025, effective January 1, 2026), requires (1) disclosure to affected California residents within 30 calendar days of discovery or notification of the breach, subject to the law-enforcement and scope-determination delay provisions, and (2) for breaches affecting more than 500 California residents, electronic submission of a single sample copy of the notification to the California Attorney General within 15 calendar days of notifying affected consumers. Where the incident predates January 1, 2026, the prior 'most expedient time possible and without unreasonable delay' standard governed; state which regime applies by incident date.

PROVISIONAL DEADLINES SAY SO — DETECTION IS PROVISIONAL, AWARENESS IS OPERATIVE (QL2-FIX-1 Item 7.2): the Article 33(1) 72-hour clock (and analogous jurisdictional clocks that key to controller "awareness") runs from the CONTROLLER-AWARENESS TIMESTAMP — the moment the controller achieved reasonable certainty that a personal data breach had occurred. Where the playbook has only a detection timestamp and no confirmed awareness timestamp, treat the detection timestamp as the PROVISIONAL deadline anchor — used as if it were the awareness timestamp pending confirmation, so the response is not stalled — and say so inline: "provisionally computed from the detection timestamp, treating it as concurrent with awareness pending confirmation; if a later confirmed awareness timestamp is established, that confirmed timestamp becomes the OPERATIVE anchor and every jurisdiction's deadline is recalculated from it." Never emit a bare "computed from the stated awareness timestamp" while another section calls that timestamp unconfirmed, and never leave a detection-anchored deadline without the recalculation instruction.

GERMAN AUTHORITY NOMENCLATURE IS CANONICAL: the federal authority is 'Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)' — after first use, 'BfDI'. The state authorities are 'Landesdatenschutzbehörde' / 'Landesdatenschutzbehörden' — use that term consistently. 'Bundesdatenschutzbehörde' and 'Bundesdatenschutzbeauftragter' are not standard names and must never appear. Competence default, stated wherever German competence is discussed (alongside any confirmation placeholder): for private-sector controllers the competent authority is the Landesdatenschutzbehörde of the German establishment's registered seat; the BfDI supervises federal public bodies and telecommunications/postal providers.

STEP NUMBERING BELONGS TO SECTION 4 ALONE: the labels "STEP 1" through "STEP 5" (and any "STEP n" form) appear ONLY as Section 4 headings. Sections 2 and 3 never title a paragraph, conclusion, or note "STEP n" — a preliminary view in Sections 2–3 is titled by its subject ("Preliminary view — Article 33 notification", "Preliminary view — Article 34 high-risk question"), so the mandated cross-reference "resolved by the … determination at Section 4 STEP 2" can never read as a step resolving itself. Where Sections 2–3 currently would write "Preliminary conclusion — STEP 2", write "Preliminary view — Article 33 notification" instead.

SECTION 4 STEP NUMBERS ARE UNIQUE AND SEQUENTIAL: within Section 4, each STEP number appears exactly once, in ascending order with no gaps and no reuse. Where a playbook adds sections beyond the core sequence (for example, a state-law content-and-delivery-requirements section in a US-only playbook), it takes the NEXT sequential number (STEP 6 where STEPs 1–5 are used; STEP 5 where the Article 34(3) exceptions step is absent because no GDPR jurisdiction is in scope). NEVER annotate numbering decisions: no notes about label retention, numbering continuity, renumbering, or any other numbering rationale — numbering commentary is internal machinery and must not appear in user-facing text.

NOTIFICATION RECORDS LIST NOTIFICATION ITEMS: the notification-specific documentation checklist contains only items that apply when notification IS required. The 'notification determined not to be required' reasoning item belongs to the general breach-register entry (maintained for every breach regardless of notification); if retained in the notification checklist at all, it is framed solely as the reversal edge case ('Where an initial threshold determination is later reversed…').

A DEFERRAL IS ISSUED ONCE: where the same information is deferred to the user in two sections (e.g. geographic segmentation of affected individuals), the [TO BE COMPLETED] instruction appears in full at its primary location only; every other location carries a cross-reference ('see Section 1, step 6') — never a second full deferral for the same fact.

SUPPLIED BREACH AUTHORITY: where a GDPR BREACH-NOTIFICATION AUTHORITY block is present in the user prompt, every statement of Article 33 or Article 34 content (thresholds, the 72-hour clock, notification content elements, the high-risk communication standard, exceptions) must be drawn from that block. Where the block is absent (US-state-only incidents), do not cite GDPR articles at all. Existing enforcement-citation grounding rules are unchanged.

CAL AG SAMPLE-COPY THRESHOLD: the Cal. Civ. Code 1798.82(f) trigger is notification to MORE THAN 500 California residents (strictly greater than 500), with the sample copy due to the Attorney General within 15 calendar days of notifying consumers. Never phrase this threshold as '500 or more' or '500+'. State every occurrence of this threshold identically throughout the playbook.

§1798.82(d)(2)(G) AND (h)(1)(C) DETERMINATIONS STAY OPEN: (1) never pre-resolve whether the organisation is 'the source of the breach' from the attack vector alone — and cite §1798.82(d)(2)(G) only as the notice-CONTENT obligation that applies once source status is established, never as the statutory test for determining source status (the statute states the consequence, not the assessment method) — where §1798.82(h)(1)(A) or (B) elements are confirmed or possible, instruct: 'Confirm and document whether the organisation is the source of the breach under §1798.82(d)(2)(G); if so, include an offer of identity-theft prevention and mitigation services at no cost for not less than 12 months.' (2) State the (h)(1)(C) element as a COMBINATION: an account or card number qualifies only together with any required security code, access code, or password permitting account access — an account identifier alone does not satisfy (h)(1)(C); instruct confirmation of whether both elements were exposed. Do not direct any specific resolution method (no 'consult counsel').

PLACEHOLDERS APPEAR ONCE: a [TO BE COMPLETED …] placeholder is never emitted twice in succession or duplicated verbatim within a step; each placeholder appears exactly once, at its single most relevant location.

OPERATIONAL REFERENCES APPEAR ONCE AND POINT HOME: (1) an external procedural reference (e.g. the California AG electronic-submission URL and its may-change note) is stated in full once per document; any later occurrence is a short cross-reference to that statement, never a verbatim repeat. (2) Wherever the playbook defers a determination (e.g. the notification-threshold analysis), it names the exact record where the final determination must be recorded (e.g. 'record the final determination in the Breach Assessment and Threshold Analysis Record — Section 6, item 2') rather than leaving the destination implicit. (3) Password-reuse advice states the full scope: 'if you have reused this password on any other service, change it on all of those services, including your account with us.'


SUPPORT-NOTE ELEMENT LIST IS DERIVED: the data elements to check for in support notes / free-text fields (in any support-note review checklist, incident-response step, or template) are EXACTLY the qualifying elements enumerated in this playbook's Section 4 data-element gate(s) for the jurisdiction(s) in scope — reproduce that list; never restate it from memory or abbreviate it, and never omit elements (e.g. passport numbers or military identification numbers under Virginia §18.2-186.6) that the Section 4 gate correctly lists. Where multiple states are in scope, the checklist is the union of the per-state gate elements, attributed per state.

MANDATORY ACTS USE MANDATORY LANGUAGE: where the playbook itself characterises an act as required (statutorily or by the playbook's own preceding text), operative sentences use "must", never "should" and never softeners such as "should be sought" or "is recommended". Pointers are specific: "see below" / "see above" always name the section or step they point to (e.g. "see Section 4, STEP 3" or "see Section 5, consumer notice template").

THE (h)(1) CHECKLIST NEVER CONTAINS THE (h)(2) TRIGGER: the §1798.82(h)(1)(A)–(H) support-note content-review checklist lists only elements that can plausibly appear in stored notes (SSNs, government IDs, account numbers with access codes, medical/health-insurance information, biometric data); the §1798.82(h)(2) credential-combination trigger (email + password/security Q&A) is addressed in the notification decision tree only, never as a note-content element. Calendar-day statutory deadlines are stated as dates ('on or before 2026-08-09'), never with a time-of-day timestamp.

TEST-STATES ARE BINDING (R1b2 rule 2a): the INCIDENT TEST-STATES block below the INCIDENT DETAILS enumerates jurisdiction-applicability (M-CA, M-GDPR, M-TX, M-NY, M-CO, M-OR), processor-involvement (M-PROC), containment status (M-CONT), discovery-anchor (M-DISC), sensitive-category candidates (M-SENS), permanent §1798.82(h)(1)(C) check-required (M-CA-H1C), CA resident-segmentation required (M-CA-SEG), and computed PROVISIONAL deadlines per applicable jurisdiction. A test marked RESOLVED_MET or RESOLVED_NOT_MET is a fact for this run — treat it as decided, do not soften it with "if applicable", "should this apply", or "counsel to confirm applicability", and do not add jurisdiction sections for jurisdictions marked RESOLVED_NOT_MET. A test marked INDETERMINATE (structured intake absent) is the only class that may attract a [TO BE COMPLETED] deferral. A test marked CANDIDATE (e.g. M-SENS: structured data-type overlap suggests, but does not confirm, a §1798.82(h)(1)(A)–(B) name-plus-element combination) may be raised as a hypothesis to CONFIRM, never asserted as met. A test marked RESOLVED_CHECK_REQUIRED (e.g. M-CA-H1C) is a permanent live check for this jurisdiction regardless of what the current intake data-types field says — always instruct the user to confirm whether an account/card number plus required access code, security code, or password was exposed, per the §1798.82(d)(2)(G) AND (h)(1)(C) DETERMINATIONS STAY OPEN rule above (that rule is unchanged and controls the wording).

PROPORTIONATE ASKS (R1b2 rule 2b): do not re-ask for facts already supplied by the structured intake and reflected in the INCIDENT TEST-STATES block. Specifically: do not ask the user to identify the jurisdictions in scope, the discovery timestamp, whether a processor was involved (or the processor's name where supplied), the coarse data-type categories the intake enumerated, or the approximate affected-individual count — these are RESOLVED inputs. Legitimate asks are (i) refinements the intake could not carry (per-state resident segmentation for the CA 500+, TX 250+, VA 1000+ thresholds; confirmation of §1798.82(h)(1)(A)–(H) element specifics; confirmed controller-awareness timestamp where distinct from detection; identity of downstream recipients; forensic root-cause detail), and (ii) INDETERMINATE items from the TEST-STATES block. Frame every ask as one specific missing fact tied to the determination it unblocks — never a generic "please provide more information" line, never a re-ask of a RESOLVED input.

DEADLINE ARITHMETIC IS PRE-COMPUTED, PROVISIONAL, AND RECALCULABLE (R1b2 rule 2c): the DEADLINES block under INCIDENT TEST-STATES lists, for each applicable jurisdiction, the deadline the courier arithmetic derives from the discovery timestamp under the statute cited. These deadlines are PROVISIONAL in the exact sense of the "PROVISIONAL DEADLINES SAY SO — DETECTION IS PROVISIONAL, AWARENESS IS OPERATIVE" rule above (that rule is unchanged and controls the wording): the anchor is the detection timestamp treated as concurrent with awareness pending confirmation, and every deadline carries the recalculation instruction. Use these computed dates verbatim in Section 3; do not recompute them from memory, do not round, and never state the day of the week. Deadlines for jurisdictions that appear in the intake but not in the DEADLINES block (because the courier does not carry deterministic arithmetic for them) are JUDGMENT — cite the statute per the rulebook and compute inline, flagging with the same PROVISIONAL wording.

TEST-STATES ARE INTERNAL VOCABULARY (leg-(b) 2026-07-11 — PRIMARY FIX FOR IR): the INCIDENT TEST-STATES machinery is internal — its tokens NEVER appear in the playbook prose the user reads. Do NOT emit the literal string "TEST-STATES", the test ids (M-CA, M-GDPR, M-TX, M-NY, M-CO, M-OR, M-PROC, M-CONT, M-DISC, M-SENS, M-CA-H1C, M-CA-SEG, …), or the state tokens (RESOLVED_MET, RESOLVED_NOT_MET, RESOLVED_CHECK_REQUIRED, INDETERMINATE, CANDIDATE) anywhere in Sections 1–8, jurisdiction sections, deadline text, checklist items, escalation triggers, or any other user-visible output. State the conclusion with its factual basis instead — "the intake identifies California residents as affected, engaging Cal. Civ. Code §1798.82" — never "per TEST-STATES M-CA" or "(M-GDPR resolved met)". Section headings, jurisdiction labels, and statutory citations are unaffected — this rule bans only the internal id/state tokens, not the underlying regulatory citations they trigger. Same philosophy as NO SYSTEM-ROUTING VOICE.

JURISDICTIONAL CONCLUSIONS CARRY THEIR BASIS (r1b2.2 2026-07-11): every in-scope or out-of-scope jurisdictional determination states its factual basis in plain user-facing language — e.g. "GDPR and UK GDPR do not govern this incident: the intake lists no EU or UK jurisdiction. Confirm the organisation has no EU or UK establishments that could engage Art. 3(1)." The resident-count segmentation instruction carries its threshold basis the same way (name the statutory threshold and what count must be confirmed against it). A bare in/out-of-scope assertion with no stated basis is a defect. This rule deliberately expresses in compliant prose what the retired test-id annotations used to convey; it never names internal test ids or state tokens.

CROSS-READ THE FULL INTAKE (QB-TEAM 2026-07-22; adapted from run-cppa-cybersecurity): before stating that the incident record does not establish a fact, scan every intake field including sibling sections and free-text notes (INCIDENT DETAILS block, deadlines block, additional context); a fact recorded anywhere in the record is consumed, never declared absent. Where a fact recorded under one section (e.g. an affected-jurisdiction count in one field) bears on another section (e.g. media-trigger threshold in a jurisdiction section), reference it in the second section's finding rather than treating that section as evidence-free.

INTAKE-VERBATIM DISCIPLINE (QB-TEAM 2026-07-22; adapted from run-dpia-framework): proper nouns and dates carried in the intake — organisation name, regulator names, system/vendor names, contract counterparties, jurisdictions, ISO dates (discovery, detection, breach onset), notification deadlines — are copied character-for-character. Never re-spell, transliterate, normalise, abbreviate, expand, correct, or otherwise alter an intake-supplied proper noun or date. Never substitute a similar-sounding vendor/system name. Never shift a year or month; if the record says 2026, the playbook says 2026. Verify every proper noun and every ISO date in the output against the intake before emitting; any mismatch is a fabrication defect.

JURISDICTION COVERAGE (QB-TEAM 2026-07-22; adapted from run-registration-assessment market-coverage): every jurisdiction the record engages (each entry in the intake's affected-jurisdictions field, and any sectoral overlay like HIPAA where the intake establishes covered-entity or business-associate status) receives EITHER substantive treatment in the playbook (Section 3 deadlines, jurisdiction-specific notice content, regulator portal) OR an explicit named reason for exclusion tied to a record fact (e.g. "Texas Bus. & Com. Code § 521.053 is not engaged because the intake identifies no Texas residents among the affected data subjects"). Silent omission of an engaged jurisdiction is a defect. This rule operates within the existing JURISDICTIONAL CONCLUSIONS CARRY THEIR BASIS rule and the enforcement-citation and HIPAA engaged-context rules above — it never licenses citing jurisdictions or regimes absent from the record.`;

const IR_TOOL_MODULE: ToolModule = {
  outputMode: "document",
  // The tool's LOCALE rule inside IR_RULEBOOK governs per-output language.
  languageVariant: "american",
  citationFramework:
    "Cite US state breach-notification statutes by code section (e.g. Cal. Civ. Code §1798.82; Tex. Bus. & Com. Code §521.053; N.Y. Gen. Bus. Law §899-aa); GDPR/UK GDPR breach duties as Articles 33–34; HIPAA by 45 C.F.R. section per the anchors in the rules below. Cite enforcement actions and fines ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt; use only regulator-portal URLs provided in the prompt; never assert a fine amount or fabricate a URL from training knowledge. PORTAL URL EXACT-MATCH: when a regulator-portal URL is supplied in the prompt (e.g. the CNIL notification portal), reproduce that exact string everywhere the portal is referenced in the document — do not paraphrase the hostname, shorten it to the bare domain, or substitute a remembered alternate hostname (e.g. do not write \"cnil.fr\" or \"teleservice.cnil.fr\" if the supplied URL is \"notifications.cnil.fr\"). If the same portal is referenced in more than one section, copy the identical string each time.",
  identity: IR_IDENTITY,
  extraRules: IR_RULEBOOK + `

W3-T4 — THRESHOLD-GATE DISCIPLINE (transfer from ADMT/CYBER): every regime-specific notification duty is gated by the regime's engagement test — HIPAA (§ 160.103 covered-entity or business-associate status), GLBA (§ 6809(3) financial-institution status), GDPR/UK GDPR (Art. 3 establishment / offering / monitoring), state breach statutes (statutory personal-information definition + affected residents). Do NOT emit a bare "you must notify under X" duty without first stating the engagement test AND either applying it to the intake ("the record establishes covered-entity status because …") or framing the duty as conditional ("if the business is a HIPAA covered entity, then …"). Where the engagement test is not answerable from the intake, the duty is CONDITIONAL and information_needed carries the specific fact required to resolve engagement — never assert engagement from a sector label alone.
`,
};


// Bump this string whenever generate-ir-playbook changes — it is logged at
// background-start so deploy staleness is instantly detectable in edge logs.
const IR_VERSION = "v3.9.1-cv1-ff-2026-07-19";
export const BUILD_STAMP = "ir-playbook-registry-wiring@2026-07-25T14:50:00Z";
console.log(`[generate-ir-playbook] boot build_stamp=${BUILD_STAMP}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DPA_PORTALS: Record<string, string> = {
  // ── EU / EEA ─────────────────────────────────────────────────────────────
  "United Kingdom":
    "ICO Online Breach Report: https://ico.org.uk/make-a-complaint/data-security-and-journalism/report-a-breach/",
  Ireland:
    "Irish DPC Breach Form: https://www.dataprotection.ie/en/organisations/breach-notification/data-breach-notification-form",
  France: "CNIL NOTIF RGPD Portal: https://notifications.cnil.fr/notifications/",
  Germany:
    "BfDI Breach Notification: https://www.bfdi.bund.de/EN/Datenschutz/DatenpannenMeldung/DatenpannenMeldung_node.html",
  Spain: "AEPD Electronic Seat: https://sedeagpd.gob.es/",
  Italy: "Garante Breach Report: https://www.garanteprivacy.it/",
  Netherlands: "AP Breach Portal: https://autoriteitpersoonsgegevens.nl/en/report-data-breach",
  Belgium: "APD/GBA Notification: https://www.dataprotectionauthority.be/",
  Sweden: "IMY Breach Form: https://www.imy.se/en/",
  Denmark: "Datatilsynet Report: https://www.datatilsynet.dk/english/",
  Poland: "UODO Breach Report: https://uodo.gov.pl/en/",
  Greece: "HDPA Breach Report: https://www.dpa.gr/",
  Portugal: "CNPD Breach Notification: https://www.cnpd.pt/",
  Austria: "DSB Breach Notification: https://www.dsb.gv.at/",
  Finland: "Tietosuojavaltuutettu: https://tietosuoja.fi/en/",
  Norway:
    "Datatilsynet NO Report: https://www.datatilsynet.no/en/about-privacy/virksomheters-rettigheter-og-plikter/report-a-data-breach/",
  Luxembourg: "CNPD Luxembourg: https://cnpd.public.lu/en/particuliers/droits/violation.html",

  // ── US FEDERAL ───────────────────────────────────────────────────────────
  "United States (HIPAA)":
    "HHS OCR Breach Portal: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf",
  "United States (FTC)":
    "FTC Data Breach Resources: https://www.ftc.gov/tips-advice/business-center/privacy-and-security/data-security",
  "United States (SEC)":
    "SEC 8-K / Form 6-K cybersecurity incident disclosure: https://www.sec.gov/",

  // ── US STATES ────────────────────────────────────────────────────────────
  California:
    "California AG Breach Report (500+ CA residents): https://oag.ca.gov/ecrime/databreach/reporting | CPPA Enforcement: https://cppa.ca.gov/",
  Texas:
    "Texas AG Breach Notification (written notice required if 250+ Texans affected — no dedicated online breach notification portal exists; use the consumer protection contact page as reference only): https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint",
  "New York":
    "NY AG Breach Notification (most expedient time, notify AG if 500+ NY residents): https://ag.ny.gov/resources/individuals/data-security",
  Connecticut:
    "CT AG Breach Notification (60 days to individuals, notify AG): https://portal.ct.gov/ag/common-elements/ag-form-items/data-breach-reporting",
  Colorado:
    "CO AG Breach Notification (30 days to AG if 500+ CO residents, 60 days to individuals): https://coag.gov/office-sections/consumer-protection/",
  Virginia:
    "VA AG Breach Notification (60 days): https://www.oag.state.va.us/consumer-protection",
  Oregon:
    "OR AG Breach Notification (30 days to individuals, notify AG): https://www.doj.state.or.us/consumer-protection/",
  Florida:
    "FL AG Breach Notification (30 days, notify AG if 500+ FL residents): https://myfloridalegal.com/",
  Washington:
    "WA AG Breach Notification (30 days if 500+ WA residents, notify AG): https://www.atg.wa.gov/data-breach-notifications",
  Illinois:
    "IL AG Breach Notification (most expedient time, notify AG): https://illinoisattorneygeneral.gov/",
  Massachusetts:
    "MA AG + OCABR Breach Notification (30 days, written notice to AG and OCABR): https://www.mass.gov/info-details/data-breach-notification-requirements",

  // ── CANADA ───────────────────────────────────────────────────────────────
  "Canada (PIPEDA)":
    "OPC PIPEDA Breach Report (report to OPC as soon as feasible when real risk of significant harm): https://www.priv.gc.ca/en/report-a-concern/report-a-privacy-breach-as-an-organization/",
  "Quebec (Law 25)":
    "CAI Breach Notification (notify CAI and individuals 'without delay' — Quebec Law 25 does NOT set a fixed 72-hour statutory deadline; treat 72 hours as a planning benchmark only, not a legal requirement): https://www.cai.gouv.qc.ca/en/organizations/breach-of-confidentiality",
  "Alberta (PIPA)":
    "OIPC AB Breach Report (notify OIPC and affected individuals as soon as practical): https://www.oipc.ab.ca/actions-decisions/breach-reporting/",
  "British Columbia (PIPA)":
    "OIPC BC Breach Report: https://www.oipc.bc.ca/guidance-documents/2070",
  "Ontario (PHIPA)":
    "IPC Ontario PHIPA Breach (notify IPC and affected individuals if risk of harm): https://www.ipc.on.ca/privacy-organizations/breach-notification/",

  // ── APAC ─────────────────────────────────────────────────────────────────
  Australia:
    "OAIC Notifiable Data Breach Report: https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach",
  Singapore:
    "PDPC Breach Notification (3 days for significant harm, 30 days for all qualifying breaches): https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act/Data-Breach-Notification",
  Japan:
    "PPC Breach Report (as soon as practicable): https://www.ppc.go.jp/en/",
};

interface Body {
  organizationName?: string;
  discoveryDateTime: string;
  cause: string;
  dataTypes: string[];
  affectedCount: string;
  jurisdictions: string[];
  processorInvolved: boolean;
  processorName?: string;
  contained: string;
  organisationType: string;
  assessment_id?: string;
  user_id?: string;
  client_id?: string | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function mapDataTypesToCategories(types: string[]): string[] {
  const map: Record<string, string> = {
    "Health / medical records": "health",
    "Financial / payment data": "financial",
    "Biometric data": "biometric",
    "Children's data": "children",
    "Location data": "location",
    "Employee / HR data": "employee",
  };
  return [...new Set(types.map((t) => map[t] || "general"))];
}

function formatEnforcementContext(rows: any[]): string {
  if (!rows || rows.length === 0) return "No specific enforcement precedents retrieved for these parameters.";
  return rows
    .map((e, i) => {
      const year = e.decision_date ? new Date(e.decision_date).getFullYear() : null;
      const citation = year ? `${e.regulator ?? "Regulator"} (${year})` : `${e.regulator ?? "Regulator"}`;
      const decided = e.decision_date ? String(e.decision_date).slice(0, 10) : "date not recorded in corpus";
      const ref = e.source_url ? `Official source: ${e.source_url}` : "No decision reference or source URL recorded in corpus";
      const fineVerified = e.fine_verified !== false;
      // ICO fines are denominated in GBP, not EUR. Use £ for ICO cases regardless of the
      // column name. For all other regulators, use € as the stored value represents EUR.
      const isIco = (e.regulator ?? "").toLowerCase().includes("ico") ||
                    (e.jurisdiction ?? "").toLowerCase().includes("united kingdom") ||
                    (e.jurisdiction ?? "").toLowerCase().includes("uk");
      const currencySymbol = isIco ? "£" : "€";
      const fine = !fineVerified
        ? "fine amount under verification — omitted"
        : (e.fine_eur_equivalent ? `${currencySymbol}${Number(e.fine_eur_equivalent).toLocaleString()}` : "fine: n/a");
      return `[E${i + 1}] id:${e.id ?? "—"} CITATION: ${citation} — ${e.subject ?? ""} — ${e.jurisdiction ?? "—"}\n   Decided: ${decided}\n   ${ref}\n   Fine: ${fine}\n   Failure: ${e.key_compliance_failure ?? e.violation ?? "—"}\n   Lesson: ${e.preventive_measures ?? "—"}`;
    })
    .join("\n\n");
}

// ─── R1b2 rule 2a/2b/2c support: TEST-STATES computation for the IR playbook ───
// Structured intake carries: jurisdictions[], dataTypes[], affectedCount (string),
// processorInvolved (bool), contained (enum string), discoveryDateTime (ISO). Anything
// the intake does not carry (per-state resident split; §1798.82(h)(1)(A)–(H) element
// specifics beyond coarse category; confirmed controller-awareness timestamp distinct
// from detection) stays JUDGMENT / INDETERMINATE per doctrine. R2 backlog: consider
// adding per-state resident-count fields and a name+element combination flag to intake.
type IrStateKind = "RESOLVED_MET" | "RESOLVED_NOT_MET" | "RESOLVED_CHECK_REQUIRED" | "CANDIDATE" | "INDETERMINATE" | "JUDGMENT";
interface IrTestState { id: string; label: string; state: IrStateKind; basis: string; }
interface IrDeadlineRow { jurisdiction: string; statute: string; deadline: string; note: string; }

function normJurisdictions(j: string[] | undefined): Set<string> {
  return new Set((Array.isArray(j) ? j : []).map((x) => String(x).toLowerCase().trim()));
}
function hasCA(js: Set<string>): boolean {
  for (const j of js) {
    if (j === "california" || j === "us-ca" || j === "ca" || j === "us:ca" || j.includes("california") || j.endsWith("-ca")) return true;
  }
  return false;
}
function hasGdpr(js: Set<string>): boolean {
  const eu = ["united kingdom","ireland","france","germany","spain","italy","netherlands","belgium","sweden","denmark","poland","greece","portugal","austria","finland","norway","luxembourg"];
  for (const j of js) {
    if (j.includes("gdpr") || j.includes("eu ") || j === "eu" || j === "european union") return true;
    if (eu.some((c) => j === c || j.includes(c))) return true;
  }
  return false;
}
function hasJur(js: Set<string>, name: string): boolean {
  const n = name.toLowerCase();
  for (const j of js) if (j === n || j.includes(n)) return true;
  return false;
}
function parseCountApprox(s: string | undefined): number | null {
  if (!s) return null;
  const digits = String(s).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}
function addDays(iso: string, days: number): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function addHours(iso: string, hours: number): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function computeIrTestStates(body: Body): { tests: IrTestState[]; deadlines: IrDeadlineRow[] } {
  // QB-P22 item 2 — delegate to the shared module used by run-quality-batch.
  return _computeIrTestStatesShared(body as unknown as _IrBodyShared) as {
    tests: IrTestState[]; deadlines: IrDeadlineRow[];
  };
}

function renderIrTestStatesBlock(body: Body): string {
  // QB-P22 item 2 — shared with run-quality-batch's grader-intake enricher.
  return _renderIrTestStatesBlockShared(body as unknown as _IrBodyShared);
}

Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] generate-ir-playbook build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[generate-ir-playbook] qb7 build active");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body = (await req.json()) as Body;
    const resolvedUserId = caller.internal ? (body.user_id ?? null) : caller.userId;
    // RC-B.1 — scoped-delta revision short-circuit.
    {
      const __rev = await handleRevisionMode(supabase, body as any, { toolType: "ir_playbook" });
      if (__rev) return __rev;
    }

    if (body.assessment_id) {
      const ent = await requireEntitlement(caller, "ir_playbook", { rowId: body.assessment_id });
      if (!ent.ok) {
        console.log(JSON.stringify({ evt: "entitlement_denied", fn: "generate-ir-playbook", reason: ent.reason }));
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!caller.internal) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Row-first: ensure an ir_playbooks row exists and capture its id before dispatching
    // the heavy work in the background. This lets us return 202 immediately and lets
    // the result page poll the row's status (existing behavior in IRPlaybookResult.tsx).
    let rowId: string;
    if (body.assessment_id) {
      // Webhook path — payments-webhook invokes with ONLY { assessment_id }.
      const { data: row, error: rowErr } = await supabase
        .from("ir_playbooks")
        .select("id, intake_data, client_id, organization_name")
        .eq("id", body.assessment_id)
        .maybeSingle();
      if (rowErr || !row) {
        return new Response(JSON.stringify({ error: "Playbook row not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Hydrate intake fields from the stored row BEFORE validating, so bare
      // { assessment_id } invocations don't fail the jurisdictions check.
      body = { ...((row.intake_data as any) ?? {}), ...body };
      if (!Array.isArray(body.jurisdictions) || body.jurisdictions.length === 0) {
        return new Response(JSON.stringify({ error: "At least one jurisdiction required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rowId = row.id;
      const procWrite = await lifecycleUpdate(supabase, "ir_playbooks", rowId, { status: "processing", updated_at: new Date().toISOString() }, { fn: "generate-ir-playbook", phase: "pre_generation" });
      if (!procWrite.ok) {
        return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: procWrite.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!Array.isArray(body.jurisdictions) || body.jurisdictions.length === 0) {
        return new Response(JSON.stringify({ error: "At least one jurisdiction required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: inserted, error: insErr } = await supabase
        .from("ir_playbooks")
        .insert({
          user_id: resolvedUserId,
          client_id: body.client_id ?? null,
          organization_name: body.organizationName || null,
          intake_data: body,
          status: "processing",
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        console.error("[generate-ir-playbook] insert failed:", insErr);
        return new Response(JSON.stringify({ error: "Failed to create playbook row" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rowId = inserted.id;
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      await lifecycleUpdate(supabase, "ir_playbooks", rowId, {
        status: "failed",
        updated_at: new Date().toISOString(),
      }, { fn: "generate-ir-playbook", phase: "terminal_error_no_key" });
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fnRun = await startFunctionRun(supabase, "generate-ir-playbook", {
      archetype: "background",
      trustClass: "user",
      userId: resolvedUserId,
      invokedBy: caller.internal ? "internal" : "user",
      metadata: { rowId },
    });
    // Dispatch heavy work in background — return 202 immediately so the caller is not
    // held open past the platform's ~150s HTTP idle ceiling. The result page polls
    // ir_playbooks.status. On unhandled error we mark the row failed so callers don't
    // poll forever.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
    EdgeRuntime.waitUntil((async () => {
      console.log(`[generate-ir-playbook] start v=${IR_VERSION} session=${rowId}`);
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
              tool: "ir-playbook",
              jurisdictions: body.jurisdictions,
              data_categories: mapDataTypesToCategories(body.dataTypes || []),
              breach: true,
              limit: 10,
            }),
          });
          if (er.ok) {
            const j = await er.json();
            enforcement_context = j.results || j.enforcement_context || [];
            enforcementMeta = {
              attempted: true,
              total_matched: typeof j?.total_matched === "number" ? j.total_matched : null,
              query_descriptor: `breach response in ${(Array.isArray(body.jurisdictions) ? body.jurisdictions : []).join(", ") || "—"}`,
            };
          }
        } catch (e) {
          console.error("[generate-ir-playbook] enforcement fetch failed:", e);
        }

        // Step 2 — relevant DPA portals
        const relevantPortals = body.jurisdictions
          .filter((j) => DPA_PORTALS[j])
          .map((j) => `${j}: ${DPA_PORTALS[j]}`)
          .join("\n");

        // GDPR breach-notification authority supply (verbatim Art. 33/34 from gdpr_articles).
        // Only when EU or UK jurisdictions are selected; US-state-only incidents skip this.
        let gdprBreachBlock = "";
        let edpbGuidelineBlock = "";
        let irSuppliedCitations: string[] = [];
        try {
          const jList: string[] = (Array.isArray(body.jurisdictions) ? body.jurisdictions : []).map((j: any) => String(j).toLowerCase());
          const hasEu = jList.some((j) => j.includes("eu") || j.includes("gdpr")) && !jList.every((j) => j.includes("uk"));
          const hasUk = jList.some((j) => j.includes("uk") || j.includes("united kingdom"));
          if (hasEu || hasUk) {
            const irJurisdiction: "eu" | "uk" = hasUk && !hasEu ? "uk" : "eu";
            const ctx = await getGdprContext(supabase as any, {
              // Beyond the Art. 33/34 breach block, IR routinely cites Art. 4
              // (definitions — "personal data breach"), Art. 9 (special
              // categories, drives high-risk analysis), Art. 28 (processor
              // duties incl. 33(2) notification chain), and Art. 32 (security
              // of processing). Inject verbatim so the lint supply reflects
              // what the model actually receives. Arts 37/38/55/56/60 remain
              // deferred pending a clean L2 window.
              articles: ["33", "34", "4", "9", "28", "32"],
              jurisdiction: irJurisdiction,
              maxChars: 12000,
            });
            if (ctx?.block) {
              gdprBreachBlock =
                "\n\nGDPR BREACH-NOTIFICATION AUTHORITY -- SUPPLIED VERBATIM TEXT (cite Article 33/34 content ONLY from this block, never from recollection; applies to all three parts):\n" +
                ctx.block;
              if ((ctx.meta?.missing_articles ?? []).length > 0) {
                console.warn("[generate-ir-playbook] GDPR base articles missing:", ctx.meta.missing_articles.join(", "));
              }
              const matched: string[] = ctx.meta?.matched_articles ?? [];
              for (const n of matched) {
                irSuppliedCitations.push(`Article ${n} GDPR`);
                if (irJurisdiction === "uk") irSuppliedCitations.push(`Article ${n} UK GDPR`);
              }
            }

            // EDPB Guidelines 9/2022 supply (L6 IR-correction dependency).
            // Direct pull from edpb_guidelines: guideline_ref = "EDPB Guidelines 9/2022"
            // AND related_articles overlaps {33,34}. Deterministic order (created_at, id),
            // capped ~9,000 chars. Non-fatal; if the corpus is empty for any reason the
            // IR prompt still ships with just the Arts 33/34 verbatim block above.
            try {
              const { data: gdRows, error: gdErr } = await (supabase as any)
                .from("edpb_guidelines")
                .select("section_heading, excerpt_text, doc_version, adopted_date")
                .eq("guideline_ref", "EDPB Guidelines 9/2022")
                .eq("status", "final")
                .overlaps("related_articles", ["33", "34"])
                .order("created_at", { ascending: true })
                .order("id", { ascending: true })
                .limit(60);
              if (gdErr) {
                console.warn("[generate-ir-playbook] edpb 9/2022 fetch failed:", gdErr.message);
              } else if (Array.isArray(gdRows) && gdRows.length > 0) {
                const MAX_CHARS = 9000;
                let used = 0;
                const parts: string[] = [];
                for (const r of gdRows as Array<{ section_heading: string | null; excerpt_text: string | null }>) {
                  const body = (r.excerpt_text ?? "").trim();
                  if (!body) continue;
                  const heading = (r.section_heading ?? "").trim();
                  const chunk = heading ? `[${heading}]\n${body}` : body;
                  if (used + chunk.length + 2 > MAX_CHARS) break;
                  parts.push(chunk);
                  used += chunk.length + 2;
                }
                if (parts.length > 0) {
                  edpbGuidelineBlock =
                    "\n\nEDPB GUIDELINES 9/2022 -- SUPPLIED AUTHORITY EXCERPTS " +
                    "(EDPB Guidelines 9/2022 on personal data breach notification under the GDPR, Version 2.0, adopted 28 March 2023). " +
                    "When stating what EDPB guidance requires on Articles 33/34 (awareness, 72-hour clock, processor notification duty, risk assessment, delayed/phased notification, cross-border cases, communication to data subjects), cite ONLY from this block and never from recollection. " +
                    "Never cite \"EDPB Guidelines 01/2021\" for breach notification — the correct reference is EDPB Guidelines 9/2022:\n\n" +
                    parts.join("\n\n");
                  irSuppliedCitations.push("EDPB Guidelines 9/2022");
                }
              }
            } catch (e) {
              console.warn("[generate-ir-playbook] edpb 9/2022 supply threw (non-fatal):", e);
            }
          }
        } catch (e) {
          console.warn("[generate-ir-playbook] gdpr-context failed (non-fatal):", e);
        }

        // California breach-notification authority supply (verbatim Cal. Civ.
        // Code § 1798.82 from cppa_authorities). Same conditionality style as
        // the IoT sector block in Cyber: fire only when this incident covers
        // California/US-CA. Injection-first: only push to irSuppliedCitations
        // in runs where the verbatim text was actually included in the prompt.
        let caBreachBlock = "";
        try {
          const jListCa: string[] = (Array.isArray(body.jurisdictions) ? body.jurisdictions : []).map((j: any) => String(j).toLowerCase());
          const hasCa = jListCa.some((j) =>
            j === "california" || j === "us-ca" || j === "ca" ||
            j.includes("california") || j.endsWith("-ca") || j === "us:ca"
          );
          if (hasCa) {
            const { data: caRows, error: caErr } = await (supabase as any)
              .from("cppa_authorities")
              .select("citation, full_text")
              .eq("citation", "Cal. Civ. Code § 1798.82")
              .limit(1);
            if (caErr) {
              console.warn("[generate-ir-playbook] 1798.82 fetch failed:", caErr.message);
            } else if (Array.isArray(caRows) && caRows.length > 0 && (caRows[0] as any).full_text) {
              const row = caRows[0] as { citation: string; full_text: string };
              caBreachBlock =
                "\n\nCALIFORNIA BREACH-NOTIFICATION AUTHORITY -- SUPPLIED VERBATIM TEXT (cite Cal. Civ. Code § 1798.82 content ONLY from the text below, never from recollection):\n" +
                `[${row.citation}]\n${row.full_text}`;
              irSuppliedCitations.push("Cal. Civ. Code § 1798.82");
            } else {
              console.warn("[generate-ir-playbook] California incident but 1798.82 row unavailable");
            }
          }
        } catch (e) {
          console.warn("[generate-ir-playbook] ca-breach supply threw (non-fatal):", e);
        }




        // IR-HF1 T1 — DELIMITER REFACTOR (v3.7): the previous scheme concatenated
        // meta-instructions ("Output ONLY Sections 1–3", "Do NOT output Sections 4–7"),
        // per-part rules, and the INTAKE_BLOCK into a single user turn. That single-
        // channel shape let ban-list phrases from the instruction text bleed into
        // generated prose (REBUILD-IR D2 residual). The refactor moves ALL meta-
        // instructions and per-part rules into a dedicated system-role block (Anthropic
        // system[] array); the user turn now carries ONLY the sentinel-wrapped intake
        // block plus a minimal production directive ("Produce PART X now."). Sentinel
        // markers <<<INTAKE_BEGIN>>>/<<<INTAKE_END>>> are stripped at assembly so any
        // residual echo is deterministically cleaned. INSTRUCTION_LEAK_RE + single-round
        // per-part regen (Task 3 in the REBUILD-IR pass) remain unchanged as a backstop.
        const INTAKE_BLOCK = `INCIDENT DETAILS
Organisation (controller) being assessed: ${body.organizationName || "not specified"}
Discovery: ${body.discoveryDateTime}
Cause: ${body.cause}
Data types: ${body.dataTypes.join(", ")}
Affected individuals: approximately ${body.affectedCount}
Jurisdictions: ${body.jurisdictions.join(", ")}
Processor involved: ${body.processorInvolved ? "Yes — " + (body.processorName || "(name not provided)") : "No"}
Contained: ${body.contained}
Organisation type: ${body.organisationType}

${renderIrTestStatesBlock(body)}



DPA NOTIFICATION PORTALS FOR RELEVANT JURISDICTIONS
${relevantPortals || "(For notification submission, consult each relevant regulator's official website for the current portal or contact channel.)"}

ENFORCEMENT CONTEXT — BREACH NOTIFICATION FAILURES
The following cases show where organisations were penalised for breach notification failures. Use this to calibrate your timeline and content recommendations.
CITATION RULE: When you reference any of these in section text, use the human-readable CITATION shown (e.g. "ICO (2023)" or "CNIL (2022)") — NEVER the bracketed [E#] code. The [E#] tag is only for your internal lookup. Reserve the exact id values for the ===ANNOTATIONS=== JSON block at the very end of the playbook.
${formatEnforcementContext(enforcement_context)}

CROSS-JURISDICTIONAL CITATION NOTE: Where an enforcement precedent in the ENFORCEMENT CONTEXT above was issued by a regulator from a different legal system than the jurisdiction being addressed in a section (for example, an AEPD/Spanish DPA decision cited in a Quebec or PIPEDA section), you MUST note explicitly in the text: "This case is from a different legal system and is cited as cross-jurisdictional precedent illustrating regulatory expectations, not as direct authority." Do not present such cases as directly binding. This rule applies in EVERY section of the playbook including documentation checklists, root-cause-analysis sections, and post-incident sections — not only the first mention. NEVER describe a decision of one national DPA as directly applicable, directly binding, or EU-law precedent in another member state; decisions of national supervisory authorities bind only within their own jurisdiction and are persuasive elsewhere. Only EDPB Article 65 binding decisions and CJEU judgments may be described as binding across member states.

GRADER-CAL-1 D2 — NEW YORK DUAL-REGIME BREACH-NOTIFICATION ANCHORS (BINDING):
For New York breaches, cite BOTH statutory anchors as the correct dual-regime pair: N.Y. Gen. Bus. Law § 899-aa (SHIELD-Act general breach-notification duty, as expanded by S2659B / Chapter 647 of the Laws of 2024, signed 2024-12-21, adding medical information and health-insurance information to "private information" and requiring notice to the Department of Financial Services alongside the AG / DOS / State Police) AND A8872A (signed December 2024) which set a 30-day outside notice window from discovery. NEVER describe pre-2024 SHIELD-Act figures ("without unreasonable delay" alone) as the current standard — the 30-day outside window controls, and DFS is now part of the notice chain.

PRODUCT-FIX-5 T6 — NEW YORK BREACH-REGIME CITATION DISCIPLINE (BINDING):
(a) REGIME SEPARATION — three DISTINCT New York authorities, NEVER interchangeable:
  • N.Y. Gen. Bus. Law § 899-aa — the GENERAL breach-notification statute (notification to affected NY residents and to the AG/DOS/State Police, and — post-S2659B — to DFS as one of the four listed agencies whenever any NY resident is notified). § 899-aa applies to any person or business holding NY residents' "private information".
  • N.Y. Gen. Bus. Law § 899-bb (SHIELD Act reasonable-safeguards duty) — cited ONLY for the safeguards/administrative-technical-physical program duty. NEVER cite § 899-bb as the source of a notification timeline or a regulator-notification channel.
  • 23 NYCRR 500.17 — the DFS Part 500 cybersecurity-event notification (72 hours to the Superintendent of Financial Services from determination). Applies ONLY to DFS-licensed "covered entities" as that term is defined in 23 NYCRR 500.1. NEVER anchor a DFS notification duty to § 899-aa (the § 899-aa(8)(a) DFS entry names DFS as an agency-notice recipient; it is NOT the source of the 72-hour DFS clock). NEVER cite § 500.17 as a binding duty unless the intake establishes DFS licensure.
(b) COVERED-ENTITY DISAMBIGUATION: "covered entity" under 23 NYCRR 500.1 (DFS licensure — banks, insurers, and other DFS-regulated financial-services entities) and "covered entity" under HIPAA (45 CFR 160.103 — health plans, health-care clearinghouses, and health-care providers that transmit health information electronically in connection with a covered transaction) are UNRELATED statuses. The playbook must NEVER treat one as evidence of the other, and NEVER conflate the two definitions in the same sentence, parenthetical, or bullet. Where the intake does not establish the relevant status, state the duty conditionally — e.g. "If [organisation] is a covered entity within the meaning of 23 NYCRR 500.1 (DFS licensure — a determination the record does not resolve), then the 72-hour § 500.17 notification to the Superintendent applies" — name the specific artifact or fact the business must confirm (e.g. a DFS licence, a HIPAA covered-entity determination), and route that confirmation to information_needed with an owner role (per PRODUCT-FIX-5 T3 ALLOWED-ROLES DISCIPLINE — the intake-established role or "the organisation's [function] lead (role to be designated)") and a concrete timeframe (per the shared S1 actionability directive).
(c) GENERIC CONDITIONAL-STATUS PATTERN: extend the same discipline to every state-regulator notification duty that turns on a licensure, registration, or regulated-status determination the intake does not establish (e.g. state insurance-department cyber-event notifications, state banking-department notifications, HHS OCR obligations that presuppose HIPAA covered-entity or business-associate status). Such duties are stated CONDITIONALLY, NEVER anchored to the general state breach-notification statute, and the confirmation task is routed to information_needed with owner and timeframe — never asserted as a live duty and never presented as flowing from the general breach statute.


GRADER-CAL-1 D3 — TEMPORAL-APPLICATION DISCIPLINE (BINDING):
For every statutory anchor cited, respect the effective date. A law's amended text applies ONLY to breaches with a discoveryDateTime on or after the effective date. If the record's discoveryDateTime PREDATES an amendment's effective date, cite the version-of-law in force on the discovery date; do not project post-amendment obligations backwards. When both regimes are analytically relevant, split the analysis explicitly: "Under the version of § 899-aa in force on the discovery date … / Under the version currently in force (as amended by S2659B/A8872A) …". This applies to Cal. Civ. Code § 1798.82 (SB 446 effective 2026-01-01), N.Y. Gen. Bus. Law § 899-aa (S2659B / A8872A), and every other amended anchor.${gdprBreachBlock}${edpbGuidelineBlock}${caBreachBlock}`;

        // IR-HF1 T1 (v3.7): PROMPT_PART_A/B/C are now pure INSTRUCTION blocks.
        // The intake reference "${INTAKE_BLOCK}" that previously lived inside each
        // constant was removed — the intake is delivered to the model separately
        // via a sentinel-wrapped USER message (see generatePart below), so that
        // the meta-instruction text and the incident-fact content ride distinct
        // channels of the request. The model receives INSTRUCTIONS as a system
        // block and INTAKE as user content.
        const PROMPT_PART_A = `You are a senior data protection incident response specialist. Generate PART A (Sections 1–3) of a complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident. Use the incident facts supplied in the accompanying user turn (delimited by <<<INTAKE_BEGIN>>> / <<<INTAKE_END>>> sentinels); do NOT echo those sentinels or any of the meta-instructions in this system block in your output.


Generate ONLY the following three sections now. Each section MUST begin with a markdown H2 heading using the EXACT format shown (the line "## Section N: TITLE"), so downstream tooling can locate them. Do not omit any section, even if you think it is not applicable — instead, state explicitly within the section why it does not apply. Do NOT output Sections 4, 5, 6, 7, or the ===ANNOTATIONS=== block in this response — those will be generated in parallel calls. CROSS-PART CONSISTENCY: the deadlines, threshold tests, regulator names, portal URLs, statutory caution rules, and case citations you use here must match exactly those used in Parts B and C, since all three parts are generated from the same incident facts and system instructions.

## Section 1: IMMEDIATE ACTIONS (0–2 HOURS)
Numbered, specific steps. Name the role responsible for each. Be direct.

## Section 2: BREACH ASSESSMENT CHECKLIST
For each jurisdiction listed, state: (a) the notification threshold test, (b) whether this incident likely meets it based on the data types and count provided, (c) your confidence level (High / Medium / Low) and a one-sentence reason.

## Section 3: REGULATORY NOTIFICATION TIMELINE
For each jurisdiction: the deadline (computed from the Article 33 awareness timestamp or
statutory discovery date as appropriate), the notification portal URL (use the portals
provided above), the minimum content required for initial notification, what can be filed
as preliminary versus what must follow, and — based on the enforcement context — specific
omissions that have been penalised. If a processor is involved, include a dedicated step
titled "Processor notification" describing how and when the processor must be notified.

THRESHOLD GATE — MANDATORY: Before stating notification deadlines for any jurisdiction,
reference your Section 2 confidence assessment for that jurisdiction:
— If Section 2 assessed notification as HIGH CONFIDENCE: state the deadline and treat
  it as actionable. Add "Threshold: CONFIRMED — proceed."
— If Section 2 assessed notification as MEDIUM CONFIDENCE: state the deadline but
  prominently mark it: "⚠ PROVISIONAL — notification trigger requires confirmation.
  Begin preparation and clock management but do not file until threshold confirmed."
— If Section 2 assessed notification as LOW CONFIDENCE or "notification not required":
  do not compute a deadline. Instead state: "Notification trigger not met on current
  facts — monitor for new information and reassess. Do not begin the notification clock."

RESIDENT COUNT GATE — MANDATORY FOR STATE THRESHOLDS: For any state threshold that
depends on a per-state resident count (California 500+ for AG copy, Texas 250+ for AG
notice, Virginia 1,000+ for CRA notice): do NOT use the total affected count as the
operative figure. State explicitly: "This threshold applies only to confirmed [State]
residents. Conduct a geographic segmentation of the affected population before assessing
this threshold. [TO BE COMPLETED: confirmed [State] resident count]."

ARTICLE 33 CLOCK START: For all EU GDPR and UK GDPR jurisdictions, the 72-hour deadline
runs from the CONTROLLER AWARENESS TIMESTAMP — the moment the controller achieved
reasonable certainty that a personal data breach occurred — not merely from the initial
detection timestamp. Where these differ, state both and anchor the deadline to awareness.

Output ONLY Sections 1–3. No preamble, no commentary, no Sections 4–7, no annotations. Do not end your output with a horizontal rule or divider line.`;

        const PROMPT_PART_B = `You are a senior data protection incident response specialist. Generate PART B (Sections 4–5) of the same complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident. Use the incident facts supplied in the accompanying user turn (delimited by <<<INTAKE_BEGIN>>> / <<<INTAKE_END>>> sentinels); do NOT echo those sentinels or any of the meta-instructions in this system block in your output.


Generate ONLY the following two sections now. Each section MUST begin with a markdown H2 heading using the EXACT format shown. Do NOT output Sections 1, 2, 3, 6, 7, or the ===ANNOTATIONS=== block in this response — those are generated in parallel calls. CROSS-PART CONSISTENCY: the deadlines, threshold tests, regulator names, portal URLs, statutory caution rules, and case citations you use here must match exactly those used in Parts A and C, since all three parts are generated from the same incident facts and system instructions. Do not refer to "the previous section" or "as above" because this part is generated independently and later merged.

## Section 4: INDIVIDUAL NOTIFICATION DECISION TREE
Step-by-step logic for determining whether individuals must be notified, with jurisdiction-specific thresholds. If required: content elements, delivery method, and deadline. Include the verbatim phrase "individual notification" in the section body.

## Section 5: NOTIFICATION TEMPLATES
(a) A DPA initial notification letter template for the primary jurisdiction.
(b) An individual notification template if individual notification is required.
Mark all placeholder fields [IN SQUARE BRACKETS]. The word "template" MUST appear in this section heading or body at least twice.

Output ONLY Sections 4–5. No preamble, no commentary, do NOT output Sections 1–3 or 6–7, no annotations. Do not end your output with a horizontal rule or divider line.`;

        const PROMPT_PART_C = `You are a senior data protection incident response specialist. Generate PART C (Sections 6–7 plus the ===ANNOTATIONS=== block) of the same complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident. Use the incident facts supplied in the accompanying user turn (delimited by <<<INTAKE_BEGIN>>> / <<<INTAKE_END>>> sentinels); do NOT echo those sentinels or any of the meta-instructions in this system block in your output.


Generate ONLY the following two sections plus annotations now. Each section MUST begin with a markdown H2 heading using the EXACT format shown. Do NOT output Sections 1, 2, 3, 4, or 5 in this response — those are generated in parallel calls. CROSS-PART CONSISTENCY: the deadlines, threshold tests, regulator names, portal URLs, statutory caution rules, and case citations you use here must match exactly those used in Parts A and B, since all three parts are generated from the same incident facts and system instructions. Do not refer to "the previous section" or "as above" because this part is generated independently and later merged.

## Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST
A documentation checklist of records to create and maintain under GDPR Article 33(5) and equivalent requirements. Format as a list of documents with the information each must contain. This is the organisation's accountability trail. The verbatim phrase "documentation checklist" MUST appear in this section.

## Section 7: POST-INCIDENT ACTIONS
Remediation steps, root cause analysis requirements, and follow-up obligations.

ANNOTATIONS: After Section 7, add a line:
===ANNOTATIONS===
followed by a JSON array of enforcement citations that directly supported a timeline deadline, threshold test, or notification requirement anywhere in the intended full 7-section playbook. Use the exact id values from the enforcement context (the value after 'id:'). Only cite cases from the ENFORCEMENT CONTEXT — never from training knowledge. Each annotation object has this shape:
{
  "enforcement_action_id": "exact id string",
  "regulator": "regulator name",
  "jurisdiction": "jurisdiction",
  "decision_date": "YYYY-MM-DD or null",
  "summary": "one sentence what the case involved, max 25 words, plain English",
  "outcome": "rejected | accepted | penalised | required",
  "relevance": "one sentence why this case is relevant to this playbook"
}
If no cases informed the playbook, output an empty array [].
The ===ANNOTATIONS=== block must contain ONLY well-formed JSON with real values — never [TO BE COMPLETED] or any bracketed placeholder.

Output ONLY Sections 6–7 followed by the ===ANNOTATIONS=== block. No preamble, no commentary, do NOT output Sections 1–5. Do not end your output with a horizontal rule or divider line.`;

        // LEGAL CONSTANTS — verified 2026-06-12 against statute text.
        // R6 (2026-06-12): NY corrected to 30-day hard deadline (S2659B, eff. 21 Dec 2024) +
        // regulator-notice trigger fixed (any NY resident, not 500+) + DFS/Part 500 72h note;
        // OR corrected to 45 days (ORS 646A.604(3)(a)); TX corrected to individuals ≤60d /
        // AG ≤30d (SB 768, eff. 1 Sep 2023). Any edit requires re-verification; see lint
        // class past_deadline.
        const today = new Date().toISOString().slice(0, 10);
        // FORK-R1: inject AI Act phased dates, adequacy fact, and ICO penalty
        // figures from the shared registry (replaces inline IR rulebook items
        // 6/7/8). Guards survive verbatim inside the renderers.
        const registryInjections = [
          renderAiActCitationBlock(),
          renderTransferAdequacyNote(),
          renderIcoPenaltyFigures(),
        ].join("\n\n");
        const irSystem: SystemBlock[] = buildSystemContent({
          toolModule: IR_TOOL_MODULE,
          currentDate: today,
          injected: registryInjections + "\n\n" + ADVISORY_VOICE_RULES,
          cache: true,
        });

        async function callClaude(messages: any[], maxTokens: number, timeoutMs: number = 720_000, extraSystem?: SystemBlock[]): Promise<{ text: string; stopReason: string | null }> {
          const systemPayload = extraSystem && extraSystem.length ? [...irSystem, ...extraSystem] : irSystem;
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: maxTokens,
              stream: true,
              system: systemPayload,
              messages,
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error("Claude error:", errText);
            throw new Error("AI generation failed");
          }
          let out = "";
          let stopReason: string | null = null;
          const reader = res.body!.getReader();
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
                  out += evt.delta.text ?? "";
                } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
                  stopReason = evt.delta.stop_reason;
                }
              } catch { /* keepalive */ }
            }
          }
          return { text: out, stopReason };
        }

        // Structural validation only. Truncation is detected via stopReason === "max_tokens"
        // from the API, not via punctuation heuristics on the output text.
        const PART_A_HEADINGS = ["## Section 1:", "## Section 2:", "## Section 3:"];
        const PART_B_HEADINGS = ["## Section 4:", "## Section 5:"];
        const PART_C_HEADINGS = ["## Section 6:", "## Section 7:"];

        function validatePart(text: string, which: "A" | "B" | "C"): { ok: boolean; reason?: string } {
          if (!text || !text.trim()) return { ok: false, reason: "empty" };
          const headings = which === "A" ? PART_A_HEADINGS : which === "B" ? PART_B_HEADINGS : PART_C_HEADINGS;
          for (const h of headings) {
            if (!text.includes(h)) return { ok: false, reason: `missing heading ${h}` };
          }
          if (which === "C" && !text.includes("===ANNOTATIONS===")) {
            return { ok: false, reason: "missing ===ANNOTATIONS=== block" };
          }
          return { ok: true };
        }

        const _suppWs6 = renderSupplementalBlock({ responses: (body as any)?.supplemental_responses, context: (body as any)?.supplemental_context });
        function buildPartUser(which: "A" | "B" | "C", extra: string): string {
          const directive = which === "A"
            ? "Produce PART A (Sections 1–3) now."
            : which === "B"
              ? "Produce PART B (Sections 4–5) now."
              : "Produce PART C (Sections 6–7 followed by the ===ANNOTATIONS=== JSON block) now.";
          const extraTail = extra ? `\n\n${extra}` : "";
          return `<<<INTAKE_BEGIN>>>\n${INTAKE_BLOCK}\n<<<INTAKE_END>>>${extraTail}${_suppWs6}\n\n${directive}`;
        }
        function partInstructionsFor(which: "A" | "B" | "C"): SystemBlock[] {
          const base = which === "A" ? PROMPT_PART_A : which === "B" ? PROMPT_PART_B : PROMPT_PART_C;
          return [{ type: "text", text: base }];
        }
        async function generatePart(which: "A" | "B" | "C", extra: string, maxTokens: number, timeoutMs: number = 720_000): Promise<{ text: string; stopReason: string | null }> {
          const userPrompt = buildPartUser(which, extra);
          return await callClaude(
            [{ role: "user", content: userPrompt }],
            maxTokens,
            timeoutMs,
            partInstructionsFor(which),
          );
        }

        // Tail-continuation retry: replay the model's truncated output as an assistant
        // turn and ask for a continuation in a final user turn (claude-sonnet-4-6 does
        // not support assistant prefill — conversation must end with user message).
        async function continuePart(which: "A" | "B" | "C", extra: string, truncated: string, maxTokens: number, timeoutMs: number): Promise<{ text: string; stopReason: string | null }> {
          const tail = which === "C"
            ? "Finish any in-progress section, then produce any remaining required sections you have not yet completed, then output the ===ANNOTATIONS=== block followed by the JSON array, then stop."
            : "Finish any in-progress section, then produce any remaining required sections for this part you have not yet completed, then stop.";
          const userPrompt = buildPartUser(which, extra);
          const truncatedClean = truncated.replace(/\s+$/, "");
          const continueInstruction = `Your previous attempt was cut off mid-output. ${tail} Output ONLY the continuation — do not repeat any text that already appears in your previous message, starting mid-sentence if necessary.`;
          const { text: continuation, stopReason } = await callClaude(
            [
              { role: "user", content: userPrompt },
              { role: "assistant", content: truncatedClean },
              { role: "user", content: continueInstruction },
            ],
            maxTokens,
            timeoutMs,
            partInstructionsFor(which),
          );
          // Overlap guard: strip the longest overlap between tail of truncated (up to
          // 300 chars) and head of continuation, then join.
          const tailWindow = truncatedClean.slice(-300);
          let overlap = 0;
          const maxCheck = Math.min(tailWindow.length, continuation.length);
          for (let k = maxCheck; k > 0; k--) {
            if (continuation.startsWith(tailWindow.slice(-k))) { overlap = k; break; }
          }
          const trimmedContinuation = continuation.slice(overlap).replace(/^\s+/, "");
          if (!trimmedContinuation) {
            throw new Error("continuation empty after overlap trim");
          }
          const joined = truncatedClean + (truncatedClean.endsWith("\n") ? "" : "\n") + trimmedContinuation;
          return { text: joined, stopReason };
        }

        // QB8-1(f)(2): raise part maxTokens by 25% to reduce truncation pressure.
        const IR_PART_MAX_TOKENS = Math.ceil(PRODUCT_MAX_OUTPUT_TOKENS * 1.25);

        async function generateHalves(extra: string): Promise<{ partA: string; partB: string; partC: string; incomplete?: string }> {
          const [a, b, c] = await Promise.all([
            generatePart("A", extra, IR_PART_MAX_TOKENS, 720_000),
            generatePart("B", extra, IR_PART_MAX_TOKENS, 720_000),
            generatePart("C", extra, IR_PART_MAX_TOKENS, 720_000),
          ]);
          const initial: Array<{ which: "A" | "B" | "C"; text: string; stopReason: string | null }> = [
            { which: "A", text: a.text, stopReason: a.stopReason },
            { which: "B", text: b.text, stopReason: b.stopReason },
            { which: "C", text: c.text, stopReason: c.stopReason },
          ];
          let partA = a.text, partB = b.text, partC = c.text;

          // Phase 1 — identify parts that need continuation: stopReason==="max_tokens"
          // OR structural validation failure.
          const failures = initial
            .map((p) => {
              const v = validatePart(p.text, p.which);
              const truncated = p.stopReason === "max_tokens";
              if (v.ok && !truncated) return null;
              const reason = truncated
                ? (v.ok ? "stop_reason=max_tokens" : `stop_reason=max_tokens; ${v.reason}`)
                : (v.reason ?? "structural failure");
              console.warn(`[IR Playbook] Part ${p.which} needs continuation (${reason}); tail-continuing at 4000`);
              return { which: p.which, text: p.text };
            })
            .filter((x): x is { which: "A" | "B" | "C"; text: string } => x !== null);

          if (failures.length > 0) {
            // Phase 2 — run all needed continuations concurrently.
            const continuedResults = await Promise.all(
              failures.map((f) => continuePart(f.which, extra, f.text, IR_PART_MAX_TOKENS, 600_000)),
            );

            for (let i = 0; i < failures.length; i++) {
              const f = failures[i];
              const { text: continued } = continuedResults[i];
              if (f.which === "A") partA = continued;
              else if (f.which === "B") partB = continued;
              else partC = continued;
            }
          }

          // QB8-1(f)(2) Phase 3 — terminal-punctuation guard. If any part ends without
          // terminal punctuation, run one additional continuation round for that part.
          // Accept common markdown enders too (bold **, italic *, code `, table |, blockquote >).
          const TERMINAL = /([.?!)\]}»"'`*|>]|\*\*|```)\s*$/;
          const terminalFailures: Array<{ which: "A" | "B" | "C"; text: string }> = [];
          for (const [which, txt] of [["A", partA], ["B", partB], ["C", partC]] as const) {
            if (!TERMINAL.test(txt.trim())) {
              console.warn(`[IR Playbook] Part ${which} ends without terminal punctuation; running additional continuation.`);
              terminalFailures.push({ which, text: txt });
            }
          }
          if (terminalFailures.length > 0) {
            const extraContinuations = await Promise.all(
              terminalFailures.map((f) => continuePart(f.which, extra, f.text, IR_PART_MAX_TOKENS, 600_000)),
            );
            for (let i = 0; i < terminalFailures.length; i++) {
              const f = terminalFailures[i];
              const { text: continued } = extraContinuations[i];
              if (f.which === "A") partA = continued;
              else if (f.which === "B") partB = continued;
              else partC = continued;
            }
          }

          // REBUILD-IR Task 3 — deterministic instruction-leak detector.
          // Regenerates ONLY the affected part (single retry per part).
          const INSTRUCTION_LEAK_RE = /\b(do not frame(?: this)?|do NOT output|output ONLY|as instructed|per the rulebook|per these instructions|the system prompt|meta-instruction|internal machinery|IN THIS RESPONSE ONLY|the rules? above|as (?:noted|stated) in the (?:instructions|rules)|per your instructions|Sections?\s*[0-9–\-,\s]+of a complete)\b/i;
          const leakFailures: Array<{ which: "A" | "B" | "C"; text: string; match: string }> = [];
          for (const [which, txt] of [["A", partA], ["B", partB], ["C", partC]] as const) {
            const m = INSTRUCTION_LEAK_RE.exec(txt);
            if (m) {
              console.warn(`[IR Playbook] REBUILD-IR T3 instruction leak in part ${which}: "${m[0]}"`);
              leakFailures.push({ which, text: txt, match: m[0] });
            }
          }
          if (leakFailures.length > 0) {
            const suffix = `\n\nPREVIOUS ATTEMPT LEAKED META-INSTRUCTIONS. The following phrases from the internal machinery MUST NOT appear anywhere in the user-facing prose: "${leakFailures.map((f) => f.match).join('", "')}". Re-emit this part stating only substantive conclusions; never quote or paraphrase system instructions, rulebook rules, or the meta-scaffolding that produced this playbook.`;
            const regen = await Promise.all(
              leakFailures.map((f) => generatePart(f.which, extra + suffix, IR_PART_MAX_TOKENS, 600_000)),
            );
            for (let i = 0; i < leakFailures.length; i++) {
              const f = leakFailures[i];
              const t = regen[i].text;
              const v = validatePart(t, f.which);
              if (!v.ok) {
                console.warn(`[IR Playbook] T3 regen part ${f.which} failed structural validation (${v.reason}); keeping original.`);
                continue;
              }
              if (f.which === "A") partA = t;
              else if (f.which === "B") partB = t;
              else partC = t;
            }
          }



          // Final validation across all parts. Structural validity (all required headings
          // present, Part C annotations block present) is the hard requirement — a missing
          // terminal punctuation after a structurally complete part is a soft warning only.
          const stillFailing: string[] = [];
          for (const [which, txt] of [["A", partA], ["B", partB], ["C", partC]] as const) {
            const v2 = validatePart(txt, which);
            if (!v2.ok) stillFailing.push(`part${which}: ${v2.reason}`);
            else if (!TERMINAL.test(txt.trim())) {
              console.warn(`[IR Playbook] part${which}: structurally complete but no terminal punctuation after continuation — accepting.`);
            }
          }

          if (stillFailing.length > 0) {
            return { partA, partB, partC, incomplete: stillFailing.join("; ") };
          }
          return { partA, partB, partC };
        }


        function assembleFromHalves(partA: string, partB: string, partC: string): { playbook_text: string; parsedAnnotations: any[] } {
          // IR-HF1 T1: defensive strip of intake-envelope sentinels in case the
          // model echoed the delimiter. Belt-and-braces to the system-channel move.
          const stripSentinels = (s: string) => s.replace(/<<<INTAKE_BEGIN>>>|<<<INTAKE_END>>>/g, "");
          const fullText = `${stripSentinels(partA).trim()}\n\n${stripSentinels(partB).trim()}\n\n${stripSentinels(partC).trim()}`;
          let playbook_text = fullText
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
              playbook_text = fullText.slice(0, sepIdx).trim()
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
            console.warn("[IR Playbook] annotation parse failed (non-fatal):", e);
            parsedAnnotations = [];
          }
          return { playbook_text, parsedAnnotations };
        }

        // QB8-1(f)(1): strip any Section 2/3 deferral notes that leaked into Section 4.
        function stripSection4DeferralNotes(text: string): string {
          const idx = text.search(/^#+\s*SECTION 4/mi);
          if (idx < 0) return text;
          const head = text.slice(0, idx);
          const tail = text.slice(idx).replace(/\s*Note: this preliminary assessment[^.]*\.(?:[^.\n]*operative\.)?/g, "");
          return head + tail;
        }

        // QB10-3(b): lint (log-only) — a named "Regulator (YYYY)" citation should carry an
        // adjacent decision date or official-source reference within the same passage.
        function lintBareCitations(text: string): void {
          try {
            const re = /\b[A-ZÀ-Þ][\w .'’-]{2,80}\((?:19|20)\d{2}\)/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(text)) !== null) {
              const windowText = text.slice(m.index, m.index + 400);
              if (!/decided \d{4}-\d{2}-\d{2}|official source:/i.test(windowText)) {
                console.warn(`[IR] QB10-3(b) bare citation without adjacent identifiers: "${m[0]}" @${m.index}`);
              }
            }
          } catch (e) {
            console.error("[IR] QB10-3(b) lint errored:", e);
          }
        }


        let partA = "";
        let partB = "";
        let partC = "";
        let incompleteReason: string | null = null;
        try {
          console.log("[generate-ir-playbook] starting parallel generation (3 parts)");
          const r = await generateHalves("");
          partA = r.partA; partB = r.partB; partC = r.partC;
          if (r.incomplete) incompleteReason = r.incomplete;
          console.log("[generate-ir-playbook] generation complete", { partAChars: partA.length, partBChars: partB.length, partCChars: partC.length, incomplete: incompleteReason });
        } catch (e: any) {
          console.error("[generate-ir-playbook] Claude parallel split-call failure:", e?.message || e);
          throw e;
        }

        // CF-2: never merge/persist a truncated playbook.
        if (incompleteReason) {
          console.error(`[generate-ir-playbook] incomplete_generation after retry: ${incompleteReason}`);
          await lifecycleUpdate(supabase, "ir_playbooks", rowId, {
            status: "failed",
            report_data: { error: "incomplete_generation", detail: incompleteReason, generated_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          }, { fn: "generate-ir-playbook", phase: "terminal_error_incomplete" });
          return;
        }

        const assembled = assembleFromHalves(partA, partB, partC);
        assembled.playbook_text = stripSection4DeferralNotes(assembled.playbook_text);
        // QB11-2(a): collapse a mandated deferral note that was emitted twice in
        // immediate succession (identical sentence, optionally separated by whitespace
        // or a heading line such as "Conclusion — STEP 2").
        function collapseConsecutiveDuplicateNotes(text: string): string {
          try {
            const re = /(Note: this preliminary assessment[^\n]*operative\.)([\s\S]{0,200}?)\1/g;
            let out = text;
            let prev = "";
            while (prev !== out) {
              prev = out;
              out = out.replace(re, (_m, note, between) => `${note}${between}`);
            }
            if (out !== text) console.warn("[IR] QB11-2(a): collapsed consecutive duplicate deferral note(s)");
            return out;
          } catch (e) {
            console.error("[IR] QB11-2(a) collapse errored:", e);
            return text;
          }
        }
        assembled.playbook_text = collapseConsecutiveDuplicateNotes(assembled.playbook_text);
        // R-TURN-3 Turn B item 1b — DETERMINISTIC ENFORCEMENT-BRACKET VERIFIER.
        // Every emitted enforcement bracket (regulator + amount + URL + id) must
        // match a supplied enforcement-context row exactly. Sentences containing a
        // currency+amount pattern whose amount does NOT appear in the corpus are
        // stripped as fabricated. This runs deterministically post-generation.
        function verifyEnforcementBrackets(text: string, corpus: any[]): { text: string; stripped: number } {
          try {
            const authorizedAmounts = new Set<string>();
            for (const row of corpus || []) {
              const amt = row?.fine_eur_equivalent;
              if (amt != null && Number.isFinite(Number(amt))) {
                const n = Math.round(Number(amt));
                authorizedAmounts.add(String(n));
                authorizedAmounts.add(n.toLocaleString("en-US"));
                authorizedAmounts.add(n.toLocaleString("de-DE"));
                authorizedAmounts.add(n.toLocaleString("fr-FR").replace(/\u202f/g, " "));
              }
            }
            const currencyRe = /[€£$]\s?[\d][\d.,\s]{2,}/g;
            const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"\[])/);
            let stripped = 0;
            const kept: string[] = [];
            for (const s of sentences) {
              const matches = s.match(currencyRe);
              if (!matches) { kept.push(s); continue; }
              let allOk = true;
              for (const m of matches) {
                const digits = m.replace(/[^\d]/g, "");
                if (!digits) continue;
                const n = Number(digits);
                if (!Number.isFinite(n)) continue;
                // accept if any authorized amount shares this digit sequence OR is within 1%
                let ok = false;
                for (const a of authorizedAmounts) {
                  const ad = a.replace(/[^\d]/g, "");
                  if (ad === digits) { ok = true; break; }
                  const an = Number(ad);
                  if (Number.isFinite(an) && an > 0 && Math.abs(an - n) / an < 0.01) { ok = true; break; }
                }
                if (!ok) { allOk = false; break; }
              }
              if (allOk) kept.push(s);
              else { stripped++; console.warn("[IR][r-turn-3-b] enforcement-bracket verifier stripped sentence: " + s.slice(0, 160)); }
            }
            return { text: kept.join(" "), stripped };
          } catch (e) {
            console.error("[IR][r-turn-3-b] enforcement verifier errored:", e);
            return { text, stripped: 0 };
          }
        }
        {
          const v = verifyEnforcementBrackets(assembled.playbook_text, enforcement_context);
          if (v.stripped > 0) console.warn(`[IR][r-turn-3-b] enforcement-bracket verifier: stripped=${v.stripped}`);
          assembled.playbook_text = v.text;
        }
        lintBareCitations(assembled.playbook_text);
        const lint = lintReportText(assembled.playbook_text);
        const lintWarnings: any[] = [];
        for (const v of lint.violations) lintWarnings.push(v);
let playbook_text = lint.clean;
        let cal1D1HardReplacements = 0;
        const parsedAnnotations = assembled.parsedAnnotations;

        // R1b2 post-check gate — T-2/T-3/T-4 for the IR playbook. Log-only detection
        // (no regeneration) because the tool topology diverges from the R1b1 single-call
        // template: outputs are produced as three parallel Sonnet calls under a tight
        // edge wall-clock budget, and a regeneration would triple cost and risk further
        // truncation. Signals are surfaced via console.warn and captured in lint_warnings
        // for downstream inspection. R2 backlog: promote to single-part targeted regen
        // once we can attribute a violation to a specific part.
        try {
          const { tests: irTests } = computeIrTestStates(body);
          const t2Violations: string[] = [];
          // T-2: resolved intake facts must not be re-asked.
          if (irTests.find((t) => t.id === "M-DISC")?.state === "RESOLVED_MET") {
            if (/please (provide|confirm|supply)[^.]{0,60}(discovery|when the (breach|incident) was)/i.test(playbook_text)) {
              t2Violations.push("T-2: re-asks discovery timestamp (M-DISC RESOLVED_MET)");
            }
          }
          if (irTests.find((t) => t.id === "M-PROC")?.state === "RESOLVED_MET" || irTests.find((t) => t.id === "M-PROC")?.state === "RESOLVED_NOT_MET") {
            if (/please (provide|confirm|clarify)[^.]{0,80}(whether a processor|if a processor was involved)/i.test(playbook_text)) {
              t2Violations.push("T-2: re-asks processor involvement (M-PROC RESOLVED)");
            }
          }
          if (irTests.find((t) => t.id === "M-CA")?.state === "RESOLVED_NOT_MET") {
            if (/cal\.\s*civ\.\s*code\s*§?\s*1798\.82/i.test(playbook_text)) {
              t2Violations.push("T-2: cites Cal. Civ. Code §1798.82 with California RESOLVED_NOT_MET");
            }
          }
          if (irTests.find((t) => t.id === "M-GDPR")?.state === "RESOLVED_NOT_MET") {
            if (/\barticle\s*33\b|\bart\.\s*33\b/i.test(playbook_text)) {
              t2Violations.push("T-2: cites Article 33 with GDPR RESOLVED_NOT_MET");
            }
          }
          // T-3: banned collapse phrasing when resolved states exist.
          const collapsePatterns = [
            /if (?:the )?(?:GDPR|Article\s*33|California) (?:applies|is applicable)/i,
            /should this (?:jurisdiction|statute) apply/i,
            /counsel to confirm applicability/i,
          ];
          const anyResolved = irTests.some((t) => t.state === "RESOLVED_MET" || t.state === "RESOLVED_NOT_MET");
          if (anyResolved) {
            for (const p of collapsePatterns) {
              if (p.test(playbook_text)) t2Violations.push(`T-3: banned collapse phrasing matched ${p}`);
            }
          }
          // T-4: enhancement-class asks must carry a statutory anchor.
          // (Log-only heuristic: [TO BE COMPLETED] blocks without any statutory reference within 400 chars.)
          const tbcRe = /\[TO BE COMPLETED[^\]]*\]/g;
          let m: RegExpExecArray | null;
          let t4Count = 0;
          while ((m = tbcRe.exec(playbook_text)) !== null) {
            const win = playbook_text.slice(Math.max(0, m.index - 200), m.index + 400);
            if (!/§\s*\d|art(?:icle|\.)\s*\d|\b(?:GDPR|CCPA|HIPAA|PIPEDA|Law\s*25|SHIELD|PDPA)\b/i.test(win)) {
              t4Count += 1;
            }
          }
          if (t4Count > 0) t2Violations.push(`T-4: ${t4Count} [TO BE COMPLETED] deferral(s) lack an adjacent statutory anchor`);
          // §1798.82(h)(1)(C) permanent CHECK-REQUIRED: whenever California is in scope
          // the playbook must instruct confirmation of the account/card-plus-access-code
          // combination somewhere in the document.
          if (irTests.find((t) => t.id === "M-CA-H1C")?.state === "RESOLVED_CHECK_REQUIRED") {
            const h1cOk = /\(h\)\(1\)\(C\)/.test(playbook_text) && /(access code|security code|password)/i.test(playbook_text);
            if (!h1cOk) t2Violations.push("T-2/2c: §1798.82(h)(1)(C) permanent CHECK-REQUIRED not surfaced (missing (h)(1)(C) combination-check instruction)");
          }
          for (const v of t2Violations) {
            console.warn(`[IR Playbook][R1b2 post-check] ${v}`);
            lintWarnings.push({ rule: "r1b2-post-check", detail: v });
          }
        } catch (e) {
          console.error("[IR Playbook][R1b2 post-check] errored (non-fatal):", e);
        }

        // T-5 — TEST-STATES vocabulary leakage (leg-(b) 2026-07-11). IR posture is
        // log-only: the PRIMARY fix for IR is the prompt rule; residual leakage is
        // surfaced in lint_warnings and console.warn but does NOT trigger a retry
        // (IR generation is expensive and the prompt-side gate is expected to hold).
        try {
          const t5Hits = detectTestStatesLeak(playbook_text);
          if (t5Hits.length > 0) {
            console.warn(JSON.stringify({
              evt: "post_lint_violation",
              rule: "T-5",
              fn: "generate-ir-playbook",
              posture: "log_only",
              count: t5Hits.length,
              hits: t5Hits.slice(0, 10),
            }));
            for (const h of t5Hits) {
              lintWarnings.push({ rule: "T-5", posture: "log_only", field: h.path, match: h.match, context: h.context });
            }
          }
        } catch (e) {
          console.error("[IR Playbook][T-5 post-check] errored (non-fatal):", e);
        }

        // REBUILD-IR Task 3 (post-gen) + Task 4 — deterministic instruction-leak + blacklist
        // detection on the assembled playbook_text, plus meta-instruction leak scan on the
        // annotations block. Log-only at this stage (per-part regen already ran inside
        // generateHalves); results are persisted via logPostGenLint for observability.
        let residualLeakCount = 0;
        let blacklistHitCount = 0;
        const postGenNotes: Array<{ code: string; detail?: string }> = [];
        try {
          const INSTRUCTION_LEAK_RE = /\b(do not frame(?: this)?|do NOT output|output ONLY|as instructed|per the rulebook|per these instructions|the system prompt|meta-instruction|internal machinery|IN THIS RESPONSE ONLY|as (?:noted|stated) in the (?:instructions|rules)|per your instructions)\b/i;
          const leakMatch = INSTRUCTION_LEAK_RE.exec(playbook_text);
          if (leakMatch) {
            residualLeakCount = 1;
            const ctx = playbook_text.slice(Math.max(0, leakMatch.index - 40), leakMatch.index + leakMatch[0].length + 40);
            lintWarnings.push({ rule: "REBUILD-IR-T3", posture: "log_only", match: leakMatch[0], context: ctx });
            postGenNotes.push({ code: "instruction_leak_residual", detail: leakMatch[0] });
          }
          const blHits = detectBlacklistPhrases(playbook_text);
          if (blHits.length > 0) {
            blacklistHitCount = blHits.length;
            for (const h of blHits.slice(0, 10)) {
              lintWarnings.push({ rule: "REBUILD-IR-T4-blacklist", posture: "log_only", match: h.match, context: h.context });
            }
            postGenNotes.push({ code: "blacklist_phrase_shipped", detail: `${blHits.length} hit(s)` });
          }
          // Task 4b — enforcement-citation fidelity (log-only): every "Regulator (YYYY)"
          // style citation should map to an injected enforcement-context row.
          const injectedNames = new Set(
            (enforcement_context || []).map((r: any) =>
              String(r?.regulator ?? "").toLowerCase().trim()
            ).filter(Boolean),
          );
          const citeRe = /\b(ICO|CNIL|AEPD|Garante|DPC|EDPB|OAIC|FTC|HHS OCR|CPPA|NYDFS|Datatilsynet|BfDI|UODO|APD|IMY|Cal\.\s*AG|Attorney General)\s*\((?:19|20)\d{2}\)/g;
          const unknownCites: string[] = [];
          let cm: RegExpExecArray | null;
          while ((cm = citeRe.exec(playbook_text)) !== null) {
            const name = cm[1].toLowerCase().trim();
            const matched = Array.from(injectedNames).some((n) => n.includes(name) || name.includes(n));
            if (!matched) unknownCites.push(cm[0]);
          }
          if (unknownCites.length > 0) {
            for (const u of unknownCites.slice(0, 5)) {
              lintWarnings.push({ rule: "GRADER-CAL-1-D1-uninjected-citation-hard-replace", posture: "hard", match: u });
            }
            postGenNotes.push({ code: "uninjected_enforcement_citation_hard_replaced", detail: `${unknownCites.length}` });
            // GRADER-CAL-1 D1 — HARD replacement. Every unsupplied "[Regulator]
            // (YYYY)" cite form is rewritten to a statutory placeholder that
            // tells the reviewing attorney precedent verification is required.
            const HARD_PLACEHOLDER =
              "[TO BE COMPLETED — enforcement precedent requires verification against official regulator source]";
            for (const u of unknownCites) {
              const esc = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const re = new RegExp(esc, "g");
              const before = playbook_text.length;
              playbook_text = playbook_text.replace(re, HARD_PLACEHOLDER);
              if (playbook_text.length !== before) cal1D1HardReplacements++;
            }
          }

          // IR-HF1 T2 — CROSS-PART CONSISTENCY LINT (log-only, report-only-first
          // per REBUILD-IR D3). Compares the three assembled parts on: (i) party /
          // organisation-name mentions, (ii) incident date tokens (ISO YYYY-MM-DD
          // and "DD Month YYYY" forms), (iii) regulator names drawn from the
          // ENFORCEMENT CONTEXT and the built-in regulator vocabulary, and
          // (iv) statutory-anchor mentions (GDPR Art., § 1798.x, HIPAA § 164.x,
          // CCPA/CPPA, and the state-statute short forms). A "cross_part_inconsistency"
          // note is written when a token appears in one part but is absent from
          // another part that speaks to the same subject (party name / date /
          // regulator / statute). NO regen, NO doc mutation this pass — findings
          // land in post_gen_lint.notes for grader/reviewer visibility.
          try {
            type PartLabel = "A" | "B" | "C";
            const parts: Array<{ label: PartLabel; text: string }> = [
              { label: "A", text: partA || "" },
              { label: "B", text: partB || "" },
              { label: "C", text: partC || "" },
            ];
            const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;
            const REGULATOR_VOCAB = [
              "ICO", "CNIL", "AEPD", "Garante", "DPC", "EDPB", "OAIC", "FTC",
              "HHS OCR", "CPPA", "NYDFS", "Datatilsynet", "BfDI", "UODO", "APD", "IMY",
            ];
            const STATUTE_RE = /(GDPR\s*Art(?:icle)?\.?\s*\d+[a-z]?|§\s*1798\.\d+[a-z]?|45\s*C\.F\.R\.\s*§\s*164\.\d+|HIPAA|CCPA|CPPA|PIPEDA|Law\s*25|BIPA|TRAIGA)/gi;
            const orgName = (body as any)?.organizationName ? String((body as any).organizationName).trim() : "";
            const extract = (t: string) => {
              const dates = new Set<string>();
              let m: RegExpExecArray | null;
              while ((m = ISO_DATE_RE.exec(t)) !== null) dates.add(m[1]);
              const regs = new Set(REGULATOR_VOCAB.filter((r) => new RegExp(`\\b${r.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i").test(t)));
              const stats = new Set<string>();
              let sm: RegExpExecArray | null;
              const statRe = new RegExp(STATUTE_RE.source, "gi");
              while ((sm = statRe.exec(t)) !== null) stats.add(sm[0].toLowerCase().replace(/\s+/g, " "));
              const hasOrg = orgName.length > 0 && t.toLowerCase().includes(orgName.toLowerCase());
              return { dates, regs, stats, hasOrg };
            };
            const facts = parts.map((p) => ({ ...p, ...extract(p.text) }));
            const findings: Array<{ code: string; detail: string }> = [];
            const quote = (t: string, needle: string) => {
              const idx = t.toLowerCase().indexOf(needle.toLowerCase());
              if (idx < 0) return "";
              return t.slice(Math.max(0, idx - 40), idx + needle.length + 40);
            };
            // (i) party/entity name: if present in one part and absent from another
            // that has substantive text (>500 chars).
            if (orgName) {
              const carrying = facts.filter((p) => p.hasOrg);
              const substantiveMissing = facts.filter((p) => !p.hasOrg && p.text.length > 500);
              if (carrying.length > 0 && substantiveMissing.length > 0) {
                findings.push({
                  code: "cross_part_inconsistency",
                  detail: `party_name_absent parts=${substantiveMissing.map((p) => p.label).join(",")} name="${orgName}" quoted_in=${carrying.map((p) => `${p.label}:"${quote(p.text, orgName).trim()}"`).join(" | ")}`,
                });
              }
            }
            // (ii) date disagreement: if two parts each cite ISO dates and their
            // date sets do not intersect.
            for (let i = 0; i < facts.length; i++) {
              for (let j = i + 1; j < facts.length; j++) {
                const a = facts[i]; const b = facts[j];
                if (a.dates.size > 0 && b.dates.size > 0) {
                  const shared = [...a.dates].some((d) => b.dates.has(d));
                  if (!shared) {
                    findings.push({
                      code: "cross_part_inconsistency",
                      detail: `incident_date_mismatch parts=${a.label},${b.label} ${a.label}=[${[...a.dates].join(",")}] ${b.label}=[${[...b.dates].join(",")}]`,
                    });
                  }
                }
              }
            }
            // (iii) regulator disagreement: regulator named in only one part when
            // another part is substantive (>800 chars) and names some regulator.
            const allRegs = new Set<string>();
            facts.forEach((f) => f.regs.forEach((r) => allRegs.add(r)));
            for (const r of allRegs) {
              const carrying = facts.filter((p) => p.regs.has(r)).map((p) => p.label);
              const missing = facts.filter((p) => !p.regs.has(r) && p.text.length > 800 && p.regs.size > 0).map((p) => p.label);
              if (carrying.length > 0 && missing.length > 0 && carrying.length < facts.length) {
                findings.push({
                  code: "cross_part_inconsistency",
                  detail: `regulator_scoping regulator="${r}" present=${carrying.join(",")} absent=${missing.join(",")}`,
                });
              }
            }
            // (iv) statute disagreement: statute anchor in one part, absent from
            // another substantive part that uses a different anchor family.
            const anchorFamily = (a: string): string => {
              if (/gdpr/i.test(a)) return "gdpr";
              if (/1798/.test(a)) return "ccpa";
              if (/164\./.test(a) || /hipaa/i.test(a)) return "hipaa";
              return a.slice(0, 20);
            };
            for (let i = 0; i < facts.length; i++) {
              for (let j = i + 1; j < facts.length; j++) {
                const a = facts[i]; const b = facts[j];
                const famA = new Set([...a.stats].map(anchorFamily));
                const famB = new Set([...b.stats].map(anchorFamily));
                if (famA.size > 0 && famB.size > 0) {
                  const shared = [...famA].some((f) => famB.has(f));
                  if (!shared) {
                    findings.push({
                      code: "cross_part_inconsistency",
                      detail: `statute_family_mismatch parts=${a.label},${b.label} ${a.label}=[${[...famA].join(",")}] ${b.label}=[${[...famB].join(",")}]`,
                    });
                  }
                }
              }
            }
            for (const f of findings.slice(0, 20)) {
              lintWarnings.push({ rule: "IR-HF1-T2-cross-part", posture: "log_only", match: f.detail });
              postGenNotes.push({ code: f.code, detail: f.detail });
            }
          } catch (e) {
            console.error("[IR Playbook][IR-HF1 T2 cross-part] errored (non-fatal):", e);
          }
        } catch (e) {
          console.error("[IR Playbook][REBUILD-IR post-gen] errored (non-fatal):", e);
        }
        try {
          logPostGenLint(supabase, {
            functionName: "generate-ir-playbook",
            fallbackApplied: false,
            residualLeaks: residualLeakCount,
            residualResolvedAsks: 0,
            notes: postGenNotes,
            sourceTable: "ir_playbooks",
            sourceRowId: rowId,
            extra: { blacklist_hits: blacklistHitCount, ir_version: IR_VERSION, drove_regen: cal1D1HardReplacements > 0, cal1_d1_hard_replacements: cal1D1HardReplacements },
          });
        } catch (e) {
          console.warn("[IR Playbook] logPostGenLint threw (non-fatal):", e);
        }





        const portals = body.jurisdictions
          .filter((j) => DPA_PORTALS[j])
          .map((j) => ({ jurisdiction: j, portal: DPA_PORTALS[j] }));

        // COUNSEL-VOICE-1 E-checks — deterministic format-check emission.
        let ir_deterministic_checks: any[] = [];
        try {
          ir_deterministic_checks = runFormatChecksIR(playbook_text ?? "");
        } catch (e) {
          console.warn("[generate-ir-playbook] format-checks non-fatal:", (e as Error).message);
        }

        let report_data: Record<string, any> = {
          portals,
          enforcement_precedents: enforcement_context.slice(0, 5),
          enforcement_meta: enforcementMeta,
          annotations: parsedAnnotations,
          lint_warnings: lintWarnings,
          information_needed: Array.isArray((assembled as any)?.information_needed)
            ? (assembled as any).information_needed
            : [],
          deterministic_checks: ir_deterministic_checks,
          generated_at: new Date().toISOString(),
          build_stamp: BUILD_STAMP,
          _meta: { prompt_version: stampPromptVersion("ir-playbook", IR_VERSION) },
        };
        try {
          const guarded = guardInformationNeeded(
            { ...report_data, playbook_text } as Record<string, unknown>,
            (body as unknown) as Record<string, unknown>, "ir_playbook");
          report_data.information_needed = (guarded as any).information_needed ?? report_data.information_needed;
        } catch (e) {
          console.warn("[generate-ir-playbook] insufficient-info guard error:", e);
        }

        // ── ITEM 312 — IR-PLAYBOOK ANALYTIC DELIVERABLES (Chapter 8) ───────
        // Single writer for sa_notification_determination,
        // data_subject_communication_determination, art34_exemption_analysis
        // and content_owner_mapping. Pure, built from the intake record only.
        // Op. 1's awareness/deadline arithmetic is NOT touched. Fail-open.
        try {
          const { attachIrPlaybookDeliverables } = await import("../_shared/ltp/ir-playbook-deliverables/build.ts");
          const irmeta = attachIrPlaybookDeliverables(
            report_data as Record<string, unknown>,
            (body as unknown) as Record<string, unknown>,
          );
          const _m = ((report_data as any)._meta ??= {});
          (_m.internal ??= {}).ir_deliverables = irmeta;
          console.log(JSON.stringify({ evt: "_ir_deliverables", fn: "generate-ir-playbook", build_stamp: BUILD_STAMP, ...irmeta }));
        } catch (e) {
          console.warn("[generate-ir-playbook] ITEM-312 deliverables failed (non-fatal):", (e as Error)?.message);
        }

        // ── IR-PLAYBOOK-REGISTRY-WIRING (2026-07-25) — deterministic post-pass ──
        // Registry-first citation stamping + write-around; telemetry under
        // `_meta.internal.ir_w1`. Fail-open; never blocks emission.
        try {
          const { applyW1IrWire } = await import("./_w1_ir_wire.ts");
          applyW1IrWire(report_data);
        } catch (e) {
          console.warn("[generate-ir-playbook] IR-PLAYBOOK-REGISTRY-WIRING post-pass failed (non-fatal):", (e as Error)?.message);
        }

        // ── LEAK-PREV-P1 — EMIT GATE ─────────────────────────────────────
        try {
          const { runEmitGate } = await import("../_shared/emit-gate.ts");
          runEmitGate(report_data as any, {
            tool: "ir_playbook",
            intakeRoster: (body as unknown) as Record<string, unknown>,
          });
        } catch (e) {
          console.warn("[generate-ir-playbook] LEAK-PREV-P1 emit-gate wrapper failed (non-fatal):", (e as Error)?.message);
        }
        // ── LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER ──────────────────────
        try {
          const { serializeCustomerReport } = await import("../_shared/report-serialize.ts");
          const { IR_PLAYBOOK_REPORT_SCHEMA } = await import("../_shared/report-schemas/ir-playbook.ts");
          const { report: serialized, telemetry } = serializeCustomerReport(report_data as any, IR_PLAYBOOK_REPORT_SCHEMA);
          if (!telemetry.crashed && serialized && typeof serialized === "object") {
            report_data = serialized as any;
          }
        } catch (e) {
          console.warn("[generate-ir-playbook] LEAK-PREV-P2 serializer failed (non-fatal):", (e as Error)?.message);
        }


        // Stage 1: metering + version retention (written BEFORE status:complete).
        await recordRunMeterAndVersion(supabase, {
          toolType: "ir_playbook",
          assessmentId: rowId,
          userId: resolvedUserId ?? null,
          intake: {
            organization_name: (body as any).organizationName ?? null,
            jurisdictions: (body as any).jurisdictions ?? null,
          },
          reportData: report_data,
          documentText: playbook_text,
        });

        const completeWrite = await lifecycleUpdate(supabase, "ir_playbooks", rowId, {
          client_id: body.client_id ?? null,
          organization_name: body.organizationName || null,
          status: "complete",
          intake_data: body,
          playbook_text,
          report_data,
          updated_at: new Date().toISOString(),
        }, { fn: "generate-ir-playbook", phase: "terminal_complete" });
        if (!completeWrite.ok) {
          await lifecycleUpdate(supabase, "ir_playbooks", rowId, { status: "failed", updated_at: new Date().toISOString() }, { fn: "generate-ir-playbook", phase: "terminal_fallback" });
        }

        // L2 — observe-only citation lint (never blocks, never mutates output).
        try {
          await observeCitations(
            supabase,
            "generate-ir-playbook",
            rowId,
            playbook_text,
            irSuppliedCitations,
          );
        } catch (obsErr) {
          console.error("[citation-observe] non-fatal:", String(obsErr));
        }

        await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "ir_playbooks", sourceRowId: rowId });
      } catch (bgErr) {
        console.error("[generate-ir-playbook] background error:", bgErr);
        try {
          await lifecycleUpdate(supabase, "ir_playbooks", rowId, { status: "failed", updated_at: new Date().toISOString() }, { fn: "generate-ir-playbook", phase: "background_catch" });
        } catch (persistErr) {
          console.error("[generate-ir-playbook] failure-persist error:", persistErr);
        }
        await failFunctionRun(supabase, fnRun, bgErr, { metadata: { rowId } });
      }
    })());

    return new Response(
      JSON.stringify({ success: true, id: rowId, status: "processing" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ir-playbook error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
