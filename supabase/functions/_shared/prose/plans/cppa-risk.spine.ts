// SPINE v5.3 ENCODE: CPPA Risk Assessment — THE MEMORANDUM REDESIGN,
// RESTRUCTURED PER DOC 143/144.
//
// RENDER LAW. The CEO-ratified Spine v5.2
// `CPPA_Risk_Assessment_Spine_v5.2_DRAFT_Memorandum_Redesign.docx` (ratified
// 2026-08-26, superseding the v5.0/v5.1 drafts and the v4.x line) remains
// this product's render law for every carried sentence. DOC 144 (2026-09-02,
// CEO-ratified via the doc 143 mockup) restructures the document around it:
//
//   * APPENDIX RESTRUCTURE (doc 143 §B) — Appendix D (Necessity &
//     Minimization Matrix) folds into the § 3.B body; Appendix G (CPPA
//     Submission Support Record) is RETIRED, its one unique element (the
//     fixed reporting-period aggregation list) moving onto the Agency
//     Submission Checklist page; the survivors re-letter A, B, C, then
//     old E→D (risk register), old F→E (ADMT record), old H→F (materials).
//   * LANDING RHYTHM — major sections open with a plain-question landing
//     line, rendered as its own paragraph prefixed "[Q] "; bare statutory
//     recitation openers are restructured into a reader-first sentence
//     followed by a run-in "Governing requirement." paragraph carrying the
//     ratified law sentence VERBATIM.
//   * CUSTOMER VOICE (§ 2.A) — the Company's recorded processing and
//     purpose render as a structured block of kind/surface
//     `customer_voice`: an attribution line and labeled Processing /
//     Purpose rows quoting the intake values verbatim.
//   * ENGINE COORDINATES — risk-factor-engine.ts continues to emit blocks
//     and tables in the v5.2.1 index space; the assembler translates them
//     into this spine's v5.3 indices through ENGINE_KEY_REMAP
//     (risk-skeleton-assemble.ts). Engine-owned sub-part openers (§ 3.B,
//     § 3.E, § 4.A) are composed engine-side, so their spine blocks are
//     generated slots here, not fixed prose.
//
// The v5.2 register rulings are unchanged and continue to govern:
//
//   * REGISTER — "on the information provided" / "the information the
//     Company provided" / "the Company's submission"; the "on the record /
//     the record shows / the Company's structured record" family is RETIRED
//     from customer-facing prose ("assessment record" survives only as the
//     regulation's own term for the retained artifact — § 7155(c),
//     Appendix F). Defined terms — the "Company", the "Activity", the
//     "Purpose" — introduced once in the Executive Summary, used bare after.
//   * TERMINOLOGY — "risk" (or "identified risk"), never "risk pathway",
//     in all customer-facing text (CEO redline ¶86/¶214). Ledger levels are
//     "levels", and the method section never states matrices, scoring
//     grids, or crediting principles in the abstract (confidential method).
//   * SHOW, DON'T ANNOUNCE — self-referential process commentary is cut;
//     the document demonstrates its discipline instead of claiming it
//     (redline deletions ¶83, ¶151, ¶181). Navigation sentences and
//     substantive legal assurances stay.
//   * DETERMINATION STRINGS — re-registered to the CEO's target wording
//     (redline ¶72); the determination LOGIC is unchanged and continues to
//     run exactly as ratified — it is simply no longer depicted.
//
// Every fixed-prose string in SKELETON_SECTIONS below is render law: nothing
// here may be reworded, re-punctuated or "improved" by code, by refinement,
// or by an agent. The conformance check byte-matches the assembled document
// against it outside the slots.
//
// Block kinds (unchanged contract with skeleton-render.ts, plus one):
//   "skeleton"    — FIXED PROSE. Byte-pinned. {slots} are the only mutable
//                   spans.
//   "lead"        — a single generated sentence bound to a typed
//                   determination; it may not disagree with the
//                   determination it states.
//   "generated"   — a composed block built from typed engine operands
//                   through the ratified branch templates (Annex T1–T6 and
//                   the per-block frames, carried by risk-factor-engine.ts).
//                   No model prose. NO-PADDING LAW: an uncomposed block is
//                   omitted entirely.
//   "conditional" — renders only when its trigger holds; composed from the
//                   RISK52_FIXED constants below plus the facts its trigger
//                   names. Otherwise omitted entirely.
//   "table"       — a rendered table supplied by the assembler/engine,
//                   keyed `${sectionId}:${i}`. Styling follows doc 72.
//   "customer_voice" — DOC 144: the § 2.A structured intake-quotation
//                   block. Composed by the assembler from the intake's own
//                   words (attribution line + labeled rows, one per line);
//                   the paragraph kind is the styling surface. NO-PADDING
//                   LAW: absent both quoted values, the block is omitted
//                   (and the fixed intro sentence drops with it via its
//                   slot).
//
// SPINE NOTE: section inclusion is driven by legal applicability and
// established facts, not by whether a factor happened to produce prose.

export const RISK_SKELETON_VERSION = "cppa-risk-v5.3-2026-09-02";
/** Prior encode stamps, retained for provenance. */
export const RISK_SKELETON_VERSION_V521 = "cppa-risk-v5.2.1-2026-08-30";
export const RISK_SKELETON_VERSION_V472 = "cppa-risk-v4.7.2-2026-08-25";
export const RISK_SKELETON_VERSION_V45 = "cppa-risk-v4.5-2026-08-21";
export const RISK_SKELETON_SOURCE_FILE =
  "CPPA_Risk_Assessment_Spine_v5.2_DRAFT_Memorandum_Redesign.docx";
export const RISK_SKELETON_PROVENANCE =
  "CPPA_Risk_Assessment_Spine_v5.2_DRAFT_Memorandum_Redesign.docx — the Memorandum Redesign, integrating the CEO's v5.0 redline; ratified 2026-08-26 (chat record of that date), superseding the v5.0/v5.1 drafts and the v4.x encode line. Companion analysis doc 71; presentation layer doc 72. DOC 144 (2026-09-02): the doc-143 structure redesign — appendix re-lettering (D folded into § 3.B, G retired, E→D, F→E, H→F), landing-rhythm restructure, the § 2.A customer-voice block, and the page-2 dashboard operands — ratified via the CEO-approved mockup of that date. The determination logic (materiality matrix, residual rule, benefit-weight table, § 7154 balancing table) is carried from the v4.x ratifications unchanged; the determination STRINGS remain the redline's target wording (¶72).";

/**
 * DOC 144 — CONTENT PIN (BASIS v1, the DPIA/Governance convention): SHA-256
 * over every `skeleton`-kind block's `text` in SKELETON_SECTIONS order,
 * joined with "\n" — i.e. over `RISK_PROTECTED_FIXED_PROSE.join("\n")` —
 * computed by RUNNING the digest (deno eval), never hand-derived, and
 * verified by the rk3-b pin test. This is the spine's first content-hash
 * pin; earlier encodes were pinned by version string only (the
 * RISK_SKELETON_VERSION_V* constants above carry that provenance).
 */
/** DOC 144 pin, superseded by DOC 148 (subjectAnchor frame correction in
 * Exec A — "describes those affected" → "identifies the subject of this
 * assessment"). Kept per the re-pin convention. */
export const RISK_SKELETON_CONTENT_HASH_V53 =
  "9d6b18fe7a1067da1ba468802797f0d6a74bd7f828aca836936932f40209fc5e";
// DOC 148 (2026-09-02) — computed by running the digest (deno eval), never
// hand-derived.
export const RISK_SKELETON_CONTENT_HASH =
  "a328a2bc72ebdc6cca06be321e4a6f5307d448e1262da8e920323d16805c2ea8";

