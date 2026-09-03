// LIA (Legitimate Interests Assessment) — Curated Attachment Map (Wave C5,
// L-CA, 2026-08-25, Sonnet 5). Authored per doc 58 (CMP B5) as amended by
// doc 62 §5's "B5 LIA" ruling (vocabulary ratified as filed + the
// impact-tag-format addition to L1's appendix design) and doc 63 §6 (the
// ratified AP/AOW customer bytes, banked here — see the RENDER-READINESS
// NOTE below for why they are NOT yet in a `display`/`warning_text` field).
// Every enforcement_actions and edpb_guidelines row re-pulled live
// 2026-08-25 (Lovable MCP, project 75bce9a1). No snapshot fixture exists
// yet — snapshot_file below names where one lands at L0.5 groundwork,
// following doc 04's D1 discipline (prove fixtures, never imagine them).
//
// RENDER-READINESS NOTE (doc 48 §II.6, CEO-ratified 2026-08-23): LIA is
// PRE-CONVERSION and its three-part test (interest legitimacy / necessity /
// balancing) is still MODEL-AUTHORED, not code-computed — the exact
// disposition §II.6 was written to gate. Every row in this map is therefore
// render_eligible: false, full stop, regardless of any other product's
// posture or any surface this map's rows are "release-1" for per doc 58 §3.
// AP/AOW rows carry NO `display`/`warning_text`/`render_surface`/
// `purpose_class`/`render_when` fields while dark — mapInvariants
// (cam-verify.ts) rejects render-only fields on a render_eligible:false
// row by construction. The doc 63 §6 ratified prose is instead transcribed
// into each row's curation_note as BANKED CURATION: copy it verbatim into
// a new `display`/`warning_text` block when L1 makes the three-part test's
// states code-computed and this map's rows flip live.
//
// THE FACTOR-BEARING LAW (doc 48 §II.2a) is satisfied prospectively: every
// row below is pre-wired to its exact LIA_FACTOR_VOCABULARY label, so the
// Determination appendix (L2) can key off `factor_id` directly with no
// re-tagging pass.
//
// THE SUBSTANTIVE-PURPOSE TEST (doc 62, applied to doc 58 at doc 62 §5):
// doc 58's vocabulary, ePrivacy extension, and AP/AOW selections are
// ratified "as filed" — this map implements that filing without
// re-litigating its curation choices, only verifying every fact against
// the live corpus (the D7 independent-verification discipline, doc 04).
//
// DATA-QUALITY FLAGS (log only; none block this landing since every row
// is dark):
//   (1) enforcement_actions 4382ffa3 (Cámara de Comercio de España) —
//       the `fine_eur_equivalent` COLUMN reads "2543042052.00" (€2.543
//       billion), wildly inconsistent with the same row's own
//       `fine_amount` ("500,000"), `fine_eur` ("500000"), and `raw_text`
//       ("The Spanish DPA has imposed a fine of EUR 500,000..."), all
//       three of which agree with each other and with doc 58/doc 63's
//       ratified €500,000 figure. Re-verified live 2026-08-25: this is an
//       isolated defect in the derived `fine_eur_equivalent` column for
//       this one row (likely a batch currency-equivalent computation
//       bug), NOT a fact about the case and NOT a reason to doubt the
//       ratified €500,000 — doc 63 §6.1 item 4's prose is CORRECT as
//       written and is transcribed below unchanged. Flagged to the CEO
//       as a data-pipeline defect worth a separate fix; does not touch
//       this map.
//   (2) enforcement_actions 4382ffa3 and 2ec1e5a9 (GSMA Limited) carry
//       `source_url` values that look transposed: Cámara's decision is
//       dated 2022-12-27 but its URL filename reads "ps-00145-2024.pdf";
//       GSMA's decision is dated 2024-05-31 but its URL filename reads
//       "ps-00541-2022.pdf". Neither URL is asserted as the authoritative
//       document below; both provenance entries note this for T2 review.
//   (3) The 14 EDPB Guidelines 1/2024 support rows below are a
//       first-pass, non-exhaustive sample (doc 50 §1 records 103
//       enforcement_actions rows / 15 verified as tool-relevant for LIA
//       overall) — this is one curated FC-J set for the ratified B5
//       scope (vocabulary + ePrivacy extension), not a claim of complete
//       EDPB coverage.
//
// v2 UPDATE (2026-08-26, doc 73 §4/§5, CEO-ratified): doc 73's live sweep
// found the TRUE verified LIA-relevant enforcement pool is 58 rows, not
// the 15 doc 58 curated from — the `tool_relevance='LIA'` tag alone is an
// unreliable net (94 of 111 rows citing Art. 6(1)(f) carry no LIA tag).
// The standing watch query is _shared/corpus/lia-li-relevant-watch.sql;
// re-run it at every T2 (doc 50 §4) and diff against the ids curated here
// and in precedent-classes.ts. Added this pass: 3 new AP rows (Amazon
// France Logistique ×2 factors, KASPR — sourced from the watch, not
// doc 58's original four) and 2 new logic-bearing FC-L rows (Airbnb,
// Groupon — doc 73 §4 R1 candidates, a narrower necessity rule than a
// whole precedent-class posture warrants). This map is NOT yet exhaustive
// over the 58-row pool — T3 curation work continues per doc 50 §4's
// quarterly cadence, not a one-time landing.
//
// v3 UPDATE (2026-08-26, L1 pre-landing): lia/f11-eprivacy/fcl-01's
// logic_disposition flipped extension_filed -> implemented — the factor-11
// hard gate now exists in code (eprivacy-gate.ts:buildEprivacyShortCircuit,
// wired into buildLiaDeliverables; disposition comment on the row itself).
// No row added or removed; every row stays render_eligible: false per the
// RENDER-READINESS NOTE above (the three-part test is still model-authored).

