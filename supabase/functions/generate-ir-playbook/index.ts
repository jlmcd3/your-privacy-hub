// qb8 build active
// run-meter deploy-check v1
// generate-ir-playbook: produces a 7-section breach response playbook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { lintReportText } from "../_shared/output-lint.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type ToolModule, type SystemBlock, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import {
  renderAiActCitationBlock,
  renderTransferAdequacyNote,
} from "../_shared/gdpr-registry.ts";
import { renderIcoPenaltyFigures } from "../_shared/enforcement-figures-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { getGdprContext } from "../_shared/gdpr-context.ts";
import { observeCitations } from "../_shared/citation-observe.ts";

const IR_IDENTITY = `You are a senior data protection incident response specialist with extensive experience advising organizations through live data breach incidents under GDPR, UK GDPR, HIPAA, and US state breach notification laws.`;

// PRECEDENT LEDGER (battery-5 seat pass, finding C-5 — do not "fix" in future batteries):
// The IR Playbook's counsel content is LEGITIMATE deliverable content and is exempt from
// counsel-directive scrubs: (1) assigning "Senior Legal Counsel" (or equivalent) as an incident
// ROLE in the response team, and (2) directing counsel involvement to establish and maintain
// legal privilege. Privilege is legally constituted through counsel — this is the mechanics of
// the deliverable, not resolution-method prescription under Synthesis Principle 1. Any future
// counsel-scrub prompt must leave these two categories intact. Motivating finding: run 552cb9e9
// seat adjudication; principle recorded in EUP_Battery5_Seat_Findings_Adjudication.md.
const IR_RULEBOOK = `US STATE BREACH NOTIFICATION — KEY TIMELINES (for Section 3) — Last verified: June 2026:
- California: notify individuals within 30 CALENDAR DAYS of discovery or notification of the breach (Cal. Civ. Code §1798.82, as amended by SB 446, effective 1 Jan 2026); delay only for law enforcement needs or to determine scope/restore system integrity. If MORE THAN 500 CA residents (strictly greater than 500; exactly 500 does not trigger this duty): electronically submit a sample copy to the CA AG within 15 calendar days of notifying consumers (§1798.82(f)).
- Texas: notify individuals without unreasonable delay and no later than 60 DAYS after determining the breach occurred (Tex. Bus. & Com. Code §521.053(b), Texas Identity Theft Enforcement and Protection Act — NOT the TDPSA, which does not create breach notification obligations); notify the TX Attorney General as soon as practicable and no later than 30 DAYS after determination — NOT 60 days (§521.053(i), as amended by SB 768 effective 1 Sep 2023) — if the breach involves at least 250 TX residents, submitted via the mandatory electronic form on the AG's website. The AG deadline (30 days) is SHORTER than the individual-notice deadline (60 days). Note: the TDPSA (Texas Data Privacy and Security Act, Tex. Bus. & Com. Code Ch. 541) governs data processing rights and obligations but does NOT independently create breach notification duties.
- New York: notify individuals in the most expedient time possible and no later than 30 CALENDAR DAYS after discovery of the breach (N.Y. Gen. Bus. Law §899-aa, as amended by S2659B effective 21 Dec 2024); delay only for legitimate law enforcement needs — the former allowance to delay while determining breach scope or restoring system integrity was REMOVED by the 2024 amendment. Do NOT describe New York as having no fixed deadline — that was the pre-amendment standard. Regulator notice: WHENEVER any NY residents are notified, also notify the NY Attorney General, the Department of State, and the State Police (§899-aa(8)(a)) — this is NOT limited to 500+ residents. DFS-regulated entities (banks, insurers, other NYDFS-licensed entities) must additionally notify the NY Department of Financial Services; under 23 NYCRR Part 500 the DFS clock is 72 HOURS, which is stricter and controls for those entities. If 5,000+ NY residents: also notify nationwide consumer reporting agencies. SHIELD Act reasonable-safeguards duties apply independently.
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

CITATION INTEGRITY RULE: Every specific statutory citation you produce (act name, section number, subsection letter) must be verifiable against the actual statute. Known hallucination risks to guard against: (1) PIPEDA does not use decimal sub-principle numbering — cite as "Schedule 1, Principle N (Name)" only. (2) The Breach of Security Safeguards Regulations under PIPEDA are SOR/2018-64 — no other SOR number is correct. (3) US state privacy laws do not have a universal 72-hour breach notification deadline — that is a GDPR Article 33 concept only. Apply it only where GDPR explicitly applies. (4) Quebec Law 25 uses "without delay" not "72 hours" — present 72 hours as a planning benchmark only. (5) California breach notification (Cal. Civ. Code §1798.82, as amended by SB 446 effective 1 Jan 2026): individuals within 30 calendar days of discovery; AG sample copy within 15 calendar days of consumer notice when 500+ CA residents affected. Do NOT describe California as having no fixed deadline — that was the pre-2026 standard. 72 hours remains a GDPR Article 33 concept only. If you are uncertain of a specific section number, write the section in descriptive terms and flag it: "[statutory reference to be confirmed with counsel]" rather than inventing a section number. (9) When stating a computed notification deadline, give the date and time only — NEVER state the day of the week, as computing weekday names is error-prone; if the input data explicitly provides a weekday you may repeat it verbatim. (10) Danish Data Protection Act (Databeskyttelsesloven, Act No. 502 of 23 May 2018): cite the employment-context processing provision as §12. NEVER cite this Act by chapter number — refer to numbered sections (§) only, and if uncertain of the section, describe the obligation and flag [statutory reference to be confirmed with counsel].
(11) HIPAA CITATION ANCHORS: Under HIPAA, cite specific provisions as follows — PHI definition: 45 C.F.R. §160.103 (NOT §164.514); breach definition: 45 C.F.R. §164.402; breach risk assessment methodology: 45 C.F.R. §164.402; individual notice obligation: 45 C.F.R. §164.404; HHS and media notice: 45 C.F.R. §164.408; business associate breach-to-covered-entity notice: 45 C.F.R. §164.410; de-identification safe harbour: 45 C.F.R. §164.514(b) — cite §164.514 ONLY for the de-identification rule, never as the basis for PHI status. Never cite §164.514 to support a conclusion that data constitutes PHI; that citation is backwards — §164.514 describes when data is NOT PHI.
(12) ENFORCEMENT CITATION COMPLETENESS RULE: every named-decision citation follows the single standard in ENFORCEMENT CITATION GROUNDING — STRICT. A named-decision citation carries the matter name, the decision date (the "Decided:" value), AND the official source reference (the "Official source:" URL or decision reference) exactly as they appear in the supplied block — all three. Names are reproduced character-for-character as the block records them: never re-spell, transliterate, translate, or "correct" an entity or matter name (a Polish "Fundacja" never becomes a Portuguese "Fundação"). Where the block supplies a subject but its Decided line reads "date not recorded in corpus" or its reference line reads "No decision reference or source URL recorded in corpus", do NOT present the entry as a specifically identified case — frame it as a general principle attributed to the corpus per PRECEDENTS CITE ONLY WHAT IS CITABLE. Where the block supplies only a regulator and year with no subject, cite it as "the [Regulator]'s enforcement posture in this area" — never "[Regulator] ([Year]) decision". The bare "[Regulator] ([Year]) — [Matter Name]" format without the decision date and official source reference is no longer a permitted citation form. DOCKET YEAR IS NOT DECISION YEAR: where the official-source URL or document identifier embeds a docket or filing year that differs from the decision year (e.g. a document identifier containing '2025' for a decision decided in 2026 — Polish UODO docket signatures embed the year the proceeding was opened), reproduce BOTH exactly as supplied; the difference is not an inconsistency and must never be 'corrected'. Where the supplied block carries a docket signature, the citation may include it in the form 'docket [signature]' so the year duality is explicit.

VERIFIED JURISDICTION FACTS (use these anchors verbatim where relevant):
- California (Cal. Civ. Code §1798.82, as amended by SB 446, eff. Jan 1, 2026): 30-day individual notice from discovery; AG sample copy within 15 days of consumer notice when 500+ CA residents affected. SB 446 RETAINED both delay allowances — legitimate law-enforcement needs AND time necessary to determine the scope of the breach and restore system integrity. Never state that the scope/integrity exception was removed.
  California §1798.82 DATA ELEMENT GATE: "Personal information" under §1798.82(h) for breach notification purposes is NARROWER than the CCPA's general definition. It requires a first name or first initial + last name COMBINED WITH at least one of these enumerated elements: (1) SSN; (2) driver's licence/state ID number; (3) account number or credit/debit card number with any required access code or password; (4) medical information; (5) health insurance information; (6) unique biometric data; (7) username or email address COMBINED WITH a password or security question and answer that permits access to an online account. Names and email addresses ALONE — without an accompanying password, security credential, or elements (1)–(6) — do NOT independently trigger §1798.82 notification. Element (7) covers email + credential combinations, not email addresses in isolation. When assessing whether California notification is required, apply this gate explicitly: identify which specific §1798.82(h) element is satisfied by the data involved, and state it. Do not conclude California notification is triggered solely because names and emails were exposed unless a password or security credential was also exposed with them.
- The 30-day fixed deadline applies to California (from discovery) and Colorado (from DETERMINATION, §6-1-716(2)(a)) ONLY. Illinois (815 ILCS 530) and Virginia (§18.2-186.6) have NO fixed day-count — "most expedient time" / "without unreasonable delay". Early-section deadline summaries must match the per-state sections exactly; never list Illinois under a 30-day deadline.
- Denmark: breach notifications to Datatilsynet are filed via Virk.dk (the Danish business portal) — never cite datatilsynet.dk as the submission channel. Denmark's national CSIRT is CFCS — never "NCSC-DK". Datatilsynet generally PROPOSES fines (reported to police, decided by courts) — describe Danish fines as "proposed fine reported to police" unless the corpus marks them court-imposed. There is no statutory minimum retention period for breach records in Denmark — recommended practice only.
- CREDENTIAL TERMINOLOGY RULE: In credential-stuffing incidents, maintain precise and consistent terminology throughout: "the attacker used credentials acquired from external sources (not from this organisation's systems)" — never "compromised credentials" (which implies the credentials were exposed by this organisation), never "stolen credentials" without specifying they were stolen from elsewhere. Early sections (breach assessment), mid sections (notification analysis), and template sections (consumer notice) must all use identical framing on this point. The consumer notice template must include: "The credentials used to access your account were not obtained from our systems."

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

PRECAUTIONARY PASSWORD-CHANGE FRAMING: When recommending users change their password even though the incident did NOT expose that password with this organisation, include one clarifying sentence framing the advice as precautionary against credential-stuffing risk from password reuse on other services — e.g. "Your password with [org] was not itself exposed in this incident; the recommendation is precautionary, since attackers commonly try leaked email addresses against other services where users may have reused the same password." Do NOT phrase the recommendation in a way that implies the password held by this organisation was compromised.

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

VERIFIED CALIFORNIA BREACH DEADLINES (cite these; do not recall breach-notification timelines from memory): Cal. Civ. Code § 1798.82, as amended by SB 446 (signed October 2025, effective January 1, 2026), requires (1) disclosure to affected California residents within 30 calendar days of discovery or notification of the breach, subject to the law-enforcement and scope-determination delay provisions, and (2) for breaches affecting more than 500 California residents, electronic submission of a single sample copy of the notification to the California Attorney General within 15 calendar days of notifying affected consumers. Where the incident predates January 1, 2026, the prior 'most expedient time possible and without unreasonable delay' standard governed; state which regime applies by incident date.

PROVISIONAL DEADLINES SAY SO: where a statutory clock is computed from a timestamp that the playbook itself marks as pending confirmation (e.g. detection treated as concurrent with controller awareness), the deadline statement must carry the provisional framing inline — "provisionally computed from the detection timestamp, treating it as concurrent with awareness pending confirmation; if awareness is confirmed later, recalculate all deadlines from the confirmed timestamp" — never a bare "computed from the stated awareness timestamp" while another section calls that timestamp unconfirmed.

GERMAN AUTHORITY NOMENCLATURE IS CANONICAL: the federal authority is 'Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)' — after first use, 'BfDI'. The state authorities are 'Landesdatenschutzbehörde' / 'Landesdatenschutzbehörden' — use that term consistently. 'Bundesdatenschutzbehörde' and 'Bundesdatenschutzbeauftragter' are not standard names and must never appear. Competence default, stated wherever German competence is discussed (alongside any confirmation placeholder): for private-sector controllers the competent authority is the Landesdatenschutzbehörde of the German establishment's registered seat; the BfDI supervises federal public bodies and telecommunications/postal providers.

STEP NUMBERING BELONGS TO SECTION 4 ALONE: the labels "STEP 1" through "STEP 5" (and any "STEP n" form) appear ONLY as Section 4 headings. Sections 2 and 3 never title a paragraph, conclusion, or note "STEP n" — a preliminary view in Sections 2–3 is titled by its subject ("Preliminary view — Article 33 notification", "Preliminary view — Article 34 high-risk question"), so the mandated cross-reference "resolved by the … determination at Section 4 STEP 2" can never read as a step resolving itself. Where Sections 2–3 currently would write "Preliminary conclusion — STEP 2", write "Preliminary view — Article 33 notification" instead.

NOTIFICATION RECORDS LIST NOTIFICATION ITEMS: the notification-specific documentation checklist contains only items that apply when notification IS required. The 'notification determined not to be required' reasoning item belongs to the general breach-register entry (maintained for every breach regardless of notification); if retained in the notification checklist at all, it is framed solely as the reversal edge case ('Where an initial threshold determination is later reversed…').

A DEFERRAL IS ISSUED ONCE: where the same information is deferred to the user in two sections (e.g. geographic segmentation of affected individuals), the [TO BE COMPLETED] instruction appears in full at its primary location only; every other location carries a cross-reference ('see Section 1, step 6') — never a second full deferral for the same fact.

SUPPLIED BREACH AUTHORITY: where a GDPR BREACH-NOTIFICATION AUTHORITY block is present in the user prompt, every statement of Article 33 or Article 34 content (thresholds, the 72-hour clock, notification content elements, the high-risk communication standard, exceptions) must be drawn from that block. Where the block is absent (US-state-only incidents), do not cite GDPR articles at all. Existing enforcement-citation grounding rules are unchanged.

CAL AG SAMPLE-COPY THRESHOLD: the Cal. Civ. Code 1798.82(f) trigger is notification to MORE THAN 500 California residents (strictly greater than 500), with the sample copy due to the Attorney General within 15 calendar days of notifying consumers. Never phrase this threshold as '500 or more' or '500+'. State every occurrence of this threshold identically throughout the playbook.`;