// A-TEAM S3 RULING I.24 (doc 115, 2026-08-31) — cover titles follow the fleet
// Title Case convention (Batch 21a); ADMT's cover set the precedent. Cover
// bytes only; body content unchanged.
export const RISK_SKELETON_TITLE = "CPPA Privacy Risk Assessment";
export const RISK_SKELETON_SUBTITLE =
  "Prepared under 11 CCR §§ 7150–7157 for {entityName}";

/** The v3 register guide, carried forward. Authoring law; never printed. */
export const RISK_REGISTER_GUIDE =
  "Register guide (v5.2) - Counsel voice; the Company's facts always attributed; the Company's own words in quotation marks; no dramatization; every factual clause traces to an intake answer or a typed determination. Defined terms (the Company, the Activity, the Purpose) introduced once in the Executive Summary, used bare thereafter. One-place rule: each fact appears once in the body, where it does analytical work. Directional effect: every application paragraph states which way it weighs (T6 house forms). Attribution register: 'on the information provided' family; the 'record shows' family is retired ('assessment record' survives only as the regulation's own § 7155(c) term). Confidential method: results, never mechanics. Terminology: 'risk', never 'risk pathway'. Show, don't announce.";

export type SkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "conditional"
  | "rule"
  | "table"
  | "customer_voice";

export interface SkeletonBlock {
  readonly kind: SkeletonBlockKind;
  readonly text: string;
}

export interface SkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly SkeletonBlock[];
}

/**
 * FIXED PROSE FOR CONDITIONAL/GENERATED LEADS — v5.2, extended by DOC 144.
 * These strings are CEO prose exactly like the skeleton blocks; they live
 * here (not in the composer) so the spine file remains the single custody
 * point for customer-facing bytes. The engine/assembler composes each gated
 * block from these constants plus the facts its trigger names.
 */
export const RISK52_FIXED = {
  confidential:
    "CONFIDENTIAL. This assessment contains information concerning the Company’s processing activities, systems, safeguards, and internal decision-making. Distribution should be limited to persons with an appropriate business or legal need to review it.",

  // Executive Summary
  exec_triggers_lead:
    "On the information provided, the Activity engages the following trigger or triggers:",
  exec_triggers_none:
    "On the information provided, the Activity does not engage any of the significant-risk categories in 11 CCR § 7150(b); a risk assessment is not required for the Activity as described, and this report records that determination.",
  // PANEL RISK-P3 (2026-08-30): rewritten alongside the exec ledger's
  // compression — the old sentence promised the four-column ledger ("its
  // level before safeguards, the safeguard credited against it") that now
  // prints only in § 4.A.
  exec_ledger_intro:
    "Section 1 describes how this assessment reaches its conclusions; the table below summarises the result of applying it to the information provided by the Company — each identified risk and the risk that remains after the credited safeguards. The full ledger, including each risk’s level before safeguards and the safeguard credited against it, appears in § 4.A:",
  exec_determination_pointer:
    "The reasoning behind each row, and the determination it produces, appear in Section 4.",
  exec_outcome_head: "D. Outcome and Conditions.",
  conditions_compact_none: "No conditions attach to the determination.",

  // II — The Information Provided
  //
  // DOC 144 — the § 2.A customer-voice apparatus: the intro sentence is
  // slot-carried by the § 2.A head block (it drops when the block cannot
  // compose), and the attribution line's two forms live here. `{name}` is
  // the Company's recorded name, substituted by the assembler.
  customer_voice_intro:
    "The Company’s own statement of the processing and its purpose is recorded below and is quoted as given.",
  customer_voice_attribution: "In {name}’s words",
  customer_voice_attribution_fallback: "In the Company’s words",

  out_of_scope_lead:
    "The Company reports that the affected information is also processed for other activities not covered by this assessment:",
  out_of_scope_note:
    "Each requires its own analysis where a trigger applies, and no conclusion in this report extends to it.",
  operates_lead:
    "As the Company describes it, the processing runs as one sequence:",
  recipients_lead: "As provided by the Company:",
  recipients_none:
    "The Company reports that no service provider, contractor, or third party receives or can access the information for this Activity, and the disclosure surface is accordingly internal to the Company.",
  prior_head: "H. Prior Assessments and Who Provided the Information.",
  prior_lead:
    "The Company identifies an existing assessment relevant to the Activity:",
  prior_note:
    "Existing work may be relied on to the extent it contains the information this assessment requires; California-specific information not addressed there must still be supplied.",
  prior_none:
    "No prior assessment of this Activity is identified in the information provided.",
  providers_lead: "The information was provided by:",
  // A-TEAM DELTA (ChatGPT batch review, 2026-08-31, fleet P0-1) — "the intake"
  // is internal-implementation vocabulary; the customer-facing equivalent is
  // "the information supplied by the Company".
  // DOC 144 — appendix re-letter: the materials index is now Appendix F
  // (was H).
  providers_close:
    "This assessment rests on the information supplied by the Company and on the materials indexed in Appendix F. Where information needed for a material conclusion is missing or inconsistent, the report states the limitation rather than assuming a favorable answer.",

  // IV — the persuasive-authority body pointer (DOC 144, doc 143 §B row B):
  // ONE fixed cross-reference sentence in § 4, composed iff Appendix B
  // renders, pointing the reader to the appendix's Caution and preserving
  // its non-binding framing.
  persuasive_pointer:
    "For context, Appendix B collects enforcement outcomes reached under analogous data-protection law that bear on the factors weighed here; as the caution there explains, they are persuasive context only, bind neither the California Privacy Protection Agency nor any court applying California law, and no determination in this report rests on them.",

  // IV — Conditions block
  conditions_lead: "Conditions to Proceed.",
  conditions_close:
    "These are conditions of the determination, not optional recommendations.",
  // DOC 127 PART I (CEO-ratified 2026-08-31) — adverse-disposition variants.
  // A Do-Not-Proceed report heads its § 4.D conditions "Conditions for
  // Reassessment" (never "to Proceed"), states the path in an intro
  // sentence, and — where the stop requires Activity redesign (a critical
  // inherent risk no safeguard can cure) — says so without promising that
  // the conditions alone could change the determination.
  conditions_reassessment_lead: "Conditions for Reassessment.",
  conditions_reassessment_intro:
    "The Activity should not proceed in its present form. The following must be satisfied before the Activity is reconsidered for a different disposition.",
  conditions_reassessment_intro_redesign:
    "The Activity should not proceed in its present form. Because a critical-level privacy risk remains that no safeguard can reduce below the high-risk level, satisfying the conditions below will not, by itself, change the determination; a different disposition also requires modifying the Activity itself, as described in § 4.C.",
  conditions_close_redesign:
    "These conditions support a future reassessment; they do not, by themselves, change the determination.",
  // DOC 127 PART I — the Additional-Information-Required qualifier appended
  // to a determination whose balance omitted an unassessed named risk.
  band4_provisional:
    "This conclusion is provisional: it weighs only the risks that could be assessed on the information provided. At least one identified risk lacks the recorded likelihood or severity the balance requires, so the executive result is stated as “Additional Information Required” until the record is completed.",
  // DOC 142 (2026-09-02, CEO-ruled) — the wholly-absent-a5 incomplete-state
  // sentence: no risk row is recorded at all (distinct from doc 127's
  // named-but-unassessed case above), so no balance conclusion exists to
  // qualify; this standalone sentence composes IN PLACE OF a cell
  // conclusion, never appended to one.
  band4_provisional_no_risks:
    "No risk to consumers’ privacy is identified in the intake, so the substantive balance of benefits against risks is not determined. The executive result is stated as “Additional Information Required” until the identified information is completed.",
  follow_ups_lead: "Follow-Ups.",
  recommendations_lead: "Recommendations.",
  none_attach:
    "No conditions, follow-ups, or recommendations attach to the determination on the information provided.",

  // V — Governance (carried v4.7.2 leads, register-compatible)
  x_approval_head: "A. Approval and Accountability.",
  x_approval_reviewers:
    "The finalization record identifies the individuals who reviewed or approved the assessment:",
  x_approval_date_label: "Approval date:",
  x_approval_authority:
    "The finalization record confirms that at least one approver has authority to participate in deciding whether the covered processing will be initiated or continued:",
  x_approval_authority_basis: "Basis for the authority determination:",
  x_timing_post2026:
    "For covered processing initiated on or after January 1, 2026, the risk assessment should be completed before the processing is initiated.",
  x_timing_pre2026:
    "For covered processing initiated before January 1, 2026 and continuing afterward, the applicable transition deadline should be identified and tracked in the assessment record.",
  x_material_change_date_label: "Material change date:",
  x_material_change_desc_label: "Description of material change:",
  x_material_change_prior_label: "Prior risk-assessment date (if applicable):",

  // Appendix D (the risk register — old Appendix E) — DOC 144: the intro is
  // now a conditional (empty-register suppression, doc 143 §B): it composes
  // iff the register has at least one row, so a zero-risk record no longer
  // ships a full page carrying only this paragraph. Bytes carried verbatim
  // from the retired skeleton block, § 4.A reference unchanged.
  risk_register_appendix_intro:
    "This appendix provides the detailed factual register underlying § 4.A. For each identified risk, the register records the negative impact, personal information involved, relevant actor or event, source and cause, the Company’s likelihood and severity assessments, the level before safeguards, the relevant safeguards with their implementation status, and the remaining level. The mapping of risks to safeguards is an EUP analytical method designed to make the reasoning transparent and reviewable. It is not presented as a regulator-prescribed report format.",
} as const;

