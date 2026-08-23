// WAVE C2 (2026-08-23, doc 57 §1/§2a, doc 63 §4.1) — the determinism fix's
// enforcement limb. Retires the runtime `get-enforcement-context` semantic
// RPC call (which selected up to 5 candidates at generation time via a
// relevance-ranked query — a two-plane-law violation, doc 48 §II.1) in
// favor of this pinned, CEO-ratified release-1 list of 6 verified rows.
//
// Cross-referenced with DPIA_CORPUS_MAP's AP rows (dpia-corpus-map.ts) by
// source_row_id — a test (dpia-c2-determinism.test.ts) asserts the two
// lists name exactly the same 6 ids, so they can never silently drift.
// The CAM's AP rows carry the CEO-ratified customer prose (matter/
// what_happened/bearing) for the Reader-Value-Law record and the S3 ToA
// ratification; THIS file carries the raw fields the legacy
// EnforcementPrecedents.tsx component and attachEnforcementAnnotations()
// (supabase/functions/_shared/ltp/dpia-deliverables/build.ts) still
// consume, in their existing shape, so neither needs to change.
//
// NO source_url field (doc 62 §11.5's no-URL ruling) — the frontend
// component no longer renders one regardless (fixed the same wave), but
// omitting it here means a future edit can't silently reintroduce it.
//
// fine_eur_equivalent DATA-QUALITY NOTE: the live enforcement_actions row
// for AENA (8113274e) carries fine_eur_equivalent = 4,386,767,000 — a
// visibly corrupted currency-conversion value (the correct fine, per
// fine_eur and the regulator's own decision, is EUR 10,043,002). This
// pinned literal uses fine_amount (pre-formatted from the correct
// fine_eur) for all six rows and leaves fine_eur_equivalent unset, so the
// frontend's fmtFine() falls through to the correct figure rather than
// rendering the corrupted one. Flag for the corpus data-hygiene batch
// (03-DECISION-QUEUE.md).

// Edge functions (Deno) cannot import from src/ (Vite/React, a separate
// bundle) — this shape is a deliberate duplicate of
// src/components/EnforcementPrecedents.tsx's `EnforcementPrecedent`
// interface, kept in sync by inspection (both are small and rarely
// change); NOT a build-time import. Extended with the raw fields
// attachEnforcementAnnotations() needs for its deterministic
// risk-register linking (precedentArticleNumbers/precedentSummary/
// precedentId).
export interface DpiaPinnedPrecedent {
  readonly id: string;
  readonly regulator?: string | null;
  readonly jurisdiction?: string | null;
  readonly subject?: string | null;
  readonly decision_date?: string | null;
  readonly fine_eur_equivalent?: number | null;
  readonly fine_amount?: string | null;
  readonly key_compliance_failure?: string | null;
  readonly violation?: string | null;
  readonly precedent_significance?: number | null;
  readonly statutory_provisions: readonly string[];
  readonly provisions_normalized: readonly string[];
}