const IR_TOOL_MODULE: ToolModule = {
  outputMode: "document",
  // The tool's LOCALE rule inside IR_RULEBOOK governs per-output language.
  languageVariant: "jurisdiction-conditional",
  citationFramework:
    "Cite US state breach-notification statutes by code section (e.g. Cal. Civ. Code §1798.82; Tex. Bus. & Com. Code §521.053; N.Y. Gen. Bus. Law §899-aa); GDPR/UK GDPR breach duties as Articles 33–34; HIPAA by 45 C.F.R. section per the anchors in the rules below. Cite enforcement actions and fines ONLY from the ENFORCEMENT PRECEDENTS block in the user prompt; use only regulator-portal URLs provided in the prompt; never assert a fine amount or fabricate a URL from training knowledge. PORTAL URL EXACT-MATCH: when a regulator-portal URL is supplied in the prompt (e.g. the CNIL notification portal), reproduce that exact string everywhere the portal is referenced in the document — do not paraphrase the hostname, shorten it to the bare domain, or substitute a remembered alternate hostname (e.g. do not write \"cnil.fr\" or \"teleservice.cnil.fr\" if the supplied URL is \"notifications.cnil.fr\"). If the same portal is referenced in more than one section, copy the identical string each time.",
  identity: IR_IDENTITY,
  extraRules: IR_RULEBOOK,
};