/**
 * DOC 144 — THE PAGE-2 DASHBOARD "WHAT THIS MEANS" SENTENCES. One fixed
 * sentence per disposition branch, derived STRICTLY from the disposition the
 * engine already computed — the assembler selects, never composes. Keys are
 * the engine's normalized ProcessingConsequence strings. The AIR sentence
 * reuses the doc-142 "does not yet support a processing decision /
 * in reliance on this assessment" language; the two stop sentences mirror
 * the doc-127 § 4.D intros; the conditions sentence states the
 * proceed-with-conditions branch's actual semantics (proceed subject to
 * conditions — suspension belongs only to the stop bands).
 */
export const RISK_PLAIN_MEANING: Readonly<Record<string, string>> = {
  "proceed":
    "the Activity may proceed as described on the information provided; no condition attaches to the determination.",
  "proceed with conditions":
    "the Activity may proceed while the conditions in § 4.D are completed; none requires suspending the processing.",
  "additional information required":
    "the information provided does not yet support a processing decision; the processing should not begin or continue in reliance on this assessment until the information identified in § 4.D is completed.",
  "do not proceed - remediable":
    "the Activity should not proceed in its present form; satisfying the Conditions for Reassessment in § 4.D is the path to a different disposition.",
  "do not proceed - redesign required":
    "the Activity should not proceed in its present form; because a critical-level risk remains that no safeguard can reduce below the high-risk level, a different disposition also requires modifying the Activity itself, as described in § 4.C.",
  "no processing decision required":
    "the processing is recorded as discontinued, so no processing decision is required; this assessment documents the Activity as conducted.",
};

/**
 * Legacy v4.x conditional-prose constants, retained for provenance and for
 * the carried Section 5 compositions that still read them. Superseded fields
 * are unused by the v5.2 assembly but keep their ratified bytes on file.
 */
export const RISK_FIXED = RISK52_FIXED;