import type { CorpusMap } from "../../../../_shared/corpus/cam-types.ts";

/** LIA's 11-label factor vocabulary (doc 58 §1, ratified as filed via doc
 * 62 §5). This becomes L1's Determination-appendix spine — the appendix
 * build must adopt these exact strings or re-key this map in the same
 * landing (the doc 54 §0 precedent for a vocabulary-first product). */
export const LIA_FACTOR_VOCABULARY = [
  "Interest legitimacy",
  "Third-party interests",
  "Necessity and less-intrusive means",
  "Balancing of interests, rights and freedoms",
  "Reasonable expectations of the data subject",
  "Relationship with the individual",
  "Potential harms and severity",
  "Safeguards and mitigations",
  "Children's data",
  "Public-authority exclusion",
  "Special-category and ePrivacy interplay",
] as const;

// v4 UPDATE (2026-08-26, L2 — the LIA Conversion's skeleton/corpus rewire,
// CEO-delegated ratification): the render-readiness law's condition is now
// satisfied — the three-part test's states are code-computed
// (three-part-test-typed.ts) — so the FOUR doc-63 §6.1 release-1 AP rows
// and the doc-63 §6.2 AOW flip render_eligible with their BANKED RATIFIED
// BYTES transcribed verbatim into display/warning_text blocks. The
// sibling factor-tag rows and the doc-73 additions stay dark (one render
// per source; the doc-73 prose was never doc-63-ratified — Amazon reaches
// the reader through the precedent-class engine instead). The S5 surface
// is the skeleton's new Persuasive Authority section
// (lia-persuasive-authority.ts), rendered only on the deterministic path.
export const LIA_CORPUS_MAP: CorpusMap = {
  product: "lia",
  map_version: "lia-cam-v4-2026-08-26",
  snapshot_file: "tests/edge/corpus/__snapshots__/fsor-snapshot-lia.json",
  rows: [
    // ── AP — doc 58 §3 / doc 63 §6.1's release-1 sources, 4 sources × 2
    // factor tags each = 8 rows. ALL DARK (render-readiness note above).
    // Banked ratified prose (doc 63 §6.1) lives in curation_note; copy
    // into a `display` block verbatim when this row flips live at L1. ──

    // 1. LinkedIn (DPC, Ireland, 2024) — Factors: Balancing · Interest legitimacy.
    {
      id: "lia/f04-balancing/ap-01",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "69eee35f-a280-47be-8159-bf778767ff31",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["assessment_rendered"],
      display: {
        matter: "DPC (Ireland) — LinkedIn (2024)",
        what_happened:
          "Ireland's Data Protection Commission fined LinkedIn €310,000,000 for processing personal data for behavioural analysis and targeted advertising without a valid legal basis, with insufficient transparency.",
        // DOC 129 LIA-E (Batch 3 A-Team ruling, 2026-09-01) — neutral legal
        // relevance, not advocacy framing ("largest verified rejection").
        bearing:
          "This decision illustrates that where the balancing test fails, Article 6(1)(f) cannot support the processing — the same test this assessment performs.",
        authority_label:
          "DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority",
        trail_cite: "DPC, LinkedIn (2024)",
      },
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "LinkedIn",
        jurisdiction: "Ireland",
        decision_date: "2024-10-22",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["targeted advertising", "behavioural analysis", "behavioural advertising"],
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_LinkedIn_inquiry",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 1 (ratified 2026-08-23): DPC (Ireland), LinkedIn, decision of 22 October 2024. What happened: \"Ireland's Data Protection Commission fined LinkedIn €310,000,000 for processing personal data for behavioural analysis and targeted advertising without a valid legal basis, with insufficient transparency.\" Bearing (this factor): \"The largest verified rejection of legitimate-interests reliance: where balancing fails, the basis fails — the exact test this assessment performs.\" authority_label: \"DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority\" (docket rule: the row's free-text reference is non-docket-shaped, omitted). trail_cite: \"DPC, LinkedIn (2024)\". Re-verified live 2026-08-25 against enforcement_actions: fine_eur_equivalent, decision_date, regulator, jurisdiction all match. Sibling row: lia/f01-interest-legitimacy/ap-01 (same source, Interest-legitimacy tag). Banked per doc 48 §II.6 — flips render_eligible:true + adds the display block above at L1.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-01",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "69eee35f-a280-47be-8159-bf778767ff31",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "LinkedIn",
        jurisdiction: "Ireland",
        decision_date: "2024-10-22",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_LinkedIn_inquiry",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 1's Interest-legitimacy tag (same source and ratified bytes as lia/f04-balancing/ap-01 — one curation, two factors, doc 48 III.2). DPC (Ireland), LinkedIn, decision of 22 October 2024, €310,000,000: a processing basis fails on interest legitimacy before balancing is even reached whenever the asserted interest itself cannot be named or is not the controller's own to pursue. Banked per doc 48 §II.6.",
    },

    // 2. Cegedim (CNIL, France, 2024) — Factors: Necessity · Special-category/ePrivacy interplay.
    {
      id: "lia/f03-necessity/ap-01",
      factor_id: "Necessity and less-intrusive means",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "f7aae6e2-f869-4428-9b64-d0923109db55",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["assessment_rendered"],
      display: {
        matter: "CNIL (France) — Cegedim (2024)",
        what_happened:
          "France's CNIL fined Cegedim €800,000 for processing patients' data it treated as anonymized when it was only pseudonymized and re-identifiable, without the required authorization.",
        bearing:
          "Necessity analysis stands or falls on what the data really is — pseudonymized data is still personal data, and the less-intrusive-means question must be answered on that basis.",
        authority_label:
          "CNIL (France), Cegedim, decision of 5 September 2024, ref. SAN-2024-013 — persuasive authority",
        trail_cite: "CNIL, Cegedim (2024)",
      },
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Cegedim",
        jurisdiction: "France",
        decision_date: "2024-09-05",
        case_reference: "SAN-2024-013",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["pseudonymisation", "patient data", "health data", "anonymisation"],
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2024-013",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 2 (ratified 2026-08-23): CNIL (France), Cegedim, decision of 5 September 2024, ref. SAN-2024-013. What happened: \"France's CNIL fined Cegedim €800,000 for processing patients' data it treated as anonymized when it was only pseudonymized and re-identifiable, without the required authorization.\" Bearing (this factor): \"Necessity analysis stands or falls on what the data really is — pseudonymized data is still personal data, and the less-intrusive-means question must be answered on that basis.\" authority_label: \"CNIL (France), Cegedim, decision of 5 September 2024, ref. SAN-2024-013 — persuasive authority\". trail_cite: \"CNIL, Cegedim (2024)\". Re-verified live 2026-08-25: match confirmed. Sibling row: lia/f11-eprivacy/ap-01. Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f11-eprivacy/ap-01",
      factor_id: "Special-category and ePrivacy interplay",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "f7aae6e2-f869-4428-9b64-d0923109db55",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Cegedim",
        jurisdiction: "France",
        decision_date: "2024-09-05",
        case_reference: "SAN-2024-013",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2024-013",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 2's second tag (same source and ratified bytes as lia/f03-necessity/ap-01). CNIL (France), Cegedim, 5 September 2024, €800,000: what data really IS (health/patient data re-identifiable despite a pseudonymization label) governs whether the special-category and ePrivacy boundary is even in play — a mislabeled anonymization claim does not move data out of scope. Banked per doc 48 §II.6.",
    },

    // 3. GSMA Limited (AEPD, Spain, 2024) — Factors: Interest legitimacy · Third-party interests.
    {
      id: "lia/f01-interest-legitimacy/ap-02",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "2ec1e5a9-d5db-43ce-85c1-65e87e4792bf",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["assessment_rendered"],
      display: {
        matter: "AEPD (Spain) — GSMA Limited (2024)",
        what_happened:
          "Spain's AEPD fined GSMA €600,000 after it demanded health and vaccination information from third parties as an entry condition without being entitled to require it.",
        bearing:
          "An interest must be lawful and the controller's own to pursue — entitlement to the data is part of interest legitimacy, before balancing is ever reached.",
        authority_label:
          "AEPD (Spain), GSMA Limited, decision of 31 May 2024, ref. EXP202201608 — persuasive authority",
        trail_cite: "AEPD, GSMA (2024)",
      },
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "GSMA Limited",
        jurisdiction: "Spain",
        decision_date: "2024-05-31",
        case_reference: "EXP202201608",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["vaccination status", "health information", "entry requirements"],
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00541-2022.pdf",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 3 (ratified 2026-08-23): AEPD (Spain), GSMA Limited, decision of 31 May 2024, ref. EXP202201608. What happened: \"Spain's AEPD fined GSMA €600,000 after it demanded health and vaccination information from third parties as an entry condition without being entitled to require it.\" Bearing (this factor): \"An interest must be lawful and the controller's own to pursue — entitlement to the data is part of interest legitimacy, before balancing is ever reached.\" authority_label: \"AEPD (Spain), GSMA Limited, decision of 31 May 2024, ref. EXP202201608 — persuasive authority\". trail_cite: \"AEPD, GSMA (2024)\". Re-verified live 2026-08-25: match confirmed. DATA-QUALITY NOTE: source_url filename (\"ps-00541-2022.pdf\") does not align with the 2024 decision_date — see file header flag (2); not asserted as the authoritative document without T2 review. Sibling row: lia/f02-third-party-interests/ap-01. Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f02-third-party-interests/ap-01",
      factor_id: "Third-party interests",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "2ec1e5a9-d5db-43ce-85c1-65e87e4792bf",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "GSMA Limited",
        jurisdiction: "Spain",
        decision_date: "2024-05-31",
        case_reference: "EXP202201608",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00541-2022.pdf",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 3's second tag (same source and ratified bytes as lia/f01-interest-legitimacy/ap-02). AEPD (Spain), GSMA Limited, 31 May 2024, €600,000: demanding third parties' health data as an entry condition, with no entitlement to require it, is the third-party-interests failure mode this factor tests — the third party's own interest in the data cannot be assumed away. Same data-quality note as the sibling row. Banked per doc 48 §II.6.",
    },

    // 4. Cámara de Comercio de España (AEPD, Spain, 2022) — Factors: Reasonable expectations · Potential harms.
    {
      id: "lia/f05-reasonable-expectations/ap-01",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "4382ffa3-2683-4518-a74a-90b21b868180",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["assessment_rendered"],
      display: {
        matter: "AEPD (Spain) — Cámara de Comercio de España (2022)",
        what_happened:
          "Spain's AEPD fined the Chamber of Commerce €500,000 after sole traders' personal data was left exposed and offered for sale online.",
        bearing:
          "Reasonable expectations are the balancing test's fulcrum: data subjects who provide data for one purpose do not expect exposure or resale — the expectation factor this assessment documents.",
        authority_label:
          "AEPD (Spain), Cámara Oficial de Comercio, Industria, Servicios y Navegación de España, decision of 27 December 2022, ref. EXP202301678 — persuasive authority",
        trail_cite: "AEPD, Cámara de Comercio (2022)",
      },
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Cámara de Comercio de España",
        jurisdiction: "Spain",
        decision_date: "2022-12-27",
        case_reference: "EXP202301678",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["data exposure", "data leak", "resale of personal data"],
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00145-2024.pdf",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 4 (ratified 2026-08-23): AEPD (Spain), Cámara Oficial de Comercio, Industria, Servicios y Navegación de España, decision of 27 December 2022, ref. EXP202301678. What happened: \"Spain's AEPD fined the Chamber of Commerce €500,000 after sole traders' personal data was left exposed and offered for sale online.\" Bearing (this factor): \"Reasonable expectations are the balancing test's fulcrum: data subjects who provide data for one purpose do not expect exposure or resale — the expectation factor this assessment documents.\" authority_label: \"AEPD (Spain), Cámara Oficial de Comercio, Industria, Servicios y Navegación de España, decision of 27 December 2022, ref. EXP202301678 — persuasive authority\". trail_cite: \"AEPD, Cámara de Comercio (2022)\". The €500,000 figure is RE-CONFIRMED live 2026-08-25 against enforcement_actions.fine_amount (\"500,000\"), .fine_eur (\"500000\"), and .raw_text (\"The Spanish DPA has imposed a fine of EUR 500,000...\") — all three agree with doc 63's ratified prose. See file header flag (1): a SEPARATE, unrelated column (fine_eur_equivalent) on this same row carries an erroneous €2.543 billion figure; that column is never read by this row and is not a reason to alter the ratified €500,000. See also flag (2) on the source_url. Sibling row: lia/f07-harms/ap-01. Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f07-harms/ap-01",
      factor_id: "Potential harms and severity",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "4382ffa3-2683-4518-a74a-90b21b868180",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Cámara de Comercio de España",
        jurisdiction: "Spain",
        decision_date: "2022-12-27",
        case_reference: "EXP202301678",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00145-2024.pdf",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.1 item 4's second tag (same source and ratified bytes as lia/f05-reasonable-expectations/ap-01). AEPD (Spain), Cámara de Comercio, 27 December 2022, €500,000 (re-confirmed live 2026-08-25 — see the sibling row's full data-quality note): sole traders' data left exposed and offered for sale is the realized-harm end state this factor asks the assessment to weigh in advance. Banked per doc 48 §II.6.",
    },

    // ── AP — doc 73 §2.1/§4 R3 (2026-08-26): four new sources curated from
    // the 58-row verified LIA-relevant pool (doc 73's standing watch,
    // lia-li-relevant-watch.sql), extending doc 58's original four. Two
    // (Amazon France Logistique, KASPR) back the ratified precedent-class
    // rows in precedent-classes.ts (one curation, two consumers — the
    // engine's precedent_class_posture finding AND this map's own future
    // S5 surface). Two (Airbnb, Groupon) are R1 branch-rule candidates,
    // logic-bearing FC rows below, not AP rows on their own merits — they
    // illustrate a narrower rule (ID-verification necessity) than a whole
    // AP display warrants; kept as FC-L only to avoid inflating the AP
    // plane with a citation weaker than doc 58's original four. ALL DARK
    // (render-readiness note above). ─────────────────────────────────────
    {
      id: "lia/f06-relationship/ap-01",
      factor_id: "Relationship with the individual",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "e7ad2d7a-bce7-493d-8cd9-b8966fb9114d",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Amazon France Logistique",
        jurisdiction: "France",
        decision_date: "2023-12-07",
        case_reference: "SAN-2023-021",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2023-021",
        verified_on: "2026-08-26",
      },
      curation_note:
        "Doc 73 §4 R2's employee_monitoring precedent-class authority (precedent-classes.ts, same source_row_id). CNIL (France), Amazon France Logistique, 7 December 2023, €32,000,000: extensive scanner/video employee monitoring found to violate data minimisation, the legitimate-interests basis, and transparency. What happened: \"France's CNIL fined Amazon France Logistique €32,000,000 for extensively monitoring employee activity and performance using scanners and video surveillance, finding violations of data minimisation, the legitimate-interests basis, and transparency principles.\" Bearing (this factor): the employment relationship's power imbalance is exactly what made this scale of monitoring indefensible under Art. 6(1)(f). Sibling row: lia/f07-harms/ap-02 (same source, harms tag). Already curated for CPPA Risk's own map (doc 50 §3.3, one-curation-many-products law) — re-verified independently here, not copied. Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f07-harms/ap-02",
      factor_id: "Potential harms and severity",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "e7ad2d7a-bce7-493d-8cd9-b8966fb9114d",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Amazon France Logistique",
        jurisdiction: "France",
        decision_date: "2023-12-07",
        case_reference: "SAN-2023-021",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2023-021",
        verified_on: "2026-08-26",
      },
      curation_note:
        "Doc 73 §4 R2's employee_monitoring precedent-class authority, second factor tag (same source and bytes as lia/f06-relationship/ap-01: CNIL (France), Amazon France Logistique, decision of 7 December 2023). The intrusiveness the decision penalized — granular scanner/video performance tracking — is the realized-harm end state factor 7 asks the assessment to weigh in advance. Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f05-reasonable-expectations/ap-02",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "6b1b12d2-3e6b-4cfd-92bc-e676c5701a0d",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "KASPR",
        jurisdiction: "France",
        decision_date: "2024-12-05",
        case_reference: "SAN-2024-020",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2024-020",
        verified_on: "2026-08-26",
      },
      curation_note:
        "Doc 73 §2.1's verified untagged-pool exemplar (found via the standing watch, not doc 58's original curation). CNIL (France), KASPR, 5 December 2024, €240,000: scraping LinkedIn profile data INCLUDING users who had restricted their visibility settings. What happened: \"The company unlawfully processed personal data harvested from LinkedIn, particularly for users who had restricted their visibility settings, and failed to provide adequate transparency, information, and access to data subjects.\" Bearing (this factor): a data subject who sets a visibility restriction has affirmatively stated an expectation; processing that reaches past it is the clearest possible reasonable-expectations failure this factor tests for. Not yet tied to a ratified precedent-class row (KASPR's activity — B2B contact-data scraping/enrichment — does not cleanly fit any of the eight use-case classes in precedent-classes.ts; logged for T3 curation, doc 73 §4 coverage note). Banked per doc 48 §II.6.",
    },

    // ── AOW — doc 63 §6.2, binds to the balancing-fails adverse state at
    // L1. DARK (render-readiness note above); warning_text banked below. ──
    {
      id: "lia/f04-balancing/aow-01",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "AOW",
      source_table: "enforcement_actions",
      source_row_id: "69eee35f-a280-47be-8159-bf778767ff31",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "consequence",
      render_when: ["balancing_fails"],
      warning_text:
        "Caution. Regulators have rejected legitimate-interests reliance at the largest scale where balancing failed: the Irish DPC fined LinkedIn €310,000,000 (decision of 22 October 2024) for behavioural analysis and targeted advertising without a valid legal basis. Where this assessment's balancing weighs against the processing, proceeding on legitimate interests is the fact pattern those decisions address. The decisions cited are persuasive context only.",
      // No citation_source on the AOW — the fleet precedent (Risk's aow-01):
      // the warning's own ratified text names the decision, and the AP row
      // for the same source carries the structured citation; a
      // citation_source here would demand the display-consistency
      // invariant's exact-substring match against ratified warning bytes.
      direction: "limits",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_LinkedIn_inquiry",
        verified_on: "2026-08-25",
      },
      curation_note:
        "Doc 63 §6.2 (ratified 2026-08-23), banked warning_text for the L1 balancing-fails adverse state, citing DPC (Ireland), LinkedIn, decision of 22 October 2024: \"Caution. Regulators have rejected legitimate-interests reliance at the largest scale where balancing failed: the Irish DPC fined LinkedIn €310,000,000 (decision of 22 October 2024) for behavioural analysis and targeted advertising without a valid legal basis. Where this assessment's balancing weighs against the processing, proceeding on legitimate interests is the fact pattern those decisions address. The decisions cited are persuasive context only.\" Binds to render_when: [\"balancing_fails\"] once L1 computes that state deterministically (doc 48 §II.6) — do not flip on a model's self-reported balancing verdict. Same source as the two Balancing/Interest-legitimacy AP rows (doc 48 III.2, one curation multiple surfaces).",
    },

    // ── FC, logic-bearing — the ePrivacy short-circuit (doc 58 §2, doc 62
    // §5's B5 ruling names this the one MUST-implement logic item ahead of
    // L1 freezing surfaces). Dark; extension_filed since L1's factor-11
    // branch does not exist in code yet. ──────────────────────────────────
    {
      id: "lia/f11-eprivacy/fcl-01",
      factor_id: "Special-category and ePrivacy interplay",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "09ae00b6-ae81-4cc9-9f71-97c4a395a0c5",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "there would be no legitimate interest that the controller could invoke in order to justify the collection of personal data for sending such messages.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      // IMPLEMENTED 2026-08-26 (v3 update): the factor-11 hard gate exists in
      // code — buildEprivacyShortCircuit, a pure intake-driven function wired
      // into buildLiaDeliverables, evaluated independent of the balancing
      // computation per the ratified rule. The rule text formerly carried in
      // this disposition's queue_ref is preserved verbatim in curation_note
      // below. The finding is computed + persisted on every run; its PROSE
      // stays dark behind LIA_EPRIVACY_GATE_RATIFIED (PN-L6) and this row
      // stays render_eligible: false per doc 48 §II.6.
      logic_disposition: {
        kind: "implemented",
        branch_ref:
          "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts:buildEprivacyShortCircuit",
      },
      provenance: {
        source_url: "https://edpb.europa.eu",
        verified_on: "2026-08-25",
      },
      curation_note:
        "RATIFIED RULE (formerly this row's extension_filed queue_ref, preserved verbatim on the 2026-08-26 implemented flip): LIA conversion L1 factor-11 branch (doc 58 §2; doc 62 §5 B5 — the ePrivacy short-circuit: where Article 5(3) ePrivacy Directive requires consent for the processing (e.g. cookies/terminal-equipment access, unsolicited electronic messages), legitimate interests under Article 6(1)(f) GDPR CANNOT substitute for that consent, however the balancing test would otherwise resolve. L1 must encode this as a hard gate on factor 11, evaluated before or independent of the balancing computation, not as a balancing input.) EDPB Guidelines 1/2024 on Article 6(1)(f) GDPR (guideline_ref: \"EDPB Guidelines 1/2024\", status: final) — the primary evidence row doc 58 §2 already cited for this exact finding; re-verified live 2026-08-25, source_row_id confirmed unchanged. DATA-QUALITY NOTE: the live excerpt_text begins mid-sentence (\"13 ePrivacy Directive, there would be no legitimate interest...\" — a footnote-marker artifact truncating the clause's own lead-in); pinned_excerpt starts from the first complete clause forward, per the mid-word/mid-clause truncation discipline (cyber-corpus-map.ts precedent). Logic rule: ePrivacy's own consent requirement is not just one balancing factor among others — it forecloses Article 6(1)(f) entirely for the processing it covers. The 3 direct-marketing / reasonable-expectations siblings (34a9f202, 4bc253a9, 47420238 — this map's f01/f04 FC-J rows) inform the surrounding balancing test but do not carry this short-circuit property themselves.",
    },

    // ── FC, logic-bearing — doc 73 §4 R1 candidates (2026-08-26): two
    // NEW branch-rule candidates from the standing watch, both about the
    // SAME narrow rule (ID-verification for rights requests must be
    // scoped to what necessity actually requires) rather than a whole
    // precedent-class posture — this is why they are FC-L rows, not AP
    // rows (see the AP section's own note above). extension_filed: the
    // intake contract has no field recording what identity evidence a
    // controller demands when a rights request is exercised, so
    // implementing this as a real branch needs a new intake field, not
    // just a decision — a product-scope change beyond this landing,
    // logged for L1 design. ──────────────────────────────────────────────
    {
      id: "lia/f03-necessity/fcl-02",
      factor_id: "Necessity and less-intrusive means",
      role: "FC",
      source_table: "enforcement_actions",
      source_row_id: "7a874890-4f84-423e-82b2-1eed7d42f52a",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The DPC found that Airbnb lacked a legal basis under Article 6 GDPR for processing a complainant’s ID to delete his account and violated data minimisation obligations by requiring the ID for an erasure request.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "LIA conversion L1 factor-3 branch (doc 73 §4 R1) — needs a NEW intake field recording what identity evidence, if any, the controller demands when a data subject exercises a rights request; no such field exists in the current contract, so this is a product-scope decision for L1 design, not solely a logic gap. Rule: demanding a copy of government ID (or similar) beyond what is needed to confirm the requester's identity, for an access/erasure request, fails necessity even where the underlying processing's own basis is otherwise sound.",
      },
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_Inquiry_into_Airbnb_Ireland_UC_-_January_2024",
        verified_on: "2026-08-26",
      },
      curation_note:
        "Doc 73 §2.1's verified untagged-pool exemplar. DPC (Ireland), Airbnb Ireland UC, 31 January 2024: the controller's OWN separate ID-verification practice (for an erasure request), not the primary processing basis, was found unlawful under Art. 6 and a data-minimisation violation. Sibling: lia/f03-necessity/fcl-03 (Groupon, same rule, same regulator). Banked per doc 48 §II.6.",
    },
    {
      id: "lia/f03-necessity/fcl-03",
      factor_id: "Necessity and less-intrusive means",
      role: "FC",
      source_table: "enforcement_actions",
      source_row_id: "f53002af-7fcd-4a9d-b16f-5f7ff12e379f",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "Groupon lacked a legal basis for requiring a data subject’s ID to fulfill access and erasure requests, violating data minimisation obligations and failing to comply with SARs",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref:
          "LIA conversion L1 factor-3 branch (doc 73 §4 R1) — same rule and same missing-intake-field gap as lia/f03-necessity/fcl-02 (Airbnb); the two are one logic item, filed once here per the pinned_excerpt each carries.",
      },
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_Groupon_Ireland_Operations_Limited",
        verified_on: "2026-08-26",
      },
      curation_note:
        "Doc 73 §2.1's verified untagged-pool exemplar. DPC (Ireland), Groupon Ireland Operations Limited, 8 March 2024: the same ID-for-rights-request pattern as Airbnb, same regulator, decided five weeks apart — two independent decisions on the identical rule strengthen rather than duplicate the finding. Sibling: lia/f03-necessity/fcl-02. Banked per doc 48 §II.6.",
    },

    // ── FC-J — dark, non-logic-bearing EDPB Guidelines 1/2024 support rows
    // (first-pass sample, see file header flag (3)). Provenance for the
    // interpretive texture behind each factor; none logic-bearing, none
    // render-eligible, none carry a trail_impact (plain support per the
    // R2 admission rule, cam-types.ts header). ─────────────────────────

    // f01 — Interest legitimacy (4 rows).
    {
      id: "lia/f01-interest-legitimacy/fcj-01",
      factor_id: "Interest legitimacy",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "34a9f202-9720-400f-93c0-0efc8fbbe6b4",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The controller should therefore take into account the reasonable expectations of data subjects when weighing its legitimate interest(s) and the interests or fundamental rights and freedom of data subjects.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024, on Recital 47's legitimate-interest examples and the reasonable-expectations link to weighing — support texture for what counts as a legitimate interest capable of surviving the three-part test.",
    },
    {
      id: "lia/f01-interest-legitimacy/fcj-02",
      factor_id: "Interest legitimacy",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "1400828c-90d8-4dc1-8576-dc002ff7ed23",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "customers of the company, as well as other third parties, may also have a legitimate interest in ensuring that fraudulent activities are discouraged and detected when they occur.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024's fraud-prevention worked example — a named category of concrete, real, present interest, useful contrast texture against the vague-interest FC-J rows (fcj-03, fcj-04) below.",
    },
    {
      id: "lia/f01-interest-legitimacy/fcj-03",
      factor_id: "Interest legitimacy",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "4bc253a9-dc73-4ab4-a6ba-8ef3bdb8da85",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "It should therefore be noted that a generic reference to the purpose of “combating fraud” to define the legitimate interest, for example in the privacy policy, is not sufficient to meet the transparency and documentation obligations under the GDPR.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — a generic purpose label does not itself satisfy the specificity an interest needs to be assessed; limits how loosely factor 1 can be documented. Sibling of fcj-04 (the same specificity requirement applied to a safety interest).",
    },
    {
      id: "lia/f01-interest-legitimacy/fcj-04",
      factor_id: "Interest legitimacy",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "47420238-92a8-4401-8850-95a041b1dd4f",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "While the protection of property, health and life may in some circumstances be characterised as a legitimate interest, the interest as expressed by the controller with reference to the processing which is occurring in the present case is very vague, as it is phrased in general terms",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024's vague-safety-interest worked example — even a normally-legitimate interest class (property/health/life protection) fails the test if not articulated with reference to specific facts. Limits how generically factor 1 can be asserted.",
    },

    // f02 — Third-party interests (3 rows).
    {
      id: "lia/f02-third-party-interests/fcj-01",
      factor_id: "Third-party interests",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "41affcec-1578-46b8-9497-9e3e4a238572",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "Interests of third parties, as mentioned in Article 6(1)(f) GDPR, are not to be confused with interests of the wider community (general public interests), although in some cases the interests pursued by a specific controller or a specific third party may also serve broader interests.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — a third party's interest under 6(1)(f) is specific and identifiable, not a stand-in for general public interest (which runs through 6(1)(c)/(e) instead). Narrows what counts as a qualifying third-party interest for factor 2.",
    },
    {
      id: "lia/f02-third-party-interests/fcj-02",
      factor_id: "Third-party interests",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "234234e9-19f0-4bd7-8bdc-9cccc4902f70",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "According to Recital 48 GDPR, controllers that are part of a group of undertakings may have a legitimate interest in transmitting personal data within the group of undertakings for internal administrative purposes, including the processing of clients’ or employees’ personal data.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 on Recital 48 — the named intra-group-transmission category of third-party interest, still subject to the full three-step assessment (per the guideline's own next sentence, not pinned here).",
    },
    {
      id: "lia/f02-third-party-interests/fcj-03",
      factor_id: "Third-party interests",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "14ed8415-0004-499f-a7da-b83ed92b3753",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "However, the reference to an interest pursued by “a third party” in the wording of Article 6(1)(f) GDPR indicates that the interest(s) of one or more specific third parties may be legitimately pursued within the meaning of Article 6(1)(f)",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — confirms a specific third party's own interest may be pursued (and balanced) under 6(1)(f) on the same footing as the controller's own interest, same legitimacy criteria applying to both.",
    },

    // f03 — Necessity and less-intrusive means (1 row).
    {
      id: "lia/f03-necessity/fcj-01",
      factor_id: "Necessity and less-intrusive means",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "110176e1-4556-41b6-ba5e-7427a20a61dd",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "This assessment should follow the three-step process outlined below, although in some circumstances the examinations of the second and third conditions may merge in so far as the assessment of whether the legitimate interests pursued by the processing of personal data cannot reasonably",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024's own framing of the three-step test — records that necessity (step 2) and balancing (step 3) may merge in practice, which is why doc 58's vocabulary keeps them as separate factors (3 and 4) but this assessment's method may discuss them together where they do.",
    },

    // f04 — Balancing of interests, rights and freedoms (4 rows).
    {
      id: "lia/f04-balancing/fcj-01",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "27446e53-e259-42b3-928e-bbb6c56348a2",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The duty is upon the controller to demonstrate that the balancing test has been conducted appropriately and that the legitimate interest(s) being pursued are not objectively overridden by the data subject’s interests, fundamental rights and freedoms.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — the burden of demonstrating an appropriate balancing test sits on the controller, not the data subject. Limits what a bare balancing conclusion can claim without the underlying demonstration.",
    },
    {
      id: "lia/f04-balancing/fcj-02",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "45a73415-4763-4771-93ae-af44e8d133ba",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "With regard to the condition that the interests or fundamental rights and freedoms of the person concerned by the data processing do not take precedence over the legitimate interests of the controller or of a third party, that condition entails a balancing of the opposing rights",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — balancing depends in principle on the specific circumstances of the processing; no generic weighting formula substitutes for the case-specific assessment. Methodological framing for factor 4.",
    },
    {
      id: "lia/f04-balancing/fcj-03",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "3e1243ca-bd83-4f7b-87d0-86f6c2618bdb",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The fundamental rights and freedoms of the data subjects include the right to data protection and privacy, but also other fundamental rights and freedoms, such as the right to liberty and security, freedom of expression and information, freedom of thought, conscience and religion",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — the balancing test weighs against MORE than data protection/privacy alone; other fundamental rights and freedoms are in scope too. Broadens (and thereby limits the controller's side of) what factor 4 must actually weigh.",
    },
    {
      id: "lia/f04-balancing/fcj-04",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "06cdeefd-0dcf-496e-b8a7-8fb9d48d6e69",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "This condition entails a balancing of the opposing rights and interests at issue which depends in principle on the specific circumstances of the particular case.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — the guideline's own four-part balancing checklist (data subjects' interests/rights/freedoms; impact of the processing; reasonable expectations; final balancing including mitigations) begins here; a structural reference for how L1's balancing narrative should be organized.",
    },

    // f07 — Potential harms and severity (1 row).
    {
      id: "lia/f07-harms/fcj-01",
      factor_id: "Potential harms and severity",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "2890942e-41a5-4c5b-9b7a-d031644dcee5",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The CJEU has made clear that the assessment of whether personal data is accurate and complete must be made in the light of the purpose for which that data was collected.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — data relied on for a legitimate-interest processing that is inaccurate for its stated purpose is itself a harm vector this factor should surface (decisions or impacts built on inaccurate data compound the severity assessment).",
    },

    // f09 — Children's data (1 row).
    {
      id: "lia/f09-childrens-data/fcj-01",
      factor_id: "Children's data",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "286ddf26-7ca4-468c-9831-2c55ce4ac7ac",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "In particular, it highlighted that, when performing a balancing exercise to assess whether a processing may be based on Article 6(1)(f) GDPR, special care must be taken in relation to the status of children as data subjects, using their best interest as a guide.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-25" },
      curation_note:
        "EDPB Guidelines 1/2024 — children's best interests carry high priority in the balancing exercise and will very often outweigh the controller's or a third party's interests. Raises the bar factor 9 must clear before balancing can favor the processing.",
    },
  ],
};
