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

// v5 UPDATE (2026-09-05, doc 73 standing-watch backfill): the watch query
// named in the v2 note was missing from the tree (lost in the corpus
// relocation) and has been reconstructed at
// run-li-assessment/_local/corpus/lia-li-relevant-watch.sql — inside the
// product tree so it cannot be orphaned again. HONEST COUNT CORRECTION:
// the reconstructed definition returns 48 verified LIA-relevant rows, not
// the 58 recorded in doc 73; 58 is not reproducible from any surviving
// query text. Of the 48, 28 carry a pinnable key_compliance_failure; 8
// were already wired; 17 are wired by this pass; 3 are excluded with
// reasons (see the v5 block at the end of `rows`); 20 have no excerpt
// field at all and are logged for a separate excerpt-extraction pass, not
// wired. Every v5 row is DARK — wiring is not ratification.

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
  map_version: "lia-cam-v5-2026-09-05",
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

    // ══ v5 (2026-09-05) — the doc 73 standing-watch backfill. Seventeen
    // verified enforcement rows from the reconstructed watch query
    // (_local/corpus/lia-li-relevant-watch.sql), each individually pinned
    // against its own live source field, posture-sentenced for one factor,
    // and banked DARK per doc 48 §II.6. Ten of the seventeen have
    // non-English source text (Spanish ×9, Romanian ×1): the pin is the
    // verbatim source text in its own language, and a working English
    // translation sits in the curation_note as a curation aid — it is NOT
    // customer-facing prose and must be re-checked at ratification.
    // Excluded from wiring, with reasons, at the end of this block. ══

    {
      id: "lia/f01-interest-legitimacy/ap-w5-01",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "dcd75c1d-a21f-4939-b2a0-d8cb1b96545a",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "Meta IE's processing of personal data for behavioral advertising was found to be unlawful, as the 'consent' obtained from users was not freely given, specific, or granular, and was bundled with terms of service.",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "Meta Platforms Ireland Limited (Instagram)",
        jurisdiction: "Ireland",
        decision_date: "2022-12-31",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_Meta_Platforms_Ireland_Limited_(Instagram)_-_IN-18-5-7", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). DPC (Ireland), Meta Platforms Ireland Limited (Instagram), 31 December 2022, EUR 180,000,000. Source language: English (no translation required). Bearing (this factor): the asserted basis must be the one that actually fits the processing — a controller whose behavioural-advertising basis collapses on inspection fails at interest legitimacy before any balancing is reached. DARK: no doc 63 ratification exists for these bytes; render only after separate ratification (doc 48 SII.6).",
    },
    {
      id: "lia/f05-expectations/ap-w5-02",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "c1a28f21-71cd-472e-b549-c0d4b986ec2a",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The controller unlawfully collected and processed a massive database of biometric data from individuals, including minors, without a valid legal basis or consent, and failed to adequately respond to data subject access and erasure requests.",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Clearview AI",
        jurisdiction: "France",
        decision_date: "2022-10-17",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2022-019", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). CNIL (France), Clearview AI, 17 October 2022, EUR 20,000,000. Source language: English. Bearing (this factor): data scraped at scale from public sources still defeats reasonable expectations - publicity of a source is not consent to secondary processing, and the presence of minors raises the bar further (factor 9 sibling). DARK pending ratification.",
    },
    {
      id: "lia/f11-eprivacy/ap-w5-03",
      factor_id: "Special-category and ePrivacy interplay",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "75cce78c-78a8-47a3-97bc-517575cdaf88",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The online advertising group Criteo failed to ensure that data subjects gave their consent",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Criteo",
        jurisdiction: "France",
        decision_date: "2023-06-22",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2023-009", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). CNIL (France), Criteo, 22 June 2023, EUR 40,000,000. Source language: English. Pinned excerpt is a leading clause of the source field (clause-boundary truncation discipline). Bearing (this factor): where consent is the required basis for the tracking layer, legitimate interests cannot substitute for it downstream - the ePrivacy short-circuit already implemented at lia/f11-eprivacy/fcl-01. DATA-QUALITY FLAG: the live source_url recorded on this row could not be independently re-fetched at curation; the citation facts, not the URL, are what this row asserts. DARK pending ratification.",
    },
    {
      id: "lia/f07-harms/ap-w5-04",
      factor_id: "Potential harms and severity",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "7edab77e-1403-4bdb-a834-9aa626f97dd1",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The media outlet published an audio recording of a rape victim's testimony without sufficient",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "DIARIO ABC, S.L.",
        jurisdiction: "Spain",
        decision_date: "2023-03-21",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00193-2022.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), DIARIO ABC, S.L., 21 March 2023, EUR 50,000. Source language: English summary of a Spanish decision. Pinned excerpt is a leading clause (clause-boundary truncation). Bearing (this factor): severity is assessed on the consequence to the individual, not on the controller's editorial purpose; where the harm is irreversible reputational and psychological injury, no asserted interest carries the balance. DARK pending ratification.",
    },
    {
      id: "lia/f11-eprivacy/ap-w5-05",
      factor_id: "Special-category and ePrivacy interplay",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "d47222c4-c7db-4564-9074-831a5753ee52",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The company processed highly sensitive personal data without a legitimate basis, specifically by publishing an audio recording of a rape victim's testimony.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "EUROPA PRESS DE CATALUNYA, S.A.",
        jurisdiction: "Spain",
        decision_date: "2023-09-26",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00249-2023.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), EUROPA PRESS DE CATALUNYA, S.A., 26 September 2023, EUR 30,000. Source language: English. Bearing (this factor): Article 9 special-category data cannot be reached by Article 6(1)(f) at all - the special-category gate is anterior to the balancing test. NOTE: same underlying facts as the DIARIO ABC row above (two controllers, two decisions, distinct source rows) - both are wired because each is its own verified decision, not a duplicate. DARK pending ratification.",
    },
    {
      id: "lia/f03-necessity/ap-w5-06",
      factor_id: "Necessity and less-intrusive means",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "0d01d954-f90b-4859-a022-68e497bdd37a",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "The company performed a credit check on an individual without a valid legal basis as required by GDPR Article 6(1).",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "ARRENDAMIENTOS DEUDORES, S.L.",
        jurisdiction: "Spain",
        decision_date: "2024-05-07",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00034-2024.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), ARRENDAMIENTOS DEUDORES, S.L., 7 May 2024, EUR 1,200. Source language: English summary of a Spanish decision. Bearing (this factor): a solvency or credit enquiry about a counterparty is exactly the class of processing controllers assume legitimate interests covers; the decision shows the enquiry must still be necessary and no less-intrusive route available. DARK pending ratification.",
    },
    {
      id: "lia/f05-expectations/ap-w5-07",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "d2df70c3-d59d-4c13-9aa5-701f47774649",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "Accor failed to obtain valid consent for direct marketing, did not provide adequate information about data processing, did not properly respond to data subject access and unsubscribe requests",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Accor",
        jurisdiction: "France",
        decision_date: "2022-08-03",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2022-017", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). CNIL (France), Accor, 3 August 2022, EUR 600,000. Source language: English. Pinned excerpt is a leading clause (the source field continues into an unrelated password-strength finding, excluded deliberately). Bearing (this factor): an unhonoured objection or unsubscribe request is direct evidence that the processing sits outside what the individual expected and accepted. DARK pending ratification.",
    },
    {
      id: "lia/f07-harms/ap-w5-08",
      factor_id: "Potential harms and severity",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "64ee4d90-9ead-4155-b379-868932d05c5f",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "se han publicado sus datos personales (nombre y apellidos y, adem\u00e1s, la imagen de uno de ellos) sin su consentimiento, acus\u00e1ndoles de haber ocupado un inmueble y no haber abonado el precio correspondiente al alquiler.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "HIGHCLIFFE ESTATES MARBELLA, S.L.",
        jurisdiction: "Spain",
        decision_date: "2026-03-02",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00294-2024.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), HIGHCLIFFE ESTATES MARBELLA, S.L., 2 March 2026, EUR 8,500, EXP202409340. SOURCE LANGUAGE: Spanish; pinned_excerpt is the verbatim Spanish source text (never a translation - the pin must match the source field byte-for-byte). WORKING ENGLISH TRANSLATION (curation aid, not customer-facing bytes): 'their personal data (full name and, in addition, a photograph of one of them) was published without their consent, accusing them of having occupied a property and of not having paid the corresponding rent.' Bearing (this factor): publishing accusatory personal data to pressure a debtor inflicts reputational harm that no asserted debt-recovery interest outweighs. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w5-09",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "99d0804e-9263-4569-94bc-1d20cdbf9140",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "los datos de empresarios aut\u00f3nomos que coinciden con sus datos personales queden expuestos e incluso sean vendidos en internet, sin consentimiento de los interesados ni base legal para tal tratamiento.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "CAMERDATA, S.A.",
        jurisdiction: "Spain",
        decision_date: "2022-12-27",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00146-2024.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), CAMERDATA, S.A., 27 December 2022, EUR 260,000, EXP202404641. SOURCE LANGUAGE: Spanish; pin is verbatim. WORKING ENGLISH TRANSLATION: 'the data of self-employed business owners, which coincides with their personal data, was left exposed and even sold on the internet, without the consent of the data subjects and without any legal basis for that processing.' Bearing (this factor): sole-trader business data is still personal data; a commercial interest in selling it is not on that account a legitimate interest. DATA-QUALITY FLAG: decision_date 2022-12-27 sits against a source URL whose filename reads 'ps-00146-2024.pdf' - the same date/filename mismatch already flagged for the Camara de Comercio row (sibling AEPD case, adjacent file number). Neither URL is asserted as authoritative; flagged for T2. DARK pending ratification.",
    },
    {
      id: "lia/f08-safeguards/ap-w5-10",
      factor_id: "Safeguards and mitigations",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "a51194ee-6bf4-49b6-94d1-1dd8c7647029",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "Se constata que la entidad reclamada contrat\u00f3 los servicios de empresas dedicadas a la promoci\u00f3n de actividades relacionadas con comercializaci\u00f3n de energ\u00eda el\u00e9ctrica sin verificar adecuadamente c\u00f3mo estas empresas obten\u00edan y procesaban los datos personales de los clientes potenciales",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "SILVANERGIA 2022, S.L.",
        jurisdiction: "Spain",
        decision_date: "2023-08-16",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00201-2025.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), SILVANERGIA 2022, S.L., 16 August 2023, EUR 3,000, EXP202313830. SOURCE LANGUAGE: Spanish; pin is verbatim and clause-truncated (the full source field runs 634 characters, over the 300-character build-time pin budget; cut at a clause boundary, nothing rewritten). WORKING ENGLISH TRANSLATION of the pinned clause: 'It is established that the respondent engaged the services of companies dedicated to promoting electricity-marketing activities without adequately verifying how those companies obtained and processed the personal data of prospective customers.' Bearing (this factor): safeguards that exist only on paper - unverified supplier assurances - do not count as mitigations in the balancing test. DATA-QUALITY FLAG: decision_date 2023-08-16 against a source filename reading 'ps-00201-2025.pdf'; flagged for T2, URL not asserted as authoritative. DARK pending ratification.",
    },
    {
      id: "lia/f04-balancing/ap-w5-11",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "94312858-b48c-4a93-92ea-2b8e6edaf147",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "SC Grupex 2000 SRL a prelucrat ilegal datele personale ale unor persoane fizice, bolnavi institu\u021bionaliza\u021bi, \u00een cadrul unui material filmat disponibil pe site-ul operatorului",
      render_eligible: false,
      citation_source: {
        regulator: "ANSPDCP (Romania)",
        subject: "SC Grupex 2000 SRL",
        jurisdiction: "Romania",
        decision_date: "2022-02-01",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.dataprotection.ro/?page=Comunicat_Presa_01_02_2022_2&lang=ro", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). ANSPDCP (Romania), SC Grupex 2000 SRL, 1 February 2022, EUR 1,000. SOURCE LANGUAGE: Romanian; pin is verbatim and clause-truncated (full field 327 characters, tail is a bare article list). WORKING ENGLISH TRANSLATION of the pinned clause: 'SC Grupex 2000 SRL unlawfully processed the personal data of individuals - institutionalised patients - in filmed material made available on the controller's website.' Bearing (this factor): where data subjects are in a position of dependence and cannot practically object, the balance tilts against the controller regardless of the communications purpose asserted. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w5-12",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "8419bcb5-847e-48f2-b9a2-51d3616f638e",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "ceder los datos personales del reclamante a la empresa de CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L. sin el consentimiento previo del titular de dichos datos personales supone una infracci\u00f3n del art. 6 del RGPD.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L.",
        jurisdiction: "Spain",
        decision_date: "2021-10-04",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00245-2021.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L., 4 October 2021, EUR 5,000, PS/00245/2021. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'disclosing the complainant's personal data to CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L. without the prior consent of the data subject constitutes an infringement of Article 6 GDPR.' Bearing (this factor): onward disclosure to a third party is its own processing operation and needs its own basis; the discloser's convenience is not an interest that survives naming. DATA-QUALITY FLAG: the CYNGASA row (d6d05fbe, sibling below) carries a near-identical excerpt naming this same company - the two AEPD decisions are the two sides of one disclosure, but the shared wording means neither excerpt alone identifies its own respondent. Preserved as found, not corrected. DARK pending ratification.",
    },
    {
      id: "lia/f06-relationship/ap-w5-13",
      factor_id: "Relationship with the individual",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "d6d05fbe-8f5b-49d7-bbb1-6f66f85d7e17",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "ceder los datos personales del reclamante a la empresa de CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L. sin el consentimiento previo del titular de dichos datos personales",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "CYNGASA, S.L.",
        jurisdiction: "Spain",
        decision_date: "2021-09-29",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00244-2021.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), CYNGASA, S.L., 29 September 2021, EUR 5,000, PS/00244/2021. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'disclosing the complainant's personal data to CALDERERIA Y SOLDADURA DE ESTRUCTURAS METALICAS, S.L. without the prior consent of the data subject.' Bearing (this factor): an existing commercial relationship with the individual does not extend to passing that individual's data to a business partner. DATA-QUALITY FLAG: excerpt duplicates the CALDERERIA row's wording (see above); the excerpt names the recipient, not this respondent. Preserved as found. DARK pending ratification.",
    },
    {
      id: "lia/f05-expectations/ap-w5-14",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "eb4cfde4-90c3-42f6-a829-5c83f0844db1",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "recepci\u00f3n el 31 de enero de 2020, a las 11:34 horas, de una llamada comercial en nombre de \"Vodafone Espa\u00f1a, S.A.U.\", a su l\u00ednea telef\u00f3nica que se encuentra inscrita en la lista de exclusi\u00f3n publicitaria Robinson.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Vamavi Phone S.L.",
        jurisdiction: "Spain",
        decision_date: "2021-02-11",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00026-2021.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), Vamavi Phone S.L., 11 February 2021, EUR 24,000, PS/00026/2021. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'receipt, on 31 January 2020 at 11:34, of a marketing call made on behalf of Vodafone Espana, S.A.U. to a telephone line registered on the Robinson advertising-exclusion list.' Bearing (this factor): a registered opt-out list is a recorded, checkable statement of the individual's expectation; processing that ignores it fails this factor on the face of the record. DARK pending ratification.",
    },
    {
      id: "lia/f06-relationship/ap-w5-15",
      factor_id: "Relationship with the individual",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "ad36611f-1840-4d06-b330-8cbff6cb5882",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "el denunciado, con la relaci\u00f3n de encargado del tratamiento ya finalizada, ha seguido tratando los datos de los clientes del denunciante llegando incluso a establecer contactos telef\u00f3nicos con sus clientes para ofertarle los servicios que el denunciante les estaba prestando.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Avata Hispania, S.L.",
        jurisdiction: "Spain",
        decision_date: "2020-10-03",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00245-2020.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), Avata Hispania, S.L., 3 October 2020, EUR 3,000, PS/00245/2020. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'the respondent, the processor relationship having already ended, continued to process the complainant's customers' data, going so far as to make telephone contact with those customers to offer them the services the complainant was providing.' Bearing (this factor): the relationship that once justified access is the same relationship whose end withdraws it - a former processor has no residual legitimate interest in the data it held. DARK pending ratification.",
    },
    {
      id: "lia/f11-eprivacy/ap-w5-16",
      factor_id: "Special-category and ePrivacy interplay",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "c0e5e0bf-e940-484c-9f1c-504b32e015eb",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "la reclamante contrat\u00f3 los servicios del reclamado para descargarse men\u00fas semanales, descubriendo d\u00edas despu\u00e9s que dicha empresa ha utilizado sus datos personales nombre y apellidos completos y foto de perfil, e informaci\u00f3n sobre sus anal\u00edticas de colesterol y su enfermedad de hipotiroidismo",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Venu Sanz Chef, S.L.",
        jurisdiction: "Spain",
        decision_date: "2020-09-30",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00249-2020.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), Venu Sanz Chef, S.L., 30 September 2020, EUR 3,000, PS/00249/2020. SOURCE LANGUAGE: Spanish; pin verbatim and clause-truncated (full field 359 characters, over the pin budget). WORKING ENGLISH TRANSLATION of the pinned clause: 'the complainant engaged the respondent's services to download weekly menus, discovering days later that the company had used her personal data - full name and profile photograph - and information about her cholesterol test results and her hypothyroidism condition.' Bearing (this factor): health data pulled into a marketing purpose engages Article 9, which Article 6(1)(f) cannot reach past. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w5-17",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "8d710906-539f-4ca8-8e43-1dad789b6acb",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt:
        "una trabajadora de la tienda de Vodafone se hizo pasar por \u00e9l d\u00e1ndose de alta en otra compa\u00f1\u00eda y as\u00ed realizar la portabilidad aportando DNI y sus datos sin consentimiento y falsificando su firma.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "Vodafone Espa\u00f1a, S.A.U.",
        jurisdiction: "Spain",
        decision_date: "2020-03-04",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/es/documento/ps-00429-2019.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, wired 2026-09-05 (v5). AEPD (Spain), Vodafone Espana, S.A.U., 4 March 2020, EUR 60,000. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'an employee of the Vodafone store impersonated him, registering with another operator to carry out the number port and supplying his identity document and data without consent, forging his signature.' Bearing (this factor): a commercial objective pursued by fraud is not a legitimate interest at all - the first limb of the three-part test fails before necessity or balancing is reached. DARK pending ratification.",
    },
    // ---- v5.1 EXCERPT-EXTRACTION PASS (2026-09-05) ----------------------
    // The 20 watch rows with an EMPTY `key_compliance_failure` were logged
    // by v5 as "not pinnable and not wired". That was a statement about ONE
    // column, not about the rows: every one of the 20 carries the stored
    // decision text in `source_document_text`. This pass reads that column,
    // pins an exact clause from the decision itself (excerpt_field flips to
    // "source_document_text" on these rows only), and wires the 12 rows that
    // carry a real legitimate-interests determination. The other 8 matched
    // the watch only on recited statute text and are logged below the
    // exclusions. All 12 land DARK; ratification is unchanged.
    {
      id: "lia/f03-necessity/ap-w6-01",
      factor_id: "Necessity and less-intrusive means",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "0791afb8-6580-4613-a89a-9d4964451e07",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "the DPC held that the data controller could not validly rely on Article 6(1)(f) GDPR as a legal basis for processing the data subject's ID and supplemental photograph to verify his identity because there were other means of validating the data subject's ID.",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "AirBnb Ireland UC",
        jurisdiction: "Ireland",
        decision_date: "2023-09-28",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_Inquiry_into_Airbnb_Ireland_UC_-_28_September_2023", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). DPC (Ireland), AirBnb Ireland UC, 2023-09-28, 28.09.2023 (complaint reference redacted). No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): where an equally effective, less intrusive verification route exists, Article 6(1)(f) fails at the necessity limb even though the safety interest itself was accepted as legitimate. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w6-02",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "7f44d8f1-94c2-4e43-beac-3ddedc48b021",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "the DPC carried out the three-step test needed to establish the legitimacy of the interest pursued: first, the DPC held that a legitimate interest is given, as it is stated in the controller\u2019s LIA document that it has an interest in preserving the integrity of police investigations,",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "Airbnb Ireland UC",
        jurisdiction: "Ireland",
        decision_date: "2023-09-14",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_Inquiry_into_Airbnb_Ireland_UC_-_14_September_2023", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). DPC (Ireland), Airbnb Ireland UC, 2023-09-14, Inquiry into Airbnb Ireland UC - 14 September 2023. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): the authority worked from the controller's own written LIA when identifying the interest - a documented interest statement is what the first limb is tested against. DARK pending ratification.",
    },
    {
      id: "lia/f08-safeguards/ap-w6-03",
      factor_id: "Safeguards and mitigations",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "2b685584-e0e6-4ef7-93be-c42947f32991",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "The Archbishop may lawfully rely on legitimate interests under Article 6(1)(f)\nGDPR as a legal basis for the processing of personal data of individuals which\nare recorded in the Baptism Register, even in such instances where an individual\nno longer wishes to be associated with the Catholic Church;",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "Archbishop of Dublin",
        jurisdiction: "Ireland",
        decision_date: "2023-02-27",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_IN-19-7-6", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). DPC (Ireland), Archbishop of Dublin, 2023-02-27, IN-19-7-6. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): legitimate interests survived an erasure challenge only because retention was hedged with safeguards; the safeguard package is doing the balancing work. DARK pending ratification.",
    },
    {
      id: "lia/f04-balancing/ap-w6-04",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "91474d2b-b024-44f5-ae28-3adf6ab9090a",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "Airbnb did not demonstrate that the ID request was either proportionate or necessary in the context of an erasure request. Therefore, it could not be considered that a \u201clegitimate interest\u201d exists for the processing of data and so the controller had infringed Article 6(1) GDPR",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "Airbnb Ireland UC",
        jurisdiction: "Ireland",
        decision_date: "2022-09-14",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_IN-21-3-1", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). DPC (Ireland), Airbnb Ireland UC, 2022-09-14, IN-21-3-1. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): an undemonstrated proportionality case collapses the balance - the controller carries the burden of showing the interest outweighs the individual's rights. DARK pending ratification.",
    },
    {
      id: "lia/f05-reasonable-expectations/ap-w6-05",
      factor_id: "Reasonable expectations of the data subject",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "96fa14f8-3811-4cd6-a520-50ccf054d387",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "The company had no legitimate interest to collect and process such sensitive data and therefore had to rely on a consent-based approach",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "CLEARVIEW AI",
        jurisdiction: "France",
        decision_date: "2021-11-26",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_MED-2021-134", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). CNIL (France), CLEARVIEW AI, 2021-11-26, MED-2021-134. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): scraping publicly accessible images defeats reasonable expectations, so no legitimate interest was available and consent became the only route. DARK pending ratification.",
    },
    {
      id: "lia/f06-relationship/ap-w6-06",
      factor_id: "Relationship with the individual",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "6c76ba4e-d9ed-4ea7-887e-259c88a42881",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "when the processing has as a legal basis the legitimate interest of the controller, the latter must comply with the request for erasure made by the data subject.",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Soci\u00e9t\u00e9 nouvelle de l\u2019annuaire fran\u00e7ais (SNAF)",
        jurisdiction: "France",
        decision_date: "2021-09-15",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2021-014", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). CNIL (France), Soci\u00e9t\u00e9 nouvelle de l\u2019annuaire fran\u00e7ais (SNAF), 2021-09-15, SAN-2021-014. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): relying on legitimate interests imports a live objection and erasure route; the interest must be re-defended as compelling once the individual objects. DARK pending ratification.",
    },
    {
      id: "lia/f04-balancing/ap-w6-07",
      factor_id: "Balancing of interests, rights and freedoms",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "e98e0e5f-d0a6-467f-a37b-736dd8072b3c",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "This balancing between the different interests involved requires in particular taking into account the reasonable expectations of the persons concerned as to the nature of the data collected and the way in which they are processed for the constitution of the processing in dispute,",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Monsanto Company",
        jurisdiction: "France",
        decision_date: "2021-08-26",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2021-012", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). CNIL (France), Monsanto Company, 2021-08-26, SAN-2021-012. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): the authority anchored the balancing exercise in reasonable expectations about the data collected and how it is used. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w6-08",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "5c406c0e-d256-4aab-98e1-559ce66abfa7",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "The DPC originally held this information was provided in a clear and meaningful way, but amended its finding to comply with the EDPB",
      render_eligible: false,
      citation_source: {
        regulator: "DPC (Ireland)",
        subject: "WhatsApp Ireland Limited",
        jurisdiction: "Ireland",
        decision_date: "2021-08-20",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=DPC_(Ireland)_-_WhatsApp_Ireland_Limited_-_IN-18-12-2", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). DPC (Ireland), WhatsApp Ireland Limited, 2021-08-20, WhatsApp Ireland Limited - IN-18-12-2. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): Article 13(1)(d) requires the specific legitimate interests pursued to be stated to the reader; a generic interest statement is a transparency failure as well as a weak first limb. DARK pending ratification.",
    },
    {
      id: "lia/f11-eprivacy/ap-w6-09",
      factor_id: "Special-category and ePrivacy interplay",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "dfcc63f9-cb9a-412c-9966-ea41da99a454",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "The CNIL dismissed Nestor's allegation that this processing of personal data relied on their legitimate interest as a legal basis (and therefore Nestor's claim that they did not need prior consent).",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Nestor SAS",
        jurisdiction: "France",
        decision_date: "2020-12-08",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2020-018", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). CNIL (France), Nestor SAS, 2020-12-08, SAN-2020-018. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): electronic-marketing rules impose consent and displace legitimate interests, so the Article 6(1)(f) route is unavailable no matter how the balance reads. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w6-10",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "2c7fe8e4-3bdb-4a24-9057-54b595c4b66e",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "Recalling that recital 41 of the GDPR requires that the legal basis for processing be clear and precise, it considers that the company cannot aim solely within its data confidentiality policy as the legal basis of consent for all the processing operations implemented.",
      render_eligible: false,
      citation_source: {
        regulator: "CNIL (France)",
        subject: "SPARTOO SAS",
        jurisdiction: "France",
        decision_date: "2020-07-28",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2020-003", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). CNIL (France), SPARTOO SAS, 2020-07-28, SAN-2020-003. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. Bearing (this factor): a blanket legal-basis statement is not precise enough; each purpose must name its own basis, and legitimate interests must be identified as such where relied on. DARK pending ratification.",
    },
    {
      id: "lia/f06-relationship/ap-w6-11",
      factor_id: "Relationship with the individual",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "6ca23a52-cceb-4ecb-bfd2-bdb3aefee8fe",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "if the withdrawal of consent is not successful, the information obtained would be processed by the Company on the basis of Article 6(1)(f) of Regulation 2016/679, i.e. on the basis of the legitimate interest of the controller.",
      render_eligible: false,
      citation_source: {
        regulator: "UODO (Poland)",
        subject: "ClickQuickNow Sp. z o",
        jurisdiction: "Poland",
        decision_date: "2019-10-16",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://gdprhub.eu/index.php?title=UODO_(Poland)_-_ZSPR.421.7.2019", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). UODO (Poland), ClickQuickNow Sp. z o, 2019-10-16, ZSPR.421.7.2019. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. RECORDED BASIS, NOT A FINDING: this pin is the controller's own asserted position as recorded by the authority. Bearing (this factor): legitimate interests cannot be used as a fallback to keep processing that the individual has just withdrawn consent for. DARK pending ratification.",
    },
    {
      id: "lia/f01-interest-legitimacy/ap-w6-12",
      factor_id: "Interest legitimacy",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "cc2e878b-5e81-4d51-90d4-1b43e248d070",
      excerpt_field: "source_document_text",
      pinned_excerpt:
        "Base Jur\u00eddica: El inter\u00e9s leg\u00edtimo de Amadeus en comprender mejor nuestros servicios y mejorarlos, identificar tendencias de uso y desarrollar nuevos productos.",
      render_eligible: false,
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "AMADEUS IT GROUP, S.A.",
        jurisdiction: "Spain",
        decision_date: "2016-04-27",
      },
      direction: "limits",
      logic_bearing: false,
      provenance: { source_url: "https://www.aepd.es/documento/ps-00005-2025.pdf", verified_on: "2026-09-05" },
      curation_note:
        "Doc 73 watch row, excerpt-extraction pass, wired 2026-09-05 (v5.1). AEPD (Spain), AMADEUS IT GROUP, S.A., 2016-04-27, EXP202315175. No key_compliance_failure on this row, so the pin is an exact substring of `source_document_text` (the stored decision text), clause-truncated to the pin budget. SOURCE LANGUAGE: Spanish; pin verbatim. WORKING ENGLISH TRANSLATION: 'Legal basis: Amadeus's legitimate interest in better understanding our services and improving them, identifying usage trends and developing new products.' Bearing (this factor): a legitimate interest stated at this level of generality (analytics, product development) is what the authority tested against the controller's own legitimate-interests assessment annexed to its DPIA. DARK pending ratification.",
    },

    // v5 EXCLUSIONS (matched the watch, deliberately NOT wired):
    //   • 20cf9537 — KFC Restaurants Spain, S.L.U. (AN, 2026-07-16): the
    //     finding is a DPO-appointment and transparency failure; it does
    //     not turn on Article 6(1)(f). Watch false positive (raw-text arm).
    //   • 1a7cfe65 — Microsoft Ireland Operations Limited (DPC, 2025-09-01):
    //     an access-request handling failure; no legitimate-interests
    //     determination to pin. Watch false positive.
    //   • 771e1908 — "XXXXXXXX" (CNIL, 2022-06-23, €1,000,000): the subject
    //     is redacted in the source row, so no citable respondent exists;
    //     an AP row must name its matter. Logged for T2 re-sourcing.
  //   ---- v5.1 EXCERPT-PASS EXCLUSIONS (no LI determination to pin) ----
  //   The watch matched these 8 only on recited statute/notice text, so
  //   there is no legitimate-interests holding, and no controller position,
  //   to pin. They stay logged, not wired:
  //   • 978c36c5 UODO - Minister of Digitalisation (2025-03-17): Article
  //     6(1) recited in full; the finding is Article 5(1)(a)/6(1) lawfulness
  //     generally, not the 6(1)(f) route.
  //   • 1a28450a UODO - National Public Prosecutor's Office (2024-09-02):
  //     same recital-of-Article-6 match; the case turns on Article 9/33/34.
  //   • ccf0a806 CNIL - University of Bordeaux (2023-09-07): stored source
  //     text is 644 characters and contains no legitimate-interests passage;
  //     the case runs on Article 6(1)(e) public task.
  //   • 2fcb9f54 DPC - WhatsApp Ireland (2023-01-12): a generic sentence
  //     listing the available legal bases; no 6(1)(f) determination.
  //   • 6b52d8ab CNIL - Ministry of Interior (2021-01-12): the only match is
  //     "the public has demonstrated a legitimate interest in matters" -
  //     the ordinary-language sense, not Article 6(1)(f). False positive.
  //   • 0f433267 CNIL - French Ministry of Health (2020-07-15): the match is
  //     inside the recited Article 35(7)(a) DPIA content requirement.
  //   • 7e4606c9 CNIL - Futura International (2019-11-21): matches are the
  //     recited Article 13/14 information duties.
  //   • 000fda38 UODO - Bisnode (2019-03-15): match is the recited Article
  //     14(2)(b) text; the finding is an Article 14 notification failure.
  ],
};