export const SKELETON_SECTIONS: readonly SkeletonSection[] = [
  {
    id: "cover",
    // Doc 72 cover panel: two label/value tables ("Assessment Profile" as
    // the section head; the second table carries its own "Assessment
    // Result" title). The internal spine-version string lives in
    // Appendix F, not the cover (v5.2 cover note; letter per DOC 144).
    title: "Assessment Profile",
    blocks: [
      // 0 — Prepared for / Processing activity / Assessment date, with the
      // defined-term tags (the "Company", the "Activity").
      { kind: "table", text: "cover_summary" },
      // 1 — [CONDITIONAL: confidentiality designation] — RISK52_FIXED.confidential; no intake trigger exists yet, so never composed.
      { kind: "conditional", text: "[CONDITIONAL] CONFIDENTIALITY DESIGNATION - fixed text RISK52_FIXED.confidential; trigger: confidentiality designation on the engagement. Absent => omitted." },
      // 2 — Assessment Result panel: Assessment required / Inherent privacy
      // risk / Residual privacy risk / Assessment disposition — extended by
      // DOC 144 with the dashboard tallies (triggers engaged, risks
      // identified, benefits credited) and the fixed "What this means" line
      // (RISK_PLAIN_MEANING). A PROJECTION of the engine's own typed
      // determinations — never a new one. Tier and disposition values
      // render with the doc-72 badge treatment.
      { kind: "table", text: "exec_status_panel" },
    ],
  },
  {
    id: "executive_summary",
    // Hard budget: 1.5 pages. Conclusions and the compact ledger only;
    // verbatim intake text appears solely in the defined-term introductions
    // of A. Closes with the appendix-purpose sentence (CEO instruction).
    title: "Executive Summary",
    blocks: [
      // 0 — A. Activity Assessed: the defined-term introductions.
      // DOC 148 (2026-09-02, A-Team Batch-8 P2) — {subjectAnchor} is the
      // intake form's "one-line subject of this assessment" (subject_anchor),
      // NOT an affected-persons field; the old frame ("describes those
      // affected") mislabeled it, quoting a processing subject as a
      // population. The affected-consumer facts render in § 2.C from their
      // own fields.
      { kind: "skeleton", text: "A. Activity Assessed. The activity assessed is identified by the Company as follows: “{activityName}” (the “Activity”). The Company identifies the subject of this assessment as follows: “{subjectAnchor}”. The Company states the purpose of the Activity as follows: “{activityPurpose}” (the “Purpose”). This report assesses the Activity and the Purpose under 11 CCR §§ 7150–7157; it does not evaluate the Company’s privacy program or CCPA compliance generally." },
      // 1 — B. Why required (law sentence; always true).
      { kind: "skeleton", text: "B. Why a Risk Assessment Is Required. California requires a risk assessment before a business begins processing that falls within a significant-risk category enumerated in 11 CCR § 7150(b)." },
      // 2 — trigger_lines: one "— " line per engaged trigger with its
      // factual basis (bulleted by the renderer); uncertain triggers state
      // the unresolved element; none-engaged states the determination.
      { kind: "generated", text: "[GENERATED trigger_lines] RISK52_FIXED.exec_triggers_lead + one line per engaged trigger; uncertain-trigger and none-engaged branches per the v5.2 Exec B frame." },
      // 3 — BATCH 20b (Wave C4, doc 113 S6.1) — the trigger digest table
      // (Trigger | Engaged | Basis); the lead sentence stays in the block
      // above, and SS III.A keeps the full per-trigger analysis.
      { kind: "table", text: "exec_triggers" },
      // 4 — C. The Balancing Test (law sentence).
      { kind: "skeleton", text: "C. The Balancing Test. Where a trigger is engaged, 11 CCR §§ 7152 and 7154 require the Company to evaluate whether the privacy risks the Activity creates for consumers outweigh its benefits to the consumer, the business, other stakeholders, and the public, once safeguards are taken into account." },
      // 5 — ledger intro (conditional: composed iff the ledger renders).
      { kind: "conditional", text: "[CONDITIONAL] EXEC LEDGER INTRO - RISK52_FIXED.exec_ledger_intro; trigger: at least one identified risk. Absent => omitted." },
      // 6 — the compact ledger (same derivation as § 4.A's full ledger).
      { kind: "table", text: "exec_ledger" },
      // 7 — benefit strip: one sentence.
      { kind: "generated", text: "[GENERATED benefit_strip] One sentence: strongest benefit tier + category + how many of the four categories are supported by specific information." },
      // 8 — the determination, verbatim from the re-registered string table,
      // followed by the fixed pointer sentence.
      { kind: "lead", text: "[LEAD determination] The ratified determination conclusion for this outcome, verbatim (re-registered per redline ¶72), followed by RISK52_FIXED.exec_determination_pointer." },
      // 9 — D. Outcome and Conditions: the ratified recommended-outcome
      // sentence (consequence × processing status), verbatim.
      { kind: "generated", text: "[GENERATED recommended_outcome] RISK52_FIXED.exec_outcome_head + the ratified recommended-outcome sentence." },
      // 10 — compact conditions line (n + short labels) or the no-conditions
      // sentence.
      { kind: "generated", text: "[GENERATED conditions_compact] 'The determination depends on {n} Conditions to Proceed: {short labels}. The full conditions, follow-ups, and recommendations appear in § 4.D.' / RISK52_FIXED.conditions_compact_none." },
      // 11 — the appendix-purpose closer (CEO instruction). DOC 144: the
      // element-level necessity review left the appendices for § 3.B, so
      // the list no longer names it.
      { kind: "skeleton", text: "The appendices to this report preserve the complete supporting record behind this summary — the data inventory, the full risk and safeguard register, the automated-decisionmaking technical record, and the authorities relied on — so that any conclusion in this report can be traced to its source without lengthening the analysis itself." },
    ],
  },
  {
    id: "i_method",
    // Entirely fixed, well under half a page: each step states WHAT is done
    // in one sentence, never HOW (no crediting or weighing principles — the
    // per-risk and per-benefit paragraphs carry the reasoning case by case).
    // DOC 144: no landing question here — § 1 IS the method strip; a [Q]
    // line would announce what the strip already shows.
    title: "1. How This Assessment Decides",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. The Question. Sections 7152 and 7154 of 11 CCR frame a single question: do the privacy risks that this processing creates for consumers outweigh the benefits it produces for the consumer, the business, other stakeholders, and the public, once safeguards are taken into account? Section 7154 states the consequence directly: processing whose risks outweigh its benefits should be restricted or prohibited." },
      // 1
      { kind: "skeleton", text: "B. The EndUserPrivacy (EUP) Decision Logic. This assessment follows a five-step process to analyze whether the benefits of the Activity outweigh the risks it poses, after taking into account the safeguards the Company has implemented to mitigate those risks. It is based on the information provided by the Company." },
      // 2
      { kind: "skeleton", text: "Step 1 — Triggers. The Activity is tested against the significant-risk categories of § 7150(b); if none applies, no assessment is required and the analysis ends." },
      // 3
      { kind: "skeleton", text: "Step 2 — Necessity. Each element of personal information is measured for its processing necessity for the Activity (§ 7152(a)(2))." },
      // 4
      { kind: "skeleton", text: "Step 3 — Inherent risk. Each risk the Company identifies is weighted in terms of likelihood and severity." },
      // 5
      { kind: "skeleton", text: "Step 4 — Safeguard mitigation. The type and implementation status of the safeguards identified by the Company are assessed against the corresponding risks." },
      // 6
      { kind: "skeleton", text: "Step 5 — The balance. Each claimed benefit is weighed against the risks, as mitigated by safeguards, and the assessment is rendered." },
      // 7
      { kind: "skeleton", text: "C. Qualitative Refinement. Any additional information provided by the Company is qualitatively applied to the measurements and assessments described above, so that a more refined assessment is rendered." },
    ],
  },
  {
    id: "ii_information",
    // Facts stated once; recipients and retention as tables; the providers
    // list appears once. Budget ~3 pages.
    //
    // DOC 144 LAYOUT NOTE: this section's indices moved (landing line,
    // customer-voice block, Governing-requirement restructures, the § 2.D
    // canonical-mapping sentence). The engine still emits v5.2.1 indices;
    // ENGINE_KEY_REMAP in risk-skeleton-assemble.ts translates.
    title: "2. The Information Provided",
    blocks: [
      // 0 — DOC 144 landing line (mockup text, CEO-approved).
      { kind: "skeleton", text: "[Q] What is being processed, about whom, and why — in the Company’s own words." },
      // 1 — A head + reader-first sentence (carried v5.2 sentence) + the
      // slot-carried customer-voice intro (drops when the block cannot
      // compose).
      { kind: "skeleton", text: "A. Purpose and Scope. The Purpose, as the Company states it in the Executive Summary, governs every analysis that follows. {customerVoiceIntro}" },
      // 2 — DOC 144: the customer-voice block (attribution + Processing /
      // Purpose rows, quoted verbatim). Composed by the assembler.
      { kind: "customer_voice", text: "[CUSTOMER_VOICE] Attribution line (RISK52_FIXED.customer_voice_attribution over the Company's recorded name, fallback form when absent) + 'Processing.' / 'Purpose.' labeled rows quoting primary_activity_name / primary_activity_purpose verbatim. Absent both => omitted, and the § 2.A intro slot drops." },
      // 3 — Governing requirement (the § 7152(a)(1) law sentence, VERBATIM
      // from the v5.2 § 2.A opener).
      { kind: "skeleton", text: "Governing requirement. Section 7152(a)(1) requires the assessment to state the Company’s purpose with enough specificity to evaluate the processing; generic purposes such as “improve our services” or “security purposes” do not suffice." },
      // 4 — purpose_specificity: one sentence, two branches (the post-block
      // specific-vs-generic determination; engine ii_information:1).
      { kind: "generated", text: "[GENERATED purpose_specificity] Confirmed / not-confirmed branches per the v5.2 § 2.A frame. Engine key ii_information:1." },
      // 5 — scope (law; opener is already reader-first).
      { kind: "skeleton", text: "This assessment covers processing undertaken for the Purpose. Section 7156 permits one assessment to cover a comparable set of activities only when they are similar and present similar privacy risks; a materially different purpose requires its own assessment." },
      // 6 — out-of-scope branch (engine ii_information:3).
      { kind: "conditional", text: "[CONDITIONAL] OUT-OF-SCOPE PROCESSING - trigger: the Company reports other activities touching the affected information. RISK52_FIXED.out_of_scope_lead + verbatim + RISK52_FIXED.out_of_scope_note. Absent => omitted. Engine key ii_information:3." },
      // 7 — B head + reader-first sentence (DOC 144 restructure).
      { kind: "skeleton", text: "B. How the Processing Operates. This part records the processing end to end, as the Company itself describes it." },
      // 8 — Governing requirement (the § 7152(a)(3)(A) law sentence,
      // VERBATIM from the v5.2 § 2.B opener).
      { kind: "skeleton", text: "Governing requirement. Section 7152(a)(3)(A) requires the report to identify how the Company collects, uses, discloses, retains, and otherwise processes the information, together with its sources." },
      // 9 — operational_sequence (engine ii_information:5).
      { kind: "generated", text: "[GENERATED operational_sequence] RISK52_FIXED.operates_lead + Entry. / Stages. / Output. labeled runs, quoted verbatim; honest-incompleteness branch. Engine key ii_information:5." },
      // 10 — C. Consumers and the Interaction (engine ii_information:6).
      { kind: "generated", text: "[GENERATED consumer_context] Method, interaction purpose, approximate California scale, population class; dependency branch per the v5.2 § 2.C frame. Engine key ii_information:6." },
      // 11 — D. Personal Information and Sensitivity (engine ii_information:7).
      { kind: "generated", text: "[GENERATED information_profile] Category count + list; SPI branch; Appendix C pointer. Engine key ii_information:7." },
      // 12 — DOC 144 (doc 143 §B row C): the § 2.D canonical-mapping
      // sentence, slot-fed from the same derivation Appendix C tabulates.
      { kind: "skeleton", text: "For reference against the statutory taxonomy, each personal-information category the Company identifies is mapped to its canonical California category as follows: {canonicalCaMapping}." },
      // 13 — E. Sources (engine ii_information:8).
      { kind: "generated", text: "[GENERATED sources_analysis] Source categories with their analytical consequences woven, per the v5.2 § 2.E frame. Engine key ii_information:8." },
      // 14 — F head + reader-first sentence (the carried v5.2 consequence
      // sentence, promoted to the opener; DOC 144 restructure).
      { kind: "skeleton", text: "F. Recipients and Disclosures. A disclosure can change the risk profile because another organization may use, secure, retain, or further disclose the information." },
      // 15 — Governing requirement (the § 7152(a)(3)(F) law sentence,
      // VERBATIM from the v5.2 § 2.F opener).
      { kind: "skeleton", text: "Governing requirement. Section 7152(a)(3)(F) requires the report to identify the service providers, contractors, and third parties that receive or can access the information, with the purpose of each disclosure." },
      // 16 — recipients lead / none-branch (engine ii_information:10).
      { kind: "conditional", text: "[CONDITIONAL] RECIPIENTS LEAD - RISK52_FIXED.recipients_lead iff recipient rows exist; RISK52_FIXED.recipients_none otherwise. Engine key ii_information:10." },
      // 17 — recipients table (engine ii_information:11).
      { kind: "table", text: "recipients" },
      // 18 — recipient consequences (engine ii_information:12).
      { kind: "generated", text: "[GENERATED recipient_consequences] Contract-gap and dependency sentences per the v5.2 § 2.F frame. Absent => omitted. Engine key ii_information:12." },
      // 19 — G head + reader-first sentence (DOC 144 restructure).
      { kind: "skeleton", text: "G. Retention. How long the information is kept determines how long each risk this report identifies remains live." },
      // 20 — Governing requirement (the § 7152(a)(3)(B) law sentence,
      // VERBATIM from the v5.2 § 2.G opener).
      { kind: "skeleton", text: "Governing requirement. Section 7152(a)(3)(B) requires the report to identify how long each category of personal information will be retained or, if the period is not known, the criteria used to determine it." },
      // 21 — retention table (engine ii_information:14).
      { kind: "table", text: "retention" },
      // 22 — retention basis sentence (engine ii_information:15).
      { kind: "generated", text: "[GENERATED retention_basis] The Company's stated basis, quoted, + the connection-to-Purpose sentence with its qualified branch. Engine key ii_information:15." },
      // 23 — H. Prior assessments (engine ii_information:16).
      { kind: "generated", text: "[GENERATED prior_assessments] RISK52_FIXED.prior_head + reported/absent branches. Engine key ii_information:16." },
      // 24 — providers (law; carried unchanged — a compound identification
      // requirement serving as a bridge, not a bare recitation opener).
      { kind: "skeleton", text: "Sections 7151 and 7152(a)(8) require the assessment to identify the individuals who provided information for it (legal counsel excepted) and to include employees whose job duties involve the covered processing." },
      // 25 — record_providers (engine ii_information:18).
      { kind: "generated", text: "[GENERATED record_providers] RISK52_FIXED.providers_lead + consolidated list + external participants + RISK52_FIXED.providers_close. Engine key ii_information:18." },
    ],
  },
  {
    id: "iii_analysis",
    // DOC 144 LAYOUT NOTE: indices moved (landing line, § 3.A/§ 3.C
    // restructures, the § 3.B fold-in). Engine emits v5.2.1 indices;
    // ENGINE_KEY_REMAP translates. The § 3.B and § 3.E openers are
    // ENGINE-composed (necessity landing at engine key iii_analysis:3, ADMT
    // intro at iii_analysis:14) and carry their law sentences verbatim
    // engine-side.
    title: "3. Analysis",
    blocks: [
      // 0 — DOC 144 landing line.
      { kind: "skeleton", text: "[Q] Does the Company’s account satisfy each element the regulation tests?" },
      // 1
      { kind: "skeleton", text: "Each part of this section applies one element of the regulatory test to the information provided by the Company: the rule first, then the facts read against the rule’s own language, then the conclusion." },
      // 2 — A head + reader-first sentence (DOC 144 restructure).
      { kind: "skeleton", text: "A. The Triggers, Applied. The threshold question is whether the Activity falls within a category the regulation treats as presenting significant risk to consumers’ privacy." },
      // 3 — Governing requirement (the § 7150(b) law sentence, VERBATIM from
      // the v5.2 § 3.A opener).
      { kind: "skeleton", text: "Governing requirement. Section 7150(b) enumerates the processing activities that present significant risk to consumers’ privacy." },
      // 4 — T3 paragraphs (engine iii_analysis:2).
      { kind: "generated", text: "[GENERATED trigger_application] One paragraph per engaged trigger (Annex T3); uncertain and none-engaged branches. Engine key iii_analysis:2." },
      // 5 — DOC 144 (doc 143 §B row D): the § 3.B opener is engine-composed
      // (head + landing question + reader-first sentence + the § 7152(a)(2)
      // law sentence VERBATIM as a Governing-requirement paragraph +, on a
      // zero-element record, the honest inline posture). The retired
      // "appears in Appendix D" pointer does not return.
      { kind: "generated", text: "[GENERATED necessity_landing] § 3.B head + [Q] + reader-first + Governing requirement (§ 7152(a)(2) verbatim); zero-element honest branch. Engine key iii_analysis:3." },
      // 6 — the element-level necessity determinations table, folded in from
      // the retired Appendix D (engine tables iii_analysis:4; surface
      // necessity_matrix). Zero rows => omitted (no empty grid).
      { kind: "table", text: "necessity_matrix" },
      // 7 — supported + unsupported/unresolved element paragraphs (Annex
      // T4; both share engine key iii_analysis:5).
      { kind: "generated", text: "[GENERATED necessity_supported + necessity_unsupported] Supported elements grouped with because-clauses; one paragraph per unsupported element; unresolved-element sentences (Annex T4). Engine key iii_analysis:5." },
      // 8 — the necessity lead (engine iii_analysis:6).
      { kind: "lead", text: "[LEAD necessity_conclusion] Supports / qualified branches with the § 4 directional close. Engine key iii_analysis:6." },
      // 9 — C head + reader-first sentence (the carried v5.2 closing
      // sentence, promoted to the opener; "therefore" dropped with the
      // reorder; DOC 144 restructure).
      { kind: "skeleton", text: "C. Transparency, Expectations, and Choice Architecture. What consumers are told, what they would reasonably expect, and what they can practically refuse shape the weight of every risk this processing carries." },
      // 10 — Governing requirement (the three law clauses, VERBATIM from
      // the v5.2 § 3.C opener).
      { kind: "skeleton", text: "Governing requirement. Section 7152(a)(3)(E) requires the report to identify the disclosures the Company has made or plans to make; § 7152(a)(5)(C) treats insufficient information that prevents an informed choice, and interference with choices consistent with reasonable expectations, as privacy harms; § 7152(a)(5)(D) reaches coercion and dark patterns." },
      // 11 — notice posture woven (engine iii_analysis:8).
      { kind: "generated", text: "[GENERATED notice_application] The notice posture woven against the processing it covers and fails to cover; planned-disclosure branch. Engine key iii_analysis:8." },
      // 12 — expectations woven (engine iii_analysis:9).
      { kind: "generated", text: "[GENERATED expectation_application] Engaged expectation markers woven with the notice posture; directional close. Engine key iii_analysis:9." },
      // 13 — choice architecture, branch-complete (engine iii_analysis:10).
      { kind: "generated", text: "[GENERATED choice_architecture] Confirmed facts credited; unconfirmed facts as live interference risks; none-confirmed branch pointed at § 4.D. Engine key iii_analysis:10." },
      // 14 — D (law; opener is already reader-first — carried unchanged).
      { kind: "skeleton", text: "D. Practical Consumer Control. A consumer right reduces risk only where the consumer can use it in practice and exercising it meaningfully changes the processing. This is distinct from the safeguard-by-safeguard credit shown against each risk in the ledger below (§ 4.A): a control here is a data-subject right; a safeguard there is a technical or organizational measure mapped to one specific identified risk. A right can be fully exercisable while no safeguard has been credited against a given risk, without contradiction." },
      // 15 — controls table (engine iii_analysis:12).
      { kind: "table", text: "controls" },
      // 16 — controls application (engine iii_analysis:13).
      { kind: "generated", text: "[GENERATED controls_application] Weak-control paragraph / favorable branch, with the § 4.D recommendation pointer. Engine key iii_analysis:13." },
      // 17 — E. ADMT — engine-composed opener (head + reader-first +
      // Governing requirement iff ADMT; the one-line not-applicable record
      // otherwise, so the D→F lettering never shows an unexplained gap).
      // Engine key iii_analysis:14.
      { kind: "conditional", text: "[CONDITIONAL] ADMT INTRO - trigger: ADMT in the Activity. Engine-composed § 3.E opener (reader-first + Governing requirement, law verbatim); absent => the one-line not-applicable record. Engine key iii_analysis:14." },
      // 18 — role woven (engine iii_analysis:15).
      { kind: "generated", text: "[GENERATED admt_role] Role classification woven with the operational fact; the operative-questions close. Engine key iii_analysis:15." },
      // 19 — human review, three-element credit pattern (engine iii_analysis:16).
      { kind: "generated", text: "[GENERATED admt_human_review] Confirmed/unconfirmed elements woven; credited only to the confirmed extent. Engine key iii_analysis:16." },
      // 20 — testing + logic + training (engine iii_analysis:17).
      { kind: "generated", text: "[GENERATED admt_testing] Testing woven with its limits; logic-reliance and training-data provenance each get one sentence with the ADMT-appendix pointer. Engine key iii_analysis:17." },
      // 21 — the ADMT lead (engine iii_analysis:18).
      { kind: "lead", text: "[LEAD admt_conclusion] Adequately-described conclusion with the § 4 carriage and any noted limits. Engine key iii_analysis:18." },
      // 22 — F (law; the identification lead is inseparable from its colon
      // list, so this opener is carried unchanged — DOC 144 per-instance
      // judgment).
      { kind: "skeleton", text: "F. Benefits. Section 7152(a)(4) requires the assessment to identify the benefits the processing produces for the consumer, the business, other stakeholders, and the public — and it rejects generic benefit descriptions. Here, the Company has identified the following benefits:" },
      // 23 — T2 paragraphs, branch-complete (engine iii_analysis:20).
      { kind: "generated", text: "[GENERATED benefit_paragraphs] One paragraph per category (Annex T2). NO restatement list follows. Engine key iii_analysis:20." },
      // 24 — the benefits lead (engine iii_analysis:21).
      { kind: "lead", text: "[LEAD benefits_conclusion] Strongest-benefit tier with the § 4.C carriage. Engine key iii_analysis:21." },
    ],
  },
  {
    id: "iv_determination",
    // DOC 144 LAYOUT NOTE: the § 4.A opener is ENGINE-composed (engine key
    // iv_determination:0 — head + landing question + reader-first sentence +
    // Governing requirement with the law verbatim + the gated register
    // pointer / zero-risk posture). The section-level landing question rides
    // in that opener, so no separate spine [Q] block precedes it. The only
    // index moves are after the determination (the DOC 144 Appendix B
    // pointer at index 10 shifts §4.D by one).
    title: "4. The Balance and the Determination",
    blocks: [
      // 0 — § 4.A opener (engine iv_determination:0).
      { kind: "generated", text: "[GENERATED risk_ledger_landing] § 4.A head + [Q] + reader-first + Governing requirement (§§ 7152(a)(5)–(6) verbatim) + gated register pointer / zero-risk posture. Engine key iv_determination:0." },
      // 1 — the ledger (findings table; no numerals, no totals, no summary
      // row — doc 72 guardrail; DOC 144 widens it with the Company's
      // recorded Likelihood and Severity columns). Engine iv_determination:1.
      { kind: "table", text: "risk_ledger" },
      // 2 — T1 paragraphs, one per risk, in ledger order; interacting-risks
      // and no-credible-path closers (engine iv_determination:2).
      { kind: "generated", text: "[GENERATED risk_paragraphs] One paragraph per risk from the four-branch Annex T1 template; interacting-risks sentence; no-credible-path sentence. Engine key iv_determination:2." },
      // 3 — the rollup (engine iv_determination:3).
      { kind: "generated", text: "[GENERATED risk_rollup] Two sentences: most serious level before safeguards; most serious remaining level after the credits shown. Engine key iv_determination:3." },
      // 4 — B (law).
      { kind: "skeleton", text: "B. What Weighs For, and What Weighs Against. The considerations below are those reached in Sections II and III and the ledger above — stated here by reference, in one place, so the balance can be read whole." },
      // 5 — reference list, favorable (engine iv_determination:5).
      { kind: "generated", text: "[GENERATED factors_for] Reference list, one line each, no restatement. Engine key iv_determination:5." },
      // 6 — reference list, adverse (engine iv_determination:6).
      { kind: "generated", text: "[GENERATED factors_against] Reference list, one line each, only where each state is engaged. Engine key iv_determination:6." },
      // 7 — C (law).
      { kind: "skeleton", text: "C. The Determination. The determination weighs the strongest benefit established (§ 3.F) against the most serious risk remaining (§ 4.A), on the information provided and nothing else:" },
      // 8 — the fact-specific balance summary (CEO-approved form; design per
      // doc 72 — NOT a grid or matrix), with the determination band.
      // Engine iv_determination:8.
      { kind: "table", text: "balance_summary" },
      // 9 — the ratified determination text, verbatim, in order: conclusion
      // · materiality · effect · explanation · recommended outcome.
      // Rendered here once; nothing else in the body restates it.
      // Engine iv_determination:9.
      { kind: "generated", text: "[GENERATED determination_text] The re-registered determination strings for this outcome, verbatim, plus the recommended-outcome sentence (Annex T5). Engine key iv_determination:9." },
      // 10 — DOC 144 (doc 143 §B row B): the one fixed Appendix B
      // cross-reference sentence, composed iff Appendix B renders.
      { kind: "conditional", text: "[CONDITIONAL] PERSUASIVE-AUTHORITY POINTER - RISK52_FIXED.persuasive_pointer iff Appendix B attaches at least one precedent row. Absent => omitted." },
      // 11 — D (law).
      { kind: "skeleton", text: "D. Conditions, Follow-Ups, and Recommendations. The determination above depends on the conditions stated here; the follow-ups complete the information provided; the recommendations strengthen the posture without conditioning the determination." },
      // 12 — conditions, numbered, with the fixed closer (engine iv_determination:11).
      { kind: "generated", text: "[GENERATED conditions] RISK52_FIXED.conditions_lead + numbered conditions + RISK52_FIXED.conditions_close. Absent => omitted. Engine key iv_determination:11." },
      // 13 — follow-ups, numbered (engine iv_determination:12).
      { kind: "generated", text: "[GENERATED follow_ups] RISK52_FIXED.follow_ups_lead + numbered follow-ups. Absent => omitted. Engine key iv_determination:12." },
      // 14 — recommendations, numbered (engine iv_determination:13).
      { kind: "generated", text: "[GENERATED recommendations] RISK52_FIXED.recommendations_lead + numbered recommendations. Absent => omitted. Engine key iv_determination:13." },
      // 15 — none-attach line when 12–14 are all absent (engine iv_determination:14).
      { kind: "conditional", text: "[CONDITIONAL] NONE ATTACH - RISK52_FIXED.none_attach iff no condition, follow-up, or recommendation composed. Engine key iv_determination:14." },
    ],
  },
  {
    id: "v_governance",
    // DOC 144 LAYOUT NOTE: indices moved (landing line + the § 5.B/§ 5.C/
    // § 5.D Governing-requirement restructures). Engine emits v5.2.1
    // indices for its three blocks; ENGINE_KEY_REMAP translates. § 5.E is
    // carried unchanged: its statutory sentences are interleaved with the
    // certification fact slots, so a restructure would splice ratified law
    // text around live slots — DOC 144 per-instance judgment.
    title: "5. Governance, Review, and Submission",
    blocks: [
      // 0 — DOC 144 landing line.
      { kind: "skeleton", text: "[Q] Who approved this assessment, when must it be revisited, and what must be submitted to the regulator?" },
      // 1 — A. Approval and Accountability (carried composition; assembler).
      { kind: "conditional", text: "[CONDITIONAL] APPROVAL AND ACCOUNTABILITY - trigger: any finalization/approval fact present. RISK52_FIXED.x_approval_* over those facts. Absent => omitted." },
      // 2 — approval sufficiency / follow-up (engine v_governance:1).
      { kind: "generated", text: "[GENERATED approval_analysis] Sufficiency conclusion / outstanding-authority follow-up. Engine key v_governance:1." },
      // 3 — B head + reader-first sentence + the status/date facts (DOC 144
      // restructure; slots carried from the v5.2 block).
      { kind: "skeleton", text: "B. Timing and the Applicable Deadline. Whether this assessment is timely depends on when the covered processing began or will begin. Processing status: {processingStatus}. Actual start date: {processingStartDate}. Planned start date: {plannedStartDate}." },
      // 4 — Governing requirement (the §§ 7155(a)(1)/(b) law sentences,
      // VERBATIM from the v5.2 § 5.B opener).
      { kind: "skeleton", text: "Governing requirement. Section 7155(a)(1) requires a risk assessment before the Company initiates processing that falls within § 7150(b). Section 7155(b) gives businesses until December 31, 2027 to complete assessments for covered processing begun before the regulations’ effective date and continuing afterward." },
      // 5 — timing rule + deadline (carried; assembler).
      { kind: "conditional", text: "[CONDITIONAL] TIMING RULE AND DEADLINE - trigger: processing status/start date established. RISK52_FIXED.x_timing_* + the derived deadline. Absent => omitted." },
      // 6 — C head + reader-first sentence + the material-change facts
      // (DOC 144 restructure; slots carried from the v5.2 block).
      { kind: "skeleton", text: "C. Review Cadence and Material Changes. An assessment is not static: it must be revisited on a schedule, and sooner where the processing materially changes. Material change since prior assessment: {materialChange}. Next scheduled review: {nextReviewDate}." },
      // 7 — Governing requirement (the §§ 7155(a)(2)–(3) law sentences,
      // VERBATIM from the v5.2 § 5.C opener).
      { kind: "skeleton", text: "Governing requirement. Section 7155(a)(2) requires review at least once every three years. Section 7155(a)(3) requires an earlier update whenever a material change creates new negative impacts, increases the magnitude or likelihood of existing impacts, or diminishes safeguard effectiveness; that update is due as soon as feasible and no later than 45 calendar days after the material change." },
      // 8 — material change details (carried; assembler).
      { kind: "conditional", text: "[CONDITIONAL] MATERIAL CHANGE DETAILS - trigger {material_change_since_prior}=Yes. RISK52_FIXED.x_material_change_* labels over the intake facts. Absent => omitted." },
      // 9 — review-cadence conclusion (engine v_governance:6).
      { kind: "generated", text: "[GENERATED review_cadence] Material-change state and next scheduled review, concluded. Engine key v_governance:6." },
      // 10 — D head + reader-first sentence (DOC 144 restructure; “assessment
      // record” is the regulation’s own term and survives the register rule
      // here).
      { kind: "skeleton", text: "D. Retention of the Assessment Record. This report and its supporting materials are themselves records the Company must keep." },
      // 11 — Governing requirement (the § 7155(c) law sentence, VERBATIM
      // from the v5.2 § 5.D opener).
      { kind: "skeleton", text: "Governing requirement. Section 7155(c) requires the Company to retain original and updated risk assessments for as long as the processing continues or for five years after completion of the assessment, whichever is later." },
      // 12 — the derived retention rule + the carried supporting-materials
      // sentence (slots carried from the v5.2 block; sits AFTER the
      // Governing requirement so the rule's own "the later-of rule above"
      // reference stays true).
      { kind: "skeleton", text: "{retentionEndRule}. Supporting materials should be retained with the assessment where they are material to a finding, safeguard, or decision." },
      // 13 — E (carried composition, slots; unchanged — see layout note).
      { kind: "skeleton", text: "E. CPPA Submission Support (§ 7157). Section 7157 requires businesses to submit specified risk-assessment information to the Agency on the regulatory schedule rather than routinely submitting each full assessment. For assessments conducted in 2026 and 2027, the first submission is due April 1, 2028; later submissions are due by April 1 following a year in which assessments were conducted. The submission includes business/contact information, the reporting period, counts and categories of assessments, PI/SPI categories, an attestation, and the submitting executive’s name, title, and certification date. The submitting individual must be an executive-management member who is directly responsible for risk-assessment compliance, sufficiently knowledgeable, and authorized to submit. The Agency or Attorney General may separately require the Company to submit its full risk-assessment reports, which must be provided within 30 calendar days of the request. Certifying executive: {certExecName}, {certExecTitle}. Phone: {certContactPhone}. Email: {certContactEmail}. Executive-management status: {certifierIsExec}. Direct responsibility: {certifierResponsible}. Sufficient knowledge: {certifierKnowledge}. Authorized to submit: {certifierAuthorized}. Business point of contact: {submissionContact}." },
      // 14 — certifying-executive eligibility (engine v_governance:9).
      { kind: "generated", text: "[GENERATED certifying_executive_eligibility] Eligibility criteria confirmed / gap named. Engine key v_governance:9." },
      // 15 — BATCH 20b (Wave C4, doc 113 S6.3) — the Key Dates and Deadlines
      // digest: the derived timing values plus the statutory windows the
      // pinned SS V prose itself states. The prose is untouched.
      { kind: "table", text: "key_dates" },
    ],
  },
  // Signature pages — CARRIED v4.7.1/v4.7.2 byte-identical.
  {
    id: "review_and_approval",
    title: "Review and Approval",
    blocks: [
      // 0
      { kind: "skeleton", text: "This risk assessment was prepared from the information the Company supplied and is retained in accordance with 11 CCR § 7155(c). The individuals below reviewed this assessment as of the date indicated." },
      // 1
      { kind: "table", text: "review_approval_signatures" },
    ],
  },
  {
    id: "agency_submission_checklist",
    title: "Agency Submission Checklist (11 CCR § 7157)",
    blocks: [
      // 0
      { kind: "skeleton", text: "If this risk assessment is subject to the submission requirement under 11 CCR § 7157(a), a member of the Company’s executive management team who meets the qualifications of 11 CCR § 7157(c) must submit the following information to the California Privacy Protection Agency (“CPPA”) through the Agency’s website at https://cppa.ca.gov/ (11 CCR § 7157(d)). This report does not submit this information on the Company’s behalf — that step must be completed separately, by that individual, on the Agency’s site." },
      // 1
      { kind: "table", text: "agency_submission_checklist" },
      // 2 — DOC 144 (doc 143 §B row G): the fixed reporting-period
      // aggregation list, moved here from the retired Appendix G — the one
      // element of that appendix not already printed elsewhere.
      { kind: "table", text: "business_level_submission_outstanding" },
      // 3
      { kind: "skeleton", text: "The submitting executive must additionally attest, on the Agency’s portal, to the following statement required by § 7157(b)(5): \"I attest that the business has conducted a risk assessment for the processing activities set forth in California Code of Regulations, Title 11, section 7150, subsection (b), during the time period covered by this submission, and that I meet the requirements of section 7157, subsection (c). Under penalty of perjury under the laws of the state of California, I hereby declare that the risk assessment information submitted is true and correct.\" No signature is required for this step — it is completed as an online attestation, not a signed document." },
    ],
  },
  {
    // Appendix A — UNCHANGED role (doc 46 pattern); rows cite v5.2 section
    // numbers. Section id kept as "table_of_authorities": generate-report-pdf
    // forces a fresh page on this id across every SO spine.
    id: "table_of_authorities",
    title: "Appendix A — Factor, Determination, and Authority Matrix",
    blocks: [
      // 0
      { kind: "skeleton", text: "The table below identifies the factors analyzed in this assessment, the determinations made for each factor based on the information provided, and the corresponding controlling authority." },
      // 1
      { kind: "table", text: "factor_authority_matrix" },
    ],
  },
  {
    // Appendix B — Persuasive Authority (UNCHANGED; S5 surface, fed from the
    // Risk CAM by pure attachment). Section id kept for the corpus wiring.
    // DOC 144 adds the one fixed § 4 body pointer (iv_determination:10).
    id: "appendix_i",
    title: "Appendix B — Persuasive Authority (Analogous Enforcement)",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] PERSUASIVE AUTHORITY LEAD - composed by the assembler iff at least one CAM precedent row attaches for this report's fired trigger states. Absent => the whole appendix is omitted." },
      // 1
      { kind: "table", text: "persuasive_authority_matrix" },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] ADVERSE-OUTCOME WARNING - composed by the assembler iff the AOW row's bound adverse state fired. Absent => omitted." },
      // 3-4 — DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01):
      // a second, separately-labeled block within the same appendix, present
      // only when the corpus term-match finds something NOT already
      // attached above (no-padding law).
      { kind: "conditional", text: "[CONDITIONAL] ADVISORY CORPUS SURFACING - the ratified preamble (advisory-surfacing.ts's ADVISORY_APPENDIX_PREAMBLE), present only when the term-match table below has rows." },
      { kind: "table", text: "advisory_corpus_matches" },
    ],
  },
  {
    // Appendix C — SLIMMER role note: body §§ 2.F–G carry recipients and
    // retention; C keeps the full per-category detail.
    id: "appendix_a",
    title: "Appendix C — Processing and Data Inventory",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix contains the detailed factual inventory supporting Section 2, including personal-information and sensitive-personal-information categories, sources, processing methods, consumer interaction, scale, disclosures, recipients, and category-level retention." },
      // 1
      { kind: "table", text: "processing_and_data_inventory" },
    ],
  },
  // DOC 144: the former Appendix D (Necessity and Minimization Matrix,
  // section id "appendix_b") is RETIRED as an appendix — its table renders
  // inside § 3.B (iii_analysis:6) and its intro's analytical content is
  // carried by the engine's § 3.B landing block.
  {
    // Appendix D (was E) — SLIMMER: structured fields only; § 4.A carries
    // all analysis prose. DOC 144: intro is conditional (empty-register
    // suppression) — on a zero-risk record the whole section drops and the
    // § 4.A opener states the posture inline.
    id: "appendix_c",
    title: "Appendix D — Privacy Risk Register and Safeguard Mapping",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] RISK REGISTER INTRO - RISK52_FIXED.risk_register_appendix_intro iff the register below has at least one row. Absent => the whole appendix is omitted (empty-register suppression, doc 143 §B)." },
      // 1
      { kind: "table", text: "risk_and_safeguard_register" },
    ],
  },
  {
    // Appendix E (was F) — GAINS the verbatim system/logic/assumptions/
    // training-data text leaving § 3.E (the technical-facts table below
    // carries it).
    id: "appendix_d",
    title: "Appendix E — ADMT Technical and Decision Record",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] ADMT APPENDIX INTRO - trigger: ADMT applicable. Fixed intro; absent => the one-line not-applicable record, so the fixed appendix lettering never shows an unexplained gap." },
      // 1
      { kind: "table", text: "admt_technical_facts" },
      // 2
      { kind: "generated", text: "[GENERATED admt_technical_analysis] Analytical note over the preserved record areas. Absent => omitted." },
    ],
  },
  // DOC 144: the former Appendix G (CPPA Submission Support Record, section
  // id "appendix_e") is RETIRED — its per-assessment rows already print in
  // Exec B, § 2.D, § 5.E and on the Agency Submission Checklist page, and
  // its one unique element (the reporting-period aggregation list) moved to
  // that checklist page (agency_submission_checklist:2).
  {
    // Appendix F (was H) — UNCHANGED + one line recording the assessment
    // engine version (moved off the cover per the v5.2 cover note).
    id: "appendix_f",
    title: "Appendix F — Materials Considered",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix lists the documents, technical materials, policies, contracts, assessments, and other factual materials identified or relied on for this assessment. Inclusion means the material formed part of the assessment record; it does not mean every statement was independently verified." },
      // 1
      { kind: "table", text: "materials_considered_index" },
    ],
  },
];

/** Every byte-pinned fixed-prose string, in document order. Splice-barred. */
export const RISK_PROTECTED_FIXED_PROSE: readonly string[] = SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * REGISTER BANS — the v3 family carried forward, extended by the v5.2
 * retirements: the "structured record" family and "risk pathway" are out of
 * customer-facing prose ("assessment record" is exempt — it is the
 * regulation's own § 7155(c) term and appears only in that role).
 */
export const RISK_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
  "on the present record",
  "structured record",
  "risk pathway",
];

export interface SkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const RISK_SKELETON_PINPOINTS: readonly SkeletonPinpoint[] = [];

/**
 * APPENDIX A — the factor/determination/authority matrix rule (v4.5.1 form,
 * carried; rows cite v5.2 section numbers).
 */
export const RISK_APPENDIX_G_RULE =
  "Each row is assembled from the same factor object that produced the body language: Factor (human-readable name, no field key) | Report Determination (the exact final customer-facing sentence(s) printed for that factor, already covering what the Company supplied and what the report concluded from it) | Primary Authority (the verified registry citation). A factor that is not applicable or does not contribute to a printed determination, finding, condition, follow-up item, recommendation, or material balancing determination is suppressed rather than printed as N/A.";
