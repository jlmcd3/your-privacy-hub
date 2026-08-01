// W21-CYBER-TURNC — colocated unit tests. Deno.test format matches the
// wave-21 admt/risk test suites (_tests/w21-admt-turnb.test.ts,
// _tests/w21-risk-turna.test.ts).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW21CyberTurnC,
  W21_CYBER_TURNC_STAMP,
} from "../run-cppa-cybersecurity/_w21_cyber_turnc.ts";
import { buildFactLedger } from "../_shared/intake/fact-ledger.ts";

Deno.test("W21-CYBER-TURNC — stamp is a well-formed build stamp", () => {
  assert(
    /^w21-cyber-turnc@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W21_CYBER_TURNC_STAMP),
    `unexpected stamp: ${W21_CYBER_TURNC_STAMP}`,
  );
});

Deno.test("W21-C1 — mismatched § 7123(c)(N) in keyless prose is stripped, § 7123 preserved", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding: "The intake covers authentication; see 11 CCR § 7123(c)(5) for details.",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  const f = (report as any).controls[0].finding;
  assert(!/\(c\)\(5\)/.test(f), `mismatched (c)(5) survived: ${f}`);
  assert(/§\s*7123/.test(f), `§ 7123 composite anchor lost: ${f}`);
  assertEquals(counters.c1_c_n_stripped, 1);
});

Deno.test("W21-C1 — matching component-name keeps § 7123(c)(N)", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding: "The authentication control is discussed at 11 CCR § 7123(c)(1).",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  const f = (report as any).controls[0].finding;
  assert(/§\s*7123\(c\)\(1\)/.test(f), `valid (c)(1) was wrongly stripped: ${f}`);
  assertEquals(counters.c1_c_n_kept_component, 1);
  assertEquals(counters.c1_c_n_stripped, 0);
});

Deno.test("W21-C1 — anchor keys (citation/regulatory_basis) never touched", () => {
  const src = {
    controls: [{
      component: "Authentication",
      regulatory_basis: "11 CCR § 7123(c)(5)", // deliberately mismatched — must NOT be scrubbed
      citation: "11 CCR § 7123(c)(5)",
    }],
  } as any;
  const { report } = applyW21CyberTurnC(src);
  const c = (report as any).controls[0];
  assertEquals(c.regulatory_basis, "11 CCR § 7123(c)(5)");
  assertEquals(c.citation, "11 CCR § 7123(c)(5)");
});

Deno.test("W21-C2 — unsupported 'patient health information' rewritten (no intake cue)", () => {
  const src = {
    executive_summary:
      "The environment processes patient health information across shared drives.",
  } as any;
  const intake = { profile: { industry: "logistics" }, controls: [] };
  const { report, counters } = applyW21CyberTurnC(src, { intake });
  assert(!/patient health information/i.test((report as any).executive_summary));
  assert(/data categories reported in the intake/i.test((report as any).executive_summary));
  assertEquals(counters.c2_unsupported_category_scrubbed, 1);
});

Deno.test("W21-C2 — supported PHI passes through when intake cues health", () => {
  const src = {
    executive_summary: "PHI is processed in the clinical workflow.",
  } as any;
  const intake = { profile: { industry: "healthcare", data_types: "PHI / HIPAA" } };
  const { report, counters } = applyW21CyberTurnC(src, { intake });
  assert(/PHI/.test((report as any).executive_summary));
  assertEquals(counters.c2_unsupported_category_scrubbed, 0);
});

Deno.test("W21-C3 — derived arithmetic reframed when number is not in intake verbatim", () => {
  const src = {
    executive_summary: "The intake records 580 users across the environment.",
  } as any;
  const intake = { profile: { admin_users: 168, standard_users: 412 } };
  const { report, counters } = applyW21CyberTurnC(src, { intake });
  const es = (report as any).executive_summary;
  assert(/based on the figures provided, approximately 580 users/i.test(es), `got: ${es}`);
  assertEquals(counters.c3_derived_arith_reframed, 1);
});

Deno.test("W21-C3 — intake-verbatim number passes through", () => {
  const src = {
    executive_summary: "The intake records 168 accounts on the authentication surface.",
  } as any;
  const intake = { profile: { admin_users: 168 } };
  const { report, counters } = applyW21CyberTurnC(src, { intake });
  assert(/the intake records 168 accounts/i.test((report as any).executive_summary));
  assertEquals(counters.c3_derived_arith_reframed, 0);
});

Deno.test("W21-C4 — § 7122(g) downgraded outside retention context", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding: "Implement MFA per 11 CCR § 7122(g) across all admin accounts.",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  const f = (report as any).controls[0].finding;
  assert(!/§\s*7122\s*\(g\)/i.test(f), `§ 7122(g) survived outside retention: ${f}`);
  assert(/§§\s*7120[–-]7124/.test(f), `neutral anchor missing: ${f}`);
  assertEquals(counters.c4_retention_downgraded, 1);
});

Deno.test("W21-C4 — § 7122(g) preserved when retention context is present", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding:
        "Retain the supporting documentation per the § 7122(g) five-year audit-record retention rule.",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  const f = (report as any).controls[0].finding;
  assert(/§\s*7122\s*\(g\)/i.test(f), `retention context should keep § 7122(g): ${f}`);
  assertEquals(counters.c4_retention_downgraded, 0);
});

