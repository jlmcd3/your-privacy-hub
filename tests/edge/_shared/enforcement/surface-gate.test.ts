/**
 * ITEM 354 — ENFORCEMENT SURFACE GATE tests.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  filterSurfaceRows,
  gateRow,
  isDocumentBacked,
  isFinalInstrument,
  PRODUCT_GATES,
  resolveProductGate,
} from "../../../../supabase/functions/_shared/enforcement/surface-gate.ts";

const base = {
  id: "row",
  verification_status: "verified",
  disposition_type: "administrative_fine",
  authority_class: "eu_dpa",
  source_document_text: "x".repeat(500),
  source_url: "https://example.test/doc",
  source_type: "regulator_primary",
};

Deno.test("qualified eu_dpa row surfaces on cppa-risk", () => {
  assertEquals(gateRow(base, { product: "cppa-risk" }), { allowed: true, reason: "ok" });
});

Deno.test("SOURCE-QUALITY GATE: non-primary sources never surface on cppa-risk", () => {
  for (const st of ["regulator_press", "third_party_tracker", "third_party_commentary", null, ""]) {
    const g = gateRow({ ...base, source_type: st }, { product: "cppa-risk" });
    assertEquals(g.allowed, false, String(st));
    assertEquals(g.reason, "source_type_not_primary");
  }
});

Deno.test("SOURCE-QUALITY GATE: falls back to the deterministic classifier", () => {
  // GDPRhub wiki row, column not selected → classified, then blocked.
  const wiki = {
    ...base,
    source_type: undefined,
    source_database: "GDPRhub",
    source_url: "https://gdprhub.eu/index.php?title=X",
  };
  assertEquals(gateRow(wiki, { product: "cppa-risk" }).reason, "source_type_not_primary");
  // Regulator's own domain, non-CMS source → primary.
  const primary = {
    ...base,
    source_type: undefined,
    source_database: "AEPD",
    source_url: "https://www.aepd.es/documento/ps-00123-2024.pdf",
  };
  assertEquals(gateRow(primary, { product: "cppa-risk" }).allowed, true);
  // Regulator NEWS feed is press, never primary.
  const press = { ...primary, source_database: "AEPD News" };
  assertEquals(gateRow(press, { product: "cppa-risk" }).reason, "source_type_not_primary");
});

Deno.test("CPPA-INCLUSION-GATE: verified + document-backed + final cppa row does NOT surface on cppa-risk", () => {
  const r = { ...base, authority_class: "cppa" };
  const g = gateRow(r, { product: "cppa-risk" });
  assertEquals(g.allowed, false);
  assertEquals(g.reason, "cppa_inclusion_gate");
  // ...nor on any other product.
  assertEquals(gateRow(r, { product: "enforcement-archive" }).allowed, false);
  assert(!PRODUCT_GATES["cppa-risk"].allow_authority_classes!.includes("cppa" as never));
});

Deno.test("unverified row never surfaces regardless of class", () => {
  for (const cls of ["eu_dpa", "uk_dpa", "eea_dpa", "us_federal_agency"]) {
    for (const vs of ["unverified", "failed", "requires_review", null]) {
      const g = gateRow({ ...base, authority_class: cls, verification_status: vs }, {
        product: "cppa-risk",
      });
      assertEquals(g.allowed, false, `${cls}/${vs}`);
      assertEquals(g.reason, "not_verified");
    }
  }
});

Deno.test("undocumented row never surfaces regardless of class", () => {
  for (const cls of ["eu_dpa", "uk_dpa", "eea_dpa"]) {
    const g = gateRow({
      ...base,
      authority_class: cls,
      source_document_text: "",
      strat_has_document: false,
    }, { product: "cppa-risk" });
    assertEquals(g.allowed, false, cls);
    assertEquals(g.reason, "not_document_backed");
  }
  // A cache hit on source_url IS document-backing.
  assert(isDocumentBacked(
    { ...base, source_document_text: "" },
    new Set(["https://example.test/doc"]),
  ));
});

Deno.test("non-final instruments never surface", () => {
  for (const d of [
    "investigation",
    "complaint",
    "advisory_opinion",
    "proposed_fine_reported_to_police",
    "unknown",
    "",
    null,
  ]) {
    const g = gateRow({ ...base, disposition_type: d, action_type: null }, {
      product: "cppa-risk",
    });
    assertEquals(g.allowed, false, String(d));
    assertEquals(g.reason, "not_final_instrument");
  }
  for (const d of [
    "administrative_fine",
    "final_decision",
    "settlement",
    "consent_order",
    "injunctive_relief",
  ]) {
    assert(isFinalInstrument({ disposition_type: d }), d);
  }
});

Deno.test("authority_class outside the cppa-risk allow-list does not surface", () => {
  for (const cls of ["us_federal_agency", "us_state_ag", "ca_commissioner", "court", "other", "unclassified"]) {
    const g = gateRow({ ...base, authority_class: cls }, { product: "cppa-risk" });
    assertEquals(g.allowed, false, cls);
    assertEquals(g.reason, "authority_class_not_allowed");
  }
  for (const cls of ["eu_dpa", "eea_dpa", "uk_dpa"]) {
    assertEquals(gateRow({ ...base, authority_class: cls }, { product: "cppa-risk" }).allowed, true, cls);
  }
});

Deno.test("PINNED: the 3 currently-unverified CPPA rows are non-surfacing on every product", () => {
  const pinned = [
    { id: "1484406d-4998-4866-881c-7c40a832278a", subject: "Invitation" },
    { id: "9a9e74c6-3cef-4f75-ab11-28af2288a7e4", subject: "First Advisory" },
    {
      id: "1203311c-d70b-4dc2-a963-5014c0fb0c53",
      subject: "Enforcement Advisory Highlighting Data Broker Registration",
    },
  ].map((r) => ({
    ...r,
    authority_class: "cppa",
    verification_status: "unverified",
    disposition_type: null,
    source_document_text: "",
    strat_has_document: false,
  }));
  for (const product of ["cppa-risk", "enforcement-archive", "dpa-generator", "ir-playbook"]) {
    assertEquals(filterSurfaceRows(pinned, { product }), [], product);
  }
});

Deno.test("preserved profile keeps current behaviour for other products", () => {
  const legacy = {
    authority_class: "us_state_ag",
    verification_status: "unverified",
    disposition_type: null,
  };
  assertEquals(gateRow(legacy, { product: "dpa-generator" }).allowed, true);
  assertEquals(
    gateRow({ ...legacy, verification_status: "requires_review" }, { product: "dpa-generator" }).allowed,
    false,
  );
  assertEquals(resolveProductGate("ir-playbook").profile, "preserved");
  assertEquals(resolveProductGate("cppa-risk").profile, "cppa_risk");
});
