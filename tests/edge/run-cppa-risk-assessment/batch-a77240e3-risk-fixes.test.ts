// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on two real CPPA Risk defects,
// each fixed identically in both `_local` mirrors
// (run-cppa-risk-assessment-v2 and ltp-risk-doc-gen).
//
// RISK5-01 — safeguardCreditedCell filtered to only the single BEST-status
// safeguard per risk, silently dropping a lower-status safeguard mapped to
// the same risk (e.g. a "Planned, not yet implemented" safeguard beside an
// "Implemented and tested" one) — the § 4.A ledger under-disclosed the
// Company's own recorded safeguard architecture.
// RISK5-02 — the § 7150(b)(6) downgrade added the same day keyed off the
// wrong intake field (`admt_provider_trained_using_pi`, used elsewhere for
// a different § 7153 scenario) instead of the actual training trigger
// (`q18b_admt_training`), so a record with the real trigger OFF but that
// unrelated field left "Yes" still cited § 7150(b)(6) as controlling.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

for (const mirror of ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]) {
  const { buildRiskLedgerTable } = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-factor-engine.ts`);
  const { buildFactorAuthorityMatrixTable } = await import(`../../../supabase/functions/${mirror}/_local/ltp/risk-skeleton-assemble.ts`);

  type Bag = Record<string, unknown>;

  function pathway(over: Bag): Bag {
    return {
      harm: "(C) Impairment of consumer control over personal information",
      data: "", actor: "", source: "", cause: "",
      likelihood: "Likely", severity: "Significant", materiality: "High",
      bestStatus: "Implemented and tested", residual: "Moderate", safeguards: [],
      ...over,
    };
  }

  Deno.test(`RISK5-01 [${mirror}] — a risk with two safeguards at different statuses credits BOTH, not just the best-status one`, () => {
    const p = pathway({
      bestStatus: "Implemented and tested",
      safeguards: [
        { safeguard: "Sensitive-segment blocklist applied at the taxonomy layer.", safeguard_status: "Implemented and tested" },
        { safeguard: "GPC opt-out synchronization API.", safeguard_status: "Planned, not yet implemented" },
      ],
    });
    const t = buildRiskLedgerTable([p] as never, "iv_determination");
    assert(t, "expected a rendered ledger");
    const cell = t!.rows[0][4];
    assertStringIncludes(cell, "Sensitive-segment blocklist");
    assertStringIncludes(cell, "(implemented and tested)");
    assertStringIncludes(cell, "GPC opt-out synchronization API");
    assertStringIncludes(cell, "(planned, not yet implemented)");
  });

  Deno.test(`RISK5-01 [${mirror}] — a single safeguard renders byte-identically to the pre-fix format (no regression)`, () => {
    const p = pathway({
      bestStatus: "Implemented and tested",
      safeguards: [{ safeguard: "Access controls enforced via SSO.", safeguard_status: "Implemented and tested" }],
    });
    const t = buildRiskLedgerTable([p] as never, "iv_determination");
    assertEquals(t!.rows[0][4], "Access controls enforced via SSO (implemented and tested)");
  });

  Deno.test(`RISK5-01 [${mirror}] — no linked safeguards still renders 'None established' (no regression)`, () => {
    const p = pathway({ bestStatus: null, safeguards: [] });
    const t = buildRiskLedgerTable([p] as never, "iv_determination");
    assertEquals(t!.rows[0][4], "None established");
  });

  Deno.test(`RISK5-02 [${mirror}] — § 7150(b)(6) is not cited when the real training trigger is off, even if the unrelated PI-trained field is "Yes"`, () => {
    const t = buildFactorAuthorityMatrixTable(
      {} as never,
      { q18b_admt_training: "No", admt_provider_trained_using_pi: "Yes" } as never,
      { factors: { admt_training_note: "Training note text." } } as never,
    );
    const row = t!.rows.find((r) => r[0] === "ADMT training data");
    assert(row, "expected the ADMT training data row");
    assertEquals(row![2], "11 CCR § 7152(a)(3)(G)");
  });

  Deno.test(`RISK5-02 [${mirror}] — § 7150(b)(6) IS cited when the real training trigger is on (no regression)`, () => {
    const t = buildFactorAuthorityMatrixTable(
      {} as never,
      { q18b_admt_training: "Yes", admt_provider_trained_using_pi: "No" } as never,
      { factors: { admt_training_note: "Training note text." } } as never,
    );
    const row = t!.rows.find((r) => r[0] === "ADMT training data");
    assertStringIncludes(row![2], "§ 7150(b)(6)");
  });
}