// Bump this string whenever generate-ir-playbook changes — it is logged at
// background-start so deploy staleness is instantly detectable in edge logs.
const IR_VERSION = "v3.4-ico-currency-fix-2026-06-14";

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

Deno.serve(async (req) => {
  console.log(`[qb9] generate-ir-playbook build active · core=${PROMPT_CORE_VERSION}`);
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
      await supabase
        .from("ir_playbooks")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", rowId);
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
      await supabase.from("ir_playbooks").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
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
              query_descriptor: `breach response in ${(body.jurisdictions || []).join(", ") || "—"}`,
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
            const ctx = await getGdprContext(supabase as any, {
              articles: ["33", "34"],
              jurisdiction: hasUk && !hasEu ? "uk" : "eu",
              maxChars: 12000,
            });
            if (ctx?.block) {
              gdprBreachBlock =
                "\n\nGDPR BREACH-NOTIFICATION AUTHORITY -- SUPPLIED VERBATIM TEXT (cite Article 33/34 content ONLY from this block, never from recollection; applies to all three parts):\n" +
                ctx.block;
              if ((ctx.meta?.missing_articles ?? []).length > 0) {
                console.warn("[generate-ir-playbook] GDPR base articles missing:", ctx.meta.missing_articles.join(", "));
              }
              irSuppliedCitations = (ctx.meta?.matched_articles ?? [])
                .map((n: string) => `Article ${n} GDPR`);
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


        // ── Split into TWO PARALLEL Sonnet calls to stay inside the edge runtime
        // wall-clock budget.
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

DPA NOTIFICATION PORTALS FOR RELEVANT JURISDICTIONS
${relevantPortals || "(For notification submission, consult each relevant regulator's official website for the current portal or contact channel.)"}

ENFORCEMENT CONTEXT — BREACH NOTIFICATION FAILURES
The following cases show where organisations were penalised for breach notification failures. Use this to calibrate your timeline and content recommendations.
CITATION RULE: When you reference any of these in section text, use the human-readable CITATION shown (e.g. "ICO (2023)" or "CNIL (2022)") — NEVER the bracketed [E#] code. The [E#] tag is only for your internal lookup. Reserve the exact id values for the ===ANNOTATIONS=== JSON block at the very end of the playbook.
${formatEnforcementContext(enforcement_context)}

CROSS-JURISDICTIONAL CITATION NOTE: Where an enforcement precedent in the ENFORCEMENT CONTEXT above was issued by a regulator from a different legal system than the jurisdiction being addressed in a section (for example, an AEPD/Spanish DPA decision cited in a Quebec or PIPEDA section), you MUST note explicitly in the text: "This case is from a different legal system and is cited as cross-jurisdictional precedent illustrating regulatory expectations, not as direct authority." Do not present such cases as directly binding. This rule applies in EVERY section of the playbook including documentation checklists, root-cause-analysis sections, and post-incident sections — not only the first mention. NEVER describe a decision of one national DPA as directly applicable, directly binding, or EU-law precedent in another member state; decisions of national supervisory authorities bind only within their own jurisdiction and are persuasive elsewhere. Only EDPB Article 65 binding decisions and CJEU judgments may be described as binding across member states.${gdprBreachBlock}`;

        const PROMPT_PART_A = `You are a senior data protection incident response specialist. Generate PART A (Sections 1–3) of a complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident.

${INTAKE_BLOCK}

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

        const PROMPT_PART_B = `You are a senior data protection incident response specialist. Generate PART B (Sections 4–5) of the same complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident.

${INTAKE_BLOCK}

Generate ONLY the following two sections now. Each section MUST begin with a markdown H2 heading using the EXACT format shown. Do NOT output Sections 1, 2, 3, 6, 7, or the ===ANNOTATIONS=== block in this response — those are generated in parallel calls. CROSS-PART CONSISTENCY: the deadlines, threshold tests, regulator names, portal URLs, statutory caution rules, and case citations you use here must match exactly those used in Parts A and C, since all three parts are generated from the same incident facts and system instructions. Do not refer to "the previous section" or "as above" because this part is generated independently and later merged.

## Section 4: INDIVIDUAL NOTIFICATION DECISION TREE
Step-by-step logic for determining whether individuals must be notified, with jurisdiction-specific thresholds. If required: content elements, delivery method, and deadline. Include the verbatim phrase "individual notification" in the section body.

## Section 5: NOTIFICATION TEMPLATES
(a) A DPA initial notification letter template for the primary jurisdiction.
(b) An individual notification template if individual notification is required.
Mark all placeholder fields [IN SQUARE BRACKETS]. The word "template" MUST appear in this section heading or body at least twice.

Output ONLY Sections 4–5. No preamble, no commentary, do NOT output Sections 1–3 or 6–7, no annotations. Do not end your output with a horizontal rule or divider line.`;

        const PROMPT_PART_C = `You are a senior data protection incident response specialist. Generate PART C (Sections 6–7 plus the ===ANNOTATIONS=== block) of the same complete, actionable 7-section incident response playbook for a data breach. The playbook must be immediately usable by a privacy or legal team during a live incident.

${INTAKE_BLOCK}

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
          injected: registryInjections,
          cache: true,
        });

        async function callClaude(messages: any[], maxTokens: number, timeoutMs: number = 720_000): Promise<{ text: string; stopReason: string | null }> {
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
              system: irSystem,
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

        async function generatePart(which: "A" | "B" | "C", extra: string, maxTokens: number, timeoutMs: number = 720_000): Promise<{ text: string; stopReason: string | null }> {
          const base = which === "A" ? PROMPT_PART_A : which === "B" ? PROMPT_PART_B : PROMPT_PART_C;
          const prompt = extra ? `${base}\n\n${extra}` : base;
          return await callClaude([{ role: "user", content: prompt }], maxTokens, timeoutMs);
        }

        // Tail-continuation retry: replay the model's truncated output as an assistant
        // turn and ask for a continuation in a final user turn (claude-sonnet-4-6 does
        // not support assistant prefill — conversation must end with user message).
        async function continuePart(which: "A" | "B" | "C", extra: string, truncated: string, maxTokens: number, timeoutMs: number): Promise<{ text: string; stopReason: string | null }> {
          const base = which === "A" ? PROMPT_PART_A : which === "B" ? PROMPT_PART_B : PROMPT_PART_C;
          const tail = which === "C"
            ? "Finish any in-progress section, then produce any remaining required sections you have not yet completed, then output the ===ANNOTATIONS=== block followed by the JSON array, then stop."
            : "Finish any in-progress section, then produce any remaining required sections for this part you have not yet completed, then stop.";
          const userPrompt = `${extra ? `${base}\n\n${extra}` : base}\n\n(Generating part ${which}.)`;
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
          const fullText = `${partA.trim()}\n\n${partB.trim()}\n\n${partC.trim()}`;
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
          await supabase
            .from("ir_playbooks")
            .update({
              status: "failed",
              report_data: { error: "incomplete_generation", detail: incompleteReason, generated_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq("id", rowId);
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
        lintBareCitations(assembled.playbook_text);
        const lint = lintReportText(assembled.playbook_text);
        const lintWarnings: any[] = [];
        for (const v of lint.violations) lintWarnings.push(v);
        const playbook_text = lint.clean;
        const parsedAnnotations = assembled.parsedAnnotations;

        const portals = body.jurisdictions
          .filter((j) => DPA_PORTALS[j])
          .map((j) => ({ jurisdiction: j, portal: DPA_PORTALS[j] }));

        const report_data: Record<string, any> = {
          portals,
          enforcement_precedents: enforcement_context.slice(0, 5),
          enforcement_meta: enforcementMeta,
          annotations: parsedAnnotations,
          lint_warnings: lintWarnings,
          information_needed: Array.isArray((assembled as any)?.information_needed)
            ? (assembled as any).information_needed
            : [],
          generated_at: new Date().toISOString(),
        };
        try {
          const guarded = guardInformationNeeded(
            { ...report_data, playbook_text } as Record<string, unknown>,
            (body as unknown) as Record<string, unknown>,
          );
          report_data.information_needed = (guarded as any).information_needed ?? report_data.information_needed;
        } catch (e) {
          console.warn("[generate-ir-playbook] insufficient-info guard error:", e);
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

        await supabase
          .from("ir_playbooks")
          .update({
            client_id: body.client_id ?? null,
            organization_name: body.organizationName || null,
            status: "complete",
            intake_data: body,
            playbook_text,
            report_data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rowId);

        // L2 — observe-only citation lint (never blocks, never mutates output).
        observeCitations(
          supabase,
          "generate-ir-playbook",
          rowId,
          playbook_text,
          irSuppliedCitations,
        );

        await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "ir_playbooks", sourceRowId: rowId });
      } catch (bgErr) {
        console.error("[generate-ir-playbook] background error:", bgErr);
        try {
          await supabase
            .from("ir_playbooks")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", rowId);
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