Deno.test("W21-C5 — vendor 'provides comparative guidance' splice sentence dropped", () => {
  const src = {
    controls: [{
      component: "Authentication",
      remediation:
        "Deploy an SSO layer. SailPoint provides comparative guidance for the authentication control. Continue MFA rollout.",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  const r = (report as any).controls[0].remediation;
  assert(!/comparative guidance/i.test(r), `splice survived: ${r}`);
  assert(!/SailPoint/i.test(r), `vendor stub survived: ${r}`);
  assert(/Deploy an SSO layer/.test(r), `pre-splice text lost: ${r}`);
  assert(/Continue MFA rollout/.test(r), `post-splice text lost: ${r}`);
  assert(counters.c5_splice_sentences_dropped >= 1);
});

Deno.test("W21 — telemetry attaches at _meta.internal.cyber_w21c only (no top-level leak)", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding: "SailPoint provides comparative guidance here.",
    }],
  } as any;
  const { report } = applyW21CyberTurnC(src);
  const top = Object.keys(report).filter((k) => k !== "_meta" && k.startsWith("_"));
  assertEquals(top, []);
  const meta = (report as any)._meta;
  const w21c = meta?.internal?.cyber_w21c;
  assert(w21c, "cyber_w21c telemetry missing");
  assertEquals(w21c.stamp, W21_CYBER_TURNC_STAMP);
  assert(typeof w21c.c5_splice_sentences_dropped === "number");
});

Deno.test("W21 — pass-through: clean report untouched (idempotence)", () => {
  const src = {
    controls: [{
      component: "Authentication",
      finding: "MFA is enforced on administrative accounts.",
      remediation: "Retain the supporting documentation per the § 7122(g) five-year audit-record retention rule.",
      regulatory_basis: "11 CCR § 7123(c)(1)",
      citation: "11 CCR § 7123(c)(1)",
    }],
    executive_summary: "The environment shows partial coverage.",
  } as any;
  const { report: r1, counters: c1 } = applyW21CyberTurnC(src);
  const { report: r2, counters: c2 } = applyW21CyberTurnC(r1 as any);
  assertEquals(c1.c1_c_n_stripped, 0);
  assertEquals(c1.c2_unsupported_category_scrubbed, 0);
  assertEquals(c1.c3_derived_arith_reframed, 0);
  assertEquals(c1.c4_retention_downgraded, 0);
  assertEquals(c1.c5_splice_sentences_dropped, 0);
  assertEquals(c2.c1_c_n_stripped, 0);
  assertEquals(c2.c4_retention_downgraded, 0);
  // Second pass leaves the customer-facing values identical to the first pass.
  assertEquals((r2 as any).controls[0].finding, (r1 as any).controls[0].finding);
  assertEquals((r2 as any).controls[0].remediation, (r1 as any).controls[0].remediation);
});

Deno.test("W21 — reserved subtrees (_meta, annotations, deterministic_checks) not walked-into for scrub", () => {
  const src = {
    _meta: { internal: { prior: { note: "SailPoint provides comparative guidance." } } },
    annotations: { note: "SailPoint provides comparative guidance." },
    deterministic_checks: [{ description: "SailPoint provides comparative guidance." }],
    controls: [{ component: "Authentication", finding: "SailPoint provides comparative guidance." }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src);
  // Reserved subtrees pass through verbatim.
  assertEquals(
    (report as any).annotations.note,
    "SailPoint provides comparative guidance.",
  );
  assertEquals(
    (report as any).deterministic_checks[0].description,
    "SailPoint provides comparative guidance.",
  );
  assertEquals(
    (report as any)._meta.internal.prior.note,
    "SailPoint provides comparative guidance.",
  );
  // The customer-surface controls[] entry IS scrubbed.
  assert(!/SailPoint/i.test((report as any).controls[0].finding));
  assertEquals(counters.c5_splice_sentences_dropped, 1);
});

Deno.test("W21 — fail-open on null / non-object report", () => {
  const r1 = applyW21CyberTurnC(null as any);
  assertEquals(r1.report as any, null);
  assertEquals(r1.counters.strings_scanned, 0);
  const r2 = applyW21CyberTurnC(undefined as any);
  assertEquals(r2.counters.strings_scanned, 0);
});

Deno.test("W21 — ledger-only path (no intake) still scrubs splice & retention", () => {
  const ledger = buildFactLedger({ mfa_admin_policy: "Yes" });
  const src = {
    controls: [{
      component: "Authentication",
      finding: "Okta provides comparative guidance here.",
      remediation: "Implement MFA per § 7122(g) immediately.",
    }],
  } as any;
  const { report, counters } = applyW21CyberTurnC(src, { ledger });
  assert(!/comparative guidance/i.test((report as any).controls[0].finding));
  assert(!/§\s*7122\s*\(g\)/i.test((report as any).controls[0].remediation));
  assert(counters.c5_splice_sentences_dropped >= 1);
  assert(counters.c4_retention_downgraded >= 1);
});