export const DPIA_ENFORCEMENT_PRECEDENTS_PINNED: readonly DpiaPinnedPrecedent[] = [
  {
    id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
    regulator: "AEPD",
    jurisdiction: "Spain",
    subject: "AENA, S.M.E., S.A.",
    decision_date: "2025-11-06",
    fine_amount: "€10,043,002",
    key_compliance_failure:
      "Incumplimiento de las obligaciones contenidas en el art. 35.7 del RGPD, en particular la falta de inclusión en la Evaluación de Impacto relativa a la Protección de Datos (EIPD) de un análisis de idoneidad, necesidad y proporcionalidad del tratamiento de datos biométricos de los pasajeros.",
    precedent_significance: 3,
    statutory_provisions: [
      "GDPR Article 35", "GDPR Article 35(7)", "GDPR Article 5(1)(c)",
      "GDPR Article 83(5)(a)", "GDPR Article 6(1)(a)", "GDPR Article 9(2)(a)",
      "GDPR Article 30", "LOPDGDD Article 65",
    ],
    provisions_normalized: ["gdpr:3", "gdpr:5", "gdpr:6", "gdpr:8", "gdpr:9", "lopdgdd:6"],
  },
  {
    id: "dc095815-d03d-4bb2-b3be-2711e7f7d459",
    regulator: "AP",
    jurisdiction: "Netherlands",
    subject: "International Card Services B.V.",
    decision_date: "2024-01-15",
    fine_amount: "€150,000",
    key_compliance_failure:
      "The organization failed to conduct a Data Protection Impact Assessment (DPIA) before implementing a new digital identification process that involved sensitive personal data.",
    precedent_significance: 3,
    statutory_provisions: ["GDPR"],
    provisions_normalized: [],
  },
  {
    id: "a3cf40b0-3625-4e78-bbe9-63624f17ceb0",
    regulator: "Garante",
    jurisdiction: "Italy",
    subject: "Poste Italiane S.p.a.",
    decision_date: "2026-04-17",
    fine_amount: "€6,624,000",
    key_compliance_failure:
      "Poste Italiane processed customer data excessively through a fraud prevention tool without a sufficient legal basis, proper transparency, or adequate data protection measures.",
    precedent_significance: 3,
    statutory_provisions: [
      "GDPR Article 5", "GDPR Article 6", "GDPR Article 13",
      "GDPR Article 25", "GDPR Article 28", "GDPR Article 32", "GDPR Article 35",
    ],
    provisions_normalized: ["gdpr:1", "gdpr:2", "gdpr:3", "gdpr:5", "gdpr:6"],
  },
  {
    id: "b3a1a34f-9138-4f93-bcea-9286f9534fe9",
    regulator: "Garante",
    jurisdiction: "Italy",
    subject: "Deliveroo Italy s.r.l.",
    decision_date: "2021-07-22",
    fine_amount: "€2,500,000",
    key_compliance_failure:
      "Deliveroo failed to adequately inform drivers about algorithmic decision-making, processed excessive location data, had inappropriate data retention policies, and lacked adequate security measures and a required DPIA.",
    precedent_significance: 3,
    statutory_provisions: [
      "GDPR Article 5(1)(a)", "GDPR Article 13", "GDPR Article 22",
      "GDPR Article 25", "GDPR Article 32", "GDPR Article 37", "Codice Privacy Article 114",
    ],
    provisions_normalized: ["codice-privacy:1", "gdpr:1", "gdpr:2", "gdpr:3", "gdpr:5"],
  },
  {
    id: "e58dfa97-b038-4ffa-9ca4-2b9aba436bbb",
    regulator: "AEPD",
    jurisdiction: "Spain",
    subject: "CARTONAJES BAÑERES, S.A.",
    decision_date: "2024-01-05",
    fine_amount: "€220,000",
    key_compliance_failure:
      "realiza una fotografía de la cara de los empleados desde un dispositivo situado en la entrada, empleando datos biométricos para fichar sin obtener consentimiento informado, y no atendió a la solicitud de acceso a datos personales formulada en fecha 29/08/2022.",
    precedent_significance: 3,
    statutory_provisions: [
      "GDPR Article 35", "GDPR Article 12", "GDPR Article 83(4)(a)", "GDPR Article 83(5)(b)",
      "LOPDGDD Article 73(t)", "LOPDGDD Article 72(1)(k)", "GDPR Article 9", "GDPR Article 6",
      "LOPDGDD Article 65(4)", "GDPR Article 57(1)", "GDPR Article 58(1)",
      "GDPR Article 83(2)(f)", "GDPR Article 83(2)(b)", "LOPDGDD Article 76", "LOPDGDD Article 74(c)",
    ],
    provisions_normalized: ["gdpr:1", "gdpr:3", "gdpr:5", "gdpr:6", "gdpr:8", "gdpr:9", "lopdgdd:6", "lopdgdd:7"],
  },
  {
    id: "dbfca969-3139-43d1-8a5b-7fff179f8db6",
    regulator: "Garante",
    jurisdiction: "Italy",
    subject: "Comune di Bolzano",
    decision_date: "2021-05-13",
    fine_amount: "€84,000",
    key_compliance_failure:
      "The municipality unlawfully monitored employee internet usage and processed sensitive health data without a valid legal basis or proper transparency.",
    precedent_significance: 3,
    statutory_provisions: [
      "GDPR Article 6(1)(c)", "GDPR Article 9(1)", "GDPR Article 12", "GDPR Article 13",
      "GDPR Article 14", "GDPR Article 24", "GDPR Article 35", "GDPR Article 83(5)",
      "GDPR Article 88", "Codice Privacy Article 166(5)",
    ],
    provisions_normalized: ["codice-privacy:1", "gdpr:1", "gdpr:2", "gdpr:3", "gdpr:6", "gdpr:8", "gdpr:9"],
  },
];
